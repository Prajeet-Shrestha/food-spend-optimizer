// Telegram delivery adapter. No npm dependency — native fetch against the Bot
// API. Config is env-only: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID. If either is
// missing, notifications are considered disabled (the off switch).

const SEND_TIMEOUT_MS = 10_000;

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

// Sends a plain-text message. Throws on transport failure, a non-2xx response,
// or a Telegram `{ ok: false }` body — the caller relies on the throw to
// release its dedup-ledger claim so the notification is retried.
export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error('Telegram is not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });

    const body = await res.json().catch(() => null);
    if (!res.ok || !body || body.ok !== true) {
      const detail = body?.description || `HTTP ${res.status}`;
      throw new Error(`Telegram sendMessage failed: ${detail}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}
