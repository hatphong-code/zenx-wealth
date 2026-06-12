import { useEffect, useState } from 'react';
import { doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { db } from '../services/firebaseDb';
import { formatDate, formatMoney, formatNumber, formatPercent, fmtShort } from '../utils/formatters';
import { setWeeklyReviewCache } from '../services/weeklyReviewService';
import { useWeeklyReviewData } from '../hooks/useWeeklyReviewData';
import { invalidateReportsCache } from '../services/reportsService';
import { invalidateAICoachCache } from '../services/aiCoachService';

function HL() { return <div className="h-px bg-zx-line" />; }

/* Generate contextual AI insight from review data */
function buildInsight(review, form) {
  const lines = [];
  const savingsPct = Math.round((review.savingsRate || 0) * 100);
  const latteVsIncome = review.income > 0 ? (review.latteFactorTotal / review.income) * 100 : 0;

  if (review.latteFactorTotal > 0 && review.latteFactorTotal / review.expense > 0.2) {
    lines.push(`Latte Factor chiếm ${Math.round((review.latteFactorTotal / review.expense) * 100)}% chi tiêu tuần này${review.topLatteCategory ? ` — chủ yếu từ "${review.topLatteCategory}"` : ''}.`);
  }
  if (savingsPct >= 30) {
    lines.push(`Tỷ lệ tiết kiệm ${savingsPct}% — vượt mục tiêu 30%. Xuất sắc!`);
  } else if (savingsPct > 0) {
    lines.push(`Tỷ lệ tiết kiệm ${savingsPct}% — mục tiêu 30%. Còn ${30 - savingsPct}% để đạt ngưỡng lý tưởng.`);
  }
  if (review.wealthDisciplineScore >= 80) {
    lines.push('Điểm kỷ luật tài chính cao — hệ thống đang vận hành tốt.');
  } else if (review.wealthDisciplineScore > 0 && review.wealthDisciplineScore < 50) {
    lines.push('Điểm kỷ luật thấp tuần này. Chọn 1 thói quen nhỏ để cải thiện trước.');
  }
  if (form.oneLesson) {
    lines.push(`Bài học bạn ghi: "${form.oneLesson.slice(0, 80)}${form.oneLesson.length > 80 ? '…' : ''}"`);
  }
  return lines.length > 0 ? lines : ['Tuần này thiếu dữ liệu giao dịch để phân tích sâu. Ghi đủ thu chi sẽ cho insight tốt hơn.'];
}

const STEPS = [
  { id: 'numbers', label: 'Số liệu' },
  { id: 'reflect', label: 'Nhìn lại' },
  { id: 'commit',  label: 'Cam kết' },
];

export default function WeeklyReview() {
  const { user } = useAuth();
  const { data, setData, loading, refreshing, error, setError } = useWeeklyReviewData(user?.uid);
  const { weekMeta, review } = data;
  const [form, setForm] = useState(data.form);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(0); // 0=numbers, 1=reflect, 2=commit
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) setForm(data.form);
  }, [data.form, dirty]);

  // If already reviewed this week, start at step 2 (commit/edit)
  useEffect(() => {
    if (data.form.oneLesson || data.form.oneActionNextWeek) setStep(2);
  }, [data.form]);

  const updateField = (field, value) => {
    setDirty(true);
    setForm(c => ({ ...c, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true); setError('');
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
        form: { oneLesson: form.oneLesson.trim(), oneActionNextWeek: form.oneActionNextWeek.trim() },
      };
      setData(nextData);
      setWeeklyReviewCache(user.uid, weekMeta.weekKey, nextData);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      setDirty(false);
      setDone(true);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const score = review.wealthDisciplineScore || 0;
  const scoreColor = score >= 80 ? 'text-zx-positive' : score >= 50 ? 'text-zx-gold' : score > 0 ? 'text-zx-accent' : 'text-zx-text-soft';
  const insight = buildInsight(review, form);

  // Done/success screen
  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 pb-24 text-center">
        <div className="text-4xl mb-4">✦</div>
        <h1 className="font-zx-head text-2xl font-bold text-zx-positive mb-2">Review tuần xong!</h1>
        <p className="text-sm text-zx-text-soft mb-6">
          Tuần {weekMeta ? formatDate(weekMeta.weekStart) : ''} — đã ghi nhận.
        </p>
        {form.oneActionNextWeek && (
          <div className="rounded-zx-sm bg-zx-accent-soft border border-zx-accent/20 p-4 text-left mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-1">
              Cam kết tuần tới
            </p>
            <p className="text-sm font-medium text-zx-text">"{form.oneActionNextWeek}"</p>
          </div>
        )}
        <button onClick={() => setDone(false)}
          className="text-sm text-zx-text-soft hover:text-zx-accent transition">
          Chỉnh sửa →
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 md:pb-8">

      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft mb-1">
          {weekMeta ? `${formatDate(weekMeta.weekStart)} — ${formatDate(weekMeta.weekEnd)}` : 'Tuần này'}
        </p>
        <h1 className="font-zx-head text-xl font-bold text-zx-text">Weekly Review</h1>
        {loading && <p className="text-xs text-zx-text-soft mt-1">Đang tải...</p>}
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <button onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 text-xs font-medium transition ${
                i === step ? 'text-zx-accent' : i < step ? 'text-zx-positive' : 'text-zx-text-soft'
              }`}>
              {i < step
                ? <CheckCircle2 className="h-4 w-4" />
                : <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                    i === step ? 'border-zx-accent text-zx-accent' : 'border-zx-line text-zx-text-soft'
                  }`}>{i + 1}</span>
              }
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <div className="h-px w-6 bg-zx-line" />}
          </div>
        ))}
      </div>

      {/* ── Step 0: Numbers ── */}
      {step === 0 && (
        <div>
          <p className="text-sm text-zx-text-soft mb-4">
            Dữ liệu từ giao dịch tuần này. Xem lại và ghi nhớ.
          </p>
          <div className="grid grid-cols-2 divide-x divide-zx-line">
            {[
              { label: 'Thu nhập', value: fmtShort(review.income), color: 'text-zx-positive' },
              { label: 'Chi tiêu', value: fmtShort(review.expense), color: 'text-zx-text' },
            ].map((s, i) => (
              <div key={s.label} className={`py-4 ${i === 0 ? 'pr-4' : 'pl-4'}`}>
                <p className="text-[11px] text-zx-text-soft uppercase tracking-[0.1em] mb-1">{s.label}</p>
                <p className={`font-zx-display text-2xl font-bold ${s.color}`}>{s.value} <span className="text-sm font-normal text-zx-text-soft">₫</span></p>
              </div>
            ))}
          </div>
          <HL />
          <div className="grid grid-cols-2 divide-x divide-zx-line">
            {[
              {
                label: 'Latte Factor',
                value: fmtShort(review.latteFactorTotal),
                sub: review.topLatteCategory || '',
                color: 'text-zx-accent',
              },
              {
                label: 'Tiết kiệm',
                value: formatPercent(review.savingsRate),
                sub: review.savingsRate >= 0.3 ? '≥ 30% ✓' : '< 30%',
                color: review.savingsRate >= 0.3 ? 'text-zx-positive' : 'text-zx-gold',
              },
            ].map((s, i) => (
              <div key={s.label} className={`py-4 ${i === 0 ? 'pr-4' : 'pl-4'}`}>
                <p className="text-[11px] text-zx-text-soft uppercase tracking-[0.1em] mb-1">{s.label}</p>
                <p className={`font-zx-display text-2xl font-bold ${s.color}`}>{s.value}</p>
                {s.sub && <p className="text-xs text-zx-text-soft mt-0.5">{s.sub}</p>}
              </div>
            ))}
          </div>
          <HL />
          <div className="py-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-zx-text-soft uppercase tracking-[0.1em] mb-1">Điểm kỷ luật</p>
              <p className={`font-zx-display text-3xl font-bold ${scoreColor}`}>
                {score > 0 ? score : '—'}<span className="text-base font-normal text-zx-text-soft">/100</span>
              </p>
            </div>
            {score >= 70 && <span className="text-2xl">✦</span>}
          </div>

          <button onClick={() => setStep(1)}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-zx-sm bg-zx-accent py-3.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 transition">
            Tiếp theo — Nhìn lại <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Step 1: Reflect ── */}
      {step === 1 && (
        <div className="space-y-5">
          <p className="text-sm text-zx-text-soft">
            Một bài học từ tuần này về thói quen tài chính của bạn là gì?
          </p>

          {/* AI insight */}
          {insight.length > 0 && (
            <div className="rounded-zx-sm bg-zx-surface-2 border border-zx-line p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zx-text-soft">✦ Nhận xét từ dữ liệu</p>
              {insight.map((line, i) => (
                <p key={i} className="text-sm text-zx-text leading-relaxed">{line}</p>
              ))}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-2 block">
              Bài học tuần này
            </label>
            <textarea
              value={form.oneLesson}
              onChange={e => updateField('oneLesson', e.target.value)}
              rows={4}
              placeholder="Tuần này tôi học được rằng..."
              className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent transition resize-none"
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep(0)} className="px-4 py-3 rounded-zx-sm border border-zx-line text-sm text-zx-text-soft hover:text-zx-text transition">← Lại</button>
            <button onClick={() => setStep(2)}
              className="flex-1 flex items-center justify-center gap-2 rounded-zx-sm bg-zx-accent py-3 text-sm font-semibold text-zx-on-accent hover:opacity-90 transition">
              Tiếp — Cam kết <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Commit ── */}
      {step === 2 && (
        <div className="space-y-5">
          <p className="text-sm text-zx-text-soft">
            Tuần tới, bạn sẽ làm <strong className="text-zx-text">1 việc quan trọng nhất</strong> nào để cải thiện tài chính?
          </p>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-2 block">
              Cam kết tuần tới
            </label>
            <textarea
              value={form.oneActionNextWeek}
              onChange={e => updateField('oneActionNextWeek', e.target.value)}
              rows={3}
              placeholder="Tuần tới tôi sẽ..."
              className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent transition resize-none"
              autoFocus
            />
          </div>

          {/* Previous lesson as reminder */}
          {form.oneLesson && (
            <div className="rounded-zx-sm bg-zx-surface-2 px-4 py-3">
              <p className="text-[10px] text-zx-text-soft uppercase tracking-[0.1em] mb-1">Bài học bạn ghi</p>
              <p className="text-sm text-zx-text italic">"{form.oneLesson}"</p>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="px-4 py-3 rounded-zx-sm border border-zx-line text-sm text-zx-text-soft hover:text-zx-text transition">← Lại</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-zx-sm bg-zx-positive py-3.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 disabled:opacity-50 transition">
              {saving ? 'Đang lưu...' : '✦ Hoàn thành review'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
