import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { getReports } from './reportsService';
import { getUserProfile } from './userService';
import { getWealthRoadmap } from './wealthRoadmapService';

const AI_COACH_CACHE_TTL_MS = 60 * 1000;

const coachCopy = {
  vi: {
    winPositiveCashFlow: 'Dòng tiền tháng đang dương.',
    watchNegativeCashFlow: 'Dòng tiền tháng vẫn đang âm.',
    actionCashFlowTitle: 'Sửa lại dòng tiền tháng',
    actionCashFlowBody: 'Đưa hệ thống về trên mức 0 trước khi nghĩ đến tăng tốc đầu tư hay nâng cấp lối sống.',
    actionCashFlowButton: 'Xem lại chi tiêu',
    winPositiveNetWorth: 'Tài sản ròng đang theo dõi đã trên 0.',
    watchNegativeNetWorth: 'Nợ vẫn đang lớn hơn tài sản theo dõi.',
    watchLeakage: 'Chi tiêu rò rỉ lặp lại vẫn còn rõ.',
    actionLeakageTitle: 'Chuyển phần rò rỉ sang vùng bảo vệ',
    actionLeakageBody: 'Lấy một phần Chi tiêu rò rỉ của tháng này chuyển sang quỹ dự phòng hoặc bucket tài sản dài hạn đầu tiên.',
    actionLeakageButton: 'Xem chi tiêu rò rỉ',
    actionLongTermTitle: 'Mở bucket tích sản đầu tiên',
    actionLongTermBody: 'Hệ thống đã bắt đầu kiểm soát tiền, nhưng tài sản dài hạn vẫn còn trống. Đây là lúc mở kênh tích sản bền hơn.',
    actionLongTermButton: 'Mở Tài sản',
    winLongTermAssets: 'Đã bắt đầu theo dõi tài sản dài hạn.',
    actionIncomeTitle: 'Xây động cơ thu nhập thứ hai',
    actionIncomeBody: 'Chỉ có một nguồn thu khiến quá trình hồi phục còn mong manh. Bước nhảy bền hơn sẽ đến từ nguồn thu thứ hai, không chỉ từ siết chi.',
    actionIncomeButton: 'Tăng thu nhập',
    watchTradingRisk: 'Rủi ro giao dịch đang vượt khung cho phép.',
    actionTradingTitle: 'Giảm phơi nhiễm giao dịch ngay',
    actionTradingBody: 'Mức dùng rủi ro đã vượt giới hạn cứng. Dừng mở vị thế mới và reset lại kỷ luật trước lệnh tiếp theo.',
    actionTradingButton: 'Mở màn rủi ro',
    winConsistency: 'Độ ổn định dòng tiền đang tốt lên trong các tháng gần đây.',
    focusPriorityNow: 'ngay',
    focusPriorityNext: 'tiếp theo',
    focusPriorityLater: 'sau đó',
    focusDefaultTitle: 'Giữ hệ thống đều và nhàm chán',
    focusDefaultBody: 'Hiện chưa có đám cháy tài chính lớn. Giữ nhịp tổng kết tháng và để lãi kép làm việc.',
    focusDefaultButton: 'Mở báo cáo',
    insightBalanceTitle: 'Bảng cân đối',
    insightBalanceGood: 'Tài sản theo dõi đã bù được nợ. Tầng tiếp theo là tăng tốc, không còn chỉ là giữ an toàn.',
    insightBalanceWarning: 'Bảng cân đối vẫn còn mong. An toàn và giảm nợ vẫn phải đứng trên các thử nghiệm tăng trưởng.',
    insightOperatingTitle: 'Độ ổn định vận hành',
    insightOperatingBody: 'Tỷ lệ tiết kiệm trung bình gần đây là {rate}%. Đây là chỉ số cho thấy hệ thống còn chỗ thở để tích sản hay không.',
    insightRoadmapTitle: 'Giai đoạn roadmap',
    insightRoadmapFallback: 'Giai đoạn roadmap vẫn đang tải.',
  },
  en: {
    winPositiveCashFlow: 'Monthly cash flow is positive.',
    watchNegativeCashFlow: 'Monthly cash flow is still negative.',
    actionCashFlowTitle: 'Repair monthly cash flow',
    actionCashFlowBody: 'Bring the system back above zero before trying to accelerate investing or lifestyle upgrades.',
    actionCashFlowButton: 'Review spending',
    winPositiveNetWorth: 'Tracked net worth is above zero.',
    watchNegativeNetWorth: 'Debt still outweighs tracked assets.',
    watchLeakage: 'Repeat leakage is still visible.',
    actionLeakageTitle: 'Redeploy leakage into protection capital',
    actionLeakageBody: 'Redirect part of this month\'s Latte Factor into emergency fund or the first long-term asset bucket.',
    actionLeakageButton: 'Inspect leakage',
    actionLongTermTitle: 'Start the first compounding bucket',
    actionLongTermBody: 'The system is controlling money, but long-term assets are still missing. Open the first durable compounding track.',
    actionLongTermButton: 'Open assets',
    winLongTermAssets: 'Long-term assets are being tracked.',
    actionIncomeTitle: 'Build a second income engine',
    actionIncomeBody: 'A single income source keeps recovery fragile. The next durable jump comes from a second engine, not from tighter budgeting alone.',
    actionIncomeButton: 'Grow income',
    watchTradingRisk: 'Trading risk is outside the allowed box.',
    actionTradingTitle: 'Reduce trading exposure immediately',
    actionTradingBody: 'Risk usage is already beyond the hard limit. Pause new exposure and reset discipline before the next trade.',
    actionTradingButton: 'Open risk monitor',
    winConsistency: 'Cash-flow consistency is improving across recent months.',
    focusPriorityNow: 'now',
    focusPriorityNext: 'next',
    focusPriorityLater: 'later',
    focusDefaultTitle: 'Keep the system boring and consistent',
    focusDefaultBody: 'No major financial fire is visible right now. Stay consistent with the monthly close discipline and let compounding do the work.',
    focusDefaultButton: 'Open reports',
    insightBalanceTitle: 'Balance sheet',
    insightBalanceGood: 'Tracked assets now offset debt. The next layer is acceleration, not stabilization.',
    insightBalanceWarning: 'The balance sheet is still fragile. Safety and debt reduction still outrank growth experiments.',
    insightOperatingTitle: 'Operating consistency',
    insightOperatingBody: 'Recent average savings rate is {rate}%. This measures whether wealth building has room to breathe.',
    insightRoadmapTitle: 'Roadmap phase',
    insightRoadmapFallback: 'Roadmap phase still loading.',
  },
};

