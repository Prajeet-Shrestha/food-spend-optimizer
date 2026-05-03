import Anthropic from '@anthropic-ai/sdk';
import { CookLog, Suggestion, SuggestionPreferences } from '@/types';
import { hydrateMenuToSuggestion } from './suggestionsEngine';
import { FOOD_TAXONOMY } from './foodTaxonomy';

export class AiSuggestionsError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = 'AiSuggestionsError';
    this.status = status;
  }
}

interface AiPayloadEntry {
  menu: string;
  reasoning: string[];
  isVegDay: boolean;
}

interface AiPayload {
  suggestions: AiPayloadEntry[];
}

const SYSTEM_PROMPT = `You are a meal-planning assistant for a household in Kathmandu, Nepal that uses a part-time cook.
Your job: suggest 2 or 3 fresh, creative menu ideas for the next cook session, varying from the user's recent rotation.

Menu structure (strict):
- Always start with rice (slot 1)
- Include at least ONE of: a gravy/dal, a meat/protein, or a substantial vegetable dish
- MAX 4 "main" items total (rice + up to 3 more mains)
- Optionally add 1-2 "side dishes" (achaar, papad, pickle) on top — sides do not count toward the 4-main cap
- Format the "menu" string as: mains first, then sides, all comma-separated
  (e.g., "Rice, Kwati, Chicken Curry, Saag, Achaar")

What counts as a "main":
- Rice / Jeera Rice (the grain)
- A dal/gravy: Dal, Kwati, Gedagudi, Rajma, Chana
- A protein-based dish: Chicken Curry, Egg Curry, Paneer Sabji, Mushroom Masala, Fish Curry, Mutton Curry, etc.
- A substantial cooked vegetable: Aloo Sabji, Saag, Cauli Sabji, Vindi (Bhindi), Kerau Aloo, Mixed Veg, Paneer Mutter, etc.

NEVER use as a main (these are garnishes/base ingredients, not dishes):
- Bare "Tomato" or "Onion"
- Bare "Salt", "Spice", "Garlic", "Ginger"
- Bare "Lemon", "Coriander"
If you want tomato/onion in the menu, include them as part of an actual dish name (e.g., "Aloo Tomato Sabji", "Tomato Achaar")

STRICTLY NEVER suggest these ingredients (hard household preference):
- pork (no bacon, ham, etc.)
- tofu (no tofu tikka, tofu curry, etc.)
- prawn / shrimp (no prawn curry, jhinga, etc.)

STRICTLY NEVER suggest dishes prepared in these styles, even with allowed proteins:
- choila (no chicken choila, buff choila, etc.)
- tikka (no chicken tikka, paneer tikka, etc.)
- korma (no mutton korma, chicken korma, etc.)
- sekuwa (no chicken sekuwa, mutton sekuwa, etc.)
- sukha (no chicken sukha, sukha preparations of any meat)
- momo (no chicken momo, buff momo, veg momo, etc.)

Stick to gravy-based curries, masalas, sabjis, bhutuwa, jhol, biryani, butter/kadai/tandoori, etc.

Other constraints:
- Use Nepali household ingredients available in Kathmandu (chicken, mutton, buff, fish, paneer, eggs, mushroom, dal, kwati, gedagudi, rajma, chana, alu, saag, vindi, cauli, kerau, karela, simi, mula, bharta, achaar, papad)
- Stay within the user's allowed proteins
- Never include items in the user's avoid list
- Each cook lasts ~4 days, so the menu should reheat well
- Use proper dish names where helpful ("Chicken Curry" not just "Chicken", "Aloo Sabji" not just "Alu") — but still keep each item to 1-3 words for readability
- Reasoning should be 1-2 short bullet points explaining the choice (variety, nutrition, novelty)

Return ONLY valid JSON in this exact shape, no prose, no markdown:
{
  "suggestions": [
    { "menu": "Rice, Kwati, Paneer Sabji, Mushroom Masala, Achaar", "reasoning": ["...", "..."], "isVegDay": true },
    { "menu": "Rice, Dal, Chicken Curry, Cauli Aloo, Papad", "reasoning": [...], "isVegDay": false }
  ]
}`;

function buildUserPrompt(cookLogs: CookLog[], prefs: SuggestionPreferences): string {
  const recent = [...cookLogs]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 10)
    .map(c => `- ${c.date}: ${c.menu}`)
    .join('\n');

  const taxonomyHint = FOOD_TAXONOMY
    .map(t => t.canonical)
    .join(', ');

  return `Recent cook history (most recent first):
${recent || '(none yet)'}

User preferences:
- Allowed proteins: ${prefs.allowedProteins.join(', ') || 'any'}
- Avoid items: ${prefs.avoidItems.join(', ') || 'none'}
- Favorite items: ${prefs.favoriteItems.join(', ') || 'none'}
- Target veg days per week: ${prefs.vegDaysPerWeek}
- Max budget per cook (Rs): ${prefs.maxBudgetPerCook}
- Include extras (achaar, papad): ${prefs.includeExtras ? 'yes' : 'no'}

Known ingredients vocabulary (use these spellings when possible): ${taxonomyHint}

Suggest 2-3 creative menus that break the recent pattern. Be specific and confident.
Return ONLY the JSON object, no other text.`;
}

function extractJson(text: string): AiPayload | null {
  // Strip markdown fences if present
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  // Try direct parse first
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && Array.isArray(parsed.suggestions)) return parsed as AiPayload;
  } catch {
    // fall through
  }

  // Find first { and matching }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const sub = cleaned.slice(start, end + 1);
      const parsed = JSON.parse(sub);
      if (parsed && Array.isArray(parsed.suggestions)) return parsed as AiPayload;
    } catch {
      // fall through
    }
  }
  return null;
}

export async function generateAiSuggestions(
  cookLogs: CookLog[],
  preferences: SuggestionPreferences,
  baseFee: number,
  apiKey: string
): Promise<Suggestion[]> {
  const client = new Anthropic({ apiKey });

  let response;
  try {
    response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(cookLogs, preferences) }],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    throw new AiSuggestionsError(`Claude API call failed: ${msg}`, 502);
  }

  // Extract text from response
  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new AiSuggestionsError('Claude returned no text content', 502);
  }

  const payload = extractJson(textBlock.text);
  if (!payload || !Array.isArray(payload.suggestions) || payload.suggestions.length === 0) {
    throw new AiSuggestionsError('Could not parse suggestions from Claude response', 502);
  }

  // Take up to 3 entries; each becomes a Suggestion via hydrateMenuToSuggestion
  const entries = payload.suggestions.slice(0, 3);
  const suggestions: Suggestion[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry.menu !== 'string' || !entry.menu.trim()) continue;
    const reasoning = Array.isArray(entry.reasoning)
      ? entry.reasoning.filter((r): r is string => typeof r === 'string')
      : [];
    suggestions.push(
      hydrateMenuToSuggestion(entry.menu, reasoning, baseFee, preferences, !!entry.isVegDay)
    );
  }
  return suggestions;
}
