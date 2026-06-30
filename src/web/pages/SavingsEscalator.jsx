import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronRight, ChevronUp, Flame, Info, Trash2 } from 'lucide-react';
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
  activatePendingPlans,
  checkCanCreatePlan,
  createSavingsPlan,
  currentYearMonth,
  getMonthsElapsed,
  listSavingsPlans,
  updateSavingsPlan,
} from '../../core/services/savingsPlanService';
import { fmtShort, formatMoney } from '../../core/utils/formatters';
import { getCachedUserProfile, getUserProfile } from '../../core/services/userService';
import { getPayYourselfFirst } from '../../core/services/payYourselfFirstService';
import { BUCKET_KEYS, BUCKET_LABELS_VI } from '../../core/utils/bucketClassification';
import NumericInput from '../components/ui/NumericInput';

const CHANNEL_CONFIG = {
  bank: { color: 'text-zx-accent border-zx-accent/40 bg-zx-accent/10' },
  fund: { color: 'text-zx-positive border-zx-positive/40 bg-zx-positive/10' },
  bond: { color: 'text-zx-gold border-zx-gold/40 bg-zx-gold/10' },
  other: { color: 'text-zx-text-soft border-zx-line bg-zx-surface-2' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

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

  // Deposit amount at the coast point (used for "maintain flat" scenario)
  const depositAtCoast = coastResult
    ? series[Math.min(coastResult.coastMonth, series.length - 1)].monthlyDeposit
    : 0;

  // Yearly table rows
  const tableRows = Array.from({ length: years + 1 }, (_, yr) => {
    const m = yr * 12;
    const dp = series[Math.min(m, series.length - 1)];
    const isCoastYear = coastResult && m >= coastResult.coastMonth && (m - 12) < coastResult.coastMonth;
    const isAfterCoastYear = !!(coastResult && !isCoastYear && m > coastResult.coastMonth);

    const continueBalance = dp.balance;

    const coastBalance = (!coastResult || m <= coastResult.coastMonth)
      ? continueBalance
      : coastResult.balanceAtCoast * Math.pow(1 + r, m - coastResult.coastMonth);

    let maintainBalance;
    if (!coastResult || m <= coastResult.coastMonth) {
      maintainBalance = continueBalance;
    } else {
      const monthsAfter = m - coastResult.coastMonth;
      maintainBalance = r > 0
        ? coastResult.balanceAtCoast * Math.pow(1 + r, monthsAfter) + depositAtCoast * (Math.pow(1 + r, monthsAfter) - 1) / r
        : coastResult.balanceAtCoast + depositAtCoast * monthsAfter;
    }

    let annualDeposit = 0;
    let firstMonthDeposit = 0;
    if (yr > 0) {
      const startM = (yr - 1) * 12 + 1;
      for (let i = startM; i <= m; i++) {
        annualDeposit += series[Math.min(i, series.length - 1)].monthlyDeposit;
      }
      firstMonthDeposit = series[Math.min(startM, series.length - 1)].monthlyDeposit;
    }

    return { yr, age: currentAge + yr, continueBalance, maintainBalance, coastBalance, isCoastYear, isAfterCoastYear, annualDeposit, firstMonthDeposit };
  });

  return { fiTarget, coastResult, depositAtCoast, chartData, tableRows, months, years };
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
  const { t } = useI18n();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-zx-sm border border-zx-line bg-zx-surface px-3 py-2 shadow-zx text-xs space-y-1">
      <p className="font-semibold text-zx-text">{t('savingsEscalator.results.chartAge', { n: label })}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {formatMoney(p.value, currency)}</p>
      ))}
    </div>
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
  annualRatePct: 7,
  channelType: 'bank',
};

const CHANNEL_DEFAULT_RATES = { bank: 7, fund: 10, bond: 8, other: null };

function deriveDefaultRetirementAge(currentAge) {
  return Math.max(currentAge + 15, 60);
}

