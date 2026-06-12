import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore/lite';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import { db } from './firebaseDb';
import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { getUserProfile } from './userService';
import { calculateWeeklyMetrics } from './financialCalculations';

export function getCurrentWeekMeta(now = new Date()) {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekKey = format(weekStart, 'yyyy-MM-dd');
  return { weekStart, weekEnd, weekKey };
}

const WEEKLY_CACHE_TTL_MS = 60 * 1000;
const WEEKLY_SNAPSHOT_ID = 'weekly-current';

function getWeeklyReviewCacheKey(userId, weekKey) {
  return `weekly-review:${userId}:${weekKey}`;
}

function getWeeklySnapshotRef(userId) {
  return doc(db, 'users', userId, 'snapshots', WEEKLY_SNAPSHOT_ID);
}

export function normalizeWeeklyReview(data = {}, fallbackWeekMeta) {
  return {
    weekMeta: data.weekMeta || fallbackWeekMeta,
    review: {
      currency: data.review?.currency || 'VND',
      income: data.review?.income || 0,
      expense: data.review?.expense || 0,
      latteFactorTotal: data.review?.latteFactorTotal || 0,
      savingsRate: data.review?.savingsRate || 0,
      emergencyFundMonths: data.review?.emergencyFundMonths || 0,
      wealthDisciplineScore: data.review?.wealthDisciplineScore || 0,
      topLatteCategory: data.review?.topLatteCategory || '',
    },
    form: {
      oneLesson: data.form?.oneLesson || '',
      oneActionNextWeek: data.form?.oneActionNextWeek || '',
    },
  };
}

async function computeWeeklyReview(userId, weekMeta) {
  const userProfile = await getUserProfile(userId);
  const currency = userProfile.settings?.currency || 'VND';
  const monthlyEssentialExpense = userProfile.settings?.monthlyEssentialExpense || 15000000;

  const transactionsQuery = query(
    collection(db, 'users', userId, 'transactions'),
    where('date', '>=', Timestamp.fromDate(weekMeta.weekStart)),
    where('date', '<=', Timestamp.fromDate(weekMeta.weekEnd))
  );

  const [transactionSnapshot, emergencySnapshot, existingReview] = await Promise.all([
    getDocs(transactionsQuery),
    getDocs(collection(db, 'users', userId, 'emergencyFund')),
    getDoc(doc(db, 'users', userId, 'weeklyReviews', weekMeta.weekKey)),
  ]);

  const transactions = transactionSnapshot.docs.map((entry) => entry.data());
  const emergencyRecords = emergencySnapshot.docs.map((entry) => entry.data());
  const existingData = existingReview.data() || {};

  return {
    weekMeta,
    review: calculateWeeklyMetrics({
      transactions,
      emergencyRecords,
      currency,
      monthlyEssentialExpense,
    }),
    form: {
      oneLesson: existingData.oneLesson || '',
      oneActionNextWeek: existingData.oneActionNextWeek || '',
    },
  };
}

async function persistWeeklySnapshot(userId, value) {
  await setDoc(getWeeklySnapshotRef(userId), {
    ...value,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export function getCachedWeeklyReview(userId, weekKey) {
  return getCachedValue(getWeeklyReviewCacheKey(userId, weekKey), WEEKLY_CACHE_TTL_MS);
}

export function getWeeklyReview(userId, weekMeta, { forceFresh = false } = {}) {
  return loadWithCache({
    key: getWeeklyReviewCacheKey(userId, weekMeta.weekKey),
    maxAgeMs: WEEKLY_CACHE_TTL_MS,
    forceFresh,
    loader: async () => {
      const snapshot = await getDoc(getWeeklySnapshotRef(userId));
      if (snapshot.exists()) {
        return normalizeWeeklyReview(snapshot.data(), weekMeta);
      }

      const computed = await computeWeeklyReview(userId, weekMeta);
      await persistWeeklySnapshot(userId, computed);
      return computed;
    },
  });
}

export function setWeeklyReviewCache(userId, weekKey, value) {
  setCachedValue(getWeeklyReviewCacheKey(userId, weekKey), value);
}

export function invalidateWeeklyReviewCache(userId, weekKey) {
  removeCachedValue(getWeeklyReviewCacheKey(userId, weekKey));
}

export async function refreshWeeklyReviewSnapshot(userId, weekMeta = getCurrentWeekMeta()) {
  const value = await computeWeeklyReview(userId, weekMeta);
  await persistWeeklySnapshot(userId, value);
  setWeeklyReviewCache(userId, weekMeta.weekKey, value);
  return value;
}
