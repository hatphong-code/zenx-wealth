import { useEffect, useState } from 'react';
import { doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import { ClipboardCheck, Save } from 'lucide-react';
import AppNav from '../components/AppNav';
import { Button } from '../components/ui/button';
import { db } from '../services/firebaseDb';
import { invalidateReportsCache } from '../services/reportsService';
import { formatDate, formatMoney, formatNumber, formatPercent } from '../utils/formatters';
import { setWeeklyReviewCache } from '../services/weeklyReviewService';
import { useWeeklyReviewData } from '../hooks/useWeeklyReviewData';
import { invalidateAICoachCache } from '../services/aiCoachService';

export default function WeeklyReview() {
  const { user } = useAuth();
  const { data, setData, loading, refreshing, error, setError } = useWeeklyReviewData(user?.uid);
  const { weekMeta, review } = data;
  const [form, setForm] = useState(data.form);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) {
      setForm(data.form);
    }
  }, [data.form, dirty]);

  const updateField = (field, value) => {
    setDirty(true);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await setDoc(doc(db, 'users', user.uid, 'weeklyReviews', weekMeta.weekKey), {
        weekStart: Timestamp.fromDate(weekMeta.weekStart),
        weekEnd: Timestamp.fromDate(weekMeta.weekEnd),
        currency: review.currency,
        income: review.income,
        expense: review.expense,
        latteFactorTotal: review.latteFactorTotal,
        savingsRate: review.savingsRate,
        emergencyFundMonths: review.emergencyFundMonths,
        wealthDisciplineScore: review.wealthDisciplineScore,
        topLatteCategory: review.topLatteCategory,
        oneLesson: form.oneLesson.trim(),
        oneActionNextWeek: form.oneActionNextWeek.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      const nextData = {
        ...data,
        form: {
          oneLesson: form.oneLesson.trim(),
          oneActionNextWeek: form.oneActionNextWeek.trim(),
        },
      };
      setData(nextData);
      setWeeklyReviewCache(user.uid, weekMeta.weekKey, nextData);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      setDirty(false);
      setMessage('Weekly review saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      <AppNav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-6">
        <section className="rounded-2xl border border-[#1F2937] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_40%),linear-gradient(180deg,#111827_0%,#0B1020_100%)] p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111827]">
                <ClipboardCheck className="h-7 w-7 text-green-400" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Weekly Review</h1>
                <p className="text-sm text-gray-300">Review this week, capture one lesson, and commit one next action.</p>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Week of {formatDate(weekMeta.weekStart)} to {formatDate(weekMeta.weekEnd)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              {loading && <p className="text-gray-400">Loading weekly review...</p>}
              {refreshing && <p className="text-blue-300">Refreshing weekly review...</p>}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-4">
            <p className="text-sm text-gray-400">Income this week</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(review.income, review.currency)}</p>
          </div>
          <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-4">
            <p className="text-sm text-gray-400">Expense this week</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(review.expense, review.currency)}</p>
          </div>
          <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-4">
            <p className="text-sm text-gray-400">Latte Factor</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(review.latteFactorTotal, review.currency)}</p>
            <p className="mt-1 text-xs text-gray-500">
              {review.topLatteCategory ? `Top category: ${review.topLatteCategory}` : 'No Latte Factor recorded.'}
            </p>
          </div>
          <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-4">
            <p className="text-sm text-gray-400">Savings rate</p>
            <p className="mt-2 text-2xl font-bold">{formatPercent(review.savingsRate)}</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-4">
            <p className="text-sm text-gray-400">Emergency fund months</p>
            <p className="mt-2 text-2xl font-bold">{formatNumber(review.emergencyFundMonths, { maximumFractionDigits: 1 })} months</p>
          </div>
          <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-4">
            <p className="text-sm text-gray-400">Wealth discipline score</p>
            <p className="mt-2 text-2xl font-bold">{review.wealthDisciplineScore}/100</p>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-[#1F2937] bg-[#111827] p-5">
          <label className="block space-y-2">
            <span className="text-sm text-gray-300">One lesson</span>
            <textarea
              value={form.oneLesson}
              onChange={(event) => updateField('oneLesson', event.target.value)}
              rows={4}
              placeholder="What did this week teach you about your money habits?"
              className="w-full rounded border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-gray-300">One action next week</span>
            <textarea
              value={form.oneActionNextWeek}
              onChange={(event) => updateField('oneActionNextWeek', event.target.value)}
              rows={4}
              placeholder="What single action matters most next week?"
              className="w-full rounded border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          {error && <p className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
          {message && <p className="rounded border border-green-900 bg-green-950/40 p-3 text-sm text-green-300">{message}</p>}

          <Button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Weekly Review'}
          </Button>
        </form>
      </main>
    </div>
  );
}


