import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, Lock } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useWealthRoadmapData } from '../hooks/useWealthRoadmapData';
import { useDebtData } from '../hooks/useDebtData';
import { useEmergencyFundData } from '../hooks/useEmergencyFundData';
import { usePayYourselfFirstData } from '../hooks/usePayYourselfFirstData';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { fmtShort, formatNumber } from '../utils/formatters';

function HL() { return <div className="h-px bg-zx-line" />; }

/* Tính ETA đến milestone tiếp theo */
function calcETA(stats, pyfData) {
  const target = stats.targetMonths;
  const current = stats.emergencyMonths;
  if (current >= target) return null;

  // Estimate monthly contribution from PYF alloc + net cash flow
  const monthlyContrib = pyfData.status.required > 0
    ? pyfData.status.required * (pyfData.allocationRule.emergencyFund / 100)
    : Math.max(0, stats.netCashFlow) * 0.15;

  if (monthlyContrib <= 0) return null;

  const essential = pyfData.totalIncome > 0
    ? pyfData.totalIncome * (1 - pyfData.allocationRule.living / 100)
    : stats.netCashFlow;

  // months to reach next milestone
  const milestones = [1, 3, 6, 12];
  const nextMilestone = milestones.find(m => m > current) || target;
  const savedAmount = stats.emergencyMonths * (essential / target) * target;
  const goalAmount = nextMilestone * (essential / target) * target;
  const monthsLeft = monthlyContrib > 0
    ? Math.ceil((goalAmount - savedAmount) / monthlyContrib)
    : null;

  return { nextMilestone, monthsLeft };
}

/* Milestone celebration state */
function getMilestone(months) {
  if (months >= 12) return { stars: 4, label: '12 tháng đạt được!', color: 'text-zx-gold' };
  if (months >= 6)  return { stars: 3, label: '6 tháng đạt được!', color: 'text-zx-gold' };
  if (months >= 3)  return { stars: 2, label: '3 tháng đạt được!', color: 'text-zx-positive' };
  if (months >= 1)  return { stars: 1, label: '1 tháng đạt được!', color: 'text-zx-positive' };
  return null;
}

function getPriority(stats, debtSummary, latteMonthly) {
  if (stats.emergencyMonths < 1) {
    return {
      level: 'urgent',
      label: 'Ưu tiên ngay',
      message: 'Chưa có quỹ dự phòng. Bắt đầu ngay với mục tiêu 1 tháng chi phí.',
      action: 'Nạp quỹ dự phòng',
      to: '/emergency',
      tip: latteMonthly > 0 ? `Cắt 50% Latte Factor = +${fmtShort(latteMonthly * 0.5)} ₫/tháng` : null,
    };
  }
  if (stats.emergencyMonths < 3) {
    return {
      level: 'urgent',
      label: 'Ưu tiên ngay',
      message: `Quỹ dự phòng ${formatNumber(stats.emergencyMonths, { maximumFractionDigits: 1 })} tháng — cần đạt ít nhất 3 tháng trước.`,
      action: 'Nạp thêm vào quỹ',
      to: '/emergency',
      tip: latteMonthly > 0 ? `Chuyển Latte Factor sang quỹ = +${fmtShort(latteMonthly)} ₫/tháng` : null,
    };
  }
  if (stats.emergencyMonths < stats.targetMonths) {
    return {
      level: 'active',
      label: 'Đang thực hiện',
      message: `Quỹ ${formatNumber(stats.emergencyMonths, { maximumFractionDigits: 1 })}/${stats.targetMonths} tháng. Tiếp tục giữ nhịp.`,
      action: 'Theo dõi quỹ dự phòng',
      to: '/emergency',
      tip: null,
    };
  }
  if (stats.payYourselfProgress < 80) {
    return {
      level: 'active',
      label: 'Bước tiếp theo',
      message: `Quỹ dự phòng đạt ${stats.targetMonths} tháng ✓ — giờ tập trung tự trích trước.`,
      action: 'Thiết lập Pay Yourself First',
      to: '/pay-yourself-first',
      tip: null,
    };
  }
  if (debtSummary.totalDebt > 0) {
    return {
      level: 'active',
      label: 'Cần xử lý',
      message: `Còn ${fmtShort(debtSummary.totalDebt)} ₫ nợ — trả nợ để tăng tốc tích luỹ.`,
      action: 'Kiểm soát nợ',
      to: '/debts',
      tip: null,
    };
  }
  return {
    level: 'done',
    label: 'Đang xây dựng',
    message: 'Nền tảng vững. Tập trung xây dựng tài sản và dòng thu nhập mới.',
    action: 'Xem lộ trình',
    to: '/roadmap',
    tip: null,
  };
}

