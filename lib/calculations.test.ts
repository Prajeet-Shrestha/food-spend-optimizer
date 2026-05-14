import { describe, it, expect } from 'vitest';
import { calculateDashboardMetrics, calculateAmountDue, calculateTotalFoodSpend } from '@/lib/calculations';
import { CookLog, LogEntry, PaidLeaveLog, PaymentLog, RecordType } from '@/types';
import { Settings } from '@/lib/config';

const baseSettings: Settings = {
  baseFee: 700,
  baselineDailyLow: 360,
  baselineDailyHigh: 400,
  baselineDailyAvg: 380,
};

const cook = (date: string): CookLog => ({
  recordType: RecordType.COOK,
  date,
  menu: 'Dal Bhat',
  baseFee: 700,
});

const paidLeave = (date: string, fee: number): PaidLeaveLog => ({
  recordType: RecordType.PAID_LEAVE,
  date,
  fee,
});

const payment = (date: string, amountPaid: number): PaymentLog => ({
  recordType: RecordType.PAYMENT,
  date,
  amountPaid,
});

describe('calculateDashboardMetrics — cadenceStatus wiring', () => {
  it('leaves cadenceStatus null when no cadenceStartDate is configured', () => {
    const logs: LogEntry[] = [cook('2020-01-05')];
    const metrics = calculateDashboardMetrics(logs, baseSettings);
    expect(metrics.cadenceStatus).toBeNull();
  });

  it('populates cadenceStatus from the cadence engine when cadenceStartDate is set', () => {
    const logs: LogEntry[] = [cook('2020-01-05'), cook('2020-01-09')];
    const metrics = calculateDashboardMetrics(logs, {
      ...baseSettings,
      cadenceStartDate: '2020-01-01',
    });
    expect(metrics.cadenceStatus).not.toBeNull();
    expect(metrics.cadenceStatus?.targetCooks).toBe(8);
    expect(metrics.cadenceStatus?.lastCookDate).toBe('2020-01-09');
  });

  it('ignores cooks before cadenceStartDate when picking the last cook', () => {
    const logs: LogEntry[] = [cook('2019-12-20'), cook('2020-01-09')];
    const metrics = calculateDashboardMetrics(logs, {
      ...baseSettings,
      cadenceStartDate: '2020-01-01',
    });
    expect(metrics.cadenceStatus?.lastCookDate).toBe('2020-01-09');
  });
});

describe('PAID_LEAVE — counts on the earned side', () => {
  it('a paid-leave fee raises amount due', () => {
    const cookOnly = calculateAmountDue([cook('2026-05-01')], baseSettings);
    const withLeave = calculateAmountDue(
      [cook('2026-05-01'), paidLeave('2026-05-05', 625)],
      baseSettings
    );
    expect(withLeave - cookOnly).toBe(625);
  });

  it('a paid-leave fee is included in total food spend', () => {
    const cookOnly = calculateTotalFoodSpend([cook('2026-05-01')], baseSettings);
    const withLeave = calculateTotalFoodSpend(
      [cook('2026-05-01'), paidLeave('2026-05-05', 625)],
      baseSettings
    );
    expect(withLeave - cookOnly).toBe(625);
  });

  it('paid leave plus a matching payment nets amount due to zero', () => {
    const logs: LogEntry[] = [
      paidLeave('2026-05-05', 625),
      paidLeave('2026-05-09', 625),
      payment('2026-05-14', 1250),
    ];
    expect(calculateAmountDue(logs, baseSettings)).toBe(0);
  });
});
