import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Circle, Lock } from 'lucide-react';
import { useAuth } from '../../core/auth/useAuth';
import { useI18n } from '../../core/i18n/useI18n';
import { useDashboardStats } from '../../core/hooks/useDashboardStats';
import { useWealthRoadmapData } from '../../core/hooks/useWealthRoadmapData';
import { useDebtData } from '../../core/hooks/useDebtData';
import { useEmergencyFundData } from '../../core/hooks/useEmergencyFundData';
import { usePayYourselfFirstData } from '../../core/hooks/usePayYourselfFirstData';
import { useFeatureAccess } from '../../core/hooks/useFeatureAccess';
import { fmtShort, formatNumber } from '../../core/utils/formatters';
import { useNumberFormat } from '../../core/hooks/useNumberFormat';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { calculateRequiredMonthlySaving, calculateFutureValue, applyDebtOverlay } from '../../core/services/financialCalculations';
import { useFundsData } from '../../core/hooks/useFundsData';
import NumericInput from '../components/ui/NumericInput';

function HL() { return <div className="h-px bg-zx-line" />; }

/* Tính ETA đến milestone tiếp theo */
function calcETA(stats, pyfData) {
  const target = stats.targetMonths;
  const current = stats.emergencyMonths;
  if (current >= target) return null;

  // Estimate monthly contribution from PYF alloc + net cash flow
  const monthlyContrib = pyfData.status.required > 0
    ? pyfData.status.required * (pyfData.allocationRule.emergencyFund / 100)
    : Math.max(0, stats.netCashFlow) * 0.15;

  if (monthlyContrib <= 0) return null;

  const essential = pyfData.totalIncome > 0
    ? pyfData.totalIncome * (1 - pyfData.allocationRule.living / 100)
    : stats.netCashFlow;

  // months to reach next milestone
  const milestones = [1, 3, 6, 12];
  const nextMilestone = milestones.find(m => m > current) || target;
  const savedAmount = stats.emergencyMonths * (essential / target) * target;
  const goalAmount = nextMilestone * (essential / target) * target;
  const monthsLeft = monthlyContrib > 0
    ? Math.ceil((goalAmount - savedAmount) / monthlyContrib)
    : null;

  return { nextMilestone, monthsLeft };
}

/* Milestone celebration state — returns key instead of hardcoded label */
function getMilestone(months) {
  if (months >= 12) return { stars: 4, labelKey: 'planHub.milestone12m', color: 'text-zx-gold' };
  if (months >= 6)  return { stars: 3, labelKey: 'planHub.milestone6m', color: 'text-zx-gold' };
  if (months >= 3)  return { stars: 2, labelKey: 'planHub.milestone3m', color: 'text-zx-positive' };
  if (months >= 1)  return { stars: 1, labelKey: 'planHub.milestone1m', color: 'text-zx-positive' };
  return null;
}

function getPriority(stats, debtSummary, latteMonthly, t, fmt, fmtNum) {
  if (stats.emergencyMonths < 1) {
    return {
      level: 'urgent',
      label: t('planHub.priorityUrgent'),
      message: t('planHub.noEmergencyFund'),
      action: t('planHub.fundEmergency'),
      to: '/financial-base?tab=emergency',
      tip: latteMonthly > 0 ? t('planHub.latteTip', { amount: fmt(latteMonthly * 0.5) }) : null,
    };
  }
  if (stats.emergencyMonths < 3) {
    return {
      level: 'urgent',
      label: t('planHub.priorityUrgent'),
      message: t('planHub.emergencyFundBelow3', { months: formatNumber(stats.emergencyMonths, { maximumFractionDigits: 1 }) }),
      action: t('planHub.fundMoreEmergency'),
      to: '/financial-base?tab=emergency',
      tip: latteMonthly > 0 ? t('trackHub.convertLatteHint', { amount: fmtNum(latteMonthly) }) : null,
    };
  }
  if (stats.emergencyMonths < stats.targetMonths) {
    return {
      level: 'active',
      label: t('planHub.building'),
      message: t('planHub.continueFunding', { months: formatNumber(stats.emergencyMonths, { maximumFractionDigits: 1 }), target: stats.targetMonths }),
      action: t('planHub.action.emergencyFund'),
      to: '/financial-base?tab=emergency',
      tip: null,
    };
  }
  if (stats.payYourselfProgress < 80) {
    return {
      level: 'active',
      label: t('planHub.nextStep'),
      message: t('planHub.focusPYF', { target: stats.targetMonths }),
      action: t('planHub.action.payYourself'),
      to: '/financial-base?tab=pyf',
      tip: null,
    };
  }
  if (debtSummary.totalDebt > 0) {
    return {
      level: 'active',
      label: t('planHub.needsAttention'),
      message: t('planHub.debtRemaining', { amount: fmtNum(debtSummary.totalDebt) }),
      action: t('planHub.action.debts'),
      to: '/financial-base?tab=debts',
      tip: null,
    };
  }
  return {
    level: 'done',
    label: t('planHub.building'),
    message: t('planHub.solidFoundation'),
    action: t('planHub.action.roadmap'),
    to: '/roadmap',
    tip: null,
  };
}

