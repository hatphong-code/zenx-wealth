import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
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

function getWeeklyReviewCacheKey(userId, weekKey) {
  return `weekly-review:${userId}:${weekKey}`;
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

export function getCachedWeeklyReview(userId, weekKey) {
  return getCachedValue(getWeeklyReviewCacheKey(userId, weekKey), WEEKLY_CACHE_TTL_MS);
}

export function getWeeklyReview(userId, weekMeta, { forceFresh = false } = {}) {
  return loadWithCache({
    key: getWeeklyReviewCacheKey(userId, weekMeta.weekKey),
    maxAgeMs: WEEKLY_CACHE_TTL_MS,
    forceFresh,
    loader: () => computeWeeklyReview(userId, weekMeta),
  });
}

export function setWeeklyReviewCache(userId, weekKey, value) {
  setCachedValue(getWeeklyReviewCacheKey(userId, weekKey), value);
}

export function invalidateWeeklyReviewCache(userId, weekKey) {
  removeCachedValue(getWeeklyReviewCacheKey(userId, weekKey));
}

// Write operations
export async function saveWeeklyReview(userId, weekKey, data) {
  const weekMeta = { weekKey };
  await setDoc(
    doc(db, 'users', userId, 'weeklyReviews', weekKey),
    data,
    { merge: true }
  );
  invalidateWeeklyReviewCache(userId, weekKey);
  return data;
}
