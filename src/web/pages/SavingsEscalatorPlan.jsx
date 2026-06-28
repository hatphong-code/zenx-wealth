import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarClock, CheckCircle2, ChevronDown, ChevronUp, Circle, Pencil, PlusCircle, Target, Trash2 } from 'lucide-react';
import { Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../core/auth/useAuth';
import { useI18n } from '../../core/i18n/useI18n';
import { useNumberFormat } from '../../core/hooks/useNumberFormat';
import { buildGrowingContributionSeries } from '../../core/services/financialCalculations';
import {
  activatePendingPlans,
  addMonthsToKey,
  addMonthlyCheckin,
  deleteSavingsPlan,
  getCurrentPlanMonthIdx,
  getMonthlyCheckins,
  getSavingsPlan,
  updatePlanActiveScenario,
  updateSavingsPlan,
} from '../../core/services/savingsPlanService';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatMoney, fmtShort } from '../../core/utils/formatters';
import {
  addSavingsScheduleEntry,
  deleteSavingsScheduleEntry,
  daysUntil,
  getSavingsScheduleForPlan,
  getUpcomingMaturities,
} from '../../core/services/savingsScheduleService';

const CHANNEL_CONFIG = {
  bank: 'text-zx-accent border-zx-accent/40 bg-zx-accent/10',
  fund: 'text-zx-positive border-zx-positive/40 bg-zx-positive/10',
  bond: 'text-zx-gold border-zx-gold/40 bg-zx-gold/10',
  other: 'text-zx-text-soft border-zx-line bg-zx-surface-2',
};

const MATURITY_WINDOW_DAYS = 7;

