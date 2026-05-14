import { SuggestionPreferences } from '@/types';
import { DEFAULT_SUGGESTION_PREFERENCES } from './suggestionDefaults';

// Re-export so existing server-side imports keep working
export { DEFAULT_SUGGESTION_PREFERENCES, validateSuggestionPreferences } from './suggestionDefaults';

export interface Settings {
  baseFee: number;
  baselineDailyLow: number;
  baselineDailyHigh: number;
  baselineDailyAvg: number;
  trackingStartDate?: string; // ISO date string, optional
  // Epoch for the cooking-cadence engine — kept separate from trackingStartDate
  // (a different concern). The cadence engine only scopes itself to cooks on or
  // after this date; it does not affect history or stats views.
  cadenceStartDate?: string;
  suggestionPreferences?: SuggestionPreferences;
}

const defaultSettings: Settings = {
  baseFee: 0, // Will be set via env or needs to be configured
  baselineDailyLow: 360,
  baselineDailyHigh: 400,
  baselineDailyAvg: 380,
  trackingStartDate: undefined,
  cadenceStartDate: '2026-05-17', // operational rollout value
  suggestionPreferences: DEFAULT_SUGGESTION_PREFERENCES,
};

// Merge stored preferences over defaults so old settings docs surface complete shapes
export function getSuggestionPreferences(settings: Settings): SuggestionPreferences {
  return { ...DEFAULT_SUGGESTION_PREFERENCES, ...(settings.suggestionPreferences ?? {}) };
}

// Get settings with priority: MongoDB > Environment Variables > Defaults
export async function getSettings(): Promise<Settings> {
  // Try MongoDB first
  const { getSettingsFromDb } = await import('./db');
  const dbSettings = await getSettingsFromDb();

  if (dbSettings) {
    return {
      ...dbSettings,
      cadenceStartDate: dbSettings.cadenceStartDate ?? defaultSettings.cadenceStartDate,
      suggestionPreferences: getSuggestionPreferences(dbSettings),
    };
  }

  // Fall back to environment variables
  const envSettings: Partial<Settings> = {};

  if (process.env.BASE_FEE) {
    envSettings.baseFee = Number(process.env.BASE_FEE);
  }
  if (process.env.BASELINE_DAILY_LOW) {
    envSettings.baselineDailyLow = Number(process.env.BASELINE_DAILY_LOW);
  }
  if (process.env.BASELINE_DAILY_HIGH) {
    envSettings.baselineDailyHigh = Number(process.env.BASELINE_DAILY_HIGH);
  }
  if (process.env.BASELINE_DAILY_AVG) {
    envSettings.baselineDailyAvg = Number(process.env.BASELINE_DAILY_AVG);
  }
  if (process.env.TRACKING_START_DATE) {
    envSettings.trackingStartDate = process.env.TRACKING_START_DATE;
  }
  if (process.env.CADENCE_START_DATE) {
    envSettings.cadenceStartDate = process.env.CADENCE_START_DATE;
  }

  return {
    baseFee: envSettings.baseFee ?? defaultSettings.baseFee,
    baselineDailyLow: envSettings.baselineDailyLow ?? defaultSettings.baselineDailyLow,
    baselineDailyHigh: envSettings.baselineDailyHigh ?? defaultSettings.baselineDailyHigh,
    baselineDailyAvg: envSettings.baselineDailyAvg ?? defaultSettings.baselineDailyAvg,
    trackingStartDate: envSettings.trackingStartDate ?? defaultSettings.trackingStartDate,
    cadenceStartDate: envSettings.cadenceStartDate ?? defaultSettings.cadenceStartDate,
    suggestionPreferences: { ...DEFAULT_SUGGESTION_PREFERENCES },
  };
}

// Synchronous version for use in non-async contexts (with env fallback only)
export function getSettingsSync(): Settings {
  return {
    baseFee: process.env.BASE_FEE ? Number(process.env.BASE_FEE) : defaultSettings.baseFee,
    baselineDailyLow: process.env.BASELINE_DAILY_LOW
      ? Number(process.env.BASELINE_DAILY_LOW)
      : defaultSettings.baselineDailyLow,
    baselineDailyHigh: process.env.BASELINE_DAILY_HIGH
      ? Number(process.env.BASELINE_DAILY_HIGH)
      : defaultSettings.baselineDailyHigh,
    baselineDailyAvg: process.env.BASELINE_DAILY_AVG
      ? Number(process.env.BASELINE_DAILY_AVG)
      : defaultSettings.baselineDailyAvg,
    trackingStartDate: process.env.TRACKING_START_DATE || defaultSettings.trackingStartDate,
    cadenceStartDate: process.env.CADENCE_START_DATE || defaultSettings.cadenceStartDate,
    suggestionPreferences: { ...DEFAULT_SUGGESTION_PREFERENCES },
  };
}
