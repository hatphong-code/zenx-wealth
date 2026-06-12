import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { Button } from '../components/ui/button';
import { formatMoney } from '../utils/formatters';
import {
  createIncomeSource,
  incomeStages,
  incomeTypes,
  recomputeIncomeSourceState,
  removeIncomeSource,
  setIncomeSourceCache,
  updateIncomeSource,
} from '../services/incomeBuilderService';
import { useIncomeSourcesData } from '../hooks/useIncomeSourcesData';
import { invalidateReportsCache } from '../services/reportsService';
import { invalidateWealthRoadmapCache } from '../services/wealthRoadmapService';
import { invalidateAICoachCache } from '../services/aiCoachService';

const initialForm = {
  sourceName: '',
  sourceType: incomeTypes[0],
  currentMonthlyIncome: '',
  targetMonthlyIncome: '',
  stage: incomeStages[0],
  nextAction: '',
  note: '',
};

export default function IncomeBuilder() {
  const { user } = useAuth();
  const { data, setData, loading, refreshing, error, setError } = useIncomeSourcesData(user?.uid);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleEdit = (source) => {
    setEditingId(source.id);
    setError('');
    setForm({
      sourceName: source.sourceName || '',
      sourceType: source.sourceType || incomeTypes[0],
      currentMonthlyIncome: String(source.currentMonthlyIncome || ''),
      targetMonthlyIncome: String(source.targetMonthlyIncome || ''),
      stage: source.stage || incomeStages[0],
      nextAction: source.nextAction || '',
      note: source.note || '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;

    const currentMonthlyIncome = Number(form.currentMonthlyIncome || 0);
    const targetMonthlyIncome = Number(form.targetMonthlyIncome || 0);

    if (!form.sourceName.trim() || targetMonthlyIncome < 0 || currentMonthlyIncome < 0) {
      setError('Income source name and monthly amounts must be valid.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        sourceName: form.sourceName.trim(),
        sourceType: form.sourceType,
        currentMonthlyIncome,
        targetMonthlyIncome,
        stage: form.stage,
        nextAction: form.nextAction.trim(),
        note: form.note.trim(),
      };

      const saved = editingId
        ? await updateIncomeSource(user.uid, editingId, payload)
        : await createIncomeSource(user.uid, payload);

      const nextState = recomputeIncomeSourceState(
        data,
        editingId
          ? (items) => items.map((item) => (item.id === editingId ? { ...item, ...saved } : item))
          : (items) => [saved, ...items]
      );
      setData(nextState);
      setIncomeSourceCache(user.uid, nextState);
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

  const handleDelete = async (sourceId) => {
    if (!user) return;
    if (!window.confirm('Delete this income source?')) return;

    try {
      await removeIncomeSource(user.uid, sourceId);
      const nextState = recomputeIncomeSourceState(data, (items) => items.filter((item) => item.id !== sourceId));
      setData(nextState);
      setIncomeSourceCache(user.uid, nextState);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      invalidateWealthRoadmapCache(user.uid);
    } catch (err) {
      setError(err.message);
    }
  };

  const { currency, incomeSources, summary } = data;

  return (
      <main className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Income Builder</h1>
          <p className="text-sm text-zx-text-soft">Grow active income capacity instead of relying on cost cutting alone.</p>
          {loading && <p className="text-sm text-zx-text-soft">Loading income sources...</p>}
          {refreshing && <p className="text-sm text-zx-accent">Refreshing income builder...</p>}
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-zx-line bg-zx-surface p-4">
            <p className="text-sm text-zx-text-soft">Current monthly income</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(summary.currentMonthlyIncome, currency)}</p>
          </div>
          <div className="rounded-lg border border-zx-line bg-zx-surface p-4">
            <p className="text-sm text-zx-text-soft">Target monthly income</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(summary.targetMonthlyIncome, currency)}</p>
          </div>
          <div className="rounded-lg border border-zx-line bg-zx-surface p-4">
            <p className="text-sm text-zx-text-soft">Income gap</p>
            <p className="mt-2 text-2xl font-bold text-orange-300">{formatMoney(summary.gap, currency)}</p>
          </div>
          <div className="rounded-lg border border-zx-line bg-zx-surface p-4">
            <p className="text-sm text-zx-text-soft">Active sources</p>
            <p className="mt-2 text-2xl font-bold">{summary.activeSources}</p>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-zx-line bg-zx-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit income source' : 'Add income source'}</h2>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm text-zx-text-soft transition hover:text-zx-text">
                Cancel edit
              </button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">Source name</span>
              <input value={form.sourceName} onChange={(e) => updateField('sourceName', e.target.value)} className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" required />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">Source type</span>
              <select value={form.sourceType} onChange={(e) => updateField('sourceType', e.target.value)} className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent">
                {incomeTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">Stage</span>
              <select value={form.stage} onChange={(e) => updateField('stage', e.target.value)} className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent">
                {incomeStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">Current monthly income</span>
              <input type="number" min="0" step="any" value={form.currentMonthlyIncome} onChange={(e) => updateField('currentMonthlyIncome', e.target.value)} className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">Target monthly income</span>
              <input type="number" min="0" step="any" value={form.targetMonthlyIncome} onChange={(e) => updateField('targetMonthlyIncome', e.target.value)} className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" />
            </label>
            <label className="space-y-2 md:col-span-2 xl:col-span-1">
              <span className="text-sm text-zx-text-soft">Next action</span>
              <input value={form.nextAction} onChange={(e) => updateField('nextAction', e.target.value)} className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" />
            </label>
          </div>
          <label className="space-y-2 block">
            <span className="text-sm text-zx-text-soft">Note</span>
            <input value={form.note} onChange={(e) => updateField('note', e.target.value)} className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" />
          </label>
          {error && <p className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
          <Button type="submit" disabled={saving} className="bg-zx-accent text-zx-on-accent hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'Saving...' : editingId ? 'Save Income Source' : 'Add Income Source'}
          </Button>
        </form>

        <section className="overflow-hidden rounded-lg border border-zx-line bg-zx-surface">
          <div className="border-b border-zx-line p-4">
            <h2 className="font-semibold">Income pipeline</h2>
          </div>
          {incomeSources.length === 0 ? (
            <div className="p-6 text-center text-zx-text-soft">{loading ? 'Loading income sources...' : 'No income sources yet.'}</div>
          ) : (
            <div className="divide-y divide-zx-line">
              {incomeSources.map((source) => (
                <div key={source.id} className="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{source.sourceName}</h3>
                      <span className="rounded bg-zx-bg px-2 py-1 text-xs text-zx-text-soft">{source.sourceType}</span>
                      <span className="rounded bg-blue-950 px-2 py-1 text-xs text-zx-accent">{source.stage}</span>
                    </div>
                    <p className="text-sm text-zx-text-soft">
                      Current {formatMoney(source.currentMonthlyIncome, currency)} / Target {formatMoney(source.targetMonthlyIncome, currency)}
                    </p>
                    <p className="text-sm text-zx-text-soft">{source.nextAction || source.note || 'No next action yet.'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => handleEdit(source)} className="inline-flex items-center gap-2 bg-zx-bg px-3 py-2 text-zx-accent hover:bg-zx-surface-2">
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                    <Button type="button" onClick={() => handleDelete(source.id)} className="inline-flex items-center gap-2 bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900">
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
  );
}


