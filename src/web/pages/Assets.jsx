import { useState } from 'react';
import { Landmark, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../core/auth/useAuth';
import { Button } from '../components/ui/button';
import { Combobox } from '../components/ui/Combobox';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatMoney } from '../../core/utils/formatters';
import {
  accountPurposes,
  accountTypes,
  createAccount,
  recomputeAssetsState,
  removeAccount,
  setAssetsCache,
  updateAccount,
} from '../../core/services/assetService';
import { useAssetsData } from '../../core/hooks/useAssetsData';
import { invalidateReportsCache } from '../../core/services/reportsService';
import { invalidateWealthRoadmapCache } from '../../core/services/wealthRoadmapService';
import { invalidateAICoachCache } from '../../core/services/aiCoachService';
import { useI18n } from '../../core/i18n/useI18n';

const initialForm = {
  name: '',
  type: accountTypes[0].value,
  purpose: accountPurposes[0].value,
  balance: '',
};

export default function Assets() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { data, setData, loading, refreshing, error, setError } = useAssetsData(user?.uid);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleEdit = (account) => {
    setEditingId(account.id);
    setError('');
    setForm({
      name: account.name || '',
      type: account.type || accountTypes[0].value,
      purpose: account.purpose || accountPurposes[0].value,
      balance: String(account.balance || ''),
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;

    const balance = Number(form.balance);
    if (!form.name.trim() || !Number.isFinite(balance) || balance < 0) {
      setError(t('assets.errors.invalidForm'));
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        purpose: form.purpose,
        balance,
      };

      const saved = editingId
        ? await updateAccount(user.uid, editingId, payload)
        : await createAccount(user.uid, payload);

      const nextState = recomputeAssetsState(
        data,
        editingId
          ? (items) => items.map((item) => (item.id === editingId ? { ...item, ...saved } : item))
          : (items) => [saved, ...items]
      );

      setData(nextState);
      setAssetsCache(user.uid, nextState);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      invalidateWealthRoadmapCache(user.uid);
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (accountId) => {
    if (!user) return;
    if (!window.confirm(t('assets.confirmDelete'))) return;

    try {
      await removeAccount(user.uid, accountId);
      const nextState = recomputeAssetsState(data, (items) => items.filter((item) => item.id !== accountId));
      setData(nextState);
      setAssetsCache(user.uid, nextState);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      invalidateWealthRoadmapCache(user.uid);
    } catch (err) {
      setError(err.message);
    }
  };

  const { currency, accounts, summary } = data;

  const assetTypeKeyMap = {
    'Cash': 'cash', 'Savings': 'savings', 'Brokerage': 'brokerage', 'Retirement': 'retirement',
    'Crypto': 'crypto', 'Business': 'business', 'Real Estate': 'realEstate', 'Gold': 'gold', 'Other': 'other',
  };
  const purposeKeyMap = {
    'Daily': 'daily', 'Emergency': 'emergency', 'Long-term': 'longTerm', 'Risk': 'risk', 'Business': 'business',
  };
  const accountTypeOptions = accountTypes.map(a => ({ value: a.value, label: t(`assets.typeOptions.${assetTypeKeyMap[a.value]}`, {}, a.label) }));
  const accountPurposeOptions = accountPurposes.map(p => ({ value: p.value, label: t(`assets.purposeOptions.${purposeKeyMap[p.value]}`, {}, p.label) }));

  return (
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zx-icon-bg">
            <Landmark className="h-7 w-7 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('assets.title')}</h1>
            <p className="text-sm text-zx-text-soft">{t('assets.subtitle')}</p>
            {loading && <p className="text-sm text-zx-text-soft">{t('assets.loading')}</p>}
            {refreshing && <p className="text-sm text-zx-accent">{t('assets.refreshing')}</p>}
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Card>
            <CardHeader><CardTitle>{t('assets.stats.total')}</CardTitle></CardHeader>
            <CardContent><p className="font-zx-head text-2xl font-bold text-zx-text">{formatMoney(summary.totalAssets, currency)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t('assets.stats.liquid')}</CardTitle></CardHeader>
            <CardContent><p className="font-zx-head text-2xl font-bold text-zx-text">{formatMoney(summary.liquidAssets, currency)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t('assets.stats.longTerm')}</CardTitle></CardHeader>
            <CardContent><p className="font-zx-head text-2xl font-bold text-zx-text">{formatMoney(summary.longTermAssets, currency)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t('assets.stats.risk')}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-zx-gold">{formatMoney(summary.riskAssets, currency)}</p></CardContent>
          </Card>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-zx border border-zx-line bg-zx-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-zx-head text-lg font-semibold text-zx-text">{editingId ? t('assets.form.editTitle') : t('assets.form.addTitle')}</h2>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm text-zx-text-soft transition hover:text-zx-text">
                {t('common.cancelEdit')}
              </button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 xl:col-span-2">
              <span className="text-sm text-zx-text-soft">{t('assets.form.nameLabel')}</span>
              <input value={form.name} onChange={(e) => updateField('name', e.target.value)} className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" />
            </label>
            <div className="space-y-2">
              <span className="text-sm text-zx-text-soft">{t('assets.form.typeLabel')}</span>
              <Combobox options={accountTypeOptions} value={form.type} onChange={v => updateField('type', v)} clearable={false} emptyLabel={t('assets.form.typeLabel')} />
            </div>
            <div className="space-y-2">
              <span className="text-sm text-zx-text-soft">{t('assets.form.purposeLabel')}</span>
              <Combobox options={accountPurposeOptions} value={form.purpose} onChange={v => updateField('purpose', v)} clearable={false} emptyLabel={t('assets.form.purposeLabel')} />
            </div>
            <label className="space-y-2 md:col-span-2 xl:col-span-4">
              <span className="text-sm text-zx-text-soft">{t('assets.form.balanceLabel')}</span>
              <input type="number" min="0" step="any" value={form.balance} onChange={(e) => updateField('balance', e.target.value)} aria-describedby={error ? 'assets-error' : undefined} className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" />
            </label>
          </div>
          {error && <p id="assets-error" role="alert" className="rounded-zx-sm border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative">{error}</p>}
          <Button type="submit" disabled={saving} className="bg-emerald-600 text-zx-text hover:bg-emerald-700">
            <Plus className="mr-2 h-4 w-4" /> {saving ? t('common.saving') : editingId ? t('assets.form.saveButton') : t('assets.form.addButton')}
          </Button>
        </form>

        <section className="rounded-zx border border-zx-line bg-zx-surface overflow-hidden">
          <div className="border-b border-zx-line p-4">
            <h2 className="font-semibold">{t('assets.listTitle')}</h2>
          </div>
          {accounts.length === 0 ? (
            <div className="p-6 text-center text-zx-text-soft">{loading ? t('assets.loading') : t('assets.empty')}</div>
          ) : (
            <div className="divide-y divide-zx-line">
              {accounts.map((account) => (
                <article key={account.id} className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{account.name}</h3>
                      <span className="rounded-full bg-zx-bg px-2.5 py-1 text-xs text-zx-text-soft">{account.type}</span>
                      <span className="rounded-full bg-emerald-950 px-2.5 py-1 text-xs text-zx-positive">{account.purpose}</span>
                    </div>
                    <p className="font-mono text-lg">{formatMoney(account.balance, currency)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => handleEdit(account)} className="bg-zx-bg px-3 py-2 text-zx-accent hover:bg-zx-surface-2">
                      <Pencil className="mr-2 h-4 w-4" /> {t('common.edit')}
                    </Button>
                    <Button type="button" onClick={() => handleDelete(account.id)} className="bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900">
                      <Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
  );
}


