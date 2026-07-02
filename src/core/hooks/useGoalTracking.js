import { createDataHook } from './createDataHook';
import { getGoalTracking, getCachedGoalTracking } from '../services/goalTrackingService';

const DEFAULT = {
  profile: null,
  progress: null,
  latestCheck: null,
  lastUpdated: null,
};

export const useGoalTracking = createDataHook(
  (uid, options) => getGoalTracking(uid, options),
  (uid) => getCachedGoalTracking(uid),
  DEFAULT
);
