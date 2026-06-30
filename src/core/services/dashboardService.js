import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, Timestamp, where } from 'firebase/firestore/lite';
import { db } from './firebaseDb';
import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { getUserProfile } from './userService';
import { calculateDashboardMetrics } from './financialCalculations';

const DASHBOARD_CACHE_TTL_MS = 60 * 1000;
const DASHBOARD_SNAPSHOT_ID = 'dashboard';

function getDashboardCacheKey(userId) {
  return `dashboard-stats:${userId}`;
}

function getDashboardSnapshotRef(userId) {
  return doc(db, 'users', userId, 'snapshots', DASHBOARD_SNAPSHOT_ID);
}

export function normalizeDashboardStats(data = {}) {
  return {
    netCashFlow: data.netCashFlow || 0,
    income: data.income || 0,
    expense: data.expense || 0,
    latteFactor: data.latteFactor || 0,
    latteFactorPercent: data.latteFactorPercent || 0,
    emergencyMonths: data.emergencyMonths || 0,
    targetMonths: data.targetMonths || 6,
    payYourselfProgress: data.payYourselfProgress || 0,
    payYourselfSaved: data.payYourselfSaved || 0,
    payYourselfTarget: data.payYourselfTarget || 0,
    bucketActuals: data.bucketActuals
      ? { debtRepayment: 0, ...data.bucketActuals }
      : {
          emergencyFund: 0,
          longTermAsset: 0,
          businessLearning: 0,
          highRiskTrading: 0,
          debtRepayment: 0,
        },
    currency: data.currency || 'VND',
  };
}

async function computeDashboardStats(userId) {
  const userProfile = await getUserProfile(userId);
  const currency = userProfile.settings?.currency || 'VND';
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const transactionsQuery = query(
    collection(db, 'users', userId, 'transactions'),
    where('date', '>=', Timestamp.fromDate(startOfMonth))
  );

  const [transactionSnapshot, emergencySnapshot] = await Promise.all([
    getDocs(transactionsQuery),
    getDocs(collection(db, 'users', userId, 'emergencyFund')),
  ]);

  const transactions = transactionSnapshot.docs.map((entry) => entry.data());
  const emergencyRecords = emergencySnapshot.docs.map((entry) => entry.data());

  return calculateDashboardMetrics({
    transactions,
    emergencyRecords,
    currency,
    payYourselfRate: userProfile.settings?.payYourselfFirstRate || 0.3,
    monthlyEssentialExpense: userProfile.settings?.monthlyEssentialExpense || 15000000,
    emergencyFundTargetMonths: userProfile.settings?.emergencyFundTargetMonths || 6,
  });
}

async function persistDashboardSnapshot(userId, stats) {
  await setDoc(getDashboardSnapshotRef(userId), {
    ...stats,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

async function fetchDashboardStats(userId) {
  const snapshot = await getDoc(getDashboardSnapshotRef(userId));
  if (snapshot.exists()) {
    const data = snapshot.data();
    // Recompute if snapshot predates income/expense fields
    if (data.income === undefined || data.expense === undefined || data.bucketActuals === undefined) {
      const computedStats = await computeDashboardStats(userId);
      await persistDashboardSnapshot(userId, computedStats);
      return computedStats;
    }
    return normalizeDashboardStats(data);
  }

  const computedStats = await computeDashboardStats(userId);
  await persistDashboardSnapshot(userId, computedStats);
  return computedStats;
}

export function getCachedDashboardStats(userId) {
  return getCachedValue(getDashboardCacheKey(userId), DASHBOARD_CACHE_TTL_MS);
}

export function getDashboardStats(userId, { forceFresh = false } = {}) {
  return loadWithCache({
    key: getDashboardCacheKey(userId),
    maxAgeMs: DASHBOARD_CACHE_TTL_MS,
    forceFresh,
    loader: () => fetchDashboardStats(userId),
  });
}

export function setDashboardStatsCache(userId, value) {
  setCachedValue(getDashboardCacheKey(userId), value);
}

export function invalidateDashboardStatsCache(userId) {
  removeCachedValue(getDashboardCacheKey(userId));
}

export async function refreshDashboardSnapshot(userId) {
  const stats = await computeDashboardStats(userId);
  await persistDashboardSnapshot(userId, stats);
  setDashboardStatsCache(userId, stats);
  return stats;
}