export default function SavingsEscalator() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { fmt } = useNumberFormat();
  const navigate = useNavigate();

  const [form, setForm] = useState({ ...BASE_FORM, currentAge: 30 });
  const [plan, setPlan] = useState(null);
  const [showFiNote, setShowFiNote] = useState(false);
  const [showFullTable, setShowFullTable] = useState(false);
  const [ageSeeded, setAgeSeeded] = useState(false);

  // Save plan state
  const [showSavePlanForm, setShowSavePlanForm] = useState(false);
  const [savePlanName, setSavePlanName] = useState('');
  const [savePlanStartMonth, setSavePlanStartMonth] = useState(currentYearMonth());
  const [savePlanBucket, setSavePlanBucket] = useState('longTermAsset');
  const [savingPlan, setSavingPlan] = useState(false);
  const [savePlanError, setSavePlanError] = useState('');
  const [updatingChannelId, setUpdatingChannelId] = useState(null);
  const [planCheck, setPlanCheck] = useState(null);
  const [planCheckLoading, setPlanCheckLoading] = useState(false);

  // Saved plans list
  const [savedPlans, setSavedPlans] = useState([]);
  const [plansLoaded, setPlansLoaded] = useState(false);

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

  useEffect(() => {
    if (!user?.uid || plansLoaded) return;
    (async () => {
      let list = await listSavingsPlans(user.uid);
      const hasPending = list.some(p => p.status === 'pending');
      if (hasPending) {
        const activated = await activatePendingPlans(user.uid);
        if (activated.length > 0) list = await listSavingsPlans(user.uid);
      }
      setSavedPlans(list);
      setPlansLoaded(true);
      // Pre-populate fiMultiple + monthlyExpense from most recent active plan
      const activePlan = list.find(p => (p.status ?? 'active') === 'active');
      if (activePlan?.params) {
        setForm(f => ({
          ...f,
          monthlyExpense: activePlan.params.monthlyExpense ?? f.monthlyExpense,
          fiMultiple: activePlan.params.fiMultiple ?? f.fiMultiple,
        }));
      }
    })();
  }, [user?.uid, plansLoaded]);

  const currency = user?.settings?.currency || 'VND';

  const portfolioSummary = useMemo(() => {
    const activePlans = savedPlans.filter(p => (p.status ?? 'active') === 'active');
    if (activePlans.length < 2) return null;
    const refPlan = activePlans[0];
    const fiTarget = refPlan.result?.fiTarget;
    const { retirementAge, currentAge } = refPlan.params || {};
    if (!fiTarget || !retirementAge || !currentAge) return null;

    const totalPlanMonths = (retirementAge - currentAge) * 12;
    const allSeries = activePlans.map(p =>
      buildGrowingContributionSeries({
        startMonthly: p.params.startMonthly,
        monthlyGrowthPct: p.params.monthlyGrowthPct,
        annualRatePct: p.params.annualRatePct,
        months: totalPlanMonths,
      })
    );
    const planElapsed = activePlans.map(p => getMonthsElapsed(p.executionStartDate));
    const refElapsed = planElapsed[0];
    const monthsToRetirement = Math.max(0, totalPlanMonths - refElapsed);

    // Combined coast: first t (months from now) where sum of projected finals >= fiTarget
    let combinedCoastFromNow = null;
    for (let t = 0; t <= monthsToRetirement; t++) {
      let projectedFinal = 0;
      for (let pi = 0; pi < activePlans.length; pi++) {
        const r = (activePlans[pi].params.annualRatePct || 7) / 100 / 12;
        const idx = Math.min(planElapsed[pi] + t, allSeries[pi].length - 1);
        const balance = allSeries[pi][idx]?.balance || 0;
        projectedFinal += balance * Math.pow(1 + r, monthsToRetirement - t);
      }
      if (projectedFinal >= fiTarget) { combinedCoastFromNow = t; break; }
    }

    // Individual coast months from now
    const individualCoastFromNow = activePlans.map((p, pi) => {
      const cm = p.result?.coastMonth;
      return cm != null ? Math.max(0, cm - planElapsed[pi]) : null;
    });

    // Chart: combined balance per year from now
    const chartYears = Math.min(30, Math.ceil(monthsToRetirement / 12));
    const chartData = Array.from({ length: chartYears + 1 }, (_, yr) => {
      const t = yr * 12;
      let combined = 0;
      for (let pi = 0; pi < activePlans.length; pi++) {
        const idx = Math.min(planElapsed[pi] + t, allSeries[pi].length - 1);
        combined += allSeries[pi][idx]?.balance || 0;
      }
      return { year: yr, balance: Math.round(combined) };
    });

    // Total monthly deposit right now
    const totalMonthlyNow = activePlans.reduce((sum, p, pi) => {
      const idx = Math.min(planElapsed[pi], allSeries[pi].length - 1);
      return sum + (allSeries[pi][idx]?.monthlyDeposit || p.params.startMonthly);
    }, 0);

    return { fiTarget, totalMonthlyNow, combinedCoastFromNow, individualCoastFromNow, chartData, planCount: activePlans.length, plans: activePlans };
  }, [savedPlans]);

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleChannelChange(type) {
    const defaultRate = CHANNEL_DEFAULT_RATES[type];
    setForm(f => ({
      ...f,
      channelType: type,
      ...(defaultRate != null ? { annualRatePct: defaultRate } : {}),
    }));
    if (plan) setPlan(null);
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

  async function handleSavePlan(e) {
    e.preventDefault();
    if (!plan?.coastResult || !user?.uid) return;
    setSavingPlan(true);
    setSavePlanError('');
    try {
      const planResult = {
        fiTarget: plan.fiTarget,
        coastMonth: plan.coastResult.coastMonth,
        coastAge: Number(form.currentAge) + Math.floor(plan.coastResult.coastMonth / 12),
        balanceAtCoast: plan.coastResult.balanceAtCoast,
        depositAtCoast: plan.depositAtCoast,
        years: plan.years,
        scenarios: {
          continueBalance: plan.tableRows[plan.years]?.continueBalance ?? 0,
          maintainBalance: plan.tableRows[plan.years]?.maintainBalance ?? 0,
          coastBalance: plan.tableRows[plan.years]?.coastBalance ?? 0,
        },
      };
      const params = {
        startMonthly: Number(form.startMonthly),
        monthlyGrowthPct: Number(form.monthlyGrowthPct),
        monthlyExpense: Number(form.monthlyExpense),
        fiMultiple: Number(form.fiMultiple),
        currentAge: Number(form.currentAge),
        retirementAge: Number(form.retirementAge),
        annualRatePct: Number(form.annualRatePct),
        currency,
      };
      const id = await createSavingsPlan(user.uid, {
        name: savePlanName || t('savingsEscalator.savePlan.namePlaceholder'),
        params,
        result: planResult,
        executionStartDate: savePlanStartMonth,
        status: planCheck?.newStatus || 'active',
        channelType: form.channelType,
        bucket: savePlanBucket,
      });
      navigate(`/savings-escalator/plan/${id}`);
    } catch (err) {
      setSavePlanError(t('savingsEscalator.savePlan.saveFailed'));
    } finally {
      setSavingPlan(false);
    }
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

      {/* Portfolio summary — only when ≥ 2 active plans */}
      {portfolioSummary && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft">
              {t('savingsEscalator.portfolio.title')}
            </p>
            <span className="text-[11px] text-zx-text-soft">
              {t('savingsEscalator.portfolio.planCount', { n: portfolioSummary.planCount })}
            </span>
          </div>
          <div className="rounded-zx border border-zx-line bg-zx-surface p-4 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] text-zx-text-soft mb-1">{t('savingsEscalator.portfolio.fiTarget')}</p>
                <p className="font-bold text-zx-text">{fmtShort(portfolioSummary.fiTarget)}</p>
              </div>
              <div>
                <p className="text-[11px] text-zx-text-soft mb-1">{t('savingsEscalator.portfolio.totalMonthly')}</p>
                <p className="font-bold text-zx-accent">
                  {fmtShort(portfolioSummary.totalMonthlyNow)}<span className="text-xs font-normal text-zx-text-soft">/th</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-zx-text-soft mb-1">{t('savingsEscalator.portfolio.combinedCoast')}</p>
                <p className={`font-bold ${portfolioSummary.combinedCoastFromNow === 0 ? 'text-zx-positive' : 'text-zx-text'}`}>
                  {portfolioSummary.combinedCoastFromNow === 0
                    ? t('savingsEscalator.portfolio.alreadyCoast')
                    : portfolioSummary.combinedCoastFromNow == null
                    ? '—'
                    : t('savingsEscalator.portfolio.monthsAway', { n: portfolioSummary.combinedCoastFromNow })}
                </p>
                <p className="text-[11px] text-zx-text-soft mt-0.5 leading-snug">
                  {portfolioSummary.individualCoastFromNow.map((m, i) => {
                    const ch = portfolioSummary.plans[i]?.channelType || 'other';
                    const label = t(`savingsEscalator.savePlan.channelType.${ch}`, {}, `K${i + 1}`);
                    return m == null ? null
                      : m === 0 ? `${label}: Đã Coast`
                      : `${label}: ${m}T`;
                  }).filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
            {/* Chart */}
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={portfolioSummary.chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} tickFormatter={v => `+${v}n`} />
                  <YAxis hide domain={[0, portfolioSummary.fiTarget * 1.1]} />
                  <Tooltip
                    formatter={v => fmtShort(v)}
                    labelFormatter={v => `+${v} năm`}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <ReferenceLine
                    y={portfolioSummary.fiTarget}
                    stroke="var(--zx-accent)"
                    strokeDasharray="4 2"
                    label={{ value: 'FI', position: 'insideRight', fontSize: 10, fill: 'var(--zx-accent)', dy: -6 }}
                  />
                  {portfolioSummary.combinedCoastFromNow != null && portfolioSummary.combinedCoastFromNow > 0 && (
                    <ReferenceLine
                      x={Math.ceil(portfolioSummary.combinedCoastFromNow / 12)}
                      stroke="var(--zx-positive)"
                      strokeDasharray="3 2"
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="var(--zx-positive)"
                    strokeWidth={2}
                    dot={false}
                    name={t('savingsEscalator.portfolio.chartBalance')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* Saved plans — shown prominently if user has existing plans */}
      {user && savedPlans.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft">
            {t('savingsEscalator.savePlan.savedPlansTitle')}
          </p>
          <div className="rounded-zx border border-zx-line bg-zx-surface divide-y divide-zx-line overflow-hidden">
            {savedPlans.map(sp => (
              <div key={sp.id}>
                {/* Navigate row */}
                <button
                  type="button"
                  onClick={() => navigate(`/savings-escalator/plan/${sp.id}`)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zx-surface-2 transition"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-zx-text">{sp.name}</span>
                      {sp.channelType && (
                        <span className={`rounded-zx-pill border px-1.5 py-0.5 text-[10px] font-semibold ${(CHANNEL_CONFIG[sp.channelType] || CHANNEL_CONFIG.other).color}`}>
                          {t(`savingsEscalator.savePlan.channelType.${sp.channelType}`, {}, sp.channelType)}
                        </span>
                      )}
                      {sp.status === 'pending' && (
                        <span className="text-[11px] font-semibold text-zx-maintain">
                          {t('savingsEscalator.savePlan.pendingBadge')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zx-text-soft mt-0.5">
                      {sp.executionStartDate
                        ? `Bắt đầu ${sp.executionStartDate.replace('-', '/')} · Coast tháng ${sp.result?.coastMonth}`
                        : `Coast tháng ${sp.result?.coastMonth}`}
                      {sp.activeScenario && (
                        <span className="ml-2 font-medium text-zx-accent">
                          {sp.activeScenario === 'continue' ? t('savingsEscalator.plan.scenarioPick1') :
                           sp.activeScenario === 'maintain' ? t('savingsEscalator.plan.scenarioPick2') :
                           t('savingsEscalator.plan.scenarioPick3')}
                        </span>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-zx-text-soft" />
                </button>

                {/* Inline channel picker — only for plans missing channelType */}
                {!sp.channelType && (
                  <div className="px-4 pb-3 border-t border-zx-line/60 bg-zx-surface-2">
                    <p className="text-[11px] text-zx-text-soft pt-2 mb-1.5">
                      {t('savingsEscalator.savePlan.channelType.label')}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {['bank', 'fund', 'bond', 'other'].map(type => (
                        <button
                          key={type}
                          type="button"
                          disabled={updatingChannelId === sp.id}
                          onClick={async () => {
                            setUpdatingChannelId(sp.id);
                            try {
                              await updateSavingsPlan(user.uid, sp.id, { channelType: type });
                              setSavedPlans(prev => prev.map(p =>
                                p.id === sp.id ? { ...p, channelType: type } : p
                              ));
                            } finally {
                              setUpdatingChannelId(null);
                            }
                          }}
                          className={`rounded-zx-sm border px-2 py-1.5 text-xs transition text-left disabled:opacity-50 ${CHANNEL_CONFIG[type].color} hover:opacity-80`}
                        >
                          {t(`savingsEscalator.savePlan.channelType.${type}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => document.getElementById('se-new-calc')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-xs text-zx-text-soft hover:text-zx-text transition underline underline-offset-2"
          >
            + Tính kế hoạch mới
          </button>
        </section>
      )}

      {/* Input Form */}
      <div id="se-new-calc">
      <form onSubmit={handleCalculate} className="rounded-zx border border-zx-line bg-zx-surface p-5 space-y-5">
        {/* Channel type selector */}
        <div>
          <p className="text-sm text-zx-text-soft mb-2">{t('savingsEscalator.savePlan.channelType.label')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['bank', 'fund', 'bond', 'other'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => handleChannelChange(type)}
                className={`rounded-zx-sm border px-3 py-2.5 text-sm transition text-left ${
                  form.channelType === type
                    ? CHANNEL_CONFIG[type].color + ' font-semibold'
                    : 'border-zx-line text-zx-text-soft hover:border-zx-accent/50 hover:text-zx-text'
                }`}
              >
                {t(`savingsEscalator.savePlan.channelType.${type}`)}
              </button>
            ))}
          </div>
        </div>

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
            {savedPlans.some(p => (p.status ?? 'active') === 'active') && (
              <p className="mt-1 text-[11px] text-zx-text-soft">{t('savingsEscalator.form.fiPreFilled')}</p>
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
            {form.channelType && form.channelType !== 'other' && (
              <p className="mt-1 text-[11px] text-zx-text-soft">
                {t(`savingsEscalator.form.rateHint_${form.channelType}`)}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto rounded-zx-sm bg-zx-accent px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition"
        >
          {t('savingsEscalator.form.calculate')}
        </button>
      </form>
      </div>

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
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft">{t('savingsEscalator.results.tableYearAge')}</th>
                    {plan.coastResult ? (
                      <>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-positive">{t('savingsEscalator.results.tableBalanceContinue')}</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-maintain">{t('savingsEscalator.results.tableBalanceMaintain')}</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-gold">{t('savingsEscalator.results.tableBalanceCoast')}</th>
                      </>
                    ) : (
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft">{t('savingsEscalator.results.tableBalance')}</th>
                    )}
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft">{t('savingsEscalator.results.tableAnnualDeposit')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zx-line">
                  {visibleRows.map(row => (
                    <tr
                      key={row.yr}
                      className={row.isCoastYear ? 'bg-zx-gold/5' : 'hover:bg-zx-surface-2'}
                    >
                      <td className="px-4 py-2.5">
                        <span className="block text-sm text-zx-text-soft">
                          {row.yr === 0 ? t('savingsEscalator.results.tableStart') : `+${row.yr}`}
                          {row.isCoastYear && (
                            <span className="ml-1.5 text-[10px] font-semibold text-zx-gold">{t('savingsEscalator.results.tableCoastMark')}</span>
                          )}
                        </span>
                        <span className="block text-xs text-zx-text-soft">{t('savingsEscalator.results.tableAge')} {row.age}</span>
                      </td>
                      {plan.coastResult ? (
                        <>
                          <td className="px-4 py-2.5 text-right font-medium text-zx-text">{fmt(row.continueBalance, currency)}</td>
                          <td className={`px-4 py-2.5 text-right font-medium ${row.isAfterCoastYear || row.isCoastYear ? 'text-zx-maintain' : 'text-zx-text-soft'}`}>
                            {fmt(row.maintainBalance, currency)}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-medium ${row.isAfterCoastYear || row.isCoastYear ? 'text-zx-gold' : 'text-zx-text-soft'}`}>
                            {fmt(row.coastBalance, currency)}
                          </td>
                        </>
                      ) : (
                        <td className="px-4 py-2.5 text-right font-medium text-zx-text">{fmt(row.continueBalance, currency)}</td>
                      )}
                      <td className="px-4 py-2.5 text-right">
                        {row.yr === 0 ? (
                          <span className="text-zx-text-soft">—</span>
                        ) : (
                          <>
                            <span className={`block font-medium ${row.isAfterCoastYear ? 'text-zx-text-soft' : 'text-zx-text'}`}>
                              {fmt(row.annualDeposit, currency)}
                            </span>
                            <span className="block text-[10px] text-zx-text-soft">
                              {row.isAfterCoastYear
                                ? t('savingsEscalator.results.tableDepositIfContinue')
                                : t('savingsEscalator.results.tableDepositFrom', { amount: fmt(row.firstMonthDeposit, currency) })
                              }
                            </span>
                          </>
                        )}
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
                {showFullTable ? t('savingsEscalator.results.tableCollapse') : t('savingsEscalator.results.tableShowMore', { n: tableRows.length - 11 })}
              </button>
            )}
          </div>

          {/* Conclusion + Disclaimer */}
          <div className="rounded-zx border border-zx-line bg-zx-surface p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zx-text">{t('savingsEscalator.results.conclusionTitle')}</h2>

            {plan.coastResult ? (() => {
              const coastAge = Number(form.currentAge) + Math.floor(plan.coastResult.coastMonth / 12);
              const finalRow = plan.tableRows[plan.years];
              const scenarios = [
                {
                  borderColor: 'border-l-zx-positive',
                  labelColor: 'text-zx-positive',
                  label: t('savingsEscalator.results.conclusionScenario1Label', { pct: form.monthlyGrowthPct }),
                  body: t('savingsEscalator.results.conclusionScenario1Body', { retirementAge: form.retirementAge, balance: fmt(finalRow.continueBalance, currency) }),
                },
                {
                  borderColor: 'border-l-zx-maintain',
                  labelColor: 'text-zx-maintain',
                  label: t('savingsEscalator.results.conclusionScenario2Label', { deposit: fmt(plan.depositAtCoast, currency), coastMonth: plan.coastResult.coastMonth }),
                  body: t('savingsEscalator.results.conclusionScenario2Body', { retirementAge: form.retirementAge, balance: fmt(finalRow.maintainBalance, currency) }),
                },
                {
                  borderColor: 'border-l-zx-gold',
                  labelColor: 'text-zx-gold',
                  label: t('savingsEscalator.results.conclusionScenario3Label', { coastMonth: plan.coastResult.coastMonth, coastAge }),
                  body: t('savingsEscalator.results.conclusionScenario3Body', { retirementAge: form.retirementAge, balance: fmt(finalRow.coastBalance, currency) }),
                },
              ];
              return (
                <>
                  <p className="text-xs font-semibold text-zx-text-soft uppercase tracking-[0.12em]">
                    {t('savingsEscalator.results.conclusionCoastHeader', {
                      months: plan.coastResult.coastMonth,
                      years: (plan.coastResult.coastMonth / 12).toFixed(1),
                      age: coastAge,
                    })}
                  </p>
                  <div className="space-y-2">
                    {scenarios.map((s, i) => (
                      <div key={i} className={`rounded-zx-sm border-l-[3px] bg-zx-surface-2 py-3 pl-4 pr-3 ${s.borderColor}`}>
                        <p className={`text-[11px] font-bold mb-1.5 ${s.labelColor}`}>
                          {`0${i + 1} — `}{s.label}
                        </p>
                        <p className="text-sm text-zx-text leading-relaxed">{s.body}</p>
                      </div>
                    ))}
                  </div>
                </>
              );
            })() : (
              <p className="text-sm text-zx-text leading-relaxed">
                {t('savingsEscalator.results.conclusionNotFound', { years: plan.years })}
              </p>
            )}

            <div className="flex items-start gap-2 rounded-zx-sm border border-zx-line bg-zx-surface-2 p-3">
              <Flame className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-zx-text-soft" />
              <p className="text-[11.5px] leading-relaxed text-zx-text-soft">{t('savingsEscalator.results.disclaimer')}</p>
            </div>
          </div>

          {/* Save plan CTA — only show when coast was found */}
          {plan.coastResult && user && (
            <div className="rounded-zx border border-zx-line bg-zx-surface p-5 space-y-3">
              <div>
                <h2 className="font-semibold text-zx-text">{t('savingsEscalator.savePlan.sectionTitle')}</h2>
                <p className="text-sm text-zx-text-soft mt-0.5">{t('savingsEscalator.savePlan.sectionSubtitle')}</p>
              </div>
              {!showSavePlanForm && !planCheck?.allowed && planCheck && (
                <div className="rounded-zx-sm border border-zx-negative/40 bg-zx-negative/10 px-4 py-3 text-sm text-zx-negative">
                  {planCheck.blockReason === 'pending_exists' && t('savingsEscalator.savePlan.blockPendingExists', { name: planCheck.blockDetail.name })}
                  {planCheck.blockReason === 'too_young' && t('savingsEscalator.savePlan.blockTooYoung', { name: planCheck.blockDetail.name, months: planCheck.blockDetail.months })}
                  {planCheck.blockReason === 'low_consistency' && t('savingsEscalator.savePlan.blockLowConsistency', { pct: planCheck.blockDetail.pct })}
                </div>
              )}
              {!showSavePlanForm ? (
                <button
                  type="button"
                  disabled={planCheckLoading}
                  onClick={async () => {
                    setSavePlanName('');
                    setSavePlanStartMonth(currentYearMonth());
                    setSavePlanBucket('longTermAsset');
                    setPlanCheck(null);
                    setPlanCheckLoading(true);
                    try {
                      const pyfData = await getPayYourselfFirst(user.uid);
                      const bucketTarget = (pyfData?.allocations || []).find(a => a.key === savePlanBucket)?.amount || 0;
                      const check = await checkCanCreatePlan(user.uid, Number(form.annualRatePct), {
                        bucket: savePlanBucket,
                        newPlanMonthly: Number(form.startMonthly || 0),
                        bucketTargetAmount: bucketTarget,
                      });
                      setPlanCheck(check);
                      if (check.allowed) setShowSavePlanForm(true);
                    } catch {
                      setPlanCheck({ allowed: true, newStatus: 'active' });
                      setShowSavePlanForm(true);
                    } finally {
                      setPlanCheckLoading(false);
                    }
                  }}
                  className="rounded-zx-sm bg-zx-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
                >
                  {planCheckLoading ? t('savingsEscalator.savePlan.checking') : t('savingsEscalator.savePlan.ctaButton')}
                </button>
              ) : (
                <form onSubmit={handleSavePlan} className="space-y-4">
                  {planCheck?.warn && (
                    <div className="rounded-zx-sm border border-zx-maintain/40 bg-zx-maintain/10 px-4 py-3 text-sm text-zx-maintain">
                      {planCheck.warnReason === 'consistency' && t('savingsEscalator.savePlan.warnConsistency', { pct: planCheck.avgPct })}
                      {planCheck.warnReason === 'no_mature_plan' && t('savingsEscalator.savePlan.warnNoMaturePlan')}
                    </div>
                  )}
                  {planCheck?.riskWarning && (
                    <div className="rounded-zx-sm border border-zx-maintain/40 bg-zx-maintain/10 px-4 py-3 text-sm text-zx-maintain">
                      {t('savingsEscalator.savePlan.riskWarning', { pct: form.annualRatePct })}
                    </div>
                  )}
                  {planCheck?.budgetWarning && (
                    <div className="rounded-zx-sm border border-zx-negative/40 bg-zx-negative/10 px-4 py-3 text-sm text-zx-negative">
                      {t('savingsEscalator.savePlan.budgetWarning', {
                        overBy: planCheck.budgetWarning.overBy?.toLocaleString('vi-VN'),
                        totalAfter: planCheck.budgetWarning.totalAfter?.toLocaleString('vi-VN'),
                        bucketTarget: planCheck.budgetWarning.bucketTargetAmount?.toLocaleString('vi-VN'),
                      })}
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="sp-name" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.savePlan.nameLabel')}</label>
                      <input
                        id="sp-name"
                        value={savePlanName}
                        onChange={e => setSavePlanName(e.target.value)}
                        placeholder={t('savingsEscalator.savePlan.namePlaceholder')}
                        className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2.5 text-sm text-zx-text placeholder:text-zx-text-soft focus:outline-none focus:ring-2 focus:ring-zx-accent"
                      />
                    </div>
                    <div>
                      <label htmlFor="sp-month" className="block text-sm text-zx-text-soft mb-1">{t('savingsEscalator.savePlan.startMonthLabel')}</label>
                      <input
                        id="sp-month"
                        type="month"
                        value={savePlanStartMonth}
                        onChange={e => setSavePlanStartMonth(e.target.value)}
                        className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2.5 text-sm text-zx-text focus:outline-none focus:ring-2 focus:ring-zx-accent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-zx-text-soft mb-1">
                      {t('savingsEscalator.savePlan.bucketLabel', {}, 'Nhóm tích lũy')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {BUCKET_KEYS.map(key => (
                        <button key={key} type="button" onClick={() => setSavePlanBucket(key)}
                          className={`rounded-zx-sm border px-3 py-2 text-sm text-left transition ${
                            savePlanBucket === key
                              ? 'border-purple-500 bg-purple-950/40 text-purple-300'
                              : 'border-zx-line text-zx-text-soft hover:border-purple-500'
                          }`}>
                          {BUCKET_LABELS_VI[key]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={savingPlan}
                      className="rounded-zx-sm bg-zx-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition"
                    >
                      {savingPlan ? t('savingsEscalator.savePlan.saving') : t('savingsEscalator.savePlan.save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowSavePlanForm(false); setPlanCheck(null); }}
                      className="rounded-zx-sm border border-zx-line px-4 py-2.5 text-sm text-zx-text-soft hover:text-zx-text transition"
                    >
                      {t('savingsEscalator.savePlan.cancel')}
                    </button>
                  </div>
                  {savePlanError && (
                    <p className="text-xs text-zx-negative">{savePlanError}</p>
                  )}
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* Divider */}
    </main>
  );
}
