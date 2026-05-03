import { NextRequest, NextResponse } from 'next/server';
import { ensureIndexes, getAllLogs } from '@/lib/db';
import { RecordType, CookLog } from '@/types';
import { getSettings, getSuggestionPreferences } from '@/lib/config';
import { generateSuggestions, computeContext } from '@/lib/suggestionsEngine';

// MongoDB-backed route — must be dynamic
export const dynamic = 'force-dynamic';

// POST /api/suggestions
// Body: { seed?: number }
// (POST chosen over GET because seed-based generation is non-idempotent)
export async function POST(request: NextRequest) {
  try {
    await ensureIndexes();

    let body: { seed?: number } = {};
    try {
      body = await request.json();
    } catch {
      // empty body is fine
    }

    const cookLogs = (await getAllLogs({ type: RecordType.COOK })) as CookLog[];
    const settings = await getSettings();
    const prefs = getSuggestionPreferences(settings);

    const suggestions = generateSuggestions(cookLogs, prefs, settings.baseFee, body.seed);
    const context = computeContext(cookLogs);

    return NextResponse.json({ suggestions, context });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
