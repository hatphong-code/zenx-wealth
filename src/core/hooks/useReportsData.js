import { createDataHook } from './createDataHook';
import { getReports, getCachedReports } from '../services/reportsService';
export const useReportsData = createDataHook(getReports, getCachedReports);
