import {
  LogEntry,
  RecordType,
  InsightStats,
  CookLog,
  GroceryLog,
  PaymentLog,
  BoughtBy,
  OutlierPurchase,
} from '@/types';
import { Settings } from './config';
import { categorize } from './foodTaxonomy';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthKeyOf(dateString: string): string {
  // Use UTC slice to match `new Date().toISOString().slice(0, 7)` on the client
  return new Date(dateString).toISOString().slice(0, 7);
}

function isCookLog(log: LogEntry): log is CookLog {
  return log.recordType === RecordType.COOK;
}
function isGroceryLog(log: LogEntry): log is GroceryLog {
  return log.recordType === RecordType.GROCERY;
}
function isPaymentLog(log: LogEntry): log is PaymentLog {
  return log.recordType === RecordType.PAYMENT;
}

function isTipPayment(log: PaymentLog): boolean {
  if (log.isTip === true) return true;
  const r = (log.remarks || '').toLowerCase();
  const n = (log.notes || '').toLowerCase();
  return r.includes('tip') || n.includes('tip');
}

function todayMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * For a given monthKey, return:
 *   - isCurrentMonth: true if it matches today's month
 *   - daysElapsed: how many days into the month the user is (1-based, capped at daysInMonth)
 *   - daysInMonth: total days in that month
 *
 * For any past month, daysElapsed === daysInMonth (the month is "complete" by definition).
 * For the current month, daysElapsed is today's day-of-month.
 */
function monthProgressFor(monthKey: string): { isCurrentMonth: boolean; daysElapsed: number; daysInMonth: number } {
  const [y, m] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate(); // day 0 of next month = last day of this
  const todayKey = todayMonthKey();
  if (monthKey === todayKey) {
    const today = new Date();
    const daysElapsed = Math.min(today.getDate(), daysInMonth);
    return { isCurrentMonth: true, daysElapsed, daysInMonth };
  }
  return { isCurrentMonth: false, daysElapsed: daysInMonth, daysInMonth };
}

