import { useEffect, useState } from 'react';
import { getCachedReports, getReports } from '../services/reportsService';

const defaultState = {
  currency: 'VND',
  monthly: {
    netCashFlow: 0,
    latteFactor: 0,
    emergencyMonths: 0,
    payYourselfProgress: 0,
    debtPressure: 0,
    assetBase: 0,
  },
  balanceSheet: {
    trackedAssets: 0,
    emergencyFund: 0,
    liquidAssets: 0,
    longTermAssets: 0,
    riskAssets: 0,
    totalAssets: 0,
    totalDebt: 0,
    netWorth: 0,
    debtToAssetRatio: 0,
  },
  weekly: {
    income: 0,
    expense: 0,
    latteFactorTotal: 0,
    savingsRate: 0,
    wealthDisciplineScore: 0,
  },
  roadmap: {
    currentPhaseId: '',
    completedPhases: 0,
    totalPhases: 0,
    nextMilestone: '',
  },
  growth: {
    incomeSources: 0,
    currentMonthlyIncome: 0,
    targetMonthlyIncome: 0,
    longTermAssets: 0,
    riskAssets: 0,
  },
  risk: {
    dailyStatus: 'No capital',
    weeklyStatus: 'No capital',
    monthlyStatus: 'No capital',
    todayPnl: 0,
    monthPnl: 0,
  },
  trends: {
    cashFlow: [],
    emergencyCoverage: [],
    netWorthEstimate: [],
  },
  monthlyClose: {
    positiveMonths: 0,
    averageNetCashFlow: 0,
    averageSavingsRate: 0,
    bestMonth: null,
    worstMonth: null,
    latestNetWorthDelta: 0,
  },
  insights: [],
};

export function useReportsData(userId) {
  const [data, setData] = useState(defaultState);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    const cached = getCachedReports(userId);
    if (cached) {
      setData(cached);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }

    let active = true;
    getReports(userId, { forceFresh: true })
      .then((value) => {
        if (!active) return;
        setData(value);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load reports.');
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
