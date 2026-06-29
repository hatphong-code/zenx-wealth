import { describe, expect, it } from 'vitest';
import { buildCoachState } from '../aiCoachService';
import { isFeatureEnabled, normalizeAccessControl } from '../accessControlService';
import { normalizeDashboardStats } from '../dashboardService';
import { normalizeReports } from '../reportsService';
import { normalizeWeeklyReview } from '../weeklyReviewService';

describe('service contracts', () => {
  it('normalizes dashboard snapshot shape with safe defaults', () => {
    expect(normalizeDashboardStats({ netCashFlow: 1200 })).toEqual({
      netCashFlow: 1200,
      income: 0,
      expense: 0,
      latteFactor: 0,
      latteFactorPercent: 0,
      emergencyMonths: 0,
      targetMonths: 6,
      payYourselfProgress: 0,
      payYourselfSaved: 0,
      payYourselfTarget: 0,
      bucketActuals: {
        emergencyFund: 0,
        longTermAsset: 0,
        businessLearning: 0,
        highRiskTrading: 0,
      },
      currency: 'VND',
    });
  });

  it('normalizes reports snapshot with nested defaults', () => {
    const normalized = normalizeReports({
      monthly: { netCashFlow: 5000 },
      insights: [{ title: 'Cash flow', body: 'Positive.' }],
    });

    expect(normalized.currency).toBe('VND');
    expect(normalized.monthly.netCashFlow).toBe(5000);
    expect(normalized.balanceSheet.netWorth).toBe(0);
    expect(normalized.trends.cashFlow).toEqual([]);
    expect(normalized.monthlyClose.latestNetWorthDelta).toBe(0);
    expect(normalized.insights).toHaveLength(1);
  });

  it('normalizes weekly review snapshot using fallback week meta', () => {
    const weekMeta = {
      weekKey: '2026-06-08',
      weekStart: new Date('2026-06-08T00:00:00.000Z'),
      weekEnd: new Date('2026-06-14T23:59:59.999Z'),
    };

    const normalized = normalizeWeeklyReview({}, weekMeta);

    expect(normalized.weekMeta).toBe(weekMeta);
    expect(normalized.review.currency).toBe('VND');
    expect(normalized.review.wealthDisciplineScore).toBe(0);
    expect(normalized.form).toEqual({
      oneLesson: '',
      oneActionNextWeek: '',
    });
  });

  it('builds urgent AI coach focus when cash flow is negative and risk is broken', () => {
    const coach = buildCoachState({
      profile: { settings: { currency: 'VND' } },
      locale: 'en',
      reports: {
        currency: 'VND',
        monthly: { netCashFlow: -1000, latteFactor: 200000 },
        balanceSheet: { netWorth: -5000, longTermAssets: 0 },
        growth: { incomeSources: 1 },
        risk: { dailyStatus: 'Stop', monthlyStatus: 'Healthy' },
        monthlyClose: { positiveMonths: 1, averageSavingsRate: 0.05 },
      },
      roadmap: {
        currentPhaseId: 'reset',
        phases: [{ id: 'reset', description: 'Reset the system.' }],
      },
    });

    expect(coach.focus.id).toBe('trading-cooldown');
    expect(coach.watchouts).toContain('Monthly cash flow is still negative.');
    expect(coach.actions.map((item) => item.id)).toContain('cash-flow-reset');
    expect(coach.insights).toHaveLength(3);
  });

  it('normalizes access control with feature defaults', () => {
    const normalized = normalizeAccessControl({
      features: {
        reports: { free: true },
      },
    });

    expect(normalized.features.dashboard).toEqual({ free: true, premium: true });
    expect(normalized.features.reports).toEqual({ free: true, premium: true });
    expect(normalized.features.ai_coach).toEqual({ free: false, premium: true });
  });

  it('checks feature access against subscription tier', () => {
    const accessControl = normalizeAccessControl({
      features: {
        reports: { free: false, premium: true },
      },
    });

    expect(isFeatureEnabled('reports', 'free', accessControl)).toBe(false);
    expect(isFeatureEnabled('reports', 'premium', accessControl)).toBe(true);
    expect(isFeatureEnabled('dashboard', 'free', accessControl)).toBe(true);
  });
});
