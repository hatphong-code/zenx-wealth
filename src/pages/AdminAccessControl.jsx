import { useEffect, useMemo, useState } from 'react';
import { Crown, Save, Settings2, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
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
import { getApiSettings, saveApiSettings } from '../services/adminSettingsService';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { db } from '../services/firebaseDb';
import { DEFAULT_PLAN_TEMPLATES, invalidatePlansCache } from '../services/billingService';
import { setUserProfileCache } from '../services/userService';
import { budgetTemplates as HARDCODED_TEMPLATES } from '../data/budgetTemplates';
import { getBudgetTemplates, saveBudgetTemplates } from '../services/budgetTemplatesService';

/* ── Reusable pieces ── */
function TierToggle({ checked, onChange }) {
  return (
    <button type="button" onClick={onChange} aria-pressed={checked}
      className={`inline-flex h-7 w-12 items-center rounded-full p-1 transition ${checked ? 'bg-zx-accent' : 'bg-zx-bg border border-zx-line'}`}>
      <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium rounded-t-md transition border-b-2 ${
        active
          ? 'border-zx-accent text-zx-accent bg-zx-surface'
          : 'border-transparent text-zx-text-soft hover:text-zx-text hover:border-zx-line'
      }`}>
      {children}
    </button>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
        active ? 'bg-zx-accent text-zx-on-accent' : 'border border-zx-line text-zx-text-soft hover:text-zx-text'
      }`}>
      {children}
    </button>
  );
}

const CLAUDE_MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fast)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (balanced)' },
  { value: 'claude-opus-4-8', label: 'Claude Opus 4.8 (best)' },
];

