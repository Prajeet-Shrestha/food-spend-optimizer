import { DueNotification, MissedCheckinLog, RecordType } from '@/types';
import { getAllLogs, ensureIndexes, reconcileMissedCheckins } from '@/lib/db';
import { getSettings } from '@/lib/config';
import { getCadenceStatus } from '@/lib/cadence';
import { getLocalDateKey } from '@/lib/dateUtils';
import { isTelegramConfigured, sendTelegramMessage } from './telegram';
import { computeDueNotifications, DEFAULT_REMINDER_AFTER_HOURS } from './notificationEngine';
import { getSentLog, claimNotification, releaseNotification, recordSent } from './ledger';
import { renderMessage } from './messages';

export interface RunNotificationsResult {
  ran: boolean;
  sent: DueNotification[];
  skipped: DueNotification[];
  dryRun: boolean;
}

export interface RunNotificationsOptions {
  dryRun?: boolean;
  // Bypass the time-of-day gate — used by the manual trigger route so check-in
  // reminders can be tested at any hour.
  ignoreHourGate?: boolean;
}

function notificationHour(): number {
  const parsed = Number.parseInt(process.env.NOTIFICATION_HOUR ?? '', 10);
  return Number.isNaN(parsed) ? 7 : parsed;
}

function reminderAfterHours(): number {
  const parsed = Number.parseInt(process.env.NOTIFICATION_REMINDER_HOURS ?? '', 10);
  return Number.isNaN(parsed) || parsed <= 0 ? DEFAULT_REMINDER_AFTER_HOURS : parsed;
}

// Impure orchestration glue (like reconcileMissedCheckins): figures out which
// Telegram notifications are due and sends them, idempotently.
export async function runNotifications(
  opts: RunNotificationsOptions = {}
): Promise<RunNotificationsResult> {
  const dryRun = opts.dryRun ?? false;
  const idle: RunNotificationsResult = { ran: false, sent: [], skipped: [], dryRun };

  // Off switch: no Telegram config → notifications disabled.
  if (!isTelegramConfigured()) return idle;

  await ensureIndexes();
  await reconcileMissedCheckins(); // keep MISSED records current before reading them

  const settings = await getSettings();
  if (!settings.cadenceStartDate) return idle;

  const logs = await getAllLogs();
  const missedDocs = logs.filter(
    (log) => log.recordType === RecordType.MISSED
  ) as MissedCheckinLog[];
  const cookLogs = logs
    .filter((log) => log.recordType === RecordType.COOK)
    .map((log) => ({ date: log.date }));
  const missedLogs = missedDocs.map((m) => ({
    nepaliMonth: m.nepaliMonth,
    hardCheckinDate: m.hardCheckinDate,
  }));
  const missedWithoutReason = missedDocs
    .filter((m) => !m.reason)
    .map((m) => ({ hardCheckinDate: m.hardCheckinDate, detectedAt: m.detectedAt }));

  const now = new Date();
  const today = getLocalDateKey(now);
  const status = getCadenceStatus(cookLogs, missedLogs, settings.cadenceStartDate, today);

  const sentLog = await getSentLog();
  let due = computeDueNotifications({
    today,
    now: now.toISOString(),
    nextHardCheckinDate: status.nextHardCheckinDate,
    missedWithoutReason,
    sentLog,
    reminderAfterHours: reminderAfterHours(),
  });

  // Hour gate — day-based reminders only fire at/after the configured hour, so
  // nothing pings at 2am. A freshly-missed check-in is exempt (fire promptly).
  if (!opts.ignoreHourGate && now.getHours() < notificationHour()) {
    due = due.filter((d) => d.kind === 'MISSED_REASON');
  }

  const sent: DueNotification[] = [];
  const skipped: DueNotification[] = [];

  for (const d of due) {
    if (dryRun) {
      sent.push(d);
      continue;
    }

    try {
      if (d.kind === 'MISSED_REASON') {
        // Re-naggable: no once-forever claim — the engine already gated this on
        // the reminder cooldown. Send, then stamp sentAt (drives the next nag).
        await sendTelegramMessage(renderMessage(d.kind, d.key));
        await recordSent(d.kind, d.key);
        sent.push(d);
      } else {
        // CHECKIN_*: sent once. Atomically claim before sending; release the
        // claim if the send fails so it retries on the next run.
        const claimed = await claimNotification(d.kind, d.key);
        if (!claimed) {
          skipped.push(d);
          continue;
        }
        try {
          await sendTelegramMessage(renderMessage(d.kind, d.key));
        } catch (sendErr) {
          await releaseNotification(d.kind, d.key).catch((relErr) =>
            console.error(`[notifications] release failed ${d.kind}|${d.key}:`, relErr)
          );
          throw sendErr;
        }
        // Sent — finalise. If recordSent fails the claim doc still exists
        // (sentAt:''), which is enough to block a duplicate send next run.
        await recordSent(d.kind, d.key).catch((err) =>
          console.error(`[notifications] recordSent failed ${d.kind}|${d.key}:`, err)
        );
        sent.push(d);
      }
    } catch (err) {
      console.error(`[notifications] failed ${d.kind}|${d.key}:`, err);
      skipped.push(d);
    }
  }

  return { ran: true, sent, skipped, dryRun };
}

// Fire-and-forget trigger for route handlers — keeps notifications synced with
// log changes (a new cook moves the next check-in; adding a reason resolves a
// miss) without adding latency to the user's request. The standalone Node
// server stays alive, so the un-awaited promise still completes.
export function triggerNotifications(): void {
  runNotifications().catch((err) =>
    console.error('[notifications] background trigger failed:', err)
  );
}
