import { CookLog, Suggestion, SuggestionPreferences, FoodItem } from '@/types';
import { DEFAULT_SUGGESTION_PREFERENCES } from './suggestionDefaults';
import { categorize, getProteins, getDals, getVegs, getExtras, getByCanonical, FOOD_TAXONOMY } from './foodTaxonomy';
import { buildGroceryList, estimateGroceryCost } from './groceryEstimator';

// Lightweight seeded PRNG (mulberry32). Determinism keeps tests + Refresh stable per seed.
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], rng: () => number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(a).getTime() - new Date(b).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

// Returns canonical names of items used in the menu.
function canonicalsOf(menu: string): Set<string> {
  const cat = categorize(menu);
  const set = new Set<string>();
  if (cat.grain) set.add(cat.grain.canonical);
  if (cat.dal) set.add(cat.dal.canonical);
  if (cat.protein) set.add(cat.protein.canonical);
  for (const v of cat.vegs) set.add(v.canonical);
  for (const e of cat.extras) set.add(e.canonical);
  return set;
}

// For each canonical item, how many days ago was it last used? Items never seen → Infinity.
function daysSinceMap(cookLogs: CookLog[], today: string): Map<string, number> {
  const map = new Map<string, number>();
  // sorted newest first
  const sorted = [...cookLogs].sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const log of sorted) {
    const used = canonicalsOf(log.menu);
    const days = Math.max(0, daysBetween(today, log.date));
    for (const c of used) {
      if (!map.has(c)) map.set(c, days);
    }
  }
  return map;
}

function vegCooksInLast7(cookLogs: CookLog[], today: string): number {
  let count = 0;
  for (const log of cookLogs) {
    const days = daysBetween(today, log.date);
    if (days >= 0 && days <= 7) {
      const cat = categorize(log.menu);
      if (cat.isVegMeal) count += 1;
    }
  }
  return count;
}

function cooksInLast7(cookLogs: CookLog[], today: string): number {
  let count = 0;
  for (const log of cookLogs) {
    const days = daysBetween(today, log.date);
    if (days >= 0 && days <= 7) count += 1;
  }
  return count;
}

interface SelectionCtx {
  prefs: SuggestionPreferences;
  daysSince: Map<string, number>;
  lastCookCanonicals: Set<string>;
  rng: () => number;
}

function pickProtein(ctx: SelectionCtx, vegOnly: boolean): { item: FoodItem | null; reasoning: string[] } {
  const reasoning: string[] = [];
  const all = getProteins();
  let allowed = ctx.prefs.allowedProteins.map(p => p.toLowerCase());
  let pool = all.filter(p => allowed.includes(p.canonical) && !ctx.prefs.avoidItems.includes(p.canonical));

  // Degenerate config: every allowed protein is also in avoidItems → fall back to defaults
  if (pool.length === 0) {
    reasoning.push('Your avoid list excluded all allowed proteins; using defaults.');
    allowed = DEFAULT_SUGGESTION_PREFERENCES.allowedProteins;
    pool = all.filter(p => allowed.includes(p.canonical));
  }

  if (vegOnly) {
    pool = pool.filter(p => p.isVeg);
    if (pool.length === 0) {
      reasoning.push('Veg day requested but no veg-friendly protein available — skipping protein.');
      return { item: null, reasoning };
    }
  }

  // Score: favor proteins least-recently used; favoriteItems get a boost
  const favorites = new Set(ctx.prefs.favoriteItems);
  const scored = pool.map(p => {
    const days = ctx.daysSince.get(p.canonical) ?? Number.POSITIVE_INFINITY;
    const favBoost = favorites.has(p.canonical) ? 5 : 0;
    const recencyPenalty = ctx.lastCookCanonicals.has(p.canonical) ? -10 : 0;
    const jitter = ctx.rng() * 0.5;
    return { item: p, score: days + favBoost + recencyPenalty + jitter };
  });
  scored.sort((a, b) => b.score - a.score);
  const chosen = scored[0].item;

  const daysSeen = ctx.daysSince.get(chosen.canonical);
  if (daysSeen === undefined || !Number.isFinite(daysSeen)) {
    reasoning.push(`Suggesting ${chosen.canonical} — haven't seen it in your recent cook history.`);
  } else if (daysSeen >= 14) {
    reasoning.push(`No ${chosen.canonical} in ~${daysSeen} days; time to bring it back.`);
  } else if (favorites.has(chosen.canonical)) {
    reasoning.push(`${chosen.canonical} is on your favorites list.`);
  } else {
    reasoning.push(`Rotating to ${chosen.canonical} (last seen ~${daysSeen} days ago).`);
  }
  return { item: chosen, reasoning };
}