function formatDateVN(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// ── Bank schedule sub-components ─────────────────────────────────────────────

function MaturityBanner({ upcoming, t }) {
  if (!upcoming.length) return null;
  return (
    <div className="rounded-zx border border-zx-gold/40 bg-zx-gold/10 p-4">
      <div className="flex items-start gap-3">
        <CalendarClock className="h-4 w-4 flex-shrink-0 mt-0.5 text-zx-gold" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-zx-text">{t('savingsEscalator.schedule.bannerTitle')}</p>
          {upcoming.map(e => {
            const days = daysUntil(e.maturityDate);
            const msg = days === 0
              ? t('savingsEscalator.schedule.bannerBodyToday', { label: e.label })
              : t('savingsEscalator.schedule.bannerBody', { label: e.label, date: formatDateVN(e.maturityDate), days });
            return <p key={e.id} className="text-sm text-zx-text">{msg}</p>;
          })}
        </div>
      </div>
    </div>
  );
}

function BankScheduleSection({ userId, planId, plan, series, currentPlanMonthIdx, t, currency, entries, onEntriesChange, onCheckin }) {
  const coastMonth = plan.result.coastMonth;
  const defaultMonthIdx = Math.max(1, Math.min(currentPlanMonthIdx, coastMonth));

  function monthKeyFor(idx) {
    return addMonthsToKey(plan.executionStartDate, idx - 1);
  }
  function defaultFormFor(idx) {
    return {
      label: `${plan.name} - Tháng ${idx}`,
      openDate: monthKeyFor(idx) + '-01',
      maturityDate: '',
      amount: String(Math.round(series[Math.min(idx, series.length - 1)]?.monthlyDeposit || 0)),
      note: '',
      bankName: '',
      interestRate: '',
    };
  }

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(defaultMonthIdx);
  const [form, setForm] = useState(() => defaultFormFor(defaultMonthIdx));

  const upcoming = useMemo(() => getUpcomingMaturities(entries, MATURITY_WINDOW_DAYS), [entries]);

  function handleMonthChange(newIdx) {
    const idx = Number(newIdx);
    setSelectedMonthIdx(idx);
    setForm(f => ({
      ...f,
      label: `${plan.name} - Tháng ${idx}`,
      openDate: monthKeyFor(idx) + '-01',
      amount: String(Math.round(series[Math.min(idx, series.length - 1)]?.monthlyDeposit || 0)),
    }));
  }

  function openForm() {
    setForm(defaultFormFor(selectedMonthIdx));
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.label || !form.maturityDate) return;
    setSaving(true);
    try {
      const id = await addSavingsScheduleEntry(userId, {
        ...form,
        planId,
        planMonthIdx: selectedMonthIdx,
        bankName: form.bankName,
        interestRate: Number(form.interestRate) || 0,
        amount: Number(form.amount) || 0,
      });

      // Auto-checkin for the selected plan month
      const monthKey = monthKeyFor(selectedMonthIdx);
      const actualAmount = Number(form.amount) || 0;
      const checkinNote = form.bankName ? `${form.bankName}` : '';
      await addMonthlyCheckin(userId, planId, monthKey, { actualAmount, note: checkinNote });
      onCheckin('month', monthKey, { actualAmount, note: checkinNote });

      const newEntry = {
        id, planId, planMonthIdx: selectedMonthIdx,
        ...form,
        bankName: form.bankName,
        interestRate: Number(form.interestRate) || 0,
        amount: actualAmount,
      };
      onEntriesChange(prev => [...prev, newEntry].sort((a, b) => (a.maturityDate || '').localeCompare(b.maturityDate || '')));
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry) {
    setDeletingId(entry.id);
    try {
      await deleteSavingsScheduleEntry(userId, entry.id);
      onEntriesChange(prev => prev.filter(e => e.id !== entry.id));
    } finally {
      setDeletingId(null);
    }
  }

  const monthOptions = Array.from({ length: coastMonth }, (_, i) => i + 1);

  return (
    <section className="space-y-4 pt-2">
      <div className="h-px bg-zx-line" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-zx-text">{t('savingsEscalator.schedule.title')}</h2>
          <p className="text-sm text-zx-text-soft">{t('savingsEscalator.schedule.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={openForm}
          className="flex items-center gap-1.5 rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-1.5 text-sm text-zx-text-soft hover:text-zx-text transition"
        >
          <PlusCircle className="h-4 w-4" />
          {t('savingsEscalator.schedule.add')}
        </button>
      </div>

      <MaturityBanner upcoming={upcoming} t={t} />

      {showForm && (
        <form onSubmit={handleSave} className="rounded-zx border border-zx-line bg-zx-surface p-4 space-y-4">
          {/* Month selector */}
          <div>
            <label htmlFor="bk-month" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.schedule.monthSelector')}</label>
            <select
              id="bk-month"
              value={selectedMonthIdx}
              onChange={e => handleMonthChange(e.target.value)}
              className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2.5 text-sm text-zx-text focus:outline-none focus:ring-2 focus:ring-zx-accent"
            >
              {monthOptions.map(n => (
                <option key={n} value={n}>
                  {t('savingsEscalator.schedule.monthOption', { n, key: monthKeyFor(n) })}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bk-label" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.schedule.labelField')}</label>
              <input
                id="bk-label"
                required
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder={t('savingsEscalator.schedule.labelPlaceholder')}
                className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2.5 text-sm text-zx-text placeholder:text-zx-text-soft focus:outline-none focus:ring-2 focus:ring-zx-accent"
              />
            </div>
            <div>
              <label htmlFor="bk-amount" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.schedule.amount')}</label>
              <input
                id="bk-amount"
                type="number"
                min="0"
                step="100000"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0"
                className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2.5 text-sm text-zx-text focus:outline-none focus:ring-2 focus:ring-zx-accent"
              />
              {Number(form.amount) > 0 && (
                <p className="mt-1 text-xs text-zx-text-soft">~ {fmtShort(Number(form.amount))}</p>
              )}
            </div>
            <div>
              <label htmlFor="bk-bank" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.schedule.bankName')}</label>
              <input
                id="bk-bank"
                value={form.bankName}
                onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                placeholder={t('savingsEscalator.schedule.bankNamePlaceholder')}
                className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2.5 text-sm text-zx-text placeholder:text-zx-text-soft focus:outline-none focus:ring-2 focus:ring-zx-accent"
              />
            </div>
            <div>
              <label htmlFor="bk-rate" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.schedule.interestRate')}</label>
              <input
                id="bk-rate"
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={form.interestRate}
                onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))}
                placeholder="0"
                className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2.5 text-sm text-zx-text focus:outline-none focus:ring-2 focus:ring-zx-accent"
              />
            </div>
            <div>
              <label htmlFor="bk-open" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.schedule.openDate')}</label>
              <input
                id="bk-open"
                type="date"
                value={form.openDate}
                onChange={e => setForm(f => ({ ...f, openDate: e.target.value }))}
                className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2.5 text-sm text-zx-text focus:outline-none focus:ring-2 focus:ring-zx-accent"
              />
            </div>
            <div>
              <label htmlFor="bk-maturity" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.schedule.maturityDate')}</label>
              <input
                id="bk-maturity"
                type="date"
                required
                value={form.maturityDate}
                onChange={e => setForm(f => ({ ...f, maturityDate: e.target.value }))}
                className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2.5 text-sm text-zx-text focus:outline-none focus:ring-2 focus:ring-zx-accent"
              />
            </div>
          </div>
          <div>
            <label htmlFor="bk-note" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.schedule.note')}</label>
            <input
              id="bk-note"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2.5 text-sm text-zx-text focus:outline-none focus:ring-2 focus:ring-zx-accent"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-zx-sm bg-zx-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 transition"
            >
              {saving ? t('savingsEscalator.schedule.saving') : t('savingsEscalator.schedule.save')}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-zx-sm border border-zx-line px-4 py-2.5 text-sm text-zx-text-soft hover:text-zx-text transition"
            >
              {t('savingsEscalator.schedule.cancel')}
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-zx-text-soft py-2">{t('savingsEscalator.schedule.empty')}</p>
      ) : (
        <div className="rounded-zx border border-zx-line bg-zx-surface overflow-hidden divide-y divide-zx-line">
          {entries.map(entry => {
            const days = daysUntil(entry.maturityDate);
            const isUpcoming = days >= 0 && days <= MATURITY_WINDOW_DAYS;
            return (
              <div
                key={entry.id}
                className={`flex items-start gap-3 px-4 py-3 ${isUpcoming ? 'bg-zx-gold/5' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-zx-text">{entry.label}</p>
                    {entry.bankName && (
                      <span className="text-[10px] font-medium text-zx-text-soft">{entry.bankName}</span>
                    )}
                    {entry.interestRate > 0 && (
                      <span className="text-[10px] font-semibold text-zx-accent">{t('savingsEscalator.schedule.interestRateBadge', { rate: entry.interestRate })}</span>
                    )}
                    {isUpcoming && (
                      <span className="text-[10px] font-semibold text-zx-gold">
                        {days === 0 ? t('savingsEscalator.schedule.bannerBodyToday', { label: '' }).trim() : `${days}d`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zx-text-soft mt-0.5">
                    {entry.amount ? `${fmtShort(entry.amount)} · ` : ''}
                    {entry.openDate ? `${t('savingsEscalator.schedule.openedOn', { date: formatDateVN(entry.openDate) })} · ` : ''}
                    {t('savingsEscalator.schedule.matureOn', { date: formatDateVN(entry.maturityDate) })}
                    {entry.note ? ` · ${entry.note}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t('savingsEscalator.schedule.delete')}
                  onClick={() => handleDelete(entry)}
                  disabled={deletingId === entry.id}
                  className="flex-shrink-0 p-1.5 text-zx-text-soft hover:text-zx-negative transition disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Comparison chart ──────────────────────────────────────────────────────────

function ComparisonChart({ plan, series, checkins, entries, currentPlanMonthIdx, t }) {
  const { annualRatePct, currentAge, monthlyExpense, fiMultiple } = plan.params;
  const { coastMonth, balanceAtCoast: plannedBalanceAtCoast, coastAge } = plan.result;
  const totalYears = plan.params.retirementAge - currentAge;
  const totalMonths = totalYears * 12;
  const planR = annualRatePct / 100 / 12;
  const depositAtCoast = series[Math.min(coastMonth, series.length - 1)]?.monthlyDeposit || 0;
  const fiTarget = (monthlyExpense || 0) * 12 * (fiMultiple || 25);

  const [compScenario, setCompScenario] = useState(plan.activeScenario || 'continue');

  // Weighted average rate from saved books
  const booksWithRate = entries.filter(e => e.interestRate > 0 && e.amount > 0);
  const actualAnnualRatePct = booksWithRate.length > 0
    ? booksWithRate.reduce((s, e) => s + e.interestRate * e.amount, 0) /
      booksWithRate.reduce((s, e) => s + e.amount, 0)
    : annualRatePct;
  const actualR = actualAnnualRatePct / 100 / 12;
  const ratesDiffer = Math.abs(actualAnnualRatePct - annualRatePct) > 0.01;
  const hasActualData = Object.keys(checkins).length > 0 || entries.length > 0;

  const actualYearly = useMemo(() => {
    let acCont = 0, acMaint = 0, acCoast = 0;
    const out = {};
    for (let m = 1; m <= totalMonths; m++) {
      const monthKey = addMonthsToKey(plan.executionStartDate, m - 1);
      const checkin = checkins[monthKey];
      const plannedDeposit = series[Math.min(m, series.length - 1)]?.monthlyDeposit || 0;
      const actualDeposit = checkin
        ? (checkin.actualAmount || 0)
        : (m > currentPlanMonthIdx ? plannedDeposit : 0);
      acCont = acCont * (1 + actualR) + actualDeposit;
      acMaint = acMaint * (1 + actualR) + (m <= coastMonth ? actualDeposit : depositAtCoast);
      acCoast = acCoast * (1 + actualR) + (m <= coastMonth ? actualDeposit : 0);
      if (m % 12 === 0) out[m / 12] = { acCont, acMaint, acCoast };
    }
    return out;
  }, [plan.executionStartDate, series, checkins, currentPlanMonthIdx, actualR, coastMonth, depositAtCoast, totalMonths]);

  const chartData = useMemo(() => Array.from({ length: totalYears + 1 }, (_, yr) => {
    const m = yr * 12;
    const dp = series[Math.min(m, series.length - 1)];
    const planContinue = dp.balance;
    const monthsAfter = Math.max(0, m - coastMonth);
    const planCoast = m <= coastMonth
      ? planContinue
      : plannedBalanceAtCoast * Math.pow(1 + planR, monthsAfter);
    const planMaintain = m <= coastMonth
      ? planContinue
      : planR > 0
        ? plannedBalanceAtCoast * Math.pow(1 + planR, monthsAfter) + depositAtCoast * (Math.pow(1 + planR, monthsAfter) - 1) / planR
        : plannedBalanceAtCoast + depositAtCoast * monthsAfter;

    // Band: fill between coast (bottom) and continue (top)
    const bandBase = planCoast;
    const bandDelta = Math.max(0, planContinue - planCoast);
    // Selected planned line
    const planSelected = compScenario === 'continue' ? planContinue : compScenario === 'maintain' ? planMaintain : planCoast;

    const actual = yr > 0 ? actualYearly[yr] : null;
    const actualBalance = actual
      ? (compScenario === 'continue' ? actual.acCont : compScenario === 'maintain' ? actual.acMaint : actual.acCoast)
      : null;

    return {
      age: currentAge + yr,
      bandBase,
      bandDelta,
      planSelected,
      actualBalance: hasActualData ? actualBalance : null,
    };
  }), [series, actualYearly, totalYears, coastMonth, plannedBalanceAtCoast, planR, depositAtCoast, currentAge, compScenario, hasActualData]);

  function fmtAxis(v) {
    if (!v) return '';
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}tỷ`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(0)}tr`;
    return `${(v / 1e3).toFixed(0)}k`;
  }

  const scenarioOptions = [
    { key: 'continue', label: t('savingsEscalator.plan.scenarioPick1') },
    { key: 'maintain', label: t('savingsEscalator.plan.scenarioPick2') },
    { key: 'coast',    label: t('savingsEscalator.plan.scenarioPick3') },
  ];

  return (
    <div className="rounded-zx border border-zx-line bg-zx-surface p-4 space-y-3">
      {/* Header: title + scenario toggle */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-zx-text">{t('savingsEscalator.schedule.chartTitle')}</p>
          {ratesDiffer && hasActualData && (
            <p className="text-xs text-zx-text-soft mt-0.5">
              {t('savingsEscalator.schedule.chartActualRate', { rate: actualAnnualRatePct.toFixed(1) })}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {scenarioOptions.map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => setCompScenario(s.key)}
              className={`rounded-zx-pill px-2.5 py-1 text-[11px] font-semibold transition ${
                compScenario === s.key
                  ? 'bg-zx-accent text-white'
                  : 'border border-zx-line text-zx-text-soft hover:text-zx-text'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mini legend */}
      <div className="flex gap-4 text-[11px] text-zx-text-soft">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 border-t-2 border-dashed border-zx-accent" />
          {t('savingsEscalator.schedule.chartLegendPlan')}
        </span>
        {hasActualData && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 border-t-2 border-zx-positive" />
            {t('savingsEscalator.schedule.chartLegendActual')}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 border-t border-zx-gold" />
          {t('savingsEscalator.schedule.chartLegendTarget')}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="planBandFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--zx-accent)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--zx-accent)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <XAxis dataKey="age" tick={{ fontSize: 11, fill: 'var(--zx-text-soft)' }} />
          <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: 'var(--zx-text-soft)' }} width={48} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const planPt = payload.find(p => p.dataKey === 'planSelected');
              const actualPt = payload.find(p => p.dataKey === 'actualBalance');
              return (
                <div className="rounded-zx-sm border border-zx-line bg-zx-surface px-3 py-2 shadow-zx text-xs space-y-1">
                  <p className="font-semibold text-zx-text">{t('savingsEscalator.schedule.chartAge', { n: label })}</p>
                  {planPt?.value != null && (
                    <p style={{ color: 'var(--zx-accent)' }}>{t('savingsEscalator.schedule.chartLegendPlan')}: {fmtShort(planPt.value)}</p>
                  )}
                  {actualPt?.value != null && (
                    <p style={{ color: 'var(--zx-positive)' }}>{t('savingsEscalator.schedule.chartLegendActual')}: {fmtShort(actualPt.value)}</p>
                  )}
                </div>
              );
            }}
          />
          {/* Confidence band: stacked area from planCoast to planContinue */}
          <Area dataKey="bandBase" stackId="band" stroke="none" fill="transparent" legendType="none" isAnimationActive={false} />
          <Area dataKey="bandDelta" stackId="band" stroke="none" fill="url(#planBandFill)" legendType="none" isAnimationActive={false} />
          {/* FI target horizontal reference */}
          {fiTarget > 0 && (
            <ReferenceLine y={fiTarget} stroke="var(--zx-gold)" strokeWidth={1.5} strokeDasharray="4 3" />
          )}
          {/* Coast point vertical reference */}
          <ReferenceLine x={coastAge} stroke="var(--zx-text-soft)" strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.4} />
          {/* Selected planned scenario line */}
          <Line dataKey="planSelected" stroke="var(--zx-accent)" strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls legendType="none" />
          {/* Actual line */}
          <Line dataKey="actualBalance" stroke="var(--zx-positive)" strokeWidth={2.5} dot={false} connectNulls legendType="none" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatMonthKey(key) {
  if (!key) return '';
  const [y, m] = key.split('-');
  return `${m}/${y}`;
}

const LOCALE_CODE = { vi: 'vi-VN', en: 'en-US' };

function formatMonthLabel(key, locale = 'vi') {
  if (!key) return '';
  const [y, m] = key.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString(LOCALE_CODE[locale] || 'vi-VN', { month: 'long', year: 'numeric' });
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
  const { t, locale } = useI18n();
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
                  const monthLabel = formatMonthLabel(m.monthKey, locale);
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
                                <span className="text-[10px] font-semibold text-zx-accent">{t('savingsEscalator.plan.thisMonth')}</span>
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
  const { t, locale } = useI18n();
  const { fmt } = useNumberFormat();
  const { planId } = useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [checkins, setCheckins] = useState({});
  const [scheduleEntries, setScheduleEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('monthly');
  const [justActivated, setJustActivated] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editChannel, setEditChannel] = useState('bank');
  const [editSaving, setEditSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // Load savings books for bank plans (runs after plan is known)
  useEffect(() => {
    if (!user?.uid || !planId || plan?.channelType !== 'bank' || plan?.status === 'pending') return;
    getSavingsScheduleForPlan(user.uid, planId).then(setScheduleEntries);
  }, [user?.uid, planId, plan?.channelType, plan?.status]);

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

  function startEdit() {
    setEditName(plan.name || '');
    setEditChannel(plan.channelType || 'bank');
    setEditing(true);
  }

  async function handleEditSave() {
    setEditSaving(true);
    try {
      const name = editName.trim() || plan.name;
      await updateSavingsPlan(user.uid, planId, { name, channelType: editChannel });
      setPlan(prev => ({ ...prev, name, channelType: editChannel }));
      setEditing(false);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteSavingsPlan(user.uid, planId);
      navigate('/savings-escalator');
    } finally {
      setDeleting(false);
    }
  }

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
        <p className="text-sm text-zx-text-soft">{t('savingsEscalator.plan.notFound')}</p>
      </main>
    );
  }

  const { result, params } = plan;
  const { coastMonth, coastAge } = result;
  const currency = params?.currency || 'VND';
  const totalPlanMonths = coastMonth;
  const coastMonthKey = plan.executionStartDate ? addMonthsToKey(plan.executionStartDate, coastMonth - 1) : null;
  const checkinCount = coastMonthKey
    ? Object.keys(checkins).filter(k => k >= plan.executionStartDate && k <= coastMonthKey).length
    : 0;
  const progressPct = Math.min(100, totalPlanMonths > 0 ? Math.round((checkinCount / totalPlanMonths) * 100) : 0);
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft">
              {t('savingsEscalator.plan.badge')}
            </span>
            {!editing && plan.channelType && (
              <span className={`rounded-zx-pill border px-1.5 py-0.5 text-[10px] font-semibold ${CHANNEL_CONFIG[plan.channelType] || CHANNEL_CONFIG.other}`}>
                {t(`savingsEscalator.savePlan.channelType.${plan.channelType}`, {}, plan.channelType)}
              </span>
            )}
          </div>

          {editing ? (
            <div className="mt-2 space-y-3">
              <div>
                <label htmlFor="edit-plan-name" className="block text-xs text-zx-text-soft mb-1">
                  {t('savingsEscalator.plan.editName')}
                </label>
                <input
                  id="edit-plan-name"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2 text-sm text-zx-text focus:outline-none focus:ring-2 focus:ring-zx-accent"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['bank', 'fund', 'bond', 'other'].map(ch => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setEditChannel(ch)}
                    className={`rounded-zx-sm border py-2 text-xs font-semibold transition ${
                      editChannel === ch ? CHANNEL_CONFIG[ch] : 'border-zx-line text-zx-text-soft hover:border-zx-accent/40'
                    }`}
                  >
                    {t(`savingsEscalator.savePlan.channelType.${ch}`)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleEditSave}
                  disabled={editSaving}
                  className="rounded-zx-sm bg-zx-accent px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 transition"
                >
                  {editSaving ? t('savingsEscalator.plan.editSaving') : t('savingsEscalator.plan.editSave')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-zx-sm border border-zx-line px-4 py-2 text-xs text-zx-text-soft hover:text-zx-text transition"
                >
                  {t('savingsEscalator.plan.editCancel')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="mt-1 font-zx-head text-2xl font-bold text-zx-text">{plan.name}</h1>
              <p className="mt-0.5 text-sm text-zx-text-soft">
                {plan.executionStartDate
                  ? <>{t('savingsEscalator.plan.startedLabel')}: {formatMonthLabel(plan.executionStartDate, locale)} · </>
                  : null}
                {t('savingsEscalator.plan.coastInfo', { coastMonth, coastAge })}
              </p>
            </>
          )}
        </div>

        {!editing && (
          <div className="flex items-center gap-1 mt-1 flex-shrink-0">
            <button
              type="button"
              onClick={startEdit}
              aria-label={t('savingsEscalator.plan.editTitle')}
              className="rounded-zx-sm p-1.5 text-zx-text-soft hover:text-zx-text hover:bg-zx-surface-2 transition"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label={t('savingsEscalator.plan.deleteConfirmTitle')}
              className="rounded-zx-sm p-1.5 text-zx-text-soft hover:text-zx-negative hover:bg-zx-negative/10 transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
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
                  : t('savingsEscalator.plan.progressLabel', { current: checkinCount, total: totalPlanMonths })}
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

          {plan.channelType === 'bank' && (
            <ComparisonChart
              plan={plan}
              series={series}
              checkins={checkins}
              entries={scheduleEntries}
              currentPlanMonthIdx={currentPlanMonthIdx}
              t={t}
              currency={currency}
            />
          )}

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
      {plan.channelType === 'bank' && plan.status !== 'pending' && user?.uid && (
        <BankScheduleSection
          userId={user.uid}
          planId={planId}
          plan={plan}
          series={series}
          currentPlanMonthIdx={currentPlanMonthIdx}
          t={t}
          currency={currency}
          entries={scheduleEntries}
          onEntriesChange={setScheduleEntries}
          onCheckin={handleCheckin}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={t('savingsEscalator.plan.deleteConfirmTitle')}
        description={t('savingsEscalator.plan.deleteConfirmDesc')}
        confirmLabel={deleting ? t('common.loading') : t('savingsEscalator.plan.deleteConfirmLabel')}
        cancelLabel={t('savingsEscalator.plan.editCancel')}
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </main>
  );
}
