import { NextRequest, NextResponse } from 'next/server';
import { addBookmark, EmptyMenuError, ensureIndexes, listBookmarks } from '@/lib/db';
import { Suggestion } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureIndexes();
    const bookmarks = await listBookmarks();
    return NextResponse.json({ bookmarks });
  } catch (error) {
    console.error('Error listing bookmarks:', error);
    return NextResponse.json({ error: 'Failed to list bookmarks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureIndexes();
    const body = (await request.json().catch(() => null)) as { suggestion?: Suggestion } | null;
    const suggestion = body?.suggestion;

    if (!suggestion || typeof suggestion.menu !== 'string' || !Array.isArray(suggestion.items)) {
      return NextResponse.json({ error: 'Invalid suggestion payload' }, { status: 400 });
    }

    const { doc, created } = await addBookmark(suggestion);
    return NextResponse.json(
      { bookmark: doc, alreadyBookmarked: !created },
      { status: created ? 201 : 200 }
    );
  } catch (error) {
    if (error instanceof EmptyMenuError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error creating bookmark:', error);
    return NextResponse.json({ error: 'Failed to create bookmark' }, { status: 500 });
  }
}
