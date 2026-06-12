import { useEffect, useState } from 'react';
import { getCachedDebts, getDebts } from '../services/debtService';

const defaultState = {
  currency: 'VND',
  debts: [],
  summary: {
    totalDebt: 0,
    badDebt: 0,
    monthlyPayment: 0,
    payoffProgress: 0,
    highestPriorityDebt: null,
  },
};

export function useDebtData(userId) {
  const [data, setData] = useState(defaultState);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    const cached = getCachedDebts(userId);
    if (cached) {
      setData(cached);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }

    let active = true;
    getDebts(userId, { forceFresh: true })
      .then((value) => {
        if (!active) return;
        setData(value);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load debts.');
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
