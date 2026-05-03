import { FoodItem, FoodCategory } from '@/types';

export const FOOD_TAXONOMY: FoodItem[] = [
  // Grains
  { canonical: 'rice', aliases: ['rice', 'bhat'], category: 'grain', isVeg: true, estimatedCost: 0, groceryUnit: 'pantry' },
  { canonical: 'pulao', aliases: ['pulao', 'pulav', 'pilaf', 'jeera rice', 'fried rice'], category: 'grain', isVeg: true, estimatedCost: 0, groceryUnit: 'pantry' },
  { canonical: 'roti', aliases: ['roti', 'chapati', 'chapatti', 'phulka'], category: 'grain', isVeg: true, estimatedCost: 0, groceryUnit: 'pantry' },

  // Dals (rotate)
  { canonical: 'dal', aliases: ['dal', 'daal', 'musur', 'lentil', 'lentils'], category: 'dal', isVeg: true, estimatedCost: 0, groceryUnit: 'pantry' },
  { canonical: 'kwati', aliases: ['kwati'], category: 'dal', isVeg: true, estimatedCost: 0, groceryUnit: 'pantry' },
  { canonical: 'gedagudi', aliases: ['gedagudi', 'geda gudi'], category: 'dal', isVeg: true, estimatedCost: 0, groceryUnit: 'pantry' },
  { canonical: 'rajma', aliases: ['rajma', 'rajma masala', 'kidney beans'], category: 'dal', isVeg: true, estimatedCost: 100, groceryUnit: '500g' },
  { canonical: 'chana', aliases: ['chana', 'chickpea', 'chickpeas', 'chana masala'], category: 'dal', isVeg: true, estimatedCost: 100, groceryUnit: '500g' },

  // Proteins (meat)
  { canonical: 'chicken', aliases: ['chicken', 'masu', 'meat', 'roast', 'chicken meat', 'chicken curry'], category: 'protein', isVeg: false, estimatedCost: 450, groceryUnit: '1kg' },
  { canonical: 'mutton', aliases: ['mutton', 'goat', 'goat meat', 'khasi'], category: 'protein', isVeg: false, estimatedCost: 1000, groceryUnit: '1kg' },
  { canonical: 'buff', aliases: ['buff', 'buffalo', 'buffalo meat', 'rango'], category: 'protein', isVeg: false, estimatedCost: 500, groceryUnit: '1kg' },
  { canonical: 'fish', aliases: ['fish', 'rohu', 'tilapia', 'machha', 'machhi', 'fish curry'], category: 'protein', isVeg: false, estimatedCost: 600, groceryUnit: '1kg' },
  { canonical: 'sausage', aliases: ['sausage', 'sausages', 'salami'], category: 'protein', isVeg: false, estimatedCost: 250, groceryUnit: '200g' },

  // Proteins (veg)
  { canonical: 'paneer', aliases: ['paneer', 'cottage cheese'], category: 'protein', isVeg: true, estimatedCost: 250, groceryUnit: '250g' },
  { canonical: 'egg', aliases: ['egg', 'eggs', 'anda', 'egg curry', 'omelet', 'omelette', 'egg bhurji'], category: 'protein', isVeg: true, estimatedCost: 100, groceryUnit: '6 eggs' },
  { canonical: 'mushroom', aliases: ['mushroom', 'chyau'], category: 'protein', isVeg: true, estimatedCost: 200, groceryUnit: '250g' },
  { canonical: 'bhatmas', aliases: ['bhatmas', 'soybean', 'bhatmas sadeko'], category: 'protein', isVeg: true, estimatedCost: 80, groceryUnit: '250g' },

  // Vegs
  { canonical: 'alu', aliases: ['alu', 'aloo', 'potato', 'potatoes', 'aloo sabji', 'alu sabji', 'alu dum'], category: 'veg', isVeg: true, estimatedCost: 50, groceryUnit: '500g' },
  { canonical: 'saag', aliases: ['saag', 'sag', 'spinach', 'green leafy', 'palak'], category: 'veg', isVeg: true, estimatedCost: 100, groceryUnit: 'bunch' },
  { canonical: 'cauli', aliases: ['cauli', 'cauliflower', 'phool gobi', 'gobi', 'cauli sabji'], category: 'veg', isVeg: true, estimatedCost: 150, groceryUnit: '1 head' },
  { canonical: 'vindi', aliases: ['vindi', 'bhindi', 'okra', 'lady finger', 'bhindi masala'], category: 'veg', isVeg: true, estimatedCost: 100, groceryUnit: '500g' },
  { canonical: 'kerau', aliases: ['kerau', 'peas', 'green peas', 'matar'], category: 'veg', isVeg: true, estimatedCost: 100, groceryUnit: '250g' },
  { canonical: 'karela', aliases: ['karela', 'bitter gourd', 'tite karela'], category: 'veg', isVeg: true, estimatedCost: 100, groceryUnit: '500g' },
  { canonical: 'simi', aliases: ['simi', 'beans', 'french beans', 'green beans'], category: 'veg', isVeg: true, estimatedCost: 100, groceryUnit: '500g' },
  { canonical: 'mula', aliases: ['mula', 'mooli', 'radish', 'daikon'], category: 'veg', isVeg: true, estimatedCost: 50, groceryUnit: '500g' },
  { canonical: 'bharta', aliases: ['bharta', 'eggplant', 'brinjal', 'baingan', 'bhanta'], category: 'veg', isVeg: true, estimatedCost: 100, groceryUnit: '500g' },
  { canonical: 'mixed-veg', aliases: ['mixed veg', 'mixed vegetable', 'mixed vegetables', 'tarkari'], category: 'veg', isVeg: true, estimatedCost: 150, groceryUnit: 'mixed' },

  // Garnish/base — kept as 'extra' so the rule engine never picks them as a main veg,
  // but parser still attributes cost when they appear inside dish names like "Aloo Tomato".
  { canonical: 'tomato', aliases: ['tomato', 'tomatoes', 'golbheda'], category: 'extra', isVeg: true, estimatedCost: 0, groceryUnit: 'pantry' },
  { canonical: 'onion', aliases: ['onion', 'onions', 'pyaj'], category: 'extra', isVeg: true, estimatedCost: 0, groceryUnit: 'pantry' },

  // Extras / sides
  { canonical: 'achaar', aliases: ['achaar', 'achar', 'pickle', 'alu achaar', 'tomato achaar', 'mula achaar'], category: 'extra', isVeg: true, estimatedCost: 0, groceryUnit: 'pantry' },
  { canonical: 'papad', aliases: ['papad', 'papadum', 'poppadom'], category: 'extra', isVeg: true, estimatedCost: 0, groceryUnit: 'pantry' },
  { canonical: 'raita', aliases: ['raita', 'curd', 'dahi'], category: 'extra', isVeg: true, estimatedCost: 50, groceryUnit: '200g' },
  { canonical: 'salad', aliases: ['salad', 'green salad', 'kachumber'], category: 'extra', isVeg: true, estimatedCost: 30, groceryUnit: 'pantry' },
  { canonical: 'chutney', aliases: ['chutney', 'mint chutney', 'coriander chutney'], category: 'extra', isVeg: true, estimatedCost: 0, groceryUnit: 'pantry' },
  { canonical: 'kheer', aliases: ['kheer', 'rice pudding', 'firni'], category: 'extra', isVeg: true, estimatedCost: 100, groceryUnit: 'serves 2' },
  { canonical: 'halwa', aliases: ['halwa', 'sooji halwa', 'gajar halwa'], category: 'extra', isVeg: true, estimatedCost: 80, groceryUnit: 'serves 2' },
  { canonical: 'sel-roti', aliases: ['sel roti', 'sel-roti', 'selroti'], category: 'extra', isVeg: true, estimatedCost: 50, groceryUnit: '4 pcs' },
];

