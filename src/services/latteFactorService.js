import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, Timestamp, where } from 'firebase/firestore/lite';
import { db } from './firebaseDb';
import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { getUserProfile } from './userService';
import { calculateLatteMetrics, normalizeLatteTopCategories } from './financialCalculations';

const LATTE_CACHE_TTL_MS = 60 * 1000;
const LATTE_SNAPSHOT_ID = 'latte-current';

function getLatteCacheKey(userId) {
  return `latte-factor:${userId}`;
}

function getLatteSnapshotRef(userId) {
  return doc(db, 'users', userId, 'snapshots', LATTE_SNAPSHOT_ID);
}

function normalizeLatteFactor(data = {}) {
  return {
    currency: data.currency || 'VND',
    total: data.total || 0,
    annualImpact: data.annualImpact || 0,
    topCategories: normalizeLatteTopCategories(data.topCategories),
  };
}

async function computeLatteFactor(userId) {
  const userProfile = await getUserProfile(userId);
  const currency = userProfile.settings?.currency || 'VND';
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const transactionsQuery = query(
    collection(db, 'users', userId, 'transactions'),
    where('date', '>=', Timestamp.fromDate(startOfMonth))
  );

  const snapshot = await getDocs(transactionsQuery);
  const transactions = snapshot.docs.map((entry) => entry.data());
  return calculateLatteMetrics({ transactions, currency });
}

async function persistLatteSnapshot(userId, value) {
  await setDoc(getLatteSnapshotRef(userId), {
    ...value,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

async function fetchLatteFactor(userId) {
  const snapshot = await getDoc(getLatteSnapshotRef(userId));
  if (snapshot.exists()) {
    return normalizeLatteFactor(snapshot.data());
  }

  const computed = await computeLatteFactor(userId);
  await persistLatteSnapshot(userId, computed);
  return computed;
}

export function getCachedLatteFactor(userId) {
  return getCachedValue(getLatteCacheKey(userId), LATTE_CACHE_TTL_MS);
}

export function getLatteFactor(userId, { forceFresh = false } = {}) {
  return loadWithCache({
    key: getLatteCacheKey(userId),
    maxAgeMs: LATTE_CACHE_TTL_MS,
    forceFresh,
    loader: () => fetchLatteFactor(userId),
  });
}

export function setLatteFactorCache(userId, value) {
  setCachedValue(getLatteCacheKey(userId), value);
}

export function invalidateLatteFactorCache(userId) {
  removeCachedValue(getLatteCacheKey(userId));
}

export async function refreshLatteFactorSnapshot(userId) {
  const value = await computeLatteFactor(userId);
  await persistLatteSnapshot(userId, value);
  setLatteFactorCache(userId, value);
  return value;
}
