import { useEffect, useState } from 'react';
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { getGoalTracking } from '../services/goalTrackingService';
import { fmtShort } from '../utils/formatters';

function ProgressBar({ value, isOnTrack }) {
  const color = isOnTrack ? 'bg-zx-positive' : value >= 80 ? 'bg-zx-accent' : value >= 50 ? 'bg-zx-gold' : 'bg-red-500';
  return (
    <div className="h-2 rounded-full bg-zx-surface-2 overflow-hidden">
      <div className={`${color} h-full rounded-full transition-all duration-300`} style={{ width: `${value}%` }} />
    </div>
  );
}

export default function GoalTracking() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      try {
        const result = await getGoalTracking(user.uid);
        if (!active) return;
        setData(result);
        setError('');
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Failed to load goal');
      } finally {
        if (!active) return;
        setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [user]);

  if (loading) {
    return <main className="p-10 text-center text-zx-text-soft">Đang tải...</main>;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 md:px-8 py-6">
        <div className="rounded border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          {error}
        </div>
      </main>
    );
  }

  if (!data?.progress) {
    return (
      <main className="mx-auto max-w-2xl px-4 md:px-8 py-6 pb-24 md:pb-8">
        <div className="space-y-2 mb-6">
          <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('goalTracking.title')}</h1>
          <p className="text-sm text-zx-text-soft">Đặt mục tiêu tài chính trong Settings để theo dõi tiến độ.</p>
        </div>
        <div className="rounded-zx border border-zx-line bg-zx-surface p-6 text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-zx-accent mb-3" />
          <p className="text-zx-text-soft">Chưa có mục tiêu được đặt.</p>
          <a href="/settings" className="inline-block mt-3 text-sm text-zx-accent hover:opacity-80 transition">
            Đi tới Settings →
          </a>
        </div>
      </main>
    );
  }

  const { progress } = data;
  const { goalAmount, currentNetWorth, progressPercent, weeksLeft, weeklyTargetSavings, estimatedWeeklySavings, isOnTrack, goalText } = progress;

  return (
    <main className="mx-auto max-w-2xl px-4 md:px-8 py-6 pb-24 md:pb-8">
      <div className="space-y-2 mb-6">
        <h1 className="font-zx-head text-2xl font-bold text-zx-text">
          {isOnTrack ? '✓' : '⚠'} {t('goalTracking.title')}
        </h1>
        <p className="text-sm text-zx-text-soft">{goalText}</p>
      </div>

      {/* Goal Overview */}
      <section className="rounded-zx border border-zx-line bg-zx-surface p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zx-text-soft mb-1">Tiến độ</p>
            <p className="font-zx-display text-2xl font-bold text-zx-text">
              {progressPercent.toFixed(0)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-zx-text-soft mb-1">Còn lại</p>
            <p className="font-zx-display text-2xl font-bold text-zx-accent">
              {fmtShort(Math.max(0, goalAmount - currentNetWorth))}
            </p>
          </div>
        </div>

        <ProgressBar value={progressPercent} isOnTrack={isOnTrack} />

        <div className="grid grid-cols-3 gap-3 mt-6 text-center">
          <div>
            <p className="text-xs text-zx-text-soft">Hiện tại</p>
            <p className="font-mono text-sm font-semibold text-zx-text">{fmtShort(currentNetWorth)}</p>
          </div>
          <div>
            <p className="text-xs text-zx-text-soft">Mục tiêu</p>
            <p className="font-mono text-sm font-semibold text-zx-text">{fmtShort(goalAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-zx-text-soft">{t('goalTracking.weeksLeft')}</p>
            <p className="font-mono text-sm font-semibold text-zx-accent">{weeksLeft}</p>
          </div>
        </div>
      </section>

      {/* Weekly Trajectory */}
      <section className="rounded-zx border border-zx-line bg-zx-surface p-6">
        <div className="flex items-center gap-2 mb-4">
          {isOnTrack ? (
            <CheckCircle className="h-5 w-5 text-zx-positive" />
          ) : (
            <AlertCircle className="h-5 w-5 text-zx-accent" />
          )}
          <h2 className="font-zx-head font-semibold text-zx-text">
            {isOnTrack ? 'Đang theo đúng kế hoạch' : 'Cần tăng tốc'}
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-zx-text-soft mb-2">Tiền cần tiết kiệm mỗi tuần</p>
            <p className="font-zx-display text-2xl font-bold text-zx-text">
              {fmtShort(weeklyTargetSavings)}/tuần
            </p>
          </div>

          <div className="h-px bg-zx-line" />

          <div>
            <p className="text-sm text-zx-text-soft mb-2">Tiền bạn hiện tiết kiệm mỗi tuần</p>
            <div className="flex items-baseline gap-2">
              <p className="font-zx-display text-2xl font-bold" style={{
                color: estimatedWeeklySavings >= weeklyTargetSavings * 0.9 ? 'var(--zx-positive)' : 'var(--zx-accent)'
              }}>
                {fmtShort(estimatedWeeklySavings)}
              </p>
              <p className="text-sm text-zx-text-soft">/tuần</p>
            </div>
          </div>

          <div className="h-px bg-zx-line" />

          <div className="text-sm text-zx-text-soft">
            {isOnTrack ? (
              <p>✓ Bạn đang tiết kiệm đủ để đạt mục tiêu. Giữ nhịp!</p>
            ) : (
              <p>
                Cần tăng tiết kiệm thêm{' '}
                <span className="font-semibold text-zx-accent">
                  {fmtShort(weeklyTargetSavings - estimatedWeeklySavings)}/tuần
                </span>
                {' '}để theo đúng kế hoạch.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="mt-6 text-center text-xs text-zx-text-soft">
        <p>Cập nhật lần cuối: {new Date(data.lastUpdated).toLocaleDateString('vi-VN')}</p>
      </div>
    </main>
  );
}
