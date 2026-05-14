import { describe, it, expect } from 'vitest';
import { daysInNepaliMonth, getNepaliBillingPeriod } from '@/lib/nepaliCalendar';

describe('daysInNepaliMonth', () => {
  it('returns 31 for Jestha 2083', () => {
    expect(daysInNepaliMonth(2083, 'Jestha')).toBe(31);
  });

  it('returns correct lengths for 32, 30, and 29 day months', () => {
    expect(daysInNepaliMonth(2083, 'Ashadh')).toBe(32);
    expect(daysInNepaliMonth(2083, 'Kartik')).toBe(30);
    expect(daysInNepaliMonth(2083, 'Mangsir')).toBe(29);
  });
});

describe('getNepaliBillingPeriod', () => {
  it('reports the Nepali month, year, and day for a known date', () => {
    const period = getNepaliBillingPeriod(new Date('2026-05-15'));
    expect(period.monthName).toBe('Jestha');
    expect(period.year).toBe(2083);
    expect(period.monthIndex).toBe(1);
    expect(period.dayOfMonth).toBe(1);
    expect(period.daysInMonth).toBe(31);
  });

  it('bounds the Nepali month with Gregorian start and end dates', () => {
    const period = getNepaliBillingPeriod(new Date('2026-05-15'));
    expect(period.startDateGreg).toBe('2026-05-15');
    expect(period.endDateGreg).toBe('2026-06-14');
  });

  it('bounds are stable regardless of which day in the month is queried', () => {
    const early = getNepaliBillingPeriod(new Date('2026-05-15'));
    const late = getNepaliBillingPeriod(new Date('2026-06-10'));
    expect(late.startDateGreg).toBe(early.startDateGreg);
    expect(late.endDateGreg).toBe(early.endDateGreg);
    expect(late.monthName).toBe('Jestha');
  });

  it('flags isLastThreeDays only on the final three days of the Nepali month', () => {
    // Jestha 2083 has 31 days: days 29, 30, 31 are the last three.
    expect(getNepaliBillingPeriod(new Date('2026-06-11')).dayOfMonth).toBe(28);
    expect(getNepaliBillingPeriod(new Date('2026-06-11')).isLastThreeDays).toBe(false);
    expect(getNepaliBillingPeriod(new Date('2026-06-12')).isLastThreeDays).toBe(true);
    expect(getNepaliBillingPeriod(new Date('2026-06-14')).isLastThreeDays).toBe(true);
  });
});
