export const roadmapPhases = [
  {
    id: 'phase-0-reset',
    title: 'Phase 0 — Reset',
    description: 'Set the baseline so the rest of the system has trustworthy inputs.',
    checklist: [
      { key: 'assets_recorded', label: 'Assets entered' },
      { key: 'debts_recorded', label: 'Debts entered' },
      { key: 'essential_expenses_recorded', label: 'Monthly essential expense entered' },
      { key: 'income_recorded', label: 'Income entered' },
      { key: 'goal_12m_defined', label: '12-month goal defined' },
    ],
  },
  {
    id: 'phase-1-audit',
    title: 'Phase 1 — Audit',
    description: 'Build visibility through transaction discipline and leakage detection.',
    checklist: [
      { key: 'transactions_30d', label: '30 days of spending recorded' },
      { key: 'latte_identified', label: 'Latte Factor identified' },
      { key: 'savings_rate_known', label: 'Savings rate known' },
      { key: 'cash_flow_known', label: 'Cash flow known' },
    ],
  },
  {
    id: 'phase-2-stabilize',
    title: 'Phase 2 — Stabilize',
    description: 'Stop new damage and get the base system under control.',
    checklist: [
      { key: 'positive_cash_flow', label: 'Positive cash flow' },
      { key: 'no_new_bad_debt', label: 'No new bad debt' },
      { key: 'accounts_separated', label: 'Money accounts separated' },
      { key: 'emergency_1m', label: 'Emergency fund reached 1 month' },
    ],
  },
  {
    id: 'phase-3-build-base',
    title: 'Phase 3 — Build Base',
    description: 'Turn discipline into durable capital formation.',
    checklist: [
      { key: 'emergency_3m', label: 'Emergency fund reached 3 months' },
      { key: 'auto_investing_started', label: 'Automatic investing started' },
      { key: 'first_side_income', label: 'First side income source active' },
    ],
  },
  {
    id: 'phase-4-accelerate',
    title: 'Phase 4 — Accelerate',
    description: 'Increase resilience and add earning power.',
    checklist: [
      { key: 'emergency_6m', label: 'Emergency fund reached 6 months' },
      { key: 'savings_rate_30', label: 'Savings rate 30%+' },
      { key: 'two_income_sources', label: 'At least 2 income sources' },
    ],
  },
  {
    id: 'phase-5-expand',
    title: 'Phase 5 — Expand',
    description: 'Build scale beyond stability.',
    checklist: [
      { key: 'emergency_12m', label: 'Emergency fund reached 12 months' },
      { key: 'long_term_assets', label: 'Long-term investment assets active' },
      { key: 'three_income_sources', label: 'At least 3 income sources' },
    ],
  },
];
