import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarClock, ChevronDown, ChevronUp, Flame, Info, PlusCircle, Trash2 } from 'lucide-react';
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../core/auth/useAuth';
import { useI18n } from '../../core/i18n/useI18n';
import { useNumberFormat } from '../../core/hooks/useNumberFormat';
import {
  buildGrowingContributionSeries,
  calculateFITarget,
  findCoastPoint,
} from '../../core/services/financialCalculations';
import { AGE_RANGE_MIDPOINT, calculateExactAge } from '../../core/data/latteOnboarding';
import {
  addSavingsScheduleEntry,
  deleteSavingsScheduleEntry,
  daysUntil,
  getSavingsSchedule,
  getUpcomingMaturities,
} from '../../core/services/savingsScheduleService';
import { fmtShort, formatMoney } from '../../core/utils/formatters';
import { getCachedUserProfile, getUserProfile } from '../../core/services/userService';
import NumericInput from '../components/ui/NumericInput';

const MATURITY_WINDOW_DAYS = 7;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateVN(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function computePlan({ startMonthly, monthlyGrowthPct, monthlyExpense, fiMultiple, currentAge, retirementAge, annualRatePct }) {
  const months = (retirementAge - currentAge) * 12;
  if (months <= 0) return null;

  const fiTarget = calculateFITarget({ monthlyExpense, multiple: fiMultiple });
  const series = buildGrowingContributionSeries({ startMonthly, monthlyGrowthPct, annualRatePct, months });
  const coastResult = findCoastPoint({ startMonthly, monthlyGrowthPct, annualRatePct, monthsToRetirement: months, fiTarget });

  const r = annualRatePct / 100 / 12;
  const years = retirementAge - currentAge;

  // Yearly chart data: one point per year (0, 1, 2, ..., years)
  const chartData = Array.from({ length: years + 1 }, (_, yr) => {
    const m = yr * 12;
    const dp = series[Math.min(m, series.length - 1)];
    const continueLine = dp.balance;

    let coastLine;
    if (!coastResult || m <= coastResult.coastMonth) {
      coastLine = continueLine;
    } else {
      const monthsAfter = m - coastResult.coastMonth;
      coastLine = coastResult.balanceAtCoast * Math.pow(1 + r, monthsAfter);
    }

    return { age: currentAge + yr, continueLine, coastLine };
  });

  // Yearly table rows
  const tableRows = Array.from({ length: years + 1 }, (_, yr) => {
    const m = yr * 12;
    const dp = series[Math.min(m, series.length - 1)];
    const isCoastYear = coastResult && m >= coastResult.coastMonth && (m - 12) < coastResult.coastMonth;
    return {
      yr,
      age: currentAge + yr,
      balance: dp.balance,
      monthlyDeposit: dp.monthlyDeposit,
      isCoastYear,
    };
  });

  return { fiTarget, coastResult, chartData, tableRows, months, years };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-zx border p-4 ${highlight ? 'border-zx-accent/40 bg-zx-accent/5' : 'border-zx-line bg-zx-surface'}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft">{label}</p>
      <p className="mt-1 text-xl font-bold text-zx-text">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zx-text-soft">{sub}</p>}
    </div>
  );
}

function ChartTooltipContent({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-zx-sm border border-zx-line bg-zx-surface px-3 py-2 shadow-zx text-xs space-y-1">
      <p className="font-semibold text-zx-text">{`Tuổi ${label}`}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {formatMoney(p.value, currency)}</p>
      ))}
    </div>
  );
}

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

// ── Schedule Section ──────────────────────────────────────────────────────────