function pickDal(ctx: SelectionCtx): { item: FoodItem | null; reasoning: string[] } {
  const reasoning: string[] = [];
  const dals = getDals().filter(d => !ctx.prefs.avoidItems.includes(d.canonical));
  if (dals.length === 0) return { item: null, reasoning };

  // Prefer a dal NOT used in last cook
  const filtered = dals.filter(d => !ctx.lastCookCanonicals.has(d.canonical));
  const pool = filtered.length > 0 ? filtered : dals;
  const chosen = pick(pool, ctx.rng)!;

  if (chosen.canonical !== 'dal') {
    reasoning.push(`Rotating dal → ${chosen.canonical} for variety.`);
  }
  return { item: chosen, reasoning };
}

function pickVegs(ctx: SelectionCtx, count: number): { items: FoodItem[]; reasoning: string[] } {
  const reasoning: string[] = [];
  const all = getVegs().filter(v => !ctx.prefs.avoidItems.includes(v.canonical));
  if (all.length === 0) return { items: [], reasoning };

  // Skip vegs from the immediate last cook when possible
  const filtered = all.filter(v => !ctx.lastCookCanonicals.has(v.canonical));
  const pool = filtered.length >= count ? filtered : all;

  // Sort by daysSince DESC (least-recently used first), with jitter
  const scored = pool.map(v => {
    const days = ctx.daysSince.get(v.canonical) ?? Number.POSITIVE_INFINITY;
    const finite = Number.isFinite(days) ? days : 999;
    return { item: v, score: finite + ctx.rng() * 1.5 };
  });
  scored.sort((a, b) => b.score - a.score);
  const items = scored.slice(0, count).map(s => s.item);

  if (items.length > 0) {
    reasoning.push(`Vegs: ${items.map(v => v.canonical).join(' + ')} (rotating from last cook).`);
  }
  return { items, reasoning };
}

function pickExtras(ctx: SelectionCtx, includeExtras: boolean): { items: FoodItem[]; reasoning: string[] } {
  const reasoning: string[] = [];
  if (!includeExtras) return { items: [], reasoning };
  const extras = getExtras().filter(e => !ctx.prefs.avoidItems.includes(e.canonical));
  if (extras.length === 0) return { items: [], reasoning };

  // 50/50 add-an-extra: pick one with longest "days since"
  if (ctx.rng() < 0.5) {
    const sorted = extras
      .map(e => ({ e, d: ctx.daysSince.get(e.canonical) ?? Number.POSITIVE_INFINITY }))
      .sort((a, b) => (Number.isFinite(b.d) ? b.d : 999) - (Number.isFinite(a.d) ? a.d : 999));
    const chosen = sorted[0].e;
    reasoning.push(`Adding ${chosen.canonical} for a small flavor lift.`);
    return { items: [chosen], reasoning };
  }
  return { items: [], reasoning };
}

// Structure rule: every cook has rice + at most 3 more "mains"
// (dal/gravy/protein/veg) for a total of 4 mains, plus optional side dishes
// (achaar/papad) that don't count toward the cap.
const MAX_MAIN_ITEMS = 4;

