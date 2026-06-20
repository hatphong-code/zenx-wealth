import { useMemo, useState } from 'react';
import { BarChart3, Printer, ShieldAlert, Sparkles, TrendingUp, Wallet } from 'lucide-react';
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

function EmptyChart({ hint }) {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zx-surface-2 text-zx-text-soft">
        <BarChart3 className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-zx-text-soft">{t('reports.noChartData')}</p>
      <p className="text-xs text-zx-text-soft/70">{hint || t('reports.noChartDataHint')}</p>
    </div>
  );
}

function ChartShell({ title, subtitle, isEmpty, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <p className="text-sm text-zx-text-soft">{subtitle}</p>}
      </CardHeader>
      <CardContent>{isEmpty ? <EmptyChart /> : children}</CardContent>
    </Card>
  );
}

function isEmptyTrend(arr) {
  return !arr?.length || arr.every(d => !d.income && !d.expense && !d.value && !d.netWorth && !d.estimated);
}

const DATE_RANGES = ['3m', '6m', 'ytd', 'all'];

function sliceTrend(arr, range) {
  if (!arr?.length) return arr;
  if (range === 'all') return arr;
  if (range === '3m') return arr.slice(-3);
  if (range === '6m') return arr.slice(-6);
  if (range === 'ytd') return arr.slice(-(new Date().getMonth() + 1));
  return arr;
}

