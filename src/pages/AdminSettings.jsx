import { useEffect, useState } from 'react';
import { Eye, EyeOff, Save, Settings2 } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { getApiSettings, saveApiSettings } from '../services/adminSettingsService';

const CLAUDE_MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fast, cheap)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (balanced)' },
  { value: 'claude-opus-4-8', label: 'Claude Opus 4.8 (most capable)' },
];

function SecretInput({ id, label, hint, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.1em] text-zx-text-soft mb-1.5 block">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || '••••••••'}
          className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-2.5 pr-10 text-sm text-zx-text outline-none focus:ring-2 focus:ring-zx-accent font-mono"
        />
        <button type="button" onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zx-text-soft hover:text-zx-text transition">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-zx-text-soft mt-1">{hint}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-zx border border-zx-line bg-zx-surface p-5 space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft">{title}</p>
      {children}
    </div>
  );
}

export default function AdminSettings() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { isAdmin } = useFeatureAccess(user);

  const [form, setForm] = useState({
    claudeApiKey: '',
    claudeModel: 'claude-haiku-4-5-20251001',
    resendApiKey: '',
    emailFrom: '',
    emailFromName: 'ZenX Wealth',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !isAdmin) return;
    getApiSettings()
      .then(settings => {
        setForm(prev => ({
          ...prev,
          claudeModel: settings.claudeModel || 'claude-haiku-4-5-20251001',
          emailFrom: settings.emailFrom || '',
          emailFromName: settings.emailFromName || 'ZenX Wealth',
          // Don't prefill secret keys — show placeholder only
        }));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, isAdmin]);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMessage(''); setError('');
    try {
      const updates = { claudeModel: form.claudeModel, emailFrom: form.emailFrom, emailFromName: form.emailFromName };
      // Only update keys if they were actually entered (non-empty)
      if (form.claudeApiKey.trim()) updates.claudeApiKey = form.claudeApiKey.trim();
      if (form.resendApiKey.trim()) updates.resendApiKey = form.resendApiKey.trim();
      await saveApiSettings(updates);
      setMessage(t('adminSettings.saveSuccess'));
      setForm(prev => ({ ...prev, claudeApiKey: '', resendApiKey: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        <p className="text-zx-text-soft">{t('adminAccess.noAccessBody')}</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-zx-sm bg-zx-icon-bg flex items-center justify-center" style={{ color: 'var(--zx-accent)' }}>
          <Settings2 className="h-4.5 w-4.5" />
        </div>
        <div>
          <h1 className="font-zx-head text-xl font-bold text-zx-text">{t('adminSettings.title')}</h1>
          <p className="text-sm text-zx-text-soft">{t('adminSettings.subtitle')}</p>
        </div>
      </div>

      {error && <div className="rounded border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative mb-4">{error}</div>}
      {message && <div className="rounded border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300 mb-4">{message}</div>}

      {loading ? (
        <p className="text-zx-text-soft">{t('common.loading')}</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-5 max-w-2xl">

          {/* Claude AI */}
          <Section title={t('adminSettings.claudeSection')}>
            <p className="text-xs text-zx-text-soft -mt-2">
              {t('adminSettings.claudeHint')}{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer"
                className="text-zx-accent hover:opacity-80">console.anthropic.com</a>
            </p>
            <SecretInput
              id="claudeApiKey"
              label={t('adminSettings.claudeKeyLabel')}
              hint={t('adminSettings.keyHint')}
              value={form.claudeApiKey}
              onChange={v => set('claudeApiKey', v)}
            />
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.1em] text-zx-text-soft mb-1.5 block">
                {t('adminSettings.claudeModelLabel')}
              </label>
              <select value={form.claudeModel} onChange={e => set('claudeModel', e.target.value)}
                className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-2.5 text-sm text-zx-text outline-none focus:ring-2 focus:ring-zx-accent">
                {CLAUDE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </Section>

          {/* Email — Resend */}
          <Section title={t('adminSettings.emailSection')}>
            <p className="text-xs text-zx-text-soft -mt-2">
              {t('adminSettings.emailHint')}{' '}
              <a href="https://resend.com" target="_blank" rel="noopener noreferrer"
                className="text-zx-accent hover:opacity-80">resend.com</a>
            </p>
            <SecretInput
              id="resendApiKey"
              label={t('adminSettings.resendKeyLabel')}
              hint={t('adminSettings.keyHint')}
              value={form.resendApiKey}
              onChange={v => set('resendApiKey', v)}
            />
            <div>
              <label htmlFor="emailFrom" className="text-xs font-semibold uppercase tracking-[0.1em] text-zx-text-soft mb-1.5 block">
                {t('adminSettings.emailFromLabel')}
              </label>
              <input id="emailFrom" type="email" value={form.emailFrom}
                onChange={e => set('emailFrom', e.target.value)}
                placeholder="noreply@yourdomain.com"
                className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-2.5 text-sm text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
              />
              <p className="text-xs text-zx-text-soft mt-1">{t('adminSettings.emailFromHint')}</p>
            </div>
            <div>
              <label htmlFor="emailFromName" className="text-xs font-semibold uppercase tracking-[0.1em] text-zx-text-soft mb-1.5 block">
                {t('adminSettings.emailFromNameLabel')}
              </label>
              <input id="emailFromName" type="text" value={form.emailFromName}
                onChange={e => set('emailFromName', e.target.value)}
                placeholder="ZenX Wealth"
                className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-2.5 text-sm text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
              />
            </div>
          </Section>

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-zx-sm bg-zx-accent px-5 py-2.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 disabled:opacity-50 transition">
              <Save className="h-4 w-4" />
              {saving ? t('common.saving') : t('common.save')}
            </button>
            <p className="text-xs text-zx-text-soft">{t('adminSettings.keySecurityNote')}</p>
          </div>
        </form>
      )}
    </main>
  );
}


