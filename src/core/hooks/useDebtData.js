import { createDataHook } from './createDataHook';
import { getDebtData, getCachedDebtData } from '../services/debtService';
export const useDebtData = createDataHook(getDebtData, getCachedDebtData);