const aliasIndex: Map<string, FoodItem> = (() => {
  const map = new Map<string, FoodItem>();
  for (const item of FOOD_TAXONOMY) {
    for (const alias of item.aliases) {
      map.set(alias.toLowerCase().trim(), item);
    }
    map.set(item.canonical.toLowerCase().trim(), item);
  }
  return map;
})();

export function findFoodItem(name: string): FoodItem | null {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  if (!key) return null;
  if (aliasIndex.has(key)) return aliasIndex.get(key)!;

  // Try matching first word of multi-word inputs (e.g., "chicken curry" → "chicken")
  const firstWord = key.split(/\s+/)[0];
  if (firstWord && aliasIndex.has(firstWord)) return aliasIndex.get(firstWord)!;

  // Try matching last word (e.g., "fresh saag" → "saag")
  const lastWord = key.split(/\s+/).pop()!;
  if (lastWord && aliasIndex.has(lastWord)) return aliasIndex.get(lastWord)!;

  return null;
}

// Keyword-based category inference for unknown items.
// AI may emit dishes outside the taxonomy ("Tofu Tikka", "Methi Aloo", "Saoji Mutton") —
// rather than dumping them all into 'extra' with a flat Rs 100 estimate, infer category
// and a more realistic cost from the dish name.
// Excluded ingredients/styles per household preference: pork, prawn/shrimp, tofu, choila, tikka, korma, sekuwa, sukha, momo
const MEAT_HINTS = ['chicken', 'mutton', 'lamb', 'fish', 'buff', 'buffalo', 'beef', 'sausage', 'masu'];
const VEG_PROTEIN_HINTS = ['paneer', 'mushroom', 'chyau', 'egg', 'anda', 'omelet', 'omelette', 'bhatmas', 'soya', 'soybean'];
const PROTEIN_DISH_HINTS = ['curry', 'masala', 'bhuteko', 'bhuna', 'bhutuwa', 'kebab', 'biryani', 'jhol', 'gravy', 'do pyaza', 'vindaloo', 'saoji', 'butter', 'kadai', 'tandoori'];
const VEG_DISH_HINTS = ['sabji', 'sabzi', 'bhaji', 'tarkari', 'fry', 'dum', 'matar', 'methi', 'aloo dum', 'sukuti'];
const GRAIN_HINTS = ['rice', 'pulao', 'pulav', 'biryani', 'jeera', 'bhat', 'noodles', 'chowmein', 'pasta', 'roti', 'naan', 'paratha'];
const DAL_HINTS = ['dal', 'daal', 'lentil', 'rajma', 'chana', 'chickpea', 'kwati', 'gedagudi'];
const SWEET_HINTS = ['sweet', 'halwa', 'kheer', 'lassi', 'sel roti', 'jalebi', 'gulab', 'barfi', 'laddu', 'rasmalai', 'rasgulla', 'firni', 'shrikhand'];
const SIDE_HINTS = ['achaar', 'achar', 'pickle', 'papad', 'raita', 'salad', 'chutney'];

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some(k => text.includes(k));
}