function buildSuggestion(opts: {
  ctx: SelectionCtx;
  baseFee: number;
  prefs: SuggestionPreferences;
  strategy: Suggestion['strategy'];
  forceVegDay: boolean;
  varietyMode?: boolean;
}): Suggestion {
  const { ctx, baseFee, prefs, strategy, forceVegDay, varietyMode } = opts;
  const reasoning: string[] = [];
  const tags: string[] = [];

  if (strategy === 'veg') tags.push('veg-day');
  if (varietyMode) tags.push('try-something-new');

  // ---- Mains (max 4: rice + up to 3 more) ----
  const mains: FoodItem[] = [];

  // 1. Rice — always slot 1
  const rice = getByCanonical('rice');
  if (rice) mains.push(rice);

  // 2. Dal/gravy — "some gravy or dal"
  const dalRes = pickDal(ctx);
  if (dalRes.item && mains.length < MAX_MAIN_ITEMS) mains.push(dalRes.item);
  reasoning.push(...dalRes.reasoning);

  // 3. Protein (skip on veg day; falls back to extra veg below)
  const proteinRes = pickProtein(ctx, forceVegDay);
  if (proteinRes.item && mains.length < MAX_MAIN_ITEMS) mains.push(proteinRes.item);
  reasoning.push(...proteinRes.reasoning);

  // 4. Veg — fill remaining main slots. On veg-day with no protein, allow 2 vegs.
  const vegSlots = MAX_MAIN_ITEMS - mains.length;
  const wantVegs = forceVegDay && !proteinRes.item ? Math.min(2, vegSlots) : Math.min(1, vegSlots);
  if (wantVegs > 0) {
    const vegRes = pickVegs(ctx, wantVegs);
    mains.push(...vegRes.items);
    reasoning.push(...vegRes.reasoning);
  }

  // ---- Sides (extras: achaar, papad — to spice things up) ----
  // Always allowed; not capped by MAX_MAIN_ITEMS.
  const sides: FoodItem[] = [];
  const extrasRes = pickExtras(ctx, prefs.includeExtras);
  sides.push(...extrasRes.items);
  reasoning.push(...extrasRes.reasoning);

  // Variety mode hint: in "Try Something New", swap one main for an unusual pick.
  // pickProtein/pickVegs already bias toward least-recently-used; the extra reasoning is enough.

  let items: FoodItem[] = [...mains, ...sides];

  // ---- Cost cap enforcement ----
  let groceryCost = estimateGroceryCost(items);
  let total = baseFee + groceryCost;
  if (total > prefs.maxBudgetPerCook) {
    // Drop sides first, then most-expensive veg from mains
    const dropOrder: FoodItem[] = [
      ...sides,
      ...mains.filter(i => i.category === 'veg').sort((a, b) => b.estimatedCost - a.estimatedCost),
    ];
    for (const drop of dropOrder) {
      const idx = items.indexOf(drop);
      if (idx >= 0) {
        items = items.filter((_, j) => j !== idx);
        groceryCost = estimateGroceryCost(items);
        total = baseFee + groceryCost;
        if (total <= prefs.maxBudgetPerCook) break;
      }
    }
    if (total > prefs.maxBudgetPerCook) {
      tags.push('over-budget');
      reasoning.push(`Couldn't fit under your Rs ${prefs.maxBudgetPerCook} cap; consider raising it or skipping a course.`);
    }
  }

  // Recompute mains/sides from final items (may have been trimmed by cost cap)
  const finalMains = items.filter(i => i.category !== 'extra');
  const finalSides = items.filter(i => i.category === 'extra');

  // Veg-day flag from final mains
  const cat = categorize(finalMains.map(i => i.canonical).join(','));
  const isVegDay = cat.isVegMeal;
  if (isVegDay && strategy !== 'veg') tags.push('meatless');
  if (total < 800 && !tags.includes('over-budget')) tags.push('budget-friendly');

  // Menu string includes everything for the cook log; UI splits mains/sides via item categories
  const menu = [...finalMains, ...finalSides]
    .map(i => i.canonical.charAt(0).toUpperCase() + i.canonical.slice(1))
    .join(', ');

  return {
    menu,
    items,
    reasoning,
    estimatedCost: total,
    cookFee: baseFee,
    groceryList: buildGroceryList(items),
    daysToLast: prefs.defaultDaysToLast,
    isVegDay,
    tags,
    source: 'rules',
    strategy,
  };
}

export function generateSuggestions(
  cookLogs: CookLog[],
  preferences: SuggestionPreferences,
  baseFee: number,
  seed?: number
): Suggestion[] {
  if (cookLogs.length === 0) return [];

  const today = todayIso();
  const sorted = [...cookLogs].sort((a, b) => (a.date < b.date ? 1 : -1));
  const lastCook = sorted[0];
  const lastCookCanonicals = canonicalsOf(lastCook.menu);
  const daysSince = daysSinceMap(sorted.slice(0, 10), today);

  const vegLast7 = vegCooksInLast7(sorted, today);
  const totalLast7 = cooksInLast7(sorted, today);
  // If user already meets veg quota in trailing 7d, don't push another veg-day
  const vegQuotaUnmet = vegLast7 < preferences.vegDaysPerWeek;

  const rng = makeRng(seed ?? Date.now());

  const ctx: SelectionCtx = {
    prefs: preferences,
    daysSince,
    lastCookCanonicals,
    rng,
  };

  const suggestions: Suggestion[] = [];

  // Strategy 1: Balanced — pick best protein (not veg-day unless quota strongly unmet)
  if (preferences.vegDaysPerWeek < 7) {
    suggestions.push(buildSuggestion({
      ctx, baseFee, prefs: preferences, strategy: 'balanced',
      forceVegDay: false, varietyMode: false,
    }));
  }

  // Strategy 2: Veg-day — only if quota allows it (vegDaysPerWeek > 0)
  if (preferences.vegDaysPerWeek > 0 && vegQuotaUnmet) {
    suggestions.push(buildSuggestion({
      ctx, baseFee, prefs: preferences, strategy: 'veg',
      forceVegDay: true, varietyMode: false,
    }));
  } else if (preferences.vegDaysPerWeek === 7) {
    // User wants every day veg → make Balanced veg too
    suggestions.push(buildSuggestion({
      ctx, baseFee, prefs: preferences, strategy: 'veg',
      forceVegDay: true, varietyMode: false,
    }));
  }

  // Strategy 3: Try Something New — variety mode (2 vegs, biased toward least-recently-used)
  suggestions.push(buildSuggestion({
    ctx, baseFee, prefs: preferences, strategy: 'new',
    forceVegDay: false, varietyMode: true,
  }));

  // Add a context line to the first suggestion summarizing the week
  if (suggestions.length > 0) {
    suggestions[0].reasoning.unshift(
      `${totalLast7} cook${totalLast7 === 1 ? '' : 's'} in the last 7 days (${vegLast7} veg-day${vegLast7 === 1 ? '' : 's'}).`
    );
  }

  return suggestions;
}

