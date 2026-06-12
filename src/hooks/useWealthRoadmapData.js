import { useEffect, useState } from 'react';
import { getCachedWealthRoadmap, getWealthRoadmap } from '../services/wealthRoadmapService';

const defaultState = {
  phases: [],
  currentPhaseId: '',
  completedPhases: 0,
  signals: {},
};

export function useWealthRoadmapData(userId) {
  const [data, setData] = useState(defaultState);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    const cached = getCachedWealthRoadmap(userId);
    if (cached) {
      setData(cached);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }

    let active = true;
    getWealthRoadmap(userId, { forceFresh: true })
      .then((value) => {
        if (!active) return;
        setData(value);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load roadmap.');
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