interface CategoryGuess {
  category: FoodCategory;
  isVeg: boolean;
  estimatedCost: number;
  groceryUnit: string;
}

function inferCategoryFromName(rawName: string): CategoryGuess {
  const name = rawName.toLowerCase();

  if (hasAnyKeyword(name, SIDE_HINTS)) {
    return { category: 'extra', isVeg: true, estimatedCost: 30, groceryUnit: 'pantry' };
  }
  if (hasAnyKeyword(name, SWEET_HINTS)) {
    return { category: 'extra', isVeg: true, estimatedCost: 100, groceryUnit: 'serves 2' };
  }
  if (hasAnyKeyword(name, DAL_HINTS)) {
    return { category: 'dal', isVeg: true, estimatedCost: 50, groceryUnit: 'pantry' };
  }
  if (hasAnyKeyword(name, GRAIN_HINTS)) {
    return { category: 'grain', isVeg: true, estimatedCost: 0, groceryUnit: 'pantry' };
  }

  // Protein detection: either explicit meat/veg-protein word OR a "dish" keyword (curry/masala)
  const hasMeat = hasAnyKeyword(name, MEAT_HINTS);
  const hasVegProtein = hasAnyKeyword(name, VEG_PROTEIN_HINTS);
  const hasDishKeyword = hasAnyKeyword(name, PROTEIN_DISH_HINTS);
  if (hasMeat) {
    return { category: 'protein', isVeg: false, estimatedCost: 500, groceryUnit: '1kg' };
  }
  if (hasVegProtein) {
    return { category: 'protein', isVeg: true, estimatedCost: 250, groceryUnit: '250g' };
  }
  if (hasDishKeyword) {
    // "Generic curry/masala" — assume veg-protein-ish, mid cost
    return { category: 'protein', isVeg: true, estimatedCost: 300, groceryUnit: 'serving' };
  }

  // Veg dish keyword (sabji/bhaji/tarkari) — only after protein checks so "Paneer Sabji" still wins as protein
  if (hasAnyKeyword(name, VEG_DISH_HINTS)) {
    return { category: 'veg', isVeg: true, estimatedCost: 100, groceryUnit: 'serving' };
  }

  // Default: treat as a side. Lower cost than the old Rs 100 since unknowns shouldn't dominate budget.
  return { category: 'extra', isVeg: true, estimatedCost: 50, groceryUnit: 'unknown' };
}

