import { NotificationKind } from '@/types';
import { formatBilingualDate } from '@/lib/dateUtils';

// Plain-text Telegram copy. `key` is the date the notification is about (ISO
// YYYY-MM-DD) — shown in both Gregorian and Nepali.
export function renderMessage(kind: NotificationKind, key: string): string {
  const { gregorian, nepali } = formatBilingualDate(key);
  const when = `${gregorian} (${nepali})`;

  switch (kind) {
    case 'CHECKIN_PRE_DAY':
      return `🍳 Cooking check-in tomorrow — ${when}. Log a cook by then to stay on cadence.`;
    case 'CHECKIN_DAY_OF':
      return `🍳 Cooking check-in today — ${when}. Log today's cook or it'll be marked missed.`;
    case 'MISSED_REASON':
      return `⚠️ Missed check-in on ${when} has no reason set. Open the dashboard to add one.`;
  }
}
