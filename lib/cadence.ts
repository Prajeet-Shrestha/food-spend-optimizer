import NepaliDate from 'nepali-date-converter';
import { NEPALI_MONTHS, getLocalDateKey } from './dateUtils';
import { daysInNepaliMonth } from './nepaliCalendar';

// Pure cadence engine. No DB, no React — just scheduling math over cook dates.
//
// The grid is a single continuous chain of anchors and hard check-in dates that
// flows across Nepali-month boundaries and never resets on the 1st. Every actual
// cook and every missed hard date is an anchor; the step to the next hard date is
// recomputed at each anchor to keep the month on an 8-slot target.

export const CADENCE_TARGET_COOKS = 8;
const MIN_STEP = 3;
const MAX_STEP = 4;

export interface CadenceCook {
  date: string; // ISO YYYY-MM-DD
}

export interface CadenceMissedRecord {
  nepaliMonth: string; // e.g. "2083-Jestha"
  hardCheckinDate: string; // ISO YYYY-MM-DD
}

export type HardCheckinStatus = 'satisfied' | 'missed' | 'open';

export interface CadenceAnchor {
  date: string; // ISO YYYY-MM-DD
  kind: 'cook' | 'missed';
}

export interface CadenceHardCheckin {
  hardCheckinDate: string; // ISO YYYY-MM-DD
  nepaliMonth: string; // e.g. "2083-Jestha"
  anchorDate: string; // the anchor this hard date was projected from
  step: number; // days from anchor to this hard date
  status: HardCheckinStatus;
  satisfiedByCookDate?: string; // set only when status === 'satisfied'
}

export interface CadenceGrid {
  anchors: CadenceAnchor[];
  hardCheckins: CadenceHardCheckin[];
}

export interface CadenceStatus {
  lastCookDate: string | null;
  nextHardCheckinDate: string | null;
  isOverdue: boolean;
  cooksThisCycle: number;
  missedThisCycle: number;
  targetCooks: number;
}

interface NepaliMonthInfo {
  year: number;
  monthName: string;
  dayOfMonth: number;
  daysInMonth: number;
  key: string;
}

// Parse at local noon so day arithmetic never drifts across a timezone offset.
function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function addDays(iso: string, days: number): string {
  const dt = parseDate(iso);
  dt.setDate(dt.getDate() + days);
  return getLocalDateKey(dt);
}

function nepaliMonthInfo(iso: string): NepaliMonthInfo {
  const nd = new NepaliDate(parseDate(iso));
  const year = nd.getYear();
  const monthName = NEPALI_MONTHS[nd.getMonth()];
  return {
    year,
    monthName,
    dayOfMonth: nd.getDate(),
    daysInMonth: daysInNepaliMonth(year, monthName),
    key: `${year}-${monthName}`,
  };
}

function clampStep(raw: number): number {
  if (raw < MIN_STEP) return MIN_STEP;
  if (raw > MAX_STEP) return MAX_STEP;
  return raw;
}

// clamp(round(remainingDaysInNepaliMonth / remainingSlots), 3, 4).
// Once the month's 8 slots are spent, the chain rolls into the next month at the
// default max spacing — that is what carries the grid across the boundary.
function stepFromAnchor(anchorIso: string, slotsUsedThisMonth: number): number {
  const remainingSlots = CADENCE_TARGET_COOKS - slotsUsedThisMonth;
  if (remainingSlots <= 0) return MAX_STEP;
  const { daysInMonth, dayOfMonth } = nepaliMonthInfo(anchorIso);
  return clampStep(Math.round((daysInMonth - dayOfMonth) / remainingSlots));
}

function uniqueCookDatesFrom(cookLogs: CadenceCook[], cadenceStartDate: string): string[] {
  return [...new Set(cookLogs.map((c) => c.date))]
    .filter((d) => d >= cadenceStartDate)
    .sort();
}

