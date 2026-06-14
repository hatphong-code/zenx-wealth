import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import {
  buildBalanceSheet,
  buildEmergencyCoverageTrend,
  buildMonthlyCashFlowTrend,
  buildMonthlyCloseMetrics,
  calculateDashboardMetrics,
  calculateLatteMetrics,
  calculateWeeklyMetrics,
  estimateNetWorthTrend,
} from './calculations.js';
import { roadmapPhases } from './roadmapPhases.js';
import { computeRoadmapSignals, mergeRoadmapPhase } from './roadmap.js';

initializeApp();

const db = getFirestore();

const DASHBOARD_SNAPSHOT_ID = 'dashboard';
const LATTE_SNAPSHOT_ID = 'latte-current';
const WEEKLY_SNAPSHOT_ID = 'weekly-current';
const ROADMAP_SNAPSHOT_ID = 'roadmap-current';
const REPORTS_SNAPSHOT_ID = 'reports-current';
const SNAPSHOT_IDS = [
  DASHBOARD_SNAPSHOT_ID,
  LATTE_SNAPSHOT_ID,
  WEEKLY_SNAPSHOT_ID,
  ROADMAP_SNAPSHOT_ID,
  REPORTS_SNAPSHOT_ID,
];

function getCurrentWeekMeta(now = new Date()) {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekKey = format(weekStart, 'yyyy-MM-dd');
  return { weekStart, weekEnd, weekKey };
}

async function getUserProfile(userId) {
  const snapshot = await db.doc(`users/${userId}`).get();
  return snapshot.data() || {};
}

async function getCollectionDocs(path) {
  const snapshot = await db.collection(path).get();
  return snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
}

async function getTransactionsForRange(userId, start, end = null) {
  let queryRef = db.collection(`users/${userId}/transactions`).where('date', '>=', Timestamp.fromDate(start));
  if (end) {
    queryRef = queryRef.where('date', '<=', Timestamp.fromDate(end));
  }
  const snapshot = await queryRef.get();
  return snapshot.docs.map((docSnapshot) => docSnapshot.data());
}

async function getMonthlyTransactions(userId, now = new Date()) {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return getTransactionsForRange(userId, startOfMonth);
}

async function getWeeklyTransactions(userId, weekMeta = getCurrentWeekMeta()) {
  return getTransactionsForRange(userId, weekMeta.weekStart, weekMeta.weekEnd);
}

async function getEmergencyRecords(userId) {
  return getCollectionDocs(`users/${userId}/emergencyFund`);
}

async function getDebtsState(userId, currency) {
  const debts = await getCollectionDocs(`users/${userId}/debts`);
  const normalized = debts.map((item) => ({
    ...item,
    isBadDebt: typeof item.isBadDebt === 'boolean'
      ? item.isBadDebt
      : ['Credit Card', 'Consumer Loan', 'Personal Loan'].includes(item.debtType),
  }));
  const totalDebt = normalized.reduce((sum, item) => sum + Number(item.remainingAmount || 0), 0);
  const totalOriginal = normalized.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
  const badDebt = normalized
    .filter((item) => item.isBadDebt)
    .reduce((sum, item) => sum + Number(item.remainingAmount || 0), 0);
  const monthlyPayment = normalized.reduce((sum, item) => sum + Number(item.minimumPayment || 0), 0);
  const paidAmount = Math.max(0, totalOriginal - totalDebt);
  const payoffProgress = totalOriginal > 0 ? Math.round((paidAmount / totalOriginal) * 100) : 0;
  const highestPriorityDebt = [...normalized]
    .filter((item) => Number(item.remainingAmount || 0) > 0)
    .sort((a, b) => {
      const priorityWeight = { High: 3, Medium: 2, Low: 1 };
      const diff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (diff !== 0) return diff;
      return Number(b.interestRate || 0) - Number(a.interestRate || 0);
    })[0] || null;

  return {
    currency,
    debts: normalized,
    summary: {
      totalDebt,
      badDebt,
      monthlyPayment,
      payoffProgress,
      highestPriorityDebt,
    },
  };
}

async function getIncomeState(userId, currency) {
  const incomeSources = await getCollectionDocs(`users/${userId}/incomeSources`);
  const currentMonthlyIncome = incomeSources.reduce((sum, item) => sum + Number(item.currentMonthlyIncome || 0), 0);
  const targetMonthlyIncome = incomeSources.reduce((sum, item) => sum + Number(item.targetMonthlyIncome || 0), 0);

  return {
    currency,
    incomeSources,
    summary: {
      currentMonthlyIncome,
      targetMonthlyIncome,
      gap: Math.max(0, targetMonthlyIncome - currentMonthlyIncome),
      activeSources: incomeSources.filter((item) => Number(item.targetMonthlyIncome || item.currentMonthlyIncome || 0) > 0).length,
    },
  };
}