function PlanItem({ label, value, sub, to, status, canAccess: access }) {
  const statusColor = {
    done: 'text-zx-positive', active: 'text-zx-accent',
    upcoming: 'text-zx-text-soft', locked: 'text-zx-text-soft',
  }[status] || 'text-zx-text-soft';
  const Icon = status === 'done' ? CheckCircle2 : status === 'locked' ? Lock : Circle;

  const inner = (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className={`h-4 w-4 flex-shrink-0 ${statusColor}`} />
        <div className="min-w-0">
          <p className={`text-sm font-medium ${status === 'upcoming' || status === 'locked' ? 'text-zx-text-soft' : 'text-zx-text'}`}>
            {label}
          </p>
          {sub && <p className={`text-xs mt-0.5 ${statusColor}`}>{sub}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        {value && <span className={`font-zx-display text-base font-bold ${statusColor}`}>{value}</span>}
        {status !== 'locked' && access && <ArrowRight className="h-4 w-4 text-zx-text-soft" />}
      </div>
    </div>
  );

  if (!access || status === 'locked') return inner;
  return <Link to={to} className="block hover:bg-zx-surface-2 -mx-1 px-1 rounded-zx-sm transition">{inner}</Link>;
}

const ALLOCATION_LABELS = {
  living: 'planHub.alloc.living',
  emergencyFund: 'planHub.alloc.emergencyFund',
  longTermAsset: 'planHub.alloc.longTermAsset',
  businessLearning: 'planHub.alloc.businessLearning',
  highRiskTrading: 'planHub.alloc.highRiskTrading',
  debtRepayment: 'planHub.alloc.debtRepayment',
};

function ReverseGoalCalculator({ t, fmt }) {
  const [goal, setGoal] = useState('');
  const [years, setYears] = useState('');
  const [rate, setRate] = useState('8');
  const [result, setResult] = useState(null);
  const [inputError, setInputError] = useState('');

  function calcAt(fv, months, r) {
    if (r < 0) return null;
    return calculateRequiredMonthlySaving({ futureValueGoal: fv, presentValue: 0, annualRatePct: r, months });
  }

  function calculate() {
    setInputError('');
    const fv = Number(goal);
    const yrs = Number(years);
    const r = Number(rate);

    if (!goal || isNaN(fv) || fv <= 0) { setInputError(t('planHub.reverseGoal.errorGoal')); return; }
    if (!years || isNaN(yrs) || yrs <= 0) { setInputError(t('planHub.reverseGoal.errorYears')); return; }
    if (isNaN(r) || r < 0) { setInputError(t('planHub.reverseGoal.errorRate')); return; }

    const months = yrs * 12;
    const res = calcAt(fv, months, r);
    if (!res) { setInputError(t('planHub.reverseGoal.errorCalc')); return; }

    const series = Array.from({ length: Math.ceil(yrs) + 1 }, (_, yr) => {
      const m = yr * 12;
      const pmt = res.requiredMonthlySaving || 0;
      return {
        yr,
        low:    calculateFutureValue({ monthlyAmount: pmt, annualRatePct: Math.max(0, r - 1), months: m }),
        center: calculateFutureValue({ monthlyAmount: pmt, annualRatePct: r, months: m }),
        high:   calculateFutureValue({ monthlyAmount: pmt, annualRatePct: r + 1, months: m }),
        goal:   fv,
      };
    });

    setResult({ center: res, low: calcAt(fv, months, r - 1), high: calcAt(fv, months, r + 1), r, series, fv });
  }

  return (
    <section className="mt-6 pt-6 border-t border-zx-line">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft mb-3">
        {t('planHub.reverseGoal.title')}
      </p>
      <div className="space-y-3">
        <div>
          <label htmlFor="rg-goal" className="text-xs text-zx-text-soft block mb-1">{t('planHub.reverseGoal.goalLabel')}</label>
          <NumericInput id="rg-goal" placeholder="2000000000" value={goal}
            onChange={e => { setGoal(e.target.value); setResult(null); setInputError(''); }} />
          {goal && Number(goal) > 0 && (
            <p className="text-xs text-zx-text-soft mt-1.5">{fmt(Number(goal))}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="rg-years" className="text-xs text-zx-text-soft block mb-1">{t('planHub.reverseGoal.yearsLabel')}</label>
            <NumericInput id="rg-years" placeholder="20" value={years}
              onChange={e => { setYears(e.target.value); setResult(null); setInputError(''); }} />
          </div>
          <div>
            <label htmlFor="rg-rate" className="text-xs text-zx-text-soft block mb-1">{t('planHub.reverseGoal.rateLabel')}</label>
            <NumericInput id="rg-rate" placeholder="8" value={rate}
              onChange={e => { setRate(e.target.value); setResult(null); setInputError(''); }} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: t('planHub.reverseGoal.ratePresetSavings'), value: '5' },
            { label: t('planHub.reverseGoal.ratePresetInvested'), value: '8' },
            { label: t('planHub.reverseGoal.ratePresetGrowth'),  value: '11' },
          ].map(preset => (
            <button key={preset.value} type="button"
              onClick={() => { setRate(preset.value); setResult(null); setInputError(''); }}
              className={`rounded-zx-pill border px-2.5 py-1 text-[11px] transition ${
                rate === preset.value
                  ? 'border-zx-accent bg-zx-accent/10 text-zx-accent font-semibold'
                  : 'border-zx-line text-zx-text-soft hover:border-zx-accent/50 hover:text-zx-text'
              }`}>
              {preset.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-zx-text-soft">{t('planHub.reverseGoal.rateHint')}</p>
        {inputError && <p className="text-xs text-zx-negative">{inputError}</p>}
        <button type="button" onClick={calculate}
          className="w-full rounded-zx-sm bg-zx-accent py-2.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 transition">
          {t('planHub.reverseGoal.calculate')}
        </button>
        {result && (
          <div className="rounded-zx-sm bg-zx-surface-2 p-3">
            {result.center.alreadyMet ? (
              <p className="text-sm text-zx-positive font-medium text-center">{t('planHub.reverseGoal.alreadyMet')}</p>
            ) : (
              <>
                <p className="text-xs text-zx-text-soft mb-2 text-center">{t('planHub.reverseGoal.resultLabel')}</p>
                <div className="grid grid-cols-3 gap-1 text-center">
                  {[
                    { res: result.low,    rLabel: `${result.r - 1}%`, muted: true },
                    { res: result.center, rLabel: `${result.r}%`,     muted: false },
                    { res: result.high,   rLabel: `${result.r + 1}%`, muted: true },
                  ].map(({ res, rLabel, muted }) => (
                    <div key={rLabel} className={`rounded-zx-sm p-2 ${muted ? '' : 'bg-zx-surface ring-1 ring-zx-accent/30'}`}>
                      <p className={`text-[10px] mb-1 ${muted ? 'text-zx-text-soft' : 'text-zx-accent font-semibold'}`}>{rLabel}</p>
                      {!res || res.alreadyMet ? (
                        <p className="text-[11px] text-zx-positive font-semibold">✓</p>
                      ) : (
                        <p className={`font-zx-display text-sm font-bold leading-tight ${muted ? 'text-zx-text-soft' : 'text-zx-accent'}`}>
                          {fmt(res.requiredMonthlySaving)}
                        </p>
                      )}
                      <p className="text-[10px] text-zx-text-soft">{t('planHub.reverseGoal.perMonth')}</p>
                    </div>
                  ))}
                </div>
                {result.series && (
                  <div className="mt-3 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={result.series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <XAxis dataKey="yr" tick={{ fontSize: 10 }} tickFormatter={y => `${y}y`} />
                        <YAxis hide />
                        <Tooltip
                          formatter={(v, name) => [fmt(v), name === 'goal' ? t('planHub.reverseGoal.chartGoal') : `${name === 'low' ? result.r - 1 : name === 'high' ? result.r + 1 : result.r}%`]}
                          labelFormatter={yr => `${t('planHub.reverseGoal.chartYear')} ${yr}`}
                          contentStyle={{ fontSize: 11 }}
                        />
                        <Line type="monotone" dataKey="low"    stroke="var(--zx-text-soft)" strokeWidth={1.5} dot={false} strokeDasharray="3 2" />
                        <Line type="monotone" dataKey="center" stroke="var(--zx-accent)"    strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="high"   stroke="var(--zx-positive)"  strokeWidth={1.5} dot={false} strokeDasharray="3 2" />
                        <Line type="monotone" dataKey="goal"   stroke="var(--zx-gold)"      strokeWidth={1}   dot={false} strokeDasharray="4 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <p className="text-[10px] text-zx-text-soft mt-2 text-center">{t('planHub.reverseGoal.adjustHint')}</p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default function PlanHub() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { fmt, fmtNum } = useNumberFormat();
  const { canAccess } = useFeatureAccess(user);
  const { stats, loading: statsLoading } = useDashboardStats(user?.uid);
  const { data: roadmap, loading: roadmapLoading } = useWealthRoadmapData(user?.uid);
  const { data: debtData } = useDebtData(user?.uid);
  const { data: emergencyData } = useEmergencyFundData(user?.uid);
  const { data: pyfData } = usePayYourselfFirstData(user?.uid);

  const loading = statsLoading || roadmapLoading;
  const currentPhase = roadmap.phases.find(p => p.id === roadmap.currentPhaseId) || roadmap.phases[0] || null;
  const emgPct = stats.targetMonths > 0 ? (stats.emergencyMonths / stats.targetMonths) * 100 : 0;
  const milestone = getMilestone(stats.emergencyMonths);
  const eta = calcETA(stats, pyfData);
  const latteMonthly = stats.latteFactor || 0;
  const priority = getPriority(stats, debtData.summary, latteMonthly, t, fmt, fmtNum);

  const hasBadDebt = (debtData?.summary?.badDebt || 0) > 0;
  const adjustedAllocation = hasBadDebt
    ? applyDebtOverlay(pyfData.allocationRule, debtData.summary, pyfData.totalIncome)
    : null;
  const highestDebtRate = debtData?.summary?.highestPriorityDebt?.interestRate;

  const planItems = [
    {
      key: 'roadmap', label: t('planHub.items.roadmap'),
      value: currentPhase ? t('planHub.phaseShort', { num: roadmap.completedPhases + 1 }) : null,
      sub: currentPhase?.title || t('planHub.notSetup'),
      to: '/roadmap',
      status: roadmap.phases.length > 0 ? 'active' : 'upcoming',
      featureKey: 'roadmap',
    },
    {
      key: 'emergency', label: t('planHub.items.emergencyFund'),
      value: `${formatNumber(stats.emergencyMonths, { maximumFractionDigits: 1 })}/${stats.targetMonths} ${t('common.months')}`,
      sub: stats.emergencyMonths >= stats.targetMonths ? t('planHub.goalReached') : t('planHub.pctOfGoal', { pct: Math.round(emgPct) }),
      to: '/financial-base?tab=emergency',
      status: stats.emergencyMonths >= stats.targetMonths ? 'done' : 'active',
      featureKey: 'emergency_fund',
    },
    {
      key: 'pyf', label: t('planHub.items.payYourself'),
      value: `${formatNumber(stats.payYourselfProgress)}%`,
      sub: stats.payYourselfProgress >= 100 ? t('planHub.completedThisMonth') : `${t('planHub.remaining')} ${fmt(Math.max(0, stats.payYourselfTarget - stats.payYourselfSaved))}`,
      to: '/financial-base?tab=pyf',
      status: stats.payYourselfProgress >= 100 ? 'done' : 'active',
      featureKey: 'pay_yourself_first',
    },
    {
      key: 'debt', label: t('planHub.items.debts'),
      value: (debtData?.summary?.totalDebt || 0) > 0 ? fmt(debtData.summary.totalDebt) : null,
      sub: (debtData?.summary?.totalDebt || 0) > 0 ? t('planHub.debtCount', { count: debtData.debts?.length || 0 }) : t('planHub.noDebt'),
      to: '/financial-base?tab=debts',
      status: (debtData?.summary?.totalDebt || 0) === 0 ? 'done' : (stats.emergencyMonths >= 3 ? 'active' : 'upcoming'),
      featureKey: 'debt_control',
    },
    {
      key: 'income', label: t('planHub.items.income'),
      value: null,
      sub: stats.emergencyMonths >= stats.targetMonths ? t('planHub.readyToStart') : t('planHub.completeEmergencyFirst'),
      to: '/financial-base?tab=income',
      status: stats.emergencyMonths >= stats.targetMonths ? 'upcoming' : 'locked',
      featureKey: 'income_builder',
    },
    {
      key: 'assets', label: t('planHub.items.assets'),
      value: null,
      sub: stats.payYourselfProgress >= 80 ? t('planHub.readyToTrack') : t('planHub.stabilizePYFFirst'),
      to: '/financial-base?tab=assets',
      status: stats.payYourselfProgress >= 80 ? 'upcoming' : 'locked',
      featureKey: 'assets',
    },
    {
      key: 'trading', label: t('planHub.items.trading'),
      value: null,
      sub: t('planHub.afterEmergencyFund'),
      to: '/trading-risk',
      status: stats.emergencyMonths >= stats.targetMonths ? 'upcoming' : 'locked',
      featureKey: 'trading_risk',
    },
    {
      key: 'savingsEscalator', label: t('planHub.items.savingsEscalator'),
      value: null,
      sub: t('savingsEscalator.planItemSub'),
      to: '/savings-escalator',
      status: 'upcoming',
      featureKey: 'savings_escalator',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-8">
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-x-12 lg:items-start">

        {/* ── LEFT: Phase + milestone + progress ── */}
        <div>
          <section className="pb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft mb-3">
              {t('planHub.currentPhase')}
            </p>
            {loading ? (
              <p className="text-sm text-zx-text-soft">{t('common.loading')}</p>
            ) : (
              <>
                {milestone && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-lg">{'✦'.repeat(milestone.stars)}</span>
                    <span className={`text-sm font-semibold ${milestone.color}`}>{t(milestone.labelKey)}</span>
                  </div>
                )}

                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="font-zx-display text-4xl font-bold text-zx-text leading-none">
                      {roadmap.completedPhases + 1}
                      <span className="text-lg font-normal text-zx-text-soft ml-1">
                        / {roadmap.phases.length || '—'}
                      </span>
                    </p>
                    <p className="font-zx-head text-base font-semibold text-zx-text mt-1">
                      {currentPhase?.title || t('planHub.notSetup')}
                    </p>
                  </div>

                  {eta && (
                    <div className="text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zx-text-soft">
                        {t('planHub.toMilestone', { months: eta.nextMilestone })}
                      </p>
                      <p className="font-zx-display text-xl font-bold text-zx-accent mt-0.5">
                        ~{eta.monthsLeft} {t('common.months')}
                      </p>
                      <p className="text-[11px] text-zx-text-soft">{t('planHub.atCurrentRate')}</p>
                    </div>
                  )}
                </div>

                {currentPhase && (
                  <div className="mt-3">
                    <div className="h-1.5 rounded-full bg-zx-surface-2 overflow-hidden">
                      <div className="progress-fill h-full rounded-full"
                        style={{ width: `${roadmap.phases.length ? (roadmap.completedPhases / roadmap.phases.length) * 100 : 0}%` }} />
                    </div>
                    <p className="text-xs text-zx-text-soft mt-1.5">
                      {t('planHub.phasesCompleted', { completed: roadmap.completedPhases, total: roadmap.phases.length })}
                    </p>
                  </div>
                )}
              </>
            )}
          </section>

          <HL />

          {/* ── All plan items ── */}
          <section className="pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-2 pt-4">
              {t('planHub.allPlan')}
            </p>
            {planItems.map((item, i) => (
              <div key={item.key}>
                {i > 0 && <HL />}
                <PlanItem {...item} canAccess={canAccess(item.featureKey)} />
              </div>
            ))}
          </section>
        </div>

        {/* ── RIGHT: Priority + CTA ── */}
        <div className="border-t border-zx-line pt-6 lg:border-t-0 lg:pt-0 lg:border-l lg:border-zx-line lg:pl-12">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full ${
                priority.level === 'urgent' ? 'bg-zx-accent-soft text-zx-accent' :
                priority.level === 'done'   ? 'bg-zx-positive-soft text-zx-positive' :
                'bg-zx-surface-2 text-zx-text-soft'
              }`}>
                {priority.label}
              </span>
            </div>
            <p className="text-sm text-zx-text leading-relaxed mb-3">{priority.message}</p>

            {priority.tip && (
              <p className="text-xs text-zx-gold bg-zx-gold-soft rounded-zx-sm px-3 py-2 mb-3">
                💡 {priority.tip}
              </p>
            )}

            {canAccess(planItems.find(i => i.to === priority.to)?.featureKey || 'roadmap') && (
              <Link to={priority.to}
                className="inline-flex items-center gap-2 rounded-zx-sm bg-zx-accent px-4 py-2.5 text-sm font-medium text-zx-on-accent hover:opacity-90 transition">
                {priority.action} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </section>

          {/* Debt-Aware Allocation Overlay */}
          {hasBadDebt && adjustedAllocation && (
            <section className="mt-6 pt-6 border-t border-zx-line">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft mb-2">
                {t('planHub.debtOverlay.title')}
              </p>
              <p className="text-xs text-zx-text-soft leading-relaxed mb-3">
                {t('planHub.debtOverlay.explanation', {
                  interestRate: highestDebtRate != null ? highestDebtRate : '—',
                })}
              </p>
              <div className="space-y-1.5">
                {Object.entries(adjustedAllocation).map(([key, pct]) => pct > 0 && (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className={`text-zx-text${key === 'debtRepayment' ? ' font-semibold text-zx-accent' : ''}`}>
                      {t(ALLOCATION_LABELS[key] || key)}
                    </span>
                    <span className={`font-mono font-semibold${key === 'debtRepayment' ? ' text-zx-accent' : ' text-zx-text-soft'}`}>
                      {pct}%
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-zx-text-soft mt-2">{t('planHub.debtOverlay.disclaimer')}</p>
            </section>
          )}

          <ReverseGoalCalculator t={t} fmt={fmt} />
        </div>
      </div>
      {/* ── Fund Reference List ── */}
      <ReferenceFundList t={t} />
    </div>
  );
}

const RISK_COLOR = ['', 'text-zx-positive', 'text-zx-positive', 'text-zx-gold', 'text-zx-accent', 'text-zx-negative'];
const RISK_GROUPS = { low: [1, 2], mid: [3], high: [4, 5] };
const ASSET_TYPES = ['equity', 'balanced', 'bond', 'etf', 'money_market', 'flexible'];

function ReturnVal({ value }) {
  if (value == null) return <span className="text-zx-text-soft">—</span>;
  const cls = value >= 0 ? 'text-zx-positive' : 'text-zx-negative';
  return <span className={`font-semibold ${cls}`}>{value > 0 ? '+' : ''}{value}%</span>;
}

function SortTh({ col, label, sortKey, sortDir, onSort, align = 'left' }) {
  const active = sortKey === col;
  return (
    <th onClick={() => onSort(col)}
      className={`px-3 py-2.5 font-semibold text-[10px] uppercase tracking-[0.1em] cursor-pointer select-none whitespace-nowrap transition
        ${active ? 'text-zx-accent' : 'text-zx-text-soft hover:text-zx-text'}
        ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {label}
      <span className="ml-1 opacity-60">{active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </th>
  );
}

function FundFilterChip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-zx-pill border px-2.5 py-1 text-[11px] transition whitespace-nowrap ${
        active
          ? 'border-zx-accent bg-zx-accent/10 text-zx-accent font-semibold'
          : 'border-zx-line text-zx-text-soft hover:border-zx-accent/50 hover:text-zx-text'
      }`}>
      {children}
    </button>
  );
}

function ReferenceFundList({ t }) {
  const [open, setOpen] = useState(false);
  const { data: funds } = useFundsData();
  const [typeFilter, setTypeFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [sortKey, setSortKey] = useState('aumBillion');
  const [sortDir, setSortDir] = useState('desc');

  function handleSort(col) {
    if (sortKey === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(col);
      setSortDir(['return1y', 'return3y', 'return5y', 'aumBillion'].includes(col) ? 'desc' : 'asc');
    }
  }

  const visible = [...funds]
    .filter(f => typeFilter === 'all' || f.assetType === typeFilter)
    .filter(f => riskFilter === 'all' || RISK_GROUPS[riskFilter]?.includes(f.riskTier))
    .filter(f => managerFilter === 'all' || f.manager === managerFilter)
    .sort((a, b) => {
      let av, bv;
      if (sortKey === 'return1y')  { av = a.historicalReturns?.['1y'] ?? -999; bv = b.historicalReturns?.['1y'] ?? -999; }
      else if (sortKey === 'return3y') { av = a.historicalReturns?.['3y'] ?? -999; bv = b.historicalReturns?.['3y'] ?? -999; }
      else if (sortKey === 'return5y') { av = a.historicalReturns?.['5y'] ?? -999; bv = b.historicalReturns?.['5y'] ?? -999; }
      else if (sortKey === 'name') { av = a.name; bv = b.name; }
      else if (sortKey === 'manager') { av = a.manager; bv = b.manager; }
      else { av = a[sortKey] ?? 0; bv = b[sortKey] ?? 0; }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });

  const usedTypes = [...new Set(funds.map(f => f.assetType))];
  const usedManagers = [...new Set(funds.map(f => f.manager))].sort();

  return (
    <div className="mt-8 border-t border-zx-line pt-6">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full text-left group">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft group-hover:text-zx-text transition">
          {t('planHub.funds.sectionTitle')}
          <span className="ml-2 normal-case font-normal text-zx-text-soft/60">({funds.length})</span>
        </p>
        {open ? <ChevronUp className="h-4 w-4 text-zx-text-soft" /> : <ChevronDown className="h-4 w-4 text-zx-text-soft" />}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <p className="text-xs text-zx-text-soft bg-zx-surface-2 rounded-zx-sm px-3 py-2 leading-relaxed">
            ⚠ {t('planHub.funds.disclaimer')}
          </p>

          {/* Filters */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <FundFilterChip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>
                {t('planHub.funds.filterAll')}
              </FundFilterChip>
              {usedTypes.map(type => (
                <FundFilterChip key={type} active={typeFilter === type} onClick={() => setTypeFilter(type)}>
                  {t(`planHub.funds.assetType.${type}`)}
                </FundFilterChip>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'all', label: t('planHub.funds.filterAll') },
                { key: 'low',  label: `${t('planHub.funds.riskLow')} (1–2)` },
                { key: 'mid',  label: `${t('planHub.funds.riskMid')} (3)` },
                { key: 'high', label: `${t('planHub.funds.riskHigh')} (4–5)` },
              ].map(({ key, label }) => (
                <FundFilterChip key={key} active={riskFilter === key} onClick={() => setRiskFilter(key)}>
                  {label}
                </FundFilterChip>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <FundFilterChip active={managerFilter === 'all'} onClick={() => setManagerFilter('all')}>
                {t('planHub.funds.filterAll')}
              </FundFilterChip>
              {usedManagers.map(m => (
                <FundFilterChip key={m} active={managerFilter === m} onClick={() => setManagerFilter(m)}>
                  {m}
                </FundFilterChip>
              ))}
            </div>
          </div>

          {visible.length === 0 && (
            <p className="text-sm text-zx-text-soft text-center py-4">{t('planHub.funds.noResults')}</p>
          )}

          {/* Mobile: cards */}
          {visible.length > 0 && (
            <div className="md:hidden space-y-3">
              {visible.map(fund => (
                <div key={fund.id} className="rounded-zx border border-zx-line bg-zx-surface p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-zx-text">{fund.name}</p>
                      {fund.fullName && <p className="text-[11px] text-zx-text leading-snug">{fund.fullName}</p>}
                      <p className="text-xs text-zx-text-soft">{fund.manager}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zx-surface-2 text-zx-text-soft shrink-0">
                      {t(`planHub.funds.assetType.${fund.assetType}`)}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
                    <div>
                      <p className="text-zx-text-soft">{t('planHub.funds.colRisk')}</p>
                      <p className={`font-semibold ${RISK_COLOR[fund.riskTier] || ''}`}>{fund.riskTier}/5</p>
                    </div>
                    <div>
                      <p className="text-zx-text-soft">{t('planHub.funds.colExpense')}</p>
                      <p className="font-semibold text-zx-text">{fund.expenseRatioPct}%</p>
                    </div>
                    <div>
                      <p className="text-zx-text-soft">{t('planHub.funds.col1y')}</p>
                      <ReturnVal value={fund.historicalReturns?.['1y']} />
                    </div>
                    <div>
                      <p className="text-zx-text-soft">{t('planHub.funds.col3y')}</p>
                      <ReturnVal value={fund.historicalReturns?.['3y']} />
                    </div>
                    <div>
                      <p className="text-zx-text-soft">{t('planHub.funds.col5y')}</p>
                      <ReturnVal value={fund.historicalReturns?.['5y']} />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-zx-text-soft">
                    <span>{fund.fundAgeYears}{t('planHub.funds.ageUnit')} · {(fund.aumBillion ?? 0).toLocaleString()} {t('planHub.funds.aumUnit')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Desktop: table */}
          {visible.length > 0 && (
            <div className="hidden md:block overflow-x-auto rounded-zx border border-zx-line">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zx-line bg-zx-surface-2">
                    <SortTh col="name"         label={t('planHub.funds.colName')}    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh col="manager"      label={t('planHub.funds.colManager')} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-zx-text-soft uppercase tracking-[0.1em]">{t('planHub.funds.colType')}</th>
                    <SortTh col="fundAgeYears" label={t('planHub.funds.colAge')}     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortTh col="aumBillion"   label={t('planHub.funds.colAum')}     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortTh col="expenseRatioPct" label={t('planHub.funds.colExpense')} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortTh col="riskTier"     label={t('planHub.funds.colRisk')}    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortTh col="return1y"     label={t('planHub.funds.col1y')}      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortTh col="return3y"     label={t('planHub.funds.col3y')}      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortTh col="return5y"     label={t('planHub.funds.col5y')}      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zx-line">
                  {visible.map(fund => (
                    <tr key={fund.id} className="bg-zx-surface hover:bg-zx-surface-2 transition">
                      <td className="px-3 py-3 max-w-[200px]">
                        <p className="font-semibold text-zx-text">{fund.name}</p>
                        {fund.fullName && <p className="text-[11px] text-zx-text leading-snug truncate">{fund.fullName}</p>}
                      </td>
                      <td className="px-3 py-3 text-xs text-zx-text-soft whitespace-nowrap">{fund.manager}</td>
                      <td className="px-3 py-3">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zx-surface-2 text-zx-text-soft whitespace-nowrap">
                          {t(`planHub.funds.assetType.${fund.assetType}`)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-zx-text-soft">{fund.fundAgeYears}{t('planHub.funds.ageUnit')}</td>
                      <td className="px-3 py-3 text-right text-zx-text whitespace-nowrap">{(fund.aumBillion ?? 0).toLocaleString()} {t('planHub.funds.aumUnit')}</td>
                      <td className="px-3 py-3 text-right text-zx-text">{fund.expenseRatioPct}%</td>
                      <td className={`px-3 py-3 text-right font-semibold ${RISK_COLOR[fund.riskTier] || ''}`}>
                        {fund.riskTier}/5
                      </td>
                      <td className="px-3 py-3 text-right"><ReturnVal value={fund.historicalReturns?.['1y']} /></td>
                      <td className="px-3 py-3 text-right"><ReturnVal value={fund.historicalReturns?.['3y']} /></td>
                      <td className="px-3 py-3 text-right"><ReturnVal value={fund.historicalReturns?.['5y']} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[10px] text-zx-text-soft text-right">
            {t('planHub.funds.colSource')}: {funds[0]?.source?.split(' — ')[0] ?? 'Factsheet'}
          </p>
        </div>
      )}
    </div>
  );
}