function ScheduleSection({ userId, t, notifEnabled, currency }) {
  const { fmt } = useNumberFormat();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ label: '', openDate: '', maturityDate: '', amount: '', note: '' });

  useEffect(() => {
    if (!userId) return;
    getSavingsSchedule(userId)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [userId]);

  const upcoming = useMemo(() => getUpcomingMaturities(entries, MATURITY_WINDOW_DAYS), [entries]);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.label || !form.maturityDate) return;
    setSaving(true);
    try {
      const id = await addSavingsScheduleEntry(userId, form);
      const newEntry = { id, ...form, amount: Number(form.amount) || 0 };
      setEntries(prev => [...prev, newEntry].sort((a, b) => (a.maturityDate || '').localeCompare(b.maturityDate || '')));
      setForm({ label: '', openDate: '', maturityDate: '', amount: '', note: '' });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry) {
    if (!window.confirm(t('savingsEscalator.schedule.deleteConfirm', { label: entry.label }))) return;
    setDeletingId(entry.id);
    try {
      await deleteSavingsScheduleEntry(userId, entry.id);
      setEntries(prev => prev.filter(e => e.id !== entry.id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-zx-text">{t('savingsEscalator.schedule.title')}</h2>
          <p className="text-sm text-zx-text-soft">{t('savingsEscalator.schedule.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-1.5 text-sm text-zx-text-soft hover:text-zx-text transition"
        >
          <PlusCircle className="h-4 w-4" />
          {t('savingsEscalator.schedule.add')}
        </button>
      </div>

      {upcoming.length > 0 && notifEnabled && (
        <MaturityBanner upcoming={upcoming} t={t} />
      )}

      {showForm && (
        <form onSubmit={handleSave} className="rounded-zx border border-zx-line bg-zx-surface p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sch-label" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.schedule.labelField')}</label>
              <input
                id="sch-label"
                required
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder={t('savingsEscalator.schedule.labelPlaceholder')}
                className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2.5 text-sm text-zx-text placeholder:text-zx-text-soft focus:outline-none focus:ring-2 focus:ring-zx-accent"
              />
            </div>
            <div>
              <label htmlFor="sch-amount" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.schedule.amount')}</label>
              <NumericInput
                id="sch-amount"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0"
              />
              {Number(form.amount) > 0 && (
                <p className="mt-1 text-xs text-zx-text-soft">~ {fmt(form.amount, currency)}</p>
              )}
            </div>
            <div>
              <label htmlFor="sch-open" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.schedule.openDate')}</label>
              <input
                id="sch-open"
                type="date"
                value={form.openDate}
                onChange={e => setForm(f => ({ ...f, openDate: e.target.value }))}
                className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2.5 text-sm text-zx-text focus:outline-none focus:ring-2 focus:ring-zx-accent"
              />
            </div>
            <div>
              <label htmlFor="sch-maturity" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.schedule.maturityDate')}</label>
              <input
                id="sch-maturity"
                type="date"
                required
                value={form.maturityDate}
                onChange={e => setForm(f => ({ ...f, maturityDate: e.target.value }))}
                className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2.5 text-sm text-zx-text focus:outline-none focus:ring-2 focus:ring-zx-accent"
              />
            </div>
          </div>
          <div>
            <label htmlFor="sch-note" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.schedule.note')}</label>
            <input
              id="sch-note"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2.5 text-sm text-zx-text placeholder:text-zx-text-soft focus:outline-none focus:ring-2 focus:ring-zx-accent"
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

      {loading ? (
        <p className="text-sm text-zx-text-soft">{t('common.loading')}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-zx-text-soft py-2">{t('savingsEscalator.schedule.empty')}</p>
      ) : (
        <div className="rounded-zx border border-zx-line bg-zx-surface overflow-hidden divide-y divide-zx-line">
          {entries.map(entry => (
            <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zx-text">{entry.label}</p>
                <p className="text-xs text-zx-text-soft mt-0.5">
                  {entry.amount ? `${fmtShort(entry.amount)} · ` : ''}
                  {entry.openDate ? `Mở ${formatDateVN(entry.openDate)} · ` : ''}
                  Đáo hạn {formatDateVN(entry.maturityDate)}
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
          ))}
        </div>
      )}
    </section>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function deriveDefaultAge(user) {
  const dob = user?.settings?.dateOfBirth;
  if (dob) {
    const exact = calculateExactAge(dob);
    if (exact !== null) return exact;
  }
  const range = user?.settings?.ageRange;
  if (range && AGE_RANGE_MIDPOINT[range] !== undefined) return AGE_RANGE_MIDPOINT[range];
  return 30;
}

function FiMultipleSelect({ value, onChange }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const options = [
    { value: 25, label: t('savingsEscalator.form.fiMultiple25') },
    { value: 26, label: '26×' },
    { value: 27, label: '27×' },
    { value: 28, label: t('savingsEscalator.form.fiMultiple28') },
    { value: 29, label: '29×' },
    { value: 30, label: '30×' },
    { value: 31, label: t('savingsEscalator.form.fiMultiple31') },
  ];

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-3 text-sm text-zx-text focus:outline-none focus:ring-2 focus:ring-zx-accent"
      >
        <span>{selected?.label}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-zx-text-soft transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-zx-sm border border-zx-line bg-zx-surface shadow-zx">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full px-3 py-2.5 text-left text-sm transition hover:bg-zx-surface-2 ${
                o.value === value ? 'font-semibold text-zx-accent' : 'text-zx-text'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const BASE_FORM = {
  startMonthly: 9000000,
  monthlyGrowthPct: 1,
  monthlyExpense: 15000000,
  fiMultiple: 25,
  retirementAge: 60,
  annualRatePct: 6,
};

function deriveDefaultRetirementAge(currentAge) {
  return Math.max(currentAge + 15, 60);
}

export default function SavingsEscalator() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { fmt } = useNumberFormat();

  const [form, setForm] = useState({ ...BASE_FORM, currentAge: 30 });
  const [plan, setPlan] = useState(null);
  const [showFiNote, setShowFiNote] = useState(false);
  const [showFullTable, setShowFullTable] = useState(false);
  const [ageSeeded, setAgeSeeded] = useState(false);

  useEffect(() => {
    if (!user?.uid || ageSeeded) return;
    const apply = (profile) => {
      const currentAge = deriveDefaultAge(profile);
      const monthlyExpense = profile?.settings?.monthlyEssentialExpense || BASE_FORM.monthlyExpense;
      setForm(f => ({
        ...f,
        currentAge,
        monthlyExpense,
        retirementAge: deriveDefaultRetirementAge(currentAge),
      }));
      setAgeSeeded(true);
    };
    const cached = getCachedUserProfile(user.uid);
    if (cached) { apply(cached); return; }
    getUserProfile(user.uid).then(apply);
  }, [user?.uid, ageSeeded]);

  const currency = user?.settings?.currency || 'VND';
  const notifEnabled = user?.settings?.notificationPrefs?.savingsScheduleReminder !== false;

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleCalculate(e) {
    e.preventDefault();
    const result = computePlan({
      startMonthly: Number(form.startMonthly),
      monthlyGrowthPct: Number(form.monthlyGrowthPct),
      monthlyExpense: Number(form.monthlyExpense),
      fiMultiple: Number(form.fiMultiple),
      currentAge: Number(form.currentAge),
      retirementAge: Number(form.retirementAge),
      annualRatePct: Number(form.annualRatePct),
    });
    setPlan(result);
    setShowFullTable(false);
  }

  const tableRows = plan?.tableRows ?? [];
  const visibleRows = showFullTable ? tableRows : tableRows.slice(0, 11);

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-8">

      {/* Header */}
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft">{t('savingsEscalator.badge')}</span>
        <h1 className="mt-1 font-zx-head text-2xl font-bold text-zx-text">{t('savingsEscalator.title')}</h1>
        <p className="mt-1 text-sm text-zx-text-soft max-w-2xl">{t('savingsEscalator.subtitle')}</p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleCalculate} className="rounded-zx border border-zx-line bg-zx-surface p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          <div>
            <label htmlFor="se-start" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.form.startMonthly')}</label>
            <NumericInput
              id="se-start"
              value={form.startMonthly}
              min={0}
              step={500000}
              onChange={e => setField('startMonthly', e.target.value)}
            />
            {Number(form.startMonthly) > 0 && (
              <p className="mt-1 text-xs text-zx-text-soft">~ {fmt(form.startMonthly, currency)}</p>
            )}
          </div>

          <div>
            <label htmlFor="se-growth" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.form.monthlyGrowthPct')}</label>
            <NumericInput
              id="se-growth"
              value={form.monthlyGrowthPct}
              min={0}
              max={5}
              step={0.1}
              onChange={e => setField('monthlyGrowthPct', e.target.value)}
            />
            <p className="mt-1 text-[11px] text-zx-text-soft leading-snug">{t('savingsEscalator.form.monthlyGrowthHint')}</p>
          </div>

          <div>
            <label htmlFor="se-expense" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.form.monthlyExpense')}</label>
            <NumericInput
              id="se-expense"
              value={form.monthlyExpense}
              min={0}
              step={500000}
              onChange={e => setField('monthlyExpense', e.target.value)}
            />
            {Number(form.monthlyExpense) > 0 && (
              <p className="mt-1 text-xs text-zx-text-soft">~ {fmt(form.monthlyExpense, currency)}</p>
            )}
          </div>

          <div>
            <span className="block text-sm text-zx-text-soft mb-2">{t('savingsEscalator.form.fiMultiple')}</span>
            <FiMultipleSelect value={form.fiMultiple} onChange={v => setField('fiMultiple', v)} />
            <button
              type="button"
              onClick={() => setShowFiNote(v => !v)}
              className="mt-2 flex items-center gap-1 text-[11px] text-zx-text-soft hover:text-zx-text transition"
            >
              <Info className="h-3 w-3" />
              {t('savingsEscalator.form.fiMultiple25').split('—')[0].trim()} / {t('savingsEscalator.form.fiMultiple28').split('—')[0].trim()} / {t('savingsEscalator.form.fiMultiple31').split('—')[0].trim()}
            </button>
            {showFiNote && (
              <p className="mt-1 text-[11px] text-zx-text-soft leading-snug">{t('savingsEscalator.form.fiMultipleNote')}</p>
            )}
          </div>

          <div>
            <label htmlFor="se-age" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.form.currentAge')}</label>
            <NumericInput
              id="se-age"
              value={form.currentAge}
              min={18}
              max={80}
              step={1}
              onChange={e => setField('currentAge', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="se-retire" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.form.retirementAge')}</label>
            <NumericInput
              id="se-retire"
              value={form.retirementAge}
              min={Number(form.currentAge) + 1}
              max={100}
              step={1}
              onChange={e => setField('retirementAge', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="se-rate" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.form.annualRatePct')}</label>
            <NumericInput
              id="se-rate"
              value={form.annualRatePct}
              min={0}
              max={20}
              step={0.5}
              onChange={e => setField('annualRatePct', e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto rounded-zx-sm bg-zx-accent px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition"
        >
          {t('savingsEscalator.form.calculate')}
        </button>
      </form>

      {/* Results */}
      {plan && (
        <div className="space-y-6">

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label={t('savingsEscalator.results.fiTarget')}
              value={fmt(plan.fiTarget, currency)}
            />
            {plan.coastResult ? (
              <>
                <StatCard
                  highlight
                  label={t('savingsEscalator.results.coastPoint')}
                  value={`${plan.coastResult.coastMonth} tháng`}
                  sub={t('savingsEscalator.results.coastPointUnit', {
                    month: plan.coastResult.coastMonth,
                    age: Number(form.currentAge) + Math.floor(plan.coastResult.coastMonth / 12),
                  })}
                />
                <StatCard
                  label={t('savingsEscalator.results.balanceAtCoast')}
                  value={fmt(plan.coastResult.balanceAtCoast, currency)}
                />
                <StatCard
                  label={t('savingsEscalator.results.depositAtCoast')}
                  value={fmt(
                    Number(form.startMonthly) * Math.pow(1 + Number(form.monthlyGrowthPct) / 100, plan.coastResult.coastMonth - 1),
                    currency
                  )}
                  sub={`tháng ${plan.coastResult.coastMonth}`}
                />
              </>
            ) : (
              <div className="col-span-3 flex items-center gap-2 rounded-zx border border-zx-line bg-zx-surface px-4 py-3">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-zx-gold" />
                <p className="text-sm text-zx-text-soft">{t('savingsEscalator.results.noCoastPoint')}</p>
              </div>
            )}
          </div>

          {/* Line Chart */}
          <div className="rounded-zx border border-zx-line bg-zx-surface p-4">
            <h2 className="text-sm font-semibold text-zx-text mb-4">{t('savingsEscalator.results.chartTitle')}</h2>
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={plan.chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="age"
                    tick={{ fontSize: 11 }}
                    tickFormatter={v => `${v}t`}
                  />
                  <YAxis hide />
                  <Tooltip content={<ChartTooltipContent currency={currency} />} />
                  <ReferenceLine
                    y={plan.fiTarget}
                    stroke="var(--zx-gold)"
                    strokeDasharray="5 3"
                    strokeWidth={1.5}
                    label={{ value: t('savingsEscalator.results.lineTarget'), position: 'insideTopRight', fill: 'var(--zx-gold)', fontSize: 10 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="continueLine"
                    name={t('savingsEscalator.results.lineContinue')}
                    stroke="var(--zx-accent)"
                    strokeWidth={2}
                    dot={false}
                  />
                  {plan.coastResult && (
                    <Line
                      type="monotone"
                      dataKey="coastLine"
                      name={t('savingsEscalator.results.lineCoast')}
                      stroke="var(--zx-positive)"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-px w-6 bg-zx-accent" style={{ height: 2 }} />
                {t('savingsEscalator.results.lineContinue')}
              </span>
              {plan.coastResult && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-6 border-t-2 border-dashed border-zx-positive" />
                  {t('savingsEscalator.results.lineCoast')}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 border-t border-dashed border-zx-gold" />
                {t('savingsEscalator.results.lineTarget')}
              </span>
            </div>
          </div>

          {/* Yearly Table */}
          <div className="rounded-zx border border-zx-line bg-zx-surface overflow-hidden">
            <div className="px-4 py-3 border-b border-zx-line">
              <h2 className="text-sm font-semibold text-zx-text">{t('savingsEscalator.results.tableTitle')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zx-line bg-zx-surface-2">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft">{t('savingsEscalator.results.tableYear')}</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft">{t('savingsEscalator.results.tableAge')}</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft">{t('savingsEscalator.results.tableBalance')}</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft">{t('savingsEscalator.results.tableDeposit')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zx-line">
                  {visibleRows.map(row => (
                    <tr
                      key={row.yr}
                      className={row.isCoastYear ? 'bg-zx-accent/5' : 'hover:bg-zx-surface-2'}
                    >
                      <td className="px-4 py-2.5 text-zx-text-soft">
                        {row.yr === 0 ? 'Bắt đầu' : `+${row.yr}`}
                        {row.isCoastYear && (
                          <span className="ml-2 text-[10px] font-semibold text-zx-accent">{t('savingsEscalator.results.tableCoastMark')}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-zx-text">{row.age}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-zx-text">{fmt(row.balance, currency)}</td>
                      <td className="px-4 py-2.5 text-right text-zx-text-soft">
                        {row.yr === 0 ? '—' : fmt(row.monthlyDeposit, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tableRows.length > 11 && (
              <button
                type="button"
                onClick={() => setShowFullTable(v => !v)}
                className="flex w-full items-center justify-center gap-1.5 border-t border-zx-line px-4 py-2.5 text-xs text-zx-text-soft hover:text-zx-text transition"
              >
                {showFullTable ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showFullTable ? 'Thu gọn' : `Xem thêm ${tableRows.length - 11} năm`}
              </button>
            )}
          </div>

          {/* Conclusion + Disclaimer */}
          <div className="rounded-zx border border-zx-line bg-zx-surface p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zx-text">{t('savingsEscalator.results.conclusionTitle')}</h2>
            <p className="text-sm text-zx-text leading-relaxed">
              {plan.coastResult
                ? t('savingsEscalator.results.conclusionFound', {
                    pct: form.monthlyGrowthPct,
                    months: plan.coastResult.coastMonth,
                    years: (plan.coastResult.coastMonth / 12).toFixed(1),
                    age: Number(form.currentAge) + Math.floor(plan.coastResult.coastMonth / 12),
                    target: fmt(plan.fiTarget, currency),
                    retirementAge: form.retirementAge,
                  })
                : t('savingsEscalator.results.conclusionNotFound', { years: plan.years })
              }
            </p>
            <div className="flex items-start gap-2 rounded-zx-sm border border-zx-line bg-zx-surface-2 p-3">
              <Flame className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-zx-text-soft" />
              <p className="text-[11.5px] leading-relaxed text-zx-text-soft">{t('savingsEscalator.results.disclaimer')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-zx-line" />

      {/* Schedule Section */}
      {user && (
        <ScheduleSection userId={user.uid} t={t} notifEnabled={notifEnabled} currency={currency} />
      )}
    </main>
  );
}
