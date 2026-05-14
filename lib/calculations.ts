import { LogEntry, RecordType, DashboardMetrics, BoughtBy, PaymentLog, AdvanceLog, GroceryLog, MissedCheckinLog } from '@/types';
import { Settings } from './config';
import { getCadenceStatus } from './cadence';
import { getLocalDateKey } from './dateUtils';

export interface AdvanceLedger {
  perGroceryDrawn: Map<string, number>;
  totalAdvancesGiven: number;
  totalAdvancesDrawn: number;
  advanceBalance: number;
  lastAdvanceDate?: string;
}

/**
 * Walk advances and staff groceries chronologically and apply FIFO drawdown.
 * Tie-break same-date events by `_id` (MongoDB ObjectIds are chronologically
 * sortable strings — same convention as `calculateAmountDueUpToEntry`).
 */
export function computeAdvanceLedger(logs: LogEntry[]): AdvanceLedger {
  const events = logs
    .filter(
      log =>
        log.recordType === RecordType.ADVANCE ||
        (log.recordType === RecordType.GROCERY &&
          (log as GroceryLog).boughtBy === BoughtBy.STAFF)
    )
    .slice()
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const aId = a._id ?? '';
      const bId = b._id ?? '';
      return aId.localeCompare(bId);
    });

  const perGroceryDrawn = new Map<string, number>();
  let pool = 0;
  let totalAdvancesGiven = 0;
  let lastAdvanceDate: string | undefined;

  for (const event of events) {
    if (event.recordType === RecordType.ADVANCE) {
      const advance = event as AdvanceLog;
      pool += advance.amountGiven;
      totalAdvancesGiven += advance.amountGiven;
      if (!lastAdvanceDate || advance.date > lastAdvanceDate) {
        lastAdvanceDate = advance.date;
      }
    } else {
      const grocery = event as GroceryLog;
      const drawn = Math.min(pool, grocery.amount);
      pool -= drawn;
      if (grocery._id) {
        perGroceryDrawn.set(grocery._id, drawn);
      }
    }
  }

  let totalAdvancesDrawn = 0;
  for (const drawn of perGroceryDrawn.values()) {
    totalAdvancesDrawn += drawn;
  }

  return {
    perGroceryDrawn,
    totalAdvancesGiven,
    totalAdvancesDrawn,
    advanceBalance: pool,
    lastAdvanceDate,
  };
}

/**
 * Calculate days food lasted for a cook log based on previous cook date
 */
export function calculateDaysFoodLasted(
  cookDate: string,
  previousCookDate: string | null
): number | undefined {
  if (!previousCookDate) {
    return undefined; // First cook log, can't calculate
  }
  
  const current = new Date(cookDate);
  const previous = new Date(previousCookDate);
  const diffTime = current.getTime() - previous.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : undefined;
}

/**
 * Get the most recent cook log before a given date
 */
export function getPreviousCookLog(
  logs: LogEntry[],
  currentDate: string
): LogEntry | null {
  const cookLogs = logs
    .filter(log => log.recordType === RecordType.COOK)
    .filter(log => log.date < currentDate)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return cookLogs.length > 0 ? cookLogs[0] : null;
}

/**
 * Check if a payment is a tip (should be excluded from amount due calculation)
 */
function isTip(paymentLog: PaymentLog): boolean {
  const remarks = (paymentLog.remarks || '').toLowerCase();
  const notes = (paymentLog.notes || '').toLowerCase();
  return remarks.includes('tip') || notes.includes('tip') || paymentLog.isTip === true;
}

/**
 * Calculate amount due to cook.
 * Formula: cookFees + (staff groceries − advance drawdown) − non-tip payments.
 * Advances themselves don't enter the formula; they only reduce the
 * reimbursable portion of staff groceries via the drawdown map.
 */
