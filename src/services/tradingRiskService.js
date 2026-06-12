import { addDoc, collection, doc, getDocs, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore/lite';
import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { db } from './firebaseDb';
import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { getUserProfile } from './userService';

const TRADING_RISK_CACHE_TTL_MS = 60 * 1000;

export const defaultTradingRiskConfig = {
  capital: 0,
  dailyLossLimitPct: 3,
  weeklyLossLimitPct: 8,
  monthlyLossLimitPct: 15,
  profitWithdrawalPct: 30,
};

function getTradingRiskCacheKey(userId) {
  return `trading-risk:${userId}`;
}

function getTradingRiskCollection(userId) {
  return collection(db, 'users', userId, 'tradingRisk');
}

function toDateValue(value) {
  if (!value) return null;
  return value?.toDate ? value.toDate() : new Date(value);
}

function sumPnlBetween(records, start, end) {
  return records.reduce((sum, item) => {
    if (item.recordType !== 'journal') return sum;
    const date = toDateValue(item.date);
    if (!date || date < start || date > end) return sum;
    return sum + Number(item.pnl || 0);
  }, 0);
}

function normalizeConfig(record = {}) {
  return {
    ...defaultTradingRiskConfig,
    ...record,
  };
}

function evaluateRiskStatus(value, capital, limitPct) {
  if (capital <= 0 || limitPct <= 0) {
    return { usedPct: 0, limitAmount: 0, status: 'No capital' };
  }

  const limitAmount = (capital * limitPct) / 100;
  const usedPct = value < 0 ? Math.abs(value) / limitAmount * 100 : 0;

  if (usedPct >= 100) return { usedPct, limitAmount, status: 'Stop' };
  if (usedPct >= 75) return { usedPct, limitAmount, status: 'Caution' };
  return { usedPct, limitAmount, status: 'Healthy' };
}

function summarizeTradingRisk(config, records) {
  const now = new Date();
  const todayPnl = sumPnlBetween(records, startOfDay(now), endOfDay(now));
  const weekPnl = sumPnlBetween(records, startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 }));
  const monthPnl = sumPnlBetween(records, startOfMonth(now), endOfMonth(now));
  const totalRealizedPnl = records.reduce((sum, item) => sum + Number(item.recordType === 'journal' ? item.pnl || 0 : 0), 0);

  return {
    todayPnl,
    weekPnl,
    monthPnl,
    totalRealizedPnl,
    daily: evaluateRiskStatus(todayPnl, config.capital, config.dailyLossLimitPct),
    weekly: evaluateRiskStatus(weekPnl, config.capital, config.weeklyLossLimitPct),
    monthly: evaluateRiskStatus(monthPnl, config.capital, config.monthlyLossLimitPct),
    suggestedWithdrawal: totalRealizedPnl > 0 ? (totalRealizedPnl * config.profitWithdrawalPct) / 100 : 0,
  };
}

async function fetchTradingRisk(userId) {
  const [userProfile, snapshot] = await Promise.all([
    getUserProfile(userId),
    getDocs(getTradingRiskCollection(userId)),
  ]);

  const records = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  const configRecord = records.find((item) => item.recordType === 'config');
  const journalRecords = records
    .filter((item) => item.recordType === 'journal')
    .sort((left, right) => {
      const leftTime = left.date?.toDate ? left.date.toDate().getTime() : 0;
      const rightTime = right.date?.toDate ? right.date.toDate().getTime() : 0;
      return rightTime - leftTime;
    });
  const config = normalizeConfig(configRecord);

  return {
    currency: userProfile.settings?.currency || 'VND',
    config,
    records: journalRecords,
    summary: summarizeTradingRisk(config, journalRecords),
  };
}

export function getCachedTradingRisk(userId) {
  return getCachedValue(getTradingRiskCacheKey(userId), TRADING_RISK_CACHE_TTL_MS);
}

export function getTradingRisk(userId, { forceFresh = false } = {}) {
  return loadWithCache({
    key: getTradingRiskCacheKey(userId),
    maxAgeMs: TRADING_RISK_CACHE_TTL_MS,
    forceFresh,
    loader: () => fetchTradingRisk(userId),
  });
}

export function setTradingRiskCache(userId, value) {
  setCachedValue(getTradingRiskCacheKey(userId), value);
}

export function invalidateTradingRiskCache(userId) {
  removeCachedValue(getTradingRiskCacheKey(userId));
}

export async function saveTradingRiskConfig(userId, config) {
  const nextConfig = normalizeConfig(config);
  await setDoc(doc(db, 'users', userId, 'tradingRisk', 'config'), {
    ...nextConfig,
    recordType: 'config',
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return nextConfig;
}

export async function createTradingJournalEntry(userId, payload) {
  const entryPayload = {
    ...payload,
    recordType: 'journal',
    date: payload.date instanceof Timestamp ? payload.date : Timestamp.fromDate(payload.date),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(getTradingRiskCollection(userId), entryPayload);
  return { id: ref.id, ...entryPayload };
}

export function recomputeTradingRiskState(currentState, nextConfig, nextRecords) {
  return {
    ...currentState,
    config: normalizeConfig(nextConfig),
    records: nextRecords,
    summary: summarizeTradingRisk(normalizeConfig(nextConfig), nextRecords),
  };
}