/* ── Tab: Features ── */
function FeaturesTab({ form, updateFeature, groupedFeatures, saving, handleSave, error, message, t }) {
  const [groupFilter, setGroupFilter] = useState('all');

  const visibleGroups = useMemo(() =>
    groupFilter === 'all'
      ? groupedFeatures
      : groupedFeatures.filter(g => g.key === groupFilter),
    [groupFilter, groupedFeatures]
  );

  const counts = useMemo(() => ({
    free: Object.values(form).filter(item => item?.free).length,
    premium: Object.values(form).filter(item => item?.premium).length,
  }), [form]);

  return (
    <div className="space-y-4">
      {/* Stats + group filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zx-text-soft">
            {t('adminAccess.freeEnabled')}: <strong className="text-zx-text">{counts.free}</strong>
          </span>
          <span className="h-4 w-px bg-zx-line" />
          <span className="text-zx-text-soft">
            {t('adminAccess.premiumEnabled')}: <strong className="text-zx-text">{counts.premium}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Pill active={groupFilter === 'all'} onClick={() => setGroupFilter('all')}>
            {t('transactions.all')}
          </Pill>
          {groupedFeatures.map(g => (
            <Pill key={g.key} active={groupFilter === g.key} onClick={() => setGroupFilter(g.key)}>
              {t(`featureGroups.${g.key}`, {}, g.label)}
            </Pill>
          ))}
        </div>
      </div>

      {/* Feature tables */}
      {visibleGroups.map(group => (
        <div key={group.key} className="rounded-zx border border-zx-line overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-zx-surface border-b border-zx-line">
            <Sparkles className="h-3.5 w-3.5 text-zx-accent" />
            <h3 className="text-sm font-semibold text-zx-text">{t(`featureGroups.${group.key}`, {}, group.label)}</h3>
            <span className="text-xs text-zx-text-soft ml-1">({group.features.length})</span>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_88px_88px] bg-zx-bg border-b border-zx-line px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-zx-text-soft">
            <div>{t('adminAccess.table.feature')}</div>
            <div className="text-center">{t('adminAccess.table.free')}</div>
            <div className="text-center">{t('adminAccess.table.premium')}</div>
          </div>

          {group.features.map((feature, i) => (
            <div key={feature.key}
              className={`grid grid-cols-[minmax(0,1fr)_88px_88px] items-center gap-2 px-4 py-3 ${
                i < group.features.length - 1 ? 'border-b border-zx-line' : ''
              } hover:bg-zx-surface-2/40 transition`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-zx-text">
                    {t(`features.${feature.key}.label`, {}, feature.label)}
                  </p>
                  <span className="rounded-full border border-zx-line bg-zx-bg px-2 py-0.5 text-[10px] font-mono text-zx-text-soft">
                    {feature.route}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-zx-text-soft leading-relaxed">
                  {t(`features.${feature.key}.description`, {}, feature.description)}
                </p>
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
      ))}

      {error && <p className="rounded-zx-sm border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative">{error}</p>}
      {message && <p className="rounded-zx-sm border border-green-900 bg-green-950/40 p-3 text-sm text-zx-positive">{message}</p>}

      <Button type="button" onClick={handleSave} disabled={saving}
        className="bg-zx-accent text-zx-on-accent hover:opacity-90">
        <Save className="mr-2 h-4 w-4" />
        {saving ? t('common.saving') : t('adminAccess.saveMatrix')}
      </Button>
    </div>
  );
}

/* ── Tab: Preview Plan ── */
function PreviewTab({ subscriptionTier, handleTierSwitch, tierSaving, handleResetOnboarding, resetting, t }) {
  return (
    <div className="max-w-lg space-y-4">
      <div className="rounded-zx border border-zx-line bg-zx-surface p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm text-zx-text-soft">
          <Crown className="h-4 w-4 text-zx-gold" />
          <span className="font-medium text-zx-text">{t('adminAccess.previewTierTitle')}</span>
        </div>
        <p className="text-sm text-zx-text-soft">{t('adminAccess.previewTierBody')}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {SUBSCRIPTION_TIERS.map(tier => (
            <button key={tier} type="button" disabled={tierSaving} onClick={() => handleTierSwitch(tier)}
              className={`rounded-zx-sm px-5 py-2.5 text-sm font-semibold transition ${
                subscriptionTier === tier
                  ? 'bg-zx-accent text-zx-on-accent'
                  : 'border border-zx-line text-zx-text-soft hover:text-zx-text hover:border-zx-accent'
              }`}>
              {tier === 'premium' ? t('common.premium') : t('common.free')}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-zx-text-soft px-1">
        {t('adminAccess.previewNote')}
      </p>

      {/* Reset Onboarding */}
      <div className="rounded-zx border border-zx-line bg-zx-surface p-5 space-y-3">
        <span className="font-medium text-zx-text text-sm">{t('adminAccess.resetOnboardingTitle')}</span>
        <p className="text-sm text-zx-text-soft">{t('adminAccess.resetOnboardingBody')}</p>
        <button type="button" disabled={resetting} onClick={handleResetOnboarding}
          className="rounded-zx-sm border border-zx-negative/40 bg-zx-negative/10 px-5 py-2.5 text-sm font-semibold text-zx-negative hover:bg-zx-negative/20 transition disabled:opacity-60">
          {resetting ? t('adminAccess.resetting') : t('adminAccess.resetOnboardingBtn')}
        </button>
      </div>
    </div>
  );
}

/* ── Tab: API & Config ── */
function StatusRow({ ok, label, sub }) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${ok ? 'bg-zx-positive text-zx-on-accent' : 'bg-zx-surface-2 border border-zx-line text-zx-text-soft'}`}>
        {ok ? '✓' : '–'}
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-medium ${ok ? 'text-zx-text' : 'text-zx-text-soft'}`}>{label}</p>
        {sub && <p className="text-xs text-zx-text-soft mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ApiTab({ t }) {
  const [form, setForm] = useState({ claudeApiKey: '', claudeModel: 'claude-haiku-4-5-20251001', resendApiKey: '', emailFrom: '', emailFromName: 'ZenX Wealth' });
  const [configured, setConfigured] = useState({ claudeKey: false, resendKey: false, emailFrom: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showKeys, setShowKeys] = useState({});

  useEffect(() => {
    getApiSettings()
      .then(s => {
        setForm(prev => ({
          ...prev,
          claudeModel: s.claudeModel || prev.claudeModel,
          emailFrom: s.emailFrom || '',
          emailFromName: s.emailFromName || 'ZenX Wealth',
        }));
        setConfigured({
          claudeKey: Boolean(s.claudeApiKey),
          resendKey: Boolean(s.resendApiKey),
          emailFrom: Boolean(s.emailFrom),
        });
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleShow = (k) => setShowKeys(p => ({ ...p, [k]: !p[k] }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMessage(''); setError('');
    try {
      const updates = { claudeModel: form.claudeModel, emailFrom: form.emailFrom, emailFromName: form.emailFromName };
      if (form.claudeApiKey.trim()) updates.claudeApiKey = form.claudeApiKey.trim();
      if (form.resendApiKey.trim()) updates.resendApiKey = form.resendApiKey.trim();
      await saveApiSettings(updates);
      setConfigured(prev => ({
        claudeKey: prev.claudeKey || Boolean(form.claudeApiKey.trim()),
        resendKey: prev.resendKey || Boolean(form.resendApiKey.trim()),
        emailFrom: Boolean(form.emailFrom),
      }));
      setMessage(t('adminSettings.saveSuccess'));
      setForm(p => ({ ...p, claudeApiKey: '', resendApiKey: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-zx-text-soft">{t('common.loading')}</p>;

  const inputCls = 'w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-2.5 text-sm text-zx-text outline-none focus:ring-2 focus:ring-zx-accent';
  const labelCls = 'text-xs font-semibold uppercase tracking-[0.1em] text-zx-text-soft mb-1.5 block';

  const selectedModel = CLAUDE_MODELS.find(m => m.value === form.claudeModel);

  return (
    <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-8 lg:items-start">

      {/* LEFT: Form */}
      <form onSubmit={handleSave} className="space-y-5">
        {error && <p className="rounded-zx-sm border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative">{error}</p>}
        {message && <p className="rounded-zx-sm border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">{message}</p>}

        {/* Claude section */}
        <div className="rounded-zx border border-zx-line bg-zx-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft">{t('adminSettings.claudeSection')}</p>
            <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer"
              className="text-xs text-zx-accent hover:opacity-80">console.anthropic.com ↗</a>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className={labelCls}>{t('adminSettings.claudeKeyLabel')}</label>
              <div className="relative">
                <input type={showKeys.claude ? 'text' : 'password'} value={form.claudeApiKey}
                  onChange={e => set('claudeApiKey', e.target.value)}
                  placeholder={configured.claudeKey ? '(set — leave blank to keep)' : 'sk-ant-api03-…'}
                  className={`${inputCls} pr-10 font-mono text-xs`} />
                <button type="button" onClick={() => toggleShow('claude')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-zx-text-soft hover:text-zx-text uppercase tracking-wide">
                  {showKeys.claude ? 'hide' : 'show'}
                </button>
              </div>
            </div>
            {configured.claudeKey && (
              <span className="mb-0.5 text-xs text-zx-positive font-medium whitespace-nowrap">✓ set</span>
            )}
          </div>

          <div>
            <label className={labelCls}>{t('adminSettings.claudeModelLabel')}</label>
            <select value={form.claudeModel} onChange={e => set('claudeModel', e.target.value)} className={inputCls}>
              {CLAUDE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {/* Email section */}
        <div className="rounded-zx border border-zx-line bg-zx-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft">{t('adminSettings.emailSection')}</p>
            <a href="https://resend.com" target="_blank" rel="noopener noreferrer"
              className="text-xs text-zx-accent hover:opacity-80">resend.com ↗</a>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className={labelCls}>{t('adminSettings.resendKeyLabel')}</label>
              <div className="relative">
                <input type={showKeys.resend ? 'text' : 'password'} value={form.resendApiKey}
                  onChange={e => set('resendApiKey', e.target.value)}
                  placeholder={configured.resendKey ? '(set — leave blank to keep)' : 're_…'}
                  className={`${inputCls} pr-10 font-mono text-xs`} />
                <button type="button" onClick={() => toggleShow('resend')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-zx-text-soft hover:text-zx-text uppercase tracking-wide">
                  {showKeys.resend ? 'hide' : 'show'}
                </button>
              </div>
            </div>
            {configured.resendKey && (
              <span className="mb-0.5 text-xs text-zx-positive font-medium whitespace-nowrap">✓ set</span>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label className={labelCls}>{t('adminSettings.emailFromLabel')}</label>
              <input type="email" value={form.emailFrom} onChange={e => set('emailFrom', e.target.value)}
                placeholder="noreply@yourdomain.com" className={inputCls} />
              <p className="text-xs text-zx-text-soft mt-1">{t('adminSettings.emailFromHint')}</p>
            </div>
          </div>

          <div>
            <label className={labelCls}>{t('adminSettings.emailFromNameLabel')}</label>
            <input type="text" value={form.emailFromName} onChange={e => set('emailFromName', e.target.value)}
              placeholder="ZenX Wealth" className={inputCls} />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-zx-sm bg-zx-accent px-5 py-2.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 disabled:opacity-50 transition">
            <Save className="h-4 w-4" />
            {saving ? t('common.saving') : t('common.save')}
          </button>
          <p className="text-xs text-zx-text-soft">{t('adminSettings.keySecurityNote')}</p>
        </div>
      </form>

      {/* RIGHT: Status panel */}
      <div className="mt-6 lg:mt-0 rounded-zx border border-zx-line bg-zx-surface p-5 sticky top-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft mb-4">{t('adminSettings.statusPanel')}</p>

        <div className="space-y-1 mb-5 divide-y divide-zx-line/50">
          <StatusRow ok={configured.claudeKey} label="Anthropic API Key" sub="Required for AI Coach" />
          <StatusRow ok={Boolean(form.claudeModel)} label={`Model: ${selectedModel?.label.split(' (')[0] || '—'}`} sub={selectedModel ? '' : 'Select a model'} />
          <StatusRow ok={configured.resendKey} label="Resend API Key" sub="Required for email delivery" />
          <StatusRow ok={configured.emailFrom} label={configured.emailFrom ? form.emailFrom || 'Email set' : 'From email'} sub={configured.emailFrom ? '' : 'Required for email delivery'} />
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-2">{t('adminSettings.readyFor')}</p>
          <div className={`flex items-center gap-2 text-xs rounded-zx-sm px-3 py-2 ${configured.claudeKey ? 'bg-zx-positive-soft text-zx-positive' : 'bg-zx-surface-2 text-zx-text-soft'}`}>
            <span>{configured.claudeKey ? '✓' : '○'}</span> AI Coach
          </div>
          <div className={`flex items-center gap-2 text-xs rounded-zx-sm px-3 py-2 ${configured.resendKey && configured.emailFrom ? 'bg-zx-positive-soft text-zx-positive' : 'bg-zx-surface-2 text-zx-text-soft'}`}>
            <span>{configured.resendKey && configured.emailFrom ? '✓' : '○'}</span> Monthly Letter Email
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Plans & Billing ── */
const DEFAULT_PLAN_FORM = {
  monthly_amount: '99000', monthly_label: 'Gói tháng', monthly_duration: '/ tháng', monthly_days: '30',
  yearly_amount: '799000', yearly_label: 'Gói năm', yearly_duration: '/ năm', yearly_days: '365', yearly_badge: 'Tiết kiệm 33%',
  momoPartnerCode: '', momoAccessKey: '', momoSecretKey: '',
  free_name: DEFAULT_PLAN_TEMPLATES.free.name,
  free_description: DEFAULT_PLAN_TEMPLATES.free.description,
  free_features: DEFAULT_PLAN_TEMPLATES.free.features,
  premium_name: DEFAULT_PLAN_TEMPLATES.premium.name,
  premium_description: DEFAULT_PLAN_TEMPLATES.premium.description,
  premium_features: DEFAULT_PLAN_TEMPLATES.premium.features,
};

function PlansTab({ t }) {
  const [form, setForm] = useState(DEFAULT_PLAN_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showKeys, setShowKeys] = useState({});

  useEffect(() => {
    Promise.all([
      getDoc(doc(db, 'appConfig', 'billing-settings')),
      getApiSettings(),
    ]).then(([billingSnap]) => {
      const data = billingSnap.data() || {};
      const b = data.plans || {};
      const tmpl = data.planTemplates || {};
      setForm(prev => ({
        ...prev,
        monthly_amount: String(b.monthly?.amount ?? 99000),
        monthly_label: b.monthly?.label ?? prev.monthly_label,
        monthly_duration: b.monthly?.durationLabel ?? prev.monthly_duration,
        monthly_days: String(b.monthly?.days ?? 30),
        yearly_amount: String(b.yearly?.amount ?? 799000),
        yearly_label: b.yearly?.label ?? prev.yearly_label,
        yearly_duration: b.yearly?.durationLabel ?? prev.yearly_duration,
        yearly_days: String(b.yearly?.days ?? 365),
        yearly_badge: b.yearly?.badge ?? prev.yearly_badge,
        free_name: tmpl.free?.name ?? prev.free_name,
        free_description: tmpl.free?.description ?? prev.free_description,
        free_features: tmpl.free?.features ?? prev.free_features,
        premium_name: tmpl.premium?.name ?? prev.premium_name,
        premium_description: tmpl.premium?.description ?? prev.premium_description,
        premium_features: tmpl.premium?.features ?? prev.premium_features,
      }));
    }).catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleShow = k => setShowKeys(p => ({ ...p, [k]: !p[k] }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMessage(''); setError('');
    try {
      const plans = {
        monthly: { amount: Number(form.monthly_amount), label: form.monthly_label, durationLabel: form.monthly_duration, days: Number(form.monthly_days) },
        yearly:  { amount: Number(form.yearly_amount),  label: form.yearly_label,  durationLabel: form.yearly_duration,  days: Number(form.yearly_days), badge: form.yearly_badge || null },
      };
      const planTemplates = {
        free:    { name: form.free_name,    description: form.free_description,    features: form.free_features },
        premium: { name: form.premium_name, description: form.premium_description, features: form.premium_features },
      };
      await setDoc(doc(db, 'appConfig', 'billing-settings'), { plans, planTemplates, updatedAt: serverTimestamp() }, { merge: true });

      // Also save MoMo credentials to api-settings if provided
      const momoUpdates = {};
      if (form.momoPartnerCode.trim()) momoUpdates.momoPartnerCode = form.momoPartnerCode.trim();
      if (form.momoAccessKey.trim()) momoUpdates.momoAccessKey = form.momoAccessKey.trim();
      if (form.momoSecretKey.trim()) momoUpdates.momoSecretKey = form.momoSecretKey.trim();
      if (Object.keys(momoUpdates).length > 0) await saveApiSettings(momoUpdates);

      invalidatePlansCache();
      setMessage(t('adminSettings.saveSuccess'));
      setForm(p => ({ ...p, momoPartnerCode: '', momoAccessKey: '', momoSecretKey: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-zx-text-soft">{t('common.loading')}</p>;

  const inputCls = 'w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-2.5 text-sm text-zx-text outline-none focus:ring-2 focus:ring-zx-accent';
  const labelCls = 'text-xs font-semibold uppercase tracking-[0.1em] text-zx-text-soft mb-1.5 block';

  // Live preview data
  const previewMonthly = { label: form.monthly_label, amount: Number(form.monthly_amount) || 0, durationLabel: form.monthly_duration };
  const previewYearly  = { label: form.yearly_label,  amount: Number(form.yearly_amount)  || 0, durationLabel: form.yearly_duration, badge: form.yearly_badge };

  return (
    <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-8 lg:items-start">

      {/* LEFT: Form */}
      <form onSubmit={handleSave} className="space-y-5">
        {error && <p className="rounded-zx-sm border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative">{error}</p>}
        {message && <p className="rounded-zx-sm border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">{message}</p>}

        {/* Monthly */}
        <div className="rounded-zx border border-zx-line bg-zx-surface p-5 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft">{t('adminPlans.monthlySection')}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('adminPlans.planNameLabel')}</label>
              <input type="text" value={form.monthly_label} onChange={e => set('monthly_label', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t('adminPlans.durationLabelField')}</label>
              <input type="text" value={form.monthly_duration} onChange={e => set('monthly_duration', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('adminPlans.priceLabel')} (VND)</label>
              <input type="number" min="0" value={form.monthly_amount} onChange={e => set('monthly_amount', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t('adminPlans.daysLabel')}</label>
              <input type="number" min="1" value={form.monthly_days} onChange={e => set('monthly_days', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Yearly */}
        <div className="rounded-zx border border-zx-gold/40 bg-amber-950/10 p-5 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-gold">{t('adminPlans.yearlySection')}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('adminPlans.planNameLabel')}</label>
              <input type="text" value={form.yearly_label} onChange={e => set('yearly_label', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t('adminPlans.durationLabelField')}</label>
              <input type="text" value={form.yearly_duration} onChange={e => set('yearly_duration', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('adminPlans.priceLabel')} (VND)</label>
              <input type="number" min="0" value={form.yearly_amount} onChange={e => set('yearly_amount', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t('adminPlans.daysLabel')}</label>
              <input type="number" min="1" value={form.yearly_days} onChange={e => set('yearly_days', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>{t('adminPlans.badgeLabel')}</label>
            <input type="text" value={form.yearly_badge} onChange={e => set('yearly_badge', e.target.value)}
              placeholder="Tiết kiệm 33%" className={inputCls} />
            <p className="text-xs text-zx-text-soft mt-1">{t('adminPlans.badgeHint')}</p>
          </div>
        </div>

        {/* MoMo */}
        <div className="rounded-zx border border-zx-line bg-zx-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft">{t('adminPlans.momoSection')}</p>
            <span className="text-xs text-zx-text-soft">{t('adminSettings.keySecurityNote')}</span>
          </div>
          <p className="text-xs text-zx-text-soft -mt-2">{t('adminPlans.momoHint')}</p>
          <div className="grid grid-cols-1 gap-3">
            {[
              { key: 'momoPartnerCode', label: 'Partner Code', ph: 'MOMO' },
              { key: 'momoAccessKey',   label: 'Access Key',   ph: 'F8BBA842ECF85…' },
              { key: 'momoSecretKey',   label: 'Secret Key',   ph: 'K951B6PE1waDMi…' },
            ].map(({ key, label, ph }) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <div className="relative">
                  <input type={showKeys[key] ? 'text' : 'password'} value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder={`(set — leave blank to keep) e.g. ${ph}`}
                    className={`${inputCls} pr-14 font-mono text-xs`} />
                  <button type="button" onClick={() => toggleShow(key)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-zx-text-soft hover:text-zx-text uppercase tracking-wide">
                    {showKeys[key] ? 'hide' : 'show'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Templates — Gói dịch vụ */}
        <div className="rounded-zx border border-zx-line bg-zx-surface p-5 space-y-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft">{t('adminPlans.planTemplatesSection')}</p>
          <p className="text-xs text-zx-text-soft -mt-3">{t('adminPlans.planTemplatesHint')}</p>

          {/* Free plan template */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-zx-text-soft uppercase tracking-wide">{t('common.free')}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t('adminPlans.planNameLabel')}</label>
                <input type="text" value={form.free_name} onChange={e => set('free_name', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('adminPlans.planDescLabel')}</label>
                <input type="text" value={form.free_description} onChange={e => set('free_description', e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('adminPlans.featuresLabel')}</label>
              <div className="flex flex-wrap gap-2 p-3 border border-zx-line rounded-zx-sm bg-zx-surface-2">
                {featureCatalog.filter(f => f.group !== 'admin').map(f => (
                  <label key={f.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox"
                      checked={form.free_features.includes(f.key)}
                      onChange={e => set('free_features', e.target.checked
                        ? [...form.free_features, f.key]
                        : form.free_features.filter(k => k !== f.key))}
                      className="rounded accent-zx-accent" />
                    <span className={form.free_features.includes(f.key) ? 'text-zx-text' : 'text-zx-text-soft'}>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Premium plan template */}
          <div className="space-y-3 pt-3 border-t border-zx-line">
            <p className="text-xs font-semibold text-zx-gold uppercase tracking-wide">{t('common.premium')}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t('adminPlans.planNameLabel')}</label>
                <input type="text" value={form.premium_name} onChange={e => set('premium_name', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('adminPlans.planDescLabel')}</label>
                <input type="text" value={form.premium_description} onChange={e => set('premium_description', e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('adminPlans.featuresLabel')}</label>
              <div className="flex flex-wrap gap-2 p-3 border border-zx-gold/30 rounded-zx-sm bg-amber-950/10">
                {featureCatalog.filter(f => f.group !== 'admin').map(f => (
                  <label key={f.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox"
                      checked={form.premium_features.includes(f.key)}
                      onChange={e => set('premium_features', e.target.checked
                        ? [...form.premium_features, f.key]
                        : form.premium_features.filter(k => k !== f.key))}
                      className="rounded accent-zx-gold" />
                    <span className={form.premium_features.includes(f.key) ? 'text-zx-text' : 'text-zx-text-soft'}>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-zx-sm bg-zx-accent px-5 py-2.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 disabled:opacity-50 transition">
            <Save className="h-4 w-4" />
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>

      {/* RIGHT: Live preview */}
      <div className="mt-6 lg:mt-0 sticky top-6 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft">{t('adminPlans.previewLabel')}</p>

        {/* Monthly card preview */}
        <div className="relative rounded-zx border border-zx-line bg-zx-surface p-4 space-y-3">
          <div>
            <p className="font-semibold text-zx-text text-sm">{previewMonthly.label || '—'}</p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="font-zx-display text-xl font-bold text-zx-text">
                {previewMonthly.amount > 0 ? previewMonthly.amount.toLocaleString('vi-VN') + '₫' : '—'}
              </span>
              <span className="text-xs text-zx-text-soft">{previewMonthly.durationLabel}</span>
            </p>
          </div>
          <div className="h-8 rounded-zx-sm bg-zx-accent/20 border border-zx-accent/30 flex items-center justify-center">
            <span className="text-xs font-medium text-zx-accent">Nâng cấp ngay</span>
          </div>
        </div>

        {/* Yearly card preview */}
        <div className="relative rounded-zx border border-zx-gold/50 bg-amber-950/10 p-4 space-y-3">
          {previewYearly.badge && (
            <div className="absolute -top-2.5 right-3 rounded-full bg-zx-gold px-2.5 py-0.5 text-[10px] font-bold text-black">
              {previewYearly.badge}
            </div>
          )}
          <div>
            <p className="font-semibold text-zx-text text-sm">{previewYearly.label || '—'}</p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="font-zx-display text-xl font-bold text-zx-text">
                {previewYearly.amount > 0 ? previewYearly.amount.toLocaleString('vi-VN') + '₫' : '—'}
              </span>
              <span className="text-xs text-zx-text-soft">{previewYearly.durationLabel}</span>
            </p>
          </div>
          <div className="h-8 rounded-zx-sm bg-zx-gold/20 border border-zx-gold/30 flex items-center justify-center">
            <span className="text-xs font-medium text-zx-gold">Nâng cấp ngay</span>
          </div>
        </div>

        <p className="text-[10px] text-zx-text-soft">{t('adminPlans.previewNote')}</p>
      </div>
    </div>
  );
}

/* ── Tab: Budget Templates ── */
const ALLOC_KEYS = ['living', 'emergencyFund', 'longTermAsset', 'businessLearning', 'highRiskTrading'];
const ALLOC_COLORS = ['bg-zx-accent', 'bg-zx-positive', 'bg-blue-500', 'bg-purple-500', 'bg-red-500'];

function newTemplate() {
  return {
    id: `tmpl_${Date.now()}`,
    phase: 0,
    savingsRateTarget: 0.3,
    emergencyTargetMonths: 6,
    allocation: { living: 55, emergencyFund: 15, longTermAsset: 20, businessLearning: 7, highRiskTrading: 3 },
    nameVI: '', nameEN: '', descVI: '', descEN: '',
    categories: { income: [], expense: [] },
    categoriesEN: { income: [], expense: [] },
  };
}

function templateToForm(tmpl) {
  return {
    ...tmpl,
    nameVI: tmpl.nameVI || (typeof tmpl.name === 'string' ? tmpl.name : ''),
    nameEN: tmpl.nameEN || '',
    descVI: tmpl.descVI || (typeof tmpl.description === 'string' ? tmpl.description : ''),
    descEN: tmpl.descEN || '',
    cats_income_vi: (tmpl.categories?.income || []).join(', '),
    cats_expense_vi: (tmpl.categories?.expense || []).join(', '),
    cats_income_en: (tmpl.categoriesEN?.income || []).join(', '),
    cats_expense_en: (tmpl.categoriesEN?.expense || []).join(', '),
    alloc_living: String(tmpl.allocation?.living ?? 55),
    alloc_emergencyFund: String(tmpl.allocation?.emergencyFund ?? 15),
    alloc_longTermAsset: String(tmpl.allocation?.longTermAsset ?? 20),
    alloc_businessLearning: String(tmpl.allocation?.businessLearning ?? 7),
    alloc_highRiskTrading: String(tmpl.allocation?.highRiskTrading ?? 3),
    savings: String(Math.round((tmpl.savingsRateTarget ?? 0.3) * 100)),
    emergency: String(tmpl.emergencyTargetMonths ?? 6),
  };
}

function formToTemplate(f) {
  const splitCats = s => s.split(',').map(c => c.trim()).filter(Boolean);
  const alloc = {
    living: Number(f.alloc_living) || 0,
    emergencyFund: Number(f.alloc_emergencyFund) || 0,
    longTermAsset: Number(f.alloc_longTermAsset) || 0,
    businessLearning: Number(f.alloc_businessLearning) || 0,
    highRiskTrading: Number(f.alloc_highRiskTrading) || 0,
  };
  return {
    id: f.id,
    phase: Number(f.phase) || 0,
    nameVI: f.nameVI.trim(),
    nameEN: f.nameEN.trim(),
    descVI: f.descVI.trim(),
    descEN: f.descEN.trim(),
    savingsRateTarget: (Number(f.savings) || 30) / 100,
    emergencyTargetMonths: Number(f.emergency) || 6,
    allocation: alloc,
    categories: { income: splitCats(f.cats_income_vi), expense: splitCats(f.cats_expense_vi) },
    categoriesEN: { income: splitCats(f.cats_income_en), expense: splitCats(f.cats_expense_en) },
  };
}

function TemplateEditor({ tmpl, onSave, onDelete, t }) {
  const [form, setForm] = useState(() => templateToForm(tmpl));
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState(false);
  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setDirty(true); };

  const allocTotal = ALLOC_KEYS.reduce((s, k) => s + (Number(form[`alloc_${k}`]) || 0), 0);
  const inputCls = 'w-full rounded-zx-sm border border-zx-line bg-zx-bg px-3 py-2 text-sm text-zx-text outline-none focus:ring-2 focus:ring-zx-accent';
  const labelCls = 'text-[10px] font-semibold uppercase tracking-[0.1em] text-zx-text-soft mb-1 block';

  const displayName = form.nameVI || form.nameEN || t('adminBudgetTemplates.unnamed');

  return (
    <div className="rounded-zx border border-zx-line overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3 bg-zx-surface cursor-pointer hover:bg-zx-surface-2 transition"
        onClick={() => setOpen(v => !v)}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zx-text truncate">{displayName}</p>
          <p className="text-xs text-zx-text-soft">
            {t('budgetTemplates.savingsTarget')}: {form.savings}% · {t('budgetTemplates.emergencyTarget')}: {form.emergency} {t('budgetTemplates.months')}
          </p>
        </div>
        {dirty && <span className="text-[10px] text-zx-accent font-medium">● unsaved</span>}
        <span className="text-zx-text-soft text-xs">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="p-4 space-y-4 border-t border-zx-line bg-zx-surface-2/40">
          {/* Names + descriptions */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Tên (VI)</label><input value={form.nameVI} onChange={e => set('nameVI', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Name (EN)</label><input value={form.nameEN} onChange={e => set('nameEN', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Mô tả (VI)</label><input value={form.descVI} onChange={e => set('descVI', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Description (EN)</label><input value={form.descEN} onChange={e => set('descEN', e.target.value)} className={inputCls} /></div>
          </div>

          {/* Allocation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>{t('budgetTemplates.allocation')}</label>
              <span className={`text-xs font-semibold ${allocTotal === 100 ? 'text-zx-positive' : 'text-zx-accent'}`}>
                {allocTotal}/100
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {ALLOC_KEYS.map((k, i) => (
                <div key={k}>
                  <div className={`w-full h-1.5 rounded-full ${ALLOC_COLORS[i]} mb-1 opacity-60`} />
                  <label className={labelCls}>{k.replace(/([A-Z])/g, ' $1').trim()}</label>
                  <input type="number" min="0" max="100" value={form[`alloc_${k}`]}
                    onChange={e => set(`alloc_${k}`, e.target.value)}
                    className={`${inputCls} text-center`} />
                </div>
              ))}
            </div>
          </div>

          {/* Targets */}
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Phase</label><input type="number" min="0" value={form.phase} onChange={e => set('phase', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>{t('budgetTemplates.savingsTarget')} (%)</label><input type="number" min="0" max="100" value={form.savings} onChange={e => set('savings', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>{t('budgetTemplates.emergencyTarget')} (tháng)</label><input type="number" min="1" value={form.emergency} onChange={e => set('emergency', e.target.value)} className={inputCls} /></div>
          </div>

          {/* Categories */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Thu nhập (VI)', field: 'cats_income_vi' },
              { label: 'Income (EN)', field: 'cats_income_en' },
              { label: 'Chi tiêu (VI)', field: 'cats_expense_vi' },
              { label: 'Expense (EN)', field: 'cats_expense_en' },
            ].map(({ label, field }) => (
              <div key={field}>
                <label className={labelCls}>{label}</label>
                <textarea value={form[field]} onChange={e => set(field, e.target.value)}
                  rows={2} placeholder="Phân tách bằng dấu phẩy"
                  className={`${inputCls} resize-none text-xs`} />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={() => { onSave(formToTemplate(form)); setDirty(false); }}
              disabled={allocTotal !== 100}
              className="flex items-center gap-1.5 rounded-zx-sm bg-zx-accent px-4 py-2 text-sm font-semibold text-zx-on-accent hover:opacity-90 disabled:opacity-40 transition">
              <Save className="h-3.5 w-3.5" /> {t('common.save')}
            </button>
            <button onClick={() => { if (window.confirm(t('adminBudgetTemplates.deleteConfirm', { name: displayName }))) onDelete(tmpl.id); }}
              className="rounded-zx-sm border border-zx-negative/40 px-4 py-2 text-sm text-zx-negative hover:bg-zx-negative/10 transition">
              {t('common.delete')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BudgetTemplatesTab({ t }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getBudgetTemplates().then(setTemplates).finally(() => setLoading(false));
  }, []);

  const persist = async (list) => {
    setSaving(true); setMessage(''); setError('');
    try {
      await saveBudgetTemplates(list);
      setMessage(t('adminSettings.saveSuccess'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (updated) => {
    const next = templates.map(t => t.id === updated.id ? updated : t);
    setTemplates(next);
    await persist(next);
  };

  const handleDelete = async (id) => {
    const next = templates.filter(t => t.id !== id);
    setTemplates(next);
    await persist(next);
  };

  const handleAdd = () => {
    setTemplates(prev => [...prev, newTemplate()]);
  };

  const handleReset = async () => {
    if (!window.confirm(t('adminBudgetTemplates.resetConfirm'))) return;
    setTemplates(HARDCODED_TEMPLATES);
    await persist(HARDCODED_TEMPLATES);
  };

  if (loading) return <p className="text-sm text-zx-text-soft">{t('common.loading')}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zx-text">{t('adminBudgetTemplates.description')}</p>
          <p className="text-xs text-zx-text-soft mt-0.5">{t('adminBudgetTemplates.hint')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset}
            className="rounded-zx-sm border border-zx-line px-3 py-2 text-xs text-zx-text-soft hover:text-zx-text transition">
            {t('adminBudgetTemplates.resetDefaults')}
          </button>
          <button onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-zx-sm bg-zx-accent px-4 py-2 text-sm font-semibold text-zx-on-accent hover:opacity-90 transition">
            + {t('adminBudgetTemplates.addTemplate')}
          </button>
        </div>
      </div>

      {error && <p className="rounded-zx-sm border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative">{error}</p>}
      {message && <p className="rounded-zx-sm border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">{message}</p>}
      {saving && <p className="text-xs text-zx-accent">{t('common.saving')}</p>}

      <div className="space-y-2">
        {templates.map(tmpl => (
          <TemplateEditor key={tmpl.id} tmpl={tmpl} onSave={handleSave} onDelete={handleDelete} t={t} />
        ))}
        {templates.length === 0 && (
          <p className="text-sm text-zx-text-soft text-center py-8">{t('adminBudgetTemplates.empty')}</p>
        )}
      </div>
    </div>
  );
}

/* ── Main page ── */
const TABS = ['features', 'preview', 'api', 'plans', 'budget_templates'];

export default function AdminAccessControl() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { profile, accessControl, isAdmin, loading, subscriptionTier } = useFeatureAccess(user);
  const [form, setForm] = useState(() => normalizeAccessControl().features);
  const [saving, setSaving] = useState(false);
  const [tierSaving, setTierSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('features');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (accessControl?.features) {
      setForm(accessControl.features);
    } else {
      getAccessControl({ forceFresh: true }).then(v => setForm(v.features));
    }
  }, [accessControl]);

  const groupedFeatures = useMemo(() =>
    featureGroups
      .filter(g => g.key !== 'admin')
      .map(g => ({ ...g, features: featureCatalog.filter(f => f.group === g.key) })),
    []
  );

  const updateFeature = (featureKey, tier) => {
    setForm(cur => ({ ...cur, [featureKey]: { ...cur[featureKey], [tier]: !cur[featureKey]?.[tier] } }));
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setMessage('');
    try {
      await saveAccessControl({ features: form });
      setMessage(t('adminAccess.saveSuccess'));
    } catch (err) {
      setError(err.message || t('adminAccess.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleResetOnboarding = async () => {
    if (!user || resetting) return;
    setResetting(true);
    try {
      await setDoc(doc(db, 'users', user.uid), { onboardingCompleted: false, updatedAt: serverTimestamp() }, { merge: true });
      setUserProfileCache(user.uid, null);
      window.location.href = '/';
    } catch (err) {
      setError(err.message);
      setResetting(false);
    }
  };

  const handleTierSwitch = async (tier) => {
    if (!user || !profile) return;
    setTierSaving(true); setError(''); setMessage('');
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
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-zx-line bg-zx-surface px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zx-accent">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('adminAccess.badge')}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t('adminAccess.title')}</h1>
          <p className="text-sm text-zx-text-soft max-w-xl">{t('adminAccess.subtitle')}</p>
          {loading && <p className="text-xs text-zx-text-soft">{t('adminAccess.loading')}</p>}
        </div>
      </div>

      {!isAdmin ? (
        <div className="rounded-zx border border-zx-negative/30 bg-zx-negative/10 p-5">
          <h2 className="text-lg font-semibold text-zx-negative">{t('adminAccess.noAccessTitle')}</h2>
          <p className="mt-2 text-sm text-zx-text-soft">{t('adminAccess.noAccessBody')}</p>
        </div>
      ) : (
        <>
          {/* Tab nav */}
          <div className="flex items-center gap-0 border-b border-zx-line mb-6">
            <Tab active={activeTab === 'features'} onClick={() => setActiveTab('features')}>
              {t('adminAccess.tabFeatures')}
            </Tab>
            <Tab active={activeTab === 'preview'} onClick={() => setActiveTab('preview')}>
              {t('adminAccess.tabPreview')}
            </Tab>
            <Tab active={activeTab === 'api'} onClick={() => setActiveTab('api')}>
              {t('adminAccess.tabApi')}
            </Tab>
            <Tab active={activeTab === 'plans'} onClick={() => setActiveTab('plans')}>
              {t('adminAccess.tabPlans')}
            </Tab>
            <Tab active={activeTab === 'budget_templates'} onClick={() => setActiveTab('budget_templates')}>
              {t('adminAccess.tabBudgetTemplates')}
            </Tab>
          </div>

          {activeTab === 'features' && (
            <FeaturesTab
              form={form}
              updateFeature={updateFeature}
              groupedFeatures={groupedFeatures}
              saving={saving}
              handleSave={handleSave}
              error={error}
              message={message}
              t={t}
            />
          )}

          {activeTab === 'preview' && (
            <PreviewTab
              subscriptionTier={subscriptionTier}
              handleTierSwitch={handleTierSwitch}
              tierSaving={tierSaving}
              handleResetOnboarding={handleResetOnboarding}
              resetting={resetting}
              t={t}
            />
          )}

          {activeTab === 'api' && <ApiTab t={t} />}
          {activeTab === 'plans' && <PlansTab t={t} />}
          {activeTab === 'budget_templates' && <BudgetTemplatesTab t={t} />}
        </>
      )}
    </main>
  );
}


