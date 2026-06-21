import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore/lite';
import { db } from './firebaseDb';
import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { getUserProfile } from './userService';

const EMERGENCY_CACHE_TTL_MS = 60 * 1000;

function getEmergencyCacheKey(userId) {
  return `emergency-fund:${userId}`;
}

async function fetchEmergencyFund(userId) {
  const userProfile = await getUserProfile(userId);
  const snapshot = await getDocs(
    query(collection(db, 'users', userId, 'emergencyFund'), orderBy('date', 'desc'))
  );

  return {
    settings: {
      currency: userProfile.settings?.currency || 'VND',
      monthlyEssentialExpense: userProfile.settings?.monthlyEssentialExpense || 15000000,
      emergencyFundTargetMonths: userProfile.settings?.emergencyFundTargetMonths || 6,
    },
    records: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
  };
}

export function getCachedEmergencyFund(userId) {
  return getCachedValue(getEmergencyCacheKey(userId), EMERGENCY_CACHE_TTL_MS);
}

export function getEmergencyFund(userId, { forceFresh = false } = {}) {
  return loadWithCache({
    key: getEmergencyCacheKey(userId),
    maxAgeMs: EMERGENCY_CACHE_TTL_MS,
    forceFresh,
    loader: () => fetchEmergencyFund(userId),
  });
}

export function setEmergencyFundCache(userId, value) {
  setCachedValue(getEmergencyCacheKey(userId), value);
}

export function invalidateEmergencyFundCache(userId) {
  removeCachedValue(getEmergencyCacheKey(userId));
}

// Write operations
export async function createEmergencyFundRecord(userId, data) {
  const docRef = await addDoc(
    collection(db, 'users', userId, 'emergencyFund'),
    {
      ...data,
      createdAt: serverTimestamp(),
    }
  );
  invalidateEmergencyFundCache(userId);
  return { id: docRef.id, ...data };
}
