import { createDataHook } from './createDataHook';
import { getTradingRisk, getCachedTradingRisk } from '../services/tradingRiskService';
export const useTradingRiskData = createDataHook(getTradingRisk, getCachedTradingRisk);
