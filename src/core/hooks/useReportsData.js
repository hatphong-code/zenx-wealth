import { createDataHook } from './createDataHook';
import { getReports, getCachedReports, normalizeReports } from '../services/reportsService';

export const useReportsData = createDataHook(getReports, getCachedReports, normalizeReports({}));
