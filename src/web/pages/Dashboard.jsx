import { Link } from 'react-router-dom';
import { ArrowRight, Coffee, Lock, PiggyBank, Plus, Shield, Wallet } from 'lucide-react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '../../core/auth/useAuth';
import { useFeatureAccess } from '../../core/hooks/useFeatureAccess';
import { useI18n } from '../../core/i18n/useI18n';
import { useDashboardStats } from '../../core/hooks/useDashboardStats';
import { useAssetsData } from '../../core/hooks/useAssetsData';
import { useDebtData } from '../../core/hooks/useDebtData';
import { useTransactionsData } from '../../core/hooks/useTransactionsData';
import { formatNumber } from '../../core/utils/formatters';
import { useNumberFormat } from '../../core/hooks/useNumberFormat';
import DailyQuoteCard from '../components/DailyQuoteCard';

/* ── tiny components ── */

function StatTile({ icon: Icon, iconColor, label, value, valueColor, sub, subPositive, bar, barPct, to }) {
  const inner = (
    <div className="py-5 group">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-zx-sm bg-zx-icon-bg flex items-center justify-center flex-shrink-0 zx-transition"
          style={{ color: iconColor }}>
          <Icon className="h-4 w-4" />
        </div>
        {to && <ArrowRight className="h-3.5 w-3.5 text-zx-text-soft opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft mb-2">{label}</p>
      <p className={`font-zx-display text-2xl md:text-3xl font-bold leading-none ${valueColor || 'text-zx-text'}`}>
        {value}
      </p>
      {bar && (
        <div className="mt-2.5 h-1.5 rounded-full bg-zx-surface-2 overflow-hidden">
          <div className="progress-fill h-full rounded-full" style={{ width: `${Math.min(100, barPct || 0)}%` }} />
        </div>
      )}
      {sub && (
        <p className={`mt-1.5 text-xs font-medium ${subPositive ? 'text-zx-positive' : 'text-zx-text-soft'}`}>
          {sub}
        </p>
      )}
    </div>
  );
  if (to) return <Link to={to} className="block cursor-pointer">{inner}</Link>;
  return inner;
}

function HL() { return <div className="h-px bg-zx-line" />; }

/* ── helpers ── */

function getGreeting(t, name) {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return t('dashboard.greetingMorning', { name });
  if (h >= 12 && h < 18) return t('dashboard.greetingAfternoon', { name });
  return t('dashboard.greetingEvening', { name });
}

function buildFocusItems(stats, isPremium, t) {
  const isNewUser = stats.netCashFlow === 0 && stats.latteFactor === 0 && stats.emergencyMonths === 0;
  if (isNewUser) {
    return [{ text: t('dashboard.weeklyFocus.noData'), to: '/transactions/new' }];
  }

  const items = [];

  if (stats.netCashFlow < 0) {
    items.push({ text: t('dashboard.weeklyFocus.negativeCashFlow'), to: '/transactions', urgent: true });
  }

  const emgPct = stats.targetMonths > 0
    ? Math.round((stats.emergencyMonths / stats.targetMonths) * 100)
    : 100;
  if (emgPct < 50) {
    items.push({
      text: t('dashboard.weeklyFocus.lowEmergencyFund', { pct: emgPct, months: stats.targetMonths }),
      to: '/emergency',
    });
  }

  if (stats.latteFactorPercent > 15 && stats.latteFactor > 0) {
    items.push({
      text: t('dashboard.weeklyFocus.highLatte', { pct: Math.abs(Math.round(stats.latteFactorPercent)) }),
      to: '/latte',
    });
  }

  if (isPremium && stats.payYourselfTarget > 0 && stats.payYourselfProgress < 50) {
    items.push({
      text: t('dashboard.weeklyFocus.pyfBehind', { pct: Math.round(stats.payYourselfProgress) }),
      to: '/pay-yourself-first',
    });
  }

  if (items.length === 0) {
    items.push({ text: t('dashboard.weeklyFocus.allGood') });
  }

  return items.slice(0, 3);
}

/* ── chart tooltip ── */

function ChartTooltip({ active, payload, fmt, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-zx-sm border border-zx-line bg-zx-surface px-3 py-2 text-xs shadow-zx">
      <p className="font-semibold text-zx-text">{payload[0]?.payload?.label}</p>
      <p style={{ color: payload[0]?.fill }}>{fmt(payload[0]?.value, currency)}</p>
    </div>
  );
}

/* ── premium debt widget ── */

function DebtWidget({ debtData, currency, t, fmt }) {
  const { summary } = debtData;
  const hasDebt = summary.totalDebt > 0;
  const payoffPct = summary.payoffProgress > 0 ? Math.round(summary.payoffProgress * 100) : 0;

  return (
    <Link to="/debts" className="block rounded-zx border border-zx-line bg-zx-surface p-4 group hover:border-zx-accent transition">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft">
          {t('dashboard.debtPressure')}
        </p>
        <ArrowRight className="h-3.5 w-3.5 text-zx-text-soft opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {hasDebt ? (
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-zx-display text-xl font-bold text-zx-accent">
              {fmt(summary.totalDebt, currency)}
            </p>
            <p className="text-xs text-zx-text-soft mt-0.5">
              {t('dashboard.monthlyPayment')}: {fmt(summary.monthlyPayment, currency)}
            </p>
          </div>
          {payoffPct > 0 && (
            <div className="text-right shrink-0">
              <p className="font-zx-display text-lg font-bold text-zx-positive">{payoffPct}%</p>
              <p className="text-[10px] text-zx-text-soft">{t('dashboard.debtPaidOff')}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-zx-positive">{t('dashboard.noDebt')}</p>
      )}
    </Link>
  );
}

/* ── goal progress card ── */
function GoalCard({ icon: Icon, iconColor, label, value, targetLabel, pct, doneLabel, progressLabel, locked, to }) {
  const capped = Math.min(100, pct || 0);
  const isDone = (pct || 0) >= 100;

  const inner = (
    <div className={`rounded-zx border bg-zx-surface p-4 group h-full transition ${locked ? 'border-zx-line opacity-60' : 'border-zx-line hover:border-zx-accent'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: locked ? 'var(--zx-text-soft)' : iconColor }} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft">{label}</p>
        </div>
        {locked
          ? <Lock className="h-3.5 w-3.5 text-zx-text-soft/40" />
          : <ArrowRight className="h-3.5 w-3.5 text-zx-text-soft opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <p className={`font-zx-display text-xl font-bold leading-none mt-1 ${locked ? 'text-zx-text-soft' : isDone ? 'text-zx-positive' : 'text-zx-text'}`}>
        {value}
      </p>
      <p className="text-xs text-zx-text-soft mt-0.5">{targetLabel}</p>
      {!locked && (
        <>
          <div className="mt-3 h-1.5 rounded-full bg-zx-surface-2 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${capped}%`, background: isDone ? 'var(--zx-positive)' : iconColor }} />
          </div>
          <p className={`mt-1.5 text-xs font-medium ${isDone ? 'text-zx-positive' : 'text-zx-text-soft'}`}>
            {isDone ? doneLabel : progressLabel}
          </p>
        </>
      )}
    </div>
  );

  return <Link to={to} className="block">{inner}</Link>;
}

