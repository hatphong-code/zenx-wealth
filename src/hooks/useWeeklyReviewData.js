import { useEffect, useState } from 'react';
import { getCachedWeeklyReview, getCurrentWeekMeta, getWeeklyReview } from '../services/weeklyReviewService';

const defaultState = {
  weekMeta: getCurrentWeekMeta(),
  review: {
    currency: 'VND',
    income: 0,
    expense: 0,
    latteFactorTotal: 0,
    savingsRate: 0,
    emergencyFundMonths: 0,
    wealthDisciplineScore: 0,
    topLatteCategory: '',
  },
  form: {
    oneLesson: '',
    oneActionNextWeek: '',
  },
};

export function useWeeklyReviewData(userId) {
  const [data, setData] = useState(defaultState);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    const weekMeta = getCurrentWeekMeta();
    const cached = getCachedWeeklyReview(userId, weekMeta.weekKey);
    if (cached) {
      setData(cached);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }

    let active = true;

    getWeeklyReview(userId, weekMeta, { forceFresh: true })
      .then((value) => {
        if (!active) return;
        setData(value);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load weekly review.');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return { data, setData, loading, refreshing, error, setError };
}
