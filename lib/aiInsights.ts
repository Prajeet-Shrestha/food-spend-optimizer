import Anthropic from '@anthropic-ai/sdk';
import { InsightStats } from '@/types';

export class AiInsightsError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = 'AiInsightsError';
    this.status = status;
  }
}

interface AiPayload {
  summary: string;
  highlights: string[];
}

const SYSTEM_PROMPT = `You analyze monthly food-spend data for a Kathmandu household with a part-time cook.
You will receive structured stats for one month plus comparison context.

Your job: write a 2-3 sentence "summary" paragraph + 1-3 "highlights" bullets that
help the user understand what was notable about this month.

Rules:
- Respond in English. Numbers in Western/Arabic numerals.
- Be conversational, not robotic. Don't start with "This month" or "In March".
- Use NPR amounts as "Rs X,XXX". Be specific with numbers.
- Highlights should be punchy, max 12 words each, factual.
- Skip filler. Don't repeat the same fact in summary and highlights.

IN-PROGRESS MONTHS (critical — do not skip):
- The data includes "isCurrentMonth", "daysElapsed", "daysInMonth", and projected totals.
- If isCurrentMonth is TRUE, the month is NOT over. DO NOT phrase totals as final
  ("May was a quiet month", "monthly spend dropped 82%"). They are partial.
- Use forecast framing: "X days into May, spend is on pace for ~Rs Y by month-end"
  or "with N cooks in the first X days, May is tracking toward ~Z cooks total".
- When comparing to prior months, prefer comparing the PROJECTED total/cooks against
  the prior month's actual total — not partial vs full. Always state explicitly that
  it's a projection: "on current pace", "tracking toward", "if the rhythm holds".
- If daysElapsed < 7, add a caveat: "early in the month, projection is noisy".
- If isCurrentMonth is FALSE (a completed past month), use ordinary final-total
  language. Forecast fields will be null — ignore them.

NORMALIZATION (critical — do not skip):
- The data includes "normalizedTotalSpend" for both this month and the prior month.
  Normalized = raw total minus one-time outlier purchases (bulk stockpile buys, etc.).
- ALWAYS prefer the normalized comparison. If outliers exist in the prior month, do
  NOT claim a big drop based on raw totals — that drop is usually just normalization.
- If the prior month had outliers, explicitly explain in the summary: e.g., "March's
  Rs 10,440 was inflated by a Rs 3,500 rice stockpile; normalized that to Rs 6,940,
  April's Rs 6,085 is roughly in line."
- If THIS month has outliers, call them out and show the normalized total.

PRECISION RULES (critical):
- Compare numbers exactly. If two values are equal, say "matches" or "in line with",
  NOT "slightly above/below". Don't invent gaps.
- "X cooks vs Y cooks": if X == Y, say "same as", not "slightly below".
- DO NOT compute or estimate sub-category numbers (cook fees, grocery totals,
  normalized groceries) yourself. The data provides every breakdown you need —
  use the values verbatim. If a number isn't in the data, do not state one.
- DO NOT use phrases like "held steady" or "flat" unless the values are actually
  equal in the data. If cook fees dropped from Rs 4,375 to Rs 3,750, that's a Rs 625
  drop, not "steady" — the per-cook rate stayed the same but the total moved.
- Don't make claims you can't substantiate from the data (e.g., "smallest in recent
  quarter" — only say that if the 3-month avg explicitly supports it).

Return ONLY valid JSON in this exact shape, no prose, no markdown:
{ "summary": "...", "highlights": ["...", "..."] }`;

