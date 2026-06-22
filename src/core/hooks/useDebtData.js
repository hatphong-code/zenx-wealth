import { createDataHook } from './createDataHook';
import { getDebts, getCachedDebts } from '../services/debtService';
export const useDebtData = createDataHook(getDebts, getCachedDebts);
