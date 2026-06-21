import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore/lite';
import { db } from './firebaseDb';
import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { getUserProfile } from './userService';
import { detectRecurringTransactions } from './recurringDetectionService';
import { SyncQueue } from './syncQueue';

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
  // Check if online
  if (!navigator.onLine) {
    // Queue for later sync
    SyncQueue.addOperation({
      type: 'createTransaction',
      userId,
      data,
      timestamp: Date.now(),
    });
    // Return optimistic response
    return { id: `pending_${Date.now()}`, ...data };
  }

  try {
    const docRef = await addDoc(
      collection(db, 'users', userId, 'transactions'),
      {
        ...data,
        createdAt: serverTimestamp(),
      }
    );
    invalidateTransactionsCache(userId);
    return { id: docRef.id, ...data };
  } catch (err) {
    // If Firebase error is network-related, queue instead of throwing
    if (err?.code === 'unavailable' || err?.message?.includes('ERR_INTERNET_DISCONNECTED') || !navigator.onLine) {
      console.warn('Network error detected, queuing transaction');
      SyncQueue.addOperation({
        type: 'createTransaction',
        userId,
        data,
        timestamp: Date.now(),
      });
      return { id: `pending_${Date.now()}`, ...data };
    }
    throw err;
  }
}

export async function updateTransaction(userId, id, data) {
  // Check if online
  if (!navigator.onLine) {
    // Queue for later sync
    SyncQueue.addOperation({
      type: 'updateTransaction',
      userId,
      resourceId: id,
      data,
      timestamp: Date.now(),
    });
    return { id, ...data };
  }

  try {
    await updateDoc(
      doc(db, 'users', userId, 'transactions', id),
      data
    );
    invalidateTransactionsCache(userId);
    return { id, ...data };
  } catch (err) {
    // If Firebase error is network-related, queue instead of throwing
    if (err?.code === 'unavailable' || err?.message?.includes('ERR_INTERNET_DISCONNECTED') || !navigator.onLine) {
      console.warn('Network error detected, queuing transaction update');
      SyncQueue.addOperation({
        type: 'updateTransaction',
        userId,
        resourceId: id,
        data,
        timestamp: Date.now(),
      });
      return { id, ...data };
    }
    throw err;
  }
}

export async function deleteTransaction(userId, id) {
  // Check if online
  if (!navigator.onLine) {
    // Queue for later sync
    SyncQueue.addOperation({
      type: 'deleteTransaction',
      userId,
      resourceId: id,
      timestamp: Date.now(),
    });
    return;
  }

  try {
    await deleteDoc(doc(db, 'users', userId, 'transactions', id));
    invalidateTransactionsCache(userId);
  } catch (err) {
    // If Firebase error is network-related, queue instead of throwing
    if (err?.code === 'unavailable' || err?.message?.includes('ERR_INTERNET_DISCONNECTED') || !navigator.onLine) {
      console.warn('Network error detected, queuing transaction delete');
      SyncQueue.addOperation({
        type: 'deleteTransaction',
        userId,
        resourceId: id,
        timestamp: Date.now(),
      });
      return;
    }
    throw err;
  }
}
