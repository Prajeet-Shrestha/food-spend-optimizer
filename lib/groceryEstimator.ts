import { FoodItem, GroceryItem } from '@/types';

const DISPLAY_NAMES: Record<string, string> = {
  chicken: 'Chicken',
  paneer: 'Paneer',
  egg: 'Eggs',
  mushroom: 'Mushroom',
  prawn: 'Prawns',
  alu: 'Potato',
  saag: 'Saag',
  cauli: 'Cauliflower',
  vindi: 'Okra (Bhindi)',
  kerau: 'Peas',
  tomato: 'Tomato',
  onion: 'Onion',
  rice: 'Rice',
  dal: 'Dal',
  kwati: 'Kwati',
  gedagudi: 'Gedagudi',
  achaar: 'Achaar',
  papad: 'Papad',
};

function displayName(item: FoodItem): string {
  if (DISPLAY_NAMES[item.canonical]) return DISPLAY_NAMES[item.canonical];
  return item.canonical.charAt(0).toUpperCase() + item.canonical.slice(1);
}

// Build a grocery list for a set of menu items, deduplicating by canonical name.
// Pantry items (rice, dal, achaar, etc.) are returned as `source: 'pantry'` so the UI
// can group/hide them from the staff shopping list.
export function buildGroceryList(items: FoodItem[]): GroceryItem[] {
  const seen = new Set<string>();
  const list: GroceryItem[] = [];

  for (const item of items) {
    if (seen.has(item.canonical)) continue;
    seen.add(item.canonical);

    list.push({
      name: displayName(item),
      qty: item.groceryUnit,
      estCost: item.estimatedCost,
      source: item.groceryUnit === 'pantry' ? 'pantry' : 'staff',
    });
  }

  return list;
}

// Sum of estimated grocery costs for items the staff actually has to buy.
// Pantry items (cost = 0 by design) don't add to this total.
export function estimateGroceryCost(items: FoodItem[]): number {
  return buildGroceryList(items)
    .filter(g => g.source === 'staff')
    .reduce((sum, g) => sum + g.estCost, 0);
}
