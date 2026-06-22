import { createDataHook } from './createDataHook';
import { getWealthRoadmap, getCachedWealthRoadmap } from '../services/wealthRoadmapService';

const DEFAULT = { phases: [], currentPhaseId: null, completedPhases: 0, signals: {} };
export const useWealthRoadmapData = createDataHook(getWealthRoadmap, getCachedWealthRoadmap, DEFAULT);
