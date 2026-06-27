import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore/lite';
import { db } from './firebaseDb';
import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { getUserProfile } from './userService';
import { getReports } from './reportsService';

const GOAL_CACHE_TTL_MS = 60 * 60 * 1000;
const GOAL_CHECK_INTERVAL_MONTHS = 3;

function getGoalCacheKey(userId) {
  return `goal-tracking:${userId}`;
}

// Parse a decimal/integer token that may use either "," or "." as decimal/thousand sep
function parseViNum(str) {
  const s = str.trim();
  const dots = (s.match(/\./g) || []).length;
  const commas = (s.match(/,/g) || []).length;
  // Multiple separators → all are thousand separators → strip them
  if (dots > 1 || commas > 1) return parseInt(s.replace(/[.,]/g, ''), 10);
  // Single separator
  if (dots === 1 || commas === 1) {
    const parts = s.split(/[.,]/);
    // "1.000" or "1,000" → thousand separator (3 digits after)
    if (parts[1]?.length === 3) return parseInt(s.replace(/[.,]/g, ''), 10);
    // "1.5" or "1,5" → decimal
    return parseFloat(s.replace(',', '.'));
  }
  return parseFloat(s);
}

function parseGoalAmount(text) {
  if (!text?.trim()) return 0;
  const s = text.toLowerCase();

  // "X tỷ rưỡi" → X * 1B + 500M
  const rưỡiMatch = s.match(/(\d[\d.,]*)\s*(?:tỷ|ty)\s+rưỡi/);
  if (rưỡiMatch) return parseViNum(rưỡiMatch[1]) * 1_000_000_000 + 500_000_000;
  // bare "tỷ rưỡi" → 1.5B
  if (/\btỷ rưỡi\b|\bty rưỡi\b/.test(s)) return 1_500_000_000;

  // Priority order: largest unit first so "1.5 tỷ" beats "5 triệu" if both present
  // Note: \b doesn't work after Vietnamese chars (non-ASCII), so use lookahead instead
  const UNITS = [
    { re: /(\d[\d.,]*)\s*(?:tỷ|ty|billion|b)(?=[^a-z]|$)/i, mult: 1_000_000_000 },
    { re: /(\d[\d.,]*)\s*(?:triệu|trieu|tr|million)(?=[^a-z]|$)/i, mult: 1_000_000 },
    { re: /(\d[\d.,]*)\s*(?:nghìn|nghin|k)(?=[^a-z\d]|$)/i, mult: 1_000 },
  ];
  for (const { re, mult } of UNITS) {
    const m = s.match(re);
    if (m) {
      const n = parseViNum(m[1]);
      if (n > 0) return n * mult;
    }
  }

  // Raw number with thousand separators: "500.000.000" or "500,000,000"
  const rawMatch = s.match(/(\d{1,3}(?:[.,]\d{3}){2,})/);
  if (rawMatch) {
    const n = parseInt(rawMatch[1].replace(/[.,]/g, ''), 10);
    if (n > 0) return n;
  }

  // Dollar / USD amount: "$50,000" or "50,000 usd"
  const usdMatch = s.match(/\$\s*(\d[\d.,]*)|(\d[\d.,]*)\s*(?:usd|\$)/);
  if (usdMatch) {
    const n = parseViNum(usdMatch[1] || usdMatch[2]);
    if (n > 0) return n; // keep as USD — caller interprets currency separately
  }

  // Last resort: bare large integer like "500000000"
  const bareMatch = s.match(/(\d{6,})/);
  if (bareMatch) return parseInt(bareMatch[1], 10);

  return 0;
}

