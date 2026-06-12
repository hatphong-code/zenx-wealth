import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { db } from './firebaseDb';
import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { getAssets } from './assetService';
import { getDashboardStats } from './dashboardService';
import { getDebts } from './debtService';
import {
  buildBalanceSheet,
  buildEmergencyCoverageTrend,
  buildMonthlyCashFlowTrend,
  buildMonthlyCloseMetrics,
  estimateNetWorthTrend,
} from './financialCalculations';
import { getIncomeSources } from './incomeBuilderService';
import { getLatteFactor } from './latteFactorService';
import { getEmergencyFund } from './emergencyFundService';
import { getTradingRisk } from './tradingRiskService';
import { getTransactions } from './transactionService';
import { getUserProfile } from './userService';
import { getCurrentWeekMeta, getWeeklyReview } from './weeklyReviewService';
import { getWealthRoadmap } from './wealthRoadmapService';

const REPORTS_CACHE_TTL_MS = 60 * 1000;
const REPORTS_SNAPSHOT_ID = 'reports-current';

const reportInsightCopy = {
  vi: {
    cashFlowTitle: 'Dòng tiền',
    cashFlowPositive: 'Dòng tiền tháng đang dương. Hãy tiếp tục chuyển phần dương sang quỹ dự phòng hoặc tài sản dài hạn.',
    cashFlowNegative: 'Dòng tiền tháng đang âm. Kiểm soát chi tiêu vẫn phải đi trước khi nói đến tăng tốc tích sản.',
    leakageTitle: 'Chi tiêu rò rỉ',
    leakageWithCategory: 'Chi tiêu rò rỉ đang đáng kể trong tháng này, dẫn đầu bởi {category}.',
    leakageQuiet: 'Chi tiêu rò rỉ đang yên hơn. Hãy dồn sự chú ý sang tăng tài sản và mở rộng động cơ thu nhập.',
    balanceTitle: 'Bảng cân đối',
    balancePositive: 'Tài sản theo dõi đã phủ được nợ. Thử thách tiếp theo là tăng tốc tài sản ròng, không còn chỉ là giữ an toàn.',
    balanceNegative: 'Nợ vẫn lớn hơn tài sản theo dõi. Tài sản ròng còn mong và hệ thống nên ưu tiên an toàn, giảm nợ trước.',
    roadmapTitle: 'Lộ trình tài chính',
    roadmapFallback: 'Snapshot lộ trình vẫn đang tải.',
  },
  en: {
    cashFlowTitle: 'Cash flow',
    cashFlowPositive: 'Monthly cash flow is positive. Keep redirecting surplus into emergency fund or long-term assets.',
    cashFlowNegative: 'Monthly cash flow is negative. Expense control still needs to move before wealth acceleration can hold.',
    leakageTitle: 'Latte leakage',
    leakageWithCategory: 'Latte leakage is material this month, led by {category}.',
    leakageQuiet: 'Latte leakage is quiet right now. Focus on strengthening the asset side and income engine.',
    balanceTitle: 'Balance sheet',
    balancePositive: 'Tracked assets are covering debt. The next challenge is accelerating net worth growth, not just staying solvent.',
    balanceNegative: 'Debt still outweighs tracked assets. Net worth is fragile and the system should prioritize safety and debt reduction first.',
    roadmapTitle: 'Roadmap',
    roadmapFallback: 'Roadmap snapshot is loading.',
  },
};

function reportCopyFor(locale = 'vi') {
  return reportInsightCopy[locale] || reportInsightCopy.vi;
}

function interpolate(text, params = {}) {
  return text.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''));
}

function getReportsCacheKey(userId) {
  return `reports:${userId}`;
}

function getReportsSnapshotRef(userId) {
  return doc(db, 'users', userId, 'snapshots', REPORTS_SNAPSHOT_ID);
}

export function normalizeReports(data = {}) {
  return {
    ...data,
    currency: data.currency || 'VND',
    monthly: {
      netCashFlow: 0,
      latteFactor: 0,
      emergencyMonths: 0,
      payYourselfProgress: 0,
      debtPressure: 0,
      assetBase: 0,
      ...(data.monthly || {}),
    },
    balanceSheet: {
      trackedAssets: 0,
      emergencyFund: 0,
      liquidAssets: 0,
      longTermAssets: 0,
      riskAssets: 0,
      totalAssets: 0,
      totalDebt: 0,
      netWorth: 0,
      debtToAssetRatio: 0,
      ...(data.balanceSheet || {}),
    },
    weekly: {
      income: 0,
      expense: 0,
      latteFactorTotal: 0,
      savingsRate: 0,
      wealthDisciplineScore: 0,
      topLatteCategory: '',
      ...(data.weekly || {}),
    },
    roadmap: {
      currentPhaseId: '',
      completedPhases: 0,
      totalPhases: 0,
      nextMilestone: '',
      ...(data.roadmap || {}),
    },
    growth: {
      incomeSources: 0,
      currentMonthlyIncome: 0,
      targetMonthlyIncome: 0,
      longTermAssets: 0,
      riskAssets: 0,
      ...(data.growth || {}),
    },
    risk: {
      dailyStatus: 'No capital',
      weeklyStatus: 'No capital',
      monthlyStatus: 'No capital',
      todayPnl: 0,
      monthPnl: 0,
      ...(data.risk || {}),
    },
    trends: {
      cashFlow: [],
      emergencyCoverage: [],
      netWorthEstimate: [],
      ...(data.trends || {}),
    },
    monthlyClose: {
      positiveMonths: 0,
      averageNetCashFlow: 0,
      averageSavingsRate: 0,
      bestMonth: null,
      worstMonth: null,
      latestNetWorthDelta: 0,
      ...(data.monthlyClose || {}),
    },
    insights: data.insights || [],
  };
}

