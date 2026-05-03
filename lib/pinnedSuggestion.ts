// Client-only helpers for "pinning" a chosen suggestion to the Dashboard widget.
// Persisted in MongoDB via /api/pinned-suggestion so it's shared across devices.

import { Suggestion } from '@/types';

export interface PinnedSuggestion {
  suggestion: Suggestion;
  pinnedAt: number;
}

const PIN_CHANGED_EVENT = 'pinned-suggestion-changed';

function notifyPinChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PIN_CHANGED_EVENT));
}

export async function savePinnedSuggestion(suggestion: Suggestion): Promise<PinnedSuggestion | null> {
  try {
    const res = await fetch('/api/pinned-suggestion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestion }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { pinned: PinnedSuggestion | null };
    notifyPinChanged();
    return data.pinned;
  } catch {
    return null;
  }
}

export async function loadPinnedSuggestion(): Promise<PinnedSuggestion | null> {
  try {
    const res = await fetch('/api/pinned-suggestion', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { pinned: PinnedSuggestion | null };
    const pinned = data.pinned;
    if (!pinned || !pinned.suggestion || typeof pinned.suggestion.menu !== 'string') return null;
    return pinned;
  } catch {
    return null;
  }
}

export async function clearPinnedSuggestion(): Promise<void> {
  try {
    await fetch('/api/pinned-suggestion', { method: 'DELETE' });
  } finally {
    notifyPinChanged();
  }
}
