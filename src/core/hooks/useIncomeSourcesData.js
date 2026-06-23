import { createDataHook } from './createDataHook';
import { getIncomeSources, getCachedIncomeSources } from '../services/incomeBuilderService';

const DEFAULT = {
  currency: 'VND',
  incomeSources: [],
  summary: { currentMonthlyIncome: 0, targetMonthlyIncome: 0, gap: 0, activeSources: 0 },
};
export const useIncomeSourcesData = createDataHook(getIncomeSources, getCachedIncomeSources, DEFAULT);
