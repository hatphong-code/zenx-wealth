import { describe, expect, it } from 'vitest';
import {
  buildBalanceSheet,
  buildEmergencyCoverageTrend,
  buildMonthlyCashFlowTrend,
  buildMonthlyCloseMetrics,
  calculateDashboardMetrics,
  calculateLatteMetrics,
  calculateWeeklyMetrics,
  estimateNetWorthTrend,
  normalizeLatteTopCategories,
  scoreFromSavingsRate,
} from '../financialCalculations';
import { computeRoadmapSignals, mergeRoadmapPhase } from '../roadmapCalculations';

describe('financialCalculations', () => {
  it('calculates dashboard metrics from same-currency records only', () => {
    const result = calculateDashboardMetrics({
      transactions: [
        { type: 'income', amount: 10000000, currency: 'VND' },
        { type: 'expense', amount: 3000000, currency: 'VND', isLatteFactor: false },
        { type: 'expense', amount: 500000, currency: 'VND', isLatteFactor: true },
        { type: 'income', amount: 200, currency: 'USD' },
      ],
      emergencyRecords: [
        { amount: 9000000, currency: 'VND' },
        { amount: 100, currency: 'USD' },
      ],
      currency: 'VND',
      payYourselfRate: 0.3,
      monthlyEssentialExpense: 1500000,
      emergencyFundTargetMonths: 6,
    });

    expect(result.netCashFlow).toBe(6500000);
    expect(result.latteFactor).toBe(500000);
    expect(result.emergencyMonths).toBe(6);
    expect(result.payYourselfTarget).toBe(3000000);
    expect(result.payYourselfSaved).toBe(6500000);
    expect(result.payYourselfProgress).toBe(100);
  });

  it('calculates latte metrics and sorts top categories', () => {
    const result = calculateLatteMetrics({
      currency: 'VND',
      transactions: [
        { amount: 70000, currency: 'VND', isLatteFactor: true, category: 'Coffee' },
        { amount: 120000, currency: 'VND', isLatteFactor: true, category: 'Delivery' },
        { amount: 30000, currency: 'VND', isLatteFactor: true, category: 'Coffee' },
        { amount: 10, currency: 'USD', isLatteFactor: true, category: 'Ignored' },
      ],
    });

    expect(result.total).toBe(220000);
    expect(result.annualImpact).toBe(2640000);
    expect(result.topCategories).toEqual([
      { category: 'Delivery', amount: 120000 },
      { category: 'Coffee', amount: 100000 },
    ]);
  });

  it('normalizes legacy latte tuple categories', () => {
    expect(normalizeLatteTopCategories([['Coffee', 100000], { category: 'Food', amount: 200000 }])).toEqual([
      { category: 'Coffee', amount: 100000 },
      { category: 'Food', amount: 200000 },
    ]);
  });

  it('calculates weekly metrics and discipline score', () => {
    const result = calculateWeeklyMetrics({
      transactions: [
        { type: 'income', amount: 5000000, currency: 'VND' },
        { type: 'expense', amount: 1500000, currency: 'VND', isLatteFactor: false, category: 'Bills' },
        { type: 'expense', amount: 300000, currency: 'VND', isLatteFactor: true, category: 'Coffee' },
      ],
      emergencyRecords: [{ amount: 6000000, currency: 'VND' }],
      currency: 'VND',
      monthlyEssentialExpense: 2000000,
    });

    expect(result.income).toBe(5000000);
    expect(result.expense).toBe(1800000);
    expect(result.latteFactorTotal).toBe(300000);
    expect(result.savingsRate).toBeCloseTo(0.64, 5);
    expect(result.emergencyFundMonths).toBe(3);
    expect(result.topLatteCategory).toBe('Coffee');
    expect(result.wealthDisciplineScore).toBe(70);
  });

  it('scores savings rate by thresholds', () => {
    expect(scoreFromSavingsRate(0.35)).toBe(90);
    expect(scoreFromSavingsRate(0.25)).toBe(75);
    expect(scoreFromSavingsRate(0.15)).toBe(60);
    expect(scoreFromSavingsRate(0.05)).toBe(40);
    expect(scoreFromSavingsRate(-0.1)).toBe(20);
  });

  it('builds monthly trends and monthly close metrics', () => {
    const cashFlowTrend = buildMonthlyCashFlowTrend({
      currency: 'VND',
      now: new Date('2026-06-15T00:00:00Z'),
      months: 3,
      transactions: [
        { type: 'income', amount: 1000, currency: 'VND', date: new Date('2026-04-03T00:00:00Z') },
        { type: 'expense', amount: 400, currency: 'VND', date: new Date('2026-04-10T00:00:00Z'), isLatteFactor: true },
        { type: 'income', amount: 1200, currency: 'VND', date: new Date('2026-05-03T00:00:00Z') },
        { type: 'expense', amount: 300, currency: 'VND', date: new Date('2026-05-10T00:00:00Z') },
        { type: 'income', amount: 1300, currency: 'VND', date: new Date('2026-06-03T00:00:00Z') },
        { type: 'expense', amount: 500, currency: 'VND', date: new Date('2026-06-10T00:00:00Z'), isLatteFactor: true },
      ],
    });

    expect(cashFlowTrend.map((item) => item.netCashFlow)).toEqual([600, 900, 800]);
    expect(cashFlowTrend.map((item) => item.latteFactor)).toEqual([400, 0, 500]);

    const monthlyClose = buildMonthlyCloseMetrics(cashFlowTrend);
    expect(monthlyClose.positiveMonths).toBe(3);
    expect(monthlyClose.averageNetCashFlow).toBeCloseTo(766.666, 2);
    expect(monthlyClose.bestMonth.label).toBe('May');
  });

  it('builds emergency coverage and estimated net worth trends', () => {
    const emergencyCoverage = buildEmergencyCoverageTrend({
      currency: 'VND',
      monthlyEssentialExpense: 500,
      now: new Date('2026-06-15T00:00:00Z'),
      months: 3,
      emergencyRecords: [
        { amount: 500, currency: 'VND', date: new Date('2026-04-01T00:00:00Z') },
        { amount: 500, currency: 'VND', date: new Date('2026-05-01T00:00:00Z') },
        { amount: 500, currency: 'VND', date: new Date('2026-06-01T00:00:00Z') },
      ],
    });

    expect(emergencyCoverage.map((item) => item.monthsCovered)).toEqual([1, 2, 3]);

    const balanceSheet = buildBalanceSheet({
      assetSummary: { totalAssets: 5000, liquidAssets: 1000, longTermAssets: 3000, riskAssets: 1000 },
      debtSummary: { totalDebt: 2000 },
      emergencyBalance: 1500,
    });

    expect(balanceSheet.netWorth).toBe(4500);

    const netWorthTrend = estimateNetWorthTrend({
      currentNetWorth: balanceSheet.netWorth,
      cashFlowTrend: [
        { key: '2026-04', label: 'Apr', netCashFlow: 300 },
        { key: '2026-05', label: 'May', netCashFlow: 500 },
        { key: '2026-06', label: 'Jun', netCashFlow: 700 },
      ],
    });

    expect(netWorthTrend.map((item) => item.estimatedNetWorth)).toEqual([3300, 3800, 4500]);
  });
});

