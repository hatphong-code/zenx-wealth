import { useEffect, useState } from 'react';
import { doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import { ClipboardCheck, Save } from 'lucide-react';
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
      <main className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-6">
        <section className="rounded-zx border border-zx-line bg-zx-hero p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-zx bg-zx-surface">
                <ClipboardCheck className="h-7 w-7 text-zx-positive" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Weekly Review</h1>
                <p className="text-sm text-zx-text-soft">Review this week, capture one lesson, and commit one next action.</p>
                <p className="text-xs uppercase tracking-wide text-zx-text-soft">
                  Week of {formatDate(weekMeta.weekStart)} to {formatDate(weekMeta.weekEnd)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              {loading && <p className="text-zx-text-soft">Loading weekly review...</p>}
              {refreshing && <p className="text-zx-accent">Refreshing weekly review...</p>}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zx-line bg-zx-surface p-4">
            <p className="text-sm text-zx-text-soft">Income this week</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(review.income, review.currency)}</p>
          </div>
          <div className="rounded-lg border border-zx-line bg-zx-surface p-4">
            <p className="text-sm text-zx-text-soft">Expense this week</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(review.expense, review.currency)}</p>
          </div>
          <div className="rounded-lg border border-zx-line bg-zx-surface p-4">
            <p className="text-sm text-zx-text-soft">Latte Factor</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(review.latteFactorTotal, review.currency)}</p>
            <p className="mt-1 text-xs text-zx-text-soft">
              {review.topLatteCategory ? `Top category: ${review.topLatteCategory}` : 'No Latte Factor recorded.'}
            </p>
          </div>
          <div className="rounded-lg border border-zx-line bg-zx-surface p-4">
            <p className="text-sm text-zx-text-soft">Savings rate</p>
            <p className="mt-2 text-2xl font-bold">{formatPercent(review.savingsRate)}</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-zx-line bg-zx-surface p-4">
            <p className="text-sm text-zx-text-soft">Emergency fund months</p>
            <p className="mt-2 text-2xl font-bold">{formatNumber(review.emergencyFundMonths, { maximumFractionDigits: 1 })} months</p>
          </div>
          <div className="rounded-lg border border-zx-line bg-zx-surface p-4">
            <p className="text-sm text-zx-text-soft">Wealth discipline score</p>
            <p className="mt-2 text-2xl font-bold">{review.wealthDisciplineScore}/100</p>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-zx-line bg-zx-surface p-5">
          <label className="block space-y-2">
            <span className="text-sm text-zx-text-soft">One lesson</span>
            <textarea
              value={form.oneLesson}
              onChange={(event) => updateField('oneLesson', event.target.value)}
              rows={4}
              placeholder="What did this week teach you about your money habits?"
              className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-zx-text-soft">One action next week</span>
            <textarea
              value={form.oneActionNextWeek}
              onChange={(event) => updateField('oneActionNextWeek', event.target.value)}
              rows={4}
              placeholder="What single action matters most next week?"
              className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
            />
          </label>

          {error && <p className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
          {message && <p className="rounded border border-green-900 bg-green-950/40 p-3 text-sm text-zx-positive">{message}</p>}

          <Button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 bg-zx-accent text-zx-on-accent hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Weekly Review'}
          </Button>
        </form>
      </main>
  );
}


