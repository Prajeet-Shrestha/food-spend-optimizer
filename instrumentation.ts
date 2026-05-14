// Next.js instrumentation hook — runs once when the server process boots.
// Registers the in-process notification scheduler: a catch-up run on startup
// plus a recurring tick (default every 12h, NOTIFICATION_CHECK_INTERVAL_MINUTES
// to override). Re-runs are cheap no-ops thanks to the dedup ledger; log
// create/update/delete also triggers a run, so this is just the safety net.
// Production-only — in dev, trigger via /api/notifications/run.

function intervalMs(): number {
  const minutes = Number.parseInt(process.env.NOTIFICATION_CHECK_INTERVAL_MINUTES ?? '', 10);
  const safe = Number.isNaN(minutes) || minutes <= 0 ? 720 : minutes;
  return safe * 60 * 1000;
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NODE_ENV !== 'production') return;

  // A failure anywhere in here must never break server startup.
  try {
    const g = globalThis as typeof globalThis & { __notifScheduler?: boolean };
    if (g.__notifScheduler) return;

    // Dynamic imports (static string literals so Next still traces them into
    // the standalone bundle) — keeps `mongodb` out of any non-nodejs runtime.
    const { isTelegramConfigured } = await import('./lib/notifications/telegram');
    if (!isTelegramConfigured()) return; // off switch — nothing to schedule

    const { runNotifications } = await import('./lib/notifications/runNotifications');
    g.__notifScheduler = true;

    const tick = () =>
      runNotifications().catch((err) =>
        console.error('[notifications] scheduled run failed:', err)
      );

    tick(); // catch-up on startup
    const ms = intervalMs();
    const timer = setInterval(tick, ms);
    timer.unref?.();
    console.log(`[notifications] scheduler registered (every ${ms / 60000} min)`);
  } catch (err) {
    console.error('[notifications] scheduler registration failed:', err);
  }
}
