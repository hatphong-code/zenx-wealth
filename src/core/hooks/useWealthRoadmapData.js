import { createDataHook } from './createDataHook';
import { getWealthRoadmap, getCachedWealthRoadmap } from '../services/wealthRoadmapService';
export const useWealthRoadmapData = createDataHook(getWealthRoadmap, getCachedWealthRoadmap);
