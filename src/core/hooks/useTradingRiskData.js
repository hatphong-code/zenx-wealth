import { useEffect, useState } from 'react';
import { getCachedTradingRisk, getTradingRisk } from '../services/tradingRiskService';

const defaultState = {
  currency: 'VND',
  config: {
    capital: 0,
    dailyLossLimitPct: 3,
    weeklyLossLimitPct: 8,
    monthlyLossLimitPct: 15,
    profitWithdrawalPct: 30,
  },
  records: [],
  summary: {
    todayPnl: 0,
    weekPnl: 0,
    monthPnl: 0,
    totalRealizedPnl: 0,
    daily: { usedPct: 0, limitAmount: 0, status: 'No capital' },
    weekly: { usedPct: 0, limitAmount: 0, status: 'No capital' },
    monthly: { usedPct: 0, limitAmount: 0, status: 'No capital' },
    suggestedWithdrawal: 0,
  },
};

export function useTradingRiskData(userId) {
  const [data, setData] = useState(defaultState);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    const cached = getCachedTradingRisk(userId);
    if (cached) {
      setData(cached);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }

    let active = true;
    getTradingRisk(userId, { forceFresh: true })
      .then((value) => {
        if (!active) return;
        setData(value);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load trading risk.');
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
