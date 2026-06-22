import { createDataHook } from './createDataHook';
import { getPayYourselfFirst, getCachedPayYourselfFirst } from '../services/payYourselfFirstService';
export const usePayYourselfFirstData = createDataHook(getPayYourselfFirst, getCachedPayYourselfFirst);
