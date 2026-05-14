import type { CadenceStatus } from '@/lib/cadence';
import type { PaymentAlert } from '@/lib/paymentAlert';

export enum RecordType {
  COOK = 'COOK',
  GROCERY = 'GROCERY',
  PAYMENT = 'PAYMENT',
  ADVANCE = 'ADVANCE',
  MISSED = 'MISSED',
}

export enum BoughtBy {
  STAFF = 'STAFF',
  ME = 'ME',
}

// Base fields shared by all log types
export interface BaseLog {
  _id?: string;
  recordType: RecordType;
  date: string; // ISO date string
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Cook Log
export interface CookLog extends BaseLog {
  recordType: RecordType.COOK;
  menu: string;
  baseFee: number; // Snapshot from settings at time of creation
  daysFoodLasted?: number; // Derived: calculated from previous cook date
}

// Grocery Log
export interface GroceryLog extends BaseLog {
  recordType: RecordType.GROCERY;
  category: string;
  amount: number;
  boughtBy: BoughtBy;
  reimbursable: boolean; // Derived: boughtBy === BoughtBy.STAFF
  linkedCookId?: string; // Optional link to a cook log
}

// Payment Log
export interface PaymentLog extends BaseLog {
  recordType: RecordType.PAYMENT;
  amountPaid: number;
  method?: string;
  remarks?: string;
  isTip?: boolean; // Flag to explicitly mark tips
}

// Advance Log — cash given to staff to pre-fund grocery shopping.
// Drawn down FIFO by subsequent staff groceries until exhausted.
export interface AdvanceLog extends BaseLog {
  recordType: RecordType.ADVANCE;
  amountGiven: number;
}

// Missed Check-in Log — system-generated when a hard cadence check-in date
// passes without a cook. Never created or edited by the user. Idempotency key
// is { nepaliMonth, hardCheckinDate }. `date` mirrors `hardCheckinDate` so the
// record sorts and renders alongside other log types.
export interface MissedCheckinLog extends BaseLog {
  recordType: RecordType.MISSED;
  nepaliMonth: string; // e.g. "2083-Jestha"
  hardCheckinDate: string; // ISO date — the missed hard check-in date
  detectedAt: string; // ISO timestamp when reconcile recorded it
}

// Union type for all log entries
export type LogEntry = CookLog | GroceryLog | PaymentLog | AdvanceLog | MissedCheckinLog;

// Dashboard metrics
export interface DashboardMetrics {
  amountDue: number;
  totalFoodSpend: {
    thisMonth: number;
    allTime: number;
  };
  monthlyBreakdown: Array<{
    monthKey: string; // 'YYYY-MM', e.g., "2025-11" — stable key for lookups
    month: string; // display label, e.g., "Nov 2025"
    year: number;
    monthName: string;
    totalSpend: number;
    cookCount: number;
    groceryCount: number;
  }>;
  effectiveDailyCost: number;
  avgCookCostPerDay: number; // Added: breakdown of cook cost
  avgGroceriesCostPerDay: number; // Added: breakdown of groceries cost
  baselineCost: {
    low: number;
    high: number;
    avg: number;
  };
  savings: {
    daily: number;
    monthly: number;
    vsLow: number;
    vsHigh: number;
  };
  trackingWindow: {
    startDate: string;
    endDate: string;
    days: number;
  };
  stats: {
    totalCookSessions: number;
    totalGroceries: number;
    totalPayments: number;
    totalAdvances: number;
  };
  nextCookTime?: string; // ISO date string: latest cook log date + 3 days
  lastCookTime?: string; // ISO date string: latest cook log date
  // Advance ledger — cash held by staff for groceries
  advanceBalance: number;        // unused advance currently held by staff
  totalAdvancesGiven: number;    // lifetime advances handed over
  totalAdvancesDrawn: number;    // lifetime drawdown via groceries
  lastAdvanceDate?: string;
  // Cooking-cadence status — null when no cadenceStartDate is configured.
  cadenceStatus: CadenceStatus | null;
  // End-of-month payment reminder, scoped to the current Nepali billing cycle.
  paymentAlert: PaymentAlert;
}

// ===== Suggestion feature =====

export type FoodCategory = 'grain' | 'dal' | 'protein' | 'veg' | 'extra';

export interface FoodItem {
  canonical: string;
  aliases: string[];
  category: FoodCategory;
  isVeg: boolean;
  estimatedCost: number;
  groceryUnit: string;
  // Optional: original label parsed from a menu string (e.g., "Paneer Sabji" → canonical "paneer").
  // Used for display so AI-generated dish names aren't flattened to canonical.
  displayName?: string;
}

export interface GroceryItem {
  name: string;
  qty: string;
  estCost: number;
  source: 'staff' | 'pantry';
}

export interface Suggestion {
  menu: string;
  items: FoodItem[];
  reasoning: string[];
  estimatedCost: number;
  cookFee: number;
  groceryList: GroceryItem[];
  daysToLast: number;
  isVegDay: boolean;
  tags: string[];
  source: 'rules' | 'ai';
  strategy: 'balanced' | 'veg' | 'new' | 'ai';
}

export interface SuggestionContext {
  lastCookDate: string | null;
  nextCookDate: string | null;
  daysSinceLastCook: number | null;
  cooksThisWeek: number;
  vegCooksThisWeek: number;
}

export interface Bookmark {
  _id: string;
  suggestion: Suggestion;
  bookmarkedAt: string;
}

export interface SuggestionPreferences {
  allowedProteins: string[];
  vegDaysPerWeek: number;
  favoriteItems: string[];
  avoidItems: string[];
  includeExtras: boolean;
  maxBudgetPerCook: number;
  defaultDaysToLast: number;
}

// ===== Insights feature =====

export interface OutlierPurchase {
  amount: number;
  description: string;
  date: string;
  boughtBy: BoughtBy;
  reason: string; // e.g., "5.4× this month's median grocery"
}

export interface InsightStats {
  month: string;             // 'YYYY-MM'
  monthLabel: string;        // 'March 2026'
  // In-progress detection — the current calendar month is partial; everything
  // else is a completed month. Forecast fields are only populated when in progress.
  isCurrentMonth: boolean;
  daysElapsed: number;       // 1 = day 1 of month; for past months = daysInMonth
  daysInMonth: number;
  projectedTotalSpend: number | null;     // only set when isCurrentMonth — linear extrapolation
  projectedCookCount: number | null;      // only set when isCurrentMonth
  projectedNormalizedTotalSpend: number | null;
  totalSpend: number;        // raw total
  normalizedTotalSpend: number; // raw total minus outlierPurchases (apples-to-apples comparable)
  cookFees: number;
  groceryTotal: number;
  outlierPurchases: OutlierPurchase[]; // one-time / bulk buys to call out separately
  cookCount: number;
  vegCookCount: number;
  avgIntervalDays: number | null;
  largestPurchase: {
    amount: number;
    description: string;
    date: string;
    boughtBy: BoughtBy;
  } | null;
  tipsTotal: number;
  prevMonth: {
    month: string;
    totalSpend: number;
    normalizedTotalSpend: number; // prev minus prev's outliers — use this for fair comparison
    outlierTotal: number;
    cookFees: number;
    groceryTotal: number;
    normalizedGroceryTotal: number; // groceries minus outliers
    cookCount: number;
  } | null;
  rolling3MonthAvg: {
    totalSpend: number;
    normalizedTotalSpend: number;
    cookFees: number;
    groceryTotal: number;
    normalizedGroceryTotal: number;
    cookCount: number;
  };
  // Long-window historical baselines used for smart in-progress projection.
  // Computed across up to 6 prior completed months; null when no history exists.
  historicalAverages: {
    monthsAnalyzed: number;
    avgCookCountPerMonth: number;
    avgCostPerCookDay: number;       // cook fee + groceries (normalized)
    avgIntervalDays: number;         // days between consecutive cooks
  } | null;
}

export interface MonthInsight {
  month: string;             // 'YYYY-MM'
  summary: string;           // 2–3 sentence narrative
  highlights: string[];      // 1–3 short bullet observations
  generatedAt: string;       // ISO timestamp
  stats: InsightStats;       // raw numbers the AI saw, surfaced in the card
}

