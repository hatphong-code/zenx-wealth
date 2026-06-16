import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, Save, TrendingUp } from 'lucide-react';
import { Timestamp } from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { invalidateReportsCache } from '../services/reportsService';
import { formatDate, formatMoney, formatNumber, formatPercent } from '../utils/formatters';
import {
  createTradingJournalEntry,
  defaultTradingRiskConfig,
  recomputeTradingRiskState,
  saveTradingRiskConfig,
  setTradingRiskCache,
} from '../services/tradingRiskService';
import { useTradingRiskData } from '../hooks/useTradingRiskData';
import { invalidateAICoachCache } from '../services/aiCoachService';
import { useI18n } from '../i18n/useI18n';

const today = new Date().toISOString().slice(0, 10);

function statusTone(status) {
  if (status === 'Stop') return 'text-red-300 bg-red-950 border-red-900';
  if (status === 'Caution') return 'text-zx-gold bg-amber-950 border-amber-900';
  if (status === 'Healthy') return 'text-zx-positive bg-emerald-950 border-emerald-900';
  return 'text-zx-text-soft bg-zx-bg border-zx-line';
}

export default function TradingRisk() {
  const { user } = useAuth();
  const { data, setData, loading, refreshing, error, setError } = useTradingRiskData(user?.uid);
  const [configForm, setConfigForm] = useState(data.config);
  const [journalForm, setJournalForm] = useState({
    date: today,
    pnl: '',
    note: '',
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingJournal, setSavingJournal] = useState(false);
  const [message, setMessage] = useState('');

  const { currency, summary } = data;
  const { t } = useI18n();

  useEffect(() => {
    setConfigForm(data.config || defaultTradingRiskConfig);
  }, [data.config]);

  const updateConfig = (field, value) => {
    setConfigForm((current) => ({ ...current, [field]: value }));
  };

  const updateJournal = (field, value) => {
    setJournalForm((current) => ({ ...current, [field]: value }));
  };

  const syncConfigIfFresh = () => {
    setConfigForm(data.config || defaultTradingRiskConfig);
  };

  const handleSaveConfig = async (event) => {
    event.preventDefault();
    if (!user) return;

    const normalized = {
      capital: Number(configForm.capital || 0),
      dailyLossLimitPct: Number(configForm.dailyLossLimitPct || 0),
      weeklyLossLimitPct: Number(configForm.weeklyLossLimitPct || 0),
      monthlyLossLimitPct: Number(configForm.monthlyLossLimitPct || 0),
      profitWithdrawalPct: Number(configForm.profitWithdrawalPct || 0),
    };

    setSavingConfig(true);
    setError('');
    setMessage('');

    try {
      const nextConfig = await saveTradingRiskConfig(user.uid, normalized);
      const nextData = recomputeTradingRiskState(data, nextConfig, data.records);
      setData(nextData);
      setTradingRiskCache(user.uid, nextData);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      setMessage(t('trading.saveSuccess'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveJournal = async (event) => {
    event.preventDefault();
    if (!user) return;

    const pnl = Number(journalForm.pnl);
    if (!Number.isFinite(pnl)) {
      setError(t('trading.errors.invalidPnl'));
      return;
    }

    setSavingJournal(true);
    setError('');
    setMessage('');

    try {
      const created = await createTradingJournalEntry(user.uid, {
        date: Timestamp.fromDate(new Date(`${journalForm.date}T00:00:00`)),
        pnl,
        note: journalForm.note.trim(),
      });
      const nextRecords = [created, ...data.records].sort((a, b) => {
        const left = a.date?.toDate ? a.date.toDate().getTime() : 0;
        const right = b.date?.toDate ? b.date.toDate().getTime() : 0;
        return right - left;
      });
      const nextData = recomputeTradingRiskState(data, data.config, nextRecords);
      setData(nextData);
      setTradingRiskCache(user.uid, nextData);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      setJournalForm({ date: today, pnl: '', note: '' });
      setMessage(t('trading.entrySaved'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingJournal(false);
    }
  };

  return (
      <main className="mx-auto max-w-7xl space-y-6 p-4 pb-24 md:p-6">
        <section className="pb-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-lg border border-amber-900 bg-amber-950/40 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zx-gold">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t('trading.badge')}
              </div>
              <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('trading.title')}</h1>
              <p className="max-w-2xl text-sm text-zx-text-soft">
                {t('trading.subtitle')}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                {loading && <p className="text-zx-text-soft">{t('trading.loading')}</p>}
                {refreshing && <p className="text-zx-accent">{t('trading.refreshing')}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={syncConfigIfFresh}
              className="text-sm text-zx-text-soft transition hover:text-zx-text"
            >
              {t('trading.resetConfig')}
            </button>
          </div>
        </section>

        {error && <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}
        {message && <div className="rounded-lg border border-green-900 bg-green-950/40 p-3 text-sm text-zx-positive">{message}</div>}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('trading.cards.capital')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-zx-head text-2xl font-bold text-zx-text">{formatMoney(data.config.capital, currency)}</p>
              <p className="mt-1 text-xs text-zx-text-soft">{t('trading.cards.capitalHint')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('trading.cards.todayPnl')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${summary.todayPnl >= 0 ? 'text-zx-positive' : 'text-red-300'}`}>
                {formatMoney(summary.todayPnl, currency)}
              </p>
              <p className="mt-1 text-xs text-zx-text-soft">{t('trading.cards.dailyLimitHint', { pct: formatPercent(data.config.dailyLossLimitPct / 100) })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('trading.cards.thisWeek')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${summary.weekPnl >= 0 ? 'text-zx-positive' : 'text-red-300'}`}>
                {formatMoney(summary.weekPnl, currency)}
              </p>
              <p className="mt-1 text-xs text-zx-text-soft">{t('trading.cards.weeklyLimitHint', { pct: formatPercent(data.config.weeklyLossLimitPct / 100) })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('trading.cards.withdrawal')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-zx-accent">{formatMoney(summary.suggestedWithdrawal, currency)}</p>
              <p className="mt-1 text-xs text-zx-text-soft">{t('trading.cards.withdrawalHint')}</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>{t('trading.monitor')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: t('trading.monitorRows.daily'), value: summary.daily, context: summary.todayPnl },
                { label: t('trading.monitorRows.weekly'), value: summary.weekly, context: summary.weekPnl },
                { label: t('trading.monitorRows.monthly'), value: summary.monthly, context: summary.monthPnl },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-zx-line bg-zx-bg p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-zx-text-soft">{item.label}</p>
                      <p className={`mt-2 text-lg font-semibold ${item.context >= 0 ? 'text-zx-positive' : 'text-zx-text'}`}>
                        {formatMoney(item.context, currency)}
                      </p>
                    </div>
                    <div className={`rounded-lg border px-3 py-2 text-sm font-medium ${statusTone(item.value.status)}`}>
                      {item.value.status}
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-zx-text-soft">
                      <span>{t('trading.used')}</span>
                      <span>{formatNumber(item.value.usedPct, { maximumFractionDigits: 1 })}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-zx-surface">
                      <div
                        className={`h-2 rounded-full ${item.value.status === 'Stop' ? 'bg-red-500' : item.value.status === 'Caution' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, item.value.usedPct)}%` }}
                      />
                    </div>
                    <p className="text-xs text-zx-text-soft">{t('trading.limitAmount')} {formatMoney(item.value.limitAmount, currency)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('trading.ruleSet')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm text-zx-text-soft">{t('trading.configFields.capital')}</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={configForm.capital}
                      onChange={(event) => updateConfig('capital', event.target.value)}
                      className="w-full rounded-lg border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-zx-text-soft">{t('trading.configFields.withdrawal')}</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={configForm.profitWithdrawalPct}
                      onChange={(event) => updateConfig('profitWithdrawalPct', event.target.value)}
                      className="w-full rounded-lg border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-zx-text-soft">{t('trading.configFields.dailyMax')}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={configForm.dailyLossLimitPct}
                      onChange={(event) => updateConfig('dailyLossLimitPct', event.target.value)}
                      className="w-full rounded-lg border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-zx-text-soft">{t('trading.configFields.weeklyMax')}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={configForm.weeklyLossLimitPct}
                      onChange={(event) => updateConfig('weeklyLossLimitPct', event.target.value)}
                      className="w-full rounded-lg border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
                    />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm text-zx-text-soft">{t('trading.configFields.monthlyMax')}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={configForm.monthlyLossLimitPct}
                      onChange={(event) => updateConfig('monthlyLossLimitPct', event.target.value)}
                      className="w-full rounded-lg border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
                    />
                  </label>
                </div>

                <Button type="submit" disabled={savingConfig} className="w-full bg-zx-accent text-zx-on-accent hover:opacity-90">
                  <Save className="mr-2 h-4 w-4" />
                  {savingConfig ? t('trading.savingRules') : t('trading.saveRules')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-zx-accent" />
                {t('trading.journalTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveJournal} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm text-zx-text-soft">{t('common.date')}</span>
                    <input
                      type="date"
                      value={journalForm.date}
                      onChange={(event) => updateJournal('date', event.target.value)}
                      className="w-full rounded-lg border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-zx-text-soft">P&amp;L</span>
                    <input
                      type="number"
                      step="any"
                      value={journalForm.pnl}
                      onChange={(event) => updateJournal('pnl', event.target.value)}
                      placeholder="-250000 or 480000"
                      className="w-full rounded-lg border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
                    />
                  </label>
                </div>
                <label className="space-y-2">
                  <span className="text-sm text-zx-text-soft">{t('common.note')}</span>
                  <textarea
                    rows={3}
                    value={journalForm.note}
                    onChange={(event) => updateJournal('note', event.target.value)}
                    placeholder={t('trading.journalFields.notePlaceholder')}
                    className="w-full rounded-lg border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
                  />
                </label>
                <Button type="submit" disabled={savingJournal} className="w-full bg-amber-600 text-zx-text hover:bg-amber-700">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  {savingJournal ? t('trading.savingEntry') : t('trading.addEntry')}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('trading.recentEntries')}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.records.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zx-line bg-zx-bg p-6 text-center text-sm text-zx-text-soft">
                  {t('trading.noEntries')}
                </div>
              ) : (
                <div className="space-y-3">
                  {data.records.slice(0, 8).map((record) => (
                    <div key={record.id} className="flex flex-col gap-2 rounded-lg border border-zx-line bg-zx-bg p-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-zx-text">{formatDate(record.date)}</p>
                        <p className="text-sm text-zx-text-soft">{record.note || t('common.noNote')}</p>
                      </div>
                      <p className={`text-lg font-semibold ${Number(record.pnl || 0) >= 0 ? 'text-zx-positive' : 'text-red-300'}`}>
                        {formatMoney(record.pnl, currency)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
  );
}


