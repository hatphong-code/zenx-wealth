import { useEffect, useState } from 'react';
import { PiggyBank, Save } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import AppNav from '../components/AppNav';
import { Button } from '../components/ui/button';
import { formatMoney, formatNumber } from '../utils/formatters';
import { getCachedUserProfile } from '../services/userService';
import {
  defaultAllocationRule,
  saveAllocationRule,
} from '../services/payYourselfFirstService';
import { usePayYourselfFirstData } from '../hooks/usePayYourselfFirstData';

const allocationLabels = {
  living: 'Living',
  emergencyFund: 'Emergency Fund',
  longTermAsset: 'Long-term Asset',
  businessLearning: 'Business / Learning',
  highRiskTrading: 'High Risk / Trading',
};

export default function PayYourselfFirst() {
  const { user } = useAuth();
  const { data, setData, loading, refreshing, error, setError } = usePayYourselfFirstData(user?.uid);
  const [form, setForm] = useState(data.allocationRule);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm(data.allocationRule);
  }, [data.allocationRule]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const totalPercent = Object.values(form).reduce((sum, value) => sum + Number(value || 0), 0);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!user) return;

    const normalized = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, Number(value || 0)])
    );
    const ruleTotal = Object.values(normalized).reduce((sum, value) => sum + value, 0);
    if (ruleTotal !== 100) {
      setError('Allocation rule must sum to exactly 100%.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const profile = getCachedUserProfile(user.uid) || {
        settings: {
          allocationRule: defaultAllocationRule,
        },
      };
      const nextData = await saveAllocationRule(user.uid, profile, normalized);
      setData(nextData);
      setForm(nextData.allocationRule);
      setMessage('Allocation rule saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zx-bg text-zx-text">
      <AppNav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zx-surface">
            <PiggyBank className="h-7 w-7 text-zx-accent" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Pay Yourself First</h1>
            <p className="text-sm text-zx-text-soft">Turn income into a default allocation rule before lifestyle absorbs it.</p>
            {loading && <p className="text-sm text-zx-text-soft">Loading allocation status...</p>}
            {refreshing && <p className="text-sm text-zx-accent">Refreshing allocation status...</p>}
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-zx-line bg-zx-surface p-4">
            <p className="text-sm text-zx-text-soft">This month income base</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(data.totalIncome, data.currency)}</p>
          </div>
          <div className="rounded-lg border border-zx-line bg-zx-surface p-4">
            <p className="text-sm text-zx-text-soft">Required this month</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(data.status.required, data.currency)}</p>
          </div>
          <div className="rounded-lg border border-zx-line bg-zx-surface p-4">
            <p className="text-sm text-zx-text-soft">Done</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(data.status.done, data.currency)}</p>
          </div>
          <div className="rounded-lg border border-zx-line bg-zx-surface p-4">
            <p className="text-sm text-zx-text-soft">Remaining</p>
            <p className="mt-2 text-2xl font-bold text-orange-300">{formatMoney(data.status.remaining, data.currency)}</p>
          </div>
        </section>

        <section className="rounded-lg border border-zx-line bg-zx-surface p-5">
          <div className="mb-3 flex items-center justify-between text-sm text-zx-text-soft">
            <span>Progress</span>
            <span>{formatNumber(data.status.progress)}%</span>
          </div>
          <div className="h-3 rounded-full bg-zx-surface-2">
            <div className="h-3 rounded-full bg-purple-500" style={{ width: `${data.status.progress}%` }} />
          </div>
        </section>

        <form onSubmit={handleSave} className="space-y-5 rounded-lg border border-zx-line bg-zx-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Income allocation rule</h2>
            <span className={`text-sm ${totalPercent === 100 ? 'text-zx-positive' : 'text-orange-300'}`}>
              Total: {formatNumber(totalPercent)}%
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {Object.entries(form).map(([key, value]) => (
              <label key={key} className="space-y-2">
                <span className="text-sm text-zx-text-soft">{allocationLabels[key]}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={value}
                  onChange={(event) => updateField(key, event.target.value)}
                  className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-purple-500"
                />
              </label>
            ))}
          </div>

          {error && <p className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
          {message && <p className="rounded border border-green-900 bg-green-950/40 p-3 text-sm text-zx-positive">{message}</p>}

          <Button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-purple-600 text-zx-text hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Allocation Rule'}
          </Button>
        </form>

        <section className="rounded-lg border border-zx-line bg-zx-surface p-5">
          <h2 className="text-lg font-semibold">Suggested allocation this month</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {data.allocations.map((item) => (
              <div key={item.key} className="rounded border border-zx-line bg-zx-bg p-4">
                <p className="text-sm text-zx-text-soft">{allocationLabels[item.key]}</p>
                <p className="mt-2 text-lg font-semibold">{formatNumber(item.percentage)}%</p>
                <p className="mt-1 text-sm text-zx-text-soft">{formatMoney(item.amount, data.currency)}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}


