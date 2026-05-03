'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Suggestion } from '@/types';
import { ChefHat, Sparkles, ArrowRight, Leaf, Pin, X } from 'lucide-react';
import { loadPinnedSuggestion, clearPinnedSuggestion } from '@/lib/pinnedSuggestion';
import { timeAgo } from '@/lib/timeAgo';

interface NextCookWidgetProps {
  refreshTrigger?: number;
}

function formatCurrency(amount: number): string {
  return `Rs ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function NextCookWidget({ refreshTrigger }: NextCookWidgetProps) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [pinnedAt, setPinnedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Source resolution: pinned (from MongoDB) takes priority over fetched.
  const resolveSuggestion = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Check pin first
    const pinned = await loadPinnedSuggestion();
    if (pinned) {
      setSuggestion(pinned.suggestion);
      setIsPinned(true);
      setPinnedAt(pinned.pinnedAt);
      setLoading(false);
      return;
    }

    // Otherwise fetch the default Balanced rule-based suggestion
    setIsPinned(false);
    setPinnedAt(null);
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      const balanced =
        (data.suggestions as Suggestion[]).find(s => s.strategy === 'balanced')
        ?? (data.suggestions as Suggestion[])[0]
        ?? null;
      setSuggestion(balanced);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestion');
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-resolve when parent refreshes or pin changes
  useEffect(() => {
    resolveSuggestion();
  }, [resolveSuggestion, refreshTrigger]);

  useEffect(() => {
    const onPinChange = () => resolveSuggestion();
    window.addEventListener('pinned-suggestion-changed', onPinChange);
    return () => {
      window.removeEventListener('pinned-suggestion-changed', onPinChange);
    };
  }, [resolveSuggestion]);

  const handleUnpin = () => {
    void clearPinnedSuggestion();
    // resolveSuggestion will fire via the event listener
  };

  if (loading) {
    return (
      <div className="card-premium p-6 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-3"></div>
        <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>
    );
  }

  if (error || !suggestion) {
    // Silent failure — widget is non-critical, just hide on error
    return null;
  }

  const isAi = suggestion.source === 'ai';

  return (
    <div className="card-premium p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-secondary/20 flex items-center justify-center text-secondary rounded-lg">
            {suggestion.isVegDay ? <Leaf className="w-5 h-5" /> : <ChefHat className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Suggested for next cook
              {isPinned && (
                <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <Pin className="w-3 h-3" />
                  Pinned
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {isPinned
                ? isAi
                  ? 'You picked this AI suggestion'
                  : 'You picked this'
                : 'Based on your rotation'}
            </div>
          </div>
        </div>
        {isPinned ? (
          <button
            onClick={handleUnpin}
            className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
            title="Unpin and use default suggestion"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <Sparkles className="w-4 h-4 text-fuchsia-400 shrink-0" />
        )}
      </div>

      <h3 className="text-base sm:text-lg font-bold text-foreground mb-3 break-words">
        {suggestion.menu}
      </h3>

      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-muted-foreground">Estimated cost</span>
        <span className="font-semibold text-foreground tabular-nums">
          {formatCurrency(suggestion.estimatedCost)}
        </span>
      </div>

      <Link
        href="/suggestions"
        className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-muted hover:bg-border text-foreground rounded-lg font-medium text-sm transition-colors"
      >
        {isPinned ? 'Pick a different one' : 'View 3 options'}
        <ArrowRight className="w-4 h-4" />
      </Link>

      {isPinned && pinnedAt && (
        <p className="mt-2 text-xs text-muted-foreground text-center">
          Pinned {timeAgo(pinnedAt)}
        </p>
      )}
    </div>
  );
}