// Public helpers consumed by the API route for the context strip.
export function computeContext(cookLogs: CookLog[]) {
  if (cookLogs.length === 0) {
    return {
      lastCookDate: null,
      nextCookDate: null,
      daysSinceLastCook: null,
      cooksThisWeek: 0,
      vegCooksThisWeek: 0,
    };
  }
  const today = todayIso();
  const sorted = [...cookLogs].sort((a, b) => (a.date < b.date ? 1 : -1));
  const lastCookDate = sorted[0].date;
  const next = new Date(lastCookDate);
  next.setDate(next.getDate() + 4);
  const nextCookDate = next.toISOString().split('T')[0];
  return {
    lastCookDate,
    nextCookDate,
    daysSinceLastCook: daysBetween(today, lastCookDate),
    cooksThisWeek: cooksInLast7(sorted, today),
    vegCooksThisWeek: vegCooksInLast7(sorted, today),
  };
}

// Given a free-form menu string from the AI, hydrate it into a full Suggestion
// with grocery list + cost estimate. Used by aiSuggestions.ts to keep AI output
// consistent with rule-based output.
export function hydrateMenuToSuggestion(
  menu: string,
  reasoning: string[],
  baseFee: number,
  preferences: SuggestionPreferences,
  isVegDayHint?: boolean
): Suggestion {
  const cat = categorize(menu);

  // Build the "mains" pool, capped at MAX_MAIN_ITEMS (rice + up to 3 more)
  const mains: FoodItem[] = [];
  const rice = cat.grain ?? getByCanonical('rice');
  if (rice) mains.push(rice);
  if (cat.dal && mains.length < MAX_MAIN_ITEMS) mains.push(cat.dal);
  if (cat.protein && mains.length < MAX_MAIN_ITEMS) mains.push(cat.protein);
  for (const v of cat.vegs) {
    if (mains.length >= MAX_MAIN_ITEMS) break;
    mains.push(v);
  }

  // Sides (extras) — kept separate, not counted in cap
  const sides: FoodItem[] = [...cat.extras];

  const items = [...mains, ...sides];

  const groceryCost = estimateGroceryCost(items);
  const total = baseFee + groceryCost;
  const tags = ['ai'];
  if (cat.isVegMeal || isVegDayHint) tags.push('meatless');
  if (total > preferences.maxBudgetPerCook) tags.push('over-budget');

  // Use displayName when available so AI dish names like "Paneer Sabji" survive,
  // falling back to capitalized canonical for items without a richer label.
  const labelOf = (i: FoodItem) =>
    i.displayName
      ? i.displayName.charAt(0).toUpperCase() + i.displayName.slice(1)
      : i.canonical.charAt(0).toUpperCase() + i.canonical.slice(1);

  return {
    menu: items.map(labelOf).join(', '),
    items,
    reasoning,
    estimatedCost: total,
    cookFee: baseFee,
    groceryList: buildGroceryList(items),
    daysToLast: preferences.defaultDaysToLast,
    isVegDay: cat.isVegMeal || !!isVegDayHint,
    tags,
    source: 'ai',
    strategy: 'ai',
  };
}

// Suppress unused-import warning for lint when no protein selected
void FOOD_TAXONOMY;
