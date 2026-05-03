// Per-month localStorage cache for AI-generated monthly insights.
// Mirrors the SSR-safe pattern used in lib/pinnedSuggestion.ts.

import { MonthInsight } from '@/types';

const KEY = 'food-spend-insights-cache:v1';

type CacheMap = Record<string, MonthInsight>; // keyed by 'YYYY-MM'

function readMap(): CacheMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as CacheMap;
  } catch {
    return {};
  }
}

function writeMap(map: CacheMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('insights-cache-changed'));
  } catch {
    // quota or disabled — silent
  }
}

export function loadInsight(monthKey: string): MonthInsight | null {
  const map = readMap();
  const insight = map[monthKey];
  if (!insight || typeof insight.summary !== 'string') return null;
  return insight;
}

export function saveInsight(insight: MonthInsight): void {
  const map = readMap();
  map[insight.month] = insight;
  writeMap(map);
}

export function clearInsight(monthKey: string): void {
  const map = readMap();
  delete map[monthKey];
  writeMap(map);
}
