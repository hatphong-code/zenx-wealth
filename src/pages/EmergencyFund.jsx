import { useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import { Pencil, Plus, Shield, Trash2 } from 'lucide-react';
import AppNav from '../components/AppNav';
import { Button } from '../components/ui/button';
import { db } from '../services/firebaseDb';
import { formatDate, formatMoney, formatNumber } from '../utils/formatters';
import { invalidateDashboardStatsCache } from '../services/dashboardService';
import { setEmergencyFundCache } from '../services/emergencyFundService';
import { invalidateReportsCache } from '../services/reportsService';
import { useEmergencyFundData } from '../hooks/useEmergencyFundData';
import { getCurrentWeekMeta, invalidateWeeklyReviewCache } from '../services/weeklyReviewService';
import { invalidateWealthRoadmapCache } from '../services/wealthRoadmapService';
import { invalidateAICoachCache } from '../services/aiCoachService';

const today = new Date().toISOString().slice(0, 10);

export default function EmergencyFund() {
  const { user } = useAuth();
  const { data, setData, loading, refreshing, error, setError } = useEmergencyFundData(user?.uid);
  const { records, settings } = data;
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    amount: '',
    date: today,
    note: '',
  });
  const [saving, setSaving] = useState(false);

  const activeRecords = useMemo(
    () => records.filter((record) => !record.currency || record.currency === settings.currency),
    [records, settings.currency]
  );

  const balance = activeRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const targetBalance = settings.monthlyEssentialExpense * settings.emergencyFundTargetMonths;
  const coveredMonths = settings.monthlyEssentialExpense > 0 ? balance / settings.monthlyEssentialExpense : 0;
  const progress = targetBalance > 0 ? Math.min(100, Math.round((balance / targetBalance) * 100)) : 0;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ amount: '', date: today, note: '' });
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    setError('');
    setForm({
      amount: String(record.amount || ''),
      date: record.date?.toDate ? record.date.toDate().toISOString().slice(0, 10) : today,
      note: record.note || '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const nextRecord = {
        amount,
        currency: settings.currency,
        date: Timestamp.fromDate(new Date(`${form.date}T00:00:00`)),
        note: form.note.trim(),
        updatedAt: serverTimestamp(),
      };

      let nextData;
      if (editingId) {
        await updateDoc(doc(db, 'users', user.uid, 'emergencyFund', editingId), nextRecord);
        nextData = {
          ...data,
          records: records.map((record) => (record.id === editingId ? { ...record, ...nextRecord } : record)),
        };
      } else {
        const recordRef = await addDoc(collection(db, 'users', user.uid, 'emergencyFund'), {
          ...nextRecord,
          createdAt: serverTimestamp(),
        });
        nextData = {
          ...data,
          records: [
            {
              id: recordRef.id,
              amount,
              currency: settings.currency,
              date: Timestamp.fromDate(new Date(`${form.date}T00:00:00`)),
              note: form.note.trim(),
            },
            ...records,
          ],
        };
      }

      setData(nextData);
      setEmergencyFundCache(user.uid, nextData);
      invalidateDashboardStatsCache(user.uid);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      const weekMeta = getCurrentWeekMeta();
      invalidateWeeklyReviewCache(user.uid, weekMeta.weekKey);
      invalidateWealthRoadmapCache(user.uid);
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (recordId) => {
    if (!user) return;
    const shouldDelete = window.confirm('Delete this emergency fund entry?');
    if (!shouldDelete) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'emergencyFund', recordId));
      const nextData = {
        ...data,
        records: records.filter((record) => record.id !== recordId),
      };
      setData(nextData);
      setEmergencyFundCache(user.uid, nextData);
      invalidateDashboardStatsCache(user.uid);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      const weekMeta = getCurrentWeekMeta();
      invalidateWeeklyReviewCache(user.uid, weekMeta.weekKey);
      invalidateWealthRoadmapCache(user.uid);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      <AppNav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#111827]">
            <Shield className="h-7 w-7 text-blue-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Emergency Fund</h1>
            <p className="text-sm text-gray-400">Track how many months of essential expenses are covered.</p>
            {loading && <p className="text-sm text-gray-400">Loading emergency fund...</p>}
            {refreshing && <p className="text-sm text-blue-300">Refreshing emergency fund...</p>}
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-4">
            <p className="text-sm text-gray-400">Current balance</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(balance, settings.currency)}</p>
          </div>
          <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-4">
            <p className="text-sm text-gray-400">Covered months</p>
            <p className="mt-2 text-2xl font-bold">
              {formatNumber(coveredMonths, { maximumFractionDigits: 1 })} / {settings.emergencyFundTargetMonths} months
            </p>
          </div>
          <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-4">
            <p className="text-sm text-gray-400">Target balance</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(targetBalance, settings.currency)}</p>
          </div>
        </section>

        <section className="rounded-lg border border-[#1F2937] bg-[#111827] p-5">
          <div className="mb-3 flex items-center justify-between text-sm text-gray-300">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 rounded-full bg-gray-700">
            <div className="h-3 rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-[#1F2937] bg-[#111827] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit fund record' : 'Add fund record'}</h2>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm text-gray-400 transition hover:text-white">
                Cancel edit
              </button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <label className="block space-y-2">
              <span className="text-sm text-gray-300">Amount</span>
              <input
                type="number"
                min="1"
                step="any"
                value={form.amount}
                onChange={(event) => updateField('amount', event.target.value)}
                className="w-full rounded border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <span className="text-xs text-gray-500">
                {form.amount ? `~ ${formatMoney(form.amount, settings.currency)}` : 'Enter the amount without separators.'}
              </span>
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-gray-300">Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => updateField('date', event.target.value)}
                className="w-full rounded border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm text-gray-300">Note</span>
            <input
              type="text"
              value={form.note}
              onChange={(event) => updateField('note', event.target.value)}
              placeholder="Salary transfer, bonus, cash reserve..."
              className="w-full rounded border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          {error && <p className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}

          <Button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          >
            <Plus className="h-4 w-4" />
            {saving ? 'Saving...' : editingId ? 'Save Record' : 'Add Record'}
          </Button>
        </form>

        <section className="overflow-hidden rounded-lg border border-[#1F2937] bg-[#111827]">
          <div className="border-b border-[#1F2937] p-4">
            <h2 className="font-semibold">Fund history</h2>
          </div>
          {activeRecords.length === 0 ? (
            <div className="p-6 text-center text-gray-300">
              {loading ? 'Loading emergency fund...' : 'No emergency fund entries yet.'}
            </div>
          ) : (
            <>
              <div className="divide-y divide-[#1F2937] md:hidden">
                {activeRecords.map((record) => (
                  <article key={record.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-400">{formatDate(record.date)}</p>
                        <p className="mt-1 text-sm text-gray-300">{record.note || 'No note'}</p>
                      </div>
                      <p className="font-mono text-base font-semibold">
                        {formatMoney(record.amount, record.currency || settings.currency)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => handleEdit(record)}
                        className="flex-1 bg-[#0B1020] px-3 py-2 text-blue-300 hover:bg-[#1F2937]"
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleDelete(record.id)}
                        className="flex-1 bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="bg-[#0B1020] text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Note</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRecords.map((record) => (
                    <tr key={record.id} className="border-t border-[#1F2937]">
                      <td className="px-4 py-3 text-gray-300">{formatDate(record.date)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(record.amount, record.currency || settings.currency)}</td>
                      <td className="max-w-[360px] truncate px-4 py-3 text-gray-400">{record.note || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            onClick={() => handleEdit(record)}
                            className="inline-flex items-center gap-2 bg-[#0B1020] px-3 py-2 text-blue-300 hover:bg-[#1F2937]"
                          >
                            <Pencil className="h-4 w-4" /> Edit
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleDelete(record.id)}
                            className="inline-flex items-center gap-2 bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900"
                          >
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


