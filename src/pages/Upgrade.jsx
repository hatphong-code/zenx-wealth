import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { Button } from '../components/ui/button';
import { formatMoney } from '../utils/formatters';
import {
  DEFAULT_PLAN_TEMPLATES,
  DEFAULT_PLANS,
  getPlans,
  getPlanTemplates,
  getSubscriptionStatus,
  startMomoCheckout,
} from '../services/billingService';

export default function Upgrade() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [templates, setTemplates] = useState(DEFAULT_PLAN_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState('');
  const [error, setError] = useState('');

  const successParam = searchParams.get('status') === 'success';

  useEffect(() => {
    if (!user) return;
    Promise.all([getSubscriptionStatus(user.uid), getPlans(), getPlanTemplates()])
      .then(([sub, p, tmpl]) => { setSubscription(sub); setPlans(p); setTemplates(tmpl); })
      .finally(() => setLoading(false));
  }, [user, successParam]);

  const handleCheckout = async (planId) => {
    if (!user) return;
    setPaying(planId);
    setError('');
    try {
      await startMomoCheckout({ plan: planId });
    } catch (err) {
      setError(err.message || t('upgrade.errors.paymentFailed'));
      setPaying('');
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-zx-gold/40 bg-amber-950/30 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zx-gold">
          <Sparkles className="h-3.5 w-3.5" />
          {t('upgrade.badge')}
        </div>
        <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('upgrade.title')}</h1>
        <p className="text-sm text-zx-text-soft max-w-xl">{t('upgrade.subtitle')}</p>
        {loading && <p className="text-sm text-zx-text-soft">{t('common.loading')}</p>}
      </div>

      {/* Success banner */}
      {successParam && !loading && subscription?.isActive && (
        <div className="flex items-center gap-3 rounded-zx border border-emerald-800 bg-emerald-950/30 p-4 text-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{t('upgrade.successTitle')}</p>
            <p className="text-sm opacity-80">{t('upgrade.successBody')}</p>
          </div>
        </div>
      )}

      {/* Active plan banner */}
      {subscription?.isActive && (
        <div className="rounded-zx border border-zx-gold/40 bg-amber-950/20 p-4 flex items-start gap-3">
          <Zap className="h-4 w-4 text-zx-gold flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-zx-gold text-sm">{t('upgrade.currentPlan')}</p>
            <p className="text-xs text-zx-text-soft mt-0.5">
              {t('upgrade.premiumActive')}
              {subscription.expiresAt && ` — ${t('upgrade.expiresOn', { date: subscription.expiresAt.toLocaleDateString('vi-VN') })}`}
            </p>
          </div>
        </div>
      )}

      {error && <div className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}

      {/* Plan comparison */}
      <section className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-4 lg:space-y-0">

        {/* Free plan */}
        <div className="rounded-zx border border-zx-line bg-zx-surface p-5 space-y-4">
          <div>
            <p className="font-zx-head text-base font-semibold text-zx-text">{templates.free.name}</p>
            <p className="text-xs text-zx-text-soft mt-1 leading-relaxed">{templates.free.description}</p>
            <p className="mt-3 font-zx-display text-2xl font-bold text-zx-text">
              {t('upgrade.freePrice')}
            </p>
          </div>
          <ul className="space-y-2">
            {templates.free.features.map(key => (
              <li key={key} className="flex items-center gap-2 text-sm text-zx-text-soft">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-zx-text-soft/60" />
                {t(`features.${key}.label`, {}, key)}
              </li>
            ))}
          </ul>
          {!subscription?.isActive && (
            <div className="rounded-zx-sm bg-zx-surface-2 border border-zx-line px-4 py-2.5 text-center text-xs font-medium text-zx-text-soft">
              {t('upgrade.currentFreePlan')}
            </div>
          )}
        </div>

        {/* Premium plan */}
        <div className="rounded-zx border border-zx-gold/50 bg-amber-950/10 p-5 space-y-4 relative">
          <div className="absolute -top-3 right-4 rounded-full bg-zx-gold px-3 py-0.5 text-xs font-semibold text-black">
            {t('upgrade.recommended')}
          </div>
          <div>
            <p className="font-zx-head text-base font-semibold text-zx-gold">{templates.premium.name}</p>
            <p className="text-xs text-zx-text-soft mt-1 leading-relaxed">{templates.premium.description}</p>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-2 gap-2">
            {Object.values(plans).map(plan => (
              <button key={plan.id} onClick={() => handleCheckout(plan.id)} disabled={!!paying}
                className={`relative rounded-zx-sm border p-3 text-left transition hover:opacity-90 disabled:opacity-50 ${
                  plan.id === 'yearly'
                    ? 'border-zx-gold/60 bg-zx-gold/10 hover:bg-zx-gold/20'
                    : 'border-zx-line bg-zx-surface hover:border-zx-accent'
                }`}>
                {plan.badge && (
                  <span className="absolute -top-2 right-2 rounded-full bg-zx-gold px-2 py-0.5 text-[10px] font-bold text-black">
                    {plan.badge}
                  </span>
                )}
                <p className="text-xs font-medium text-zx-text-soft mb-1">{plan.label}</p>
                <p className="font-zx-display text-lg font-bold text-zx-text">
                  {formatMoney(plan.amount, 'VND')}
                </p>
                <p className="text-xs text-zx-text-soft">{plan.durationLabel}</p>
                {paying === plan.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-zx-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-zx-text" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <ul className="space-y-2">
            {templates.premium.features.map(key => (
              <li key={key} className="flex items-center gap-2 text-sm text-zx-text-soft">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-zx-positive" />
                {t(`features.${key}.label`, {}, key)}
              </li>
            ))}
          </ul>

          {subscription?.isActive && (
            <div className="space-y-2">
              <p className="text-xs text-zx-text-soft">{t('upgrade.renewHint')}</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(plans).map(plan => (
                  <Button key={plan.id} onClick={() => handleCheckout(plan.id)} disabled={!!paying}
                    className={`${plan.id === 'yearly' ? 'bg-zx-gold text-black' : 'bg-zx-accent text-zx-on-accent'} hover:opacity-90 disabled:opacity-50`}>
                    {paying === plan.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : `${t('upgrade.renewButton')} — ${plan.label}`}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <p className="text-center text-xs text-zx-text-soft">{t('upgrade.momoNote')}</p>
    </main>
  );
}