function copyFor(locale = 'vi') {
  return coachCopy[locale] || coachCopy.vi;
}

function template(text, params = {}) {
  return text.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''));
}

function getAICoachCacheKey(userId) {
  return `ai-coach:${userId}`;
}

export function buildCoachState({ profile, reports, roadmap, locale = 'vi' }) {
  const currency = reports.currency || profile.settings?.currency || 'VND';
  const copy = copyFor(locale);
  const actions = [];
  const wins = [];
  const watchouts = [];

  if (reports.monthly.netCashFlow > 0) {
    wins.push(copy.winPositiveCashFlow);
  } else {
    watchouts.push(copy.watchNegativeCashFlow);
    actions.push({
      id: 'cash-flow-reset',
      priority: copy.focusPriorityNow,
      title: copy.actionCashFlowTitle,
      body: copy.actionCashFlowBody,
      route: '/transactions',
      buttonLabel: copy.actionCashFlowButton,
    });
  }

  if (reports.balanceSheet.netWorth > 0) {
    wins.push(copy.winPositiveNetWorth);
  } else {
    watchouts.push(copy.watchNegativeNetWorth);
  }

  if (reports.monthly.latteFactor > 0) {
    watchouts.push(copy.watchLeakage);
    actions.push({
      id: 'latte-redeploy',
      priority: copy.focusPriorityNext,
      title: copy.actionLeakageTitle,
      body: copy.actionLeakageBody,
      route: '/latte',
      buttonLabel: copy.actionLeakageButton,
    });
  }

  if (reports.balanceSheet.longTermAssets <= 0) {
    actions.push({
      id: 'first-long-term-asset',
      priority: copy.focusPriorityNext,
      title: copy.actionLongTermTitle,
      body: copy.actionLongTermBody,
      route: '/assets',
      buttonLabel: copy.actionLongTermButton,
    });
  } else {
    wins.push(copy.winLongTermAssets);
  }

  if (reports.growth.incomeSources < 2) {
    actions.push({
      id: 'second-income-engine',
      priority: copy.focusPriorityLater,
      title: copy.actionIncomeTitle,
      body: copy.actionIncomeBody,
      route: '/income',
      buttonLabel: copy.actionIncomeButton,
    });
  }

  if (reports.risk.monthlyStatus === 'Stop' || reports.risk.dailyStatus === 'Stop') {
    watchouts.push(copy.watchTradingRisk);
    actions.unshift({
      id: 'trading-cooldown',
      priority: copy.focusPriorityNow,
      title: copy.actionTradingTitle,
      body: copy.actionTradingBody,
      route: '/trading-risk',
      buttonLabel: copy.actionTradingButton,
    });
  }

  if (reports.monthlyClose.positiveMonths >= 4) {
    wins.push(copy.winConsistency);
  }

  const currentPhase = roadmap.phases.find((phase) => phase.id === roadmap.currentPhaseId);

  const focus = actions[0] || {
    id: 'steady-compounding',
    priority: copy.focusPriorityNext,
    title: copy.focusDefaultTitle,
    body: copy.focusDefaultBody,
    route: '/reports',
    buttonLabel: copy.focusDefaultButton,
  };

  const insights = [
    {
      tone: reports.balanceSheet.netWorth >= 0 ? 'good' : 'warning',
      title: copy.insightBalanceTitle,
      body: reports.balanceSheet.netWorth >= 0
        ? copy.insightBalanceGood
        : copy.insightBalanceWarning,
    },
    {
      tone: reports.monthlyClose.averageSavingsRate >= 0.2 ? 'good' : 'warning',
      title: copy.insightOperatingTitle,
      body: template(copy.insightOperatingBody, { rate: Math.round(reports.monthlyClose.averageSavingsRate * 100) }),
    },
    {
      tone: 'neutral',
      title: copy.insightRoadmapTitle,
      body: currentPhase?.description || copy.insightRoadmapFallback,
    },
  ];

  return {
    currency,
    headline: focus.title,
    focus,
    wins,
    watchouts,
    insights,
    actions: actions.slice(0, 4),
  };
}

async function fetchAICoach(userId) {
  const [profile, reports, roadmap] = await Promise.all([
    getUserProfile(userId),
    getReports(userId),
    getWealthRoadmap(userId),
  ]);

  return buildCoachState({ profile, reports, roadmap, locale: profile.settings?.locale || 'vi' });
}

export function getCachedAICoach(userId) {
  return getCachedValue(getAICoachCacheKey(userId), AI_COACH_CACHE_TTL_MS);
}

export function getAICoach(userId, { forceFresh = false } = {}) {
  return loadWithCache({
    key: getAICoachCacheKey(userId),
    maxAgeMs: AI_COACH_CACHE_TTL_MS,
    forceFresh,
    loader: () => fetchAICoach(userId),
  });
}

export function setAICoachCache(userId, value) {
  setCachedValue(getAICoachCacheKey(userId), value);
}

export function invalidateAICoachCache(userId) {
  removeCachedValue(getAICoachCacheKey(userId));
}
