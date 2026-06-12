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
