export function computeHealthScore(reports) {
  const netCashFlow = reports.monthly?.netCashFlow ?? 0;
  const cashFlowScore =
    netCashFlow >= 0 ? 25
    : netCashFlow >= -2000000 ? 15
    : netCashFlow >= -5000000 ? 8
    : 0;

  const savingsRate = reports.monthlyClose?.averageSavingsRate ?? 0;
  const savingsScore =
    savingsRate >= 0.3 ? 25
    : savingsRate >= 0.2 ? 20
    : savingsRate >= 0.1 ? 12
    : savingsRate > 0 ? 5
    : 0;

  const emergencyMonths = reports.monthly?.emergencyMonths ?? 0;
  const emergencyScore =
    emergencyMonths >= 6 ? 20
    : emergencyMonths >= 3 ? 15
    : emergencyMonths >= 1 ? 8
    : emergencyMonths > 0 ? 3
    : 0;

  const debtPressure = reports.monthly?.debtPressure ?? 0;
  const debtScore =
    debtPressure === 0 ? 15
    : debtPressure < 0.2 ? 12
    : debtPressure < 0.4 ? 7
    : debtPressure < 0.7 ? 3
    : 0;

  const positiveMonths = reports.monthlyClose?.positiveMonths ?? 0;
  const consistencyScore =
    positiveMonths >= 5 ? 15
    : positiveMonths >= 3 ? 10
    : positiveMonths >= 1 ? 5
    : 0;

  const total = cashFlowScore + savingsScore + emergencyScore + debtScore + consistencyScore;

  const grade =
    total >= 90 ? 'A+'
    : total >= 80 ? 'A'
    : total >= 70 ? 'B'
    : total >= 60 ? 'C'
    : total >= 50 ? 'D'
    : 'F';

  return {
    total,
    grade,
    pillars: [
      { key: 'cashFlow',    score: cashFlowScore,    max: 25, value: netCashFlow },
      { key: 'savings',     score: savingsScore,     max: 25, value: savingsRate },
      { key: 'emergency',   score: emergencyScore,   max: 20, value: emergencyMonths },
      { key: 'debt',        score: debtScore,        max: 15, value: debtPressure },
      { key: 'consistency', score: consistencyScore, max: 15, value: positiveMonths },
    ],
  };
}
