import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { Button } from '../components/ui/button';
import { formatMoney } from '../utils/formatters';
import { PLANS, getSubscriptionStatus, startMomoCheckout } from '../services/billingService';

const PREMIUM_FEATURES = [
  'pay_yourself_first', 'assets', 'trading_risk', 'reports',
  'ai_coach', 'settings', 'health_score',
];

export default function Upgrade() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState('');
  const [error, setError] = useState('');

  const successParam = searchParams.get('status') === 'success';

  useEffect(() => {
    if (!user) return;
    getSubscriptionStatus(user.uid)
      .then(setSubscription)
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
    <main className="mx-auto max-w-3xl px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-zx-gold/40 bg-amber-950/30 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zx-gold">
          <Sparkles className="h-3.5 w-3.5" />
          {t('upgrade.badge')}
        </div>
        <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('upgrade.title')}</h1>
        <p className="text-sm text-zx-text-soft">{t('upgrade.subtitle')}</p>
      </div>

      {loading && <p className="text-sm text-zx-text-soft">{t('common.loading')}</p>}

      {successParam && !loading && subscription?.isActive && (
        <div className="flex items-center gap-3 rounded-zx border border-emerald-800 bg-emerald-950/30 p-4 text-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{t('upgrade.successTitle')}</p>
            <p className="text-sm opacity-80">{t('upgrade.successBody')}</p>
          </div>
        </div>
      )}

      {subscription?.isActive ? (
        <div className="rounded-zx border border-zx-gold/40 bg-amber-950/20 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-zx-gold" />
            <span className="font-semibold text-zx-gold">{t('upgrade.currentPlan')}</span>
          </div>
          <p className="text-sm text-zx-text-soft">
            {t('upgrade.premiumActive')}
            {subscription.expiresAt && (
              <span> — {t('upgrade.expiresOn', { date: subscription.expiresAt.toLocaleDateString('vi-VN') })}</span>
            )}
          </p>
          <p className="mt-3 text-xs text-zx-text-soft">{t('upgrade.renewHint')}</p>
        </div>
      ) : null}

      {error && (
        <div className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        {Object.values(PLANS).map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-zx border p-5 space-y-4 ${plan.id === 'yearly' ? 'border-zx-gold/50 bg-amber-950/10' : 'border-zx-line bg-zx-surface'}`}
          >
            {plan.badge && (
              <div className="absolute -top-3 right-4 rounded-full bg-zx-gold px-3 py-0.5 text-xs font-semibold text-black">
                {plan.badge}
              </div>
            )}
            <div>
              <p className="font-semibold text-zx-text">{plan.label}</p>
              <p className="mt-1">
                <span className="font-zx-display text-2xl font-bold text-zx-text">{formatMoney(plan.amount, 'VND')}</span>
                <span className="ml-1 text-sm text-zx-text-soft">{plan.durationLabel}</span>
              </p>
            </div>
            <Button
              onClick={() => handleCheckout(plan.id)}
              disabled={!!paying}
              className={`w-full ${plan.id === 'yearly' ? 'bg-zx-gold text-black hover:opacity-90' : 'bg-zx-accent text-zx-on-accent hover:opacity-90'} disabled:opacity-50`}
            >
              {paying === plan.id ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('upgrade.redirecting')}</>
              ) : (
                t(subscription?.isActive ? 'upgrade.renewButton' : 'upgrade.payButton')
              )}
            </Button>
          </div>
        ))}
      </section>

      <section className="rounded-zx border border-zx-line bg-zx-surface p-5 space-y-3">
        <h2 className="font-semibold text-zx-text">{t('upgrade.featuresTitle')}</h2>
        <ul className="grid gap-2 md:grid-cols-2">
          {PREMIUM_FEATURES.map((key) => (
            <li key={key} className="flex items-center gap-2 text-sm text-zx-text-soft">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-zx-positive" />
              {t(`features.${key}.label`, {}, key)}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center text-xs text-zx-text-soft">{t('upgrade.momoNote')}</p>
    </main>
  );
}