export function buildCadenceGrid(
  cookLogs: CadenceCook[],
  cadenceStartDate: string,
  asOf: string,
): CadenceGrid {
  const cookDates = uniqueCookDatesFrom(cookLogs, cadenceStartDate);
  const anchors: CadenceAnchor[] = [];
  const hardCheckins: CadenceHardCheckin[] = [];

  if (cookDates.length === 0) {
    return { anchors, hardCheckins };
  }

  // The first cook seeds the grid; there is no cadence before it.
  let anchor = cookDates[0];
  let monthKey = nepaliMonthInfo(anchor).key;
  let slotsUsed = 1;
  anchors.push({ date: anchor, kind: 'cook' });

  // Both cooks and misses consume a slot; the slot counter resets per Nepali month.
  const consumeSlot = (date: string, kind: 'cook' | 'missed') => {
    const key = nepaliMonthInfo(date).key;
    if (key !== monthKey) {
      monthKey = key;
      slotsUsed = 0;
    }
    slotsUsed += 1;
    anchor = date;
    anchors.push({ date, kind });
  };

  // Each iteration either breaks (open) or advances the anchor forward, so this
  // terminates; the guard is a safety net against an unexpected invariant break.
  for (let guard = 0; guard < 100000; guard++) {
    const step = stepFromAnchor(anchor, slotsUsed);
    const hardCheckinDate = addDays(anchor, step);
    const nepaliMonth = nepaliMonthInfo(hardCheckinDate).key;
    const base = { hardCheckinDate, nepaliMonth, anchorDate: anchor, step };

    // A cook anywhere in (anchor, hardDate] satisfies the slot — early cooks count.
    const satisfyingCook = cookDates.find((d) => d > anchor && d <= hardCheckinDate);
    if (satisfyingCook) {
      hardCheckins.push({ ...base, status: 'satisfied', satisfiedByCookDate: satisfyingCook });
      consumeSlot(satisfyingCook, 'cook');
      continue;
    }

    // Only hard dates strictly before asOf can become misses; today/future stay open.
    if (hardCheckinDate < asOf) {
      hardCheckins.push({ ...base, status: 'missed' });
      consumeSlot(hardCheckinDate, 'missed');
      continue;
    }

    hardCheckins.push({ ...base, status: 'open' });
    break;
  }

  return { anchors, hardCheckins };
}

// The set of missed-checkin records that should exist but are not yet stored —
// the idempotent diff to write. Identity is { nepaliMonth, hardCheckinDate }.
export function detectMissedCheckins(
  cookLogs: CadenceCook[],
  cadenceStartDate: string,
  existingMissedLogs: CadenceMissedRecord[],
  asOf: string,
): CadenceMissedRecord[] {
  const { hardCheckins } = buildCadenceGrid(cookLogs, cadenceStartDate, asOf);
  const existingKeys = new Set(
    existingMissedLogs.map((m) => `${m.nepaliMonth}|${m.hardCheckinDate}`),
  );
  return hardCheckins
    .filter((h) => h.status === 'missed')
    .map((h) => ({ nepaliMonth: h.nepaliMonth, hardCheckinDate: h.hardCheckinDate }))
    .filter((r) => !existingKeys.has(`${r.nepaliMonth}|${r.hardCheckinDate}`));
}

export function getCadenceStatus(
  cookLogs: CadenceCook[],
  missedLogs: CadenceMissedRecord[],
  cadenceStartDate: string,
  asOf: string,
): CadenceStatus {
  const cookDates = uniqueCookDatesFrom(cookLogs, cadenceStartDate);
  const { hardCheckins } = buildCadenceGrid(cookLogs, cadenceStartDate, asOf);

  const lastCookDate = cookDates.length > 0 ? cookDates[cookDates.length - 1] : null;
  const nextHardCheckinDate =
    hardCheckins.find((h) => h.status === 'open')?.hardCheckinDate ?? null;

  // A cycle is the Nepali billing month that asOf falls in.
  const cycleKey = nepaliMonthInfo(asOf).key;
  const cooksThisCycle = cookDates.filter(
    (d) => d <= asOf && nepaliMonthInfo(d).key === cycleKey,
  ).length;
  const missedThisCycle = missedLogs.filter((m) => m.nepaliMonth === cycleKey).length;

  // Overdue means a hard date was missed and no cook has happened since.
  const isOverdue =
    lastCookDate !== null &&
    hardCheckins.some((h) => h.status === 'missed' && h.hardCheckinDate > lastCookDate);

  return {
    lastCookDate,
    nextHardCheckinDate,
    isOverdue,
    cooksThisCycle,
    missedThisCycle,
    targetCooks: CADENCE_TARGET_COOKS,
  };
}
