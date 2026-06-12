import { useEffect, useState } from 'react';
import { getCachedPayYourselfFirst, getPayYourselfFirst } from '../services/payYourselfFirstService';

const defaultState = {
  currency: 'VND',
  allocationRule: {
    living: 55,
    emergencyFund: 15,
    longTermAsset: 15,
    businessLearning: 10,
    highRiskTrading: 5,
  },
  totalIncome: 0,
  allocations: [],
  status: {
    required: 0,
    done: 0,
    remaining: 0,
    progress: 0,
  },
};

export function usePayYourselfFirstData(userId) {
  const [data, setData] = useState(defaultState);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    const cached = getCachedPayYourselfFirst(userId);
    if (cached) {
      setData(cached);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }

    let active = true;
    getPayYourselfFirst(userId, { forceFresh: true })
      .then((value) => {
        if (!active) return;
        setData(value);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load Pay Yourself First data.');
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
