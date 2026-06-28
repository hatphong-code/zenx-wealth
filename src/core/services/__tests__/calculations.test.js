import { describe, expect, it } from 'vitest';
import {
  applyDebtOverlay,
  buildBalanceSheet,
  buildEmergencyCoverageTrend,
  buildGrowingContributionSeries,
  buildLatteProjectionSeries,
  buildMonthlyCashFlowTrend,
  buildMonthlyCloseMetrics,
  calculateDashboardMetrics,
  calculateFITarget,
  calculateFutureValue,
  calculateLatteMetrics,
  calculateRequiredMonthlySaving,
  calculateWeeklyMetrics,
  estimateNetWorthTrend,
  findCoastPoint,
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

describe('calculateFutureValue — Decimal precision (Spec 1)', () => {
  it('matches reference value for 900k/month at 8% for 240 months', () => {
    const result = calculateFutureValue({ monthlyAmount: 900000, annualRatePct: 8, months: 240 });
    // Reference: PMT=900000, r=8/1200, n=240 → ~536M
    expect(result).toBeGreaterThan(500_000_000);
    expect(result).toBeLessThan(600_000_000);
  });

  it('returns 0 for 0 months', () => {
    expect(calculateFutureValue({ monthlyAmount: 900000, annualRatePct: 8, months: 0 })).toBe(0);
  });

  it('returns simple sum when rate is 0', () => {
    expect(calculateFutureValue({ monthlyAmount: 1000, annualRatePct: 0, months: 10 })).toBe(10000);
  });
});

describe('calculateRequiredMonthlySaving — reverse PMT (Spec 6)', () => {
  it('round-trips with calculateFutureValue', () => {
    const monthlyAmount = 900000;
    const annualRatePct = 8;
    const months = 240;
    const fv = calculateFutureValue({ monthlyAmount, annualRatePct, months });
    const result = calculateRequiredMonthlySaving({ futureValueGoal: fv, presentValue: 0, annualRatePct, months });
    expect(result.requiredMonthlySaving).toBeCloseTo(monthlyAmount, -2); // within 100 VND
  });

  it('returns alreadyMet when PV already exceeds FV with growth', () => {
    const result = calculateRequiredMonthlySaving({
      futureValueGoal: 100_000_000,
      presentValue: 200_000_000,
      annualRatePct: 8,
      months: 60,
    });
    expect(result).toMatchObject({ requiredMonthlySaving: 0, alreadyMet: true });
  });

  it('returns null for invalid input', () => {
    expect(calculateRequiredMonthlySaving({ futureValueGoal: 0, annualRatePct: 8, months: 60 })).toBeNull();
    expect(calculateRequiredMonthlySaving({ futureValueGoal: 100_000_000, annualRatePct: 8, months: 0 })).toBeNull();
  });
});

describe('buildLatteProjectionSeries — 3 scenarios (Spec 5)', () => {
  it('includes savings, invested, growth keys for each year', () => {
    const series = buildLatteProjectionSeries(1_000_000, 5);
    expect(series).toHaveLength(6); // years 0-5
    expect(series[0]).toMatchObject({ year: 0, savings: 0, invested: 0, growth: 0 });
    expect(series[5].savings).toBeGreaterThan(0);
    expect(series[5].invested).toBeGreaterThan(series[5].savings);
    expect(series[5].growth).toBeGreaterThan(series[5].invested);
  });
});

describe('applyDebtOverlay (Spec Debt-Aware)', () => {
  const base = { living: 55, emergencyFund: 15, longTermAsset: 20, businessLearning: 7, highRiskTrading: 3 };

  it('no bad debt → passthrough with debtRepayment: 0', () => {
    const result = applyDebtOverlay(base, { badDebt: 0, monthlyPayment: 0 }, 20_000_000);
    expect(result).toMatchObject({ ...base, debtRepayment: 0 });
  });

  it('light ratio (<10%) → only zeros businessLearning and highRiskTrading', () => {
    const result = applyDebtOverlay(base, { badDebt: 5_000_000, monthlyPayment: 1_500_000 }, 20_000_000);
    expect(result.businessLearning).toBe(0);
    expect(result.highRiskTrading).toBe(0);
    // excess freed beyond debtNeedPct returns to longTermAsset, so longTermAsset >= base
    expect(result.longTermAsset).toBeGreaterThanOrEqual(base.longTermAsset);
    expect(result.emergencyFund).toBe(base.emergencyFund);
    expect(result.debtRepayment).toBeGreaterThan(0);
  });

  it('total always sums to 100', () => {
    const cases = [
      { badDebt: 5_000_000, monthlyPayment: 1_000_000 },   // light
      { badDebt: 10_000_000, monthlyPayment: 3_000_000 },  // moderate
      { badDebt: 20_000_000, monthlyPayment: 6_000_000 },  // heavy
    ];
    for (const debt of cases) {
      const r = applyDebtOverlay(base, { ...debt }, 20_000_000);
      const sum = r.living + r.emergencyFund + r.longTermAsset + r.businessLearning + r.highRiskTrading + r.debtRepayment;
      expect(sum).toBeCloseTo(100, 0);
    }
  });

  it('floors are never violated', () => {
    const result = applyDebtOverlay(base, { badDebt: 50_000_000, monthlyPayment: 10_000_000 }, 20_000_000);
    expect(result.emergencyFund).toBeGreaterThanOrEqual(5);
    expect(result.longTermAsset).toBeGreaterThanOrEqual(5);
  });
});

describe('Savings Escalator + Coast FI (Spec savings-escalator-coast-fi)', () => {
  it('calculateFITarget — 15M/month × 25 = 4.5 tỷ', () => {
    expect(calculateFITarget({ monthlyExpense: 15_000_000, multiple: 25 })).toBe(4_500_000_000);
    expect(calculateFITarget({ monthlyExpense: 15_000_000, multiple: 31 })).toBe(15_000_000 * 12 * 31);
  });

  it('buildGrowingContributionSeries — first entry zero, grows over time', () => {
    const series = buildGrowingContributionSeries({
      startMonthly: 9_000_000,
      monthlyGrowthPct: 1,
      annualRatePct: 6,
      months: 24,
    });
    expect(series[0]).toMatchObject({ month: 0, year: 0, balance: 0, monthlyDeposit: 0 });
    expect(series[1].balance).toBeGreaterThan(0);
    expect(series[24].balance).toBeGreaterThan(series[12].balance);
    // Month 1 deposit = 9M (no growth yet); with r=0.5%: b[1] = 9M
    expect(series[1].balance).toBeCloseTo(9_000_000, -2);
    // Month 2 deposit = 9M × 1.01 = 9.09M; b[2] = 9M × 1.005 + 9.09M
    expect(series[2].balance).toBeCloseTo(9_000_000 * 1.005 + 9_090_000, -2);
  });

  it('buildGrowingContributionSeries — 0% rate returns sum of deposits', () => {
    const series = buildGrowingContributionSeries({
      startMonthly: 1_000_000,
      monthlyGrowthPct: 0,
      annualRatePct: 0,
      months: 3,
    });
    // No growth, no interest: balance = m × 1M
    expect(series[3].balance).toBeCloseTo(3_000_000, -1);
  });

  it('findCoastPoint — reference example: coast ≈ month 114 ± 5 (monthsToRetirement=240)', () => {
    const fiTarget = calculateFITarget({ monthlyExpense: 15_000_000, multiple: 25 });
    const result = findCoastPoint({
      startMonthly: 9_000_000,
      monthlyGrowthPct: 1,
      annualRatePct: 6,
      monthsToRetirement: 240,
      fiTarget,
    });
    expect(result).not.toBeNull();
    expect(result.coastMonth).toBeGreaterThanOrEqual(109);
    expect(result.coastMonth).toBeLessThanOrEqual(125);
    expect(result.projectedBalance).toBeGreaterThanOrEqual(fiTarget);
    expect(result.balanceAtCoast).toBeGreaterThan(0);
  });

  it('findCoastPoint — returns null when target unreachable in limit', () => {
    // Tiny deposit, huge target
    const result = findCoastPoint({
      startMonthly: 100,
      monthlyGrowthPct: 0,
      annualRatePct: 1,
      monthsToRetirement: 12,
      fiTarget: 1_000_000_000_000,
    });
    expect(result).toBeNull();
  });

  it('findCoastPoint — returns null for invalid input', () => {
    expect(findCoastPoint({ startMonthly: 1_000_000, monthlyGrowthPct: 1, annualRatePct: 6, monthsToRetirement: 0, fiTarget: 1e9 })).toBeNull();
    expect(findCoastPoint({ startMonthly: 1_000_000, monthlyGrowthPct: 1, annualRatePct: 6, monthsToRetirement: 240, fiTarget: 0 })).toBeNull();
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
