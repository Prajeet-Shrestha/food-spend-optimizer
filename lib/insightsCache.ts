// Per-month insight cache, persisted in MongoDB via /api/insights.
// Reads return null when nothing is cached for that month.

import { MonthInsight } from '@/types';

export async function loadInsight(monthKey: string): Promise<MonthInsight | null> {
  try {
    const res = await fetch(`/api/insights?month=${encodeURIComponent(monthKey)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { insight: MonthInsight | null };
    const insight = data.insight;
    if (!insight || typeof insight.summary !== 'string') return null;
    return insight;
  } catch {
    return null;
  }
}
