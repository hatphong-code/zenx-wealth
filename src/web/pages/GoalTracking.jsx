import { useEffect, useState } from 'react';
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../core/auth/useAuth';
import { useI18n } from '../../core/i18n/useI18n';
import { getGoalTracking, saveGoalCheckAction } from '../../core/services/goalTrackingService';
import { useNumberFormat } from '../../core/hooks/useNumberFormat';

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
  const [actionSaving, setActionSaving] = useState(false);
  const [actionDone, setActionDone] = useState(false);

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

  async function handleCheckAction(action) {
    if (!user || !data?.latestCheck?.id || actionSaving) return;
    setActionSaving(true);
    try {
      await saveGoalCheckAction(user.uid, data.latestCheck.id, action);
      setActionDone(true);
    } finally {
      setActionSaving(false);
    }
  }

  if (loading) {
    return <main className="p-10 text-center text-zx-text-soft">{t('common.loading')}</main>;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 md:px-8 py-6">
        <div className="rounded border border-zx-negative/40 bg-zx-negative/10 p-4 text-sm text-zx-negative">
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
          <p className="text-sm text-zx-text-soft">{t('goalTracking.subtitle')}</p>
        </div>
        <div className="rounded-zx border border-zx-line bg-zx-surface p-6 text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-zx-accent mb-3" />
          <p className="text-zx-text-soft">{t('goalTracking.noGoal')}</p>
          <a href="/settings" className="inline-block mt-3 text-sm text-zx-accent hover:opacity-80 transition">
            {t('goalTracking.goToSettings')}
          </a>
        </div>
      </main>
    );
  }

  const { fmt } = useNumberFormat();
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
            <p className="text-xs uppercase tracking-wide text-zx-text-soft mb-1">{t('common.progress')}</p>
            <p className="font-zx-display text-2xl font-bold text-zx-text">
              {progressPercent.toFixed(0)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-zx-text-soft mb-1">{t('goalTracking.remaining')}</p>
            <p className="font-zx-display text-2xl font-bold text-zx-accent">
              {fmt(Math.max(0, goalAmount - currentNetWorth), 'VND')}
            </p>
          </div>
        </div>

        <ProgressBar value={progressPercent} isOnTrack={isOnTrack} />

        <div className="grid grid-cols-3 gap-3 mt-6 text-center">
          <div>
            <p className="text-xs text-zx-text-soft">{t('goalTracking.current')}</p>
            <p className="font-mono text-sm font-semibold text-zx-text">{fmt(currentNetWorth, 'VND')}</p>
          </div>
          <div>
            <p className="text-xs text-zx-text-soft">{t('goalTracking.goal')}</p>
            <p className="font-mono text-sm font-semibold text-zx-text">{fmt(goalAmount, 'VND')}</p>
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
            {isOnTrack ? t('goalTracking.onTrack') : t('goalTracking.needsAcceleration')}
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-zx-text-soft mb-2">{t('goalTracking.weeklyNeeded')}</p>
            <p className="font-zx-display text-2xl font-bold text-zx-text">
              {fmt(weeklyTargetSavings, 'VND')}{t('goalTracking.perWeek')}
            </p>
          </div>

          <div className="h-px bg-zx-line" />

          <div>
            <p className="text-sm text-zx-text-soft mb-2">{t('goalTracking.weeklySaving')}</p>
            <div className="flex items-baseline gap-2">
              <p className="font-zx-display text-2xl font-bold" style={{
                color: estimatedWeeklySavings >= weeklyTargetSavings * 0.9 ? 'var(--zx-positive)' : 'var(--zx-accent)'
              }}>
                {fmt(estimatedWeeklySavings, 'VND')}
              </p>
              <p className="text-sm text-zx-text-soft">{t('goalTracking.perWeek')}</p>
            </div>
          </div>

          <div className="h-px bg-zx-line" />

          <div className="text-sm text-zx-text-soft">
            {isOnTrack ? (
              <p>{t('goalTracking.onTrackHint')}</p>
            ) : (
              <p>
                {t('goalTracking.needMore')}{' '}
                <span className="font-semibold text-zx-accent">
                  {fmt(weeklyTargetSavings - estimatedWeeklySavings, 'VND')}{t('goalTracking.perWeek')}
                </span>
                {' '}{t('goalTracking.toStayOnTrack')}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Goal Check History Card */}
      {data.latestCheck && !data.latestCheck.userAction && !actionDone && (
        <section className="rounded-zx border border-zx-line bg-zx-surface p-6 mt-6">
          <h2 className="font-zx-head font-semibold text-zx-text mb-2">{t('goalTracking.checkTitle')}</h2>
          <p className="text-sm text-zx-text-soft mb-1">
            {t('goalTracking.checkProgress', { pct: progress.progressPercent.toFixed(0) })}
          </p>
          <p className="text-sm text-zx-text-soft mb-4">
            {progress.isOnTrack ? t('goalTracking.checkOnTrackMsg') : t('goalTracking.checkOffTrackMsg')}
          </p>
          <div className="flex gap-3">
            <button onClick={() => handleCheckAction('adjust')} disabled={actionSaving}
              className="flex-1 rounded-zx-sm border border-zx-accent text-zx-accent py-2.5 text-sm font-medium hover:bg-zx-accent hover:text-zx-on-accent transition disabled:opacity-50">
              {t('goalTracking.checkAdjust')}
            </button>
            <button onClick={() => handleCheckAction('keep')} disabled={actionSaving}
              className="flex-1 rounded-zx-sm border border-zx-line text-zx-text-soft py-2.5 text-sm font-medium hover:border-zx-text hover:text-zx-text transition disabled:opacity-50">
              {t('goalTracking.checkKeep')}
            </button>
          </div>
        </section>
      )}

      {actionDone && (
        <div className="mt-6 rounded-zx-sm bg-zx-positive/10 border border-zx-positive/30 p-3 text-sm text-zx-positive text-center">
          {t('goalTracking.checkSaved')}
        </div>
      )}

      <div className="mt-6 text-center text-xs text-zx-text-soft">
        <p>{t('goalTracking.lastUpdated', { date: new Date(data.lastUpdated).toLocaleDateString('vi-VN') })}</p>
      </div>
    </main>
  );
}


