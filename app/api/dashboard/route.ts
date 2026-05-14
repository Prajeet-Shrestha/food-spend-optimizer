import { NextResponse } from 'next/server';
import { getAllLogs, ensureIndexes, reconcileMissedCheckins } from '@/lib/db';
import { getSettings } from '@/lib/config';
import { calculateDashboardMetrics } from '@/lib/calculations';

// Force dynamic rendering - this route uses MongoDB which isn't available during build
export const dynamic = 'force-dynamic';

// GET /api/dashboard
export async function GET() {
  try {
    await ensureIndexes();

    // Back-fill any MISSED check-in records before reading logs, so the
    // dashboard reflects the current cadence state on every load.
    await reconcileMissedCheckins();

    const logs = await getAllLogs();
    const settings = await getSettings();
    
    const metrics = calculateDashboardMetrics(logs, settings);
    
    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error calculating dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to calculate dashboard metrics' },
      { status: 500 }
    );
  }
}

