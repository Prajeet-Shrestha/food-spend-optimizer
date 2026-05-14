import NepaliDate, { dateConfigMap } from 'nepali-date-converter';
import { NEPALI_MONTHS, getLocalDateKey } from './dateUtils';

type NepaliMonthName = (typeof NEPALI_MONTHS)[number];

export interface NepaliBillingPeriod {
  monthName: NepaliMonthName;
  year: number;
  monthIndex: number;
  dayOfMonth: number;
  daysInMonth: number;
  startDateGreg: string; // ISO YYYY-MM-DD of Nepali day 1
  endDateGreg: string;   // ISO YYYY-MM-DD of the Nepali month's last day
  isLastThreeDays: boolean;
}

// The library's dateConfigMap keys each year to an object of 12 month lengths,
// in calendar order. We index positionally because the library's own month-name
// spellings (Baisakh/Asar/Aswin) differ from NEPALI_MONTHS (Baishakh/Ashadh/Ashwin).
export function daysInNepaliMonth(year: number, monthName: NepaliMonthName): number {
  const monthIndex = NEPALI_MONTHS.indexOf(monthName);
  const yearConfig = dateConfigMap[String(year)] as Record<string, number>;
  return Object.values(yearConfig)[monthIndex];
}

export function getNepaliBillingPeriod(date: Date): NepaliBillingPeriod {
  const nd = new NepaliDate(date);
  const year = nd.getYear();
  const monthIndex = nd.getMonth();
  const monthName = NEPALI_MONTHS[monthIndex];
  const dayOfMonth = nd.getDate();
  const daysInMonth = daysInNepaliMonth(year, monthName);

  const startDateGreg = getLocalDateKey(new NepaliDate(year, monthIndex, 1).toJsDate());
  const endDateGreg = getLocalDateKey(new NepaliDate(year, monthIndex, daysInMonth).toJsDate());
  const isLastThreeDays = dayOfMonth > daysInMonth - 3;

  return {
    monthName,
    year,
    monthIndex,
    dayOfMonth,
    daysInMonth,
    startDateGreg,
    endDateGreg,
    isLastThreeDays,
  };
}
