'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { MonthInsight, DashboardMetrics } from '@/types';
import { loadInsight } from '@/lib/insightsCache';
import { timeAgo } from '@/lib/timeAgo';
import { Sparkles, RefreshCw, AlertCircle, Wand2 } from 'lucide-react';

interface InsightsCardProps {
  monthlyBreakdown: DashboardMetrics['monthlyBreakdown'];
  refreshTrigger?: number;
}

const MAX_DROPDOWN_MONTHS = 12;

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function formatCurrency(amount: number): string {
  return `Rs ${Math.round(amount).toLocaleString('en-US')}`;
}

export default function InsightsCard({ monthlyBreakdown, refreshTrigger }: InsightsCardProps) {
  // Only show months with cooks, capped at MAX_DROPDOWN_MONTHS, sorted newest-first
  const monthOptions = useMemo(() => {
    return monthlyBreakdown
      .filter(m => m.cookCount > 0)
      .slice() // copy before sort
      .sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1))
      .slice(0, MAX_DROPDOWN_MONTHS);
  }, [monthlyBreakdown]);

  // Default month: current if it has any breakdown entry, else newest available
  const defaultMonth = useMemo(() => {
    const cur = currentMonthKey();
    if (monthOptions.find(m => m.monthKey === cur)) return cur;
    return monthOptions[0]?.monthKey ?? cur;
  }, [monthOptions]);

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [insight, setInsight] = useState<MonthInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate cache when month changes
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setInsight(null);
    void loadInsight(selectedMonth).then(cached => {
      if (!cancelled) setInsight(cached);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedMonth, refreshTrigger]);

  // If selectedMonth disappears from options (rare — user deletes logs), fall back
  useEffect(() => {
    if (monthOptions.length > 0 && !monthOptions.find(m => m.monthKey === selectedMonth)) {
      setSelectedMonth(monthOptions[0].monthKey);
    }
  }, [monthOptions, selectedMonth]);

  const handleGenerate = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503) {
          setError(data.error || 'AI insights unavailable. Set ANTHROPIC_API_KEY in your .env.local file.');
        } else if (res.status === 400) {
          setError(data.error || 'Not enough data for this month.');
        } else {
          setError(data.error || 'Failed to generate insights.');
        }
        return;
      }
      const next = data.insight as MonthInsight;
      setInsight(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [loading, selectedMonth]);

  // Bail entirely if no months have cook data — Dashboard already has its own empty state
  if (monthOptions.length === 0) return null;

  // Detect staleness: cached snapshot cookCount vs live count for this month
  const liveBreakdown = monthlyBreakdown.find(m => m.monthKey === selectedMonth);
  const isStale = !!(
    insight &&
    liveBreakdown &&
    insight.stats.cookCount !== liveBreakdown.cookCount
  );

  const monthLabel = liveBreakdown?.month ?? selectedMonth;

  return (
    <div className="card-premium p-6 lg:p-8 animate-slide-up" style={{ animationDelay: '275ms' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Monthly Insights</h2>
            <p className="text-sm text-muted-foreground">AI-generated narrative for {monthLabel}</p>
          </div>
        </div>
        <select
          aria-label="Select month for insights"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none transition-all"
        >
          {monthOptions.map(m => (
            <option key={m.monthKey} value={m.monthKey}>{m.month}</option>
          ))}
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-3 rounded-lg border border-amber-500/50 bg-amber-500/5 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-foreground">{error}</div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stale-data hint */}
      {insight && isStale && !loading && (
        <div className="mb-4 p-3 rounded-lg border border-blue-500/50 bg-blue-500/5 text-sm flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1 text-foreground">
            Logs changed since this was generated. Want fresh insights?
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Regenerate
          </button>
        </div>
      )}

      {/* Empty state — no cached insight yet */}
      {!insight && !loading && (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            No insights generated yet for {monthLabel}.
          </p>
          <button
            onClick={handleGenerate}
            disabled={loading}
            aria-label={`Generate insights for ${monthLabel}`}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5" />
            Generate insights for {monthLabel}
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="pt-3 space-y-2">
            <div className="h-3 bg-muted rounded w-2/3"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      )}

      {/* Loaded state */}
      {insight && !loading && (
        <div className="space-y-4">
          <p className="text-base text-foreground leading-relaxed">{insight.summary}</p>

          {insight.highlights.length > 0 && (
            <ul className="space-y-2 pt-2">
              {insight.highlights.map((h, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground">
                  <span className="text-fuchsia-500 shrink-0 mt-0.5">▸</span>
                  <span className="flex-1">{h}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Stats footer + actions */}
          <div className="pt-4 mt-2 border-t border-border flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {formatCurrency(insight.stats.totalSpend)} total ·{' '}
              {insight.stats.cookCount} cook{insight.stats.cookCount === 1 ? '' : 's'} ·{' '}
              Generated {timeAgo(insight.generatedAt)}
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              aria-label={`Regenerate insights for ${monthLabel}`}
              title="API cost: ~$0.001 per generation"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-border text-foreground rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
