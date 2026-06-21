import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { getTranslation, setCurrentLocale } from '../i18n/getTranslation';
import { getReports } from './reportsService';
import { getUserProfile } from './userService';
import { getWealthRoadmap } from './wealthRoadmapService';

const AI_COACH_CACHE_TTL_MS = 60 * 1000;

function copyFor(locale = 'vi') {
  setCurrentLocale(locale);
  return (key, params = {}) => getTranslation(`aiCoach.${key}`, params);
}

function generatePersonalizedHeadline(reports, roadmap, locale = 'vi') {
  const cf = copyFor(locale);
  const { monthly, monthlyClose, balanceSheet, risk } = reports;
  const currentPhase = roadmap.phases.find((p) => p.id === roadmap.currentPhaseId);

  // Analyze current state for personalized headline
  const isNegativeCash = monthly.netCashFlow < 0;
  const negativeNetWorth = balanceSheet.netWorth < 0;
  const hasLatte = monthly.latteFactor > 0;
  const consistentPositive = monthlyClose.positiveMonths >= 3;
  const highRisk = risk.monthlyStatus === 'Stop' || risk.dailyStatus === 'Stop';

  if (highRisk) {
    return locale === 'vi' ? 'Dừng giao dịch, reset kỷ luật' : 'Stop trading, reset discipline';
  }
  if (isNegativeCash && negativeNetWorth) {
    return locale === 'vi' ? 'Cấp cứu dòng tiền — mục tiêu 0' : 'Cash flow critical — target zero';
  }
  if (isNegativeCash) {
    return locale === 'vi' ? 'Sửa dòng tiền tháng này' : 'Repair this month\'s cash flow';
  }
  if (hasLatte && !negativeNetWorth) {
    return locale === 'vi' ? 'Chuyển rò rỉ sang bảo vệ' : 'Redirect leakage into protection';
  }
  if (consistentPositive && balanceSheet.netWorth > 0 && monthly.savingsRate >= 0.3) {
    return locale === 'vi' ? 'Tăng tốc — mở bucket dài hạn' : 'Accelerate — open long-term bucket';
  }
  if (consistentPositive) {
    return locale === 'vi' ? 'Giữ nhịp — lãi kép sẽ làm việc' : 'Stay consistent — compounding works';
  }
  return cf("focusDefaultTitle");
}

function generateOperatingInsight(reports, locale = 'vi') {
  const cf = copyFor(locale);
  const rate = reports.monthlyClose.averageSavingsRate;
  const ratePercent = Math.round(rate * 100);

  let detail = '';
  if (rate < 0.05) {
    detail = locale === 'vi'
      ? 'Còn quá thắt. Cần tìm thêm dòng chảy vào.'
      : 'Still too tight. Need more inflow.';
  } else if (rate < 0.1) {
    detail = locale === 'vi'
      ? 'Bắt đầu thở được. Tiếp tục siết từng % nữa.'
      : 'Starting to breathe. Keep tightening by 1%.';
  } else if (rate < 0.2) {
    detail = locale === 'vi'
      ? 'Lành mạnh. Đủ để xây dựng bảo vệ.'
      : 'Healthy. Enough to build protection.';
  } else if (rate < 0.3) {
    detail = locale === 'vi'
      ? 'Tốt. Có thể mở 2-3 bucket đồng thời.'
      : 'Good. Can open 2-3 buckets in parallel.';
  } else {
    detail = locale === 'vi'
      ? 'Xuất sắc. Tăng tốc là bước tiếp theo.'
      : 'Excellent. Acceleration is next.';
  }

  return {
    tone: rate >= 0.2 ? 'good' : 'warning',
    title: cf("insightOperatingTitle"),
    body: cf("insightOperatingBody", { rate: ratePercent }) + ' ' + detail,
  };
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
    wins.push(copy("winPositiveCashFlow"));
  } else {
    watchouts.push(copy("watchNegativeCashFlow"));
    actions.push({
      id: 'cash-flow-reset',
      priority: copy("focusPriorityNow"),
      title: copy("actionCashFlowTitle"),
      body: copy("actionCashFlowBody"),
      route: '/transactions',
      buttonLabel: copy("actionCashFlowButton"),
    });
  }

  if (reports.balanceSheet.netWorth > 0) {
    wins.push(copy("winPositiveNetWorth"));
  } else {
    watchouts.push(copy("watchNegativeNetWorth"));
  }

  if (reports.monthly.latteFactor > 0) {
    watchouts.push(copy("watchLeakage"));
    actions.push({
      id: 'latte-redeploy',
      priority: copy("focusPriorityNext"),
      title: copy("actionLeakageTitle"),
      body: copy("actionLeakageBody"),
      route: '/latte',
      buttonLabel: copy("actionLeakageButton"),
    });
  }

  if (reports.balanceSheet.longTermAssets <= 0) {
    actions.push({
      id: 'first-long-term-asset',
      priority: copy("focusPriorityNext"),
      title: copy("actionLongTermTitle"),
      body: copy("actionLongTermBody"),
      route: '/assets',
      buttonLabel: copy("actionLongTermButton"),
    });
  } else {
    wins.push(copy("winLongTermAssets"));
  }

  if (reports.growth.incomeSources < 2) {
    actions.push({
      id: 'second-income-engine',
      priority: copy("focusPriorityLater"),
      title: copy("actionIncomeTitle"),
      body: copy("actionIncomeBody"),
      route: '/income',
      buttonLabel: copy("actionIncomeButton"),
    });
  }

  if (reports.risk.monthlyStatus === 'Stop' || reports.risk.dailyStatus === 'Stop') {
    watchouts.push(copy("watchTradingRisk"));
    actions.unshift({
      id: 'trading-cooldown',
      priority: copy("focusPriorityNow"),
      title: copy("actionTradingTitle"),
      body: copy("actionTradingBody"),
      route: '/trading-risk',
      buttonLabel: copy("actionTradingButton"),
    });
  }

  if (reports.monthlyClose.positiveMonths >= 4) {
    wins.push(copy("winConsistency"));
  }

  const currentPhase = roadmap.phases.find((phase) => phase.id === roadmap.currentPhaseId);

  const personalizedHeadline = generatePersonalizedHeadline(reports, roadmap, locale);

  const focus = actions[0] || {
    id: 'steady-compounding',
    priority: copy("focusPriorityNext"),
    title: personalizedHeadline,
    body: copy("focusDefaultBody"),
    route: '/reports',
    buttonLabel: copy("focusDefaultButton"),
  };

  const insights = [
    {
      tone: reports.balanceSheet.netWorth >= 0 ? 'good' : 'warning',
      title: copy("insightBalanceTitle"),
      body: reports.balanceSheet.netWorth >= 0
        ? copy("insightBalanceGood")
        : copy("insightBalanceWarning"),
    },
    generateOperatingInsight(reports, locale),
    {
      tone: 'neutral',
      title: copy("insightRoadmapTitle"),
      body: currentPhase?.description || copy("insightRoadmapFallback"),
    },
  ];

  return {
    currency,
    headline: personalizedHeadline,
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
