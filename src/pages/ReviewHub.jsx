import { Link } from 'react-router-dom';
import { ArrowRight, Bot, BarChart3, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { useWeeklyReviewData } from '../hooks/useWeeklyReviewData';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { fmtShort, formatDate, formatNumber } from '../utils/formatters';

function HL() { return <div className="h-px bg-zx-line" />; }

export default function ReviewHub() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { canAccess } = useFeatureAccess(user);
  const { data, loading } = useWeeklyReviewData(user?.uid);
  const { stats } = useDashboardStats(user?.uid);
  const currency = data.review.currency || 'VND';

  const { weekMeta, review, form } = data;
  const hasReviewed = Boolean(form.oneLesson || form.oneActionNextWeek);
  const score = review.wealthDisciplineScore || 0;
  const savingsRatePct = Math.round((review.savingsRate || 0) * 100);

  const scoreColor = score >= 8 ? 'text-zx-positive'
    : score >= 5 ? 'text-zx-gold'
    : score > 0 ? 'text-zx-accent'
    : 'text-zx-text-soft';

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 md:pb-8">

      {/* ── Tuần này ── */}
      <section className="pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft mb-3">
          {weekMeta ? `Tuần ${formatDate(weekMeta.weekStart)} — ${formatDate(weekMeta.weekEnd)}` : 'Tuần này'}
        </p>

        {loading ? (
          <p className="text-sm text-zx-text-soft">Đang tải...</p>
        ) : hasReviewed ? (
          <div>
            <div className="flex items-baseline gap-3 mb-2">
              <p className={`font-zx-display text-5xl font-bold leading-none ${scoreColor}`}>
                {score.toFixed(1)}
              </p>
              <p className="text-base text-zx-text-soft">/ 10</p>
            </div>
            <p className="text-sm text-zx-text-soft">
              {score >= 8 ? 'Tuần tốt — tiếp tục duy trì.' : score >= 5 ? 'Tuần ổn — còn cải thiện được.' : 'Tuần khó — đừng bỏ cuộc.'}
            </p>
          </div>
        ) : (
          <div>
            <p className="font-zx-head text-xl font-semibold text-zx-text mb-1">Chưa review</p>
            <p className="text-sm text-zx-text-soft">Dành 2 phút nhìn lại tuần vừa qua.</p>
          </div>
        )}
      </section>

      <HL />

      {/* ── Số liệu tuần / CTA review ── */}
      {hasReviewed ? (
        <section className="py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-4">
            Số liệu tuần
          </p>
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
            <div className="mt-4 pt-4 border-t border-zx-line">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-2">Bài học</p>
              <p className="text-sm text-zx-text italic">"{form.oneLesson}"</p>
            </div>
          )}
        </section>
      ) : (
        <section className="py-6">
          <p className="text-sm text-zx-text-soft leading-relaxed mb-4">
            Weekly review giúp bạn nhìn rõ dòng tiền, ghi lại một bài học và cam kết một hành động cho tuần tới. Chỉ mất 2 phút.
          </p>
          {canAccess('weekly_review') && (
            <Link to="/weekly-review"
              className="flex items-center justify-center gap-2 rounded-zx-sm bg-zx-accent px-4 py-3 text-sm font-medium text-zx-on-accent hover:opacity-90 transition">
              <ClipboardCheck className="h-4 w-4" />
              Bắt đầu review tuần này
            </Link>
          )}
        </section>
      )}

      <HL />

      {/* ── Công cụ đánh giá ── */}
      <section className="pt-2">
        {[
          {
            icon: ClipboardCheck,
            label: 'Weekly Review',
            sub: hasReviewed ? 'Đã hoàn thành tuần này ✓' : 'Chưa làm tuần này',
            to: '/weekly-review',
            featureKey: 'weekly_review',
            active: !hasReviewed,
          },
          {
            icon: BarChart3,
            label: 'Báo cáo',
            sub: 'Xu hướng và phân tích tháng',
            to: '/reports',
            featureKey: 'reports',
            active: false,
          },
          {
            icon: Bot,
            label: 'AI Coach',
            sub: 'Hỏi trợ lý tài chính',
            to: '/ai-coach',
            featureKey: 'ai_coach',
            active: false,
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
