import { useEffect, useMemo, useState } from 'react';
import { Crown, Save, ShieldCheck, Sparkles } from 'lucide-react';
import AppNav from '../components/AppNav';
import { Button } from '../components/ui/button';
import { useAuth } from '../auth/useAuth';
import { featureCatalog, featureGroups, SUBSCRIPTION_TIERS } from '../data/accessControl';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useI18n } from '../i18n/useI18n';
import {
  getAccessControl,
  normalizeAccessControl,
  saveAccessControl,
  saveUserSubscriptionTier,
} from '../services/accessControlService';

function TierToggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className={`inline-flex h-7 w-12 items-center rounded-full p-1 transition ${checked ? 'bg-blue-600' : 'bg-[#0B1020]'}`}
    >
      <span className={`h-5 w-5 rounded-full bg-white transition ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

export default function AdminAccessControl() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { profile, accessControl, isAdmin, loading, subscriptionTier } = useFeatureAccess(user);
  const [form, setForm] = useState(() => normalizeAccessControl().features);
  const [saving, setSaving] = useState(false);
  const [tierSaving, setTierSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (accessControl?.features) {
      setForm(accessControl.features);
    } else {
      getAccessControl({ forceFresh: true }).then((value) => setForm(value.features));
    }
  }, [accessControl]);

  const groupedFeatures = useMemo(
    () => featureGroups
      .filter((group) => group.key !== 'admin')
      .map((group) => ({
        ...group,
        features: featureCatalog.filter((feature) => feature.group === group.key),
      })),
    []
  );

  const counts = useMemo(() => ({
    free: Object.values(form).filter((item) => item?.free).length,
    premium: Object.values(form).filter((item) => item?.premium).length,
  }), [form]);

  const updateFeature = (featureKey, tier) => {
    setForm((current) => ({
      ...current,
      [featureKey]: {
        ...current[featureKey],
        [tier]: !current[featureKey]?.[tier],
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await saveAccessControl({ features: form });
      setMessage(t('adminAccess.saveSuccess'));
    } catch (err) {
      setError(err.message || t('adminAccess.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleTierSwitch = async (tier) => {
    if (!user || !profile) return;
    setTierSaving(true);
    setError('');
    setMessage('');

    try {
      await saveUserSubscriptionTier(user.uid, profile, tier);
      setMessage(t('adminAccess.tierSwitchSuccess', { tier: tier === 'premium' ? t('common.premium') : t('common.free') }));
    } catch (err) {
      setError(err.message || t('adminAccess.tierSwitchError'));
    } finally {
      setTierSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      <AppNav />
      <main className="mx-auto max-w-7xl space-y-6 p-4 pb-24 md:p-6">
        <section className="rounded-2xl border border-[#1F2937] bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_38%),linear-gradient(180deg,#111827_0%,#0B1020_100%)] p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#1F2937] bg-[#111827] px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-blue-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t('adminAccess.badge')}
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('adminAccess.title')}</h1>
              <p className="max-w-3xl text-sm leading-6 text-gray-300">{t('adminAccess.subtitle')}</p>
              {loading && <p className="text-sm text-gray-400">{t('adminAccess.loading')}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#1F2937] bg-[#111827]/90 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">{t('adminAccess.freeEnabled')}</p>
                <p className="mt-2 text-2xl font-bold">{counts.free}</p>
              </div>
              <div className="rounded-xl border border-[#1F2937] bg-[#111827]/90 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">{t('adminAccess.premiumEnabled')}</p>
                <p className="mt-2 text-2xl font-bold">{counts.premium}</p>
              </div>
            </div>
          </div>
        </section>

        {!isAdmin ? (
          <section className="rounded-2xl border border-red-900 bg-red-950/30 p-5">
            <h2 className="text-lg font-semibold text-red-200">{t('adminAccess.noAccessTitle')}</h2>
            <p className="mt-2 text-sm text-red-100/90">{t('adminAccess.noAccessBody')}</p>
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-[#1F2937] bg-[#111827] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-sm text-gray-300">
                    <Crown className="h-4 w-4 text-amber-300" />
                    {t('adminAccess.previewTierTitle')}
                  </div>
                  <p className="text-sm text-gray-400">{t('adminAccess.previewTierBody')}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {SUBSCRIPTION_TIERS.map((tier) => {
                    const active = subscriptionTier === tier;
                    return (
                      <button
                        key={tier}
                        type="button"
                        disabled={tierSaving}
                        onClick={() => handleTierSwitch(tier)}
                        className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                          active
                            ? 'bg-blue-600 text-white'
                            : 'border border-[#1F2937] bg-[#0B1020] text-gray-300 hover:border-[#374151] hover:text-white'
                        }`}
                      >
                        {tier === 'premium' ? t('common.premium') : t('common.free')}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {groupedFeatures.map((group) => (
              <section key={group.key} className="rounded-2xl border border-[#1F2937] bg-[#111827] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-300" />
                  <h2 className="font-semibold">{t(`featureGroups.${group.key}`, {}, group.label)}</h2>
                </div>

                <div className="overflow-hidden rounded-xl border border-[#1F2937]">
                  <div className="grid grid-cols-[minmax(0,1fr)_96px_96px] border-b border-[#1F2937] bg-[#0B1020] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <div>{t('adminAccess.table.feature')}</div>
                    <div className="text-center">{t('adminAccess.table.free')}</div>
                    <div className="text-center">{t('adminAccess.table.premium')}</div>
                  </div>

                  {group.features.map((feature) => (
                    <div
                      key={feature.key}
                      className="grid grid-cols-[minmax(0,1fr)_96px_96px] items-center gap-3 border-b border-[#1F2937] px-4 py-4 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{t(`features.${feature.key}.label`, {}, feature.label)}</p>
                          <span className="rounded-full border border-[#1F2937] bg-[#0B1020] px-2 py-0.5 text-[11px] text-gray-400">
                            {feature.route}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-400">{t(`features.${feature.key}.description`, {}, feature.description)}</p>
                      </div>

                      <div className="flex justify-center">
                        <TierToggle checked={Boolean(form[feature.key]?.free)} onChange={() => updateFeature(feature.key, 'free')} />
                      </div>
                      <div className="flex justify-center">
                        <TierToggle checked={Boolean(form[feature.key]?.premium)} onChange={() => updateFeature(feature.key, 'premium')} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {error && <p className="rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
            {message && <p className="rounded-xl border border-green-900 bg-green-950/40 p-3 text-sm text-green-300">{message}</p>}

            <Button type="button" onClick={handleSave} disabled={saving} className="w-full bg-blue-600 text-white hover:bg-blue-700 md:w-auto">
              <Save className="mr-2 h-4 w-4" />
              {saving ? t('common.saving') : t('adminAccess.saveMatrix')}
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