function buildUserPrompt(stats: InsightStats): string {
  const lines: string[] = [];
  lines.push(`Month: ${stats.monthLabel} (${stats.month})`);
  lines.push(`Status: ${stats.isCurrentMonth ? `IN PROGRESS — day ${stats.daysElapsed} of ${stats.daysInMonth}` : 'COMPLETED MONTH (use final-total language)'}`);
  lines.push('');
  lines.push(`THIS MONTH SO FAR:`);
  lines.push(`- Total spend: Rs ${Math.round(stats.totalSpend)}${stats.isCurrentMonth ? ' (PARTIAL — month not over)' : ''}`);
  lines.push(`  - Cook fees: Rs ${Math.round(stats.cookFees)}`);
  lines.push(`  - Groceries: Rs ${Math.round(stats.groceryTotal)}`);

  if (stats.isCurrentMonth && stats.projectedTotalSpend != null && stats.projectedCookCount != null) {
    const ha = stats.historicalAverages;
    lines.push('');
    if (ha) {
      lines.push(`HISTORICAL BASELINE (last ${ha.monthsAnalyzed} completed months):`);
      lines.push(`- Avg cooks per month: ${ha.avgCookCountPerMonth.toFixed(1)}`);
      lines.push(`- Avg cost per cook day: Rs ${Math.round(ha.avgCostPerCookDay)} (cook fee + groceries, normalized)`);
      lines.push(`- Avg interval between cooks: ${ha.avgIntervalDays.toFixed(1)} days`);
      lines.push('');
    }
    lines.push(`PROJECTED FULL-MONTH (smart projection — blends current pace with historical baseline):`);
    lines.push(`- Projected total: Rs ${Math.round(stats.projectedTotalSpend)}`);
    if (stats.projectedNormalizedTotalSpend != null) {
      lines.push(`- Projected normalized total: Rs ${Math.round(stats.projectedNormalizedTotalSpend)}`);
    }
    lines.push(`- Projected cook count: ${stats.projectedCookCount.toFixed(1)}`);
    if (ha) {
      lines.push(`- Projection method: weighted blend (${Math.round((stats.daysElapsed / stats.daysInMonth) * 100)}% current pace + ${Math.round((1 - stats.daysElapsed / stats.daysInMonth) * 100)}% historical avg) — this avoids over-projection from a single early cook day`);
    } else {
      lines.push(`- Projection method: naive linear (no historical baseline available yet)`);
    }
    lines.push(`- Confidence: ${stats.daysElapsed < 7 ? 'LOW (early in month, projection is noisy — caveat in your output)' : stats.daysElapsed < 15 ? 'MEDIUM (~half month elapsed)' : 'HIGH (>half the month complete)'}`);
    lines.push(`- Use these projected numbers when comparing to prior months' final totals.`);
    if (ha) {
      lines.push(`- For framing, reference the typical rhythm: "tracking toward your typical ~${ha.avgCookCountPerMonth.toFixed(0)} cooks/Rs ${Math.round(ha.avgCookCountPerMonth * ha.avgCostPerCookDay).toLocaleString()} month" if the projection is in line, or call out the deviation if it's meaningfully different.`);
    }
  }
  lines.push('');

  if (stats.outlierPurchases.length > 0) {
    const outlierTotal = stats.outlierPurchases.reduce((s, o) => s + o.amount, 0);
    lines.push(`- One-time / bulk outlier purchases: Rs ${Math.round(outlierTotal)} total`);
    for (const o of stats.outlierPurchases) {
      lines.push(`    • Rs ${o.amount} for "${o.description}" on ${o.date} (${o.reason})`);
    }
    lines.push(`- NORMALIZED total (excluding outliers): Rs ${Math.round(stats.normalizedTotalSpend)}`);
  } else {
    lines.push(`- No outlier purchases this month — normalized total equals raw total: Rs ${Math.round(stats.normalizedTotalSpend)}`);
  }

  lines.push(`- Cook days: ${stats.cookCount} (veg-only days: ${stats.vegCookCount})`);
  if (stats.avgIntervalDays != null) {
    lines.push(`- Avg interval between cooks: ${stats.avgIntervalDays.toFixed(1)} days`);
  }
  if (stats.largestPurchase) {
    lines.push(`- Largest single purchase: Rs ${stats.largestPurchase.amount} for "${stats.largestPurchase.description}" on ${stats.largestPurchase.date} (by ${stats.largestPurchase.boughtBy})`);
  }
  if (stats.tipsTotal > 0) {
    lines.push(`- Tips paid: Rs ${stats.tipsTotal}`);
  }

  lines.push('');
  if (stats.prevMonth) {
    const pm = stats.prevMonth;
    lines.push(`PREVIOUS MONTH (${pm.month}):`);
    lines.push(`- Raw total: Rs ${Math.round(pm.totalSpend)} with ${pm.cookCount} cook days`);
    lines.push(`- Cook fees: Rs ${Math.round(pm.cookFees)}`);
    lines.push(`- Groceries (raw): Rs ${Math.round(pm.groceryTotal)}`);
    if (pm.outlierTotal > 0) {
      lines.push(`- Of which Rs ${Math.round(pm.outlierTotal)} was one-time outliers`);
      lines.push(`- NORMALIZED groceries: Rs ${Math.round(pm.normalizedGroceryTotal)}`);
      lines.push(`- NORMALIZED total: Rs ${Math.round(pm.normalizedTotalSpend)}`);
    } else {
      lines.push(`- No outliers; normalized = raw`);
      lines.push(`- NORMALIZED groceries: Rs ${Math.round(pm.normalizedGroceryTotal)}`);
      lines.push(`- NORMALIZED total: Rs ${Math.round(pm.normalizedTotalSpend)}`);
    }

    // Pre-compute every comparison the AI might want — sub-category included
    const rawDiffPct = pm.totalSpend > 0 ? ((stats.totalSpend - pm.totalSpend) / pm.totalSpend) * 100 : 0;
    const normDiffPct = pm.normalizedTotalSpend > 0 ? ((stats.normalizedTotalSpend - pm.normalizedTotalSpend) / pm.normalizedTotalSpend) * 100 : 0;
    const cookFeeDiff = stats.cookFees - pm.cookFees;
    const cookFeeDiffPct = pm.cookFees > 0 ? (cookFeeDiff / pm.cookFees) * 100 : 0;
    const groceryDiff = stats.groceryTotal - pm.groceryTotal;
    const normGroceryDiff = stats.groceryTotal /* this month has no outliers in grocery line by default */ - pm.normalizedGroceryTotal;
    // Actually compare normalized grocery vs normalized grocery for fairness:
    const thisMonthOutlierTotal = stats.outlierPurchases.reduce((s, o) => s + o.amount, 0);
    const thisMonthNormGrocery = stats.groceryTotal - thisMonthOutlierTotal;
    const normGroceryDiffPct = pm.normalizedGroceryTotal > 0 ? ((thisMonthNormGrocery - pm.normalizedGroceryTotal) / pm.normalizedGroceryTotal) * 100 : 0;
    const cookDiff = stats.cookCount - pm.cookCount;

    lines.push('');
    lines.push(`COMPARISON vs PREV (use the NORMALIZED diffs, not the raw):`);
    lines.push(`- Total raw diff: ${rawDiffPct >= 0 ? '+' : ''}${rawDiffPct.toFixed(1)}% (this Rs ${Math.round(stats.totalSpend)} vs prev Rs ${Math.round(pm.totalSpend)})`);
    lines.push(`- Total normalized diff: ${normDiffPct >= 0 ? '+' : ''}${normDiffPct.toFixed(1)}% (this Rs ${Math.round(stats.normalizedTotalSpend)} vs prev Rs ${Math.round(pm.normalizedTotalSpend)})`);
    lines.push(`- Cook fees diff: ${cookFeeDiff >= 0 ? '+' : ''}Rs ${Math.round(cookFeeDiff)} (${cookFeeDiffPct >= 0 ? '+' : ''}${cookFeeDiffPct.toFixed(1)}%) — this Rs ${Math.round(stats.cookFees)} vs prev Rs ${Math.round(pm.cookFees)} ${cookFeeDiff === 0 ? '— EXACTLY EQUAL, OK to say "held steady"' : '— NOT equal, do NOT say "held steady"'}`);
    lines.push(`- Grocery diff (raw): ${groceryDiff >= 0 ? '+' : ''}Rs ${Math.round(groceryDiff)} — this Rs ${Math.round(stats.groceryTotal)} vs prev Rs ${Math.round(pm.groceryTotal)}`);
    lines.push(`- Grocery diff (normalized): ${normGroceryDiff >= 0 ? '+' : ''}Rs ${Math.round(normGroceryDiff)} (${normGroceryDiffPct >= 0 ? '+' : ''}${normGroceryDiffPct.toFixed(1)}%) — this normalized Rs ${Math.round(thisMonthNormGrocery)} vs prev normalized Rs ${Math.round(pm.normalizedGroceryTotal)}`);
    lines.push(`- Cook days delta: ${cookDiff >= 0 ? '+' : ''}${cookDiff} (this: ${stats.cookCount}, prev: ${pm.cookCount}) ${cookDiff === 0 ? '— SAME, do not say "above" or "below"' : ''}`);
  } else {
    lines.push(`PREVIOUS MONTH: no data`);
  }

  lines.push('');
  const r = stats.rolling3MonthAvg;
  lines.push(`3-MONTH ROLLING AVG:`);
  lines.push(`- Raw avg total: Rs ${Math.round(r.totalSpend)}/month`);
  lines.push(`- Normalized avg total: Rs ${Math.round(r.normalizedTotalSpend)}/month`);
  lines.push(`- Avg cook fees: Rs ${Math.round(r.cookFees)}/month`);
  lines.push(`- Avg groceries (raw): Rs ${Math.round(r.groceryTotal)}/month`);
  lines.push(`- Avg groceries (normalized): Rs ${Math.round(r.normalizedGroceryTotal)}/month`);
  lines.push(`- Avg cooks: ${r.cookCount.toFixed(1)}/month`);

  if (r.normalizedTotalSpend > 0) {
    const vsAvgPct = ((stats.normalizedTotalSpend - r.normalizedTotalSpend) / r.normalizedTotalSpend) * 100;
    const cookVsAvg = stats.cookCount - r.cookCount;
    lines.push(`- This month's normalized total vs 3-mo avg: ${vsAvgPct >= 0 ? '+' : ''}${vsAvgPct.toFixed(1)}%`);
    lines.push(`- This month's cooks vs 3-mo avg: ${cookVsAvg >= 0 ? '+' : ''}${cookVsAvg.toFixed(1)} (this: ${stats.cookCount}, avg: ${r.cookCount.toFixed(1)}) ${Math.abs(cookVsAvg) < 0.5 ? '— essentially THE SAME, say "matches" not "slightly above/below"' : ''}`);
  }

  lines.push('');
  lines.push('Generate the insight now. Return ONLY the JSON object.');
  return lines.join('\n');
}

