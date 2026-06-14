import { useEffect, useState } from 'react';
import { PiggyBank, Save } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { Button } from '../components/ui/button';
import { formatMoney, formatNumber } from '../utils/formatters';
import { getCachedUserProfile } from '../services/userService';
import {
  defaultAllocationRule,
  saveAllocationRule,
} from '../services/payYourselfFirstService';
import { usePayYourselfFirstData } from '../hooks/usePayYourselfFirstData';
import { useI18n } from '../i18n/useI18n';

export default function PayYourselfFirst() {
  const { user } = useAuth();
  const { data, setData, loading, refreshing, error, setError } = usePayYourselfFirstData(user?.uid);
  const [form, setForm] = useState(data.allocationRule);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const { t } = useI18n();

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
      setError(t('payYourself.errors.allocationSum'));
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
      setMessage(t('payYourself.saveSuccess'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zx-surface">
            <PiggyBank className="h-7 w-7 text-zx-accent" />
          </div>
          <div className="space-y-1">
            <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('payYourself.title')}</h1>
            <p className="text-sm text-zx-text-soft">{t('payYourself.subtitle')}</p>
            {loading && <p className="text-sm text-zx-text-soft">{t('payYourself.loading')}</p>}
            {refreshing && <p className="text-sm text-zx-accent">{t('payYourself.refreshing')}</p>}
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="py-4">
            <p className="text-sm text-zx-text-soft">{t('payYourself.stats.incomeBase')}</p>
            <p className="font-zx-display mt-2 text-2xl font-bold">{formatMoney(data.totalIncome, data.currency)}</p>
          </div>
          <div className="py-4">
            <p className="text-sm text-zx-text-soft">{t('payYourself.stats.required')}</p>
            <p className="font-zx-display mt-2 text-2xl font-bold">{formatMoney(data.status.required, data.currency)}</p>
          </div>
          <div className="py-4">
            <p className="text-sm text-zx-text-soft">{t('payYourself.stats.done')}</p>
            <p className="font-zx-display mt-2 text-2xl font-bold">{formatMoney(data.status.done, data.currency)}</p>
          </div>
          <div className="py-4">
            <p className="text-sm text-zx-text-soft">{t('payYourself.stats.remaining')}</p>
            <p className="mt-2 text-2xl font-bold text-orange-300">{formatMoney(data.status.remaining, data.currency)}</p>
          </div>
        </section>

        <section className="py-5">
          <div className="mb-3 flex items-center justify-between text-sm text-zx-text-soft">
            <span>{t('common.progress')}</span>
            <span>{formatNumber(data.status.progress)}%</span>
          </div>
          <div className="h-3 rounded-full bg-zx-surface-2">
            <div className="h-3 rounded-full bg-purple-500" style={{ width: `${data.status.progress}%` }} />
          </div>
        </section>

        <form onSubmit={handleSave} className="space-y-5 rounded-lg border border-zx-line bg-zx-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-zx-head text-lg font-semibold text-zx-text">{t('payYourself.ruleTitle')}</h2>
            <span className={`text-sm ${totalPercent === 100 ? 'text-zx-positive' : 'text-orange-300'}`}>
              {t('payYourself.totalLabel', { value: formatNumber(totalPercent) })}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {Object.entries(form).map(([key, value]) => (
              <label key={key} className="space-y-2">
                <span className="text-sm text-zx-text-soft">{t('payYourself.allocationLabels.' + key)}</span>
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
            {saving ? t('common.saving') : t('payYourself.saveButton')}
          </Button>
        </form>

        <section className="py-5">
          <h2 className="font-zx-head text-lg font-semibold text-zx-text">{t('payYourself.allocationTitle')}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {data.allocations.map((item) => (
              <div key={item.key} className="rounded border border-zx-line bg-zx-bg p-4">
                <p className="text-sm text-zx-text-soft">{t('payYourself.allocationLabels.' + item.key)}</p>
                <p className="mt-2 text-lg font-semibold">{formatNumber(item.percentage)}%</p>
                <p className="mt-1 text-sm text-zx-text-soft">{formatMoney(item.amount, data.currency)}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
  );
}
