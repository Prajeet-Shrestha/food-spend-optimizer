import { NextResponse } from 'next/server';
import { getAllLogs, ensureIndexes } from '@/lib/db';
import { getSettings } from '@/lib/config';
import { calculateDashboardMetrics } from '@/lib/calculations';

// GET /api/dashboard
export async function GET() {
  try {
    await ensureIndexes();
    
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