export default function Reports() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { data, loading, refreshing, error } = useReportsData(user?.uid);
  const tradingStatusLabel = (s) => t(`trading.status.${s}`, {}, s);
  const currency = data.currency || 'VND';
  const [dateRange, setDateRange] = useState('6m');

  const trends = useMemo(() => ({
    cashFlow: sliceTrend(data.trends.cashFlow, dateRange),
    netWorthEstimate: sliceTrend(data.trends.netWorthEstimate, dateRange),
    emergencyCoverage: sliceTrend(data.trends.emergencyCoverage, dateRange),
  }), [data.trends, dateRange]);

  const dateRangeOptions = [
    { key: '3m',  label: t('reports.dateRange3m') },
    { key: '6m',  label: t('reports.dateRange6m') },
    { key: 'ytd', label: t('reports.dateRangeYtd') },
    { key: 'all', label: t('reports.dateRangeAll') },
  ];

  return (
      <main className="mx-auto max-w-7xl space-y-6 p-4 pb-24 md:p-6">
        <section className="pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-lg border border-zx-line bg-zx-surface px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zx-text-soft">
              <BarChart3 className="h-3.5 w-3.5" />
              {t('reports.badge')}
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('reports.title')}</h1>
            <p className="max-w-3xl text-sm leading-6 text-zx-text-soft">
              {t('reports.subtitle')}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {loading && <p className="text-zx-text-soft">{t('reports.loading')}</p>}
              {refreshing && <p className="text-zx-accent">{t('reports.refreshing')}</p>}
              {error && <p className="text-zx-negative">{error}</p>}
              <div className="flex items-center gap-2 ml-auto print:hidden">
                <button onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-zx-sm border border-zx-line px-3 py-1.5 text-xs text-zx-text-soft transition hover:text-zx-text">
                  <Printer className="h-3.5 w-3.5" />
                  {t('reports.exportPdf')}
                </button>
              </div>
              <div className="flex rounded-zx-sm border border-zx-line overflow-hidden text-xs">
                {dateRangeOptions.map(opt => (
                  <button key={opt.key} onClick={() => setDateRange(opt.key)}
                    className={`px-3 py-1.5 transition ${dateRange === opt.key ? 'bg-zx-accent text-zx-on-accent font-medium' : 'text-zx-text-soft hover:text-zx-text'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Card>
            <CardHeader><CardTitle>{t('reports.cards.netWorth')}</CardTitle></CardHeader>
            <CardContent><p className="font-zx-head text-2xl font-bold text-zx-text">{formatMoney(data.balanceSheet.netWorth, currency)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t('reports.cards.totalAssets')}</CardTitle></CardHeader>
            <CardContent><p className="font-zx-head text-2xl font-bold text-zx-text">{formatMoney(data.balanceSheet.totalAssets, currency)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t('reports.cards.totalDebt')}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-zx-negative">{formatMoney(data.balanceSheet.totalDebt, currency)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t('reports.cards.avgMonthlyCashFlow')}</CardTitle></CardHeader>
            <CardContent><p className="font-zx-head text-2xl font-bold text-zx-text">{formatMoney(data.monthlyClose.averageNetCashFlow, currency)}</p></CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <ChartShell
            title={t('reports.charts.cashFlowTitle')}
            subtitle={t('reports.charts.cashFlowSubtitle')}
            isEmpty={isEmptyTrend(trends.cashFlow)}
          >
            <div className="h-72 md:h-80 xl:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.cashFlow}>
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
                [t('reports.balanceSheet.trackedAssets'), data.balanceSheet.trackedAssets],
                [t('reports.balanceSheet.emergencyFund'), data.balanceSheet.emergencyFund],
                [t('reports.balanceSheet.liquidAssets'), data.balanceSheet.liquidAssets],
                [t('reports.balanceSheet.longTermAssets'), data.balanceSheet.longTermAssets],
                [t('reports.balanceSheet.riskAssets'), data.balanceSheet.riskAssets],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-zx-sm border border-zx-line bg-zx-bg px-4 py-3">
                  <span className="text-sm text-zx-text-soft">{label}</span>
                  <span className="font-semibold text-zx-text">{formatMoney(value, currency)}</span>
                </div>
              ))}
              <div className="rounded-zx-sm border border-[#3F2A2A] bg-[#1A1313] px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zx-text-soft">{t('reports.balanceSheet.debtToAssetRatio')}</span>
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
            isEmpty={isEmptyTrend(trends.netWorthEstimate)}
          >
            <div className="h-72 md:h-80 xl:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.netWorthEstimate}>
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
            isEmpty={isEmptyTrend(trends.emergencyCoverage)}
          >
            <div className="h-72 md:h-80 xl:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.emergencyCoverage}>
                  <CartesianGrid stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 12 }}
                    formatter={(value) => `${formatNumber(value, { maximumFractionDigits: 1 })} ${t('reports.risk.months')}`}
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
                <p className="text-sm text-zx-text-soft">{t('reports.monthlyClose.positiveMonths')}</p>
                <p className="mt-2 text-lg font-semibold">{data.monthlyClose.positiveMonths} / {data.trends.cashFlow.length}</p>
              </div>
              <div className="rounded-lg border border-zx-line bg-zx-bg p-4">
                <p className="text-sm text-zx-text-soft">{t('reports.monthlyClose.avgSavingsRate')}</p>
                <p className="mt-2 text-lg font-semibold">{formatPercent(data.monthlyClose.averageSavingsRate)}</p>
              </div>
              <div className="rounded-lg border border-zx-line bg-zx-bg p-4">
                <p className="text-sm text-zx-text-soft">{t('reports.monthlyClose.bestMonth')}</p>
                <p className="mt-2 text-lg font-semibold">
                  {data.monthlyClose.bestMonth?.label || '-'} {data.monthlyClose.bestMonth ? `· ${formatMoney(data.monthlyClose.bestMonth.netCashFlow, currency)}` : ''}
                </p>
              </div>
              <div className="rounded-lg border border-zx-line bg-zx-bg p-4">
                <p className="text-sm text-zx-text-soft">{t('reports.monthlyClose.latestNetWorthDelta')}</p>
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
                [t('reports.risk.dailyTrading'), tradingStatusLabel(data.risk.dailyStatus), data.risk.todayPnl],
                [t('reports.risk.monthlyTrading'), tradingStatusLabel(data.risk.monthlyStatus), data.risk.monthPnl],
                [t('reports.risk.emergencyCoverage'), `${formatNumber(data.monthly.emergencyMonths, { maximumFractionDigits: 1 })} ${t('reports.risk.months')}`, null],
                [t('reports.risk.debtPressure'), formatPercent(data.monthly.debtPressure), null],
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
          {[
            {
              title: t('reports.insights.cashFlowTitle'),
              body: data.monthly.netCashFlow >= 0
                ? t('reports.insights.cashFlowPositive')
                : t('reports.insights.cashFlowNegative'),
            },
            {
              title: t('reports.insights.leakageTitle'),
              body: data.monthly.latteFactor > 0
                ? t('reports.insights.leakageWithCategory', { category: data.insights?.[1]?.topCategory || t('reports.insights.smallRecurring') })
                : t('reports.insights.leakageQuiet'),
            },
            {
              title: t('reports.insights.balanceTitle'),
              body: data.balanceSheet.netWorth >= 0
                ? t('reports.insights.balancePositive')
                : t('reports.insights.balanceNegative'),
            },
          ].map((item) => (
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