async function computeReports(userId) {
  const weekMeta = getCurrentWeekMeta();
  const [profile, dashboard, latte, weekly, roadmap, debts, income, tradingRisk, assets, transactionsState, emergencyState] = await Promise.all([
    getUserProfile(userId),
    getDashboardStats(userId),
    getLatteFactor(userId),
    getWeeklyReview(userId, weekMeta),
    getWealthRoadmap(userId),
    getDebts(userId),
    getIncomeSources(userId),
    getTradingRisk(userId),
    getAssets(userId),
    getTransactions(userId),
    getEmergencyFund(userId),
  ]);

  const debtPressure = dashboard.netCashFlow > 0
    ? debts.summary.monthlyPayment / Math.max(1, dashboard.netCashFlow)
    : 0;
  const cashFlowTrend = buildMonthlyCashFlowTrend({
    transactions: transactionsState.transactions,
    currency: dashboard.currency || profile.settings?.currency || 'VND',
  });
  const emergencyTrend = buildEmergencyCoverageTrend({
    emergencyRecords: emergencyState.records,
    currency: dashboard.currency || profile.settings?.currency || 'VND',
    monthlyEssentialExpense: profile.settings?.monthlyEssentialExpense || 15000000,
  });
  const latestEmergency = emergencyTrend[emergencyTrend.length - 1]?.balance || 0;
  const balanceSheet = buildBalanceSheet({
    assetSummary: assets.summary,
    debtSummary: debts.summary,
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
  const locale = profile.settings?.locale || 'vi';
  const copy = reportCopyFor(locale);

  return {
    currency: dashboard.currency || profile.settings?.currency || 'VND',
    monthly: {
      netCashFlow: dashboard.netCashFlow,
      latteFactor: dashboard.latteFactor,
      emergencyMonths: dashboard.emergencyMonths,
      payYourselfProgress: dashboard.payYourselfProgress,
      debtPressure,
      assetBase: assets.summary.totalAssets,
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
      incomeSources: income.summary.activeSources,
      currentMonthlyIncome: income.summary.currentMonthlyIncome,
      targetMonthlyIncome: income.summary.targetMonthlyIncome,
      longTermAssets: assets.summary.longTermAssets,
      riskAssets: assets.summary.riskAssets,
    },
    risk: {
      dailyStatus: tradingRisk.summary.daily.status,
      weeklyStatus: tradingRisk.summary.weekly.status,
      monthlyStatus: tradingRisk.summary.monthly.status,
      todayPnl: tradingRisk.summary.todayPnl,
      monthPnl: tradingRisk.summary.monthPnl,
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
        title: copy.cashFlowTitle,
        body: dashboard.netCashFlow >= 0
          ? copy.cashFlowPositive
          : copy.cashFlowNegative,
      },
      {
        title: copy.leakageTitle,
        body: latte.total > 0
          ? interpolate(copy.leakageWithCategory, { category: latte.topCategories[0]?.category || 'chi nhỏ lặp lại' })
          : copy.leakageQuiet,
      },
      {
        title: copy.balanceTitle,
        body: balanceSheet.netWorth >= 0
          ? copy.balancePositive
          : copy.balanceNegative,
      },
      {
        title: copy.roadmapTitle,
        body: roadmap.phases.find((phase) => phase.id === roadmap.currentPhaseId)?.description || copy.roadmapFallback,
      },
    ],
  };
}

async function fetchReports(userId) {
  const snapshot = await getDoc(getReportsSnapshotRef(userId));
  if (snapshot.exists()) {
    return normalizeReports(snapshot.data());
  }

  const reports = await computeReports(userId);
  await setDoc(getReportsSnapshotRef(userId), {
    ...reports,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return reports;
}

export function getCachedReports(userId) {
  return getCachedValue(getReportsCacheKey(userId), REPORTS_CACHE_TTL_MS);
}

export function getReports(userId, { forceFresh = false } = {}) {
  return loadWithCache({
    key: getReportsCacheKey(userId),
    maxAgeMs: REPORTS_CACHE_TTL_MS,
    forceFresh,
    loader: () => fetchReports(userId),
  });
}

export function setReportsCache(userId, value) {
  setCachedValue(getReportsCacheKey(userId), value);
}

export function invalidateReportsCache(userId) {
  removeCachedValue(getReportsCacheKey(userId));
}

export async function refreshReportsSnapshot(userId) {
  const reports = await computeReports(userId);
  await setDoc(getReportsSnapshotRef(userId), {
    ...reports,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  setReportsCache(userId, reports);
  return reports;
}
