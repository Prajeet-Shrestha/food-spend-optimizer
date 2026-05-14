import { NextResponse } from 'next/server';
import { getAllLogs, ensureIndexes } from '@/lib/db';
import { getSettings } from '@/lib/config';
import { getCadenceStatus } from '@/lib/cadence';
import { getLocalDateKey } from '@/lib/dateUtils';
import { RecordType, MissedCheckinLog } from '@/types';

// Force dynamic rendering - this route uses MongoDB which isn't available during build
export const dynamic = 'force-dynamic';

// GET /api/cadence — cadence status for the calendar's next-check-in marker.
export async function GET() {
  try {
    await ensureIndexes();

    const settings = await getSettings();
    if (!settings.cadenceStartDate) {
      // Defensive: getSettings() currently always supplies the default, so this
      // branch is effectively unreachable — kept in case that fallback changes.
      return NextResponse.json({ cadenceStartDate: null, status: null });
    }

    const logs = await getAllLogs();
    const cookLogs = logs
      .filter(log => log.recordType === RecordType.COOK)
      .map(log => ({ date: log.date }));
    const missedLogs = (
      logs.filter(log => log.recordType === RecordType.MISSED) as MissedCheckinLog[]
    ).map(m => ({ nepaliMonth: m.nepaliMonth, hardCheckinDate: m.hardCheckinDate }));

    const status = getCadenceStatus(
      cookLogs,
      missedLogs,
      settings.cadenceStartDate,
      getLocalDateKey(new Date())
    );

    return NextResponse.json({ cadenceStartDate: settings.cadenceStartDate, status });
  } catch (error) {
    console.error('Error loading cadence status:', error);
    return NextResponse.json(
      { error: 'Failed to load cadence status' },
      { status: 500 }
    );
  }
}
