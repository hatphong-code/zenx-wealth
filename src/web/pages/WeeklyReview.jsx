import { useEffect, useState } from 'react';
import { Timestamp } from 'firebase/firestore/lite';
import { useAuth } from '../../core/auth/useAuth';
import { useI18n } from '../../core/i18n/useI18n';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatDate, formatMoney, formatNumber, formatPercent } from '../../core/utils/formatters';
import { useNumberFormat } from '../../core/hooks/useNumberFormat';
import { saveWeeklyReview, setWeeklyReviewCache } from '../../core/services/weeklyReviewService';
import { useWeeklyReviewData } from '../../core/hooks/useWeeklyReviewData';
import { invalidateAfterWeeklyReviewWrite } from '../../core/services/cacheCoordinator';
import { useFeatureAccess } from '../../core/hooks/useFeatureAccess';
import { usePayYourselfFirstData } from '../../core/hooks/usePayYourselfFirstData';
import { useGoalTracking } from '../../core/hooks/useGoalTracking';

function HL() { return <div className="h-px bg-zx-line" />; }

/* Generate contextual AI insight from review data */
function buildInsight(review, form, t, extra = {}) {
  const lines = [];
  const savingsPct = Math.round((review.savingsRate || 0) * 100);

  if (review.latteFactorTotal > 0 && review.latteFactorTotal / review.expense > 0.2) {
    const pct = Math.round((review.latteFactorTotal / review.expense) * 100);
    const category = review.topLatteCategory
      ? t('weeklyReview.insights.fromCategory', { cat: review.topLatteCategory })
      : '';
    lines.push(t('weeklyReview.insights.latteFactorInsight', { pct, category }));
  }
  if (savingsPct >= 30) {
    lines.push(t('weeklyReview.insights.exceededTarget', { pct: savingsPct }));
  } else if (savingsPct > 0) {
    lines.push(t('weeklyReview.insights.savingsProgress', { pct: savingsPct, gap: 30 - savingsPct }));
  }
  if (review.wealthDisciplineScore >= 80) {
    lines.push(t('weeklyReview.insights.highDisciplineScore'));
  } else if (review.wealthDisciplineScore > 0 && review.wealthDisciplineScore < 50) {
    lines.push(t('weeklyReview.insights.lowDisciplineScore'));
  }

  const { pyf, goal } = extra;
  if (pyf?.status?.required > 0) {
    const behind = [...pyf.allocations]
      .filter((a) => a.key !== 'living' && a.amount > 0)
      .map((a) => ({ ...a, pct: Math.round((a.actual / a.amount) * 100) }))
      .sort((a, b) => a.pct - b.pct)[0];
    if (behind && behind.pct < 50) {
      lines.push(t('weeklyReview.insights.pyfBehind', {
        bucket: t('payYourself.allocationLabels.' + behind.key),
        pct: behind.pct,
      }));
    }
  }
  if (goal?.progress?.weeklyTargetSavings > 0) {
    const actualThisWeek = Math.max(0, review.income - review.expense);
    if (actualThisWeek >= goal.progress.weeklyTargetSavings) {
      lines.push(t('weeklyReview.insights.goalOnTrack'));
    } else {
      const gapPct = Math.round((1 - actualThisWeek / goal.progress.weeklyTargetSavings) * 100);
      lines.push(t('weeklyReview.insights.goalBehind', { pct: gapPct }));
    }
  }

  if (form.oneLesson) {
    const lesson = `${form.oneLesson.slice(0, 80)}${form.oneLesson.length > 80 ? '…' : ''}`;
    lines.push(t('weeklyReview.insights.yourLesson', { lesson }));
  }
  return lines.length > 0 ? lines : [t('weeklyReview.insights.insufficientData')];
}

