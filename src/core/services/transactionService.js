import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore/lite';
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
  try {
    const docRef = await Promise.race([
      addDoc(
        collection(db, 'users', userId, 'transactions'),
        {
          ...data,
          createdAt: serverTimestamp(),
        }
      ),
      // Timeout after 2 seconds - if still pending, likely offline
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Network timeout')),
          2000
        )
      ),
    ]);
    console.log('[createTransaction] Success, saved to Firestore:', docRef.id);
    invalidateTransactionsCache(userId);
    return { id: docRef.id, ...data };
  } catch (err) {
    // ANY error → queue the operation
    console.log('[createTransaction] Caught error, queuing operation:', err?.message);
    const queuedId = `pending_${Date.now()}`;
    SyncQueue.addOperation({
      type: 'createTransaction',
      userId,
      data,
      timestamp: Date.now(),
    });
    console.log('[createTransaction] Operation queued with ID:', queuedId);
    console.log('[createTransaction] Queue length:', SyncQueue.getQueueLength());
    return { id: queuedId, ...data };
  }
}

export async function updateTransaction(userId, id, data) {
  try {
    await Promise.race([
      updateDoc(
        doc(db, 'users', userId, 'transactions', id),
        data
      ),
      // Timeout after 5 seconds - if still pending, likely offline
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Network timeout - likely offline')),
          5000
        )
      ),
    ]);
    invalidateTransactionsCache(userId);
    return { id, ...data };
  } catch (err) {
    // ANY error (network, timeout, etc) → queue the operation
    console.warn('[updateTransaction] Error detected, queuing:', err?.message || err);
    SyncQueue.addOperation({
      type: 'updateTransaction',
      userId,
      resourceId: id,
      data,
      timestamp: Date.now(),
    });
    return { id, ...data };
  }
}

export async function deleteTransaction(userId, id) {
  try {
    await Promise.race([
      deleteDoc(doc(db, 'users', userId, 'transactions', id)),
      // Timeout after 5 seconds - if still pending, likely offline
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Network timeout - likely offline')),
          5000
        )
      ),
    ]);
    invalidateTransactionsCache(userId);
  } catch (err) {
    // ANY error (network, timeout, etc) → queue the operation
    console.warn('[deleteTransaction] Error detected, queuing:', err?.message || err);
    SyncQueue.addOperation({
      type: 'deleteTransaction',
      userId,
      resourceId: id,
      timestamp: Date.now(),
    });
  }
}

export async function upsertSavingsTransferTx(userId, planId, monthKey, { amount, bucket, planName, currency = 'VND' }) {
  if (!amount || amount <= 0) return;
  const txId = `savings_${planId}_${monthKey}`;
  await setDoc(
    doc(db, 'users', userId, 'transactions', txId),
    {
      type: 'transfer',
      bucket: bucket || 'longTermAsset',
      amount: Number(amount),
      currency,
      date: Timestamp.fromDate(new Date(`${monthKey}-01T00:00:00`)),
      note: `${planName || 'Savings Plan'} — ${monthKey}`,
      category: 'Tích lũy / Đầu tư dài hạn',
      isLatteFactor: false,
      savingsPlanId: planId,
      savingsPlanMonthKey: monthKey,
      updatedAt: serverTimestamp(),
    },
    { merge: false }
  );
  invalidateTransactionsCache(userId);
}
