'use client';

import { useEffect, useState } from 'react';
import { Suggestion } from '@/types';
import { savePinnedSuggestion, loadPinnedSuggestion } from '@/lib/pinnedSuggestion';
import { ChefHat, Sparkles, Leaf, AlertTriangle, Check, Pin, Bookmark, BookmarkCheck } from 'lucide-react';

function formatCurrency(amount: number): string {
  return `Rs ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function tagStyles(tag: string): string {
  switch (tag) {
    case 'veg-day':
    case 'meatless':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'budget-friendly':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'try-something-new':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'over-budget':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'ai':
      return 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function tagLabel(tag: string): string {
  switch (tag) {
    case 'veg-day': return 'Veg day';
    case 'meatless': return 'Meatless';
    case 'budget-friendly': return 'Budget-friendly';
    case 'try-something-new': return 'Try something new';
    case 'over-budget': return 'Over budget';
    case 'ai': return 'AI';
    default: return tag;
  }
}

function strategyTitle(strategy: Suggestion['strategy']): string {
  switch (strategy) {
    case 'balanced': return 'Balanced';
    case 'veg': return 'Veg-day';
    case 'new': return 'Try something new';
    case 'ai': return 'AI suggestion';
  }
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  isBookmarked?: boolean;
  isBookmarkInFlight?: boolean;
  onToggleBookmark?: () => void;
}

export default function SuggestionCard({
  suggestion,
  isBookmarked = false,
  isBookmarkInFlight = false,
  onToggleBookmark,
}: SuggestionCardProps) {
  const isAi = suggestion.source === 'ai';
  const [justPinned, setJustPinned] = useState(false);
  const [isCurrentlyPinned, setIsCurrentlyPinned] = useState(() => {
    if (typeof window === 'undefined') return false;
    const pinned = loadPinnedSuggestion();
    return pinned?.suggestion.menu === suggestion.menu;
  });

  const handleUse = () => {
    savePinnedSuggestion(suggestion);
    setJustPinned(true);
    setIsCurrentlyPinned(true);
    setTimeout(() => setJustPinned(false), 2500);
  };

  // Keep isCurrentlyPinned in sync if a different card gets pinned/unpinned
  useEffect(() => {
    const sync = () => {
      const pinned = loadPinnedSuggestion();
      setIsCurrentlyPinned(pinned?.suggestion.menu === suggestion.menu);
    };
    window.addEventListener('pinned-suggestion-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('pinned-suggestion-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, [suggestion.menu]);

  const staffItems = suggestion.groceryList.filter(g => g.source === 'staff');
  const pantryItems = suggestion.groceryList.filter(g => g.source === 'pantry');

  const labelOf = (i: { canonical: string; displayName?: string }) =>
    i.displayName
      ? i.displayName.charAt(0).toUpperCase() + i.displayName.slice(1)
      : i.canonical.charAt(0).toUpperCase() + i.canonical.slice(1);

  const mainItems = suggestion.items.filter(i => i.category !== 'extra');
  const sideItems = suggestion.items.filter(i => i.category === 'extra');
  const mainsTitle = mainItems.map(labelOf).join(', ');
  const sidesTitle = sideItems.map(labelOf).join(', ');

  return (
    <div className="card-premium p-5 sm:p-6 flex flex-col gap-4 h-full animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {isAi ? (
            <Sparkles className="w-5 h-5 text-fuchsia-500" />
          ) : suggestion.isVegDay ? (
            <Leaf className="w-5 h-5 text-emerald-500" />
          ) : (
            <ChefHat className="w-5 h-5 text-secondary" />
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {strategyTitle(suggestion.strategy)}
          </span>
        </div>
        {onToggleBookmark && (
          <button
            type="button"
            onClick={onToggleBookmark}
            disabled={isBookmarkInFlight}
            aria-pressed={isBookmarked}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Save to bookmarks'}
            title={isBookmarked ? 'Remove bookmark' : 'Save to bookmarks'}
            className={`p-1.5 rounded-md transition-colors ${
              isBookmarkInFlight
                ? 'opacity-60 cursor-wait'
                : 'hover:bg-muted'
            } ${isBookmarked ? 'text-amber-500' : 'text-muted-foreground'}`}
          >
            {isBookmarked ? (
              <BookmarkCheck className={`w-5 h-5 ${isBookmarkInFlight ? 'animate-pulse' : ''}`} fill="currentColor" />
            ) : (
              <Bookmark className={`w-5 h-5 ${isBookmarkInFlight ? 'animate-pulse' : ''}`} />
            )}
          </button>
        )}
      </div>

      {/* Menu — mains in title, sides on a smaller line */}
      <div className="space-y-1">
        <h3 className="text-lg sm:text-xl font-bold text-foreground leading-tight break-words">
          {mainsTitle || suggestion.menu}
        </h3>
        {sidesTitle && (
          <p className="text-sm text-muted-foreground break-words">
            <span className="font-medium">with</span> {sidesTitle}
          </p>
        )}
      </div>

      {/* Tags */}
      {suggestion.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestion.tags.map(tag => (
            <span
              key={tag}
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${tagStyles(tag)}`}
            >
              {tag === 'over-budget' && <AlertTriangle className="inline w-3 h-3 mr-1 -mt-0.5" />}
              {tagLabel(tag)}
            </span>
          ))}
        </div>
      )}

      {/* Why this */}
      {suggestion.reasoning.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Why this</div>
          <ul className="space-y-1 text-sm text-foreground">
            {suggestion.reasoning.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted-foreground">·</span>
                <span className="flex-1">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cost */}
      <div className="bg-muted/40 rounded-lg p-3 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Cook fee</span>
          <span className="font-medium text-foreground tabular-nums">{formatCurrency(suggestion.cookFee)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Groceries (est.)</span>
          <span className="font-medium text-foreground tabular-nums">
            {formatCurrency(suggestion.estimatedCost - suggestion.cookFee)}
          </span>
        </div>
        <div className="flex justify-between pt-1.5 border-t border-border">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="font-bold text-foreground tabular-nums">{formatCurrency(suggestion.estimatedCost)}</span>
        </div>
      </div>

      {/* Grocery list */}
      {staffItems.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Staff to buy
          </div>
          <ul className="space-y-1 text-sm">
            {staffItems.map((g, i) => (
              <li key={i} className="flex justify-between gap-2 text-foreground">
                <span>{g.name} <span className="text-muted-foreground">({g.qty})</span></span>
                <span className="text-muted-foreground tabular-nums">~{formatCurrency(g.estCost)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pantryItems.length > 0 && (
        <div className="text-xs text-muted-foreground">
          From pantry: {pantryItems.map(p => p.name).join(', ')}
        </div>
      )}

      {/* Spacer + CTA */}
      <div className="mt-auto pt-2">
        <button
          onClick={handleUse}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
            justPinned
              ? 'bg-emerald-500 text-white'
              : isCurrentlyPinned
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700 hover:opacity-90'
                : 'bg-primary text-primary-foreground hover:opacity-90'
          }`}
        >
          {justPinned ? (
            <>
              <Check className="w-4 h-4" />
              Pinned to dashboard
            </>
          ) : isCurrentlyPinned ? (
            <>
              <Check className="w-4 h-4" />
              Currently pinned
            </>
          ) : (
            <>
              <Pin className="w-4 h-4" />
              Use this suggestion
            </>
          )}
        </button>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          {isCurrentlyPinned
            ? 'Showing on your dashboard'
            : `Pin to dashboard · lasts ~${suggestion.daysToLast} days`}
        </p>
      </div>
    </div>
  );
}
