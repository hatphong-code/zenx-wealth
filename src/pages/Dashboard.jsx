import { Link } from 'react-router-dom';
import { ArrowRight, Coffee, PiggyBank, Shield, TrendingUp } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useI18n } from '../i18n/useI18n';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { fmtShort, formatNumber } from '../utils/formatters';

function StatTile({ icon: Icon, iconColor, label, value, sub, subPositive, bar, barPct, to }) {
  const inner = (
    <div className="py-5 group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-zx-sm bg-zx-icon-bg flex-shrink-0 zx-transition" style={{ color: iconColor }}>
          <Icon className="h-4 w-4" />
        </div>
        {to && <ArrowRight className="h-3.5 w-3.5 text-zx-text-soft opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft mb-2">{label}</p>
      <p className="font-zx-display text-2xl md:text-3xl font-bold text-zx-text leading-none">{value}</p>
      {bar && (
        <div className="mt-2.5 h-1.5 rounded-full bg-zx-surface-2 overflow-hidden">
          <div className="progress-fill h-full rounded-full" style={{ width: `${Math.min(100, barPct || 0)}%` }} />
        </div>
      )}
      {sub && <p className={`mt-1.5 text-xs font-medium ${subPositive ? 'text-zx-positive' : 'text-zx-text-soft'}`}>{sub}</p>}
    </div>
  );
  if (to) return <Link to={to} className="block cursor-pointer">{inner}</Link>;
  return inner;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { canAccess } = useFeatureAccess(user);
  const { stats, loading, error } = useDashboardStats(user?.uid);
  const currency = stats.currency || 'VND';
  const emgPct = stats.targetMonths > 0 ? (stats.emergencyMonths / stats.targetMonths) * 100 : 0;
  const netSign = stats.netCashFlow >= 0 ? '+' : '';

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24">

      {/* ── Hero ── */}
      <section className="pb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft mb-3">
          {t('dashboard.badge')}
        </p>
        {loading ? (
          <p className="text-zx-text-soft text-sm">{t('dashboard.loading')}</p>
        ) : error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : (
          <div>
            <p className="font-zx-display font-bold text-zx-positive leading-none"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 3.75rem)' }}>
              {netSign}{fmtShort(stats.netCashFlow)}
              <span className="text-xl ml-2 font-normal text-zx-text-soft">₫</span>
            </p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <span className="inline-flex items-center rounded-full bg-zx-positive-soft text-zx-positive text-xs font-semibold px-3 py-1.5">
                ↑ {t('dashboard.cards.thisMonth')}
              </span>
              <span className="inline-flex items-center rounded-full bg-zx-surface-2 text-zx-text-soft text-xs font-medium px-3 py-1.5">
                {t('dashboard.cards.netCashFlow')}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ── Hairline ── */}
      <div className="h-px bg-zx-line" />

      {/* ── 4 stat tiles in a row ── */}
      <section className="grid grid-cols-2 md:grid-cols-4">
        {[
          {
            icon: Coffee, iconColor: 'var(--zx-accent)',
            label: t('dashboard.cards.latteFactor'),
            value: fmtShort(stats.latteFactor),
            sub: `${Math.abs(stats.latteFactorPercent).toFixed(0)}% ${t('dashboard.cards.vsLastMonth')}`,
            subPositive: stats.latteFactorPercent <= 0,
            to: canAccess('latte_factor') ? '/latte' : null,
          },
          {
            icon: Shield, iconColor: 'var(--zx-positive)',
            label: t('dashboard.cards.emergencyFund'),
            value: `${formatNumber(stats.emergencyMonths, { maximumFractionDigits: 1 })}/${stats.targetMonths}`,
            sub: `${Math.round(emgPct)}% mục tiêu`,
            bar: true, barPct: emgPct,
            to: canAccess('emergency_fund') ? '/emergency' : null,
          },
          {
            icon: PiggyBank, iconColor: 'var(--zx-gold-fg)',
            label: t('dashboard.cards.payYourselfFirst'),
            value: `${formatNumber(stats.payYourselfProgress)}%`,
            sub: `${fmtShort(stats.payYourselfSaved)} đã trích`,
            to: canAccess('pay_yourself_first') ? '/pay-yourself-first' : null,
          },
          {
            icon: TrendingUp, iconColor: 'var(--zx-positive)',
            label: t('dashboard.cards.netCashFlow'),
            value: fmtShort(stats.netCashFlow),
            sub: t('dashboard.cards.thisMonth'),
          },
        ].map((s, i) => (
          <div key={i}
            className={[
              'border-zx-line',
              i > 0 ? 'border-l' : '',
              'px-4 md:px-5',
              i === 0 ? 'pl-0' : '',
              i === 3 ? 'pr-0' : '',
              // mobile: bottom border on first row
              i < 2 ? 'border-b md:border-b-0' : '',
            ].filter(Boolean).join(' ')}>
            <StatTile {...s} />
          </div>
        ))}
      </section>

      {/* ── Hairline ── */}
      <div className="h-px bg-zx-line" />

      {/* ── Weekly focus ── */}
      <section className="py-6">
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
        {[
          t('dashboard.weeklyFocus.item1', { amount: fmtShort(500000) }),
          t('dashboard.weeklyFocus.item2', { amount: fmtShort(2000000) }),
        ].map((text, i) => (
          <div key={i}>
            {i > 0 && <div className="h-px bg-zx-line" />}
            <div className="flex items-center gap-3 py-3">
              <span className="w-5 h-5 rounded-full border border-zx-line flex-shrink-0" />
              <span className="text-sm text-zx-text">{text}</span>
            </div>
          </div>
        ))}
      </section>

      {/* ── Hairline ── */}
      <div className="h-px bg-zx-line" />

      {/* ── Quick access ── */}
      <section className="pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft mb-3">Truy cập nhanh</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { to: '/transactions/new', labelKey: 'dashboard.actions.add_transaction', featureKey: 'add_transaction' },
            { to: '/emergency',        labelKey: 'dashboard.actions.emergency_fund',  featureKey: 'emergency_fund' },
            { to: '/weekly-review',    labelKey: 'dashboard.actions.weekly_review',   featureKey: 'weekly_review' },
            { to: '/reports',          labelKey: 'dashboard.actions.reports',          featureKey: 'reports' },
          ].filter(a => canAccess(a.featureKey)).map(a => (
            <Link key={a.to} to={a.to}
              className="flex items-center justify-between rounded-zx-sm border border-zx-line px-3 py-2.5 text-sm text-zx-text-soft transition hover:border-zx-accent hover:text-zx-text">
              {t(a.labelKey)}
              <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
