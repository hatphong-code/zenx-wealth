import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore/lite';
import { Activity, ArrowRight, BarChart3, Bot, ClipboardCheck, History } from 'lucide-react';
import { useAuth } from '../../core/auth/useAuth';
import { useI18n } from '../../core/i18n/useI18n';
import { useWeeklyReviewData } from '../../core/hooks/useWeeklyReviewData';
import { useFeatureAccess } from '../../core/hooks/useFeatureAccess';
import { db } from '../../core/services/firebaseDb';
import { formatDate, formatMoney, formatNumber, formatPercent } from '../../core/utils/formatters';
import { useNumberFormat } from '../../core/hooks/useNumberFormat';
import StreakBadge from '../components/StreakBadge';
import { useReviewStreak } from '../../core/hooks/useReviewStreak';
import { usePayYourselfFirstData } from '../../core/hooks/usePayYourselfFirstData';
import { useGoalTracking } from '../../core/hooks/useGoalTracking';

function HL() { return <div className="h-px bg-zx-line" />; }

/* Mini bar chart for score history */
function ScoreSparkline({ scores }) {
  if (!scores || scores.length === 0) return null;
  const max = 100;
  const barW = 28;
  const gap = 6;
  const h = 40;
  const total = scores.length * barW + (scores.length - 1) * gap;

  return (
    <svg width={total} height={h + 16} className="block">
      {scores.map((s, i) => {
        const barH = Math.max(3, (s / max) * h);
        const x = i * (barW + gap);
        const y = h - barH;
        const color = s >= 80 ? 'var(--zx-positive)' : s >= 50 ? 'var(--zx-gold-fg)' : 'var(--zx-accent)';
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={color} opacity={i === scores.length - 1 ? 1 : 0.5} />
            <text x={x + barW / 2} y={h + 13} textAnchor="middle" fontSize={10} fill="var(--zx-text-soft)">{s}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ReviewHub() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { canAccess } = useFeatureAccess(user);
  const { data, loading } = useWeeklyReviewData(user?.uid);
  const { weekMeta, review, form } = data;
  const { fmt } = useNumberFormat();

  const { data: streakData } = useReviewStreak(user?.uid);
  const isPremium = canAccess('pay_yourself_first');
  const { data: pyfData } = usePayYourselfFirstData(isPremium ? user?.uid : null);
  const { data: goalData } = useGoalTracking(user?.uid);
  const [history, setHistory] = useState([]);

  // Fetch last 5 weekly review scores
  useEffect(() => {
    if (!user?.uid) return;
    getDocs(query(
      collection(db, 'users', user.uid, 'weeklyReviews'),
      orderBy('weekStart', 'desc'),
      limit(5)
    )).then(snap => {
      const scores = snap.docs
        .map(d => d.data().wealthDisciplineScore || 0)
        .filter(s => s > 0)
        .reverse();
      setHistory(scores);
    }).catch(() => {}); // silent fail — non-critical
  }, [user?.uid]);

  const hasReviewed = Boolean(form.oneLesson || form.oneActionNextWeek);
  const score = review.wealthDisciplineScore || 0;
  const scoreColor = score >= 80 ? 'text-zx-positive' : score >= 50 ? 'text-zx-gold' : score > 0 ? 'text-zx-accent' : 'text-zx-text-soft';
  const savingsRatePct = Math.round((review.savingsRate || 0) * 100);

  const behindBucket = isPremium && pyfData?.allocations?.length > 0
    ? [...pyfData.allocations]
        .filter((a) => a.key !== 'living' && a.amount > 0)
        .map((a) => ({ ...a, pct: Math.round((a.actual / a.amount) * 100) }))
        .sort((a, b) => a.pct - b.pct)[0]
    : null;

  const weeklyGoalTarget = goalData?.progress?.weeklyTargetSavings || 0;
  const actualSavingsThisWeek = Math.max(0, (review.income || 0) - (review.expense || 0));
  const goalOnTrack = weeklyGoalTarget > 0 && actualSavingsThisWeek >= weeklyGoalTarget;
  const currency = review.currency || 'VND';

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-8">
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-x-12 lg:items-start">

        {/* ── LEFT: Score + Stats + Lesson/Commitment ── */}
        <div>
          <section className="pb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft mb-1">
              {weekMeta ? `${formatDate(weekMeta.weekStart)} — ${formatDate(weekMeta.weekEnd)}` : t('reviewHub.thisWeek')}
            </p>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h1 className="font-zx-head text-xl font-bold text-zx-text">{t('reviewHub.pageTitle')}</h1>
              <StreakBadge streak={streakData.streak} size="sm" />
            </div>

            {loading ? (
              <p className="text-sm text-zx-text-soft">{t('common.loading')}</p>
            ) : hasReviewed ? (
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <p className={`font-zx-display text-5xl font-bold leading-none ${scoreColor}`}>
                      {score.toFixed(0)}
                    </p>
                    <p className="text-base text-zx-text-soft">/ 100</p>
                  </div>
                  <p className="text-sm text-zx-text-soft">
                    {score >= 80 ? t('reviewHub.scoreExcellent') : score >= 60 ? t('reviewHub.scoreGood') : score >= 40 ? t('reviewHub.scoreOk') : t('reviewHub.scoreHard')}
                  </p>
                  <p className="text-[11px] text-zx-text-soft/70 mt-1">
                    {t('reviewHub.scoreVsHealthScore')}{' '}
                    <Link to="/health-score" className="underline hover:text-zx-accent transition">
                      {t('reviewHub.healthScoreLabel')}
                    </Link>
                  </p>
                </div>
                {history.length > 1 && (
                  <div className="text-right">
                    <p className="text-[10px] text-zx-text-soft mb-2">{t('reviewHub.last5Weeks')}</p>
                    <ScoreSparkline scores={history} />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="font-zx-head text-xl font-semibold text-zx-text mb-1">{t('reviewHub.notReviewedYet')}</p>
                <p className="text-sm text-zx-text-soft">{t('reviewHub.reviewHint')}</p>
              </div>
            )}
          </section>

          <HL />

          {hasReviewed ? (
            <section className="py-6">
              <div className="grid grid-cols-2 gap-0 divide-x divide-zx-line">
                {[
                  { label: t('common.income'), value: fmt(review.income, 'VND'), color: 'text-zx-positive' },
                  { label: t('common.expense'), value: fmt(review.expense, 'VND'), color: 'text-zx-text' },
                  { label: t('common.savings'), value: `${savingsRatePct}%`, color: savingsRatePct >= 30 ? 'text-zx-positive' : 'text-zx-gold' },
                  { label: t('common.latteFactor'), value: fmt(review.latteFactorTotal, 'VND'), color: 'text-zx-accent' },
                ].map((s, i) => (
                  <div key={s.label} className={`px-4 py-4 ${i >= 2 ? 'border-t border-zx-line' : ''} ${i % 2 === 0 ? 'pl-0' : ''}`}>
                    <p className="text-[11px] text-zx-text-soft uppercase tracking-[0.1em] mb-1">{s.label}</p>
                    <p className={`font-zx-display text-xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {form.oneLesson && (
                <>
                  <HL />
                  <div className="py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-2">{t('reviewHub.lesson')}</p>
                    <p className="text-sm text-zx-text italic">"{form.oneLesson}"</p>
                  </div>
                </>
              )}

              {form.oneActionNextWeek && (
                <>
                  <HL />
                  <div className="py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-2">{t('reviewHub.commitment')}</p>
                    <p className="text-sm font-medium text-zx-text">"{form.oneActionNextWeek}"</p>
                  </div>
                </>
              )}
            </section>
          ) : (
            <section className="py-6">
              <p className="text-sm text-zx-text-soft leading-relaxed mb-4">
                {t('reviewHub.hint')}
              </p>
              <Link to="/weekly-review"
                className="flex items-center justify-center gap-2 rounded-zx-sm bg-zx-accent px-4 py-3 text-sm font-semibold text-zx-on-accent hover:opacity-90 transition">
                <ClipboardCheck className="h-4 w-4" />
                {t('reviewHub.startReview')}
              </Link>
            </section>
          )}

          {/* PYF link card */}
          {isPremium && pyfData && (
            <>
              <HL />
              <section className="py-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-3">{t('reviewHub.pyfLabel')}</p>
                <div className="flex items-center justify-between gap-4 mb-2">
                  <p className="text-sm text-zx-text">
                    {formatNumber(pyfData.status?.progress || 0)}% {t('reviewHub.pyfProgress')}
                  </p>
                  <Link to="/plan" className="text-xs font-semibold text-zx-accent hover:underline">
                    {t('reviewHub.pyfViewAll')}
                  </Link>
                </div>
                <div className="h-2 rounded-zx-pill bg-zx-surface-2 overflow-hidden mb-2">
                  <div
                    className="h-full rounded-zx-pill bg-zx-positive transition-all"
                    style={{ width: `${Math.min(100, Math.round(pyfData.status?.progress || 0))}%` }}
                  />
                </div>
                {behindBucket && behindBucket.pct < 80 && (
                  <p className="text-xs text-zx-negative">
                    {t('reviewHub.pyfBehindHint', {
                      bucket: t('payYourself.allocationLabels.' + behindBucket.key),
                      pct: behindBucket.pct,
                    })}
                  </p>
                )}
              </section>
            </>
          )}

          {/* Goal link card */}
          {goalData?.progress && (
            <>
              <HL />
              <section className="py-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-3">{t('reviewHub.goalLabel')}</p>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-semibold ${goalOnTrack ? 'text-zx-positive' : 'text-zx-accent'}`}>
                    {goalOnTrack ? t('reviewHub.goalOnTrack') : t('reviewHub.goalBehind')}
                  </p>
                  <Link to="/plan" className="text-xs font-semibold text-zx-accent hover:underline">
                    {t('reviewHub.goalViewAll')}
                  </Link>
                </div>
                {weeklyGoalTarget > 0 && (
                  <p className="text-xs text-zx-text-soft mt-1">
                    {formatMoney(actualSavingsThisWeek, currency)} / {formatMoney(weeklyGoalTarget, currency)}
                  </p>
                )}
              </section>
            </>
          )}
        </div>

        {/* ── RIGHT: Tools ── */}
        <div className="border-t border-zx-line pt-6 lg:border-t-0 lg:pt-0 lg:border-l lg:border-zx-line lg:pl-12">
          <section>
            {[
              {
                icon: ClipboardCheck, label: t('reviewHub.weeklyReviewLabel'),
                sub: hasReviewed ? t('reviewHub.completed') : t('reviewHub.notDone'),
                to: '/weekly-review', featureKey: 'weekly_review', active: !hasReviewed,
              },
              {
                icon: History, label: t('reviewHub.historyLabel'),
                sub: t('reviewHub.historySub'),
                to: '/review/history', featureKey: 'weekly_review', active: false,
              },
              {
                icon: BarChart3, label: t('reviewHub.reportsLabel'),
                sub: t('reviewHub.monthlyTrends'),
                to: '/reports', featureKey: 'reports', active: false,
              },
              {
                icon: Bot, label: t('reviewHub.aiCoachLabel'),
                sub: t('reviewHub.askAssistant'),
                to: '/ai-coach', featureKey: 'ai_coach', active: false,
              },
              {
                icon: Activity, label: t('reviewHub.healthScoreLabel'),
                sub: t('reviewHub.healthScoreSub'),
                to: '/health-score', featureKey: 'health_score', active: false,
              },
            ].filter(item => canAccess(item.featureKey)).map((item, i) => (
              <div key={item.to}>
                {i > 0 && <HL />}
                <Link to={item.to}
                  className="flex items-center justify-between py-4 hover:text-zx-accent transition group">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-zx-sm flex items-center justify-center flex-shrink-0 zx-transition ${
                      item.active ? 'bg-zx-accent text-zx-on-accent' : 'bg-zx-icon-bg text-zx-text-soft group-hover:text-zx-accent'
                    }`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zx-text">{item.label}</p>
                      <p className={`text-xs mt-0.5 ${item.active ? 'text-zx-accent' : 'text-zx-text-soft'}`}>{item.sub}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zx-text-soft group-hover:text-zx-accent transition" />
                </Link>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
