import { describe, it, expect } from 'vitest';
import { convertLogsToBillItems, calculateBillSummary } from '@/lib/billCalculations';
import {
  CookLog,
  GroceryLog,
  PaymentLog,
  MissedCheckinLog,
  PaidLeaveLog,
  LogEntry,
  RecordType,
  BoughtBy,
} from '@/types';

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

const payment = (id: string, date: string, amountPaid: number): PaymentLog => ({
  _id: id,
  recordType: RecordType.PAYMENT,
  date,
  amountPaid,
});

const missed = (id: string, hardCheckinDate: string, nepaliMonth: string): MissedCheckinLog => ({
  _id: id,
  recordType: RecordType.MISSED,
  date: hardCheckinDate,
  nepaliMonth,
  hardCheckinDate,
  detectedAt: '2026-06-01T00:00:00.000Z',
});

const paidLeave = (id: string, date: string, fee: number): PaidLeaveLog => ({
  _id: id,
  recordType: RecordType.PAID_LEAVE,
  date,
  fee,
});

describe('convertLogsToBillItems — MISSED memo rows', () => {
  it('renders a MISSED record as a zero-money memo row that leaves the balance unchanged', () => {
    const logs: LogEntry[] = [
      cook('a', '2026-05-17'),
      missed('b', '2026-05-23', '2083-Jestha'),
      cook('c', '2026-05-27'),
    ];
    const items = convertLogsToBillItems(logs);

    expect(items).toHaveLength(3);
    const memo = items[1];
    expect(memo.type).toBe(RecordType.MISSED);
    expect(memo.debit).toBe(0);
    expect(memo.credit).toBe(0);
    expect(memo.advance).toBe(0);
    // Balance carries forward unchanged from the previous row.
    expect(memo.balance).toBe(700);
    expect(items[2].balance).toBe(1400);
  });

  it('describes the missed row with a readable Nepali date', () => {
    const items = convertLogsToBillItems([missed('b', '2026-05-23', '2083-Jestha')]);
    expect(items).toHaveLength(1);
    expect(items[0].description).toBe('Missed check-in — Jestha 9');
  });
});

describe('calculateBillSummary — MISSED records are money-neutral', () => {
  it('produces an identical summary whether or not MISSED rows are present', () => {
    const realLogs: LogEntry[] = [
      cook('a', '2026-05-17'),
      staffGrocery('g', '2026-05-18', 500),
      payment('p', '2026-05-20', 300),
    ];
    const withMissed: LogEntry[] = [
      realLogs[0],
      missed('m1', '2026-05-21', '2083-Jestha'),
      realLogs[1],
      missed('m2', '2026-05-25', '2083-Jestha'),
      realLogs[2],
    ];
    expect(calculateBillSummary(withMissed)).toEqual(calculateBillSummary(realLogs));
  });

  it('bills a 9th cook in a month normally — the 8-cook target is not a cap', () => {
    const logs: LogEntry[] = Array.from({ length: 9 }, (_, i) =>
      cook(`c${i}`, `2026-05-${String(i + 1).padStart(2, '0')}`)
    );
    const summary = calculateBillSummary(logs);
    expect(summary.itemCount.cooks).toBe(9);
    expect(summary.totalCookFees).toBe(6300);
    expect(summary.finalAmountDue).toBe(6300);
  });
});

describe('PAID_LEAVE — billed as a debit', () => {
  it('renders a PAID_LEAVE record as a debit row that moves the running balance', () => {
    const logs: LogEntry[] = [
      cook('a', '2026-05-17'),
      paidLeave('b', '2026-05-21', 625),
    ];
    const items = convertLogsToBillItems(logs);

    expect(items).toHaveLength(2);
    const leave = items[1];
    expect(leave.type).toBe(RecordType.PAID_LEAVE);
    expect(leave.debit).toBe(625);
    expect(leave.credit).toBe(0);
    expect(leave.description).toBe('Paid Leave');
    expect(leave.balance).toBe(1325);
  });

  it('sums PAID_LEAVE fees into totalPaidLeave and the amount due', () => {
    const logs: LogEntry[] = [
      cook('a', '2026-05-17'),
      paidLeave('b', '2026-05-21', 625),
      paidLeave('c', '2026-05-25', 625),
    ];
    const summary = calculateBillSummary(logs);
    expect(summary.totalPaidLeave).toBe(1250);
    expect(summary.itemCount.paidLeaves).toBe(2);
    expect(summary.subtotalDue).toBe(1950);
    expect(summary.finalAmountDue).toBe(1950);
  });
});
