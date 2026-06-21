import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore/lite';
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

  // Persist newly auto-detected recurring flags (fire-and-forget, don't block return)
  const toUpdate = withRecurring.filter((tx, i) => tx.isRecurring === true && txs[i].isRecurring !== true);
  if (toUpdate.length > 0) {
    const batch = writeBatch(db);
    toUpdate.forEach(tx => {
      batch.update(doc(db, 'users', userId, 'transactions', tx.id), { isRecurring: true });
    });
    batch.commit().catch(err => console.warn('[recurring] Failed to persist flags:', err));
  }

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

// Lightweight date-filtered fetch — used by Reports compute fallback.
// Does NOT run recurring detection (not needed for trend calculations).
export async function getTransactionsSince(userId, sinceDate) {
  const snapshot = await getDocs(
    query(
      collection(db, 'users', userId, 'transactions'),
      where('date', '>=', Timestamp.fromDate(sinceDate)),
      orderBy('date', 'desc')
    )
  );
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getTransaction(userId, id) {
  const snapshot = await getDoc(doc(db, 'users', userId, 'transactions', id));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

// Write operations
export async function createTransaction(userId, data) {
  const docRef = await addDoc(
    collection(db, 'users', userId, 'transactions'),
    {
      ...data,
      createdAt: serverTimestamp(),
    }
  );
  invalidateTransactionsCache(userId);
  return { id: docRef.id, ...data };
}

export async function updateTransaction(userId, id, data) {
  await updateDoc(
    doc(db, 'users', userId, 'transactions', id),
    data
  );
  invalidateTransactionsCache(userId);
  return { id, ...data };
}

export async function deleteTransaction(userId, id) {
  await deleteDoc(doc(db, 'users', userId, 'transactions', id));
  invalidateTransactionsCache(userId);
}
