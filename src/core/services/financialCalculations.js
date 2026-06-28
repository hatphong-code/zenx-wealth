import Decimal from 'decimal.js';

export function calculateDashboardMetrics({
  transactions = [],
  emergencyRecords = [],
  currency = 'VND',
  payYourselfRate = 0.3,
  monthlyEssentialExpense = 15000000,
  emergencyFundTargetMonths = 6,
}) {
  let totalIncome = 0;
  let totalExpense = 0;
  let latteTotal = 0;
  let emergencyBalance = 0;

  for (const item of transactions) {
    if (item.currency && item.currency !== currency) continue;

    if (item.type === 'income') {
      totalIncome += Number(item.amount || 0);
      continue;
    }

    totalExpense += Number(item.amount || 0);
    if (item.isLatteFactor) {
      latteTotal += Number(item.amount || 0);
    }
  }

  for (const item of emergencyRecords) {
    if (item.currency && item.currency !== currency) continue;
    emergencyBalance += Number(item.amount || 0);
  }

  const netCashFlow = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? netCashFlow / totalIncome : 0;
  const payYourselfTarget = totalIncome * payYourselfRate;
  const payYourselfSaved = totalIncome * savingsRate;
  const emergencyMonths = monthlyEssentialExpense > 0 ? emergencyBalance / monthlyEssentialExpense : 0;
  const payYourselfProgress = payYourselfTarget > 0
    ? Math.max(0, Math.min(100, Math.round((payYourselfSaved / payYourselfTarget) * 100)))
    : 0;

  return {
    netCashFlow,
    income: totalIncome,
    expense: totalExpense,
    latteFactor: latteTotal,
    latteFactorPercent: 0,
    emergencyMonths,
    targetMonths: emergencyFundTargetMonths,
    payYourselfProgress,
    payYourselfSaved,
    payYourselfTarget,
    currency,
  };
}

export function normalizeLatteTopCategories(topCategories = []) {
  return Array.isArray(topCategories)
    ? topCategories
        .map((item) => {
          if (Array.isArray(item)) {
            return {
              category: item[0] || '',
              amount: item[1] || 0,
            };
          }

          if (item && typeof item === 'object') {
            return {
              category: item.category || '',
              amount: item.amount || 0,
            };
          }

          return null;
        })
        .filter(Boolean)
    : [];
}

export function calculateLatteMetrics({ transactions = [], currency = 'VND' }) {
  const categories = new Map();
  let total = 0;

  for (const item of transactions) {
    if (item.currency && item.currency !== currency) continue;
    if (!item.isLatteFactor) continue;

    total += Number(item.amount || 0);
    categories.set(item.category, (categories.get(item.category) || 0) + Number(item.amount || 0));
  }

  return {
    currency,
    total,
    annualImpact: total * 12,
    topCategories: Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, amount]) => ({ category, amount })),
  };
}

export function scoreFromSavingsRate(savingsRate) {
  if (savingsRate >= 0.3) return 90;
  if (savingsRate >= 0.2) return 75;
  if (savingsRate >= 0.1) return 60;
  if (savingsRate >= 0) return 40;
  return 20;
}

