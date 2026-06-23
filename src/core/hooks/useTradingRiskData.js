import { createDataHook } from './createDataHook';
import { getTradingRisk, getCachedTradingRisk } from '../services/tradingRiskService';

const NO_CAPITAL = { usedPct: 0, limitAmount: 0, status: 'No capital' };
const DEFAULT = {
  currency: 'VND',
  config: { capital: 0, dailyLossLimitPct: 3, weeklyLossLimitPct: 8, monthlyLossLimitPct: 15, profitWithdrawalPct: 30 },
  records: [],
  summary: {
    todayPnl: 0, weekPnl: 0, monthPnl: 0, totalRealizedPnl: 0,
    daily: NO_CAPITAL, weekly: NO_CAPITAL, monthly: NO_CAPITAL,
    suggestedWithdrawal: 0,
  },
};
export const useTradingRiskData = createDataHook(getTradingRisk, getCachedTradingRisk, DEFAULT);
