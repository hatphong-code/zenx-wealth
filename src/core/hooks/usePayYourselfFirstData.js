import { createDataHook } from './createDataHook';
import { getPayYourselfFirstData, getCachedPayYourselfFirstData } from '../services/payYourselfFirstService';
export const usePayYourselfFirstData = createDataHook(getPayYourselfFirstData, getCachedPayYourselfFirstData);
