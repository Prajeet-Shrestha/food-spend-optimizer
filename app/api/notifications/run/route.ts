import { NextRequest, NextResponse } from 'next/server';
import { runNotifications } from '@/lib/notifications/runNotifications';

// Force dynamic rendering - this route uses MongoDB which isn't available during build
export const dynamic = 'force-dynamic';

// Manual / external trigger for the notification runner. The in-process
// scheduler (instrumentation.ts) covers normal operation; this route is for
// testing and as an external-cron fallback.
//
//   ?dryRun=1  → compute due notifications without claiming or sending
//   ?force=1   → bypass the time-of-day gate (test check-in reminders any hour)
//
// Auth: requires NOTIFICATIONS_RUN_TOKEN via `Authorization: Bearer <t>` or
// `?token=<t>`. If the env var is unset the route fails closed (503).

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.NOTIFICATIONS_RUN_TOKEN;
  if (!expected) return false;
  const header = request.headers.get('authorization');
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const provided = bearer ?? request.nextUrl.searchParams.get('token') ?? undefined;
  return provided === expected;
}

async function handle(request: NextRequest) {
  if (!process.env.NOTIFICATIONS_RUN_TOKEN) {
    return NextResponse.json(
      { error: 'NOTIFICATIONS_RUN_TOKEN is not configured' },
      { status: 503 }
    );
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = request.nextUrl.searchParams;
    const result = await runNotifications({
      dryRun: params.get('dryRun') === '1',
      ignoreHourGate: params.get('force') === '1',
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error running notifications:', error);
    return NextResponse.json(
      { error: 'Failed to run notifications' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
