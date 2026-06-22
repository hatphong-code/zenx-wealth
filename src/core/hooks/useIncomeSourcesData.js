import { createDataHook } from './createDataHook';
import { getIncomeSources, getCachedIncomeSources } from '../services/incomeBuilderService';
export const useIncomeSourcesData = createDataHook(getIncomeSources, getCachedIncomeSources);