describe('roadmapCalculations', () => {
  it('computes roadmap signals from dashboard, debt, and income state', () => {
    const signals = computeRoadmapSignals({
      profile: { settings: { monthlyEssentialExpense: 12000000 }, goal12Month: 'Target' },
      dashboard: {
        emergencyMonths: 6,
        netCashFlow: 1000000,
        payYourselfSaved: 3000000,
        payYourselfTarget: 3000000,
        latteFactor: 0,
      },
      debtsState: {
        debts: [{ isBadDebt: true, remainingAmount: 0 }],
      },
      incomeState: {
        incomeSources: [{}, {}],
        summary: { currentMonthlyIncome: 20000000 },
      },
    });

    expect(signals.goal_12m_defined).toBe(true);
    expect(signals.positive_cash_flow).toBe(true);
    expect(signals.no_new_bad_debt).toBe(true);
    expect(signals.emergency_6m).toBe(true);
    expect(signals.savings_rate_30).toBe(true);
    expect(signals.two_income_sources).toBe(true);
  });

  it('merges manual roadmap overrides over auto signals', () => {
    const phase = {
      id: 'phase-test',
      title: 'Phase',
      description: 'Desc',
      checklist: [
        { key: 'positive_cash_flow', label: 'Positive cash flow' },
        { key: 'accounts_separated', label: 'Accounts separated' },
      ],
    };

    const result = mergeRoadmapPhase(phase, {
      checklist: {
        positive_cash_flow: false,
      },
      notes: 'Manual check',
    }, {
      positive_cash_flow: true,
      accounts_separated: false,
    });

    expect(result.notes).toBe('Manual check');
    expect(result.checklist[0]).toMatchObject({
      key: 'positive_cash_flow',
      completed: false,
      autoValue: true,
      manualValue: false,
    });
    expect(result.checklist[1]).toMatchObject({
      key: 'accounts_separated',
      completed: false,
      autoValue: false,
    });
    expect(result.checklist[1]).not.toHaveProperty('manualValue');
    expect(result.completed).toBe(false);
  });
});
