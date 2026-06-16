import { useMemo, useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { saveRoadmapPhase, setWealthRoadmapCache } from '../services/wealthRoadmapService';
import { useWealthRoadmapData } from '../hooks/useWealthRoadmapData';
import { useI18n } from '../i18n/useI18n';

export default function WealthRoadmap() {
  const { user } = useAuth();
  const { data, setData, loading, refreshing, error, setError } = useWealthRoadmapData(user?.uid);
  const [savingPhaseId, setSavingPhaseId] = useState('');
  const { t } = useI18n();

  const currentPhase = useMemo(
    () => data.phases.find((phase) => phase.id === data.currentPhaseId) || data.phases[0] || null,
    [data.currentPhaseId, data.phases]
  );

  const handleToggle = async (phaseId, itemKey, checked) => {
    if (!user) return;
    setSavingPhaseId(phaseId);
    setError('');

    try {
      const phase = data.phases.find((entry) => entry.id === phaseId);
      const nextPhases = data.phases.map((entry) => (
        entry.id !== phaseId
          ? entry
          : {
              ...entry,
              checklist: entry.checklist.map((item) => (
                item.key === itemKey ? { ...item, completed: checked, manualValue: checked } : item
              )),
            }
      )).map((entry) => ({
        ...entry,
        completed: entry.checklist.every((item) => item.completed),
      }));

      const nextCurrent = nextPhases.find((entry) => !entry.completed) || nextPhases[nextPhases.length - 1];
      const nextData = {
        ...data,
        phases: nextPhases,
        currentPhaseId: nextCurrent?.id || data.currentPhaseId,
        completedPhases: nextPhases.filter((entry) => entry.completed).length,
      };

      await saveRoadmapPhase(user.uid, phaseId, {
        checklist: {
          ...(phase?.checklist || []).reduce((acc, item) => {
            acc[item.key] = item.manualValue;
            return acc;
          }, {}),
          [itemKey]: checked,
        },
      }, nextData);

      setData(nextData);
      setWealthRoadmapCache(user.uid, nextData);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPhaseId('');
    }
  };

  return (
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8">
        <section className="pb-6">
          <div className="space-y-3">
            <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('roadmap.title')}</h1>
            <p className="max-w-2xl text-sm text-zx-text-soft">{t('roadmap.subtitle')}</p>
            <div className="flex flex-wrap gap-4 text-sm">
              {loading && <p className="text-zx-text-soft">{t('roadmap.loading')}</p>}
              {refreshing && <p className="text-zx-accent">{t('roadmap.refreshing')}</p>}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="py-4">
            <p className="text-sm text-zx-text-soft">{t('roadmap.stats.currentPhase')}</p>
            <p className="mt-2 text-lg font-semibold">{currentPhase ? t(`roadmap.phases.${currentPhase.id}`, {}, currentPhase.title) : t('roadmap.stats.notAvailable')}</p>
          </div>
          <div className="py-4">
            <p className="text-sm text-zx-text-soft">{t('roadmap.stats.completed')}</p>
            <p className="font-zx-display mt-2 text-2xl font-bold">{data.completedPhases} / {data.phases.length}</p>
          </div>
          <div className="py-4">
            <p className="text-sm text-zx-text-soft">{t('roadmap.stats.nextMilestone')}</p>
            <p className="mt-2 text-sm font-medium text-zx-text-soft">
              {(() => { const next = currentPhase?.checklist.find(i => !i.completed); return next ? t(`roadmap.checklist.${next.key}`, {}, next.label) : t('roadmap.stats.allDone'); })()}
            </p>
          </div>
        </section>

        {error && <p className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}

        <section className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-3">
            {data.phases.map((phase, index) => (
              <div
                key={phase.id}
                className={`rounded-zx-sm border px-4 py-3 text-sm ${
                  phase.id === data.currentPhaseId
                    ? 'border-zx-accent bg-zx-accent/10 text-zx-text'
                    : phase.completed
                      ? 'border-emerald-800 bg-emerald-950/30 text-emerald-200'
                      : 'border-zx-line bg-zx-surface text-zx-text-soft'
                }`}
              >
                <p className="text-xs uppercase tracking-wide text-zx-text-soft">{t('roadmap.phaseLabel', { index: index + 1 })}</p>
                <p className="mt-1 font-medium">{t(`roadmap.phases.${phase.id}`, {}, phase.title)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          {data.phases.map((phase) => (
            <article key={phase.id} className={`rounded-lg border p-5 ${phase.id === data.currentPhaseId ? 'border-zx-accent bg-zx-surface' : 'border-zx-line bg-zx-surface'}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="font-zx-head text-lg font-semibold text-zx-text">{t(`roadmap.phases.${phase.id}`, {}, phase.title)}</h2>
                    {phase.completed && <CheckCircle2 className="h-5 w-5 text-zx-positive" />}
                  </div>
                  <p className="text-sm text-zx-text-soft">{t(`roadmap.phaseDesc.${phase.id}`, {}, phase.description)}</p>
                </div>
                {savingPhaseId === phase.id && (
                  <div className="inline-flex items-center gap-2 rounded bg-zx-bg px-3 py-2 text-xs text-zx-accent">
                    <Save className="h-3.5 w-3.5" /> {t('roadmap.saving')}
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {phase.checklist.map((item) => (
                  <label key={item.key} className="flex items-start gap-3 rounded border border-zx-line bg-zx-bg p-3">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(event) => handleToggle(phase.id, item.key, event.target.checked)}
                      className="mt-1 h-4 w-4"
                    />
                    <span className="space-y-1">
                      <span className="block text-sm text-zx-text-soft">{t(`roadmap.checklist.${item.key}`, {}, item.label)}</span>
                      <span className="block text-xs text-zx-text-soft">
                        {item.autoValue ? t('roadmap.autoSignal') : t('roadmap.manualNeeded')}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </article>
          ))}
        </section>
      </main>
  );
}