export function calculateAmountDue(
  logs: LogEntry[],
  settings: Settings,
  perGroceryDrawn?: Map<string, number>
): number {
  const drawn = perGroceryDrawn ?? computeAdvanceLedger(logs).perGroceryDrawn;

  const cookLogs = logs.filter(log => log.recordType === RecordType.COOK);
  const staffGroceries = logs.filter(
    log => log.recordType === RecordType.GROCERY &&
    (log as any).boughtBy === BoughtBy.STAFF
  );
  const payments = logs.filter(log => log.recordType === RecordType.PAYMENT);

  const cookFees = cookLogs.reduce((sum, log) => {
    const cookLog = log as any;
    return sum + (cookLog.baseFee || settings.baseFee);
  }, 0);

  const staffGroceryTotal = staffGroceries.reduce((sum, log) => {
    const groceryLog = log as any;
    const amount = groceryLog.amount || 0;
    const drawnFromAdvance = (groceryLog._id && drawn.get(groceryLog._id)) || 0;
    return sum + (amount - drawnFromAdvance);
  }, 0);

  const nonTipPaymentTotal = payments
    .filter(log => !isTip(log as PaymentLog))
    .reduce((sum, log) => {
      const paymentLog = log as any;
      return sum + (paymentLog.amountPaid || 0);
    }, 0);

  return cookFees + staffGroceryTotal - nonTipPaymentTotal;
}

/**
 * Calculate total food spend
 */
export function calculateTotalFoodSpend(logs: LogEntry[], settings: Settings): number {
  const cookLogs = logs.filter(log => log.recordType === RecordType.COOK);
  const groceries = logs.filter(log => log.recordType === RecordType.GROCERY);
  
  const cookFees = cookLogs.reduce((sum, log) => {
    const cookLog = log as any;
    return sum + (cookLog.baseFee || settings.baseFee);
  }, 0);
  
  const groceryTotal = groceries.reduce((sum, log) => {
    const groceryLog = log as any;
    return sum + (groceryLog.amount || 0);
  }, 0);
  
  return cookFees + groceryTotal;
}

/**
 * Get tracking window dates
 * @param logs - All log entries
 * @param settings - App settings
 * @param recordTypeFilter - Optional: filter by specific record type (COOK, GROCERY, PAYMENT)
 */
