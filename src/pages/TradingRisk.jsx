import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, Save, TrendingUp } from 'lucide-react';
import { Timestamp } from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import AppNav from '../components/AppNav';
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
  if (status === 'Caution') return 'text-amber-300 bg-amber-950 border-amber-900';
  if (status === 'Healthy') return 'text-emerald-300 bg-emerald-950 border-emerald-900';
  return 'text-gray-300 bg-[#0B1020] border-[#1F2937]';
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
    <div className="min-h-screen bg-[#0B1020] text-white">
      <AppNav />
      <main className="mx-auto max-w-7xl space-y-6 p-4 pb-24 md:p-6">
        <section className="rounded-2xl border border-[#1F2937] bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_40%),linear-gradient(180deg,#111827_0%,#0B1020_100%)] p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-lg border border-amber-900 bg-amber-950/40 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              High Risk Module
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Trading Risk</h1>
              <p className="max-w-2xl text-sm text-gray-300">
                Keep trading inside a defined risk box. This module is for controlled risk capital, not for core personal finance.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                {loading && <p className="text-gray-400">Loading trading risk monitor...</p>}
                {refreshing && <p className="text-blue-300">Refreshing trading risk monitor...</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={syncConfigIfFresh}
              className="text-sm text-gray-400 transition hover:text-white"
            >
              Reset unsaved config
            </button>
          </div>
        </section>

        {error && <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}
        {message && <div className="rounded-lg border border-green-900 bg-green-950/40 p-3 text-sm text-green-300">{message}</div>}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading capital</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatMoney(data.config.capital, currency)}</p>
              <p className="mt-1 text-xs text-gray-400">Only risk capital belongs here.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Today P&amp;L</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${summary.todayPnl >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {formatMoney(summary.todayPnl, currency)}
              </p>
              <p className="mt-1 text-xs text-gray-400">Daily loss limit {formatPercent(data.config.dailyLossLimitPct / 100)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>This week</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${summary.weekPnl >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {formatMoney(summary.weekPnl, currency)}
              </p>
              <p className="mt-1 text-xs text-gray-400">Weekly loss limit {formatPercent(data.config.weeklyLossLimitPct / 100)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Suggested withdrawal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-300">{formatMoney(summary.suggestedWithdrawal, currency)}</p>
              <p className="mt-1 text-xs text-gray-400">Based on realized gains and withdrawal rule.</p>
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
                <div key={item.label} className="rounded-lg border border-[#1F2937] bg-[#0B1020] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-400">{item.label}</p>
                      <p className={`mt-2 text-lg font-semibold ${item.context >= 0 ? 'text-emerald-300' : 'text-white'}`}>
                        {formatMoney(item.context, currency)}
                      </p>
                    </div>
                    <div className={`rounded-lg border px-3 py-2 text-sm font-medium ${statusTone(item.value.status)}`}>
                      {item.value.status}
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Used</span>
                      <span>{formatNumber(item.value.usedPct, { maximumFractionDigits: 1 })}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#111827]">
                      <div
                        className={`h-2 rounded-full ${item.value.status === 'Stop' ? 'bg-red-500' : item.value.status === 'Caution' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, item.value.usedPct)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">Limit amount: {formatMoney(item.value.limitAmount, currency)}</p>
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
                    <span className="text-sm text-gray-300">Trading capital</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={configForm.capital}
                      onChange={(event) => updateConfig('capital', event.target.value)}
                      className="w-full rounded-lg border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-gray-300">Profit withdrawal (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={configForm.profitWithdrawalPct}
                      onChange={(event) => updateConfig('profitWithdrawalPct', event.target.value)}
                      className="w-full rounded-lg border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-gray-300">Daily max loss (%)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={configForm.dailyLossLimitPct}
                      onChange={(event) => updateConfig('dailyLossLimitPct', event.target.value)}
                      className="w-full rounded-lg border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-gray-300">Weekly max loss (%)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={configForm.weeklyLossLimitPct}
                      onChange={(event) => updateConfig('weeklyLossLimitPct', event.target.value)}
                      className="w-full rounded-lg border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm text-gray-300">Monthly drawdown limit (%)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={configForm.monthlyLossLimitPct}
                      onChange={(event) => updateConfig('monthlyLossLimitPct', event.target.value)}
                      className="w-full rounded-lg border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                </div>

                <Button type="submit" disabled={savingConfig} className="w-full bg-blue-600 text-white hover:bg-blue-700">
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
                <TrendingUp className="h-4 w-4 text-blue-300" />
                Trading journal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveJournal} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm text-gray-300">Date</span>
                    <input
                      type="date"
                      value={journalForm.date}
                      onChange={(event) => updateJournal('date', event.target.value)}
                      className="w-full rounded-lg border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-gray-300">P&amp;L</span>
                    <input
                      type="number"
                      step="any"
                      value={journalForm.pnl}
                      onChange={(event) => updateJournal('pnl', event.target.value)}
                      placeholder="-250000 or 480000"
                      className="w-full rounded-lg border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                </div>
                <label className="space-y-2">
                  <span className="text-sm text-gray-300">Note</span>
                  <textarea
                    rows={3}
                    value={journalForm.note}
                    onChange={(event) => updateJournal('note', event.target.value)}
                    placeholder="Reason for the trade result, discipline note, or planned cooldown."
                    className="w-full rounded-lg border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <Button type="submit" disabled={savingJournal} className="w-full bg-amber-600 text-white hover:bg-amber-700">
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
                <div className="rounded-lg border border-dashed border-[#1F2937] bg-[#0B1020] p-6 text-center text-sm text-gray-400">
                  No trading entries yet. Add realized P&amp;L entries to start monitoring risk consumption.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.records.slice(0, 8).map((record) => (
                    <div key={record.id} className="flex flex-col gap-2 rounded-lg border border-[#1F2937] bg-[#0B1020] p-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-white">{formatDate(record.date)}</p>
                        <p className="text-sm text-gray-400">{record.note || 'No note'}</p>
                      </div>
                      <p className={`text-lg font-semibold ${Number(record.pnl || 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
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
    </div>
  );
}


