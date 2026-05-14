import { describe, it, expect } from 'vitest';
import { calculateDashboardMetrics } from '@/lib/calculations';
import { CookLog, LogEntry, RecordType } from '@/types';
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
