import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import {
  defaultFeatureAccess,
  featureCatalogByKey,
  isAdminEmail,
  SUBSCRIPTION_TIERS,
} from '../data/accessControl';
import { db } from './firebaseDb';
import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { setUserProfileCache } from './userService';

const ACCESS_CONTROL_CACHE_KEY = 'access-control:global';
const ACCESS_CONTROL_TTL_MS = 5 * 60 * 1000;
const ACCESS_CONTROL_DOC_ID = 'access-control';

function notifyAccessControlChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('zenx:access-control-changed'));
}

function getAccessControlRef() {
  return doc(db, 'appConfig', ACCESS_CONTROL_DOC_ID);
}

function normalizeTierValue(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

export function normalizeFeatureAccess(features = {}) {
  return Object.fromEntries(
    Object.entries(defaultFeatureAccess).map(([featureKey, defaults]) => [
      featureKey,
      {
        free: normalizeTierValue(features[featureKey]?.free, defaults.free),
        premium: normalizeTierValue(features[featureKey]?.premium, defaults.premium),
      },
    ])
  );
}

export function normalizeAccessControl(data = {}) {
  const normalizedData = data || {};
  return {
    features: normalizeFeatureAccess(normalizedData.features || {}),
    updatedAt: normalizedData.updatedAt || null,
  };
}

async function fetchAccessControl() {
  const snapshot = await getDoc(getAccessControlRef());
  if (!snapshot.exists()) {
    return normalizeAccessControl();
  }

  return normalizeAccessControl(snapshot.data());
}

export function getCachedAccessControl() {
  return getCachedValue(ACCESS_CONTROL_CACHE_KEY, ACCESS_CONTROL_TTL_MS);
}

export function getAccessControl({ forceFresh = false } = {}) {
  return loadWithCache({
    key: ACCESS_CONTROL_CACHE_KEY,
    maxAgeMs: ACCESS_CONTROL_TTL_MS,
    forceFresh,
    loader: fetchAccessControl,
  });
}

export function setAccessControlCache(value) {
  setCachedValue(ACCESS_CONTROL_CACHE_KEY, normalizeAccessControl(value));
  notifyAccessControlChanged();
}

export function invalidateAccessControlCache() {
  removeCachedValue(ACCESS_CONTROL_CACHE_KEY);
}

export async function saveAccessControl(nextValue) {
  const normalized = normalizeAccessControl(nextValue);
  await setDoc(getAccessControlRef(), {
    features: normalized.features,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  setAccessControlCache(normalized);
  return normalized;
}

export function normalizeSubscriptionTier(value) {
  return SUBSCRIPTION_TIERS.includes(value) ? value : 'free';
}

export function isAdminProfile(user, profile = {}) {
  return Boolean(profile.role === 'admin' || profile.isAdmin || isAdminEmail(user?.email || profile.email || ''));
}

export function isFeatureEnabled(featureKey, tier, accessControl) {
  const feature = featureCatalogByKey[featureKey];
  if (!feature) return false;
  if (feature.adminOnly) return false;

  const normalizedTier = normalizeSubscriptionTier(tier);
  const flags = normalizeAccessControl(accessControl).features[featureKey] || defaultFeatureAccess[featureKey];
  return Boolean(flags?.[normalizedTier]);
}

export async function saveUserSubscriptionTier(userId, profile, tier) {
  const normalizedTier = normalizeSubscriptionTier(tier);
  const nextProfile = {
    ...profile,
    subscriptionTier: normalizedTier,
  };

  await setDoc(doc(db, 'users', userId), {
    subscriptionTier: normalizedTier,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  setUserProfileCache(userId, nextProfile);
  return nextProfile;
}
