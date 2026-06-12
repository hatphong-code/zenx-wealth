import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import AppNav from '../components/AppNav';
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

const today = new Date().toISOString().slice(0, 10);
const initialForm = {
  debtName: '',
  totalAmount: '',
  remainingAmount: '',
  interestRate: '',
  minimumPayment: '',
  dueDate: today,
  debtType: debtTypes[0],
  priority: debtPriorities[0],
  note: '',
};

export default function DebtControl() {
  const { user } = useAuth();
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
      debtType: debt.debtType || debtTypes[0],
      priority: debt.priority || debtPriorities[0],
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
      setError('Debt name, total amount, and remaining amount must be valid.');
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
    if (!window.confirm('Delete this debt record?')) return;

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
    <div className="min-h-screen bg-[#0B1020] text-white">
      <AppNav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Debt Control</h1>
          <p className="text-sm text-gray-400">Track debt pressure and prioritize payoff intelligently.</p>
          {loading && <p className="text-sm text-gray-400">Loading debts...</p>}
          {refreshing && <p className="text-sm text-blue-300">Refreshing debt overview...</p>}
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-4">
            <p className="text-sm text-gray-400">Total debt</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(summary.totalDebt, currency)}</p>
          </div>
          <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-4">
            <p className="text-sm text-gray-400">Bad debt</p>
            <p className="mt-2 text-2xl font-bold text-red-300">{formatMoney(summary.badDebt, currency)}</p>
          </div>
          <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-4">
            <p className="text-sm text-gray-400">Monthly payment</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(summary.monthlyPayment, currency)}</p>
          </div>
          <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-4">
            <p className="text-sm text-gray-400">Payoff progress</p>
            <p className="mt-2 text-2xl font-bold">{formatNumber(summary.payoffProgress)}%</p>
          </div>
        </section>

        {summary.highestPriorityDebt && (
          <section className="rounded-lg border border-[#3F2A2A] bg-[#1A1313] p-4">
            <p className="text-sm text-red-300">Suggested action</p>
            <p className="mt-2 text-sm text-gray-200">
              Focus extra payment on <span className="font-semibold">{summary.highestPriorityDebt.debtName}</span> at{' '}
              {formatNumber(summary.highestPriorityDebt.interestRate, { maximumFractionDigits: 1 })}% interest.
            </p>
          </section>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-[#1F2937] bg-[#111827] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit debt' : 'Add debt'}</h2>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm text-gray-400 transition hover:text-white">
                Cancel edit
              </button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm text-gray-300">Debt name</span>
              <input value={form.debtName} onChange={(e) => updateField('debtName', e.target.value)} className="w-full rounded border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500" required />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-gray-300">Total amount</span>
              <input type="number" min="0" step="any" value={form.totalAmount} onChange={(e) => updateField('totalAmount', e.target.value)} className="w-full rounded border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500" required />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-gray-300">Remaining amount</span>
              <input type="number" min="0" step="any" value={form.remainingAmount} onChange={(e) => updateField('remainingAmount', e.target.value)} className="w-full rounded border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-gray-300">Interest rate (%)</span>
              <input type="number" min="0" step="0.1" value={form.interestRate} onChange={(e) => updateField('interestRate', e.target.value)} className="w-full rounded border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-gray-300">Minimum payment</span>
              <input type="number" min="0" step="any" value={form.minimumPayment} onChange={(e) => updateField('minimumPayment', e.target.value)} className="w-full rounded border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-gray-300">Due date</span>
              <input type="date" value={form.dueDate} onChange={(e) => updateField('dueDate', e.target.value)} className="w-full rounded border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-gray-300">Debt type</span>
              <select value={form.debtType} onChange={(e) => updateField('debtType', e.target.value)} className="w-full rounded border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500">
                {debtTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-gray-300">Priority</span>
              <select value={form.priority} onChange={(e) => updateField('priority', e.target.value)} className="w-full rounded border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500">
                {debtPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </label>
            <label className="space-y-2 md:col-span-2 xl:col-span-1">
              <span className="text-sm text-gray-300">Note</span>
              <input value={form.note} onChange={(e) => updateField('note', e.target.value)} className="w-full rounded border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
          </div>
          {error && <p className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
          <Button type="submit" disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'Saving...' : editingId ? 'Save Debt' : 'Add Debt'}
          </Button>
        </form>

        <section className="overflow-hidden rounded-lg border border-[#1F2937] bg-[#111827]">
          <div className="border-b border-[#1F2937] p-4">
            <h2 className="font-semibold">Debt portfolio</h2>
          </div>
          {debts.length === 0 ? (
            <div className="p-6 text-center text-gray-300">{loading ? 'Loading debts...' : 'No debt records yet.'}</div>
          ) : (
            <>
              <div className="divide-y divide-[#1F2937] md:hidden">
                {debts.map((debt) => (
                  <article key={debt.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="font-semibold">{debt.debtName}</h3>
                        <p className="text-sm text-gray-400">{debt.note || debt.dueDate || 'No note'}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs ${debt.priority === 'High' ? 'bg-red-950 text-red-300' : debt.priority === 'Medium' ? 'bg-yellow-950 text-yellow-300' : 'bg-green-950 text-green-300'}`}>
                        {debt.priority}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 rounded-lg border border-[#1F2937] bg-[#0B1020] p-3 text-sm">
                      <div>
                        <p className="text-gray-500">Remaining</p>
                        <p className="mt-1 font-mono text-white">{formatMoney(debt.remainingAmount, currency)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Min payment</p>
                        <p className="mt-1 font-mono text-white">{formatMoney(debt.minimumPayment, currency)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Interest</p>
                        <p className="mt-1 text-white">{formatNumber(debt.interestRate, { maximumFractionDigits: 1 })}%</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Type</p>
                        <p className="mt-1 text-white">{debt.debtType}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button type="button" onClick={() => handleEdit(debt)} className="flex-1 bg-[#0B1020] px-3 py-2 text-blue-300 hover:bg-[#1F2937]">
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      <Button type="button" onClick={() => handleDelete(debt.id)} className="flex-1 bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-[#0B1020] text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Debt</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                    <th className="px-4 py-3 text-right">Interest</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3 text-right">Min payment</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {debts.map((debt) => (
                    <tr key={debt.id} className="border-t border-[#1F2937]">
                      <td className="px-4 py-3">
                        <p className="font-medium">{debt.debtName}</p>
                        <p className="text-xs text-gray-500">{debt.note || debt.dueDate || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(debt.remainingAmount, currency)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(debt.interestRate, { maximumFractionDigits: 1 })}%</td>
                      <td className="px-4 py-3 text-gray-300">{debt.debtType}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-1 text-xs ${debt.priority === 'High' ? 'bg-red-950 text-red-300' : debt.priority === 'Medium' ? 'bg-yellow-950 text-yellow-300' : 'bg-green-950 text-green-300'}`}>
                          {debt.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(debt.minimumPayment, currency)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button type="button" onClick={() => handleEdit(debt)} className="inline-flex items-center gap-2 bg-[#0B1020] px-3 py-2 text-blue-300 hover:bg-[#1F2937]">
                            <Pencil className="h-4 w-4" /> Edit
                          </Button>
                          <Button type="button" onClick={() => handleDelete(debt.id)} className="inline-flex items-center gap-2 bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900">
                            <Trash2 className="h-4 w-4" /> Delete
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
    </div>
  );
}


