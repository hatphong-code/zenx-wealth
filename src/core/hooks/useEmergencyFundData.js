import { useEffect, useState } from 'react';
import { getCachedEmergencyFund, getEmergencyFund } from '../services/emergencyFundService';

const defaultState = {
  settings: {
    currency: 'VND',
    monthlyEssentialExpense: 15000000,
    emergencyFundTargetMonths: 6,
  },
  records: [],
};

export function useEmergencyFundData(userId) {
  const [data, setData] = useState(defaultState);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    const cached = getCachedEmergencyFund(userId);
    if (cached) {
      setData(cached);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }

    let active = true;

    getEmergencyFund(userId, { forceFresh: true })
      .then((value) => {
        if (!active) return;
        setData(value);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load emergency fund.');
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