function extractJson(text: string): AiPayload | null {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed.summary === 'string' && Array.isArray(parsed.highlights)) {
      return parsed as AiPayload;
    }
  } catch {
    // fall through
  }

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      if (parsed && typeof parsed.summary === 'string' && Array.isArray(parsed.highlights)) {
        return parsed as AiPayload;
      }
    } catch {
      // fall through
    }
  }
  return null;
}

function validatePayload(payload: AiPayload): { summary: string; highlights: string[] } {
  const summary = (payload.summary ?? '').trim();
  if (!summary || summary.length > 600) {
    throw new AiInsightsError('AI response malformed: invalid summary', 502);
  }
  const highlights = (payload.highlights ?? [])
    .filter((h): h is string => typeof h === 'string')
    .map(h => h.trim())
    .filter(h => h.length > 0 && h.length <= 120)
    .slice(0, 3);
  return { summary, highlights };
}

export async function generateMonthInsight(
  stats: InsightStats,
  apiKey: string
): Promise<{ summary: string; highlights: string[] }> {
  const client = new Anthropic({ apiKey });

  let response;
  try {
    response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(stats) }],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    throw new AiInsightsError(`Claude API call failed: ${msg}`, 502);
  }

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new AiInsightsError('Claude returned no text content', 502);
  }

  const payload = extractJson(textBlock.text);
  if (!payload) {
    throw new AiInsightsError('Could not parse insight from Claude response', 502);
  }

  return validatePayload(payload);
}
