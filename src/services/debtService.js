import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore/lite';
import { db } from './firebaseDb';
import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { getUserProfile } from './userService';

const DEBT_CACHE_TTL_MS = 60 * 1000;

export const debtTypes = [
  { value: 'Credit Card',    label: 'Thẻ tín dụng' },
  { value: 'Consumer Loan',  label: 'Vay tiêu dùng' },
  { value: 'Personal Loan',  label: 'Vay cá nhân' },
  { value: 'Business Loan',  label: 'Vay kinh doanh' },
  { value: 'Mortgage',       label: 'Vay mua nhà (Mortgage)' },
  { value: 'Asset Loan',     label: 'Vay mua tài sản' },
  { value: 'Other',          label: 'Khác' },
];

export const debtPriorities = [
  { value: 'High',   label: 'Cao' },
  { value: 'Medium', label: 'Trung bình' },
  { value: 'Low',    label: 'Thấp' },
];

function getDebtCacheKey(userId) {
  return `debts:${userId}`;
}

function classifyBadDebt(type) {
  return ['Credit Card', 'Consumer Loan', 'Personal Loan'].includes(type);
}

function summarizeDebts(records) {
  const totalDebt = records.reduce((sum, item) => sum + Number(item.remainingAmount || 0), 0);
  const totalOriginal = records.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
  const badDebt = records
    .filter((item) => item.isBadDebt)
    .reduce((sum, item) => sum + Number(item.remainingAmount || 0), 0);
  const monthlyPayment = records.reduce((sum, item) => sum + Number(item.minimumPayment || 0), 0);
  const paidAmount = Math.max(0, totalOriginal - totalDebt);
  const payoffProgress = totalOriginal > 0 ? Math.round((paidAmount / totalOriginal) * 100) : 0;
  const highestPriorityDebt = [...records]
    .filter((item) => Number(item.remainingAmount || 0) > 0)
    .sort((a, b) => {
      const priorityWeight = { High: 3, Medium: 2, Low: 1 };
      const diff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (diff !== 0) return diff;
      return Number(b.interestRate || 0) - Number(a.interestRate || 0);
    })[0] || null;

  return {
    totalDebt,
    badDebt,
    monthlyPayment,
    payoffProgress,
    highestPriorityDebt,
  };
}

async function fetchDebts(userId) {
  const userProfile = await getUserProfile(userId);
  const snapshot = await getDocs(
    query(collection(db, 'users', userId, 'debts'), orderBy('createdAt', 'desc'))
  );

  const records = snapshot.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      ...data,
      isBadDebt: typeof data.isBadDebt === 'boolean' ? data.isBadDebt : classifyBadDebt(data.debtType),
    };
  });

  return {
    currency: userProfile.settings?.currency || 'VND',
    debts: records,
    summary: summarizeDebts(records),
  };
}

export function getCachedDebts(userId) {
  return getCachedValue(getDebtCacheKey(userId), DEBT_CACHE_TTL_MS);
}

export function getDebts(userId, { forceFresh = false } = {}) {
  return loadWithCache({
    key: getDebtCacheKey(userId),
    maxAgeMs: DEBT_CACHE_TTL_MS,
    forceFresh,
    loader: () => fetchDebts(userId),
  });
}

export function setDebtCache(userId, value) {
  setCachedValue(getDebtCacheKey(userId), value);
}

export function invalidateDebtCache(userId) {
  removeCachedValue(getDebtCacheKey(userId));
}

export async function createDebt(userId, payload) {
  const debtPayload = {
    ...payload,
    isBadDebt: typeof payload.isBadDebt === 'boolean' ? payload.isBadDebt : classifyBadDebt(payload.debtType),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'users', userId, 'debts'), debtPayload);
  return {
    id: ref.id,
    ...debtPayload,
  };
}

export async function updateDebt(userId, debtId, payload) {
  const debtPayload = {
    ...payload,
    isBadDebt: typeof payload.isBadDebt === 'boolean' ? payload.isBadDebt : classifyBadDebt(payload.debtType),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, 'users', userId, 'debts', debtId), debtPayload);
  return {
    id: debtId,
    ...debtPayload,
  };
}

export async function removeDebt(userId, debtId) {
  await deleteDoc(doc(db, 'users', userId, 'debts', debtId));
}

export function recomputeDebtState(currentState, updater) {
  const debts = updater(currentState.debts);
  return {
    ...currentState,
    debts,
    summary: summarizeDebts(debts),
  };
}
