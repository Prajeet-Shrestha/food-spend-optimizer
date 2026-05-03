// Client-only helpers for "pinning" a chosen suggestion to the Dashboard widget.
// Persisted in localStorage so it survives reloads and tab switches but stays per-device.

import { Suggestion } from '@/types';

const PIN_KEY = 'food-spend-pinned-suggestion:v1';

export interface PinnedSuggestion {
  suggestion: Suggestion;
  pinnedAt: number; // unix ms
}

export function savePinnedSuggestion(suggestion: Suggestion): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PinnedSuggestion = { suggestion, pinnedAt: Date.now() };
    localStorage.setItem(PIN_KEY, JSON.stringify(payload));
    // Notify same-tab listeners (storage events only fire across tabs, not same tab)
    window.dispatchEvent(new CustomEvent('pinned-suggestion-changed'));
  } catch {
    // quota or disabled — silent
  }
}

export function loadPinnedSuggestion(): PinnedSuggestion | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PinnedSuggestion;
    if (!parsed || !parsed.suggestion || typeof parsed.suggestion.menu !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPinnedSuggestion(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PIN_KEY);
  window.dispatchEvent(new CustomEvent('pinned-suggestion-changed'));
}
