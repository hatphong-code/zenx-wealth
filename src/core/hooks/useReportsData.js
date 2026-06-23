import { createDataHook } from './createDataHook';
import { getReports, getCachedReports } from '../services/reportsService';

const DEFAULT = {
  currency: 'VND',
  monthly: { netCashFlow: 0, latteFactor: 0, emergencyMonths: 0, payYourselfProgress: 0, debtPressure: 0, assetBase: 0 },
  balanceSheet: {
    trackedAssets: 0, emergencyFund: 0, liquidAssets: 0, longTermAssets: 0,
    riskAssets: 0, totalAssets: 0, totalDebt: 0, netWorth: 0, debtToAssetRatio: 0,
  },
  weekly: { income: 0, expense: 0, latteFactorTotal: 0, savingsRate: 0 },
  cashFlowTrend: [],
  emergencyCoverageTrend: [],
  netWorthTrend: [],
  closeMetrics: [],
};
export const useReportsData = createDataHook(getReports, getCachedReports, DEFAULT);