export function getTrackingWindow(
  logs: LogEntry[],
  settings: Settings,
  recordTypeFilter?: RecordType
): { startDate: string; endDate: string; days: number } {
  const today = new Date().toISOString().split('T')[0];
  
  // Filter logs by record type if specified
  const filteredLogs = recordTypeFilter 
    ? logs.filter(log => log.recordType === recordTypeFilter)
    : logs;
  
  let startDate: string;
  let endDate: string;
  
  if (filteredLogs.length > 0) {
    // Find earliest and latest log dates from filtered logs
    const dates = filteredLogs.map(log => log.date).sort();
    
    // Start date: use trackingStartDate if set, otherwise earliest log date
    if (settings.trackingStartDate) {
      startDate = settings.trackingStartDate;
    } else {
      startDate = dates[0];
    }
    
    // End date: use latest log date from the filtered logs
    endDate = dates[dates.length - 1];
  } else {
    // No logs, use today
    startDate = settings.trackingStartDate || today;
    endDate = today;
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  
  return { startDate, endDate, days };
}

/**
 * Calculate average cook cost per day
 * Formula: Average of (baseFee / gap) for each cook session
 * Gap is capped at 4 days max
 */
export function calculateAvgCookCostPerDay(
  logs: LogEntry[],
  settings: Settings
): number {
  const cookLogs = logs
    .filter(log => log.recordType === RecordType.COOK)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (cookLogs.length === 0) {
    return 0;
  }
  
  const perDayCosts: number[] = [];
  const MAX_GAP_DAYS = 4;
  
  // Only process cook sessions that have a next cook date (exclude the last one)
  for (let i = 0; i < cookLogs.length - 1; i++) {
    const cookLog = cookLogs[i] as any;
    const baseFee = cookLog.baseFee || settings.baseFee;
    
    // Calculate gap to next cook date
    const nextCookDate = cookLogs[i + 1].date;
    const currentDate = new Date(cookLog.date);
    const nextDate = new Date(nextCookDate);
    const diffTime = nextDate.getTime() - currentDate.getTime();
    let gapDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Cap gap at 4 days if it's >= 5
    if (gapDays >= 5) {
      gapDays = 4;
    }
    
    if (gapDays > 0 && baseFee > 0) {
      const costPerDay = baseFee / gapDays;
      perDayCosts.push(costPerDay);
    }
  }
  
  if (perDayCosts.length === 0) {
    return 0;
  }
  
  const sum = perDayCosts.reduce((acc, cost) => acc + cost, 0);
  return sum / perDayCosts.length;
}

/**
 * Calculate average groceries cost per day
 * Formula: Total groceries / tracking window days (based on grocery dates)
 * This assumes groceries are spread across all days (since they last multiple cooks)
 */
export function calculateAvgGroceriesCostPerDay(
  logs: LogEntry[],
  settings: Settings
): number {
  const groceryLogs = logs.filter(log => log.recordType === RecordType.GROCERY);
  
  if (groceryLogs.length === 0) {
    return 0;
  }
  
  const totalGroceries = groceryLogs.reduce((sum, log) => {
    const groceryLog = log as any;
    return sum + (groceryLog.amount || 0);
  }, 0);
  
  // Use tracking window based on grocery dates only
  const { days } = getTrackingWindow(logs, settings, RecordType.GROCERY);
  
  return days > 0 ? totalGroceries / days : 0;
}

/**
 * Calculate effective daily cost (Average Cost Per Day)
 * Formula: Avg cook cost per day + Avg groceries cost per day
 */
export function calculateEffectiveDailyCost(
  logs: LogEntry[],
  settings: Settings
): number {
  const avgCookCost = calculateAvgCookCostPerDay(logs, settings);
  const avgGroceryCost = calculateAvgGroceriesCostPerDay(logs, settings);
  
  return avgCookCost + avgGroceryCost;
}

/**
 * Calculate savings metrics
 */
export function calculateSavings(
  effectiveDailyCost: number,
  settings: Settings
): {
  daily: number;
  monthly: number;
  vsLow: number;
  vsHigh: number;
} {
  const daily = settings.baselineDailyAvg - effectiveDailyCost;
  const monthly = daily * 30;
  const vsLow = settings.baselineDailyLow - effectiveDailyCost;
  const vsHigh = settings.baselineDailyHigh - effectiveDailyCost;
  
  return { daily, monthly, vsLow, vsHigh };
}

/**
 * Calculate monthly breakdown of food spend
 */
export function calculateMonthlyBreakdown(
  logs: LogEntry[],
  settings: Settings
): Array<{
  monthKey: string;
  month: string;
  year: number;
  monthName: string;
  totalSpend: number;
  cookCount: number;
  groceryCount: number;
}> {
  // Group logs by month
  const monthlyData: { [key: string]: LogEntry[] } = {};

  logs.forEach(log => {
    // MISSED records carry no spend — keep them out of the historical breakdown
    // so they never create an empty month row.
    if (log.recordType === RecordType.MISSED) return;
    const date = new Date(log.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = [];
    }
    monthlyData[monthKey].push(log);
  });
  
  // Calculate spend for each month
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return Object.keys(monthlyData)
    .sort()
    .map(monthKey => {
      const [year, month] = monthKey.split('-');
      const monthLogs = monthlyData[monthKey];
      const monthNum = parseInt(month) - 1;
      
      const totalSpend = calculateTotalFoodSpend(monthLogs, settings);
      const cookCount = monthLogs.filter(log => log.recordType === RecordType.COOK).length;
      const groceryCount = monthLogs.filter(log => log.recordType === RecordType.GROCERY).length;
      
      return {
        monthKey: monthKey, // 'YYYY-MM' for stable lookups
        month: `${monthNames[monthNum]} ${year}`,
        year: parseInt(year),
        monthName: monthNames[monthNum],
        totalSpend,
        cookCount,
        groceryCount,
      };
    });
}

/**
 * Calculate last cook time (latest cook log date)
 */
export function calculateLastCookTime(logs: LogEntry[]): string | undefined {
  const cookLogs = logs
    .filter(log => log.recordType === RecordType.COOK)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (cookLogs.length === 0) {
    return undefined;
  }
  
  return cookLogs[0].date;
}

/**
 * Calculate next cook time (latest cook log date + 3 days)
 */
export function calculateNextCookTime(logs: LogEntry[]): string | undefined {
  const cookLogs = logs
    .filter(log => log.recordType === RecordType.COOK)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (cookLogs.length === 0) {
    return undefined;
  }
  
  const latestCookDate = new Date(cookLogs[0].date);
  const nextCookDate = new Date(latestCookDate);
  nextCookDate.setDate(nextCookDate.getDate() + 3);
  
  return nextCookDate.toISOString().split('T')[0];
}

/**
 * Calculate all dashboard metrics
 */
export function calculateDashboardMetrics(
  logs: LogEntry[],
  settings: Settings
): DashboardMetrics {
  const ledger = computeAdvanceLedger(logs);
  const amountDue = calculateAmountDue(logs, settings, ledger.perGroceryDrawn);
  const totalFoodSpendAllTime = calculateTotalFoodSpend(logs, settings);

  // Calculate this month's spend
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const thisMonthLogs = logs.filter(log => log.date >= firstDayOfMonth);
  const totalFoodSpendThisMonth = calculateTotalFoodSpend(thisMonthLogs, settings);

  const avgCookCostPerDay = calculateAvgCookCostPerDay(logs, settings);
  const avgGroceriesCostPerDay = calculateAvgGroceriesCostPerDay(logs, settings);
  const effectiveDailyCost = calculateEffectiveDailyCost(logs, settings);
  const trackingWindow = getTrackingWindow(logs, settings);
  const savings = calculateSavings(effectiveDailyCost, settings);
  const monthlyBreakdown = calculateMonthlyBreakdown(logs, settings);

  const cookLogs = logs.filter(log => log.recordType === RecordType.COOK);
  const groceries = logs.filter(log => log.recordType === RecordType.GROCERY);
  const payments = logs.filter(log => log.recordType === RecordType.PAYMENT);
  const advances = logs.filter(log => log.recordType === RecordType.ADVANCE);
  const lastCookTime = calculateLastCookTime(logs);
  const nextCookTime = calculateNextCookTime(logs);

  const missedLogs = logs.filter(
    log => log.recordType === RecordType.MISSED
  ) as MissedCheckinLog[];
  const cadenceStatus = settings.cadenceStartDate
    ? getCadenceStatus(
        cookLogs.map(log => ({ date: log.date })),
        missedLogs.map(m => ({ nepaliMonth: m.nepaliMonth, hardCheckinDate: m.hardCheckinDate })),
        settings.cadenceStartDate,
        getLocalDateKey(new Date())
      )
    : null;

  return {
    amountDue,
    totalFoodSpend: {
      thisMonth: totalFoodSpendThisMonth,
      allTime: totalFoodSpendAllTime,
    },
    monthlyBreakdown,
    effectiveDailyCost,
    avgCookCostPerDay,
    avgGroceriesCostPerDay,
    baselineCost: {
      low: settings.baselineDailyLow,
      high: settings.baselineDailyHigh,
      avg: settings.baselineDailyAvg,
    },
    savings,
    trackingWindow,
    stats: {
      totalCookSessions: cookLogs.length,
      totalGroceries: groceries.length,
      totalPayments: payments.length,
      totalAdvances: advances.length,
    },
    lastCookTime,
    nextCookTime,
    advanceBalance: ledger.advanceBalance,
    totalAdvancesGiven: ledger.totalAdvancesGiven,
    totalAdvancesDrawn: ledger.totalAdvancesDrawn,
    lastAdvanceDate: ledger.lastAdvanceDate,
    cadenceStatus,
  };
}

