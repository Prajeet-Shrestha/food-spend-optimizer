import { describe, it, expect } from 'vitest';
import { getPaymentAlert } from '@/lib/paymentAlert';
import { getNepaliBillingPeriod } from '@/lib/nepaliCalendar';
import { Settings } from '@/lib/config';
import {
  CookLog,
  GroceryLog,
  PaymentLog,
  AdvanceLog,
  LogEntry,
  RecordType,
  BoughtBy,
} from '@/types';

// Jestha 2083 runs 2026-05-15 .. 2026-06-14 (31 days). Its last three days are
// 2026-06-12, -13, -14.
const settings: Settings = {
  baseFee: 700,
  baselineDailyLow: 360,
  baselineDailyHigh: 400,
  baselineDailyAvg: 380,
};

const cook = (id: string, date: string, baseFee = 700): CookLog => ({
  _id: id,
  recordType: RecordType.COOK,
  date,
  menu: 'Dal Bhat',
  baseFee,
});

const staffGrocery = (id: string, date: string, amount: number): GroceryLog => ({
  _id: id,
  recordType: RecordType.GROCERY,
  date,
  category: 'Vegetables',
  amount,
  boughtBy: BoughtBy.STAFF,
  reimbursable: true,
});

const advance = (id: string, date: string, amountGiven: number): AdvanceLog => ({
  _id: id,
  recordType: RecordType.ADVANCE,
  date,
  amountGiven,
});

const payment = (id: string, date: string, amountPaid: number, isTip = false): PaymentLog => ({
  _id: id,
  recordType: RecordType.PAYMENT,
  date,
  amountPaid,
  isTip,
});

describe('getPaymentAlert — trigger window', () => {
  it('does not show outside the last three days of the Nepali month', () => {
    const period = getNepaliBillingPeriod(new Date('2026-05-20'));
    const alert = getPaymentAlert([], period, settings);
    expect(alert.shouldShow).toBe(false);
  });

  it('shows during the last three days, counting down to month end', () => {
    const alert = getPaymentAlert([], getNepaliBillingPeriod(new Date('2026-06-12')), settings);
    expect(alert.shouldShow).toBe(true);
    expect(alert.daysUntilMonthEnd).toBe(2);
  });

  it('shows on the final day with zero days remaining', () => {
    const alert = getPaymentAlert([], getNepaliBillingPeriod(new Date('2026-06-14')), settings);
    expect(alert.shouldShow).toBe(true);
    expect(alert.daysUntilMonthEnd).toBe(0);
  });
});

describe('getPaymentAlert — amountDue', () => {
  const period = getNepaliBillingPeriod(new Date('2026-06-12')); // Jestha 2083

  it('scopes amountDue to the current Nepali month, post-advance-drawdown, minus non-tip payments', () => {
    const logs: LogEntry[] = [
      cook('a', '2026-04-10'), // Baishakh — before the period, excluded
      cook('b', '2026-05-20'), // in period
      cook('c', '2026-06-01'), // in period
      advance('adv', '2026-05-21', 400),
      staffGrocery('g', '2026-05-22', 1000), // 400 drawn from the advance -> 600 reimbursable
      payment('p', '2026-06-05', 500),
      payment('t', '2026-06-06', 200, true), // tip — excluded
    ];
    // 1400 cook fees + 600 reimbursable groceries - 500 non-tip payment = 1500
    expect(getPaymentAlert(logs, period, settings).amountDue).toBe(1500);
  });

  it('clears to zero once a payment covering the month is logged', () => {
    const logs: LogEntry[] = [
      cook('b', '2026-05-20'),
      cook('c', '2026-06-01'),
      payment('p1', '2026-06-05', 1400),
    ];
    expect(getPaymentAlert(logs, period, settings).amountDue).toBe(0);
  });
});
