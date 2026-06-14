import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { getReports } from './reportsService';
import { getUserProfile } from './userService';
import { getWealthRoadmap } from './wealthRoadmapService';

const LETTER_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getLetterCacheKey(userId, monthKey) {
  return `letter:${userId}:${monthKey}`;
}

function generateMonthlyLetter(profile, reports, roadmap, locale = 'vi') {
  const month = new Date();
  const monthName = month.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' });
  const cashFlow = reports.monthly.netCashFlow;
  const savingsRate = reports.monthly.savingsRate;
  const latteFactor = reports.monthly.latteFactor;
  const currentPhase = roadmap.phases.find(p => p.id === roadmap.currentPhaseId);
  const emergencyFundMonths = reports.emergencyFund.months || 0;

  let letter = '';

  if (locale === 'vi') {
    letter = `## Bản tin tài chính tháng ${monthName}\n\n`;
    letter += `Xin chào ${profile.displayName || 'bạn'},\n\n`;

    // Opening paragraph based on cash flow
    if (cashFlow > 0) {
      letter += `Tháng này, dòng tiền của bạn ghi nhận **+${Math.abs(cashFlow).toLocaleString('vi-VN')} ₫** — mục tiêu đạt được.\n`;
    } else {
      letter += `Tháng này, dòng tiền của bạn ghi nhận **${cashFlow.toLocaleString('vi-VN')} ₫** — cần tiếp tục siết chi.\n`;
    }

    // Savings rate insight
    letter += `Tỷ lệ tiết kiệm của bạn là **${Math.round(savingsRate * 100)}%** `;
    if (savingsRate >= 0.3) {
      letter += '— rất tốt. Hệ thống đang chạy hiệu quả.\n';
    } else if (savingsRate >= 0.1) {
      letter += '— bình thường. Có thể tăng thêm 5-10%.\n';
    } else {
      letter += '— thấp. Cần tìm cơ hội tiết kiệm thêm.\n';
    }

    // Latte Factor insight
    if (latteFactor > 0) {
      letter += `Chi tiêu rò rỉ tháng này là **${latteFactor.toLocaleString('vi-VN')} ₫**. Đây là tiền có thể chuyển vào quỹ dự phòng hoặc tài sản dài hạn.\n`;
    }

    // Emergency fund progress
    letter += `\nQuỹ dự phòng của bạn hiện đang bảo vệ **${emergencyFundMonths.toFixed(1)} tháng** chi phí sống. `;
    if (emergencyFundMonths < 3) {
      letter += 'Mục tiêu tiếp theo là đạt 3 tháng.\n';
    } else if (emergencyFundMonths < 6) {
      letter += 'Tiếp tục tích lũy để đạt 6 tháng.\n';
    } else {
      letter += 'Bảo vệ đã tốt. Có thể chuyển dòng vào tài sản.\n';
    }

    // Roadmap phase
    letter += `\nBạn đang ở **${currentPhase?.title || 'giai đoạn'} (${currentPhase?.description || ''})**.\n`;
    letter += `Tiếp theo: ${currentPhase?.nextMilestone || 'hoàn thành mục tiêu của giai đoạn hiện tại'}.\n`;

    letter += `\n**Lời khuyên cho tháng tới:** `;
    if (cashFlow < 0) {
      letter += 'Ưu tiên sửa dòng tiền về 0 trước khi tính đến các kế hoạch khác.\n';
    } else if (emergencyFundMonths < 3) {
      letter += 'Đẩy dòng Latte Factor vào quỹ dự phòng để đạt 3 tháng bảo vệ.\n';
    } else if (savingsRate < 0.2) {
      letter += 'Tìm 1-2 cơ hội cắt chi để nâng tỷ lệ tiết kiệm lên 20%.\n';
    } else {
      letter += 'Duy trì kỷ luật hằng ngày. Lãi kép sẽ làm phần còn lại.\n';
    }

    letter += `\nCố gắng! 🚀\n`;
  } else {
    letter = `## Financial Letter — ${monthName}\n\n`;
    letter += `Hello ${profile.displayName || 'there'},\n\n`;

    if (cashFlow > 0) {
      letter += `This month, your cash flow is **+${cashFlow.toLocaleString('en-US')} VND** — target reached.\n`;
    } else {
      letter += `This month, your cash flow is **${cashFlow.toLocaleString('en-US')} VND** — keep tightening.\n`;
    }

    letter += `Your savings rate is **${Math.round(savingsRate * 100)}%** `;
    if (savingsRate >= 0.3) {
      letter += '— excellent. The system is running efficiently.\n';
    } else if (savingsRate >= 0.1) {
      letter += '— good. Can improve by 5–10%.\n';
    } else {
      letter += '— low. Find more opportunities to save.\n';
    }

    if (latteFactor > 0) {
      letter += `Leakage this month: **${latteFactor.toLocaleString('en-US')} VND**. Redirect this into your emergency fund or long-term assets.\n`;
    }

    letter += `\nYour emergency fund is protecting **${emergencyFundMonths.toFixed(1)} months** of essential expenses. `;
    if (emergencyFundMonths < 3) {
      letter += 'Target: reach 3 months.\n';
    } else if (emergencyFundMonths < 6) {
      letter += 'Continue building toward 6 months.\n';
    } else {
      letter += 'Well protected. Shift flow to long-term assets.\n';
    }

    letter += `\nYou are in **${currentPhase?.title || 'phase'}** of your wealth roadmap.\n`;
    letter += `\n**Action for next month:** `;
    if (cashFlow < 0) {
      letter += 'Fix cash flow to zero first.\n';
    } else if (emergencyFundMonths < 3) {
      letter += 'Build emergency fund to 3 months protection.\n';
    } else if (savingsRate < 0.2) {
      letter += 'Increase savings rate to 20%+.\n';
    } else {
      letter += 'Stay consistent. Compounding does the rest.\n';
    }

    letter += `\nKeep building! 🚀\n`;
  }

  return {
    monthKey: getMonthKey(),
    month: monthName,
    generatedAt: new Date().toISOString(),
    content: letter,
    metrics: {
      cashFlow,
      savingsRate,
      latteFactor,
      emergencyFundMonths,
      phase: currentPhase?.title,
    },
  };
}

async function fetchMonthlyLetter(userId) {
  const [profile, reports, roadmap] = await Promise.all([
    getUserProfile(userId),
    getReports(userId),
    getWealthRoadmap(userId),
  ]);

  return generateMonthlyLetter(profile, reports, roadmap, profile.settings?.locale || 'vi');
}

export function getCachedMonthlyLetter(userId) {
  const monthKey = getMonthKey();
  return getCachedValue(getLetterCacheKey(userId, monthKey), LETTER_CACHE_TTL_MS);
}

export function getMonthlyLetter(userId, { forceFresh = false } = {}) {
  const monthKey = getMonthKey();
  return loadWithCache({
    key: getLetterCacheKey(userId, monthKey),
    maxAgeMs: LETTER_CACHE_TTL_MS,
    forceFresh,
    loader: () => fetchMonthlyLetter(userId),
  });
}

export function setMonthlyLetterCache(userId, value) {
  setCachedValue(getLetterCacheKey(userId, value.monthKey), value);
}

export function invalidateMonthlyLetterCache(userId) {
  const monthKey = getMonthKey();
  removeCachedValue(getLetterCacheKey(userId, monthKey));
}
