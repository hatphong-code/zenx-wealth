export function computeRoadmapSignals({ profile, dashboard, debtsState, incomeState, assetsState }) {
  const safeAssetsState = assetsState || { accounts: [], summary: { longTermAssets: 0 } };
  const monthlyEssentialExpense = Number(profile.settings?.monthlyEssentialExpense || 0);
  const emergencyMonths = Number(dashboard.emergencyMonths || 0);
  const positiveCashFlow = Number(dashboard.netCashFlow || 0) > 0;
  const savingsRatePct = Number(dashboard.payYourselfTarget || 0) > 0
    ? Number(dashboard.payYourselfSaved || 0) / Number(dashboard.payYourselfTarget || 1)
    : 0;
  const badDebtCount = debtsState.debts.filter((item) => item.isBadDebt && Number(item.remainingAmount || 0) > 0).length;
  const incomeSources = incomeState.incomeSources.length;
  const assetAccounts = safeAssetsState.accounts.length;
  const longTermAssets = Number(safeAssetsState.summary.longTermAssets || 0);

  return {
    assets_recorded: assetAccounts > 0,
    debts_recorded: debtsState.debts.length > 0,
    essential_expenses_recorded: monthlyEssentialExpense > 0,
    income_recorded: incomeState.summary.currentMonthlyIncome > 0,
    goal_12m_defined: Boolean(profile.goal12Month),
    transactions_30d: true,
    latte_identified: Number(dashboard.latteFactor || 0) >= 0,
    savings_rate_known: true,
    cash_flow_known: true,
    positive_cash_flow: positiveCashFlow,
    no_new_bad_debt: badDebtCount === 0,
    accounts_separated: assetAccounts >= 2,
    emergency_1m: emergencyMonths >= 1,
    emergency_3m: emergencyMonths >= 3,
    auto_investing_started: false,
    first_side_income: incomeSources >= 1,
    emergency_6m: emergencyMonths >= 6,
    savings_rate_30: savingsRatePct >= 1,
    two_income_sources: incomeSources >= 2,
    emergency_12m: emergencyMonths >= 12,
    long_term_assets: longTermAssets > 0,
    three_income_sources: incomeSources >= 3,
  };
}

export function mergeRoadmapPhase(phase, storedState, signals) {
  const checklist = phase.checklist.map((item) => {
    const manualValue = storedState.checklist?.[item.key];
    const autoValue = Boolean(signals[item.key]);
    const completed = typeof manualValue === 'boolean' ? manualValue : autoValue;
    const nextItem = {
      ...item,
      completed,
      autoValue,
    };

    if (typeof manualValue === 'boolean') {
      nextItem.manualValue = manualValue;
    }

    return nextItem;
  });

  return {
    ...phase,
    notes: storedState.notes || '',
    checklist,
    completed: checklist.every((item) => item.completed),
  };
}
