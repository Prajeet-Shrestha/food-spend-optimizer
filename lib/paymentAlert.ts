import { LogEntry } from '@/types';
import { Settings } from './config';
import { NepaliBillingPeriod } from './nepaliCalendar';
import { calculateAmountDue, computeAdvanceLedger } from './calculations';

// End-of-month payment reminder, scoped to the Nepali billing cycle. Purely
// informational — it never auto-creates a payment record. Once the user logs a
// payment that zeroes the current-month amount due, `amountDue` drops to ~0 and
// the banner naturally clears.

export interface PaymentAlert {
  shouldShow: boolean; // true only on the last 3 days of the Nepali month
  amountDue: number; // current-Nepali-month amount due
  daysUntilMonthEnd: number; // 0 on the final day, up to 2 at the window's start
}

export function getPaymentAlert(
  logs: LogEntry[],
  billingPeriod: NepaliBillingPeriod,
  settings: Settings
): PaymentAlert {
  // The advance drawdown must be computed over the FULL history so a
  // prior-period advance still covers groceries inside the current month.
  const { perGroceryDrawn } = computeAdvanceLedger(logs);

  const periodLogs = logs.filter(
    log => log.date >= billingPeriod.startDateGreg && log.date <= billingPeriod.endDateGreg
  );

  return {
    shouldShow: billingPeriod.isLastThreeDays,
    amountDue: calculateAmountDue(periodLogs, settings, perGroceryDrawn),
    daysUntilMonthEnd: billingPeriod.daysInMonth - billingPeriod.dayOfMonth,
  };
}