export default function WeeklyReview() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { canAccess } = useFeatureAccess(user);
  const isPremium = canAccess('pay_yourself_first');
  const { data, setData, loading, refreshing, error, setError } = useWeeklyReviewData(user?.uid);
  const { weekMeta, review } = data;
  const { fmt } = useNumberFormat();
  const { data: pyfData } = usePayYourselfFirstData(isPremium ? user?.uid : null);
  const { data: goalData } = useGoalTracking(user?.uid);
  const [form, setForm] = useState(data.form);
  const [previousCommitmentStatus, setPreviousCommitmentStatus] = useState(data.form.previousCommitmentStatus || null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(0); // 0=numbers, 1=reflect, 2=commit
  const [dirty, setDirty] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState(null);

  const STEPS = [
    { id: 'numbers', label: t('weeklyReview.steps.numbers') },
    { id: 'reflect', label: t('weeklyReview.steps.reflect') },
    { id: 'commit',  label: t('weeklyReview.steps.commit') },
  ];

  useEffect(() => {
    if (!dirty) {
      setForm(data.form);
      setPreviousCommitmentStatus(data.form.previousCommitmentStatus || null);
    }
  }, [data.form, dirty]);

  // If already reviewed this week, show done screen (user can click Edit to modify)
  useEffect(() => {
    if (data.form.oneLesson || data.form.oneActionNextWeek) {
      setStep(2);
      setDone(true);
    }
  }, [data.form]);

  // Auto-save: debounced 30s when dirty and not already saving
  useEffect(() => {
    if (!dirty || saving || !user || !weekMeta?.weekKey) return;
    const timer = setTimeout(async () => {
      setSaving(true);
      try {
        await saveWeeklyReview(user.uid, weekMeta.weekKey, {
          weekStart: Timestamp.fromDate(toDate(weekMeta.weekStart)),
          weekEnd: Timestamp.fromDate(toDate(weekMeta.weekEnd)),
          oneLesson: form.oneLesson.trim(),
          oneActionNextWeek: form.oneActionNextWeek.trim(),
          previousCommitmentStatus,
        });
        setAutoSavedAt(new Date());
        setDirty(false);
      } catch { /* silent fail — user can still manually save */ }
      finally { setSaving(false); }
    }, 30_000);
    return () => clearTimeout(timer);
  }, [dirty, form, previousCommitmentStatus, saving, user, weekMeta]);

  const updateField = (field, value) => {
    setDirty(true);
    setForm(c => ({ ...c, [field]: value }));
  };

  const chooseCommitmentStatus = (status) => {
    setDirty(true);
    setPreviousCommitmentStatus(status);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true); setError('');
    try {
      await saveWeeklyReview(user.uid, weekMeta.weekKey, {
        weekStart: Timestamp.fromDate(toDate(weekMeta.weekStart)),
        weekEnd: Timestamp.fromDate(toDate(weekMeta.weekEnd)),
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
        previousCommitmentStatus,
      });

      const nextData = {
        ...data,
        form: { oneLesson: form.oneLesson.trim(), oneActionNextWeek: form.oneActionNextWeek.trim(), previousCommitmentStatus },
      };
      setData(nextData);
      setWeeklyReviewCache(user.uid, weekMeta.weekKey, nextData);
      invalidateAfterWeeklyReviewWrite(user.uid);
      setDirty(false);
      setDone(true);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  // weekMeta.weekStart/End may be Date, ISO string (JSON cache), or Firestore Timestamp
  const toDate = (v) => {
    if (!v) return new Date();
    if (v instanceof Date) return v;
    if (typeof v.toDate === 'function') return v.toDate();
    return new Date(v);
  };
  const fmtWeekDate = (v) => v ? toDate(v).toLocaleDateString('vi-VN') : '-';

  const score = review.wealthDisciplineScore || 0;
  const scoreColor = score >= 80 ? 'text-zx-positive' : score >= 50 ? 'text-zx-gold' : score > 0 ? 'text-zx-accent' : 'text-zx-text-soft';
  const insight = buildInsight(review, form, t, { pyf: pyfData, goal: goalData });

  // Done/success screen
  if (done) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 pb-24 text-center">
        <div className="text-4xl mb-4">✦</div>
        <h1 className="font-zx-head text-2xl font-bold text-zx-positive mb-2">{t('weeklyReview.complete')}</h1>
        <p className="text-sm text-zx-text-soft mb-6">
          {t('weeklyReview.weekRecorded', { week: weekMeta ? fmtWeekDate(weekMeta.weekStart) : '' })}
        </p>
        {form.oneActionNextWeek && (
          <div className="rounded-zx-sm bg-zx-accent-soft border border-zx-accent/20 p-4 text-left mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-1">
              {t('weeklyReview.commitmentLabel')}
            </p>
            <p className="text-sm font-medium text-zx-text">"{form.oneActionNextWeek}"</p>
          </div>
        )}
        <button onClick={() => setDone(false)}
          className="text-sm text-zx-text-soft hover:text-zx-accent transition">
          {t('weeklyReview.editButton')}
        </button>
      </div>
    );
  }

  const summaryStats = [
    { label: t('weeklyReview.income'), value: fmt(review.income, 'VND'), color: 'text-zx-positive' },
    { label: t('common.expense'), value: fmt(review.expense, 'VND'), color: 'text-zx-text' },
    { label: t('weeklyReview.latteFactorLabel'), value: fmt(review.latteFactorTotal, 'VND'), color: 'text-zx-accent' },
    { label: t('weeklyReview.savings'), value: formatPercent(review.savingsRate), color: review.savingsRate >= 0.3 ? 'text-zx-positive' : 'text-zx-gold' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-8">

      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft mb-1">
          {weekMeta ? `${fmtWeekDate(weekMeta.weekStart)} — ${fmtWeekDate(weekMeta.weekEnd)}` : t('reviewHub.thisWeek')}
        </p>
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-zx-head text-xl font-bold text-zx-text">{t('weeklyReview.title')}</h1>
          <span className="text-xs text-zx-text-soft flex-shrink-0">
            {saving ? t('weeklyReview.autoSaving') : autoSavedAt ? `${t('weeklyReview.autoSaved')} ${autoSavedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : null}
          </span>
        </div>
        {loading && <p className="text-xs text-zx-text-soft mt-1">{t('common.loading')}</p>}
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-x-12 lg:items-start">

        {/* ── LEFT: Wizard ── */}
        <div>
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
                {t('weeklyReview.numbersHint')}
              </p>
              <div className="grid grid-cols-2 divide-x divide-zx-line">
                {[
                  { label: t('weeklyReview.income'), value: fmt(review.income, 'VND'), color: 'text-zx-positive' },
                  { label: t('common.expense'), value: fmt(review.expense, 'VND'), color: 'text-zx-text' },
                ].map((s, i) => (
                  <div key={s.label} className={`py-4 ${i === 0 ? 'pr-4' : 'pl-4'}`}>
                    <p className="text-[11px] text-zx-text-soft uppercase tracking-[0.1em] mb-1">{s.label}</p>
                    <p className={`font-zx-display text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <HL />
              <div className="grid grid-cols-2 divide-x divide-zx-line">
                {[
                  {
                    label: t('weeklyReview.latteFactorLabel'),
                    value: fmt(review.latteFactorTotal, 'VND'),
                    sub: review.topLatteCategory || '',
                    color: 'text-zx-accent',
                  },
                  {
                    label: t('weeklyReview.savings'),
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
                  <p className="text-[11px] text-zx-text-soft uppercase tracking-[0.1em] mb-1">{t('weeklyReview.disciplineScore')}</p>
                  <p className={`font-zx-display text-3xl font-bold ${scoreColor}`}>
                    {score > 0 ? score : '—'}<span className="text-base font-normal text-zx-text-soft">/100</span>
                  </p>
                </div>
                {score >= 70 && <span className="text-2xl">✦</span>}
              </div>

              <button onClick={() => setStep(1)}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-zx-sm bg-zx-accent py-3.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 transition">
                {t('weeklyReview.nextReflect')} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── Step 1: Reflect ── */}
          {step === 1 && (
            <div className="space-y-5">
              <p className="text-sm text-zx-text-soft">
                {t('weeklyReview.reflectQuestion')}
              </p>

              {review.previousCommitment && (
                <div className="rounded-zx-sm border border-zx-line bg-zx-surface-2 p-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zx-text-soft">{t('weeklyReview.previousCommitmentLabel')}</p>
                  <p className="text-sm font-medium text-zx-text">"{review.previousCommitment}"</p>
                  <div className="flex gap-2 flex-wrap">
                    {['done', 'partial', 'skip'].map((s) => (
                      <button
                        key={s}
                        aria-label={t(`weeklyReview.commitmentStatus.${s}`)}
                        onClick={() => chooseCommitmentStatus(s)}
                        className={`px-3 py-1.5 rounded-zx-pill text-xs font-semibold transition border ${
                          previousCommitmentStatus === s
                            ? s === 'done'
                              ? 'bg-zx-positive text-zx-on-accent border-transparent'
                              : s === 'partial'
                              ? 'bg-zx-gold text-zx-bg border-transparent'
                              : 'bg-zx-surface-2 text-zx-text-soft border-zx-line'
                            : 'border-zx-line text-zx-text-soft hover:text-zx-text'
                        }`}
                      >
                        {t(`weeklyReview.commitmentStatus.${s}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {insight.length > 0 && (
                <div className="rounded-zx-sm bg-zx-surface-2 border border-zx-line p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zx-text-soft">{t('weeklyReview.insightFromData')}</p>
                  {insight.map((line, i) => (
                    <p key={i} className="text-sm text-zx-text leading-relaxed">{line}</p>
                  ))}
                </div>
              )}

              <div>
                <label htmlFor="wr-lesson" className="text-xs font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-2 block">
                  {t('weeklyReview.lessonLabel')}
                </label>
                <textarea
                  id="wr-lesson"
                  value={form.oneLesson}
                  onChange={e => updateField('oneLesson', e.target.value)}
                  rows={4}
                  placeholder={t('weeklyReview.lessonPlaceholder')}
                  className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent transition resize-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep(0)} className="px-4 py-3 rounded-zx-sm border border-zx-line text-sm text-zx-text-soft hover:text-zx-text transition">← {t('common.back')}</button>
                <button onClick={() => setStep(2)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-zx-sm bg-zx-accent py-3 text-sm font-semibold text-zx-on-accent hover:opacity-90 transition">
                  {t('weeklyReview.nextCommit')} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Commit ── */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-sm text-zx-text-soft">
                {t('weeklyReview.commitQuestion')}
              </p>

              <div>
                <label htmlFor="wr-action" className="text-xs font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-2 block">
                  {t('weeklyReview.commitmentLabel')}
                </label>
                <textarea
                  id="wr-action"
                  value={form.oneActionNextWeek}
                  onChange={e => updateField('oneActionNextWeek', e.target.value)}
                  rows={3}
                  placeholder={t('weeklyReview.commitmentPlaceholder')}
                  className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent transition resize-none"
                  autoFocus
                />
              </div>

              {form.oneLesson && (
                <div className="rounded-zx-sm bg-zx-surface-2 px-4 py-3">
                  <p className="text-[10px] text-zx-text-soft uppercase tracking-[0.1em] mb-1">{t('weeklyReview.yourRecordedLesson')}</p>
                  <p className="text-sm text-zx-text italic">"{form.oneLesson}"</p>
                </div>
              )}

              {error && <p className="text-sm text-zx-negative">{error}</p>}

              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="px-4 py-3 rounded-zx-sm border border-zx-line text-sm text-zx-text-soft hover:text-zx-text transition">← {t('common.back')}</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-zx-sm bg-zx-positive py-3.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 disabled:opacity-50 transition">
                  {saving ? t('common.saving') : t('weeklyReview.completeReview')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Summary panel (always visible on desktop) ── */}
        <div className="hidden lg:block border-l border-zx-line pl-12 sticky top-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft mb-4">
            {t('weeklyReview.thisWeekSummary')}
          </p>
          <div className="space-y-4">
            {summaryStats.map(s => (
              <div key={s.label}>
                <p className="text-[11px] text-zx-text-soft uppercase tracking-[0.1em] mb-0.5">{s.label}</p>
                <p className={`font-zx-display text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
            <HL />
            <div>
              <p className="text-[11px] text-zx-text-soft uppercase tracking-[0.1em] mb-0.5">{t('weeklyReview.disciplineScore')}</p>
              <p className={`font-zx-display text-2xl font-bold ${scoreColor}`}>
                {score > 0 ? score : '—'}<span className="text-sm font-normal text-zx-text-soft"> /100</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


