import { BarChart3, ShieldAlert, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../auth/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useReportsData } from '../hooks/useReportsData';
import { useI18n } from '../i18n/useI18n';
import { formatMoney, formatNumber, formatPercent } from '../utils/formatters';

function ChartShell({ title, subtitle, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <p className="text-sm text-zx-text-soft">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { data, loading, refreshing, error } = useReportsData(user?.uid);
  const currency = data.currency || 'VND';

  return (
      <main className="mx-auto max-w-7xl space-y-6 p-4 pb-24 md:p-6">
        <section className="rounded-zx border border-zx-line bg-zx-hero p-5 md:p-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-lg border border-zx-line bg-zx-surface px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zx-text-soft">
              <BarChart3 className="h-3.5 w-3.5" />
              {t('reports.badge')}
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('reports.title')}</h1>
            <p className="max-w-3xl text-sm leading-6 text-zx-text-soft">
              {t('reports.subtitle')}
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              {loading && <p className="text-zx-text-soft">{t('reports.loading')}</p>}
              {refreshing && <p className="text-zx-accent">{t('reports.refreshing')}</p>}
              {error && <p className="text-red-300">{error}</p>}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader><CardTitle>{t('reports.cards.netWorth')}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatMoney(data.balanceSheet.netWorth, currency)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t('reports.cards.totalAssets')}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatMoney(data.balanceSheet.totalAssets, currency)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t('reports.cards.totalDebt')}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-red-300">{formatMoney(data.balanceSheet.totalDebt, currency)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t('reports.cards.avgMonthlyCashFlow')}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatMoney(data.monthlyClose.averageNetCashFlow, currency)}</p></CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <ChartShell
            title={t('reports.charts.cashFlowTitle')}
            subtitle={t('reports.charts.cashFlowSubtitle')}
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.trends.cashFlow}>
                  <CartesianGrid stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 12 }}
                    formatter={(value) => formatMoney(value, currency)}
                  />
                  <Bar dataKey="income" fill="#10B981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="expense" fill="#F97316" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartShell>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wallet className="h-4 w-4 text-zx-accent" /> {t('reports.charts.balanceSheetTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ['Tracked assets', data.balanceSheet.trackedAssets],
                ['Emergency fund', data.balanceSheet.emergencyFund],
                ['Liquid assets', data.balanceSheet.liquidAssets],
                ['Long-term assets', data.balanceSheet.longTermAssets],
                ['Risk assets', data.balanceSheet.riskAssets],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-zx-sm border border-zx-line bg-zx-bg px-4 py-3">
                  <span className="text-sm text-zx-text-soft">{label}</span>
                  <span className="font-semibold text-zx-text">{formatMoney(value, currency)}</span>
                </div>
              ))}
              <div className="rounded-zx-sm border border-[#3F2A2A] bg-[#1A1313] px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zx-text-soft">Debt-to-asset ratio</span>
                  <span className="font-semibold text-zx-text">{formatPercent(data.balanceSheet.debtToAssetRatio)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <ChartShell
            title={t('reports.charts.netWorthEstimateTitle')}
            subtitle={t('reports.charts.netWorthEstimateSubtitle')}
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trends.netWorthEstimate}>
                  <CartesianGrid stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 12 }}
                    formatter={(value) => formatMoney(value, currency)}
                  />
                  <Line type="monotone" dataKey="estimatedNetWorth" stroke="#60A5FA" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartShell>

          <ChartShell
            title={t('reports.charts.emergencyCoverageTitle')}
            subtitle={t('reports.charts.emergencyCoverageSubtitle')}
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trends.emergencyCoverage}>
                  <CartesianGrid stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 12 }}
                    formatter={(value) => `${formatNumber(value, { maximumFractionDigits: 1 })} months`}
                  />
                  <Line type="monotone" dataKey="monthsCovered" stroke="#10B981" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartShell>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-zx-accent" /> {t('reports.charts.monthlyCloseTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-zx-line bg-zx-bg p-4">
                <p className="text-sm text-zx-text-soft">Positive months</p>
                <p className="mt-2 text-lg font-semibold">{data.monthlyClose.positiveMonths} / {data.trends.cashFlow.length}</p>
              </div>
              <div className="rounded-lg border border-zx-line bg-zx-bg p-4">
                <p className="text-sm text-zx-text-soft">Average savings rate</p>
                <p className="mt-2 text-lg font-semibold">{formatPercent(data.monthlyClose.averageSavingsRate)}</p>
              </div>
              <div className="rounded-lg border border-zx-line bg-zx-bg p-4">
                <p className="text-sm text-zx-text-soft">Best month</p>
                <p className="mt-2 text-lg font-semibold">
                  {data.monthlyClose.bestMonth?.label || '-'} {data.monthlyClose.bestMonth ? `· ${formatMoney(data.monthlyClose.bestMonth.netCashFlow, currency)}` : ''}
                </p>
              </div>
              <div className="rounded-lg border border-zx-line bg-zx-bg p-4">
                <p className="text-sm text-zx-text-soft">Latest net worth delta</p>
                <p className="mt-2 text-lg font-semibold">{formatMoney(data.monthlyClose.latestNetWorthDelta, currency)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-zx-gold" /> {t('reports.charts.riskWatchTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                ['Daily trading risk', data.risk.dailyStatus, data.risk.todayPnl],
                ['Monthly trading risk', data.risk.monthlyStatus, data.risk.monthPnl],
                ['Emergency coverage', `${formatNumber(data.monthly.emergencyMonths, { maximumFractionDigits: 1 })} months`, null],
                ['Debt pressure', formatPercent(data.monthly.debtPressure), null],
              ].map(([label, status, value]) => (
                <div key={label} className="rounded-lg border border-zx-line bg-zx-bg p-4">
                  <p className="text-sm text-zx-text-soft">{label}</p>
                  <p className="mt-2 text-lg font-semibold text-zx-text">{status}</p>
                  {typeof value === 'number' && <p className="mt-1 text-xs text-zx-text-soft">{formatMoney(value, currency)}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          {data.insights.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-zx-accent" /> {item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-zx-text-soft">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
  );
}