async function getAssetsState(userId, currency) {
  const accounts = await getCollectionDocs(`users/${userId}/accounts`);
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
    currency,
    accounts,
    summary: {
      totalAssets,
      liquidAssets,
      longTermAssets,
      riskAssets,
    },
  };
}

async function getTradingRiskState(userId, currency) {
  const records = await getCollectionDocs(`users/${userId}/tradingRisk`);
  const configRecord = records.find((item) => item.recordType === 'config') || {};
  const journalRecords = records
    .filter((item) => item.recordType === 'journal')
    .sort((left, right) => {
      const leftTime = left.date?.toDate ? left.date.toDate().getTime() : 0;
      const rightTime = right.date?.toDate ? right.date.toDate().getTime() : 0;
      return rightTime - leftTime;
    });

  const config = {
    capital: Number(configRecord.capital || 0),
    dailyLossLimitPct: Number(configRecord.dailyLossLimitPct || 3),
    weeklyLossLimitPct: Number(configRecord.weeklyLossLimitPct || 8),
    monthlyLossLimitPct: Number(configRecord.monthlyLossLimitPct || 15),
    profitWithdrawalPct: Number(configRecord.profitWithdrawalPct || 30),
  };

  const now = new Date();
  const sumPnlBetween = (start, end) => journalRecords.reduce((sum, item) => {
    const date = item.date?.toDate ? item.date.toDate() : null;
    if (!date || date < start || date > end) return sum;
    return sum + Number(item.pnl || 0);
  }, 0);
  const evaluateRiskStatus = (value, capital, limitPct) => {
    if (capital <= 0 || limitPct <= 0) {
      return { usedPct: 0, limitAmount: 0, status: 'No capital' };
    }
    const limitAmount = (capital * limitPct) / 100;
    const usedPct = value < 0 ? Math.abs(value) / limitAmount * 100 : 0;
    if (usedPct >= 100) return { usedPct, limitAmount, status: 'Stop' };
    if (usedPct >= 75) return { usedPct, limitAmount, status: 'Caution' };
    return { usedPct, limitAmount, status: 'Healthy' };
  };
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const weekMeta = getCurrentWeekMeta(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const todayPnl = sumPnlBetween(todayStart, todayEnd);
  const weekPnl = sumPnlBetween(weekMeta.weekStart, weekMeta.weekEnd);
  const monthPnl = sumPnlBetween(monthStart, monthEnd);
  const totalRealizedPnl = journalRecords.reduce((sum, item) => sum + Number(item.pnl || 0), 0);

  return {
    currency,
    config,
    records: journalRecords,
    summary: {
      todayPnl,
      weekPnl,
      monthPnl,
      totalRealizedPnl,
      daily: evaluateRiskStatus(todayPnl, config.capital, config.dailyLossLimitPct),
      weekly: evaluateRiskStatus(weekPnl, config.capital, config.weeklyLossLimitPct),
      monthly: evaluateRiskStatus(monthPnl, config.capital, config.monthlyLossLimitPct),
      suggestedWithdrawal: totalRealizedPnl > 0 ? (totalRealizedPnl * config.profitWithdrawalPct) / 100 : 0,
    },
  };
}

async function getRoadmapStoredStates(userId) {
  const docs = await Promise.all(
    roadmapPhases.map(async (phase) => {
      const snapshot = await db.doc(`users/${userId}/roadmap/${phase.id}`).get();
      return [phase.id, snapshot.data() || {}];
    })
  );

  return Object.fromEntries(docs);
}

async function computeCoreSnapshots(userId) {
  const profile = await getUserProfile(userId);
  const currency = profile.settings?.currency || 'VND';
  const monthlyEssentialExpense = profile.settings?.monthlyEssentialExpense || 15000000;
  const emergencyFundTargetMonths = profile.settings?.emergencyFundTargetMonths || 6;
  const payYourselfRate = profile.settings?.payYourselfFirstRate || 0.3;
  const now = new Date();
  const weekMeta = getCurrentWeekMeta(now);

  const [
    monthlyTransactions,
    weeklyTransactions,
    allTransactions,
    emergencyRecords,
    debtsState,
    incomeState,
    assetsState,
    tradingRiskState,
    roadmapStoredStates,
    weeklyReviewDoc,
  ] = await Promise.all([
    getMonthlyTransactions(userId, now),
    getWeeklyTransactions(userId, weekMeta),
    getCollectionDocs(`users/${userId}/transactions`),
    getEmergencyRecords(userId),
    getDebtsState(userId, currency),
    getIncomeState(userId, currency),
    getAssetsState(userId, currency),
    getTradingRiskState(userId, currency),
    getRoadmapStoredStates(userId),
    db.doc(`users/${userId}/weeklyReviews/${weekMeta.weekKey}`).get(),
  ]);

  const dashboard = calculateDashboardMetrics({
    transactions: monthlyTransactions,
    emergencyRecords,
    currency,
    payYourselfRate,
    monthlyEssentialExpense,
    emergencyFundTargetMonths,
  });

  const latte = calculateLatteMetrics({
    transactions: monthlyTransactions,
    currency,
  });

  const weekly = {
    weekMeta,
    review: calculateWeeklyMetrics({
      transactions: weeklyTransactions,
      emergencyRecords,
      currency,
      monthlyEssentialExpense,
    }),
    form: {
      oneLesson: weeklyReviewDoc.data()?.oneLesson || '',
      oneActionNextWeek: weeklyReviewDoc.data()?.oneActionNextWeek || '',
    },
  };

  const signals = computeRoadmapSignals({
    profile,
    dashboard,
    debtsState,
    incomeState,
    assetsState,
  });
  const roadmapPhasesState = roadmapPhases.map((phase) => mergeRoadmapPhase(phase, roadmapStoredStates[phase.id] || {}, signals));
  const currentPhase = roadmapPhasesState.find((phase) => !phase.completed) || roadmapPhasesState[roadmapPhasesState.length - 1];
  const roadmap = {
    phases: roadmapPhasesState,
    currentPhaseId: currentPhase?.id || roadmapPhases[0].id,
    completedPhases: roadmapPhasesState.filter((phase) => phase.completed).length,
    signals,
  };

  const debtPressure = dashboard.netCashFlow > 0
    ? debtsState.summary.monthlyPayment / Math.max(1, dashboard.netCashFlow)
    : 0;
  const cashFlowTrend = buildMonthlyCashFlowTrend({ transactions: allTransactions, currency });
  const emergencyTrend = buildEmergencyCoverageTrend({
    emergencyRecords,
    currency,
    monthlyEssentialExpense,
  });
  const latestEmergency = emergencyTrend[emergencyTrend.length - 1]?.balance || 0;
  const balanceSheet = buildBalanceSheet({
    assetSummary: assetsState.summary,
    debtSummary: debtsState.summary,
    emergencyBalance: latestEmergency,
  });
  const netWorthTrend = estimateNetWorthTrend({
    currentNetWorth: balanceSheet.netWorth,
    cashFlowTrend,
  });
  const monthlyClose = buildMonthlyCloseMetrics(cashFlowTrend);
  const latestNetWorthDelta = netWorthTrend.length > 1
    ? netWorthTrend[netWorthTrend.length - 1].estimatedNetWorth - netWorthTrend[netWorthTrend.length - 2].estimatedNetWorth
    : 0;

  const reports = {
    currency,
    monthly: {
      netCashFlow: dashboard.netCashFlow,
      latteFactor: dashboard.latteFactor,
      emergencyMonths: dashboard.emergencyMonths,
      payYourselfProgress: dashboard.payYourselfProgress,
      debtPressure,
      assetBase: assetsState.summary.totalAssets,
    },
    balanceSheet,
    weekly: weekly.review,
    roadmap: {
      currentPhaseId: roadmap.currentPhaseId,
      completedPhases: roadmap.completedPhases,
      totalPhases: roadmap.phases.length,
      nextMilestone: roadmap.phases.find((phase) => phase.id === roadmap.currentPhaseId)?.checklist.find((item) => !item.completed)?.label || '',
    },
    growth: {
      incomeSources: incomeState.summary.activeSources,
      currentMonthlyIncome: incomeState.summary.currentMonthlyIncome,
      targetMonthlyIncome: incomeState.summary.targetMonthlyIncome,
      longTermAssets: assetsState.summary.longTermAssets,
      riskAssets: assetsState.summary.riskAssets,
    },
    risk: {
      dailyStatus: tradingRiskState.summary.daily.status,
      weeklyStatus: tradingRiskState.summary.weekly.status,
      monthlyStatus: tradingRiskState.summary.monthly.status,
      todayPnl: tradingRiskState.summary.todayPnl,
      monthPnl: tradingRiskState.summary.monthPnl,
    },
    trends: {
      cashFlow: cashFlowTrend,
      emergencyCoverage: emergencyTrend,
      netWorthEstimate: netWorthTrend,
    },
    monthlyClose: {
      ...monthlyClose,
      latestNetWorthDelta,
    },
    insights: [
      {
        title: 'Cash flow',
        body: dashboard.netCashFlow >= 0
          ? 'Monthly cash flow is positive. Keep redirecting surplus into emergency fund or long-term assets.'
          : 'Monthly cash flow is negative. Expense control still needs to move before wealth acceleration can hold.',
      },
      {
        title: 'Latte leakage',
        body: latte.total > 0
          ? `Latte leakage is material this month, led by ${latte.topCategories[0]?.category || 'small repeat spending'}.`
          : 'Latte leakage is quiet right now. Focus on strengthening the asset side and income engine.',
      },
      {
        title: 'Balance sheet',
        body: balanceSheet.netWorth >= 0
          ? 'Tracked assets are covering debt. The next challenge is accelerating net worth growth, not just staying solvent.'
          : 'Debt still outweighs tracked assets. Net worth is fragile and the system should prioritize safety and debt reduction first.',
      },
      {
        title: 'Roadmap',
        body: roadmap.phases.find((phase) => phase.id === roadmap.currentPhaseId)?.description || 'Roadmap snapshot is loading.',
      },
    ],
  };

  return { dashboard, latte, weekly, roadmap, reports };
}

async function writeSnapshot(userId, snapshotId, value) {
  await db.doc(`users/${userId}/snapshots/${snapshotId}`).set({
    ...value,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function refreshSnapshots(userId) {
  const snapshots = await computeCoreSnapshots(userId);
  await Promise.all([
    writeSnapshot(userId, DASHBOARD_SNAPSHOT_ID, snapshots.dashboard),
    writeSnapshot(userId, LATTE_SNAPSHOT_ID, snapshots.latte),
    writeSnapshot(userId, WEEKLY_SNAPSHOT_ID, snapshots.weekly),
    writeSnapshot(userId, ROADMAP_SNAPSHOT_ID, snapshots.roadmap),
    writeSnapshot(userId, REPORTS_SNAPSHOT_ID, snapshots.reports),
  ]);
}

function getChangeType(event) {
  const beforeExists = event.data?.before?.exists;
  const afterExists = event.data?.after?.exists;

  if (!beforeExists && afterExists) return 'create';
  if (beforeExists && afterExists) return 'update';
  if (beforeExists && !afterExists) return 'delete';
  return 'unknown';
}

function snapshotTrigger(path, label) {
  return onDocumentWritten({ document: path, region: 'asia-southeast1' }, async (event) => {
    const userId = event.params.userId;
    if (!userId) return;
    const startedAt = Date.now();
    const changeType = getChangeType(event);

    logger.info('snapshot_refresh_started', {
      userId,
      triggerLabel: label,
      triggerPath: path,
      changeType,
      eventId: event.id,
      snapshotIds: SNAPSHOT_IDS,
    });

    try {
      await refreshSnapshots(userId);
      logger.info('snapshot_refresh_completed', {
        userId,
        triggerLabel: label,
        triggerPath: path,
        changeType,
        eventId: event.id,
        snapshotIds: SNAPSHOT_IDS,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      logger.error('snapshot_refresh_failed', {
        userId,
        triggerLabel: label,
        triggerPath: path,
        changeType,
        eventId: event.id,
        snapshotIds: SNAPSHOT_IDS,
        durationMs: Date.now() - startedAt,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : null,
      });
      throw error;
    }
  });
}

export { generateAIInsights } from './llmInsights.js';
export { createMomoPayment, momoIPN } from './momo.js';

export const onUserProfileWrite = snapshotTrigger('users/{userId}', 'user profile write');
export const onTransactionWrite = snapshotTrigger('users/{userId}/transactions/{transactionId}', 'transaction write');
export const onEmergencyFundWrite = snapshotTrigger('users/{userId}/emergencyFund/{recordId}', 'emergency fund write');
export const onDebtWrite = snapshotTrigger('users/{userId}/debts/{debtId}', 'debt write');
export const onIncomeSourceWrite = snapshotTrigger('users/{userId}/incomeSources/{sourceId}', 'income source write');
export const onAccountWrite = snapshotTrigger('users/{userId}/accounts/{accountId}', 'account write');
export const onWeeklyReviewWrite = snapshotTrigger('users/{userId}/weeklyReviews/{reviewId}', 'weekly review write');
export const onRoadmapWrite = snapshotTrigger('users/{userId}/roadmap/{phaseId}', 'roadmap write');
export const onTradingRiskWrite = snapshotTrigger('users/{userId}/tradingRisk/{recordId}', 'trading risk write');
