import { LogEntry, RecordType, DashboardMetrics, BoughtBy, PaymentLog } from '@/types';
import { Settings } from './config';

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
 * Calculate amount due to cook
 * Formula: (BaseFee × NumberOfCookLogs) + (Sum of groceries bought by STAFF) - (Sum of all payments excluding tips)
 */
export function calculateAmountDue(logs: LogEntry[], settings: Settings): number {
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
    return sum + (groceryLog.amount || 0);
  }, 0);
  
  // Exclude tips from payment total
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
 * Calculate all dashboard metrics
 */
export function calculateDashboardMetrics(
  logs: LogEntry[],
  settings: Settings
): DashboardMetrics {
  const amountDue = calculateAmountDue(logs, settings);
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
    },
  };
}

