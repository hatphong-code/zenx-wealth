import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { getCachedDashboardStats, getDashboardStats, invalidateDashboardStatsCache } from './dashboardService';
import { getUserProfile, setUserProfileCache } from './userService';
import { getEmergencyFund } from './emergencyFundService';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { db } from './firebaseDb';

const PYF_CACHE_TTL_MS = 60 * 1000;

export const defaultAllocationRule = {
  living: 55,
  emergencyFund: 15,
  longTermAsset: 15,
  businessLearning: 10,
  highRiskTrading: 5,
};

function getPayYourselfFirstCacheKey(userId) {
  return `pay-yourself-first:${userId}`;
}

function normalizeAllocationRule(rule = {}) {
  return {
    living: Number(rule.living ?? defaultAllocationRule.living),
    emergencyFund: Number(rule.emergencyFund ?? defaultAllocationRule.emergencyFund),
    longTermAsset: Number(rule.longTermAsset ?? defaultAllocationRule.longTermAsset),
    businessLearning: Number(rule.businessLearning ?? defaultAllocationRule.businessLearning),
    highRiskTrading: Number(rule.highRiskTrading ?? defaultAllocationRule.highRiskTrading),
  };
}

function buildAllocations(totalIncome, allocationRule, bucketActuals = {}) {
  return Object.entries(allocationRule).map(([key, percentage]) => ({
    key,
    percentage,
    amount: (totalIncome * percentage) / 100,
    actual: Number(bucketActuals[key] || 0),
  }));
}

async function fetchPayYourselfFirst(userId) {
  const [profile, dashboard, efData] = await Promise.all([
    getUserProfile(userId),
    getDashboardStats(userId),
    getEmergencyFund(userId),
  ]);

  const allocationRule = normalizeAllocationRule(profile.settings?.allocationRule);
  const payYourselfFirstRate = 1 - allocationRule.living / 100;
  const totalIncome = payYourselfFirstRate > 0
    ? Number(dashboard.payYourselfTarget || 0) / payYourselfFirstRate
    : 0;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const efActualThisMonth = (efData.records || [])
    .filter(r => {
      const d = r.date?.toDate ? r.date.toDate() : new Date(r.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const bucketActuals = {
    ...dashboard.bucketActuals,
    emergencyFund: efActualThisMonth,
  };

  const done = Number(dashboard.payYourselfSaved || 0);
  const required = Number(dashboard.payYourselfTarget || 0);

  return {
    currency: dashboard.currency || profile.settings?.currency || 'VND',
    allocationRule,
    totalIncome,
    allocations: buildAllocations(totalIncome, allocationRule, bucketActuals),
    status: {
      required,
      done,
      remaining: Math.max(0, required - done),
      progress: required > 0 ? Math.max(0, Math.min(100, Math.round((done / required) * 100))) : 0,
    },
    efActualThisMonth,
  };
}

export function getCachedPayYourselfFirst(userId) {
  return getCachedValue(getPayYourselfFirstCacheKey(userId), PYF_CACHE_TTL_MS);
}

export function getPayYourselfFirst(userId, { forceFresh = false } = {}) {
  return loadWithCache({
    key: getPayYourselfFirstCacheKey(userId),
    maxAgeMs: PYF_CACHE_TTL_MS,
    forceFresh,
    loader: () => fetchPayYourselfFirst(userId),
  });
}

export function setPayYourselfFirstCache(userId, value) {
  setCachedValue(getPayYourselfFirstCacheKey(userId), value);
}

export function invalidatePayYourselfFirstCache(userId) {
  removeCachedValue(getPayYourselfFirstCacheKey(userId));
}

export async function saveAllocationRule(userId, profile, allocationRule) {
  const normalized = normalizeAllocationRule(allocationRule);
  const payYourselfFirstRate = 1 - normalized.living / 100;

  const nextProfile = {
    ...profile,
    settings: {
      ...(profile.settings || {}),
      allocationRule: normalized,
      payYourselfFirstRate,
    },
  };

  await setDoc(doc(db, 'users', userId), {
    updatedAt: serverTimestamp(),
    settings: {
      ...(profile.settings || {}),
      allocationRule: normalized,
      payYourselfFirstRate,
    },
  }, { merge: true });

  setUserProfileCache(userId, nextProfile);
  invalidateDashboardStatsCache(userId);
  const dashboard = getCachedDashboardStats(userId) || await getDashboardStats(userId);
  const previousRule = normalizeAllocationRule(profile.settings?.allocationRule);
  const previousPayYourselfFirstRate = 1 - previousRule.living / 100;
  const totalIncome = previousPayYourselfFirstRate > 0
    ? Number(dashboard.payYourselfTarget || 0) / previousPayYourselfFirstRate
    : 0;
  const required = totalIncome * payYourselfFirstRate;
  const nextData = {
    currency: dashboard.currency || profile.settings?.currency || 'VND',
    allocationRule: normalized,
    totalIncome,
    allocations: buildAllocations(totalIncome, normalized, dashboard.bucketActuals),
    status: {
      required,
      done: Number(dashboard.payYourselfSaved || 0),
      remaining: Math.max(0, required - Number(dashboard.payYourselfSaved || 0)),
      progress: required > 0
        ? Math.max(0, Math.min(100, Math.round((Number(dashboard.payYourselfSaved || 0) / required) * 100)))
        : 0,
    },
  };
  setPayYourselfFirstCache(userId, nextData);
  return nextData;
}
