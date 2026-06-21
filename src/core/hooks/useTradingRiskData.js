import { createDataHook } from './createDataHook';
import { getTradingRiskData, getCachedTradingRiskData } from '../services/tradingRiskService';
export const useTradingRiskData = createDataHook(getTradingRiskData, getCachedTradingRiskData);
