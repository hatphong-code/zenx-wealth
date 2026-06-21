import { createDataHook } from './createDataHook';
import { getTransactions, getCachedTransactions } from '../services/transactionService';
export const useTransactionsData = createDataHook(getTransactions, getCachedTransactions);
