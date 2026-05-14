import { DueNotification, NotificationSentDoc } from '@/types';

// Pure engine — decides which notifications are due. No DB, no fetch, no clock
// (caller passes `today` + `now`). Mirrors the style of lib/cadence.ts.

export const DEFAULT_MAX_MISSED_AGE_DAYS = 7;
export const DEFAULT_REMINDER_AFTER_HOURS = 12;

export interface MissedWithoutReason {
  hardCheckinDate: string; // ISO YYYY-MM-DD
  detectedAt: string; // ISO timestamp
}

export interface NotificationEngineInput {
  today: string; // ISO YYYY-MM-DD
  now: string; // ISO timestamp — for re-nag cooldown math
  nextHardCheckinDate: string | null; // ISO YYYY-MM-DD
  missedWithoutReason: MissedWithoutReason[];
  sentLog: NotificationSentDoc[]; // full ledger — sentAt drives re-nag timing
  // MISSED_REASON only fires for misses detected within this many days of
  // `today` — older un-reasoned misses are left to the in-app banner.
  maxMissedAgeDays?: number;
  // A still-un-reasoned MISSED_REASON is re-sent once this many hours have
  // passed since the last send — repeating until the user adds a reason.
  reminderAfterHours?: number;
}

// Parse an ISO date (date part only) at local noon — avoids any timezone drift
// across day arithmetic. Same trick as lib/cadence.ts.
function parseDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function formatDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(iso: string, n: number): string {
  const dt = parseDay(iso);
  dt.setDate(dt.getDate() + n);
  return formatDay(dt);
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseDay(toIso).getTime() - parseDay(fromIso).getTime()) / 86_400_000);
}

function hoursBetween(fromIso: string, toIso: string): number {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 3_600_000;
}

export function computeDueNotifications(input: NotificationEngineInput): DueNotification[] {
  const {
    today,
    now,
    nextHardCheckinDate,
    missedWithoutReason,
    sentLog,
    maxMissedAgeDays = DEFAULT_MAX_MISSED_AGE_DAYS,
    reminderAfterHours = DEFAULT_REMINDER_AFTER_HOURS,
  } = input;

  const sentAtByKey = new Map<string, string>();
  for (const e of sentLog) sentAtByKey.set(`${e.kind}|${e.key}`, e.sentAt);

  const due: DueNotification[] = [];

  // Check-in reminders — sent exactly once each (a check-in date is a one-time
  // event). Any ledger entry means "handled"; a failed send is retried only
  // because runNotifications deletes the claim on failure.
  if (nextHardCheckinDate) {
    if (
      today === addDays(nextHardCheckinDate, -1) &&
      !sentAtByKey.has(`CHECKIN_PRE_DAY|${nextHardCheckinDate}`)
    ) {
      due.push({ kind: 'CHECKIN_PRE_DAY', key: nextHardCheckinDate });
    }
    if (
      today === nextHardCheckinDate &&
      !sentAtByKey.has(`CHECKIN_DAY_OF|${nextHardCheckinDate}`)
    ) {
      due.push({ kind: 'CHECKIN_DAY_OF', key: nextHardCheckinDate });
    }
  }

  // Missed-reason — the single most-recent un-reasoned miss, if detected
  // recently. Re-sent every `reminderAfterHours` until the user adds a reason
  // (which removes it from `missedWithoutReason` entirely).
  let latest: MissedWithoutReason | null = null;
  for (const m of missedWithoutReason) {
    if (
      !latest ||
      m.hardCheckinDate > latest.hardCheckinDate ||
      (m.hardCheckinDate === latest.hardCheckinDate && m.detectedAt > latest.detectedAt)
    ) {
      latest = m;
    }
  }
  if (latest && daysBetween(latest.detectedAt, today) <= maxMissedAgeDays) {
    const lastSentAt = sentAtByKey.get(`MISSED_REASON|${latest.hardCheckinDate}`);
    const dueAgain =
      lastSentAt === undefined ||
      (lastSentAt !== '' && hoursBetween(lastSentAt, now) >= reminderAfterHours);
    if (dueAgain) due.push({ kind: 'MISSED_REASON', key: latest.hardCheckinDate });
  }

  return due;
}
