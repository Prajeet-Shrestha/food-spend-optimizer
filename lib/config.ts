export interface Settings {
  baseFee: number;
  baselineDailyLow: number;
  baselineDailyHigh: number;
  baselineDailyAvg: number;
  trackingStartDate?: string; // ISO date string, optional
}

const defaultSettings: Settings = {
  baseFee: 0, // Will be set via env or needs to be configured
  baselineDailyLow: 360,
  baselineDailyHigh: 400,
  baselineDailyAvg: 380,
  trackingStartDate: undefined,
};

// Get settings with priority: MongoDB > Environment Variables > Defaults
export async function getSettings(): Promise<Settings> {
  // Try MongoDB first
  const { getSettingsFromDb } = await import('./db');
  const dbSettings = await getSettingsFromDb();
  
  if (dbSettings) {
    return dbSettings;
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
  
  return {
    baseFee: envSettings.baseFee ?? defaultSettings.baseFee,
    baselineDailyLow: envSettings.baselineDailyLow ?? defaultSettings.baselineDailyLow,
    baselineDailyHigh: envSettings.baselineDailyHigh ?? defaultSettings.baselineDailyHigh,
    baselineDailyAvg: envSettings.baselineDailyAvg ?? defaultSettings.baselineDailyAvg,
    trackingStartDate: envSettings.trackingStartDate ?? defaultSettings.trackingStartDate,
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
  };
}