function shiftMonth(monthKey: string, deltaMonths: number): string {
  // monthKey: 'YYYY-MM'. Returns the month shifted by deltaMonths.
  const [y, m] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + deltaMonths, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabelFromKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function logsForMonth(logs: LogEntry[], monthKey: string): LogEntry[] {
  return logs.filter(l => monthKeyOf(l.date) === monthKey);
}

function sumGroceries(logs: LogEntry[]): number {
  return logs.filter(isGroceryLog).reduce((sum, g) => sum + (g.amount || 0), 0);
}

function sumCookFees(logs: LogEntry[], settings: Settings): number {
  return logs
    .filter(isCookLog)
    .reduce((sum, c) => sum + (c.baseFee ?? settings.baseFee), 0);
}

function totalSpend(logs: LogEntry[], settings: Settings): number {
  return sumCookFees(logs, settings) + sumGroceries(logs);
}

function cookCountIn(logs: LogEntry[]): number {
  return logs.filter(isCookLog).length;
}

function vegCookCountIn(logs: LogEntry[]): number {
  return logs.filter(isCookLog).reduce((n, c) => {
    const cat = categorize(c.menu);
    return n + (cat.isVegMeal ? 1 : 0);
  }, 0);
}

function avgIntervalForMonth(logs: LogEntry[], monthKey: string): number | null {
  const cooks = logs
    .filter(isCookLog)
    .filter(c => monthKeyOf(c.date) === monthKey)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  if (cooks.length < 2) return null;

  let total = 0;
  let count = 0;
  for (let i = 1; i < cooks.length; i++) {
    const diff = (new Date(cooks[i].date).getTime() - new Date(cooks[i - 1].date).getTime()) / (1000 * 60 * 60 * 24);
    if (diff > 0) {
      total += diff;
      count++;
    }
  }
  return count > 0 ? total / count : null;
}

function tipsTotalIn(logs: LogEntry[]): number {
  return logs
    .filter(isPaymentLog)
    .filter(isTipPayment)
    .reduce((sum, p) => sum + (p.amountPaid || 0), 0);
}

function largestPurchaseIn(logs: LogEntry[]): InsightStats['largestPurchase'] {
  // Look at grocery logs only — those are the "purchases" the user makes.
  const groceries = logs.filter(isGroceryLog);
  if (groceries.length === 0) return null;
  const top = groceries.reduce((max, g) => ((g.amount || 0) > (max.amount || 0) ? g : max), groceries[0]);
  if (!top.amount) return null;
  return {
    amount: top.amount,
    description: top.category || top.notes || 'Groceries',
    date: top.date,
    boughtBy: (top.boughtBy as BoughtBy) ?? BoughtBy.STAFF,
  };
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Identify outlier grocery purchases — typically bulk stockpile buys (e.g., 20kg rice)
 * or premium one-off purchases that distort month-to-month comparisons.
 *
 * Rule: a grocery is an outlier if its amount >= max(2.5 × month median, Rs 1,000).
 * The Rs 1,000 floor prevents flagging routine ~Rs 500 buys as outliers when median is low.
 */
function findOutliers(logs: LogEntry[]): OutlierPurchase[] {
  const groceries = logs.filter(isGroceryLog);
  if (groceries.length < 2) return [];

  const amounts = groceries.map(g => g.amount || 0).filter(a => a > 0);
  const med = median(amounts);
  const threshold = Math.max(2.5 * med, 1000);

  return groceries
    .filter(g => (g.amount || 0) >= threshold)
    .map(g => {
      const ratio = med > 0 ? ((g.amount || 0) / med).toFixed(1) : 'unknown';
      const reason = med > 0
        ? `${ratio}× this month's median grocery (Rs ${Math.round(med)})`
        : `large one-off purchase`;
      return {
        amount: g.amount,
        description: g.category || g.notes || 'Groceries',
        date: g.date,
        boughtBy: (g.boughtBy as BoughtBy) ?? BoughtBy.STAFF,
        reason,
      };
    });
}

function outlierTotalIn(logs: LogEntry[]): number {
  return findOutliers(logs).reduce((sum, o) => sum + o.amount, 0);
}

/**
 * Compute historical baselines across the most recent N completed months
 * (excluding `excludingMonthKey`, which is typically the current/in-progress month).
 *
 * - `avgCookCountPerMonth`: mean across analyzed months
 * - `avgCostPerCookDay`: total normalized spend / total cook count (one ratio across all months)
 * - `avgIntervalDays`: mean gap between consecutive cooks (clamped 1–14d to ignore data-gap months)
 *
 * Returns null when there are zero completed months with cook data.
 */
function computeHistoricalAverages(
  logs: LogEntry[],
  excludingMonthKey: string,
  settings: Settings,
  lookbackMonths = 6
): InsightStats['historicalAverages'] {
  const monthKeys = listMonthsWithCookData(logs)
    .filter(m => m !== excludingMonthKey)
    .slice(0, lookbackMonths);

  if (monthKeys.length === 0) return null;

  let totalCooks = 0;
  let totalNormalizedSpend = 0;

  for (const mk of monthKeys) {
    const monthLogs = logsForMonth(logs, mk);
    const cookCount = cookCountIn(monthLogs);
    const monthSpend = totalSpend(monthLogs, settings);
    const monthOutliers = outlierTotalIn(monthLogs);

    totalCooks += cookCount;
    totalNormalizedSpend += monthSpend - monthOutliers;
  }

  const avgCookCountPerMonth = totalCooks / monthKeys.length;
  const avgCostPerCookDay = totalCooks > 0 ? totalNormalizedSpend / totalCooks : 0;

  // Avg interval between consecutive cooks across the analyzed window
  const sortedCooks = logs
    .filter(isCookLog)
    .filter(c => monthKeys.includes(monthKeyOf(c.date)))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  let intervalSum = 0;
  let intervalCount = 0;
  for (let i = 1; i < sortedCooks.length; i++) {
    const diff = (new Date(sortedCooks[i].date).getTime() - new Date(sortedCooks[i - 1].date).getTime()) / (1000 * 60 * 60 * 24);
    // Clamp 1–14 to ignore data-gap artifacts (e.g., month-to-month skip without logs)
    if (diff >= 1 && diff <= 14) {
      intervalSum += diff;
      intervalCount++;
    }
  }
  const avgIntervalDays = intervalCount > 0 ? intervalSum / intervalCount : 4.5;

  return {
    monthsAnalyzed: monthKeys.length,
    avgCookCountPerMonth,
    avgCostPerCookDay,
    avgIntervalDays,
  };
}

/**
 * Compute structured stats for one month, including comparison to prior month
 * and 3-month rolling average. Pure function — no IO.
 */
export function computeMonthStats(
  logs: LogEntry[],
  monthKey: string,
  settings: Settings
): InsightStats {
  const monthLogs = logsForMonth(logs, monthKey);
  const cookFees = sumCookFees(monthLogs, settings);
  const groceryTotal = sumGroceries(monthLogs);
  const outlierPurchases = findOutliers(monthLogs);
  const outlierThisMonth = outlierPurchases.reduce((s, o) => s + o.amount, 0);
  const totalSpendThis = cookFees + groceryTotal;

  // Previous month stats (only if any logs exist for it)
  const prevKey = shiftMonth(monthKey, -1);
  const prevLogs = logsForMonth(logs, prevKey);
  const prevCookFees = sumCookFees(prevLogs, settings);
  const prevGroceryTotal = sumGroceries(prevLogs);
  const prevTotal = prevCookFees + prevGroceryTotal;
  const prevOutlierTotal = outlierTotalIn(prevLogs);
  const prevMonth = prevLogs.length > 0
    ? {
        month: prevKey,
        totalSpend: prevTotal,
        normalizedTotalSpend: prevTotal - prevOutlierTotal,
        outlierTotal: prevOutlierTotal,
        cookFees: prevCookFees,
        groceryTotal: prevGroceryTotal,
        normalizedGroceryTotal: prevGroceryTotal - prevOutlierTotal,
        cookCount: cookCountIn(prevLogs),
      }
    : null;

  // 3-month rolling average (the chosen month + 2 prior). Uses only months with data.
  const m1 = logsForMonth(logs, monthKey);
  const m2 = logsForMonth(logs, shiftMonth(monthKey, -1));
  const m3 = logsForMonth(logs, shiftMonth(monthKey, -2));
  const monthsWithData = [m1, m2, m3].filter(arr => arr.length > 0);
  const rolling3MonthAvg = monthsWithData.length > 0
    ? {
        totalSpend: monthsWithData.reduce((s, arr) => s + totalSpend(arr, settings), 0) / monthsWithData.length,
        normalizedTotalSpend: monthsWithData.reduce((s, arr) => s + totalSpend(arr, settings) - outlierTotalIn(arr), 0) / monthsWithData.length,
        cookFees: monthsWithData.reduce((s, arr) => s + sumCookFees(arr, settings), 0) / monthsWithData.length,
        groceryTotal: monthsWithData.reduce((s, arr) => s + sumGroceries(arr), 0) / monthsWithData.length,
        normalizedGroceryTotal: monthsWithData.reduce((s, arr) => s + sumGroceries(arr) - outlierTotalIn(arr), 0) / monthsWithData.length,
        cookCount: monthsWithData.reduce((s, arr) => s + cookCountIn(arr), 0) / monthsWithData.length,
      }
    : { totalSpend: 0, normalizedTotalSpend: 0, cookFees: 0, groceryTotal: 0, normalizedGroceryTotal: 0, cookCount: 0 };

  // In-progress detection + smart forecast (only for the current calendar month).
  // Smart projection blends current pace with historical average, weighted by how much
  // of the month has elapsed. Early in the month → trust history more (current pace is
  // noisy). Late in the month → trust current pace more (history less relevant).
  const progress = monthProgressFor(monthKey);
  const historicalAverages = computeHistoricalAverages(logs, monthKey, settings);
  const normalizedThisMonth = totalSpendThis - outlierThisMonth;
  const cookCountThis = cookCountIn(monthLogs);

  let projectedTotalSpend: number | null = null;
  let projectedCookCount: number | null = null;
  let projectedNormalizedTotalSpend: number | null = null;

  if (progress.isCurrentMonth && progress.daysElapsed > 0) {
    const remainingDays = Math.max(0, progress.daysInMonth - progress.daysElapsed);
    const elapsedFraction = progress.daysElapsed / progress.daysInMonth;

    if (!historicalAverages || historicalAverages.monthsAnalyzed === 0) {
      // No history — fall back to naive linear extrapolation
      const scale = progress.daysInMonth / progress.daysElapsed;
      projectedTotalSpend = totalSpendThis * scale;
      projectedCookCount = cookCountThis * scale;
      projectedNormalizedTotalSpend = normalizedThisMonth * scale;
    } else {
      // Two estimates of how many cooks happen in the remaining days:
      //   (a) current pace: scales today's cook rate to remaining time
      //   (b) historical: a fraction of typical monthly cook count
      const currentPaceRemainingCooks = cookCountThis * (remainingDays / progress.daysElapsed);
      const histRemainingCooks = historicalAverages.avgCookCountPerMonth * (remainingDays / progress.daysInMonth);

      // Blend: as the month progresses, weight current pace more
      const blendedRemainingCooks = elapsedFraction * currentPaceRemainingCooks
        + (1 - elapsedFraction) * histRemainingCooks;

      // Future spend = projected remaining cooks × historical avg cost-per-cook
      // (more stable than scaling current spend, since cooking is clustered)
      const remainingSpend = blendedRemainingCooks * historicalAverages.avgCostPerCookDay;

      projectedCookCount = cookCountThis + blendedRemainingCooks;
      projectedTotalSpend = totalSpendThis + remainingSpend;
      projectedNormalizedTotalSpend = normalizedThisMonth + remainingSpend;
    }
  }

  return {
    month: monthKey,
    monthLabel: monthLabelFromKey(monthKey),
    isCurrentMonth: progress.isCurrentMonth,
    daysElapsed: progress.daysElapsed,
    daysInMonth: progress.daysInMonth,
    projectedTotalSpend,
    projectedCookCount,
    projectedNormalizedTotalSpend,
    totalSpend: totalSpendThis,
    normalizedTotalSpend: normalizedThisMonth,
    cookFees,
    groceryTotal,
    outlierPurchases,
    cookCount: cookCountThis,
    vegCookCount: vegCookCountIn(monthLogs),
    avgIntervalDays: avgIntervalForMonth(logs, monthKey),
    largestPurchase: largestPurchaseIn(monthLogs),
    tipsTotal: tipsTotalIn(monthLogs),
    prevMonth,
    rolling3MonthAvg,
    historicalAverages,
  };
}

/**
 * Returns sorted (newest-first) list of monthKeys that have at least 1 cook log.
 * This is what the dropdown picks from — payment-only months are excluded
 * because the API would 400 on them.
 */
export function listMonthsWithCookData(logs: LogEntry[]): string[] {
  const set = new Set<string>();
  for (const log of logs) {
    if (isCookLog(log)) set.add(monthKeyOf(log.date));
  }
  return Array.from(set).sort().reverse();
}

/**
 * Default month for InsightsCard:
 * - Current month if it has ≥3 cook logs
 * - Otherwise: the most recent month with ≥1 cook log
 * - Fallback: current month (API will 400 if empty)
 */
export function defaultMonthForInsights(logs: LogEntry[]): string {
  const today = todayMonthKey();
  const currentCookCount = logs.filter(isCookLog).filter(c => monthKeyOf(c.date) === today).length;
  if (currentCookCount >= 3) return today;
  const months = listMonthsWithCookData(logs);
  return months[0] ?? today;
}
