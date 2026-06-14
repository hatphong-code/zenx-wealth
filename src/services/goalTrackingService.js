import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { getUserProfile } from './userService';
import { getReports } from './reportsService';

const GOAL_CACHE_TTL_MS = 60 * 60 * 1000;

function getGoalCacheKey(userId) {
  return `goal-tracking:${userId}`;
}

function calculateGoalProgress(profile, reports) {
  const goal12MonthText = profile.goal12Month || '';
  if (!goal12MonthText.trim()) {
    return null;
  }

  const netWorth = reports.balanceSheet.netWorth || 0;
  const currentMonthSavingsRate = reports.weekly.savingsRate || reports.monthlyClose.averageSavingsRate || 0;
  const averageSavingsRate = reports.monthlyClose.averageSavingsRate || 0;

  // Simple extraction: if goal mentions a number, try to parse it
  // E.g., "Tiết kiệm 100 triệu" → try to find "100 triệu"
  const numberMatch = goal12MonthText.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr|million|m)?/i);
  let goalAmount = 0;

  if (numberMatch) {
    const numStr = numberMatch[1].replace(',', '.');
    const baseAmount = parseFloat(numStr);
    if (goal12MonthText.toLowerCase().includes('triệu') || goal12MonthText.toLowerCase().includes('tr')) {
      goalAmount = baseAmount * 1000000;
    } else {
      goalAmount = baseAmount;
    }
  }

  if (goalAmount <= 0) {
    return null;
  }

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

async function fetchGoalTracking(userId) {
  const [profile, reports] = await Promise.all([
    getUserProfile(userId),
    getReports(userId),
  ]);

  const progress = calculateGoalProgress(profile, reports);

  return {
    profile,
    progress,
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
