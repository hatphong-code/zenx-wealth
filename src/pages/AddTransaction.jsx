import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addDoc, collection, doc, getDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import { db } from '../services/firebaseDb';
import { formatMoney, formatDate } from '../utils/formatters';
import { useI18n } from '../i18n/useI18n';
import { useToast } from '../components/ui/Toast';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';
import { useNumberFormat } from '../hooks/useNumberFormat';
import { invalidateDashboardStatsCache } from '../services/dashboardService';
import { invalidateLatteFactorCache } from '../services/latteFactorService';
import { invalidatePayYourselfFirstCache } from '../services/payYourselfFirstService';
import { invalidateReportsCache } from '../services/reportsService';
import { getTransactions, invalidateTransactionsCache } from '../services/transactionService';
import { getUserProfile } from '../services/userService';
import { getCurrentWeekMeta, invalidateWeeklyReviewCache } from '../services/weeklyReviewService';
import { invalidateWealthRoadmapCache } from '../services/wealthRoadmapService';
import { invalidateAICoachCache } from '../services/aiCoachService';

const today = new Date().toISOString().slice(0, 10);

// Categories that auto-trigger Latte Factor suggestion
const LATTE_KEYWORDS = [
  'cà phê', 'coffee', 'trà sữa', 'bubble tea', 'cafe',
  'ăn ngoài', 'eat out', 'eating out', 'fast food', 'grab food', 'shopee food', 'baemin', 'giao đồ ăn',
  'subscription', 'netflix', 'spotify', 'youtube', 'apple', 'game',
  'mua sắm', 'shopping', 'tiện tay', 'impulse',
  'snack', 'đồ ăn vặt', 'trà', 'nước ngọt',
];

function isLikelyLatte(category) {
  const lower = category.toLowerCase();
  return LATTE_KEYWORDS.some(k => lower.includes(k));
}

function HL() { return <div className="h-px bg-zx-line" />; }

const emptyForm = {
  amount: '',
  type: 'expense',
  category: '',
  date: today,
  isLatteFactor: false,
  isRecurring: false,
  note: '',
};

