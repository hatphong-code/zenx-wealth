import { mergeTransactionCategories } from '../data/categories';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { db } from './firebaseDb';
import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';

const USER_CACHE_TTL_MS = 5 * 60 * 1000;

function notifyUserProfileChanged(userId) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('zenx:user-profile-changed', { detail: { userId } }));
}

const defaultSettings = {
  currency: 'VND',
  monthlyEssentialExpense: 15000000,
  emergencyFundTargetMonths: 6,
  payYourselfFirstRate: 0.3,
  allocationRule: {
    living: 55,
    emergencyFund: 15,
    longTermAsset: 15,
    businessLearning: 10,
    highRiskTrading: 5,
  },
  customCategories: {
    income: [],
    expense: [],
  },
  notificationPrefs: {
    weeklyReview: true,
    transactionLog: false,
    milestones: true,
    monthlyLetter: true,
  },
};

function mergeSettings(settings = {}) {
  const customCategoriesRaw = {
    income: [...(settings.customCategories?.income || [])],
    expense: [...(settings.customCategories?.expense || [])],
  };

  return {
    ...defaultSettings,
    ...settings,
    allocationRule: {
      ...defaultSettings.allocationRule,
      ...(settings.allocationRule || {}),
    },
    notificationPrefs: {
      ...defaultSettings.notificationPrefs,
      ...(settings.notificationPrefs || {}),
    },
    customCategories: mergeTransactionCategories(customCategoriesRaw),
    customCategoriesRaw,
  };
}

function getUserCacheKey(userId) {
  return `user-profile:${userId}`;
}

async function fetchUserProfile(userId) {
  const snapshot = await getDoc(doc(db, 'users', userId));
  const userData = snapshot.data() || {};

  return {
    ...userData,
    subscriptionTier: userData.subscriptionTier || 'free',
    settings: mergeSettings(userData.settings || {}),
  };
}

export function getCachedUserProfile(userId) {
  return getCachedValue(getUserCacheKey(userId), USER_CACHE_TTL_MS);
}

export function getUserProfile(userId, { forceFresh = false } = {}) {
  return loadWithCache({
    key: getUserCacheKey(userId),
    maxAgeMs: USER_CACHE_TTL_MS,
    forceFresh,
    loader: () => fetchUserProfile(userId),
  });
}

export function setUserProfileCache(userId, value) {
  setCachedValue(getUserCacheKey(userId), {
    ...value,
    subscriptionTier: value.subscriptionTier || 'free',
    settings: mergeSettings(value.settings || {}),
  });
  notifyUserProfileChanged(userId);
}

export function invalidateUserProfileCache(userId) {
  removeCachedValue(getUserCacheKey(userId));
}

// Write operations
export async function updateUserSettings(userId, settings) {
  await setDoc(
    doc(db, 'users', userId),
    { settings, updatedAt: serverTimestamp() },
    { merge: true }
  );
  invalidateUserProfileCache(userId);
}

export async function updateTheme(userId, theme) {
  await setDoc(
    doc(db, 'users', userId),
    { 'settings.theme': theme, updatedAt: serverTimestamp() },
    { merge: true }
  );
  invalidateUserProfileCache(userId);
}

export async function updateLocale(userId, locale) {
  await setDoc(
    doc(db, 'users', userId),
    { 'settings.locale': locale, updatedAt: serverTimestamp() },
    { merge: true }
  );
  invalidateUserProfileCache(userId);
}
