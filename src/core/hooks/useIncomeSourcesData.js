import { createDataHook } from './createDataHook';
import { getIncomeBuilderData, getCachedIncomeBuilderData } from '../services/incomeBuilderService';
export const useIncomeSourcesData = createDataHook(getIncomeBuilderData, getCachedIncomeBuilderData);
