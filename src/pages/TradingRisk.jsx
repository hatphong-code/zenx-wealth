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
      setMessage('Trading risk rules saved.');
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
      setError('P&L must be a valid number.');
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
      setMessage('Trading journal entry saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingJournal(false);
    }
  };

  return (
      <main className="mx-auto max-w-7xl space-y-6 p-4 pb-24 md:p-6">
        <section className="rounded-zx border border-zx-line bg-zx-hero p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-lg border border-amber-900 bg-amber-950/40 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zx-gold">
              <AlertTriangle className="h-3.5 w-3.5" />
              High Risk Module
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Trading Risk</h1>
              <p className="max-w-2xl text-sm text-zx-text-soft">
                Keep trading inside a defined risk box. This module is for controlled risk capital, not for core personal finance.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                {loading && <p className="text-zx-text-soft">Loading trading risk monitor...</p>}
                {refreshing && <p className="text-zx-accent">Refreshing trading risk monitor...</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={syncConfigIfFresh}
              className="text-sm text-zx-text-soft transition hover:text-zx-text"
            >
              Reset unsaved config
            </button>
          </div>
        </section>

        {error && <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}
        {message && <div className="rounded-lg border border-green-900 bg-green-950/40 p-3 text-sm text-zx-positive">{message}</div>}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading capital</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatMoney(data.config.capital, currency)}</p>
              <p className="mt-1 text-xs text-zx-text-soft">Only risk capital belongs here.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Today P&amp;L</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${summary.todayPnl >= 0 ? 'text-zx-positive' : 'text-red-300'}`}>
                {formatMoney(summary.todayPnl, currency)}
              </p>
              <p className="mt-1 text-xs text-zx-text-soft">Daily loss limit {formatPercent(data.config.dailyLossLimitPct / 100)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>This week</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${summary.weekPnl >= 0 ? 'text-zx-positive' : 'text-red-300'}`}>
                {formatMoney(summary.weekPnl, currency)}
              </p>
              <p className="mt-1 text-xs text-zx-text-soft">Weekly loss limit {formatPercent(data.config.weeklyLossLimitPct / 100)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Suggested withdrawal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-zx-accent">{formatMoney(summary.suggestedWithdrawal, currency)}</p>
              <p className="mt-1 text-xs text-zx-text-soft">Based on realized gains and withdrawal rule.</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Risk monitor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Daily risk used', value: summary.daily, context: summary.todayPnl },
                { label: 'Weekly risk used', value: summary.weekly, context: summary.weekPnl },
                { label: 'Monthly risk used', value: summary.monthly, context: summary.monthPnl },
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
                      <span>Used</span>
                      <span>{formatNumber(item.value.usedPct, { maximumFractionDigits: 1 })}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-zx-surface">
                      <div
                        className={`h-2 rounded-full ${item.value.status === 'Stop' ? 'bg-red-500' : item.value.status === 'Caution' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, item.value.usedPct)}%` }}
                      />
                    </div>
                    <p className="text-xs text-zx-text-soft">Limit amount: {formatMoney(item.value.limitAmount, currency)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rule set</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm text-zx-text-soft">Trading capital</span>
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
                    <span className="text-sm text-zx-text-soft">Profit withdrawal (%)</span>
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
                    <span className="text-sm text-zx-text-soft">Daily max loss (%)</span>
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
                    <span className="text-sm text-zx-text-soft">Weekly max loss (%)</span>
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
                    <span className="text-sm text-zx-text-soft">Monthly drawdown limit (%)</span>
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
                  {savingConfig ? 'Saving rules...' : 'Save Risk Rules'}
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
                Trading journal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveJournal} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm text-zx-text-soft">Date</span>
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
                  <span className="text-sm text-zx-text-soft">Note</span>
                  <textarea
                    rows={3}
                    value={journalForm.note}
                    onChange={(event) => updateJournal('note', event.target.value)}
                    placeholder="Reason for the trade result, discipline note, or planned cooldown."
                    className="w-full rounded-lg border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
                  />
                </label>
                <Button type="submit" disabled={savingJournal} className="w-full bg-amber-600 text-zx-text hover:bg-amber-700">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  {savingJournal ? 'Saving entry...' : 'Add Trading Entry'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent entries</CardTitle>
            </CardHeader>
            <CardContent>
              {data.records.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zx-line bg-zx-bg p-6 text-center text-sm text-zx-text-soft">
                  No trading entries yet. Add realized P&amp;L entries to start monitoring risk consumption.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.records.slice(0, 8).map((record) => (
                    <div key={record.id} className="flex flex-col gap-2 rounded-lg border border-zx-line bg-zx-bg p-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-zx-text">{formatDate(record.date)}</p>
                        <p className="text-sm text-zx-text-soft">{record.note || 'No note'}</p>
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


