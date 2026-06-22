export const LATTE_ITEMS = [
  { id: 'coffee', icon: '☕', labelKey: 'latteCoffee', vnd: 25000, usd: 2 },
  { id: 'bubbleTea', icon: '🧋', labelKey: 'latteBubbleTea', vnd: 35000, usd: 3 },
  { id: 'eatingOut', icon: '🍔', labelKey: 'latteEatingOut', vnd: 50000, usd: 5 },
  { id: 'subscription', icon: '📺', labelKey: 'latteSubscription', vnd: 10000, usd: 1 },
  { id: 'shopping', icon: '🛍️', labelKey: 'latteShopping', vnd: 30000, usd: 2 },
];

export const AGE_BRACKETS = ['<22', '22-29', '30-44', '45+'];

// late_starter maps to 45+ per product decision — "Về đích muộn" philosophy
const AGE_RANGE_TO_TEMPLATE = {
  '<22': 'student',
  '22-29': 'young_pro',
  '30-44': 'family',
  '45+': 'late_starter',
};

export function recommendTemplateIdByAgeRange(ageRange) {
  return AGE_RANGE_TO_TEMPLATE[ageRange] || 'young_pro';
}
