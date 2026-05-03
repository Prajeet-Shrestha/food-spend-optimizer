'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Bookmark, Suggestion, SuggestionContext } from '@/types';
import SuggestionCard from './SuggestionCard';
import { timeAgo } from '@/lib/timeAgo';
import { Sparkles, RefreshCw, AlertCircle, ChefHat, Calendar, Bookmark as BookmarkIcon } from 'lucide-react';

const CACHE_KEY = 'food-spend-suggestions-cache:v1';

type SuggestionSource = 'rules' | 'ai';

interface CachedState {
  suggestions: Suggestion[];
  source: SuggestionSource;
  context: SuggestionContext | null;
  savedAt: number;
}

function formatRelativeDate(dateString: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function loadCache(): CachedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedState;
    if (!Array.isArray(parsed.suggestions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(state: CachedState) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded or disabled — silent
  }
}

function clearCache() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(CACHE_KEY);
}

function normalizeMenuKey(menu: string): string {
  return menu.trim().toLowerCase().replace(/\s+/g, ' ');
}

export default function SuggestionsPanel() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [source, setSource] = useState<SuggestionSource>('rules');
  const [context, setContext] = useState<SuggestionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const hydratedFromCache = useRef(false);

  // Bookmarks
  const [view, setView] = useState<'ideas' | 'saved'>('ideas');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(true);
  const [bookmarksError, setBookmarksError] = useState<string | null>(null);
  const [bookmarkInFlight, setBookmarkInFlight] = useState<Set<string>>(new Set());
  const [bookmarkActionError, setBookmarkActionError] = useState<string | null>(null);

  const bookmarkByKey = useMemo(() => {
    const m = new Map<string, Bookmark>();
    bookmarks.forEach(b => m.set(normalizeMenuKey(b.suggestion.menu), b));
    return m;
  }, [bookmarks]);

  const fetchRuleBased = useCallback(async (seed?: number) => {
    try {
      if (seed === undefined && !hydratedFromCache.current) setLoading(true);
      else setRefreshing(true);
      setError(null);
      setAiError(null);
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch suggestions');
      const next: Suggestion[] = data.suggestions || [];
      const ctx: SuggestionContext = data.context || null;
      setSuggestions(next);
      setSource('rules');
      setContext(ctx);
      saveCache({ suggestions: next, source: 'rules', context: ctx, savedAt: Date.now() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchBookmarks = useCallback(async () => {
    setBookmarksLoading(true);
    setBookmarksError(null);
    try {
      const response = await fetch('/api/suggestions/bookmarks');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load bookmarks');
      setBookmarks(Array.isArray(data.bookmarks) ? data.bookmarks : []);
    } catch (err) {
      setBookmarksError(err instanceof Error ? err.message : 'Failed to load bookmarks');
    } finally {
      setBookmarksLoading(false);
    }
  }, []);

  // On mount: hydrate suggestions from cache or fetch fresh; load bookmarks in parallel
  useEffect(() => {
    const cached = loadCache();
    if (cached && cached.suggestions.length > 0) {
      setSuggestions(cached.suggestions);
      setSource(cached.source);
      setContext(cached.context);
      setLoading(false);
      hydratedFromCache.current = true;
    } else {
      fetchRuleBased();
    }
    fetchBookmarks();
  }, [fetchRuleBased, fetchBookmarks]);

  const handleToggleBookmark = useCallback(
    async (suggestion: Suggestion) => {
      const key = normalizeMenuKey(suggestion.menu);
      if (!key || bookmarkInFlight.has(key)) return;

      setBookmarkActionError(null);
      setBookmarkInFlight(prev => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });

      const existing = bookmarkByKey.get(key);
      try {
        if (existing) {
          const response = await fetch(`/api/suggestions/bookmarks/${existing._id}`, {
            method: 'DELETE',
          });
          if (response.ok || response.status === 404) {
            setBookmarks(prev => prev.filter(b => normalizeMenuKey(b.suggestion.menu) !== key));
          } else {
            const data = await response.json().catch(() => ({}));
            setBookmarkActionError(data.error || 'Failed to remove bookmark');
          }
        } else {
          const response = await fetch('/api/suggestions/bookmarks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ suggestion }),
          });
          const data = await response.json();
          if (!response.ok) {
            setBookmarkActionError(data.error || 'Failed to save bookmark');
          } else if (data.bookmark) {
            setBookmarks(prev => {
              const filtered = prev.filter(
                b => normalizeMenuKey(b.suggestion.menu) !== key
              );
              return [data.bookmark as Bookmark, ...filtered];
            });
          }
        }
      } catch (err) {
        setBookmarkActionError(err instanceof Error ? err.message : 'Network error');
      } finally {
        setBookmarkInFlight(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [bookmarkByKey, bookmarkInFlight]
  );

  const handleRefresh = () => {
    // Refresh always goes back to rule-based (clearing any AI override)
    fetchRuleBased(Date.now());
  };

  const handleGenerateAi = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch('/api/suggestions/ai', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 503) {
          setAiError(data.error || 'AI suggestions unavailable. Set ANTHROPIC_API_KEY in your .env.local file.');
        } else {
          setAiError(data.error || 'AI service failed.');
        }
        return;
      }
      const next: Suggestion[] = data.suggestions || [];
      if (next.length === 0) {
        setAiError('AI returned no suggestions. Try again.');
        return;
      }
      // Overwrite the current suggestions and persist
      setSuggestions(next);
      setSource('ai');
      saveCache({ suggestions: next, source: 'ai', context, savedAt: Date.now() });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleClearCache = () => {
    clearCache();
    fetchRuleBased();
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card-premium p-6 animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-premium p-6 animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
              <div className="h-3 bg-muted rounded w-5/6"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="card-premium p-6 border-destructive/50 bg-destructive/5">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive mb-2">Couldn&apos;t load suggestions</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <button
            onClick={() => fetchRuleBased()}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 font-medium text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state — no cook history
  if (suggestions.length === 0) {
    return (
      <div className="card-premium p-8 sm:p-12 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-secondary/20 flex items-center justify-center">
          <ChefHat className="w-8 h-8 text-secondary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground mb-2">No cook history yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Log your first cook to start getting personalized suggestions based on your menu rotation, preferences, and budget.
          </p>
        </div>
        <Link
          href="/logs"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90"
        >
          Log your first cook
        </Link>
      </div>
    );
  }

  const sectionTitle = source === 'ai' ? 'AI-generated ideas' : 'Suggested for next cook';

  const tabBtnBase = 'px-4 py-2 rounded-lg font-medium text-sm transition-colors';
  const tabActive = 'bg-primary text-primary-foreground shadow-sm';
  const tabInactive = 'bg-muted text-muted-foreground hover:bg-border hover:text-foreground';

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2" role="tablist" aria-label="Suggestions view">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'ideas'}
          onClick={() => setView('ideas')}
          className={`${tabBtnBase} ${view === 'ideas' ? tabActive : tabInactive}`}
        >
          Ideas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'saved'}
          onClick={() => setView('saved')}
          className={`${tabBtnBase} flex items-center gap-1.5 ${view === 'saved' ? tabActive : tabInactive}`}
        >
          <BookmarkIcon className="w-4 h-4" />
          <span>Saved</span>
          <span className="tabular-nums text-xs opacity-80">({bookmarks.length})</span>
        </button>
      </div>

      {/* Bookmark action error (shown across both tabs) */}
      {bookmarkActionError && (
        <div className="card-premium p-3 border-amber-500/50 bg-amber-500/5 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-foreground">{bookmarkActionError}</div>
          <button
            onClick={() => setBookmarkActionError(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {view === 'ideas' && (
        <>
          {/* Context strip */}
          {context && (
            <div className="card-premium p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                {context.lastCookDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last cook:</span>
                    <span className="font-medium text-foreground">
                      {formatDate(context.lastCookDate)} ({formatRelativeDate(context.lastCookDate)})
                    </span>
                  </div>
                )}
                {context.nextCookDate && (
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Next cook due:</span>
                    <span className="font-medium text-foreground">
                      {formatDate(context.nextCookDate)} ({formatRelativeDate(context.nextCookDate)})
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">This week:</span>
                  <span className="font-medium text-foreground">
                    {context.cooksThisWeek} cook{context.cooksThisWeek === 1 ? '' : 's'} ({context.vegCooksThisWeek} veg)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Header row — title + actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              {source === 'ai' && <Sparkles className="w-5 h-5 text-fuchsia-500" />}
              <h2 className="text-lg sm:text-xl font-bold text-foreground">{sectionTitle}</h2>
              {source === 'ai' && (
                <span className="text-xs text-muted-foreground italic">
                  (saved — click Refresh to return to default)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateAi}
                disabled={aiLoading || refreshing}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                title="Get creative ideas with AI"
              >
                <Sparkles className={`w-4 h-4 ${aiLoading ? 'animate-pulse' : ''}`} />
                <span>{aiLoading ? 'Generating…' : 'AI ideas'}</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing || aiLoading}
                className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-border text-foreground rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                title="Refresh — fresh rule-based suggestions"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* AI error */}
          {aiError && (
            <div className="card-premium p-3 border-amber-500/50 bg-amber-500/5 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-foreground">{aiError}</div>
              <button
                onClick={() => setAiError(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Suggestion cards (rule-based or AI, depending on source) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestions.map((s, i) => {
              const key = normalizeMenuKey(s.menu);
              return (
                <SuggestionCard
                  key={`${source}-${i}`}
                  suggestion={s}
                  isBookmarked={bookmarkByKey.has(key)}
                  isBookmarkInFlight={bookmarkInFlight.has(key)}
                  onToggleBookmark={() => handleToggleBookmark(s)}
                />
              );
            })}
          </div>

          {/* Subtle clear-cache footer for users who want a hard reset */}
          {source === 'ai' && (
            <div className="text-center">
              <button
                onClick={handleClearCache}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Clear saved AI suggestions
              </button>
            </div>
          )}
        </>
      )}

      {view === 'saved' && (
        <SavedTab
          bookmarks={bookmarks}
          loading={bookmarksLoading}
          error={bookmarksError}
          inFlightKeys={bookmarkInFlight}
          onRetry={fetchBookmarks}
          onToggle={handleToggleBookmark}
          onSwitchToIdeas={() => setView('ideas')}
        />
      )}
    </div>
  );
}

interface SavedTabProps {
  bookmarks: Bookmark[];
  loading: boolean;
  error: string | null;
  inFlightKeys: Set<string>;
  onRetry: () => void;
  onToggle: (suggestion: Suggestion) => void;
  onSwitchToIdeas: () => void;
}

function SavedTab({
  bookmarks,
  loading,
  error,
  inFlightKeys,
  onRetry,
  onToggle,
  onSwitchToIdeas,
}: SavedTabProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="card-premium p-6 animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-6 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-full"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-premium p-6 border-destructive/50 bg-destructive/5">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive mb-2">Couldn&apos;t load bookmarks</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 font-medium text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="card-premium p-8 sm:p-12 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
          <BookmarkIcon className="w-8 h-8 text-amber-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground mb-2">No bookmarks yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Tap the bookmark icon on any suggestion to save it here.
          </p>
        </div>
        <button
          onClick={onSwitchToIdeas}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90"
        >
          Browse ideas
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bookmarks.map(b => {
        const key = normalizeMenuKey(b.suggestion.menu);
        return (
          <div key={b._id} className="flex flex-col gap-1.5">
            <SuggestionCard
              suggestion={b.suggestion}
              isBookmarked
              isBookmarkInFlight={inFlightKeys.has(key)}
              onToggleBookmark={() => onToggle(b.suggestion)}
            />
            <p className="text-xs text-muted-foreground text-center">
              Bookmarked {timeAgo(b.bookmarkedAt)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
