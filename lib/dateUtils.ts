import NepaliDate from 'nepali-date-converter';

export const NEPALI_MONTHS = [
  'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
] as const;

export function formatBilingualDate(dateString: string): { gregorian: string; nepali: string } {
  const date = new Date(dateString);
  const gregorian = date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  const nepaliDate = new NepaliDate(date);
  const nepali = `${NEPALI_MONTHS[nepaliDate.getMonth()]} ${nepaliDate.getDate()}, ${nepaliDate.getYear()}`;

  return { gregorian, nepali };
}

export function getNepaliDayNumber(date: Date): number {
  return new NepaliDate(date).getDate();
}

export function getLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getNepaliRange(start: Date, end: Date): string {
  const a = new NepaliDate(start);
  const b = new NepaliDate(end);
  const aMonth = NEPALI_MONTHS[a.getMonth()];
  const bMonth = NEPALI_MONTHS[b.getMonth()];
  const aYear = a.getYear();
  const bYear = b.getYear();

  if (aYear === bYear) {
    return aMonth === bMonth ? `${aMonth} ${aYear}` : `${aMonth} – ${bMonth} ${aYear}`;
  }
  return `${aMonth} ${aYear} – ${bMonth} ${bYear}`;
}
