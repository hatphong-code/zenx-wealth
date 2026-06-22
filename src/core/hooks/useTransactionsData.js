import { createDataHook } from './createDataHook';
import { getTransactions, getCachedTransactions } from '../services/transactionService';

const DEFAULT = { currency: 'VND', transactions: [] };
export const useTransactionsData = createDataHook(getTransactions, getCachedTransactions, DEFAULT);
