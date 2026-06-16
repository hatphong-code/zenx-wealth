import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { Button } from '../components/ui/button';
import { formatMoney, formatNumber } from '../utils/formatters';
import {
  createDebt,
  debtPriorities,
  debtTypes,
  recomputeDebtState,
  removeDebt,
  setDebtCache,
  updateDebt,
} from '../services/debtService';
import { useDebtData } from '../hooks/useDebtData';
import { invalidateReportsCache } from '../services/reportsService';
import { invalidateWealthRoadmapCache } from '../services/wealthRoadmapService';
import { invalidateAICoachCache } from '../services/aiCoachService';
import { useI18n } from '../i18n/useI18n';

const today = new Date().toISOString().slice(0, 10);
const initialForm = {
  debtName: '',
  totalAmount: '',
  remainingAmount: '',
  interestRate: '',
  minimumPayment: '',
  dueDate: today,
  debtType: debtTypes[0].value,
  priority: debtPriorities[0].value,
  note: '',
};

export default function DebtControl() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { data, setData, loading, refreshing, error, setError } = useDebtData(user?.uid);
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

  const handleEdit = (debt) => {
    setEditingId(debt.id);
    setError('');
    setForm({
      debtName: debt.debtName || '',
      totalAmount: String(debt.totalAmount || ''),
      remainingAmount: String(debt.remainingAmount || ''),
      interestRate: String(debt.interestRate || ''),
      minimumPayment: String(debt.minimumPayment || ''),
      dueDate: debt.dueDate || today,
      debtType: debt.debtType || debtTypes[0].value,
      priority: debt.priority || debtPriorities[0].value,
      note: debt.note || '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;

    const totalAmount = Number(form.totalAmount);
    const remainingAmount = Number(form.remainingAmount || form.totalAmount);
    const interestRate = Number(form.interestRate || 0);
    const minimumPayment = Number(form.minimumPayment || 0);

    if (!form.debtName.trim() || totalAmount <= 0 || remainingAmount < 0) {
      setError(t('debts.errors.invalidForm'));
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        debtName: form.debtName.trim(),
        totalAmount,
        remainingAmount,
        interestRate,
        minimumPayment,
        dueDate: form.dueDate,
        debtType: form.debtType,
        priority: form.priority,
        note: form.note.trim(),
      };

      const saved = editingId
        ? await updateDebt(user.uid, editingId, payload)
        : await createDebt(user.uid, payload);

      const nextState = recomputeDebtState(
        data,
        editingId
          ? (items) => items.map((item) => (item.id === editingId ? { ...item, ...saved } : item))
          : (items) => [saved, ...items]
      );
      setData(nextState);
      setDebtCache(user.uid, nextState);
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

  const handleDelete = async (debtId) => {
    if (!user) return;
    if (!window.confirm(t('debts.confirmDelete'))) return;

    try {
      await removeDebt(user.uid, debtId);
      const nextState = recomputeDebtState(data, (items) => items.filter((item) => item.id !== debtId));
      setData(nextState);
      setDebtCache(user.uid, nextState);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      invalidateWealthRoadmapCache(user.uid);
    } catch (err) {
      setError(err.message);
    }
  };

  const { currency, debts, summary } = data;

  return (
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8">
        <div className="space-y-1">
          <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('debts.title')}</h1>
          <p className="text-sm text-zx-text-soft">{t('debts.subtitle')}</p>
          {loading && <p className="text-sm text-zx-text-soft">{t('debts.loading')}</p>}
          {refreshing && <p className="text-sm text-zx-accent">{t('debts.refreshing')}</p>}
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="py-4">
            <p className="text-sm text-zx-text-soft">{t('debts.stats.total')}</p>
            <p className="font-zx-display mt-2 text-2xl font-bold">{formatMoney(summary.totalDebt, currency)}</p>
          </div>
          <div className="py-4">
            <p className="text-sm text-zx-text-soft">{t('debts.stats.bad')}</p>
            <p className="mt-2 text-2xl font-bold text-red-300">{formatMoney(summary.badDebt, currency)}</p>
          </div>
          <div className="py-4">
            <p className="text-sm text-zx-text-soft">{t('debts.stats.monthly')}</p>
            <p className="font-zx-display mt-2 text-2xl font-bold">{formatMoney(summary.monthlyPayment, currency)}</p>
          </div>
          <div className="py-4">
            <p className="text-sm text-zx-text-soft">{t('debts.stats.progress')}</p>
            <p className="font-zx-display mt-2 text-2xl font-bold">{formatNumber(summary.payoffProgress)}%</p>
          </div>
        </section>

        {summary.highestPriorityDebt && (
          <section className="rounded-lg border border-[#3F2A2A] bg-[#1A1313] p-4">
            <p className="text-sm text-red-300">{t('debts.suggestedAction')}</p>
            <p className="mt-2 text-sm text-zx-text-soft">
              {t('debts.focusPayment', { name: summary.highestPriorityDebt.debtName, rate: formatNumber(summary.highestPriorityDebt.interestRate, { maximumFractionDigits: 1 }) })}
            </p>
          </section>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-zx-line bg-zx-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-zx-head text-lg font-semibold text-zx-text">{editingId ? t('debts.form.editTitle') : t('debts.form.addTitle')}</h2>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm text-zx-text-soft transition hover:text-zx-text">
                {t('common.cancelEdit')}
              </button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">{t('debts.form.nameLabel')}</span>
              <input value={form.debtName} onChange={(e) => updateField('debtName', e.target.value)} className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" required />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">{t('debts.form.totalLabel')}</span>
              <input type="number" min="0" step="any" value={form.totalAmount} onChange={(e) => updateField('totalAmount', e.target.value)} className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" required />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">{t('debts.form.remainingLabel')}</span>
              <input type="number" min="0" step="any" value={form.remainingAmount} onChange={(e) => updateField('remainingAmount', e.target.value)} className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">{t('debts.form.interestLabel')}</span>
              <input type="number" min="0" step="0.1" value={form.interestRate} onChange={(e) => updateField('interestRate', e.target.value)} className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">{t('debts.form.minPaymentLabel')}</span>
              <input type="number" min="0" step="any" value={form.minimumPayment} onChange={(e) => updateField('minimumPayment', e.target.value)} className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">{t('debts.form.dueDateLabel')}</span>
              <input type="date" value={form.dueDate} onChange={(e) => updateField('dueDate', e.target.value)} className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">{t('debts.form.typeLabel')}</span>
              <select value={form.debtType} onChange={(e) => updateField('debtType', e.target.value)} className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent">
                {debtTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-zx-text-soft">{t('debts.form.priorityLabel')}</span>
              <select value={form.priority} onChange={(e) => updateField('priority', e.target.value)} className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent">
                {debtPriorities.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
            <label className="space-y-2 md:col-span-2 xl:col-span-1">
              <span className="text-sm text-zx-text-soft">{t('common.note')}</span>
              <input value={form.note} onChange={(e) => updateField('note', e.target.value)} className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" />
            </label>
          </div>
          {error && <p className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
          <Button type="submit" disabled={saving} className="bg-zx-accent text-zx-on-accent hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? t('common.saving') : editingId ? t('debts.form.saveButton') : t('debts.form.addButton')}
          </Button>
        </form>

        <section className="overflow-hidden">
          <div className="border-b border-zx-line p-4">
            <h2 className="font-semibold">{t('debts.portfolio')}</h2>
          </div>
          {debts.length === 0 ? (
            <div className="p-6 text-center text-zx-text-soft">{loading ? t('debts.loading') : t('debts.empty')}</div>
          ) : (
            <>
              <div className="divide-y divide-zx-line md:hidden">
                {debts.map((debt) => (
                  <article key={debt.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="font-semibold">{debt.debtName}</h3>
                        <p className="text-sm text-zx-text-soft">{debt.note || debt.dueDate || t('common.noNote')}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs ${debt.priority === 'High' ? 'bg-red-950 text-red-300' : debt.priority === 'Medium' ? 'bg-yellow-950 text-yellow-300' : 'bg-green-950 text-zx-positive'}`}>
                        {debt.priority}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 rounded-lg border border-zx-line bg-zx-bg p-3 text-sm">
                      <div>
                        <p className="text-zx-text-soft">{t('debts.mobile.remaining')}</p>
                        <p className="mt-1 font-mono text-zx-text">{formatMoney(debt.remainingAmount, currency)}</p>
                      </div>
                      <div>
                        <p className="text-zx-text-soft">{t('debts.mobile.minPayment')}</p>
                        <p className="mt-1 font-mono text-zx-text">{formatMoney(debt.minimumPayment, currency)}</p>
                      </div>
                      <div>
                        <p className="text-zx-text-soft">{t('debts.mobile.interest')}</p>
                        <p className="mt-1 text-zx-text">{formatNumber(debt.interestRate, { maximumFractionDigits: 1 })}%</p>
                      </div>
                      <div>
                        <p className="text-zx-text-soft">{t('debts.mobile.type')}</p>
                        <p className="mt-1 text-zx-text">{debt.debtType}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button type="button" onClick={() => handleEdit(debt)} className="flex-1 bg-zx-bg px-3 py-2 text-zx-accent hover:bg-zx-surface-2">
                        <Pencil className="mr-2 h-4 w-4" /> {t('common.edit')}
                      </Button>
                      <Button type="button" onClick={() => handleDelete(debt.id)} className="flex-1 bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900">
                        <Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-zx-bg text-xs uppercase tracking-wide text-zx-text-soft">
                  <tr>
                    <th className="px-4 py-3">{t('debts.table.debt')}</th>
                    <th className="px-4 py-3 text-right">{t('debts.table.remaining')}</th>
                    <th className="px-4 py-3 text-right">{t('debts.table.interest')}</th>
                    <th className="px-4 py-3">{t('debts.table.type')}</th>
                    <th className="px-4 py-3">{t('debts.table.priority')}</th>
                    <th className="px-4 py-3 text-right">{t('debts.table.minPayment')}</th>
                    <th className="px-4 py-3 text-right">{t('common.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {debts.map((debt) => (
                    <tr key={debt.id} className="border-t border-zx-line">
                      <td className="px-4 py-3">
                        <p className="font-medium">{debt.debtName}</p>
                        <p className="text-xs text-zx-text-soft">{debt.note || debt.dueDate || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(debt.remainingAmount, currency)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(debt.interestRate, { maximumFractionDigits: 1 })}%</td>
                      <td className="px-4 py-3 text-zx-text-soft">{debt.debtType}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-1 text-xs ${debt.priority === 'High' ? 'bg-red-950 text-red-300' : debt.priority === 'Medium' ? 'bg-yellow-950 text-yellow-300' : 'bg-green-950 text-zx-positive'}`}>
                          {debt.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(debt.minimumPayment, currency)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button type="button" onClick={() => handleEdit(debt)} className="inline-flex items-center gap-2 bg-zx-bg px-3 py-2 text-zx-accent hover:bg-zx-surface-2">
                            <Pencil className="h-4 w-4" /> {t('common.edit')}
                          </Button>
                          <Button type="button" onClick={() => handleDelete(debt.id)} className="inline-flex items-center gap-2 bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900">
                            <Trash2 className="h-4 w-4" /> {t('common.delete')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>
      </main>
  );
}
