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
  const [form, setForm] = useState({ amount: '', date: today, note: '' });
  const [saving, setSaving] = useState(false);

  const activeRecords = useMemo(
    () => records.filter((record) => !record.currency || record.currency === settings.currency),
    [records, settings.currency]
  );

  const balance = activeRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const targetBalance = settings.monthlyEssentialExpense * settings.emergencyFundTargetMonths;
  const coveredMonths = settings.monthlyEssentialExpense > 0 ? balance / settings.monthlyEssentialExpense : 0;
  const progress = targetBalance > 0 ? Math.min(100, Math.round((balance / targetBalance) * 100)) : 0;

  const updateField = (field, value) => setForm((c) => ({ ...c, [field]: value }));
  const resetForm = () => { setEditingId(null); setForm({ amount: '', date: today, note: '' }); };

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
    if (!Number.isFinite(amount) || amount <= 0) { setError('Amount must be greater than 0.'); return; }
    setSaving(true); setError('');
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
        nextData = { ...data, records: records.map((r) => (r.id === editingId ? { ...r, ...nextRecord } : r)) };
      } else {
        const ref = await addDoc(collection(db, 'users', user.uid, 'emergencyFund'), { ...nextRecord, createdAt: serverTimestamp() });
        nextData = { ...data, records: [{ id: ref.id, amount, currency: settings.currency, date: Timestamp.fromDate(new Date(`${form.date}T00:00:00`)), note: form.note.trim() }, ...records] };
      }
      setData(nextData); setEmergencyFundCache(user.uid, nextData);
      invalidateDashboardStatsCache(user.uid); invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      const weekMeta = getCurrentWeekMeta();
      invalidateWeeklyReviewCache(user.uid, weekMeta.weekKey);
      invalidateWealthRoadmapCache(user.uid);
      resetForm();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (recordId) => {
    if (!user || !window.confirm('Delete this emergency fund entry?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'emergencyFund', recordId));
      const nextData = { ...data, records: records.filter((r) => r.id !== recordId) };
      setData(nextData); setEmergencyFundCache(user.uid, nextData);
      invalidateDashboardStatsCache(user.uid); invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      const weekMeta = getCurrentWeekMeta();
      invalidateWeeklyReviewCache(user.uid, weekMeta.weekKey);
      invalidateWealthRoadmapCache(user.uid);
    } catch (err) { setError(err.message); }
  };

  const inputCls = 'w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent';

  return (
      <main className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zx-icon-bg">
            <Shield className="h-7 w-7 text-zx-positive" />
          </div>
          <div className="space-y-1">
            <h1 className="font-zx-head text-2xl font-bold">Emergency Fund</h1>
            <p className="text-sm text-zx-text-soft">Track how many months of essential expenses are covered.</p>
            {loading && <p className="text-sm text-zx-text-soft">Loading emergency fund...</p>}
            {refreshing && <p className="text-sm text-zx-accent">Refreshing emergency fund...</p>}
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Current balance', value: formatMoney(balance, settings.currency) },
            { label: 'Covered months', value: `${formatNumber(coveredMonths, { maximumFractionDigits: 1 })} / ${settings.emergencyFundTargetMonths} months` },
            { label: 'Target balance', value: formatMoney(targetBalance, settings.currency) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-zx-sm border border-zx-line bg-zx-surface p-4 shadow-zx zx-transition">
              <p className="text-sm text-zx-text-soft">{stat.label}</p>
              <p className="font-zx-display mt-2 text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-zx-sm border border-zx-line bg-zx-surface p-5 shadow-zx zx-transition">
          <div className="mb-3 flex items-center justify-between text-sm text-zx-text-soft">
            <span>Progress</span><span>{progress}%</span>
          </div>
          <div className="h-3 rounded-full bg-zx-surface-2">
            <div className="progress-fill h-3 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-zx-sm border border-zx-line bg-zx-surface p-5 shadow-zx zx-transition">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit fund record' : 'Add fund record'}</h2>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm text-zx-text-soft transition hover:text-zx-text">Cancel edit</button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <label className="block space-y-2">
              <span className="text-sm text-zx-text-soft">Amount</span>
              <input type="number" min="1" step="any" value={form.amount}
                onChange={(e) => updateField('amount', e.target.value)} className={inputCls} required />
              <span className="text-xs text-zx-text-soft">
                {form.amount ? `~ ${formatMoney(form.amount, settings.currency)}` : 'Enter the amount without separators.'}
              </span>
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-zx-text-soft">Date</span>
              <input type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} className={inputCls} required />
            </label>
          </div>
          <label className="block space-y-2">
            <span className="text-sm text-zx-text-soft">Note</span>
            <input type="text" value={form.note} onChange={(e) => updateField('note', e.target.value)}
              placeholder="Salary transfer, bonus, cash reserve..." className={inputCls} />
          </label>
          {error && <p className="rounded-zx-sm border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
          <Button type="submit" disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 bg-zx-accent text-zx-on-accent hover:opacity-90 disabled:cursor-not-allowed md:w-auto">
            <Plus className="h-4 w-4" />
            {saving ? 'Saving...' : editingId ? 'Save Record' : 'Add Record'}
          </Button>
        </form>

        <section className="overflow-hidden rounded-zx-sm border border-zx-line bg-zx-surface shadow-zx zx-transition">
          <div className="border-b border-zx-line p-4">
            <h2 className="font-semibold">Fund history</h2>
          </div>
          {activeRecords.length === 0 ? (
            <div className="p-6 text-center text-zx-text-soft">
              {loading ? 'Loading emergency fund...' : 'No emergency fund entries yet.'}
            </div>
          ) : (
            <>
              <div className="divide-y divide-zx-line md:hidden">
                {activeRecords.map((record) => (
                  <article key={record.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-zx-text-soft">{formatDate(record.date)}</p>
                        <p className="mt-1 text-sm text-zx-text-soft">{record.note || 'No note'}</p>
                      </div>
                      <p className="font-mono text-base font-semibold">
                        {formatMoney(record.amount, record.currency || settings.currency)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" onClick={() => handleEdit(record)}
                        className="flex-1 bg-zx-surface-2 px-3 py-2 text-zx-accent hover:opacity-80">
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      <Button type="button" onClick={() => handleDelete(record.id)}
                        className="flex-1 bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead className="bg-zx-surface-2 text-xs uppercase tracking-wide text-zx-text-soft">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Note</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRecords.map((record) => (
                      <tr key={record.id} className="border-t border-zx-line">
                        <td className="px-4 py-3 text-zx-text-soft">{formatDate(record.date)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatMoney(record.amount, record.currency || settings.currency)}</td>
                        <td className="max-w-[360px] truncate px-4 py-3 text-zx-text-soft">{record.note || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button type="button" onClick={() => handleEdit(record)}
                              className="inline-flex items-center gap-2 bg-zx-surface-2 px-3 py-2 text-zx-accent hover:opacity-80">
                              <Pencil className="h-4 w-4" /> Edit
                            </Button>
                            <Button type="button" onClick={() => handleDelete(record.id)}
                              className="inline-flex items-center gap-2 bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900">
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
  );
}
