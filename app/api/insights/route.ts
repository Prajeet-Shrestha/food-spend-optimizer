import { NextRequest, NextResponse } from 'next/server';
import { ensureIndexes, getAllLogs, getCachedInsight, saveCachedInsight } from '@/lib/db';
import { MonthInsight } from '@/types';
import { getSettings } from '@/lib/config';
import { computeMonthStats, defaultMonthForInsights } from '@/lib/insightsEngine';
import { generateMonthInsight, AiInsightsError } from '@/lib/aiInsights';

// MongoDB + external API — must be dynamic
export const dynamic = 'force-dynamic';

const MONTH_KEY_RE = /^\d{4}-\d{2}$/;

// GET /api/insights?month=YYYY-MM
// Returns the cached insight for the given month, or { insight: null } if none.
export async function GET(request: NextRequest) {
  const monthKey = request.nextUrl.searchParams.get('month');
  if (!monthKey || !MONTH_KEY_RE.test(monthKey)) {
    return NextResponse.json(
      { error: 'Invalid or missing month. Use ?month=YYYY-MM.' },
      { status: 400 }
    );
  }
  try {
    const insight = await getCachedInsight(monthKey);
    return NextResponse.json({ insight });
  } catch (error) {
    console.error('Error reading cached insight:', error);
    return NextResponse.json({ error: 'Failed to read cached insight' }, { status: 500 });
  }
}

// POST /api/insights
// Body: { month?: string }   // 'YYYY-MM'; defaults to defaultMonthForInsights()
export async function POST(request: NextRequest) {
  let body: { month?: string } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  // Check API key early so we don't waste a DB call when it's missing
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI insights unavailable: ANTHROPIC_API_KEY is not configured.' },
      { status: 503 }
    );
  }

  try {
    await ensureIndexes();
    const logs = await getAllLogs();
    const settings = await getSettings();

    let monthKey = body.month;
    if (!monthKey) {
      monthKey = defaultMonthForInsights(logs);
    }

    if (!MONTH_KEY_RE.test(monthKey)) {
      return NextResponse.json(
        { error: 'Invalid month format. Use YYYY-MM.' },
        { status: 400 }
      );
    }

    const stats = computeMonthStats(logs, monthKey, settings);
    if (stats.cookCount === 0) {
      return NextResponse.json(
        { error: 'Not enough data for insights — no cook logs in this month.' },
        { status: 400 }
      );
    }

    const { summary, highlights } = await generateMonthInsight(stats, apiKey);

    const insight: MonthInsight = {
      month: monthKey,
      summary,
      highlights,
      generatedAt: new Date().toISOString(),
      stats,
    };

    await saveCachedInsight(insight);

    return NextResponse.json({ insight });
  } catch (error) {
    if (error instanceof AiInsightsError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error generating insights:', error);
    const msg = error instanceof Error ? error.message : 'unknown error';
    return NextResponse.json(
      { error: `Insights service failed: ${msg}` },
      { status: 500 }
    );
  }
}
