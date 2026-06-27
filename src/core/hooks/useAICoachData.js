import { useEffect, useState } from 'react';
import { getAICoach, getCachedAICoach } from '../services/aiCoachService';

const defaultState = {
  currency: 'VND',
  headline: '',
  focus: null,
  wins: [],
  watchouts: [],
  insights: [],
  actions: [],
};

export function useAICoachData(userId, locale) {
  const [data, setData] = useState(defaultState);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    const cached = getCachedAICoach(userId);
    if (cached) {
      setData(cached);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }

    let active = true;
    getAICoach(userId, { forceFresh: true, locale })
      .then((value) => {
        if (!active) return;
        setData(value);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load AI coach.');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      active = false;
    };
  }, [userId, locale]);

  return { data, setData, loading, refreshing, error, setError };
}
