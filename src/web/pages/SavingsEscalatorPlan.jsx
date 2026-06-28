import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Circle, Target } from 'lucide-react';
import { useAuth } from '../../core/auth/useAuth';
import { useI18n } from '../../core/i18n/useI18n';
import { useNumberFormat } from '../../core/hooks/useNumberFormat';
import { buildGrowingContributionSeries } from '../../core/services/financialCalculations';
import {
  activatePendingPlans,
  addMonthsToKey,
  addMonthlyCheckin,
  getCurrentPlanMonthIdx,
  getMonthlyCheckins,
  getSavingsPlan,
  updatePlanActiveScenario,
} from '../../core/services/savingsPlanService';
import { formatMoney } from '../../core/utils/formatters';

function formatMonthKey(key) {
  if (!key) return '';
  const [y, m] = key.split('-');
  return `${m}/${y}`;
}

function formatMonthLabel(key) {
  if (!key) return '';
  const [y, m] = key.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
}

// ── Checkin inline form ───────────────────────────────────────────────────────

function CheckinForm({ monthLabel, existing, onSave, onCancel }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState(existing?.actualAmount ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ actualAmount: Number(amount) || 0, note });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-zx-sm border border-zx-line bg-zx-surface p-3">
      <p className="text-xs font-semibold text-zx-text">
        {t('savingsEscalator.plan.checkinFormTitle', { monthLabel })}
      </p>
      <div>
        <label htmlFor="ci-amount" className="block text-xs text-zx-text-soft mb-1">
          {t('savingsEscalator.plan.checkinAmountLabel')}
        </label>
        <input
          id="ci-amount"
          type="number"
          min="0"
          step="100000"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2 text-sm text-zx-text focus:outline-none focus:ring-2 focus:ring-zx-accent"
        />
      </div>
      <div>
        <label htmlFor="ci-note" className="block text-xs text-zx-text-soft mb-1">
          {t('savingsEscalator.plan.checkinNoteLabel')}
        </label>
        <input
          id="ci-note"
          value={note}
          onChange={e => setNote(e.target.value)}
          className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2 text-sm text-zx-text focus:outline-none focus:ring-2 focus:ring-zx-accent"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-zx-sm bg-zx-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving ? t('savingsEscalator.plan.checkinSaving') : t('savingsEscalator.plan.checkinSave')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-zx-sm border border-zx-line px-3 py-2 text-xs text-zx-text-soft hover:text-zx-text transition"
        >
          {t('savingsEscalator.plan.checkinCancel')}
        </button>
      </div>
    </form>
  );
}

// ── Scenario picker ───────────────────────────────────────────────────────────

