import { NextRequest, NextResponse } from 'next/server';
import {
  clearPinnedSuggestion,
  getPinnedSuggestion,
  setPinnedSuggestion,
} from '@/lib/db';
import { Suggestion } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pinned = await getPinnedSuggestion();
    return NextResponse.json({ pinned });
  } catch (error) {
    console.error('Error reading pinned suggestion:', error);
    return NextResponse.json({ error: 'Failed to read pinned suggestion' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { suggestion?: Suggestion } | null;
    const suggestion = body?.suggestion;

    if (!suggestion || typeof suggestion.menu !== 'string' || !Array.isArray(suggestion.items)) {
      return NextResponse.json({ error: 'Invalid suggestion payload' }, { status: 400 });
    }

    const pinned = await setPinnedSuggestion(suggestion);
    return NextResponse.json({ pinned });
  } catch (error) {
    console.error('Error setting pinned suggestion:', error);
    return NextResponse.json({ error: 'Failed to set pinned suggestion' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearPinnedSuggestion();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error clearing pinned suggestion:', error);
    return NextResponse.json({ error: 'Failed to clear pinned suggestion' }, { status: 500 });
  }
}
