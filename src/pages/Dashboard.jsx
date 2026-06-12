import { Link } from 'react-router-dom';
import { ArrowRight, Coffee, PiggyBank, Shield, TrendingUp } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import AppNav from '../components/AppNav';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useI18n } from '../i18n/useI18n';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { formatMoney, formatNumber, formatPercent } from '../utils/formatters';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { canAccess } = useFeatureAccess(user);
  const { stats, loading, refreshing, error } = useDashboardStats(user?.uid);
  const currency = stats.currency || 'VND';
  const quickActions = [
    { to: '/transactions/new', labelKey: 'dashboard.actions.add_transaction', featureKey: 'add_transaction' },
    { to: '/emergency', labelKey: 'dashboard.actions.emergency_fund', featureKey: 'emergency_fund' },
    { to: '/weekly-review', labelKey: 'dashboard.actions.weekly_review', featureKey: 'weekly_review' },
    { to: '/reports', labelKey: 'dashboard.actions.reports', featureKey: 'reports' },
  ].filter((item) => canAccess(item.featureKey));

  return (
    <div className="min-h-screen bg-zx-bg text-zx-text">
      <AppNav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-6">
        {/* Hero */}
        <section className="overflow-hidden rounded-zx border border-zx-line bg-zx-hero p-5 shadow-zx md:p-6 zx-transition">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="font-zx-body text-xs font-semibold uppercase tracking-[0.16em] text-zx-text-soft">
                {t('dashboard.badge')}
              </p>
              <h1 className="font-zx-head text-2xl font-bold tracking-tight md:text-3xl">
                {t('dashboard.greeting', { name: user?.displayName?.split(' ')[0] || 'bạn' })}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-zx-text-soft">
                {t('dashboard.subtitle')}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                {loading && <p className="text-zx-text-soft">{t('dashboard.loading')}</p>}
                {refreshing && <p className="text-zx-accent">{t('dashboard.refreshing')}</p>}
                {error && <p className="text-red-400">{error}</p>}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
              {quickActions.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center justify-between rounded-zx-sm border border-zx-line bg-zx-surface-2/60 px-4 py-3 text-sm text-zx-text-soft transition hover:border-zx-accent hover:text-zx-text"
                >
                  <span>{t(item.labelKey)}</span>
                  <ArrowRight className="h-4 w-4 text-zx-text-soft" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.cards.netCashFlow')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-zx-positive" />
            </CardHeader>
            <CardContent>
              <div className="font-zx-display text-2xl font-bold text-zx-positive">
                {formatMoney(stats.netCashFlow, currency)}
              </div>
              <p className="text-xs text-zx-text-soft">{t('dashboard.cards.thisMonth')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.cards.latteFactor')}</CardTitle>
              <Coffee className="h-4 w-4 text-zx-accent" />
            </CardHeader>
            <CardContent>
              <div className="font-zx-display text-2xl font-bold text-zx-accent">
                {formatMoney(stats.latteFactor, currency)}
              </div>
              <p className="text-xs text-zx-positive">
                {formatPercent(stats.latteFactorPercent / 100)} {t('dashboard.cards.vsLastMonth')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.cards.emergencyFund')}</CardTitle>
              <Shield className="h-4 w-4 text-zx-positive" />
            </CardHeader>
            <CardContent>
              <div className="font-zx-display text-2xl font-bold">
                {formatNumber(stats.emergencyMonths, { maximumFractionDigits: 1 })} / {stats.targetMonths}{' '}
                {t('dashboard.cards.months')}
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-zx-surface-2">
                <div
                  className="progress-fill h-2 rounded-full"
                  style={{ width: `${Math.min(100, (stats.emergencyMonths / stats.targetMonths) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.cards.payYourselfFirst')}</CardTitle>
              <PiggyBank className="h-4 w-4 text-zx-gold" />
            </CardHeader>
            <CardContent>
              <div className="font-zx-display text-2xl font-bold text-zx-gold">
                {formatNumber(stats.payYourselfProgress)}%
              </div>
              <p className="text-xs text-zx-text-soft">
                {t('dashboard.cards.reached', {
                  saved: formatMoney(stats.payYourselfSaved, currency),
                  target: formatMoney(stats.payYourselfTarget, currency),
                })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly focus */}
        <div className="rounded-zx border border-zx-line bg-zx-surface p-4 shadow-zx zx-transition">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="mb-2 font-semibold text-zx-text">{t('dashboard.weeklyFocus.title')}</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-zx-text-soft">
                <li>{t('dashboard.weeklyFocus.item1', { amount: formatMoney(500000, currency) })}</li>
                <li>{t('dashboard.weeklyFocus.item2', { amount: formatMoney(2000000, currency) })}</li>
              </ul>
            </div>
            {canAccess('ai_coach') ? (
              <Link
                to="/ai-coach"
                className="shrink-0 rounded-zx-sm border border-zx-line px-3 py-2 text-sm text-zx-text-soft transition hover:bg-zx-surface-2"
              >
                {t('dashboard.weeklyFocus.askCoach')}
              </Link>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