// Build a synthetic FoodItem for unknown menu entries so cost estimates don't drop to zero.
// Uses keyword inference so unknown protein dishes don't get demoted to "extra" sides.
export function syntheticFoodItem(rawName: string): FoodItem {
  const cleaned = rawName.trim().toLowerCase();
  if (!cleaned) {
    return {
      canonical: 'unknown',
      aliases: ['unknown'],
      category: 'extra',
      isVeg: true,
      estimatedCost: 50,
      groceryUnit: 'unknown',
    };
  }
  const guess = inferCategoryFromName(cleaned);
  return {
    canonical: cleaned,
    aliases: [cleaned],
    ...guess,
    displayName: rawName.trim(), // preserve original casing/spacing for display
  };
}

// Splits a menu string on commas, fuzzy-matches each part, returns resolved FoodItems.
// Unknown items become synthetic items so cost estimates don't collapse to zero.
// Each returned FoodItem carries `displayName` set to the original raw label (e.g.,
// "Paneer Sabji"), so the UI can preserve dish-level naming from AI output instead of
// flattening to the bare canonical ("paneer").
export function parseMenu(menuString: string): FoodItem[] {
  if (!menuString || !menuString.trim()) return [];

  const parts = menuString
    .split(/[,;]/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const items: FoodItem[] = [];
  for (const part of parts) {
    const found = findFoodItem(part);
    if (found) {
      // Only attach displayName when the raw label adds information beyond the canonical
      const matchesCanonical = part.toLowerCase() === found.canonical;
      items.push(matchesCanonical ? found : { ...found, displayName: part });
    } else {
      items.push(syntheticFoodItem(part));
    }
  }
  return items;
}

export interface CategorizedMenu {
  grain?: FoodItem;
  dal?: FoodItem;
  protein?: FoodItem;
  vegs: FoodItem[];
  extras: FoodItem[];
  isVegMeal: boolean;
}

export function categorize(menuString: string): CategorizedMenu {
  const items = parseMenu(menuString);
  const result: CategorizedMenu = { vegs: [], extras: [], isVegMeal: true };

  for (const item of items) {
    switch (item.category) {
      case 'grain':
        if (!result.grain) result.grain = item;
        break;
      case 'dal':
        if (!result.dal) result.dal = item;
        break;
      case 'protein':
        if (!result.protein) result.protein = item;
        if (!item.isVeg) result.isVegMeal = false;
        break;
      case 'veg':
        result.vegs.push(item);
        break;
      case 'extra':
        result.extras.push(item);
        break;
    }
  }
  return result;
}

export function getProteins(): FoodItem[] {
  return FOOD_TAXONOMY.filter(i => i.category === 'protein');
}

export function getDals(): FoodItem[] {
  return FOOD_TAXONOMY.filter(i => i.category === 'dal');
}

export function getVegs(): FoodItem[] {
  return FOOD_TAXONOMY.filter(i => i.category === 'veg' && i.groceryUnit !== 'pantry');
}

export function getExtras(): FoodItem[] {
  return FOOD_TAXONOMY.filter(i => i.category === 'extra');
}

export function getByCanonical(canonical: string): FoodItem | null {
  const lower = canonical.toLowerCase().trim();
  return FOOD_TAXONOMY.find(i => i.canonical === lower) ?? null;
}