/* ── budget allocation bar ── */
function BudgetBar({ label, targetPct, actual, budget, fmt, currency, t }) {
  const ratio = budget > 0 ? actual / budget : 0;
  const barPct = Math.min(100, ratio * 100);
  const isOver = ratio > 1;
  const color = isOver ? 'var(--zx-accent)' : ratio > 0.85 ? 'var(--zx-gold-fg)' : 'var(--zx-positive)';

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-sm text-zx-text">{label}</span>
          <span className="text-[11px] text-zx-text-soft shrink-0">{t('dashboard.budgetTarget', { pct: targetPct })}</span>
        </div>
        <div className="flex items-baseline gap-1 shrink-0">
          <span className="text-sm font-semibold text-zx-text">{fmt(actual, currency)}</span>
          <span className="text-[11px] text-zx-text-soft">/ {fmt(budget, currency)}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-zx-surface-2 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barPct}%`, background: color }} />
      </div>
      <p className="mt-1 text-[11px]" style={{ color: isOver ? 'var(--zx-accent)' : 'var(--zx-text-soft)' }}>
        {isOver
          ? t('dashboard.budgetOverBudget')
          : t('dashboard.budgetUnderBudget', { pct: Math.round((1 - ratio) * 100) })}
      </p>
    </div>
  );
}

/* ── recent transaction row ── */
function TxRow({ tx, fmt, currency, locale }) {
  const d = tx.date?.toDate ? tx.date.toDate() : tx.date ? new Date(tx.date) : null;
  const dateStr = d ? d.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit' }) : '—';
  const isIncome = tx.type === 'income';

  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="text-xs text-zx-text-soft/60 w-9 shrink-0 tabular-nums">{dateStr}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zx-text truncate">{tx.category || '—'}</p>
        {tx.note && <p className="text-xs text-zx-text-soft/70 truncate">{tx.note}</p>}
      </div>
      <p className={`text-sm font-semibold shrink-0 ${isIncome ? 'text-zx-positive' : 'text-zx-accent'}`}>
        {isIncome ? '+' : '−'}{fmt(tx.amount, currency)}
      </p>
    </div>
  );
}

/* ── main component ── */

export default function Dashboard() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const { canAccess, profile } = useFeatureAccess(user);
  const { stats, loading, error } = useDashboardStats(user?.uid);
  const { data: assetsData } = useAssetsData(user?.uid);
  const { data: debtData } = useDebtData(user?.uid);
  const { data: txData } = useTransactionsData(user?.uid);
  const { fmt } = useNumberFormat();
  const currency = stats.currency || 'VND';

  const isPremium = canAccess('pay_yourself_first');

  const emgPct = stats.targetMonths > 0 ? (stats.emergencyMonths / stats.targetMonths) * 100 : 0;
  const netSign = stats.netCashFlow >= 0 ? '+' : '';
  const netWorth = (assetsData?.summary?.totalAssets || 0) - (debtData?.summary?.totalDebt || 0);
  const hasNetWorth = (assetsData?.summary?.totalAssets || 0) > 0 || (debtData?.summary?.totalDebt || 0) > 0;

  const savingsRate = stats.payYourselfTarget > 0
    ? Math.round((stats.payYourselfSaved / stats.payYourselfTarget) * 100)
    : 0;

  const userName = user?.displayName?.split(' ').pop() || t('appShell.defaultName');
  const greeting = getGreeting(t, userName);
  const monthStr = new Date().toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' });

  const focusItems = buildFocusItems(stats, isPremium, t);

  // Recent transactions (5 most recent, already sorted desc from service)
  const recentTxs = txData.transactions.slice(0, 5);

  // Budget snapshot — only meaningful when both income & expense are present
  const allocationRule = profile?.settings?.allocationRule || { living: 55 };
  const livingPct = allocationRule.living || 55;
  const savingsPct = 100 - livingPct;
  const livingBudget = stats.income > 0 ? Math.round(stats.income * (livingPct / 100)) : 0;
  const savingsTarget = stats.income > 0 ? Math.round(stats.income * (savingsPct / 100)) : 0;
  const actualSavings = Math.max(0, stats.income - stats.expense);
  const hasBudgetData = stats.income > 0 && stats.expense > 0;

  // Goal progress extras
  const remainingEmgMonths = Math.max(0, stats.targetMonths - stats.emergencyMonths);
  const remainingPyf = Math.max(0, stats.payYourselfTarget - stats.payYourselfSaved);

  // Income/expense chart data
  const hasFlowData = stats.income > 0 || stats.expense > 0;
  const chartData = [
    { key: 'income',  label: t('dashboard.income'),  value: stats.income,  fill: 'var(--zx-positive)' },
    { key: 'expense', label: t('dashboard.expense'), value: stats.expense, fill: 'var(--zx-accent)' },
    ...(stats.latteFactor > 0 ? [{ key: 'latte', label: t('dashboard.cards.latteFactor'), value: stats.latteFactor, fill: 'var(--zx-gold-fg)' }] : []),
  ];

  const pyfTile = isPremium
    ? {
        icon: PiggyBank, iconColor: 'var(--zx-gold-fg)',
        label: t('dashboard.cards.payYourselfFirst'),
        value: `${formatNumber(stats.payYourselfProgress)}%`,
        valueColor: stats.payYourselfProgress >= 100 ? 'text-zx-positive' : 'text-zx-gold',
        sub: `${fmt(stats.payYourselfSaved, currency)} ${t('dashboard.cards.savedSoFar')}`,
        subPositive: stats.payYourselfProgress >= 100,
        to: '/pay-yourself-first',
      }
    : {
        icon: Lock, iconColor: 'var(--zx-text-soft)',
        label: t('dashboard.cards.payYourselfFirst'),
        value: '—',
        valueColor: 'text-zx-text-soft',
        sub: t('dashboard.premiumFeature'),
        to: '/upgrade',
      };

  const quickActions = [
    { to: '/transactions/new', labelKey: 'dashboard.actions.add_transaction', featureKey: 'add_transaction' },
    { to: '/emergency',        labelKey: 'dashboard.actions.emergency_fund',  featureKey: 'emergency_fund' },
    { to: '/weekly-review',    labelKey: 'dashboard.actions.weekly_review',   featureKey: 'weekly_review' },
    { to: '/reports',          labelKey: 'dashboard.actions.reports',         featureKey: 'reports' },
    ...(!isPremium ? [{ to: '/upgrade', labelKey: 'dashboard.actions.upgrade', featureKey: 'dashboard' }] : []),
  ].filter(a => canAccess(a.featureKey));

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8">
      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-10 lg:items-start">
        <div className="space-y-0">

          {/* ── Greeting ── */}
          <section className="pb-6">
            <div className="flex items-baseline justify-between gap-4 flex-wrap mb-1">
              <h1 className="font-zx-head text-xl font-semibold text-zx-text">{greeting}</h1>
              <span className="text-[11px] text-zx-text-soft/60 capitalize shrink-0">{monthStr}</span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft">
              {t('dashboard.badge')}
            </p>
          </section>

          {/* ── Daily Quote ── */}
          <DailyQuoteCard />

          {/* ── Empty state — no transactions yet ── */}
          {!loading && !error && txData.transactions.length === 0 && (
            <section className="pb-6">
              <div className="rounded-zx border border-zx-line bg-zx-surface p-6 text-center space-y-4 shadow-zx">
                <div className="text-4xl">📊</div>
                <div className="space-y-1">
                  <p className="font-zx-head text-base font-semibold text-zx-text">{t('dashboard.emptyTitle')}</p>
                  <p className="text-sm text-zx-text-soft">{t('dashboard.emptySubtitle')}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Link to="/transactions/new"
                    className="inline-flex items-center justify-center gap-2 rounded-zx-sm bg-zx-accent px-5 py-2.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 transition">
                    <Plus className="h-4 w-4" /> {t('dashboard.emptyAddTx')}
                  </Link>
                  <Link to="/roadmap"
                    className="inline-flex items-center justify-center gap-2 rounded-zx-sm border border-zx-line px-5 py-2.5 text-sm text-zx-text-soft hover:text-zx-text transition">
                    {t('dashboard.emptyRoadmap')}
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* ── Hero: Cash flow + Net worth ── */}
          <section className="pb-6">
            {loading ? (
              <p className="text-zx-text-soft text-sm">{t('dashboard.loading')}</p>
            ) : error ? (
              <p className="text-zx-negative text-sm">{error}</p>
            ) : txData.transactions.length === 0 ? null : (
              <div className="flex items-end justify-between gap-6 flex-wrap">
                <div>
                  <p className="font-zx-display font-bold leading-none"
                    style={{
                      fontSize: 'clamp(2.5rem,6vw,3.75rem)',
                      color: stats.netCashFlow >= 0 ? 'var(--zx-positive)' : 'var(--zx-accent)',
                    }}>
                    {netSign}{fmt(stats.netCashFlow, currency)}
                  </p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <span className="inline-flex items-center rounded-full bg-zx-positive-soft text-zx-positive text-xs font-semibold px-3 py-1.5">
                      {t('dashboard.cards.netCashFlow')}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-zx-surface-2 text-zx-text-soft text-xs font-medium px-3 py-1.5">
                      {t('dashboard.cards.thisMonth')}
                    </span>
                  </div>
                </div>

                {isPremium && (
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft mb-1">
                      {t('dashboard.netWorth')}
                    </p>
                    {hasNetWorth ? (
                      <>
                        <p className={`font-zx-display text-2xl font-bold ${netWorth >= 0 ? 'text-zx-gold' : 'text-zx-accent'}`}>
                          {netWorth >= 0 ? '' : '-'}{fmt(Math.abs(netWorth), currency)}
                        </p>
                        <Link to="/assets" className="text-xs text-zx-text-soft hover:text-zx-accent transition">
                          {t('dashboard.viewAssets')}
                        </Link>
                      </>
                    ) : (
                      <Link to="/assets" className="text-xs text-zx-gold/70 hover:text-zx-gold transition">
                        {t('dashboard.startTrackingAssets')} →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Income / Expense chart ── */}
          {!loading && hasFlowData && (
            <section className="pb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft mb-3">
                {t('dashboard.monthSnapshot')}
              </p>
              <ResponsiveContainer width="100%" height={96}>
                <BarChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barSize={32} barGap={8}>
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive>
                    {chartData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Bar>
                  <Tooltip
                    cursor={{ fill: 'var(--zx-surface-2)', radius: 4 }}
                    content={<ChartTooltip fmt={fmt} currency={currency} />}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-6 mt-1">
                {chartData.map(d => (
                  <div key={d.key} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
                    <span className="text-[11px] text-zx-text-soft">{d.label}</span>
                    <span className="text-[11px] font-semibold text-zx-text">{fmt(d.value, currency)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <HL />

          {/* ── 4 stat tiles ── */}
          <section className="grid grid-cols-2 md:grid-cols-4">
            {[
              {
                icon: Coffee, iconColor: 'var(--zx-accent)',
                label: t('dashboard.cards.latteFactor'),
                value: fmt(stats.latteFactor, currency),
                valueColor: 'text-zx-accent',
                sub: `${Math.abs(stats.latteFactorPercent).toFixed(0)}% ${t('dashboard.cards.vsLastMonth')}`,
                subPositive: stats.latteFactorPercent <= 0,
                to: canAccess('latte_factor') ? '/latte' : null,
              },
              {
                icon: Shield, iconColor: 'var(--zx-positive)',
                label: t('dashboard.cards.emergencyFund'),
                value: `${formatNumber(stats.emergencyMonths, { maximumFractionDigits: 1 })}/${stats.targetMonths}`,
                sub: t('dashboard.targetPct', { pct: Math.round(emgPct) }),
                bar: true, barPct: emgPct,
                to: canAccess('emergency_fund') ? '/emergency' : null,
              },
              pyfTile,
              {
                icon: Wallet, iconColor: 'var(--zx-positive)',
                label: t('dashboard.savingsRate'),
                value: `${formatNumber(savingsRate)}%`,
                valueColor: savingsRate >= 30 ? 'text-zx-positive' : savingsRate >= 15 ? 'text-zx-gold' : 'text-zx-text-soft',
                sub: savingsRate >= 30 ? t('dashboard.exceededTarget') : t('dashboard.target30pct'),
                subPositive: savingsRate >= 30,
              },
            ].map((s, i) => (
              <div key={i} className={[
                'border-zx-line px-4 md:px-5',
                i > 0 ? 'border-l' : 'pl-0',
                i === 3 ? 'pr-0' : '',
                i < 2 ? 'border-b md:border-b-0' : '',
              ].filter(Boolean).join(' ')}>
                <StatTile {...s} />
              </div>
            ))}
          </section>

          {/* ── Goal Progress ── */}
          {!loading && (
            <section className="pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft mb-3">
                {t('dashboard.goalProgress')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <GoalCard
                  icon={Shield}
                  iconColor="var(--zx-positive)"
                  label={t('dashboard.cards.emergencyFund')}
                  value={`${formatNumber(stats.emergencyMonths, { maximumFractionDigits: 1 })}/${stats.targetMonths}`}
                  targetLabel={t('dashboard.goalEmergencyTarget', { months: stats.targetMonths })}
                  pct={emgPct}
                  doneLabel={t('dashboard.goalEmergencyDone')}
                  progressLabel={t('dashboard.goalEmergencyNeeded', { months: formatNumber(remainingEmgMonths, { maximumFractionDigits: 1 }) })}
                  locked={false}
                  to="/emergency"
                />
                <GoalCard
                  icon={PiggyBank}
                  iconColor="var(--zx-gold-fg)"
                  label={t('dashboard.cards.payYourselfFirst')}
                  value={isPremium ? `${formatNumber(stats.payYourselfProgress)}%` : '—'}
                  targetLabel={isPremium
                    ? t('dashboard.goalPyfTarget', { amount: fmt(stats.payYourselfTarget, currency) })
                    : t('dashboard.premiumFeature')}
                  pct={isPremium ? stats.payYourselfProgress : 0}
                  doneLabel={t('dashboard.goalPyfDone')}
                  progressLabel={isPremium
                    ? t('dashboard.goalPyfNeeded', { amount: fmt(remainingPyf, currency) })
                    : t('dashboard.premiumFeature')}
                  locked={!isPremium}
                  to={isPremium ? '/pay-yourself-first' : '/upgrade'}
                />
              </div>
            </section>
          )}

          {/* ── Budget Snapshot ── */}
          {!loading && hasBudgetData && (
            <section className="pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft mb-4">
                {t('dashboard.budgetSnapshot')}
              </p>
              <div className="space-y-4">
                <BudgetBar
                  label={t('dashboard.budgetLiving')}
                  targetPct={livingPct}
                  actual={stats.expense}
                  budget={livingBudget}
                  fmt={fmt}
                  currency={currency}
                  t={t}
                />
                <BudgetBar
                  label={t('dashboard.budgetSavings')}
                  targetPct={savingsPct}
                  actual={actualSavings}
                  budget={savingsTarget}
                  fmt={fmt}
                  currency={currency}
                  t={t}
                />
              </div>
            </section>
          )}

          {/* ── Premium: Debt widget ── */}
          {isPremium && !loading && (
            <section className="pt-6">
              <DebtWidget debtData={debtData} currency={currency} t={t} fmt={fmt} />
            </section>
          )}

        </div>

        {/* ── Right column: focus + quick access ── */}
        <div className="lg:sticky lg:top-6">
          <div className="lg:hidden h-px bg-zx-line mt-6" />

          {/* ── Action items (dynamic) ── */}
          <section className="py-6 lg:pt-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-zx-head font-semibold text-sm text-zx-text uppercase tracking-[0.1em]">
                {t('dashboard.weeklyFocus.title')}
              </h2>
              {canAccess('ai_coach') && (
                <Link to="/ai-coach"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zx-accent rounded-full bg-zx-accent-soft px-3 py-1.5 transition hover:opacity-80">
                  ✦ {t('dashboard.weeklyFocus.askCoach')}
                </Link>
              )}
            </div>
            {focusItems.map((item, i) => (
              <div key={i}>
                {i > 0 && <HL />}
                <div className="flex items-start gap-3 py-3">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.urgent ? 'bg-zx-accent' : 'bg-zx-line'}`} />
                  {item.to ? (
                    <Link to={item.to} className="text-sm text-zx-text hover:text-zx-accent transition flex-1">
                      {item.text}
                    </Link>
                  ) : (
                    <span className="text-sm text-zx-text-soft flex-1">{item.text}</span>
                  )}
                  {item.to && (
                    <ArrowRight className="h-3.5 w-3.5 text-zx-text-soft/40 flex-shrink-0 mt-0.5" />
                  )}
                </div>
              </div>
            ))}
          </section>

          <HL />

          {/* ── Quick access ── */}
          <section className="pt-5 pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft mb-3">
              {t('dashboard.quickAccess')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(a => (
                <Link key={a.to} to={a.to}
                  className="flex items-center justify-between rounded-zx-sm border border-zx-line px-3 py-2.5 text-sm text-zx-text-soft transition hover:border-zx-accent hover:text-zx-text">
                  {t(a.labelKey)}
                  <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ── Recent Transactions (full width) ── */}
      {recentTxs.length > 0 && (
        <div className="mt-2">
          <HL />
          <section className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft">
                {t('dashboard.recentTransactions')}
              </p>
              <Link to="/transactions" className="text-xs font-medium text-zx-accent hover:opacity-80 transition">
                {t('dashboard.viewAllTransactions')} →
              </Link>
            </div>
            <div className="max-w-2xl">
              {recentTxs.map((tx, i) => (
                <div key={tx.id || i}>
                  {i > 0 && <div className="h-px bg-zx-line" />}
                  <TxRow tx={tx} fmt={fmt} currency={currency} locale={locale} />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}


