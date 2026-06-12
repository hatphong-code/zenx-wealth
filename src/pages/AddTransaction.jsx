import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addDoc, collection, doc, getDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import { db } from '../services/firebaseDb';
import { formatMoney, fmtShort } from '../utils/formatters';
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

const DEFAULT_EXPENSE_CATEGORIES = [
  'Cà phê & trà sữa', 'Ăn ngoài', 'Mua sắm', 'Đi lại', 'Nhà ở',
  'Sức khoẻ', 'Subscription', 'Học tập', 'Gia đình', 'Khác',
];

const DEFAULT_INCOME_CATEGORIES = [
  'Lương', 'Freelance', 'Kinh doanh', 'Đầu tư', 'Thưởng', 'Khác',
];

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
  const [customCategories, setCustomCategories] = useState({ income: [], expense: [] });

  useEffect(() => {
    if (!user) return;
    const loadForm = async () => {
      setLoading(isEditing);
      setError('');
      try {
        const profile = await getUserProfile(user.uid);
        setCurrency(profile.settings?.currency || 'VND');
        setCustomCategories(profile.settings?.customCategories || { income: [], expense: [] });
        if (!isEditing) return;
        const snap = await getDoc(doc(db, 'users', user.uid, 'transactions', transactionId));
        if (!snap.exists()) { setError('Không tìm thấy giao dịch.'); return; }
        const data = snap.data();
        setCurrency(data.currency || profile.settings?.currency || 'VND');
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
      // Auto-suggest Latte Factor when category is entered
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
    if (!Number.isFinite(amount) || amount <= 0) { setError('Số tiền phải lớn hơn 0.'); return; }
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
      } else {
        await addDoc(collection(db, 'users', user.uid, 'transactions'), { ...payload, createdAt: serverTimestamp() });
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
      navigate(isEditing ? '/transactions' : '/track');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-10 text-center text-zx-text-soft">Đang tải...</div>;

  // Categories: custom first, then defaults
  const allCategories = form.type === 'expense'
    ? [...new Set([...customCategories.expense, ...DEFAULT_EXPENSE_CATEGORIES])]
    : [...new Set([...customCategories.income, ...DEFAULT_INCOME_CATEGORIES])];

  const inputCls = 'w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent transition';

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 md:pb-8">
      <h1 className="font-zx-head text-xl font-bold text-zx-text mb-6">
        {isEditing ? 'Sửa giao dịch' : 'Thêm giao dịch'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Type toggle */}
        <div className="flex gap-2">
          {[
            { value: 'expense', label: 'Chi tiêu' },
            { value: 'income', label: 'Thu nhập' },
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
            Số tiền (₫)
          </label>
          <input
            type="number" min="1" step="any" value={form.amount}
            onChange={e => updateField('amount', e.target.value)}
            placeholder="0"
            className={`${inputCls} font-zx-display text-2xl font-bold`}
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
            Danh mục
          </label>
          <input
            type="text"
            list={`cats-${form.type}`}
            value={form.category}
            onChange={e => updateField('category', e.target.value)}
            placeholder={form.type === 'expense' ? 'Cà phê, ăn ngoài...' : 'Lương, freelance...'}
            className={inputCls}
            required
          />
          <datalist id={`cats-${form.type}`}>
            {allCategories.map(c => <option key={c} value={c} />)}
          </datalist>
          {/* Quick-tap chips */}
          <div className="flex flex-wrap gap-2 mt-2">
            {allCategories.slice(0, 8).map(cat => (
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
            Ngày
          </label>
          <input type="date" value={form.date} onChange={e => updateField('date', e.target.value)}
            className={inputCls} required />
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
                  <span className="text-[10px] bg-zx-accent-soft text-zx-accent px-2 py-0.5 rounded-full">Gợi ý</span>
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
                <span className="font-medium">Định kỳ</span>
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
            Ghi chú (tuỳ chọn)
          </label>
          <textarea value={form.note} onChange={e => updateField('note', e.target.value)}
            rows={2} placeholder="Thêm ghi chú..." className={inputCls} />
        </div>

        {error && <p className="rounded-zx-sm bg-red-950/40 border border-red-900 p-3 text-sm text-red-300">{error}</p>}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="submit" disabled={saving}
            className={`flex-1 py-3.5 rounded-zx-sm text-sm font-semibold text-zx-on-accent transition hover:opacity-90 disabled:opacity-50 ${
              form.type === 'expense' ? 'bg-zx-accent' : 'bg-zx-positive'
            }`}>
            {saving ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Lưu giao dịch'}
          </button>
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 sm:flex-none sm:px-6 py-3.5 rounded-zx-sm border border-zx-line text-sm text-zx-text-soft hover:text-zx-text transition">
            Huỷ
          </button>
        </div>
      </form>
    </div>
  );
}
