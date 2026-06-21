import { createDataHook } from './createDataHook';
import { getWeeklyReview, getCachedWeeklyReview, getCurrentWeekMeta } from '../services/weeklyReviewService';

export function useWeeklyReviewData(userId) {
  const weekMeta = getCurrentWeekMeta();
  return createDataHook(
    (uid) => getWeeklyReview(uid, weekMeta),
    (uid) => getCachedWeeklyReview(uid, weekMeta.weekKey)
  )(userId);
}
