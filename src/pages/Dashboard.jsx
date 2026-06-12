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
    <div className="min-h-screen bg-[#0B1020] text-white">
      <AppNav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-6">
        <section className="overflow-hidden rounded-2xl border border-[#1F2937] bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.24),_transparent_42%),linear-gradient(180deg,#111827_0%,#0B1020_100%)] p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-blue-200">{t('dashboard.badge')}</p>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                {t('dashboard.greeting', { name: user?.displayName?.split(' ')[0] || 'b\u1ea1n' })}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-gray-300">
                {t('dashboard.subtitle')}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                {loading && <p className="text-gray-400">{t('dashboard.loading')}</p>}
                {refreshing && <p className="text-blue-300">{t('dashboard.refreshing')}</p>}
                {error && <p className="text-red-300">{error}</p>}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
              {quickActions.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center justify-between rounded-xl border border-[#1F2937] bg-[#0B1020]/80 px-4 py-3 text-sm text-gray-200 transition hover:border-[#374151] hover:bg-[#111827]"
                >
                  <span>{t(item.labelKey)}</span>
                  <ArrowRight className="h-4 w-4 text-gray-500" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-[#1F2937] bg-[#111827]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.cards.netCashFlow')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(stats.netCashFlow, currency)}</div>
              <p className="text-xs text-gray-400">{t('dashboard.cards.thisMonth')}</p>
            </CardContent>
          </Card>

          <Card className="border-[#1F2937] bg-[#111827]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.cards.latteFactor')}</CardTitle>
              <Coffee className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(stats.latteFactor, currency)}</div>
              <p className="text-xs text-red-400">{formatPercent(stats.latteFactorPercent / 100)} {t('dashboard.cards.vsLastMonth')}</p>
            </CardContent>
          </Card>

          <Card className="border-[#1F2937] bg-[#111827]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.cards.emergencyFund')}</CardTitle>
              <Shield className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(stats.emergencyMonths, { maximumFractionDigits: 1 })} / {stats.targetMonths} {t('dashboard.cards.months')}
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-700">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${Math.min(100, (stats.emergencyMonths / stats.targetMonths) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#1F2937] bg-[#111827]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.cards.payYourselfFirst')}</CardTitle>
              <PiggyBank className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.payYourselfProgress)}%</div>
              <p className="text-xs text-gray-400">
                {t('dashboard.cards.reached', {
                  saved: formatMoney(stats.payYourselfSaved, currency),
                  target: formatMoney(stats.payYourselfTarget, currency),
                })}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-2xl border border-[#1F2937] bg-[#111827] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="mb-2 font-semibold">{t('dashboard.weeklyFocus.title')}</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-300">
                <li>{t('dashboard.weeklyFocus.item1', { amount: formatMoney(500000, currency) })}</li>
                <li>{t('dashboard.weeklyFocus.item2', { amount: formatMoney(2000000, currency) })}</li>
              </ul>
            </div>
            {canAccess('ai_coach') ? (
              <Link
                to="/ai-coach"
                className="shrink-0 rounded-lg border border-[#374151] px-3 py-2 text-sm text-gray-200 transition hover:bg-[#0B1020]"
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