function calculateGoalProgress(profile, reports) {
  const goal12MonthText = profile.goal12Month || '';
  if (!goal12MonthText.trim()) return null;

  const goalAmount = parseGoalAmount(goal12MonthText);
  if (goalAmount <= 0) return null;

  const netWorth = reports.balanceSheet.netWorth || 0;
  const currentMonthSavingsRate = reports.weekly.savingsRate || reports.monthlyClose.averageSavingsRate || 0;

  // Calculate weeks until end of year
  const now = new Date();
  const endOfYear = new Date(now.getFullYear(), 11, 31);
  const weeksLeft = Math.ceil((endOfYear - now) / (7 * 24 * 60 * 60 * 1000));
  const totalWeeksInYear = 52;
  const weeksPassed = Math.max(0, totalWeeksInYear - weeksLeft);

  // Average weekly savings needed
  const totalNeeded = Math.max(0, goalAmount - netWorth);
  const weeksRemaining = Math.max(1, weeksLeft);
  const weeklyTargetSavings = totalNeeded / weeksRemaining;

  // Current weekly savings (estimate from monthly rate)
  const estimatedMonthlyIncome = reports.growth.currentMonthlyIncome || 0;
  const estimatedWeeklySavings = (estimatedMonthlyIncome * currentMonthSavingsRate) / 4.33;

  // On-track assessment
  const isOnTrack = estimatedWeeklySavings >= weeklyTargetSavings * 0.9; // 90% threshold
  const progressPercent = Math.min(100, (netWorth / goalAmount) * 100);

  return {
    goalAmount,
    currentNetWorth: netWorth,
    progressPercent,
    weeksPassed,
    weeksLeft: Math.max(0, weeksLeft),
    weeklyTargetSavings,
    estimatedWeeklySavings,
    isOnTrack,
    goalText: goal12MonthText,
  };
}

function getGoalChecksRef(userId) {
  return collection(db, 'users', userId, 'goalChecks');
}

function monthsDiff(dateA, dateB) {
  return (dateA.getFullYear() - dateB.getFullYear()) * 12 + (dateA.getMonth() - dateB.getMonth());
}

async function getLatestGoalCheck(userId) {
  try {
    const q = query(getGoalChecksRef(userId), orderBy('checkedAt', 'desc'), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0].data();
    return { id: snap.docs[0].id, ...d, checkedAt: d.checkedAt?.toDate?.() || new Date(d.checkedAt) };
  } catch {
    return null;
  }
}

async function maybeCreateGoalCheck(userId, progress) {
  if (!progress) return null;
  const latest = await getLatestGoalCheck(userId);
  const now = new Date();
  if (latest && monthsDiff(now, latest.checkedAt) < GOAL_CHECK_INTERVAL_MONTHS) {
    return latest;
  }
  const record = {
    checkedAt: serverTimestamp(),
    goalAmount: progress.goalAmount,
    netWorth: progress.currentNetWorth,
    progressPercent: progress.progressPercent,
    isOnTrack: progress.isOnTrack,
    userAction: null,
  };
  const ref = await addDoc(getGoalChecksRef(userId), record).catch(() => null);
  return ref ? { id: ref.id, ...record, checkedAt: now } : latest;
}

async function fetchGoalTracking(userId) {
  const [profile, reports] = await Promise.all([
    getUserProfile(userId),
    getReports(userId),
  ]);

  const progress = calculateGoalProgress(profile, reports);
  const latestCheck = await maybeCreateGoalCheck(userId, progress);

  return {
    profile,
    progress,
    latestCheck,
    lastUpdated: new Date().toISOString(),
  };
}

export function getCachedGoalTracking(userId) {
  return getCachedValue(getGoalCacheKey(userId), GOAL_CACHE_TTL_MS);
}

export function getGoalTracking(userId, { forceFresh = false } = {}) {
  return loadWithCache({
    key: getGoalCacheKey(userId),
    maxAgeMs: GOAL_CACHE_TTL_MS,
    forceFresh,
    loader: () => fetchGoalTracking(userId),
  });
}

export function setGoalTrackingCache(userId, value) {
  setCachedValue(getGoalCacheKey(userId), value);
}

export function invalidateGoalTrackingCache(userId) {
  removeCachedValue(getGoalCacheKey(userId));
}

export async function saveGoalCheckAction(userId, checkId, userAction) {
  const { doc, setDoc } = await import('firebase/firestore/lite');
  const ref = doc(db, 'users', userId, 'goalChecks', checkId);
  await setDoc(ref, { userAction }, { merge: true });
}
