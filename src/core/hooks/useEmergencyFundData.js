import { createDataHook } from './createDataHook';
import { getEmergencyFund, getCachedEmergencyFund } from '../services/emergencyFundService';
export const useEmergencyFundData = createDataHook(getEmergencyFund, getCachedEmergencyFund);
