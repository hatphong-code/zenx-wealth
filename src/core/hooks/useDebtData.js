import { createDataHook } from './createDataHook';
import { getDebts, getCachedDebts } from '../services/debtService';

const DEFAULT = {
  currency: 'VND',
  debts: [],
  summary: { totalDebt: 0, badDebt: 0, monthlyPayment: 0, payoffProgress: 0, highestPriorityDebt: null },
};
export const useDebtData = createDataHook(getDebts, getCachedDebts, DEFAULT);
