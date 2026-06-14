import { collection, getDocs, orderBy, query } from 'firebase/firestore/lite';
import { db } from './firebaseDb';
import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { getUserProfile } from './userService';
import { detectRecurringTransactions } from './recurringDetectionService';

const TRANSACTIONS_CACHE_TTL_MS = 60 * 1000;

function getTransactionsCacheKey(userId) {
  return `transactions:${userId}`;
}

async function fetchTransactions(userId) {
  const userProfile = await getUserProfile(userId);
  const snapshot = await getDocs(
    query(collection(db, 'users', userId, 'transactions'), orderBy('date', 'desc'))
  );

  const txs = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  const withRecurring = detectRecurringTransactions(txs);

  return {
    currency: userProfile.settings?.currency || 'VND',
    transactions: withRecurring,
  };
}

export function getCachedTransactions(userId) {
  return getCachedValue(getTransactionsCacheKey(userId), TRANSACTIONS_CACHE_TTL_MS);
}

export function getTransactions(userId, { forceFresh = false } = {}) {
  return loadWithCache({
    key: getTransactionsCacheKey(userId),
    maxAgeMs: TRANSACTIONS_CACHE_TTL_MS,
    forceFresh,
    loader: () => fetchTransactions(userId),
  });
}

export function setTransactionsCache(userId, value) {
  setCachedValue(getTransactionsCacheKey(userId), value);
}

export function invalidateTransactionsCache(userId) {
  removeCachedValue(getTransactionsCacheKey(userId));
}
