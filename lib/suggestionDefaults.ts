// Client-safe constants and validators for SuggestionPreferences.
// Kept separate from lib/config.ts so importing these into client components
// does not transitively pull in MongoDB via getSettings().

import { SuggestionPreferences } from '@/types';

export const DEFAULT_SUGGESTION_PREFERENCES: SuggestionPreferences = {
  allowedProteins: ['chicken', 'paneer', 'egg', 'mushroom'],
  vegDaysPerWeek: 1,
  favoriteItems: [],
  avoidItems: [],
  includeExtras: true,
  maxBudgetPerCook: 1200,
  defaultDaysToLast: 4,
};

// Validate + normalize a preferences payload from the client
export function validateSuggestionPreferences(input: unknown): SuggestionPreferences {
  if (!input || typeof input !== 'object') {
    return { ...DEFAULT_SUGGESTION_PREFERENCES };
  }
  const raw = input as Partial<Record<keyof SuggestionPreferences, unknown>>;

  const allowedProteins = Array.isArray(raw.allowedProteins)
    ? (raw.allowedProteins as unknown[]).filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map(s => s.trim().toLowerCase())
    : [];

  const favoriteItems = Array.isArray(raw.favoriteItems)
    ? (raw.favoriteItems as unknown[]).filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map(s => s.trim().toLowerCase())
    : [];

  const avoidItems = Array.isArray(raw.avoidItems)
    ? (raw.avoidItems as unknown[]).filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map(s => s.trim().toLowerCase())
    : [];

  let vegDaysPerWeek = Number(raw.vegDaysPerWeek);
  if (!Number.isFinite(vegDaysPerWeek)) vegDaysPerWeek = DEFAULT_SUGGESTION_PREFERENCES.vegDaysPerWeek;
  vegDaysPerWeek = Math.max(0, Math.min(7, Math.round(vegDaysPerWeek)));

  let maxBudgetPerCook = Number(raw.maxBudgetPerCook);
  if (!Number.isFinite(maxBudgetPerCook) || maxBudgetPerCook < 100) {
    maxBudgetPerCook = DEFAULT_SUGGESTION_PREFERENCES.maxBudgetPerCook;
  }

  let defaultDaysToLast = Number(raw.defaultDaysToLast);
  if (!Number.isFinite(defaultDaysToLast) || defaultDaysToLast < 1) {
    defaultDaysToLast = DEFAULT_SUGGESTION_PREFERENCES.defaultDaysToLast;
  }
  defaultDaysToLast = Math.max(1, Math.min(14, Math.round(defaultDaysToLast)));

  return {
    allowedProteins: allowedProteins.length > 0 ? allowedProteins : [...DEFAULT_SUGGESTION_PREFERENCES.allowedProteins],
    vegDaysPerWeek,
    favoriteItems,
    avoidItems,
    includeExtras: typeof raw.includeExtras === 'boolean' ? raw.includeExtras : DEFAULT_SUGGESTION_PREFERENCES.includeExtras,
    maxBudgetPerCook,
    defaultDaysToLast,
  };
}
