import { useState } from 'react';
import { Landmark, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import AppNav from '../components/AppNav';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatMoney } from '../utils/formatters';
import {
  accountPurposes,
  accountTypes,
  createAccount,
  recomputeAssetsState,
  removeAccount,
  setAssetsCache,
  updateAccount,
} from '../services/assetService';
import { useAssetsData } from '../hooks/useAssetsData';
import { invalidateReportsCache } from '../services/reportsService';
import { invalidateWealthRoadmapCache } from '../services/wealthRoadmapService';
import { invalidateAICoachCache } from '../services/aiCoachService';

const initialForm = {
  name: '',
  type: accountTypes[0],
  purpose: accountPurposes[0],
  balance: '',
};

export default function Assets() {
  const { user } = useAuth();
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
      type: account.type || accountTypes[0],
      purpose: account.purpose || accountPurposes[0],
      balance: String(account.balance || ''),
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;

    const balance = Number(form.balance);
    if (!form.name.trim() || !Number.isFinite(balance) || balance < 0) {
      setError('Account name and balance must be valid.');
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
    if (!window.confirm('Delete this asset account?')) return;

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

  return (
    <div className="min-h-screen bg-zx-bg text-zx-text">
      <AppNav />
      <main className="mx-auto max-w-7xl space-y-6 p-4 pb-24 md:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zx-surface">
            <Landmark className="h-7 w-7 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Assets</h1>
            <p className="text-sm text-zx-text-soft">Track the asset side of your balance sheet, not only spending control.</p>
            {loading && <p className="text-sm text-zx-text-soft">Loading assets...</p>}
            {refreshing && <p className="text-sm text-zx-accent">Refreshing assets...</p>}
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader><CardTitle>Total assets</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatMoney(summary.totalAssets, currency)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Liquid assets</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatMoney(summary.liquidAssets, currency)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Long-term assets</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatMoney(summary.longTermAssets, currency)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Risk assets</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-zx-gold">{formatMoney(summary.riskAssets, currency)}</p></CardContent>
          </Card>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-zx-line bg-zx-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit asset account' : 'Add asset account'}</h2>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm text-zx-text-soft transition hover:text-zx-text">
                Cancel edit
              </button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 xl:col-span-2">
              <span className="text-sm text-zx-text-soft">Account name</span>
              <input value={form.name} onChange={(e) => updateField('name', e.target.value)} className="w-full rounded-lg border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">Type</span>
              <select value={form.type} onChange={(e) => updateField('type', e.target.value)} className="w-full rounded-lg border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent">
                {accountTypes.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">Purpose</span>
              <select value={form.purpose} onChange={(e) => updateField('purpose', e.target.value)} className="w-full rounded-lg border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent">
                {accountPurposes.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="space-y-2 md:col-span-2 xl:col-span-4">
              <span className="text-sm text-zx-text-soft">Balance</span>
              <input type="number" min="0" step="any" value={form.balance} onChange={(e) => updateField('balance', e.target.value)} className="w-full rounded-lg border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" />
            </label>
          </div>
          {error && <p className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
          <Button type="submit" disabled={saving} className="bg-emerald-600 text-zx-text hover:bg-emerald-700">
            <Plus className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : editingId ? 'Save Account' : 'Add Account'}
          </Button>
        </form>

        <section className="overflow-hidden rounded-lg border border-zx-line bg-zx-surface">
          <div className="border-b border-zx-line p-4">
            <h2 className="font-semibold">Asset accounts</h2>
          </div>
          {accounts.length === 0 ? (
            <div className="p-6 text-center text-zx-text-soft">{loading ? 'Loading assets...' : 'No asset accounts yet.'}</div>
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
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button type="button" onClick={() => handleDelete(account.id)} className="bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

