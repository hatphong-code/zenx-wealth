export const LATTE_ITEMS = [
  { id: 'coffee', icon: '☕', labelKey: 'latteCoffee', vnd: 25000, usd: 2 },
  { id: 'bubbleTea', icon: '🧋', labelKey: 'latteBubbleTea', vnd: 35000, usd: 3 },
  { id: 'eatingOut', icon: '🍔', labelKey: 'latteEatingOut', vnd: 50000, usd: 5 },
  { id: 'subscription', icon: '📺', labelKey: 'latteSubscription', vnd: 10000, usd: 1 },
  { id: 'shopping', icon: '🛍️', labelKey: 'latteShopping', vnd: 30000, usd: 2 },
];

export const AGE_BRACKETS = ['<22', '22-29', '30-44', '45+'];

export const AGE_RANGE_MIDPOINT = {
  '<22': 19,
  '22-29': 25,
  '30-44': 37,
  '45+': 50,
};

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

export function calculateExactAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function deriveAgeRangeFromDOB(dob) {
  const age = calculateExactAge(dob);
  if (age === null) return null;
  if (age < 22) return '<22';
  if (age < 30) return '22-29';
  if (age < 45) return '30-44';
  return '45+';
}