export function calculateWeeklyMetrics({
  transactions = [],
  emergencyRecords = [],
  currency = 'VND',
  monthlyEssentialExpense = 15000000,
}) {
  let income = 0;
  let expense = 0;
  let latteFactorTotal = 0;
  let emergencyBalance = 0;
  const latteCategories = new Map();

  for (const item of transactions) {
    if (item.currency && item.currency !== currency) continue;

    if (item.type === 'income') {
      income += Number(item.amount || 0);
      continue;
    }

    expense += Number(item.amount || 0);
    if (item.isLatteFactor) {
      latteFactorTotal += Number(item.amount || 0);
      latteCategories.set(item.category, (latteCategories.get(item.category) || 0) + Number(item.amount || 0));
    }
  }

  for (const item of emergencyRecords) {
    if (item.currency && item.currency !== currency) continue;
    emergencyBalance += Number(item.amount || 0);
  }

  const savingsRate = income > 0 ? Math.max(-1, (income - expense) / income) : 0;
  const emergencyFundMonths = monthlyEssentialExpense > 0 ? emergencyBalance / monthlyEssentialExpense : 0;
  const topLatteCategory = Array.from(latteCategories.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  const wealthDisciplineScore = Math.round(
    (scoreFromSavingsRate(savingsRate) + Math.min(100, Math.round((emergencyFundMonths / 6) * 100))) / 2
  );

  return {
    currency,
    income,
    expense,
    latteFactorTotal,
    savingsRate,
    emergencyFundMonths,
    wealthDisciplineScore,
    topLatteCategory,
  };
}

function monthKeyFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

function toDateValue(value) {
  if (!value) return null;
  return value?.toDate ? value.toDate() : new Date(value);
}

function buildMonthFrames(months = 6, now = new Date()) {
  return Array.from({ length: months }, (_, index) => {
    const offset = months - index - 1;
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return {
      key: monthKeyFromDate(start),
      label: monthLabel(start),
      start,
      end,
    };
  });
}

export function buildMonthlyCashFlowTrend({ transactions = [], currency = 'VND', months = 6, now = new Date() }) {
  const frames = buildMonthFrames(months, now).map((frame) => ({
    ...frame,
    income: 0,
    expense: 0,
    latteFactor: 0,
    netCashFlow: 0,
  }));

  const indexByKey = Object.fromEntries(frames.map((frame) => [frame.key, frame]));

  for (const item of transactions) {
    if (item.currency && item.currency !== currency) continue;
    const date = toDateValue(item.date);
    if (!date) continue;
    const frame = indexByKey[monthKeyFromDate(date)];
    if (!frame) continue;

    const amount = Number(item.amount || 0);
    if (item.type === 'income') {
      frame.income += amount;
    } else {
      frame.expense += amount;
      if (item.isLatteFactor) {
        frame.latteFactor += amount;
      }
    }
  }

  return frames.map((frame) => ({
    key: frame.key,
    label: frame.label,
    income: frame.income,
    expense: frame.expense,
    latteFactor: frame.latteFactor,
    netCashFlow: frame.income - frame.expense,
  }));
}

export function buildEmergencyCoverageTrend({
  emergencyRecords = [],
  currency = 'VND',
  monthlyEssentialExpense = 15000000,
  months = 6,
  now = new Date(),
}) {
  const frames = buildMonthFrames(months, now);
  const records = emergencyRecords
    .filter((item) => !item.currency || item.currency === currency)
    .map((item) => ({
      amount: Number(item.amount || 0),
      date: toDateValue(item.date),
    }))
    .filter((item) => item.date)
    .sort((left, right) => left.date - right.date);

  let runningBalance = 0;
  let recordIndex = 0;

  return frames.map((frame) => {
    while (recordIndex < records.length && records[recordIndex].date <= frame.end) {
      runningBalance += records[recordIndex].amount;
      recordIndex += 1;
    }

    return {
      key: frame.key,
      label: frame.label,
      balance: runningBalance,
      monthsCovered: monthlyEssentialExpense > 0 ? runningBalance / monthlyEssentialExpense : 0,
    };
  });
}

export function buildBalanceSheet({
  assetSummary = {},
  debtSummary = {},
  emergencyBalance = 0,
}) {
  const trackedAssets = Number(assetSummary.totalAssets || 0);
  const totalDebt = Number(debtSummary.totalDebt || 0);
  const liquidAssets = Number(assetSummary.liquidAssets || 0) + Number(emergencyBalance || 0);
  const longTermAssets = Number(assetSummary.longTermAssets || 0);
  const riskAssets = Number(assetSummary.riskAssets || 0);
  const totalAssets = trackedAssets + Number(emergencyBalance || 0);
  const netWorth = totalAssets - totalDebt;

  return {
    trackedAssets,
    emergencyFund: Number(emergencyBalance || 0),
    liquidAssets,
    longTermAssets,
    riskAssets,
    totalAssets,
    totalDebt,
    netWorth,
    debtToAssetRatio: totalAssets > 0 ? totalDebt / totalAssets : 0,
  };
}

export function estimateNetWorthTrend({ currentNetWorth = 0, cashFlowTrend = [] }) {
  const estimatedValues = new Array(cashFlowTrend.length).fill(Number(currentNetWorth || 0));

  for (let index = cashFlowTrend.length - 2; index >= 0; index -= 1) {
    estimatedValues[index] = estimatedValues[index + 1] - Number(cashFlowTrend[index + 1]?.netCashFlow || 0);
  }

  return cashFlowTrend.map((item, index) => ({
    key: item.key,
    label: item.label,
    estimatedNetWorth: estimatedValues[index],
  }));
}

export function calculateFutureValue({ monthlyAmount, annualRatePct, months }) {
  if (!monthlyAmount || months <= 0) return 0;
  const r = new Decimal(annualRatePct).div(100).div(12);
  const PMT = new Decimal(monthlyAmount);
  const N = new Decimal(months);
  if (r.isZero()) return PMT.times(N).toNumber();
  // FV = PMT × ((1+r)^N − 1) / r
  const growth = r.plus(1).pow(N);
  return PMT.times(growth.minus(1)).div(r).toNumber();
}

// Spec 6: reverse PMT — "how much/month do I need to save?"
// Returns { requiredMonthlySaving: number } | { requiredMonthlySaving: 0, alreadyMet: true } | null
export function calculateRequiredMonthlySaving({ futureValueGoal, presentValue = 0, annualRatePct, months }) {
  if (!futureValueGoal || months <= 0 || annualRatePct == null) return null;
  const FV = new Decimal(futureValueGoal);
  const PV = new Decimal(presentValue || 0);
  const r = new Decimal(annualRatePct).div(100).div(12);
  const N = new Decimal(months);

  const growthFactor = r.plus(1).pow(N);
  // PV compounded to end of period
  const pvFuture = PV.times(growthFactor);
  if (pvFuture.gte(FV)) return { requiredMonthlySaving: 0, alreadyMet: true };

  const remaining = FV.minus(pvFuture);
  if (r.isZero()) return { requiredMonthlySaving: remaining.div(N).toNumber() };

  // PMT = remaining / ((1+r)^N - 1) * r
  const pmt = remaining.times(r).div(growthFactor.minus(1));
  return { requiredMonthlySaving: pmt.toNumber() };
}

export function buildLatteProjectionSeries(monthlyAmount, years = 20) {
  return Array.from({ length: years + 1 }, (_, year) => ({
    year,
    savings: calculateFutureValue({ monthlyAmount, annualRatePct: 3, months: year * 12 }),
    invested: calculateFutureValue({ monthlyAmount, annualRatePct: 8, months: year * 12 }),
    growth: calculateFutureValue({ monthlyAmount, annualRatePct: 11, months: year * 12 }),
  }));
}

// Savings Escalator + Coast FI (Spec savings-escalator-coast-fi)

export function buildGrowingContributionSeries({ startMonthly, monthlyGrowthPct, annualRatePct, months }) {
  const r = new Decimal(annualRatePct).div(100).div(12);
  const g = new Decimal(monthlyGrowthPct).div(100);
  const series = [{ month: 0, year: 0, balance: 0, monthlyDeposit: 0 }];
  let balance = new Decimal(0);

  for (let m = 1; m <= months; m++) {
    const deposit = new Decimal(startMonthly).times(g.plus(1).pow(m - 1));
    balance = balance.times(r.plus(1)).plus(deposit);
    series.push({
      month: m,
      year: parseFloat((m / 12).toFixed(4)),
      balance: balance.toNumber(),
      monthlyDeposit: deposit.toNumber(),
    });
  }

  return series;
}

export function calculateFITarget({ monthlyExpense, multiple = 25 }) {
  return new Decimal(monthlyExpense).times(12).times(multiple).toNumber();
}

// Returns { coastMonth, balanceAtCoast, projectedBalance } or null if not found within limit
export function findCoastPoint({ startMonthly, monthlyGrowthPct, annualRatePct, monthsToRetirement, fiTarget }) {
  if (!monthsToRetirement || monthsToRetirement <= 0 || !fiTarget) return null;

  const r = new Decimal(annualRatePct).div(100).div(12);
  const g = new Decimal(monthlyGrowthPct).div(100);
  const FI = new Decimal(fiTarget);
  const limit = Math.min(monthsToRetirement, 600);

  let balance = new Decimal(0);

  for (let m = 1; m <= limit; m++) {
    const deposit = new Decimal(startMonthly).times(g.plus(1).pow(m - 1));
    balance = balance.times(r.plus(1)).plus(deposit);

    const remaining = monthsToRetirement - m;
    if (remaining <= 0) continue;

    const projected = balance.times(r.plus(1).pow(remaining));
    if (projected.gte(FI)) {
      return {
        coastMonth: m,
        balanceAtCoast: balance.toNumber(),
        projectedBalance: projected.toNumber(),
      };
    }
  }

  return null;
}

// Spec Debt-Aware Allocation Overlay
// Floors PROPOSED — pending Hà Phong confirmation (see spec-debt-aware-allocation-overlay.md):
//   emergencyFund floor: 5%  (mid_career already uses 5%; any less breaks emergency habit)
//   longTermAsset floor: 5%  (matches student template minimum; keeps investing habit alive)
//   businessLearning, highRiskTrading: 0  (speculative/discretionary, safe to zero)
// Tier ratios PROPOSED:
//   Moderate (10-25%): take 50% of longTermAsset headroom above floor
//   Heavy (>25%): zero out longTermAsset to floor + take 33% of emergencyFund headroom above floor
export function applyDebtOverlay(baseAllocation, debtSummary, monthlyIncome) {
  if (!debtSummary?.badDebt || debtSummary.badDebt <= 0) {
    return { ...baseAllocation, debtRepayment: 0 };
  }

  const FLOOR_EMERGENCY = 5;
  const FLOOR_LONG_TERM = 5;

  let { living, emergencyFund, longTermAsset, businessLearning, highRiskTrading } = baseAllocation;
  const debtRatio = monthlyIncome > 0 ? (debtSummary.monthlyPayment / monthlyIncome) : 0;
  const debtNeedPct = Math.min(debtRatio * 100, 100 - living - FLOOR_EMERGENCY - FLOOR_LONG_TERM);

  // Step 1: always zero businessLearning + highRiskTrading (most discretionary)
  let freed = businessLearning + highRiskTrading;
  businessLearning = 0;
  highRiskTrading = 0;

  // Step 2: moderate tier — take up to 50% of longTermAsset headroom
  if (debtRatio >= 0.10 && freed < debtNeedPct) {
    const headroom = Math.max(0, longTermAsset - FLOOR_LONG_TERM);
    const fraction = debtRatio < 0.25 ? 0.5 : 1.0; // heavy tier: take full headroom
    const take = Math.min(headroom * fraction, debtNeedPct - freed);
    longTermAsset -= take;
    freed += take;
  }

  // Step 3: heavy tier — additionally take 33% of emergencyFund headroom
  if (debtRatio >= 0.25 && freed < debtNeedPct) {
    const headroom = Math.max(0, emergencyFund - FLOOR_EMERGENCY);
    const take = Math.min(headroom * 0.33, debtNeedPct - freed);
    emergencyFund -= take;
    freed += take;
  }

  // Cap debtRepayment at actual debt need; return excess to longTermAsset
  const debtRepayment = Math.min(freed, debtNeedPct);
  const excess = freed - debtRepayment;
  longTermAsset += excess;

  return {
    living: Math.round(living * 10) / 10,
    emergencyFund: Math.round(emergencyFund * 10) / 10,
    longTermAsset: Math.round(longTermAsset * 10) / 10,
    businessLearning: Math.round(businessLearning * 10) / 10,
    highRiskTrading: Math.round(highRiskTrading * 10) / 10,
    debtRepayment: Math.round(debtRepayment * 10) / 10,
  };
}

export function buildMonthlyCloseMetrics(cashFlowTrend = []) {
  const positiveMonths = cashFlowTrend.filter((item) => item.netCashFlow > 0).length;
  const averageNetCashFlow = cashFlowTrend.length > 0
    ? cashFlowTrend.reduce((sum, item) => sum + Number(item.netCashFlow || 0), 0) / cashFlowTrend.length
    : 0;
  const bestMonth = [...cashFlowTrend].sort((left, right) => right.netCashFlow - left.netCashFlow)[0] || null;
  const worstMonth = [...cashFlowTrend].sort((left, right) => left.netCashFlow - right.netCashFlow)[0] || null;
  const averageSavingsRate = cashFlowTrend.length > 0
    ? cashFlowTrend.reduce((sum, item) => {
        const income = Number(item.income || 0);
        return sum + (income > 0 ? Number(item.netCashFlow || 0) / income : 0);
      }, 0) / cashFlowTrend.length
    : 0;

  return {
    positiveMonths,
    averageNetCashFlow,
    averageSavingsRate,
    bestMonth,
    worstMonth,
  };
}
