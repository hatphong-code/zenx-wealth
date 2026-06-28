export const LATTE_KEYWORDS = [
  'cà phê', 'coffee', 'trà sữa', 'bubble tea', 'cafe',
  'ăn ngoài', 'eat out', 'eating out', 'fast food', 'grab food', 'shopee food', 'baemin', 'giao đồ ăn',
  'subscription', 'netflix', 'spotify', 'youtube', 'apple', 'game',
  'mua sắm', 'shopping', 'tiện tay', 'impulse',
  'snack', 'đồ ăn vặt', 'trà', 'nước ngọt',
];

export function isLikelyLatte(text = '') {
  return LATTE_KEYWORDS.some(k => text.toLowerCase().includes(k));
}
