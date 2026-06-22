import { createDataHook } from './createDataHook';
import { getEmergencyFund, getCachedEmergencyFund } from '../services/emergencyFundService';

const DEFAULT = {
  settings: { currency: 'VND', monthlyEssentialExpense: 15000000, emergencyFundTargetMonths: 6 },
  records: [],
};
export const useEmergencyFundData = createDataHook(getEmergencyFund, getCachedEmergencyFund, DEFAULT);
