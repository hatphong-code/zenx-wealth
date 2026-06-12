import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore/lite';
import { ArrowRight, Coffee, Plus, TrendingDown, TrendingUp, X } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useTransactionsData } from '../hooks/useTransactionsData';
import { useEmergencyFundData } from '../hooks/useEmergencyFundData';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { db } from '../services/firebaseDb';
import { invalidateDashboardStatsCache } from '../services/dashboardService';
import { setEmergencyFundCache } from '../services/emergencyFundService';
import { fmtShort, formatDate, formatMoney } from '../utils/formatters';

function HL() { return <div className="h-px bg-zx-line" />; }

/* ── Latte → Convert bottom sheet ── */
function ConvertSheet({ latteTotal, currency, emergencyData, userId, onClose, onSuccess }) {
  const { settings, records } = emergencyData;
  const [amount, setAmount] = useState(Math.round(latteTotal * 0.5));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currentBalance = records.reduce((s, r) => s + Number(r.amount || 0), 0);
  const newBalance = currentBalance + amount;
  const newMonths = settings.monthlyEssentialExpense > 0 ? newBalance / settings.monthlyEssentialExpense : 0;

  const handleConfirm = async () => {
    if (!amount || amount <= 0) { setError('Nhập số tiền hợp lệ.'); return; }
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const record = {
        amount: Number(amount),
        currency,
        date: Timestamp.fromDate(new Date(`${today}T00:00:00`)),
        note: 'Chuyển từ Latte Factor',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'users', userId, 'emergencyFund'), record);
      const nextData = {
        ...emergencyData,
        records: [{ id: ref.id, ...record }, ...records],
      };
      setEmergencyFundCache(userId, nextData);
      invalidateDashboardStatsCache(userId);
      onSuccess({ amount, newMonths });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const presets = [
    Math.round(latteTotal * 0.3),
    Math.round(latteTotal * 0.5),
    Math.round(latteTotal),
  ].filter((v, i, a) => a.indexOf(v) === i && v > 0);

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 inset-x-0 bg-zx-surface rounded-t-zx border-t border-zx-line zx-transition"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <div className="w-8 h-1 rounded-full bg-zx-line mx-auto mb-3" />
            <p className="font-zx-head font-semibold text-base text-zx-text">
              Chuyển vào quỹ dự phòng
            </p>
            <p className="text-xs text-zx-text-soft mt-0.5">
              Từ Latte Factor tháng này
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zx-surface-2 transition text-zx-text-soft">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Amount input */}
          <div>
            <p className="text-xs font-medium text-zx-text-soft mb-2">Số tiền (₫)</p>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full border border-zx-line bg-zx-surface-2 rounded-zx-sm px-4 py-3 font-zx-display text-xl font-bold text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
            />
            {/* Preset buttons */}
            <div className="flex gap-2 mt-2">
              {presets.map(p => (
                <button key={p} onClick={() => setAmount(p)}
                  className={`flex-1 text-xs py-1.5 rounded-full border transition ${
                    amount === p ? 'border-zx-accent bg-zx-accent-soft text-zx-accent font-semibold' : 'border-zx-line text-zx-text-soft'
                  }`}>
                  {fmtShort(p)}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-zx-sm bg-zx-surface-2 p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-zx-text-soft">Quỹ hiện tại</span>
              <span className="font-medium text-zx-text">{fmtShort(currentBalance)} ₫</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zx-text-soft">Sau khi nạp</span>
              <span className="font-semibold text-zx-positive">{fmtShort(newBalance)} ₫</span>
            </div>
            <HL />
            <div className="flex justify-between text-sm">
              <span className="text-zx-text-soft">Số tháng được bảo vệ</span>
              <span className="font-zx-display font-bold text-zx-positive">
                {newMonths.toFixed(1)} tháng
              </span>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button onClick={handleConfirm} disabled={saving || !amount}
            className="w-full flex items-center justify-center gap-2 rounded-zx-sm bg-zx-accent py-3.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 transition disabled:opacity-50">
            {saving ? 'Đang lưu...' : `Chuyển ${fmtShort(amount)} ₫ →`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Success state ── */
function ConvertSuccess({ amount, newMonths, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:hidden">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full bg-zx-surface rounded-t-zx border-t border-zx-line p-6 text-center"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
        <div className="text-3xl mb-2">✦</div>
        <p className="font-zx-head text-lg font-semibold text-zx-positive">Đã chuyển thành công!</p>
        <p className="text-sm text-zx-text-soft mt-1">
          <span className="font-semibold text-zx-text">{fmtShort(amount)} ₫</span> từ Latte Factor → Quỹ dự phòng
        </p>
        <p className="text-sm text-zx-text-soft mt-1">
          Quỹ của bạn giờ có <span className="font-semibold text-zx-positive">{newMonths.toFixed(1)} tháng</span> bảo vệ.
        </p>
        <button onClick={onClose}
          className="mt-4 w-full rounded-zx-sm bg-zx-surface-2 py-3 text-sm font-medium text-zx-text-soft hover:text-zx-text transition">
          Đóng
        </button>
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function TrackHub() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { canAccess } = useFeatureAccess(user);
  const { stats, loading } = useDashboardStats(user?.uid);
  const { data: txData } = useTransactionsData(user?.uid);
  const { data: emergencyData } = useEmergencyFundData(user?.uid);
  const currency = stats.currency || 'VND';

  const [showConvert, setShowConvert] = useState(false);
  const [convertResult, setConvertResult] = useState(null);

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
                ↑ Dòng tiền ròng
              </span>
            </div>
          </>
        )}
      </section>

      <HL />

      {/* ── Latte Factor ── */}
      <section className="py-6">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-zx-sm bg-zx-icon-bg flex items-center justify-center flex-shrink-0"
              style={{ color: 'var(--zx-accent)' }}>
              <Coffee className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm font-semibold text-zx-text">Latte Factor</p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
            latteDown ? 'bg-zx-positive-soft text-zx-positive' : 'bg-zx-accent-soft text-zx-accent'
          }`}>
            {latteDown ? '↓' : '↑'} {Math.abs(stats.latteFactorPercent).toFixed(0)}% vs tháng trước
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <p className="font-zx-display text-3xl font-bold text-zx-accent">
            {fmtShort(stats.latteFactor)}
          </p>
          <p className="text-sm text-zx-text-soft">₫ đang rò rỉ</p>
        </div>

        {stats.latteFactor > 0 && (
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-zx-surface-2 overflow-hidden">
              <div className="progress-fill h-full rounded-full"
                style={{ width: `${Math.max(5, 100 - Math.min(100, (stats.latteFactor / 10000000) * 100))}%` }} />
            </div>
            <p className="text-xs text-zx-text-soft mt-1.5">
              {latteDown ? 'Đang giảm — tiếp tục giữ nhịp.' : 'Tháng này tăng — cần kiểm soát.'}
            </p>
          </div>
        )}

        {/* CTA: Convert to emergency fund */}
        {stats.latteFactor > 0 && canAccess('emergency_fund') && (
          <button
            onClick={() => setShowConvert(true)}
            className="mt-4 w-full flex items-center justify-between rounded-zx-sm bg-zx-accent-soft border border-zx-accent/30 px-4 py-3 text-sm font-medium text-zx-accent hover:opacity-80 transition">
            <span>Chuyển vào quỹ dự phòng</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {canAccess('latte_factor') && (
          <Link to="/latte"
            className="mt-2 flex items-center justify-between py-2 text-sm text-zx-text-soft hover:text-zx-accent transition">
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
          <div className="text-center py-4">
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
                    <p className={`text-sm font-bold font-zx-display ${
                      tx.type === 'income' ? 'text-zx-positive' : 'text-zx-text'
                    }`}>
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

      {/* Convert bottom sheet */}
      {showConvert && !convertResult && (
        <ConvertSheet
          latteTotal={stats.latteFactor}
          currency={currency}
          emergencyData={emergencyData}
          userId={user.uid}
          onClose={() => setShowConvert(false)}
          onSuccess={(result) => { setShowConvert(false); setConvertResult(result); }}
        />
      )}

      {/* Success state */}
      {convertResult && (
        <ConvertSuccess
          amount={convertResult.amount}
          newMonths={convertResult.newMonths}
          onClose={() => setConvertResult(null)}
        />
      )}
    </div>
  );
}
