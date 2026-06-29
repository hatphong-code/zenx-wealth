import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore/lite';
import { db } from './firebaseDb';
import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { getUserProfile } from './userService';

const ASSETS_CACHE_TTL_MS = 60 * 1000;

export const accountTypes = [
  { value: 'Cash',        label: 'Tiền mặt' },
  { value: 'Savings',     label: 'Tiết kiệm' },
  { value: 'Brokerage',   label: 'Chứng khoán (Brokerage)' },
  { value: 'Retirement',  label: 'Hưu trí / Quỹ dài hạn' },
  { value: 'Crypto',      label: 'Crypto' },
  { value: 'Business',    label: 'Vốn kinh doanh' },
  { value: 'Real Estate', label: 'Bất động sản' },
  { value: 'Gold',        label: 'Vàng' },
  { value: 'Other',       label: 'Khác' },
];

export const accountPurposes = [
  { value: 'Daily',     label: 'Sinh hoạt ngày' },
  { value: 'Long-term', label: 'Dài hạn' },
  { value: 'Risk',      label: 'Rủi ro / Trading' },
  { value: 'Business',  label: 'Kinh doanh' },
];

function getAssetsCacheKey(userId) {
  return `assets:${userId}`;
}

function summarizeAccounts(accounts) {
  const totalAssets = accounts.reduce((sum, item) => sum + Number(item.balance || 0), 0);
  const liquidAssets = accounts
    .filter((item) => ['Cash', 'Savings'].includes(item.type) || item.purpose === 'Emergency')
    .reduce((sum, item) => sum + Number(item.balance || 0), 0);
  const longTermAssets = accounts
    .filter((item) => ['Brokerage', 'Retirement', 'Real Estate', 'Gold'].includes(item.type) || item.purpose === 'Long-term')
    .reduce((sum, item) => sum + Number(item.balance || 0), 0);
  const riskAssets = accounts
    .filter((item) => item.type === 'Crypto' || item.purpose === 'Risk')
    .reduce((sum, item) => sum + Number(item.balance || 0), 0);

  return {
    totalAssets,
    liquidAssets,
    longTermAssets,
    riskAssets,
  };
}

async function fetchAssets(userId) {
  const [userProfile, snapshot] = await Promise.all([
    getUserProfile(userId),
    getDocs(query(collection(db, 'users', userId, 'accounts'), orderBy('createdAt', 'desc'))),
  ]);

  const accounts = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

  return {
    currency: userProfile.settings?.currency || 'VND',
    accounts,
    summary: summarizeAccounts(accounts),
  };
}

export function getCachedAssets(userId) {
  return getCachedValue(getAssetsCacheKey(userId), ASSETS_CACHE_TTL_MS);
}

export function getAssets(userId, { forceFresh = false } = {}) {
  return loadWithCache({
    key: getAssetsCacheKey(userId),
    maxAgeMs: ASSETS_CACHE_TTL_MS,
    forceFresh,
    loader: () => fetchAssets(userId),
  });
}

export function setAssetsCache(userId, value) {
  setCachedValue(getAssetsCacheKey(userId), value);
}

export function invalidateAssetsCache(userId) {
  removeCachedValue(getAssetsCacheKey(userId));
}

export async function createAccount(userId, payload) {
  const accountPayload = {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'users', userId, 'accounts'), accountPayload);
  return {
    id: ref.id,
    ...accountPayload,
  };
}

export async function updateAccount(userId, accountId, payload) {
  const accountPayload = {
    ...payload,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, 'users', userId, 'accounts', accountId), accountPayload);
  return {
    id: accountId,
    ...accountPayload,
  };
}

export async function removeAccount(userId, accountId) {
  await deleteDoc(doc(db, 'users', userId, 'accounts', accountId));
}

export function recomputeAssetsState(currentState, updater) {
  const accounts = updater(currentState.accounts);
  return {
    ...currentState,
    accounts,
    summary: summarizeAccounts(accounts),
  };
}
