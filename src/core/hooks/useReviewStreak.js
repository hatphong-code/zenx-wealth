import { createDataHook } from './createDataHook';
import { getReviewStreak, getCachedReviewStreak } from '../services/reviewStreakService';

export function useReviewStreak(userId) {
  return createDataHook(
    (uid, options) => getReviewStreak(uid, options),
    (uid) => getCachedReviewStreak(uid),
    { streak: 0 }
  )(userId);
}
