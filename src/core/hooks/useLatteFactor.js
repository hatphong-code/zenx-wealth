import { useEffect, useState } from 'react';
import { getCachedLatteFactor, getLatteFactor } from '../services/latteFactorService';

const defaultLatteData = {
  currency: 'VND',
  total: 0,
  topCategories: [],
  annualImpact: 0,
};

export function useLatteFactor(userId) {
  const [latteData, setLatteData] = useState(defaultLatteData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    const cached = getCachedLatteFactor(userId);
    if (cached) {
      setLatteData(cached);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }

    let active = true;

    getLatteFactor(userId, { forceFresh: true })
      .then((data) => {
        if (!active) return;
        setLatteData(data);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load Latte Factor data.');
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

  return { latteData, loading, refreshing, error };
}
