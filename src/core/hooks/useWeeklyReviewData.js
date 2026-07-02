import { createDataHook } from './createDataHook';
import { getWeeklyReview, getCachedWeeklyReview, getCurrentWeekMeta } from '../services/weeklyReviewService';

const DEFAULT = {
  weekMeta: null,
  review: { currency: 'VND', income: 0, expense: 0, latteFactorTotal: 0, savingsRate: 0, emergencyFundMonths: 0, wealthDisciplineScore: 0, topLatteCategory: '', previousCommitment: '' },
  form: { oneLesson: '', oneActionNextWeek: '', previousCommitmentStatus: null },
};

export function useWeeklyReviewData(userId) {
  const weekMeta = getCurrentWeekMeta();
  return createDataHook(
    (uid) => getWeeklyReview(uid, weekMeta),
    (uid) => getCachedWeeklyReview(uid, weekMeta.weekKey),
    DEFAULT
  )(userId);
}
