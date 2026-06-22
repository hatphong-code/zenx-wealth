import { createDataHook } from './createDataHook';
import { getPayYourselfFirst, getCachedPayYourselfFirst } from '../services/payYourselfFirstService';

const DEFAULT = {
  currency: 'VND',
  allocationRule: { living: 55, emergencyFund: 15, longTermAsset: 15, businessLearning: 10, highRiskTrading: 5 },
  totalIncome: 0,
  allocations: [],
  status: { required: 0, done: 0, remaining: 0, progress: 0 },
};
export const usePayYourselfFirstData = createDataHook(getPayYourselfFirst, getCachedPayYourselfFirst, DEFAULT);
