import { NextResponse } from 'next/server';
import { ensureIndexes, getAllLogs } from '@/lib/db';
import { RecordType, CookLog } from '@/types';
import { getSettings, getSuggestionPreferences } from '@/lib/config';
import { generateAiSuggestions, AiSuggestionsError } from '@/lib/aiSuggestions';

// MongoDB + external API — must be dynamic
export const dynamic = 'force-dynamic';

// POST /api/suggestions/ai
// Returns 2-3 AI-generated creative suggestions. Requires ANTHROPIC_API_KEY env var.
export async function POST() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI suggestions unavailable: ANTHROPIC_API_KEY is not configured.' },
      { status: 503 }
    );
  }

  try {
    await ensureIndexes();

    const cookLogs = (await getAllLogs({ type: RecordType.COOK })) as CookLog[];
    const settings = await getSettings();
    const prefs = getSuggestionPreferences(settings);

    const suggestions = await generateAiSuggestions(cookLogs, prefs, settings.baseFee, apiKey);

    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof AiSuggestionsError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error generating AI suggestions:', error);
    const msg = error instanceof Error ? error.message : 'unknown error';
    return NextResponse.json(
      { error: `AI service failed: ${msg}` },
      { status: 502 }
    );
  }
}