export default function AddTransaction() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { fmt } = useNumberFormat();
  const navigate = useNavigate();
  const { transactionId } = useParams();
  const isEditing = Boolean(transactionId);
  const amountRef = useRef(null);

  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState('VND');
  const [customCategories, setCustomCategories] = useState({ income: [], expense: [] });
  const [todayTxs, setTodayTxs] = useState([]);

  useEffect(() => {
    if (!user) return;
    const loadForm = async () => {
      setLoading(isEditing);
      setError('');
      try {
        const profile = await getUserProfile(user.uid);
        const cur = profile.settings?.currency || 'VND';
        setCurrency(cur);
        setCustomCategories(profile.settings?.customCategoriesRaw || { income: [], expense: [] });

        if (!isEditing) {
          // Load today's transactions for the right panel
          const txData = await getTransactions(user.uid);
          const filtered = (txData.transactions || []).filter(tx => {
            const d = tx.date?.toDate ? tx.date.toDate().toISOString().slice(0, 10) : '';
            return d === today;
          });
          setTodayTxs(filtered);
          return;
        }

        const snap = await getDoc(doc(db, 'users', user.uid, 'transactions', transactionId));
        if (!snap.exists()) { setError(t('addTransaction.errors.notFound')); return; }
        const data = snap.data();
        setCurrency(data.currency || cur);
        setForm({
          amount: String(data.amount || ''),
          type: data.type || 'expense',
          category: data.category || '',
          date: data.date?.toDate ? data.date.toDate().toISOString().slice(0, 10) : today,
          isLatteFactor: Boolean(data.isLatteFactor),
          isRecurring: Boolean(data.isRecurring),
          note: data.note || '',
        });
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    };
    loadForm();
  }, [isEditing, transactionId, user]);

  const updateField = (field, value) => {
    setForm(c => {
      const next = { ...c, [field]: value };
      if (field === 'category' && next.type === 'expense' && !isEditing) {
        next.isLatteFactor = isLikelyLatte(value);
      }
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) { setError(t('addTransaction.errors.amountRequired')); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        amount, currency,
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
        invalidateTransactionsCache(user.uid);
        invalidateDashboardStatsCache(user.uid);
        invalidateLatteFactorCache(user.uid);
        invalidatePayYourselfFirstCache(user.uid);
        invalidateReportsCache(user.uid);
        invalidateAICoachCache(user.uid);
        invalidateWeeklyReviewCache(user.uid, getCurrentWeekMeta().weekKey);
        invalidateWealthRoadmapCache(user.uid);
        toast({ title: t('toast.txUpdated'), variant: 'success' });
        navigate('/transactions');
        return;
      }

      // Check if this is the first transaction for celebration
      const allTxs = await getTransactions(user.uid);
      const isFirstTransaction = (allTxs.transactions || []).length === 0;

      const docRef = await addDoc(collection(db, 'users', user.uid, 'transactions'), { ...payload, createdAt: serverTimestamp() });
      invalidateTransactionsCache(user.uid);
      invalidateDashboardStatsCache(user.uid);
      invalidateLatteFactorCache(user.uid);
      invalidatePayYourselfFirstCache(user.uid);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      invalidateWeeklyReviewCache(user.uid, getCurrentWeekMeta().weekKey);
      invalidateWealthRoadmapCache(user.uid);

      // Append to panel immediately (no extra fetch needed)
      if (form.date === today) {
        setTodayTxs(prev => [{ id: docRef.id, ...payload, date: { toDate: () => new Date(`${form.date}T00:00:00`) } }, ...prev]);
      }

      // First win celebration
      if (isFirstTransaction) {
        try { localStorage.setItem('zx-first-tx-done', 'true'); } catch {}
        try { await updateDoc(doc(db, 'users', user.uid), { hasFirstTransaction: true, updatedAt: serverTimestamp() }); } catch {}
        toast({ title: t('toast.firstTransaction'), description: t('toast.firstTransactionDesc'), variant: 'success' });
      } else {
        toast({ title: t('toast.txAdded'), variant: 'success' });
      }

      // Clear form, keep type + date for quick re-entry
      setForm(prev => ({ ...emptyForm, type: prev.type, date: prev.date }));
      amountRef.current?.focus();

    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-8 space-y-6">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );

  const defaultExpenseCategories = t('addTransaction.expenseCategories');
  const defaultIncomeCategories = t('addTransaction.incomeCategories');
  const allCategories = form.type === 'expense'
    ? [...new Set([...customCategories.expense, ...defaultExpenseCategories])]
    : [...new Set([...customCategories.income, ...defaultIncomeCategories])];
  const chipCategories = form.type === 'expense' ? defaultExpenseCategories : defaultIncomeCategories;


  const panelTxs = todayTxs;
  const panelIncome = panelTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0);
  const panelExpense = panelTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-8">
      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-x-12 lg:items-start">

        {/* ── LEFT: Form ── */}
        <div className="max-w-2xl">
          <div className="mb-6">
            <h1 className="font-zx-head text-xl font-bold text-zx-text">
              {isEditing ? t('addTransaction.editTitle') : t('addTransaction.addTitle')}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Type toggle */}
            <div className="flex gap-2">
              {[
                { value: 'expense', label: t('addTransaction.expenseType') },
                { value: 'income', label: t('addTransaction.incomeType') },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => updateField('type', opt.value)}
                  className={`flex-1 py-2.5 rounded-zx-sm text-sm font-semibold transition ${
                    form.type === opt.value
                      ? opt.value === 'expense' ? 'bg-zx-accent text-zx-on-accent' : 'bg-zx-positive text-zx-on-accent'
                      : 'border border-zx-line text-zx-text-soft hover:text-zx-text'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-2 block">
                {t('addTransaction.amountLabel', { symbol: currency === 'USD' ? '$' : '₫' })}
              </label>
              <Input
                ref={amountRef}
                type="number" min="1" step="any" value={form.amount}
                onChange={e => updateField('amount', e.target.value)}
                placeholder="0"
                aria-describedby={error ? 'addtx-error' : undefined}
                className="font-zx-display text-2xl font-bold"
                required
              />
              {form.amount && (
                <p className="text-xs text-zx-text-soft mt-1.5">
                  {formatMoney(form.amount, currency)}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-2 block">
                {t('addTransaction.categoryLabel')}
              </label>
              <Input
                type="text"
                list={`cats-${form.type}`}
                value={form.category}
                onChange={e => updateField('category', e.target.value)}
                placeholder={form.type === 'expense' ? t('addTransaction.expensePlaceholder') : t('addTransaction.incomePlaceholder')}
                required
              />
              <datalist id={`cats-${form.type}`}>
                {allCategories.map(c => <option key={c} value={c} />)}
              </datalist>
              <div className="flex flex-wrap gap-2 mt-2">
                {chipCategories.slice(0, 8).map(cat => (
                  <button key={cat} type="button" onClick={() => updateField('category', cat)}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      form.category === cat
                        ? 'bg-zx-accent-soft border border-zx-accent text-zx-accent font-medium'
                        : 'border border-zx-line text-zx-text-soft hover:border-zx-accent hover:text-zx-text'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-2 block">
                {t('common.date')}
              </label>
              <Input type="date" value={form.date} onChange={e => updateField('date', e.target.value)} required />
            </div>

            {/* Flags */}
            {form.type === 'expense' && (
              <div className="space-y-2">
                <button type="button" onClick={() => updateField('isLatteFactor', !form.isLatteFactor)}
                  className={`w-full flex items-center justify-between rounded-zx-sm border px-4 py-3 text-sm transition ${
                    form.isLatteFactor
                      ? 'border-zx-accent bg-zx-accent-soft text-zx-accent'
                      : 'border-zx-line text-zx-text-soft hover:border-zx-accent'
                  }`}>
                  <span className="flex items-center gap-2">
                    <span className="text-base">☕</span>
                    <span className="font-medium">Latte Factor</span>
                    {isLikelyLatte(form.category) && !form.isLatteFactor && (
                      <span className="text-[10px] bg-zx-accent-soft text-zx-accent px-2 py-0.5 rounded-full">{t('common.suggestion')}</span>
                    )}
                  </span>
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    form.isLatteFactor ? 'bg-zx-accent border-zx-accent' : 'border-zx-line'
                  }`}>
                    {form.isLatteFactor && <span className="text-[10px] text-zx-on-accent font-bold">✓</span>}
                  </span>
                </button>

                <button type="button" onClick={() => updateField('isRecurring', !form.isRecurring)}
                  className={`w-full flex items-center justify-between rounded-zx-sm border px-4 py-3 text-sm transition ${
                    form.isRecurring
                      ? 'border-zx-accent bg-zx-accent-soft text-zx-accent'
                      : 'border-zx-line text-zx-text-soft hover:border-zx-accent'
                  }`}>
                  <span className="flex items-center gap-2">
                    <span className="text-base">🔁</span>
                    <span className="font-medium">{t('addTransaction.recurringLabel')}</span>
                  </span>
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    form.isRecurring ? 'bg-zx-accent border-zx-accent' : 'border-zx-line'
                  }`}>
                    {form.isRecurring && <span className="text-[10px] text-zx-on-accent font-bold">✓</span>}
                  </span>
                </button>
              </div>
            )}

            {/* Note */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-2 block">
                {t('common.noteOptional')}
              </label>
              <Textarea value={form.note} onChange={e => updateField('note', e.target.value)}
                rows={2} placeholder={t('addTransaction.addNotePlaceholder')} />
            </div>

            {error && <p id="addtx-error" role="alert" className="rounded-zx-sm border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative">{error}</p>}

            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className={`flex-1 py-3.5 rounded-zx-sm text-sm font-semibold text-zx-on-accent transition hover:opacity-90 disabled:opacity-50 ${
                  form.type === 'expense' ? 'bg-zx-accent' : 'bg-zx-positive'
                }`}>
                {saving ? t('common.saving') : isEditing ? t('addTransaction.saveChanges') : t('addTransaction.saveTransaction')}
              </button>
              {isEditing ? (
                <button type="button" onClick={() => navigate(-1)}
                  className="flex-1 sm:flex-none sm:px-6 py-3.5 rounded-zx-sm border border-zx-line text-sm text-zx-text-soft hover:text-zx-text transition">
                  {t('common.cancel')}
                </button>
              ) : (
                <button type="button" onClick={() => navigate('/track')}
                  className="flex-1 sm:flex-none sm:px-6 py-3.5 rounded-zx-sm border border-zx-line text-sm text-zx-text-soft hover:text-zx-text transition">
                  {t('addTransaction.done')}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── RIGHT: Today's transactions panel ── */}
        {!isEditing && (
          <div className="hidden lg:block border-l border-zx-line pl-10 sticky top-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft mb-4">
              {t('addTransaction.todayPanel')} · {formatDate(new Date(`${form.date}T00:00:00`))}
            </p>

            {/* Income / Expense totals */}
            {panelTxs.length > 0 && (
              <>
                <div className="grid grid-cols-2 divide-x divide-zx-line mb-4">
                  <div className="pr-4">
                    <p className="text-[11px] text-zx-text-soft uppercase tracking-[0.1em] mb-0.5">{t('addTransaction.totalIncome')}</p>
                    <p className="font-zx-display text-lg font-bold text-zx-positive">{fmt(panelIncome, currency)}</p>
                  </div>
                  <div className="pl-4">
                    <p className="text-[11px] text-zx-text-soft uppercase tracking-[0.1em] mb-0.5">{t('addTransaction.totalExpense')}</p>
                    <p className="font-zx-display text-lg font-bold text-zx-accent">{fmt(panelExpense, currency)}</p>
                  </div>
                </div>
                <HL />
              </>
            )}

            {/* Transaction list */}
            {panelTxs.length === 0 ? (
              <p className="text-sm text-zx-text-soft mt-4">{t('addTransaction.todayEmpty')}</p>
            ) : (
              <div className="mt-3">
                {panelTxs.map((tx, i) => (
                  <div key={tx.id || i}>
                    {i > 0 && <HL />}
                    <div className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zx-text truncate">{tx.category}</p>
                        {tx.note && <p className="text-xs text-zx-text-soft truncate">{typeof tx.note === 'string' ? tx.note : ''}</p>}
                        {tx.isLatteFactor && <span className="text-[10px] text-zx-accent font-medium">☕ Latte</span>}
                      </div>
                      <p className={`text-sm font-bold font-zx-display flex-shrink-0 ml-3 ${
                        tx.type === 'income' ? 'text-zx-positive' : 'text-zx-text'
                      }`}>
                        {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount, currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
