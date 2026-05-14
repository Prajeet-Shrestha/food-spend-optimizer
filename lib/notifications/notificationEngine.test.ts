import { describe, it, expect } from 'vitest';
import { computeDueNotifications } from '@/lib/notifications/notificationEngine';
import { NotificationSentDoc } from '@/types';

const ts = (date: string) => `${date}T03:00:00.000Z`;
const NOW = '2026-05-20T09:00:00.000Z';
const NO_LOG: NotificationSentDoc[] = [];

// Convenience base — overridden per test.
const base = {
  today: '2026-05-20',
  now: NOW,
  nextHardCheckinDate: null as string | null,
  missedWithoutReason: [] as { hardCheckinDate: string; detectedAt: string }[],
  sentLog: NO_LOG,
};

describe('computeDueNotifications — check-in reminders', () => {
  it('fires CHECKIN_PRE_DAY only on the day before the check-in', () => {
    const cfg = { ...base, nextHardCheckinDate: '2026-05-20' };
    expect(computeDueNotifications({ ...cfg, today: '2026-05-19' })).toEqual([
      { kind: 'CHECKIN_PRE_DAY', key: '2026-05-20' },
    ]);
    expect(computeDueNotifications({ ...cfg, today: '2026-05-18' })).toEqual([]);
  });

  it('fires CHECKIN_DAY_OF only on the check-in date', () => {
    const cfg = { ...base, nextHardCheckinDate: '2026-05-20' };
    expect(computeDueNotifications({ ...cfg, today: '2026-05-20' })).toEqual([
      { kind: 'CHECKIN_DAY_OF', key: '2026-05-20' },
    ]);
    expect(computeDueNotifications({ ...cfg, today: '2026-05-21' })).toEqual([]);
  });

  it('emits no check-in reminders when nextHardCheckinDate is null', () => {
    expect(computeDueNotifications({ ...base, nextHardCheckinDate: null })).toEqual([]);
  });

  it('never repeats a check-in reminder once it is in the ledger', () => {
    const due = computeDueNotifications({
      ...base,
      today: '2026-05-20',
      nextHardCheckinDate: '2026-05-20',
      sentLog: [{ kind: 'CHECKIN_DAY_OF', key: '2026-05-20', sentAt: ts('2026-05-20') }],
    });
    expect(due).toEqual([]);
  });
});

describe('computeDueNotifications — MISSED_REASON', () => {
  it('emits nothing when there are no un-reasoned misses', () => {
    expect(computeDueNotifications(base)).toEqual([]);
  });

  it('picks the single most-recent un-reasoned miss', () => {
    const due = computeDueNotifications({
      ...base,
      missedWithoutReason: [
        { hardCheckinDate: '2026-05-15', detectedAt: ts('2026-05-15') },
        { hardCheckinDate: '2026-05-18', detectedAt: ts('2026-05-18') },
        { hardCheckinDate: '2026-05-11', detectedAt: ts('2026-05-11') },
      ],
    });
    expect(due).toEqual([{ kind: 'MISSED_REASON', key: '2026-05-18' }]);
  });

  it('does not emit MISSED_REASON for a miss detected longer ago than maxMissedAgeDays', () => {
    const due = computeDueNotifications({
      ...base,
      missedWithoutReason: [{ hardCheckinDate: '2026-05-06', detectedAt: ts('2026-05-06') }],
      maxMissedAgeDays: 7,
    });
    expect(due).toEqual([]);
  });

  it('emits MISSED_REASON for a miss detected within maxMissedAgeDays', () => {
    const due = computeDueNotifications({
      ...base,
      missedWithoutReason: [{ hardCheckinDate: '2026-05-14', detectedAt: ts('2026-05-14') }],
      maxMissedAgeDays: 7,
    });
    expect(due).toEqual([{ kind: 'MISSED_REASON', key: '2026-05-14' }]);
  });

  it('suppresses a re-nag while still within the reminder cooldown', () => {
    const due = computeDueNotifications({
      ...base,
      now: '2026-05-20T09:00:00.000Z',
      missedWithoutReason: [{ hardCheckinDate: '2026-05-18', detectedAt: ts('2026-05-18') }],
      // last sent 6h ago, cooldown is 12h → not due yet
      sentLog: [
        { kind: 'MISSED_REASON', key: '2026-05-18', sentAt: '2026-05-20T03:00:00.000Z' },
      ],
      reminderAfterHours: 12,
    });
    expect(due).toEqual([]);
  });

  it('re-nags an un-reasoned miss once the reminder cooldown has elapsed', () => {
    const due = computeDueNotifications({
      ...base,
      now: '2026-05-20T09:00:00.000Z',
      missedWithoutReason: [{ hardCheckinDate: '2026-05-18', detectedAt: ts('2026-05-18') }],
      // last sent 13h ago, cooldown is 12h → due again
      sentLog: [
        { kind: 'MISSED_REASON', key: '2026-05-18', sentAt: '2026-05-19T20:00:00.000Z' },
      ],
      reminderAfterHours: 12,
    });
    expect(due).toEqual([{ kind: 'MISSED_REASON', key: '2026-05-18' }]);
  });

  it('stops nagging once the miss is resolved (no longer in missedWithoutReason)', () => {
    // Same ledger entry as the re-nag test, but the miss has a reason now so it
    // is not passed in — nothing is due.
    const due = computeDueNotifications({
      ...base,
      missedWithoutReason: [],
      sentLog: [
        { kind: 'MISSED_REASON', key: '2026-05-18', sentAt: '2026-05-19T20:00:00.000Z' },
      ],
    });
    expect(due).toEqual([]);
  });
});
