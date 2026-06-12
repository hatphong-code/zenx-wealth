import { useEffect, useState } from 'react';
import { getCachedDashboardStats, getDashboardStats } from '../services/dashboardService';

const defaultStats = {
  netCashFlow: 0,
  latteFactor: 0,
  latteFactorPercent: 0,
  emergencyMonths: 0,
  targetMonths: 6,
  payYourselfProgress: 0,
  payYourselfSaved: 0,
  payYourselfTarget: 0,
  currency: 'VND',
};

export function useDashboardStats(userId) {
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    const cached = getCachedDashboardStats(userId);
    if (cached) {
      setStats(cached);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }

    let active = true;

    getDashboardStats(userId, { forceFresh: true })
      .then((data) => {
        if (!active) return;
        setStats(data);
        setError('');
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError.message || 'Failed to load dashboard stats.');
        console.error('Error fetching dashboard stats:', fetchError);
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

  return { stats, loading, refreshing, error };
}
