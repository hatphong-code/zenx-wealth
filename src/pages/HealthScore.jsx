import { Activity } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useReportsData } from '../hooks/useReportsData';
import { computeHealthScore } from '../services/healthScoreService';
import { formatMoney } from '../utils/formatters';

const GRADE_RING_COLOR = {
  'A+': 'text-emerald-400',
  'A':  'text-emerald-300',
  'B':  'text-blue-300',
  'C':  'text-amber-300',
  'D':  'text-orange-400',
  'F':  'text-red-400',
};

const PILLAR_BAR_COLOR = (score, max) => {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.8) return 'bg-emerald-500';
  if (pct >= 0.6) return 'bg-blue-500';
  if (pct >= 0.4) return 'bg-amber-500';
  return 'bg-red-500';
};

function ScoreRing({ total, grade }) {
  const gradeColor = GRADE_RING_COLOR[grade] || 'text-zx-text-soft';
  const pct = total / 100;
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" strokeWidth="10" className="stroke-zx-surface-2" />
        <circle
          cx="70" cy="70" r={r} fill="none" strokeWidth="10"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          className={`transition-all duration-700 ${
            total >= 80 ? 'stroke-emerald-400'
            : total >= 60 ? 'stroke-blue-400'
            : total >= 40 ? 'stroke-amber-400'
            : 'stroke-red-400'
          }`}
        />
        <text x="70" y="70" textAnchor="middle" dominantBaseline="middle" className="rotate-90" style={{ fill: 'var(--zx-text)', fontFamily: 'var(--zx-font-display)', fontSize: '28px', fontWeight: 700, transform: 'rotate(90deg)', transformOrigin: '70px 70px' }}>
          {total}
        </text>
      </svg>
      <span className={`text-3xl font-bold font-zx-head ${gradeColor}`}>{grade}</span>
    </div>
  );
}

function PillarRow({ pillar, hints, pillarLabel, currency, t }) {
  const pct = pillar.max > 0 ? (pillar.score / pillar.max) * 100 : 0;
  const barColor = PILLAR_BAR_COLOR(pillar.score, pillar.max);

  let valueLabel = '';
  if (pillar.key === 'cashFlow') valueLabel = formatMoney(pillar.value, currency);
  else if (pillar.key === 'savings') valueLabel = `${Math.round(pillar.value * 100)}%`;
  else if (pillar.key === 'emergency') valueLabel = `${pillar.value.toFixed(1)} ${t('common.months')}`;
  else if (pillar.key === 'debt') valueLabel = `${Math.round(pillar.value * 100)}%`;
  else if (pillar.key === 'consistency') valueLabel = `${pillar.value}/6 ${t('common.months')}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-zx-text">{pillarLabel}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zx-text-soft">{valueLabel}</span>
          <span className="font-mono font-semibold text-zx-text">{pillar.score}<span className="text-xs text-zx-text-soft font-normal">/{pillar.max}</span></span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-zx-surface-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {hints && <p className="text-xs text-zx-text-soft">{hints}</p>}
    </div>
  );
}

export default function HealthScore() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { data, loading, refreshing, error } = useReportsData(user?.uid);
  const scoreData = computeHealthScore(data);

  const gradeDesc = t(`healthScore.gradeDescriptions.${scoreData.grade}`, {}, '');

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-6">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-zx-line px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zx-text-soft">
          <Activity className="h-3.5 w-3.5" />
          {t('healthScore.badge')}
        </div>
        <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('healthScore.title')}</h1>
        <p className="text-sm text-zx-text-soft">{t('healthScore.subtitle')}</p>
        {loading && <p className="text-xs text-zx-text-soft">{t('healthScore.loading')}</p>}
        {refreshing && <p className="text-xs text-zx-accent">{t('common.loading')}</p>}
      </div>

      {error && <div className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}

      <div className="grid gap-5 md:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center justify-center p-6 min-w-[180px]">
          <CardContent className="flex flex-col items-center gap-4 p-0">
            <ScoreRing total={scoreData.total} grade={scoreData.grade} />
            <div className="text-center">
              <p className="text-xs text-zx-text-soft uppercase tracking-wide">{t('healthScore.gradeLabel')}</p>
              {gradeDesc && <p className="mt-1 text-sm text-zx-text leading-5 max-w-[160px]">{gradeDesc}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('healthScore.fivePillars')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {scoreData.pillars.map((pillar) => (
              <PillarRow
                key={pillar.key}
                pillar={pillar}
                pillarLabel={t(`healthScore.pillars.${pillar.key}`, {}, pillar.key)}
                hints={t(`healthScore.pillarHints.${pillar.key}`, {}, '')}
                currency={data.currency}
                t={t}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('healthScore.totalScoreLabel', { score: scoreData.total })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {scoreData.pillars.map((pillar) => {
              const pct = pillar.max > 0 ? pillar.score / pillar.max : 0;
              const isWeak = pct < 0.5;
              return (
                <div key={pillar.key} className={`rounded-lg border px-4 py-3 text-center min-w-[90px] ${
                  isWeak ? 'border-amber-900 bg-amber-950/25' : 'border-zx-line bg-zx-bg'
                }`}>
                  <p className="text-lg font-bold text-zx-text font-mono">{pillar.score}</p>
                  <p className="text-[10px] text-zx-text-soft uppercase tracking-wide mt-0.5">/ {pillar.max}</p>
                  {isWeak && <p className="text-[10px] text-amber-300 mt-1">{t('healthScore.improvement')}</p>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