function PlanItem({ label, value, sub, to, status, canAccess: access }) {
  const statusColor = {
    done: 'text-zx-positive', active: 'text-zx-accent',
    upcoming: 'text-zx-text-soft', locked: 'text-zx-text-soft',
  }[status] || 'text-zx-text-soft';
  const Icon = status === 'done' ? CheckCircle2 : status === 'locked' ? Lock : Circle;

  const inner = (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className={`h-4 w-4 flex-shrink-0 ${statusColor}`} />
        <div className="min-w-0">
          <p className={`text-sm font-medium ${status === 'upcoming' || status === 'locked' ? 'text-zx-text-soft' : 'text-zx-text'}`}>
            {label}
          </p>
          {sub && <p className={`text-xs mt-0.5 ${statusColor}`}>{sub}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        {value && <span className={`font-zx-display text-base font-bold ${statusColor}`}>{value}</span>}
        {status !== 'locked' && access && <ArrowRight className="h-4 w-4 text-zx-text-soft" />}
      </div>
    </div>
  );

  if (!access || status === 'locked') return inner;
  return <Link to={to} className="block hover:bg-zx-surface-2 -mx-1 px-1 rounded-zx-sm transition">{inner}</Link>;
}

export default function PlanHub() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { canAccess } = useFeatureAccess(user);
  const { stats, loading: statsLoading } = useDashboardStats(user?.uid);
  const { data: roadmap, loading: roadmapLoading } = useWealthRoadmapData(user?.uid);
  const { data: debtData } = useDebtData(user?.uid);
  const { data: emergencyData } = useEmergencyFundData(user?.uid);
  const { data: pyfData } = usePayYourselfFirstData(user?.uid);

  const loading = statsLoading || roadmapLoading;
  const currentPhase = roadmap.phases.find(p => p.id === roadmap.currentPhaseId) || roadmap.phases[0];
  const emgPct = stats.targetMonths > 0 ? (stats.emergencyMonths / stats.targetMonths) * 100 : 0;
  const milestone = getMilestone(stats.emergencyMonths);
  const eta = calcETA(stats, pyfData);
  const latteMonthly = stats.latteFactor || 0;
  const priority = getPriority(stats, debtData.summary, latteMonthly);

  const planItems = [
    {
      key: 'roadmap', label: 'Lộ trình tài chính',
      value: currentPhase ? `GĐ ${roadmap.completedPhases + 1}` : null,
      sub: currentPhase?.title || 'Chưa thiết lập',
      to: '/roadmap',
      status: roadmap.phases.length > 0 ? 'active' : 'upcoming',
      featureKey: 'roadmap',
    },
    {
      key: 'emergency', label: 'Quỹ dự phòng',
      value: `${formatNumber(stats.emergencyMonths, { maximumFractionDigits: 1 })}/${stats.targetMonths} tháng`,
      sub: stats.emergencyMonths >= stats.targetMonths ? 'Đạt mục tiêu ✓' : `${Math.round(emgPct)}% mục tiêu`,
      to: '/emergency',
      status: stats.emergencyMonths >= stats.targetMonths ? 'done' : 'active',
      featureKey: 'emergency_fund',
    },
    {
      key: 'pyf', label: 'Trả mình trước',
      value: `${formatNumber(stats.payYourselfProgress)}%`,
      sub: stats.payYourselfProgress >= 100 ? 'Hoàn thành tháng này ✓' : `Còn ${fmtShort(Math.max(0, stats.payYourselfTarget - stats.payYourselfSaved))}`,
      to: '/pay-yourself-first',
      status: stats.payYourselfProgress >= 100 ? 'done' : 'active',
      featureKey: 'pay_yourself_first',
    },
    {
      key: 'debt', label: 'Kiểm soát nợ',
      value: debtData.summary.totalDebt > 0 ? fmtShort(debtData.summary.totalDebt) : null,
      sub: debtData.summary.totalDebt > 0 ? `${debtData.debts.length} khoản nợ` : 'Không có nợ ✓',
      to: '/debts',
      status: debtData.summary.totalDebt === 0 ? 'done' : (stats.emergencyMonths >= 3 ? 'active' : 'upcoming'),
      featureKey: 'debt_control',
    },
    {
      key: 'income', label: 'Xây dựng thu nhập',
      value: null,
      sub: stats.emergencyMonths >= stats.targetMonths ? 'Sẵn sàng bắt đầu' : 'Hoàn thành quỹ trước',
      to: '/income',
      status: stats.emergencyMonths >= stats.targetMonths ? 'upcoming' : 'locked',
      featureKey: 'income_builder',
    },
    {
      key: 'assets', label: 'Tài sản',
      value: null,
      sub: stats.payYourselfProgress >= 80 ? 'Sẵn sàng theo dõi' : 'Ổn định PYF trước',
      to: '/assets',
      status: stats.payYourselfProgress >= 80 ? 'upcoming' : 'locked',
      featureKey: 'assets',
    },
    {
      key: 'trading', label: 'Rủi ro đầu tư',
      value: null,
      sub: 'Sau khi có quỹ dự phòng đủ',
      to: '/trading-risk',
      status: stats.emergencyMonths >= stats.targetMonths ? 'upcoming' : 'locked',
      featureKey: 'trading_risk',
    },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 md:pb-8">

      {/* ── Phase + milestone ── */}
      <section className="pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft mb-3">
          Giai đoạn hiện tại
        </p>
        {loading ? (
          <p className="text-sm text-zx-text-soft">Đang tải...</p>
        ) : (
          <>
            {/* Milestone celebration */}
            {milestone && (
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg">{'✦'.repeat(milestone.stars)}</span>
                <span className={`text-sm font-semibold ${milestone.color}`}>{milestone.label}</span>
              </div>
            )}

            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-zx-display text-4xl font-bold text-zx-text leading-none">
                  {roadmap.completedPhases + 1}
                  <span className="text-lg font-normal text-zx-text-soft ml-1">
                    / {roadmap.phases.length || '—'}
                  </span>
                </p>
                <p className="font-zx-head text-base font-semibold text-zx-text mt-1">
                  {currentPhase?.title || 'Chưa có lộ trình'}
                </p>
              </div>

              {/* ETA */}
              {eta && (
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zx-text-soft">
                    Đến mốc {eta.nextMilestone} tháng
                  </p>
                  <p className="font-zx-display text-xl font-bold text-zx-accent mt-0.5">
                    ~{eta.monthsLeft} tháng
                  </p>
                  <p className="text-[11px] text-zx-text-soft">với tốc độ hiện tại</p>
                </div>
              )}
            </div>

            {currentPhase && (
              <div className="mt-3">
                <div className="h-1.5 rounded-full bg-zx-surface-2 overflow-hidden">
                  <div className="progress-fill h-full rounded-full"
                    style={{ width: `${roadmap.phases.length ? (roadmap.completedPhases / roadmap.phases.length) * 100 : 0}%` }} />
                </div>
                <p className="text-xs text-zx-text-soft mt-1.5">
                  {roadmap.completedPhases} / {roadmap.phases.length} giai đoạn hoàn thành
                </p>
              </div>
            )}
          </>
        )}
      </section>

      <HL />

      {/* ── Ưu tiên ── */}
      <section className="py-6">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full ${
            priority.level === 'urgent' ? 'bg-zx-accent-soft text-zx-accent' :
            priority.level === 'done'   ? 'bg-zx-positive-soft text-zx-positive' :
            'bg-zx-surface-2 text-zx-text-soft'
          }`}>
            {priority.label}
          </span>
        </div>
        <p className="text-sm text-zx-text leading-relaxed mb-3">{priority.message}</p>

        {/* Latte insight */}
        {priority.tip && (
          <p className="text-xs text-zx-gold bg-zx-gold-soft rounded-zx-sm px-3 py-2 mb-3">
            💡 {priority.tip}
          </p>
        )}

        {canAccess(planItems.find(i => i.to === priority.to)?.featureKey || 'roadmap') && (
          <Link to={priority.to}
            className="inline-flex items-center gap-2 rounded-zx-sm bg-zx-accent px-4 py-2.5 text-sm font-medium text-zx-on-accent hover:opacity-90 transition">
            {priority.action} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </section>

      <HL />

      {/* ── All plan items ── */}
      <section className="pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-2 pt-4">
          Toàn bộ kế hoạch
        </p>
        {planItems.map((item, i) => (
          <div key={item.key}>
            {i > 0 && <HL />}
            <PlanItem {...item} canAccess={canAccess(item.featureKey)} />
          </div>
        ))}
      </section>
    </div>
  );
}
