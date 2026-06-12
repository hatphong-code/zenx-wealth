import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addDoc, collection, doc, getDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import AppNav from '../components/AppNav';
import { Button } from '../components/ui/button';
import { db } from '../services/firebaseDb';
import { formatMoney } from '../utils/formatters';
import { invalidateDashboardStatsCache } from '../services/dashboardService';
import { invalidateLatteFactorCache } from '../services/latteFactorService';
import { invalidatePayYourselfFirstCache } from '../services/payYourselfFirstService';
import { invalidateReportsCache } from '../services/reportsService';
import { invalidateTransactionsCache } from '../services/transactionService';
import { getUserProfile } from '../services/userService';
import { getCurrentWeekMeta, invalidateWeeklyReviewCache } from '../services/weeklyReviewService';
import { invalidateWealthRoadmapCache } from '../services/wealthRoadmapService';
import { invalidateAICoachCache } from '../services/aiCoachService';

const today = new Date().toISOString().slice(0, 10);

export default function AddTransaction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { transactionId } = useParams();
  const isEditing = Boolean(transactionId);
  const [form, setForm] = useState({
    amount: '',
    type: 'expense',
    category: '',
    date: today,
    isLatteFactor: false,
    isRecurring: false,
    note: '',
  });
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState('VND');
  const [categorySuggestions, setCategorySuggestions] = useState({
    income: [],
    expense: [],
  });

  useEffect(() => {
    if (!user) return;

    const loadForm = async () => {
      setLoading(isEditing);
      setError('');

      try {
        const profile = await getUserProfile(user.uid);
        const profileCurrency = profile.settings?.currency || 'VND';
        setCurrency(profileCurrency);
        setCategorySuggestions(profile.settings?.customCategories || { income: [], expense: [] });

        if (!isEditing) return;

        const transactionSnapshot = await getDoc(doc(db, 'users', user.uid, 'transactions', transactionId));
        if (!transactionSnapshot.exists()) {
          setError('Transaction not found.');
          return;
        }

        const data = transactionSnapshot.data();
        setCurrency(data.currency || profileCurrency);
        setForm({
          amount: String(data.amount || ''),
          type: data.type || 'expense',
          category: data.category || '',
          date: data.date?.toDate ? data.date.toDate().toISOString().slice(0, 10) : today,
          isLatteFactor: Boolean(data.isLatteFactor),
          isRecurring: Boolean(data.isRecurring),
          note: data.note || '',
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [isEditing, transactionId, user]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
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
      const payload = {
        amount,
        currency,
        type: form.type,
        category: form.category.trim(),
        date: Timestamp.fromDate(new Date(`${form.date}T00:00:00`)),
        isLatteFactor: form.type === 'expense' ? form.isLatteFactor : false,
        isRecurring: form.isRecurring,
        note: form.note.trim(),
        updatedAt: serverTimestamp(),
      };

      if (isEditing) {
        await updateDoc(doc(db, 'users', user.uid, 'transactions', transactionId), payload);
      } else {
        await addDoc(collection(db, 'users', user.uid, 'transactions'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      invalidateTransactionsCache(user.uid);
      invalidateDashboardStatsCache(user.uid);
      invalidateLatteFactorCache(user.uid);
      invalidatePayYourselfFirstCache(user.uid);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      const weekMeta = getCurrentWeekMeta();
      invalidateWeeklyReviewCache(user.uid, weekMeta.weekKey);
      invalidateWealthRoadmapCache(user.uid);

      navigate('/transactions');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zx-bg text-zx-text">
        <AppNav />
        <div className="p-10 text-center">Loading transaction...</div>
      </div>
    );
  }

  const activeSuggestions = categorySuggestions[form.type] || [];

  return (
    <div className="min-h-screen bg-zx-bg text-zx-text">
      <AppNav />
      <main className="mx-auto max-w-2xl p-4 pb-24 md:p-6">
        <h1 className="mb-6 text-2xl font-bold">{isEditing ? 'Edit Transaction' : 'Add Transaction'}</h1>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-zx-line bg-zx-surface p-5">
          <label className="block space-y-2">
            <span className="text-sm text-zx-text-soft">Amount</span>
            <input
              type="number"
              min="1"
              step="any"
              value={form.amount}
              onChange={(event) => updateField('amount', event.target.value)}
              className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
              required
            />
            <span className="text-xs text-zx-text-soft">
              {form.amount ? `~ ${formatMoney(form.amount, currency)}` : 'Enter the amount without separators.'}
            </span>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm text-zx-text-soft">Type</span>
              <select
                value={form.type}
                onChange={(event) => updateField('type', event.target.value)}
                className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-zx-text-soft">Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => updateField('date', event.target.value)}
                className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
                required
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm text-zx-text-soft">Category</span>
            <input
              type="text"
              list={`transaction-categories-${form.type}`}
              value={form.category}
              onChange={(event) => updateField('category', event.target.value)}
              placeholder="Eating out, salary, transport..."
              className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
              required
            />
            <datalist id={`transaction-categories-${form.type}`}>
              {activeSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <div className="flex flex-wrap gap-2">
              {activeSuggestions.slice(0, 8).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => updateField('category', item)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    form.category === item
                      ? 'border-zx-accent bg-zx-accent-soft text-zx-accent'
                      : 'border-zx-line bg-zx-bg text-zx-text-soft hover:border-zx-line hover:text-zx-text'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded border border-zx-line bg-zx-bg p-3 text-sm text-zx-text-soft">
              <input
                type="checkbox"
                checked={form.isLatteFactor}
                disabled={form.type !== 'expense'}
                onChange={(event) => updateField('isLatteFactor', event.target.checked)}
                className="h-4 w-4"
              />
              Latte Factor
            </label>
            <label className="flex items-center gap-3 rounded border border-zx-line bg-zx-bg p-3 text-sm text-zx-text-soft">
              <input
                type="checkbox"
                checked={form.isRecurring}
                onChange={(event) => updateField('isRecurring', event.target.checked)}
                className="h-4 w-4"
              />
              Recurring
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm text-zx-text-soft">Note</span>
            <textarea
              value={form.note}
              onChange={(event) => updateField('note', event.target.value)}
              rows={3}
              className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-zx-accent text-zx-on-accent hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Transaction'}
            </Button>
            <Button
              type="button"
              onClick={() => navigate('/transactions')}
              className="w-full border border-zx-line bg-transparent text-zx-text hover:bg-zx-surface-2"
            >
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}


