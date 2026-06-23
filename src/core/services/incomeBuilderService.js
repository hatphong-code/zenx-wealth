import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore/lite';
import { db } from './firebaseDb';
import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { getUserProfile } from './userService';

const INCOME_CACHE_TTL_MS = 60 * 1000;

export const incomeTypes = [
  { value: 'Main Job',          label: 'Lương chính' },
  { value: 'Consulting',        label: 'Tư vấn' },
  { value: 'Freelance',         label: 'Freelance' },
  { value: 'Trading',           label: 'Giao dịch / Trading' },
  { value: 'Business',          label: 'Kinh doanh' },
  { value: 'Digital Product',   label: 'Sản phẩm số' },
  { value: 'Investment Income', label: 'Thu nhập đầu tư' },
  { value: 'Other',             label: 'Khác' },
];

export const incomeStages = [
  { value: 'Idea',         label: 'Ý tưởng' },
  { value: 'Validation',   label: 'Đang kiểm chứng' },
  { value: 'First Client', label: 'Có khách đầu tiên' },
  { value: 'Repeatable',   label: 'Lặp lại được' },
  { value: 'Systemized',   label: 'Đã hệ thống hóa' },
  { value: 'Scaled',       label: 'Đang mở rộng' },
];

function getIncomeCacheKey(userId) {
  return `income-builder:${userId}`;
}

function summarizeIncome(records) {
  const currentMonthlyIncome = records.reduce((sum, item) => sum + Number(item.currentMonthlyIncome || 0), 0);
  const targetMonthlyIncome = records.reduce((sum, item) => sum + Number(item.targetMonthlyIncome || 0), 0);
  const gap = Math.max(0, targetMonthlyIncome - currentMonthlyIncome);

  return {
    currentMonthlyIncome,
    targetMonthlyIncome,
    gap,
    activeSources: records.length,
  };
}

async function fetchIncomeSources(userId) {
  const userProfile = await getUserProfile(userId);
  const snapshot = await getDocs(
    query(collection(db, 'users', userId, 'incomeSources'), orderBy('createdAt', 'desc'))
  );

  const records = snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));

  return {
    currency: userProfile.settings?.currency || 'VND',
    incomeSources: records,
    summary: summarizeIncome(records),
  };
}

export function getCachedIncomeSources(userId) {
  return getCachedValue(getIncomeCacheKey(userId), INCOME_CACHE_TTL_MS);
}

export function getIncomeSources(userId, { forceFresh = false } = {}) {
  return loadWithCache({
    key: getIncomeCacheKey(userId),
    maxAgeMs: INCOME_CACHE_TTL_MS,
    forceFresh,
    loader: () => fetchIncomeSources(userId),
  });
}

export function setIncomeSourceCache(userId, value) {
  setCachedValue(getIncomeCacheKey(userId), value);
}

export function invalidateIncomeSourceCache(userId) {
  removeCachedValue(getIncomeCacheKey(userId));
}

export async function createIncomeSource(userId, payload) {
  const sourcePayload = {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'users', userId, 'incomeSources'), sourcePayload);
  return {
    id: ref.id,
    ...sourcePayload,
  };
}

export async function updateIncomeSource(userId, sourceId, payload) {
  const sourcePayload = {
    ...payload,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, 'users', userId, 'incomeSources', sourceId), sourcePayload);
  return {
    id: sourceId,
    ...sourcePayload,
  };
}

export async function removeIncomeSource(userId, sourceId) {
  await deleteDoc(doc(db, 'users', userId, 'incomeSources', sourceId));
}

export function recomputeIncomeSourceState(currentState, updater) {
  const incomeSources = updater(currentState.incomeSources);
  return {
    ...currentState,
    incomeSources,
    summary: summarizeIncome(incomeSources),
  };
}
