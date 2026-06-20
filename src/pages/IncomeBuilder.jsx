import { useState } from 'react';
import { Pencil, Trash2, TrendingUp } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/Input';
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
import { useI18n } from '../i18n/useI18n';

const initialForm = {
  sourceName: '',
  sourceType: incomeTypes[0].value,
  currentMonthlyIncome: '',
  targetMonthlyIncome: '',
  stage: incomeStages[0].value,
  nextAction: '',
  note: '',
};

export default function IncomeBuilder() {
  const { user } = useAuth();
  const { t } = useI18n();
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
      sourceType: source.sourceType || incomeTypes[0].value,
      currentMonthlyIncome: String(source.currentMonthlyIncome || ''),
      targetMonthlyIncome: String(source.targetMonthlyIncome || ''),
      stage: source.stage || incomeStages[0].value,
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
      setError(t('income.errors.invalidForm'));
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
    if (!window.confirm(t('income.confirmDelete'))) return;

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
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zx-icon-bg">
            <TrendingUp className="h-6 w-6 text-zx-accent" />
          </div>
          <div className="space-y-1">
            <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('income.title')}</h1>
            <p className="text-sm text-zx-text-soft">{t('income.subtitle')}</p>
            {loading && <p className="text-sm text-zx-text-soft">{t('income.loading')}</p>}
            {refreshing && <p className="text-sm text-zx-accent">{t('income.refreshing')}</p>}
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="rounded-zx border border-zx-line bg-zx-surface p-4">
            <p className="text-sm text-zx-text-soft">{t('income.stats.current')}</p>
            <p className="font-zx-display mt-2 text-2xl font-bold">{formatMoney(summary.currentMonthlyIncome, currency)}</p>
          </div>
          <div className="rounded-zx border border-zx-line bg-zx-surface p-4">
            <p className="text-sm text-zx-text-soft">{t('income.stats.target')}</p>
            <p className="font-zx-display mt-2 text-2xl font-bold">{formatMoney(summary.targetMonthlyIncome, currency)}</p>
          </div>
          <div className="rounded-zx border border-zx-line bg-zx-surface p-4">
            <p className="text-sm text-zx-text-soft">{t('income.stats.gap')}</p>
            <p className="mt-2 text-2xl font-bold text-orange-300">{formatMoney(summary.gap, currency)}</p>
          </div>
          <div className="rounded-zx border border-zx-line bg-zx-surface p-4">
            <p className="text-sm text-zx-text-soft">{t('income.stats.sources')}</p>
            <p className="font-zx-display mt-2 text-2xl font-bold">{summary.activeSources}</p>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-zx-line bg-zx-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-zx-head text-lg font-semibold text-zx-text">{editingId ? t('income.form.editTitle') : t('income.form.addTitle')}</h2>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm text-zx-text-soft transition hover:text-zx-text">
                {t('common.cancelEdit')}
              </button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">{t('income.form.nameLabel')}</span>
              <Input value={form.sourceName} onChange={(e) => updateField('sourceName', e.target.value)} aria-describedby={error ? 'income-error' : undefined} required />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">{t('income.form.typeLabel')}</span>
              <select value={form.sourceType} onChange={(e) => updateField('sourceType', e.target.value)} className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent">
                {incomeTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">{t('income.form.stageLabel')}</span>
              <select value={form.stage} onChange={(e) => updateField('stage', e.target.value)} className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent">
                {incomeStages.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">{t('income.form.currentLabel')}</span>
              <Input type="number" min="0" step="any" value={form.currentMonthlyIncome} onChange={(e) => updateField('currentMonthlyIncome', e.target.value)}  />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">{t('income.form.targetLabel')}</span>
              <Input type="number" min="0" step="any" value={form.targetMonthlyIncome} onChange={(e) => updateField('targetMonthlyIncome', e.target.value)}  />
            </label>
            <label className="space-y-2 md:col-span-2 xl:col-span-1">
              <span className="text-sm text-zx-text-soft">{t('income.form.nextActionLabel')}</span>
              <Input value={form.nextAction} onChange={(e) => updateField('nextAction', e.target.value)}  />
            </label>
          </div>
          <label className="space-y-2 block">
            <span className="text-sm text-zx-text-soft">{t('common.note')}</span>
            <Input value={form.note} onChange={(e) => updateField('note', e.target.value)}  />
          </label>
          {error && <p id="income-error" role="alert" className="rounded-zx-sm border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative">{error}</p>}
          <Button type="submit" disabled={saving} className="bg-zx-accent text-zx-on-accent hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? t('common.saving') : editingId ? t('income.form.saveButton') : t('income.form.addButton')}
          </Button>
        </form>

        <section className="rounded-zx border border-zx-line bg-zx-surface overflow-hidden">
          <div className="border-b border-zx-line p-4">
            <h2 className="font-semibold">{t('income.pipeline')}</h2>
          </div>
          {incomeSources.length === 0 ? (
            <div className="p-6 text-center text-zx-text-soft">{loading ? t('income.loading') : t('income.empty')}</div>
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
                      {t('income.currentVsTarget', { current: formatMoney(source.currentMonthlyIncome, currency), target: formatMoney(source.targetMonthlyIncome, currency) })}
                    </p>
                    <p className="text-sm text-zx-text-soft">{source.nextAction || source.note || t('income.noNextAction')}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => handleEdit(source)} className="inline-flex items-center gap-2 bg-zx-bg px-3 py-2 text-zx-accent hover:bg-zx-surface-2">
                      <Pencil className="h-4 w-4" /> {t('common.edit')}
                    </Button>
                    <Button type="button" onClick={() => handleDelete(source.id)} className="inline-flex items-center gap-2 bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900">
                      <Trash2 className="h-4 w-4" /> {t('common.delete')}
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