function ScenarioPicker({ plan, onPick }) {
  const { t } = useI18n();
  const { fmt } = useNumberFormat();
  const currency = plan.params?.currency || 'VND';
  const deposit = plan.result?.depositAtCoast || 0;
  const pct = plan.params?.monthlyGrowthPct || 0;

  const scenarios = [
    {
      key: 'continue',
      label: t('savingsEscalator.plan.scenarioPick1'),
      sub: t('savingsEscalator.plan.scenarioPick1Sub', { pct }),
      color: 'border-zx-positive text-zx-positive',
    },
    {
      key: 'maintain',
      label: t('savingsEscalator.plan.scenarioPick2'),
      sub: t('savingsEscalator.plan.scenarioPick2Sub', { deposit: fmt(deposit, currency) }),
      color: 'border-zx-maintain text-zx-maintain',
    },
    {
      key: 'coast',
      label: t('savingsEscalator.plan.scenarioPick3'),
      sub: t('savingsEscalator.plan.scenarioPick3Sub'),
      color: 'border-zx-gold text-zx-gold',
    },
  ];

  return (
    <div className="rounded-zx border border-zx-accent/30 bg-zx-accent/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-zx-accent flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-zx-text">{t('savingsEscalator.plan.scenarioPickerTitle')}</p>
          <p className="text-xs text-zx-text-soft">{t('savingsEscalator.plan.scenarioPickerSubtitle')}</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {scenarios.map(s => (
          <button
            key={s.key}
            type="button"
            onClick={() => onPick(s.key)}
            className={`rounded-zx-sm border-l-[3px] bg-zx-surface-2 px-3 py-2.5 text-left transition hover:bg-zx-surface ${s.color}`}
          >
            <p className={`text-xs font-bold ${s.color.split(' ')[1]}`}>{s.label}</p>
            <p className="text-xs text-zx-text-soft mt-0.5 leading-snug">{s.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Monthly view ──────────────────────────────────────────────────────────────

function MonthlyView({ plan, series, checkins, currentPlanMonthIdx, onCheckin }) {
  const { t } = useI18n();
  const { fmt } = useNumberFormat();
  const currency = plan.params?.currency || 'VND';
  const [expandedYears, setExpandedYears] = useState(() => {
    // default: expand the current year
    const currentYear = Math.ceil(Math.max(1, currentPlanMonthIdx) / 12);
    return new Set([currentYear]);
  });
  const [openCheckinKey, setOpenCheckinKey] = useState(null);

  const { params, result } = plan;
  const { coastMonth, depositAtCoast } = result;
  const totalYears = params.retirementAge - params.currentAge;

  function getPlannedDeposit(monthIdx) {
    if (monthIdx <= coastMonth) {
      return series[monthIdx]?.monthlyDeposit || 0;
    }
    const scenario = plan.activeScenario;
    if (scenario === 'continue') return series[Math.min(monthIdx, series.length - 1)]?.monthlyDeposit || 0;
    if (scenario === 'maintain') return depositAtCoast;
    return 0;
  }

  function toggleYear(yr) {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(yr)) next.delete(yr);
      else next.add(yr);
      return next;
    });
  }

  const yearGroups = useMemo(() => Array.from({ length: totalYears }, (_, yi) => {
    const year = yi + 1;
    const startM = yi * 12 + 1;
    const ageStart = params.currentAge + yi;
    const ageEnd = params.currentAge + yi + 1;
    const isCoastYear = coastMonth >= startM && coastMonth < startM + 12;
    const months = Array.from({ length: 12 }, (_, mi) => {
      const monthIdx = startM + mi;
      const monthKey = addMonthsToKey(plan.executionStartDate, monthIdx - 1);
      const isCoast = monthIdx === coastMonth;
      const isFuture = monthIdx > currentPlanMonthIdx;
      const isCurrent = monthIdx === currentPlanMonthIdx;
      return { monthIdx, monthKey, isCoast, isFuture, isCurrent };
    });
    return { year, ageStart, ageEnd, isCoastYear, months };
  }), [totalYears, params, coastMonth, currentPlanMonthIdx, plan.executionStartDate]);

  return (
    <div className="space-y-2">
      {yearGroups.map(group => {
        const isExpanded = expandedYears.has(group.year);
        const label = group.isCoastYear
          ? t('savingsEscalator.plan.yearGroupCoast', { year: group.year, ageStart: group.ageStart, ageEnd: group.ageEnd })
          : t('savingsEscalator.plan.yearGroup', { year: group.year, ageStart: group.ageStart, ageEnd: group.ageEnd });

        // Compute year progress for header badge
        const doneCount = group.months.filter(m => checkins[m.monthKey]).length;

        return (
          <div key={group.year} className={`rounded-zx border ${group.isCoastYear ? 'border-zx-gold/40' : 'border-zx-line'} bg-zx-surface overflow-hidden`}>
            <button
              type="button"
              onClick={() => toggleYear(group.year)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zx-surface-2 transition"
            >
              <span className="text-sm font-semibold text-zx-text">{label}</span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-zx-text-soft">{doneCount}/12</span>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-zx-text-soft" /> : <ChevronDown className="h-4 w-4 text-zx-text-soft" />}
              </span>
            </button>

            {isExpanded && (
              <div className="border-t border-zx-line divide-y divide-zx-line">
                {/* Coast month scenario picker */}
                {group.isCoastYear && !plan.activeScenario && (
                  <div className="px-4 py-3">
                    <ScenarioPicker plan={plan} onPick={key => onCheckin('scenario', null, key)} />
                  </div>
                )}

                {group.months.map(m => {
                  const checkin = checkins[m.monthKey];
                  const planned = getPlannedDeposit(m.monthIdx);
                  const isOpen = openCheckinKey === m.monthKey;
                  const monthLabel = formatMonthLabel(m.monthKey);
                  const afterCoastNoScenario = m.monthIdx > coastMonth && !plan.activeScenario;

                  return (
                    <div
                      key={m.monthKey}
                      className={`px-4 py-3 ${m.isCurrent ? 'bg-zx-accent/5' : ''} ${m.isCoast ? 'bg-zx-gold/5' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Month status icon */}
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div className="mt-0.5 flex-shrink-0">
                            {checkin ? (
                              <CheckCircle2 className="h-4 w-4 text-zx-positive" />
                            ) : (
                              <Circle className={`h-4 w-4 ${m.isCurrent ? 'text-zx-accent' : 'text-zx-line'}`} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-zx-text flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{monthLabel}</span>
                              {m.isCoast && (
                                <span className="text-[10px] font-semibold text-zx-gold">{t('savingsEscalator.plan.coastMonthLabel')}</span>
                              )}
                              {m.isCurrent && !m.isCoast && (
                                <span className="text-[10px] font-semibold text-zx-accent">Tháng này</span>
                              )}
                            </p>
                            <p className="text-xs text-zx-text-soft mt-0.5">
                              {t('savingsEscalator.plan.planned')}: {afterCoastNoScenario ? '—' : fmt(planned, currency)}
                              {checkin && (
                                <> · {t('savingsEscalator.plan.actual')}: <span className="text-zx-text font-medium">{fmt(checkin.actualAmount, currency)}</span></>
                              )}
                            </p>
                            {checkin?.note && (
                              <p className="text-[11px] text-zx-text-soft italic mt-0.5">{checkin.note}</p>
                            )}
                          </div>
                        </div>

                        {/* Action button */}
                        {!m.isFuture && !afterCoastNoScenario && (
                          <button
                            type="button"
                            onClick={() => setOpenCheckinKey(isOpen ? null : m.monthKey)}
                            className="flex-shrink-0 rounded-zx-sm border border-zx-line px-2.5 py-1 text-xs text-zx-text-soft hover:text-zx-text transition"
                          >
                            {checkin
                              ? t('savingsEscalator.plan.checkinButtonEdit')
                              : t('savingsEscalator.plan.checkinButton')}
                          </button>
                        )}
                        {m.isFuture && (
                          <span className="flex-shrink-0 text-[11px] text-zx-text-soft">{t('savingsEscalator.plan.futurePlanned')}</span>
                        )}
                      </div>

                      {isOpen && (
                        <CheckinForm
                          monthLabel={monthLabel}
                          existing={checkin}
                          onSave={async (data) => {
                            await onCheckin('month', m.monthKey, data);
                            setOpenCheckinKey(null);
                          }}
                          onCancel={() => setOpenCheckinKey(null)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Yearly view ───────────────────────────────────────────────────────────────

function YearlyView({ plan, series, checkins }) {
  const { t } = useI18n();
  const { fmt } = useNumberFormat();
  const currency = plan.params?.currency || 'VND';
  const { params, result } = plan;
  const { coastMonth, depositAtCoast } = result;
  const totalYears = params.retirementAge - params.currentAge;

  function getPlannedDeposit(monthIdx) {
    if (monthIdx <= coastMonth) return series[monthIdx]?.monthlyDeposit || 0;
    const s = plan.activeScenario;
    if (s === 'continue') return series[Math.min(monthIdx, series.length - 1)]?.monthlyDeposit || 0;
    if (s === 'maintain') return depositAtCoast;
    return 0;
  }

  const rows = Array.from({ length: totalYears }, (_, yi) => {
    const year = yi + 1;
    const startM = yi * 12 + 1;
    const ageStart = params.currentAge + yi;
    const ageEnd = params.currentAge + yi + 1;

    let plannedTotal = 0;
    let actualTotal = 0;
    let hasAny = false;

    for (let mi = 0; mi < 12; mi++) {
      const monthIdx = startM + mi;
      const monthKey = addMonthsToKey(plan.executionStartDate, monthIdx - 1);
      plannedTotal += getPlannedDeposit(monthIdx);
      if (checkins[monthKey]) {
        actualTotal += checkins[monthKey].actualAmount || 0;
        hasAny = true;
      }
    }

    const pct = plannedTotal > 0 ? Math.min(100, Math.round(actualTotal / plannedTotal * 100)) : 0;
    return { year, ageStart, ageEnd, plannedTotal, actualTotal, pct, hasAny };
  });

  return (
    <div className="rounded-zx border border-zx-line bg-zx-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zx-line bg-zx-surface-2">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft">{t('savingsEscalator.plan.yearTableYear')}</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft">{t('savingsEscalator.plan.yearTableAge')}</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft">{t('savingsEscalator.plan.yearTablePlanned')}</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-positive">{t('savingsEscalator.plan.yearTableActual')}</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft">{t('savingsEscalator.plan.yearTableDone')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zx-line">
            {rows.map(row => (
              <tr key={row.year} className="hover:bg-zx-surface-2">
                <td className="px-4 py-2.5 text-sm font-medium text-zx-text">+{row.year}</td>
                <td className="px-4 py-2.5 text-sm text-zx-text-soft">{row.ageStart}–{row.ageEnd}</td>
                <td className="px-4 py-2.5 text-right text-sm text-zx-text">{fmt(row.plannedTotal, currency)}</td>
                <td className="px-4 py-2.5 text-right text-sm font-medium text-zx-positive">
                  {row.hasAny ? fmt(row.actualTotal, currency) : <span className="text-zx-text-soft">{t('savingsEscalator.plan.yearNotStarted')}</span>}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {row.hasAny ? (
                    <span className={`text-sm font-semibold ${row.pct >= 100 ? 'text-zx-positive' : row.pct >= 50 ? 'text-zx-accent' : 'text-zx-text-soft'}`}>
                      {row.pct}%
                    </span>
                  ) : (
                    <span className="text-zx-text-soft text-sm">{t('savingsEscalator.plan.yearNotStarted')}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SavingsEscalatorPlan() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { fmt } = useNumberFormat();
  const { planId } = useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [checkins, setCheckins] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('monthly');
  const [justActivated, setJustActivated] = useState(false);

  useEffect(() => {
    if (!user?.uid || !planId) return;
    (async () => {
      try {
        const [p, c] = await Promise.all([
          getSavingsPlan(user.uid, planId),
          getMonthlyCheckins(user.uid, planId),
        ]);
        setCheckins(c);
        if (p?.status === 'pending') {
          const activated = await activatePendingPlans(user.uid);
          if (activated.includes(planId)) {
            const updated = await getSavingsPlan(user.uid, planId);
            setPlan(updated);
            setJustActivated(true);
          } else {
            setPlan(p);
          }
        } else {
          setPlan(p);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid, planId]);

  const series = useMemo(() => {
    if (!plan) return [];
    const { startMonthly, monthlyGrowthPct, annualRatePct, retirementAge, currentAge } = plan.params;
    const months = (retirementAge - currentAge) * 12;
    return buildGrowingContributionSeries({ startMonthly, monthlyGrowthPct, annualRatePct, months });
  }, [plan]);

  const currentPlanMonthIdx = useMemo(() => {
    if (!plan?.executionStartDate) return 1;
    return getCurrentPlanMonthIdx(plan.executionStartDate);
  }, [plan]);

  async function handleCheckin(type, monthKey, data) {
    if (type === 'scenario') {
      await updatePlanActiveScenario(user.uid, planId, data);
      setPlan(prev => ({ ...prev, activeScenario: data }));
    } else {
      await addMonthlyCheckin(user.uid, planId, monthKey, data);
      setCheckins(prev => ({ ...prev, [monthKey]: { ...data, checkedAt: new Date() } }));
    }
  }

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8">
        <p className="text-sm text-zx-text-soft">{t('common.loading')}</p>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8">
        <p className="text-sm text-zx-text-soft">Không tìm thấy kế hoạch.</p>
      </main>
    );
  }

  const { result, params } = plan;
  const { coastMonth, coastAge } = result;
  const currency = params?.currency || 'VND';
  const totalPlanMonths = coastMonth;
  const progressPct = Math.min(100, Math.round((currentPlanMonthIdx / totalPlanMonths) * 100));
  const reachedCoast = currentPlanMonthIdx >= coastMonth;

  const scenarioLabels = {
    continue: t('savingsEscalator.plan.scenarioPick1'),
    maintain: t('savingsEscalator.plan.scenarioPick2'),
    coast: t('savingsEscalator.plan.scenarioPick3'),
  };

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-6">

      {/* Back */}
      <button
        type="button"
        onClick={() => navigate('/savings-escalator')}
        className="text-sm text-zx-text-soft hover:text-zx-text transition"
      >
        {t('savingsEscalator.plan.backLink')}
      </button>

      {/* Header */}
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft">
          {t('savingsEscalator.plan.badge')}
        </span>
        <h1 className="mt-1 font-zx-head text-2xl font-bold text-zx-text">{plan.name}</h1>
        <p className="mt-0.5 text-sm text-zx-text-soft">
          {plan.executionStartDate
            ? <>{t('savingsEscalator.plan.startedLabel')}: {formatMonthLabel(plan.executionStartDate)} · </>
            : null}
          {t('savingsEscalator.plan.coastInfo', { coastMonth, coastAge })}
        </p>
      </div>

      {/* Pending banner */}
      {justActivated ? (
        <div className="rounded-zx-sm border border-zx-positive/40 bg-zx-positive/10 px-4 py-3 text-sm text-zx-positive font-medium">
          {t('savingsEscalator.plan.justActivated')}
        </div>
      ) : plan.status === 'pending' ? (
        <div className="rounded-zx border border-zx-maintain/40 bg-zx-maintain/10 px-4 py-3 space-y-0.5">
          <p className="text-sm font-semibold text-zx-maintain">{t('savingsEscalator.plan.pendingTitle')}</p>
          <p className="text-sm text-zx-maintain/80">{t('savingsEscalator.plan.pendingBody')}</p>
        </div>
      ) : null}

      {/* Progress + tabs — only for active plans */}
      {plan.status !== 'pending' && (
        <>
          <div className="rounded-zx border border-zx-line bg-zx-surface p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-zx-text">
                {reachedCoast
                  ? t('savingsEscalator.plan.progressDone')
                  : t('savingsEscalator.plan.progressLabel', { current: currentPlanMonthIdx, total: totalPlanMonths })}
              </span>
              <span className="font-bold text-zx-accent">{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-zx-surface-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-zx-accent transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {plan.activeScenario && (
              <p className="text-xs text-zx-text-soft">
                {t('savingsEscalator.plan.scenarioSet')}: <span className="font-semibold text-zx-text">{scenarioLabels[plan.activeScenario]}</span>
              </p>
            )}
          </div>

          <div className="flex gap-2 border-b border-zx-line">
            {['monthly', 'yearly'].map(id => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`pb-2 px-1 text-sm font-medium transition border-b-2 ${
                  tab === id ? 'border-zx-accent text-zx-accent' : 'border-transparent text-zx-text-soft hover:text-zx-text'
                }`}
              >
                {id === 'monthly' ? t('savingsEscalator.plan.tabMonthly') : t('savingsEscalator.plan.tabYearly')}
              </button>
            ))}
          </div>

          {tab === 'monthly' ? (
            <MonthlyView
              plan={plan}
              series={series}
              checkins={checkins}
              currentPlanMonthIdx={currentPlanMonthIdx}
              onCheckin={handleCheckin}
            />
          ) : (
            <YearlyView
              plan={plan}
              series={series}
              checkins={checkins}
            />
          )}
        </>
      )}
    </main>
  );
}
