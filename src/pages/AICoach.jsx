import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import AppNav from '../components/AppNav';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAICoachData } from '../hooks/useAICoachData';
import { useI18n } from '../i18n/useI18n';

function toneClasses(tone) {
  if (tone === 'danger') return 'border-red-900 bg-red-950/35 text-red-200';
  if (tone === 'warning') return 'border-amber-900 bg-amber-950/35 text-amber-200';
  if (tone === 'good') return 'border-emerald-900 bg-emerald-950/35 text-emerald-200';
  return 'border-[#1F2937] bg-[#0B1020] text-gray-200';
}

function toneIcon(tone) {
  if (tone === 'danger') return ShieldAlert;
  if (tone === 'warning') return TriangleAlert;
  if (tone === 'good') return CheckCircle2;
  return Sparkles;
}

export default function AICoach() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { data, loading, refreshing, error } = useAICoachData(user?.uid);

  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      <AppNav />
      <main className="mx-auto max-w-7xl space-y-6 p-4 pb-24 md:p-6">
        <section className="overflow-hidden rounded-2xl border border-[#1F2937] bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.22),_transparent_42%),linear-gradient(180deg,#111827_0%,#0B1020_100%)] p-5 md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-900/70 bg-blue-950/40 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-blue-200">
                <BrainCircuit className="h-3.5 w-3.5" />
                {t('coach.badge')}
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('coach.title')}</h1>
              <p className="text-sm leading-6 text-gray-300 md:text-base">
                {t('coach.subtitle')}
              </p>
              <div className="rounded-xl border border-[#1F2937] bg-[#0B1020]/80 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">{t('coach.primaryFocus')}</p>
                <p className="mt-2 text-base font-semibold text-white md:text-lg">
                  {data.headline || t('coach.defaultHeadline')}
                </p>
              </div>
            </div>

            {data.focus && (
              <Link
                to={data.focus.route}
                className="flex min-w-[280px] items-center justify-between rounded-2xl border border-[#1F2937] bg-[#0B1020]/75 px-4 py-4 text-sm text-gray-200 transition hover:border-[#374151] hover:bg-[#111827]"
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{data.focus.priority}</p>
                  <p className="mt-1 font-semibold text-white">{data.focus.title}</p>
                  <p className="mt-1 text-gray-400">{data.focus.buttonLabel}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-500" />
              </Link>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {loading && <p className="text-gray-400">{t('coach.loading')}</p>}
            {refreshing && <p className="text-blue-300">{t('coach.refreshing')}</p>}
            {error && <p className="text-red-300">{error}</p>}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>{t('coach.signalsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.insights.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#1F2937] bg-[#0B1020] p-6 text-sm text-gray-400">
                  {t('coach.noGuidance')}
                </div>
              ) : (
                data.insights.map((item) => {
                  const Icon = toneIcon(item.tone);
                  return (
                    <article key={item.title} className={`rounded-xl border p-4 ${toneClasses(item.tone)}`}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-lg bg-black/15 p-2">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="space-y-2">
                          <h2 className="font-semibold">{item.title}</h2>
                          <p className="text-sm leading-6 opacity-90">{item.body}</p>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('coach.systemReadout')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-emerald-900 bg-emerald-950/25 p-4">
                <div className="mb-2 flex items-center gap-2 text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">{t('coach.wins')}</span>
                </div>
                <ul className="space-y-2 text-sm text-emerald-100/90">
                  {data.wins.length === 0 ? <li>{t('coach.noWins')}</li> : data.wins.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>

              <div className="rounded-xl border border-amber-900 bg-amber-950/25 p-4">
                <div className="mb-2 flex items-center gap-2 text-amber-200">
                  <CircleAlert className="h-4 w-4" />
                  <span className="font-medium">{t('coach.watchouts')}</span>
                </div>
                <ul className="space-y-2 text-sm text-amber-100/90">
                  {data.watchouts.length === 0 ? <li>{t('coach.noWatchouts')}</li> : data.watchouts.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {data.actions.map((item, index) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle>{t('coach.actionLabel', { index: index + 1 })}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{item.priority}</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">{item.title}</h2>
                </div>
                <p className="text-sm leading-6 text-gray-300">{item.body}</p>
                <Link
                  to={item.route}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#374151] px-3 py-2 text-sm text-gray-200 transition hover:bg-[#0B1020]"
                >
                  {item.buttonLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}

