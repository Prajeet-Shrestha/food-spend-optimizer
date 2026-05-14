import { NotificationKind, NotificationSentDoc } from '@/types';
import { getNotificationsSentCollection } from '@/lib/db';

// Dedup / send ledger over the `notifications_sent` collection.
// - CHECKIN_* are sent once: claimed (claimNotification) before sending.
// - MISSED_REASON is re-naggable: no claim — the engine decides re-send
//   eligibility from each doc's `sentAt`, and recordSent upserts a fresh stamp.
// The unique { kind, key } index keeps this safe under concurrent runs.

// Returns the full ledger — the engine needs `sentAt` timestamps, not just keys,
// to decide when a MISSED_REASON reminder is due again.
export async function getSentLog(): Promise<NotificationSentDoc[]> {
  const collection = await getNotificationsSentCollection();
  const docs = await collection.find({}).toArray();
  return docs.map((d) => ({ kind: d.kind, key: d.key, sentAt: d.sentAt }));
}

// Atomically claims a notification. Returns true iff THIS caller created the
// ledger doc — i.e. it owns the send. A concurrent claimer (or a prior run)
// gets false. The doc is created with sentAt:'' and finalised by recordSent.
export async function claimNotification(
  kind: NotificationKind,
  key: string
): Promise<boolean> {
  const collection = await getNotificationsSentCollection();
  try {
    const result = await collection.updateOne(
      { kind, key },
      { $setOnInsert: { kind, key, sentAt: '' } },
      { upsert: true }
    );
    return result.upsertedCount === 1;
  } catch (err: unknown) {
    // A concurrent claim won the race — the unique index rejected this insert.
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? (err as { code?: number }).code
        : undefined;
    if (code === 11000) return false;
    throw err;
  }
}

// Releases a claim so the notification is retried on the next run — called when
// the send itself fails.
export async function releaseNotification(
  kind: NotificationKind,
  key: string
): Promise<void> {
  const collection = await getNotificationsSentCollection();
  await collection.deleteOne({ kind, key });
}

// Records a successful send by stamping sentAt. Upserts: CHECKIN_* already have
// a claimed doc (this just finalises it), MISSED_REASON has no claim step so
// this creates or refreshes the doc — its sentAt then drives re-nag timing.
export async function recordSent(
  kind: NotificationKind,
  key: string
): Promise<void> {
  const collection = await getNotificationsSentCollection();
  await collection.updateOne(
    { kind, key },
    { $set: { kind, key, sentAt: new Date().toISOString() } },
    { upsert: true }
  );
}
