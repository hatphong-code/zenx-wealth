import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore/lite';
import { ArrowRight, BarChart3, Bot, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { useWeeklyReviewData } from '../hooks/useWeeklyReviewData';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { db } from '../services/firebaseDb';
import { fmtShort, formatDate, formatNumber, formatPercent } from '../utils/formatters';

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

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 md:pb-8">

      {/* ── Tuần này ── */}
      <section className="pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft mb-3">
          {weekMeta ? `${formatDate(weekMeta.weekStart)} — ${formatDate(weekMeta.weekEnd)}` : 'Tuần này'}
        </p>

        {loading ? (
          <p className="text-sm text-zx-text-soft">Đang tải...</p>
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
                {score >= 80 ? 'Tuần xuất sắc ✦' : score >= 60 ? 'Tuần tốt.' : score >= 40 ? 'Tuần ổn — cải thiện được.' : 'Tuần khó — đừng bỏ cuộc.'}
              </p>
            </div>
            {/* Score history bars */}
            {history.length > 1 && (
              <div className="text-right">
                <p className="text-[10px] text-zx-text-soft mb-2">5 tuần gần nhất</p>
                <ScoreSparkline scores={history} />
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="font-zx-head text-xl font-semibold text-zx-text mb-1">Chưa review tuần này</p>
            <p className="text-sm text-zx-text-soft">Dành 3 phút nhìn lại tuần vừa qua.</p>
          </div>
        )}
      </section>

      <HL />

      {/* ── Số liệu / CTA ── */}
      {hasReviewed ? (
        <section className="py-6">
          <div className="grid grid-cols-2 gap-0 divide-x divide-zx-line">
            {[
              { label: 'Thu nhập', value: fmtShort(review.income), color: 'text-zx-positive' },
              { label: 'Chi tiêu', value: fmtShort(review.expense), color: 'text-zx-text' },
              { label: 'Tiết kiệm', value: `${savingsRatePct}%`, color: savingsRatePct >= 30 ? 'text-zx-positive' : 'text-zx-gold' },
              { label: 'Latte Factor', value: fmtShort(review.latteFactorTotal), color: 'text-zx-accent' },
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-2">Bài học</p>
                <p className="text-sm text-zx-text italic">"{form.oneLesson}"</p>
              </div>
            </>
          )}

          {form.oneActionNextWeek && (
            <>
              <HL />
              <div className="py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-2">Cam kết tuần tới</p>
                <p className="text-sm font-medium text-zx-text">"{form.oneActionNextWeek}"</p>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="py-6">
          <p className="text-sm text-zx-text-soft leading-relaxed mb-4">
            Review giúp bạn nhìn rõ số liệu, ghi 1 bài học và cam kết 1 hành động cho tuần tới. Chỉ 3 phút.
          </p>
          {canAccess('weekly_review') && (
            <Link to="/weekly-review"
              className="flex items-center justify-center gap-2 rounded-zx-sm bg-zx-accent px-4 py-3 text-sm font-semibold text-zx-on-accent hover:opacity-90 transition">
              <ClipboardCheck className="h-4 w-4" />
              Bắt đầu review tuần này
            </Link>
          )}
        </section>
      )}

      <HL />

      {/* ── Tools ── */}
      <section className="pt-2">
        {[
          {
            icon: ClipboardCheck, label: 'Review tuần',
            sub: hasReviewed ? 'Đã hoàn thành ✓' : 'Chưa làm tuần này',
            to: '/weekly-review', featureKey: 'weekly_review', active: !hasReviewed,
          },
          {
            icon: BarChart3, label: 'Báo cáo',
            sub: 'Xu hướng và phân tích tháng',
            to: '/reports', featureKey: 'reports', active: false,
          },
          {
            icon: Bot, label: 'Trợ lý AI',
            sub: 'Hỏi trợ lý tài chính',
            to: '/ai-coach', featureKey: 'ai_coach', active: false,
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
  );
}
