import { useMemo, useState } from 'react';
import { BarChart3, Printer, ShieldAlert, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import { DateRangePicker } from '../../core/../web/components/ui/DateRangePicker';
import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../core/auth/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../core/../web/components/ui/card';
import { useReportsData } from '../../core/hooks/useReportsData';
import { useI18n } from '../../core/i18n/useI18n';
import { formatMoney, formatNumber, formatPercent } from '../../core/utils/formatters';

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
  return !arr?.length || arr.every(d => !d.income && !d.expense && !d.estimatedNetWorth && !d.monthsCovered && !d.balance);
}

function sliceTrend(arr, preset, customRange) {
  if (!arr?.length) return arr;
  // Custom date range takes priority
  if (customRange?.from && customRange?.to) {
    const today = new Date();
    today.setDate(1);
    return arr.filter((_, i) => {
      const monthsAgo = arr.length - 1 - i;
      const d = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
      const from = new Date(customRange.from.getFullYear(), customRange.from.getMonth(), 1);
      const to = new Date(customRange.to.getFullYear(), customRange.to.getMonth(), 1);
      return d >= from && d <= to;
    });
  }
  if (preset === 'all') return arr;
  if (preset === '3m') return arr.slice(-3);
  if (preset === '6m') return arr.slice(-6);
  if (preset === 'ytd') return arr.slice(-(new Date().getMonth() + 1));
  return arr;
}

export default function Reports() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { data, loading, refreshing, error } = useReportsData(user?.uid);
  const tradingStatusLabel = (s) => t(`trading.status.${s}`, {}, s);
  const currency = data.currency || 'VND';
  const [datePreset, setDatePreset] = useState('6m');
  const [customRange, setCustomRange] = useState({ from: undefined, to: undefined });

  const handleCustomRange = (range) => {
    setCustomRange(range);
    if (range?.from && range?.to) setDatePreset('');
    else setDatePreset('6m');
  };

  const handlePreset = (key) => {
    setDatePreset(key);
    setCustomRange({ from: undefined, to: undefined });
  };

  const trends = useMemo(() => ({
    cashFlow: sliceTrend(data.trends.cashFlow, datePreset, customRange),
    netWorthEstimate: sliceTrend(data.trends.netWorthEstimate, datePreset, customRange),
    emergencyCoverage: sliceTrend(data.trends.emergencyCoverage, datePreset, customRange),
  }), [data.trends, datePreset, customRange]);

  const datePresetOptions = [
    { key: '3m',  label: t('reports.dateRange3m') },
    { key: '6m',  label: t('reports.dateRange6m') },
    { key: 'ytd', label: t('reports.dateRangeYtd') },
    { key: 'all', label: t('reports.dateRangeAll') },
  ];

  const now = new Date();
  const reportPresets = [
    { label: t('dateRange.thisMonth'), range: { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0) } },
    { label: t('dateRange.lastMonth'), range: { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) } },
    { label: t('dateRange.last3Months'), range: { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0) } },
    { label: t('dateRange.last6Months'), range: { from: new Date(now.getFullYear(), now.getMonth() - 5, 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0) } },
    { label: t('dateRange.thisYear'), range: { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31) } },
  ];

  return (
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-6">
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
              {!loading && data.txCount > 0 && (
                <p className="text-xs text-zx-text-soft">
                  {t('reports.txCountHint', { count: data.txCount })}
                </p>
              )}
              <div className="flex items-center gap-2 ml-auto print:hidden flex-wrap">
                {/* Quick presets */}
                <div className="flex rounded-zx-sm border border-zx-line overflow-hidden text-xs">
                  {datePresetOptions.map(opt => (
                    <button key={opt.key} onClick={() => handlePreset(opt.key)}
                      className={`px-3 py-1.5 transition ${datePreset === opt.key && !customRange?.from ? 'bg-zx-accent text-zx-on-accent font-medium' : 'text-zx-text-soft hover:text-zx-text'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {/* Custom date range */}
                <DateRangePicker
                  value={customRange?.from ? customRange : undefined}
                  onChange={handleCustomRange}
                  placeholder={t('dateRange.placeholder')}
                  presets={reportPresets}
                />
                <button onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-zx-sm border border-zx-line px-3 py-1.5 text-xs text-zx-text-soft transition hover:text-zx-text">
                  <Printer className="h-3.5 w-3.5" />
                  {t('reports.exportPdf')}
                </button>
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
                  {trends.cashFlow.length > 6 && (
                    <Brush dataKey="label" height={22} stroke="var(--zx-line)" fill="var(--zx-surface-2)"
                      travellerWidth={8} tickFormatter={() => ''} />
                  )}
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


