import { Link } from 'react-router-dom';
import { ArrowRight, Coffee, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useTransactionsData } from '../hooks/useTransactionsData';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { fmtShort, formatDate, formatMoney } from '../utils/formatters';

function HL() { return <div className="h-px bg-zx-line" />; }

export default function TrackHub() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { canAccess } = useFeatureAccess(user);
  const { stats, loading } = useDashboardStats(user?.uid);
  const { data: txData } = useTransactionsData(user?.uid);
  const currency = stats.currency || 'VND';

  const recent = txData.transactions.slice(0, 5);
  const isPositive = stats.netCashFlow >= 0;
  const latteDown = stats.latteFactorPercent <= 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 md:pb-8">

      {/* ── Dòng tiền tháng này ── */}
      <section className="pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft mb-3">
          Tháng này
        </p>
        {loading ? (
          <p className="text-zx-text-soft text-sm">Đang tải...</p>
        ) : (
          <>
            <div className="flex items-end gap-3">
              {isPositive
                ? <TrendingUp className="h-5 w-5 text-zx-positive mb-1.5 flex-shrink-0" />
                : <TrendingDown className="h-5 w-5 text-red-400 mb-1.5 flex-shrink-0" />}
              <p className="font-zx-display font-bold leading-none"
                style={{ fontSize: 'clamp(2rem,8vw,3rem)', color: isPositive ? 'var(--zx-positive)' : 'var(--zx-accent)' }}>
                {isPositive ? '+' : ''}{fmtShort(stats.netCashFlow)}
                <span className="text-lg ml-1.5 font-normal text-zx-text-soft">₫</span>
              </p>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <span className="rounded-full bg-zx-positive-soft text-zx-positive text-xs font-medium px-3 py-1.5">
                ↑ {t('dashboard.cards.netCashFlow')} {fmtShort(stats.netCashFlow < 0 ? Math.abs(stats.netCashFlow) : stats.netCashFlow)}
              </span>
            </div>
          </>
        )}
      </section>

      <HL />

      {/* ── Latte Factor ── */}
      <section className="py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-zx-sm bg-zx-icon-bg flex items-center justify-center flex-shrink-0"
              style={{ color: 'var(--zx-accent)' }}>
              <Coffee className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm font-semibold text-zx-text">Latte Factor</p>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${latteDown ? 'bg-zx-positive-soft text-zx-positive' : 'bg-zx-accent-soft text-zx-accent'}`}>
            {latteDown ? '↓' : '↑'} {Math.abs(stats.latteFactorPercent).toFixed(0)}% vs tháng trước
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <p className="font-zx-display text-3xl font-bold text-zx-accent">
            {fmtShort(stats.latteFactor)}
          </p>
          <p className="text-sm text-zx-text-soft">₫ đang rò rỉ</p>
        </div>

        {/* Progress toward zero leak */}
        {stats.latteFactor > 0 && (
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-zx-surface-2 overflow-hidden">
              <div className="progress-fill h-full rounded-full"
                style={{ width: `${Math.min(100, 100 - (stats.latteFactorPercent || 0))}%` }} />
            </div>
            <p className="text-xs text-zx-text-soft mt-1.5">
              {latteDown ? 'Đang giảm — tiếp tục giữ nhịp.' : 'Tháng này tăng — cần chú ý hơn.'}
            </p>
          </div>
        )}

        {canAccess('latte_factor') && (
          <Link to="/latte"
            className="mt-4 flex items-center justify-between py-2 text-sm text-zx-text-soft hover:text-zx-accent transition">
            <span>Xem chi tiết theo nhóm</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </section>

      <HL />

      {/* ── Giao dịch gần đây ── */}
      <section className="py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft">
            Gần đây
          </p>
          {canAccess('transactions') && (
            <Link to="/transactions" className="text-xs text-zx-accent hover:opacity-80 transition">
              Tất cả →
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-zx-text-soft mb-3">Chưa có giao dịch nào.</p>
            {canAccess('add_transaction') && (
              <Link to="/transactions/new"
                className="inline-flex items-center gap-2 rounded-zx-sm bg-zx-accent px-4 py-2 text-sm font-medium text-zx-on-accent hover:opacity-90 transition">
                <Plus className="h-4 w-4" /> Thêm giao dịch đầu tiên
              </Link>
            )}
          </div>
        ) : (
          <div>
            {recent.map((tx, i) => (
              <div key={tx.id}>
                {i > 0 && <HL />}
                <div className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zx-text truncate">{tx.category}</p>
                    <p className="text-xs text-zx-text-soft mt-0.5">{formatDate(tx.date)}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className={`text-sm font-bold font-zx-display ${tx.type === 'income' ? 'text-zx-positive' : 'text-zx-text'}`}>
                      {tx.type === 'income' ? '+' : '-'}{fmtShort(tx.amount)}
                    </p>
                    {tx.isLatteFactor && (
                      <span className="text-[10px] text-zx-accent font-medium">Latte ✦</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <HL />

      {/* ── Quick actions ── */}
      <section className="pt-5">
        <div className="grid grid-cols-2 gap-2">
          {canAccess('add_transaction') && (
            <Link to="/transactions/new"
              className="flex items-center justify-center gap-2 rounded-zx-sm bg-zx-accent px-4 py-3 text-sm font-medium text-zx-on-accent hover:opacity-90 transition">
              <Plus className="h-4 w-4" /> Thêm giao dịch
            </Link>
          )}
          {canAccess('transactions') && (
            <Link to="/transactions"
              className="flex items-center justify-center gap-2 rounded-zx-sm border border-zx-line px-4 py-3 text-sm text-zx-text-soft hover:border-zx-accent hover:text-zx-text transition">
              Xem tất cả <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
