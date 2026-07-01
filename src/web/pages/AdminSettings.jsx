import { useEffect, useState } from 'react';
import { BookOpen, Eye, EyeOff, Pencil, Plus, Save, Settings2, Trash2, X } from 'lucide-react';
import { useAuth } from '../../core/auth/useAuth';
import { useI18n } from '../../core/i18n/useI18n';
import { useFeatureAccess } from '../../core/hooks/useFeatureAccess';
import { getApiSettings, saveApiSettings } from '../../core/services/adminSettingsService';
import {
  createQuote, deleteQuote, getQuotes, toggleQuoteActive, updateQuote,
} from '../../core/services/quoteService';
import { QUOTE_TEMPLATES, QUOTE_THEMES, QUOTE_SOURCE, TEMPLATE_LABELS, THEME_LABELS } from '../../core/data/dailyQuotes';

const CLAUDE_MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fast, cheap)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (balanced)' },
  { value: 'claude-opus-4-8', label: 'Claude Opus 4.8 (most capable)' },
];

const TABS = ['api', 'quotes'];

// ── Reusable sub-components ──

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

// ── Quote form (add / edit) ──

const EMPTY_QUOTE = {
  vi: '', en: '', source: QUOTE_SOURCE,
  themes: [], templates: ['all'], active: true,
};

function QuoteForm({ initial, onSave, onCancel, saving }) {
  const { t, locale } = useI18n();
  const [form, setForm] = useState(initial || EMPTY_QUOTE);
  const tplLabel = (key) => TEMPLATE_LABELS[key]?.[locale] ?? key;
  const themeLabel = (key) => THEME_LABELS[key]?.[locale] ?? key;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function toggleArr(key, val) {
    setForm(p => ({
      ...p,
      [key]: p[key].includes(val) ? p[key].filter(x => x !== val) : [...p[key], val],
    }));
  }

  const valid = form.vi.trim() && form.en.trim() && form.templates.length > 0;

  return (
    <div className="rounded-zx border border-zx-accent/30 bg-zx-surface p-5 space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-accent">
        {initial ? t('adminSettings.quotes.editQuote') : t('adminSettings.quotes.newQuote')}
      </p>

      {/* Vietnamese */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.1em] text-zx-text-soft mb-1.5 block">
          {t('adminSettings.quotes.fieldVI')}
        </label>
        <textarea
          value={form.vi}
          onChange={e => set('vi', e.target.value)}
          rows={3}
          placeholder="Câu trích dẫn tiếng Việt..."
          className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-2.5 text-sm text-zx-text outline-none focus:ring-2 focus:ring-zx-accent resize-none"
        />
      </div>

      {/* English */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.1em] text-zx-text-soft mb-1.5 block">
          {t('adminSettings.quotes.fieldEN')}
        </label>
        <textarea
          value={form.en}
          onChange={e => set('en', e.target.value)}
          rows={3}
          placeholder="English quote..."
          className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-2.5 text-sm text-zx-text outline-none focus:ring-2 focus:ring-zx-accent resize-none"
        />
      </div>

      {/* Source */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.1em] text-zx-text-soft mb-1.5 block">
          {t('adminSettings.quotes.fieldSource')}
        </label>
        <input
          value={form.source}
          onChange={e => set('source', e.target.value)}
          className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-2.5 text-sm text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
        />
      </div>

      {/* Templates */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zx-text-soft mb-2">
          {t('adminSettings.quotes.fieldTemplates')}
        </p>
        <div className="flex flex-wrap gap-2">
          {QUOTE_TEMPLATES.map(tpl => (
            <button
              key={tpl}
              type="button"
              onClick={() => toggleArr('templates', tpl)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                form.templates.includes(tpl)
                  ? 'bg-zx-accent text-zx-on-accent border-zx-accent'
                  : 'border-zx-line text-zx-text-soft hover:text-zx-text'
              }`}
            >
              {tplLabel(tpl)}
            </button>
          ))}
        </div>
      </div>

      {/* Themes */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zx-text-soft mb-2">
          {t('adminSettings.quotes.fieldThemes')}
        </p>
        <div className="flex flex-wrap gap-2">
          {QUOTE_THEMES.map(th => (
            <button
              key={th}
              type="button"
              onClick={() => toggleArr('themes', th)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                form.themes.includes(th)
                  ? 'bg-zx-surface-2 text-zx-text border-zx-text-soft'
                  : 'border-zx-line text-zx-text-soft hover:text-zx-text'
              }`}
            >
              {themeLabel(th)}
            </button>
          ))}
        </div>
      </div>

      {/* Active toggle */}
      <label className="flex items-center gap-2 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={form.active}
          onChange={e => set('active', e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-zx-text">{t('adminSettings.quotes.fieldActive')}</span>
      </label>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={!valid || saving}
          onClick={() => onSave(form)}
          className="flex items-center gap-2 rounded-zx-sm bg-zx-accent px-4 py-2 text-sm font-semibold text-zx-on-accent hover:opacity-90 disabled:opacity-40 transition"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? t('common.saving') : t('common.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 rounded-zx-sm border border-zx-line px-4 py-2 text-sm text-zx-text-soft hover:text-zx-text transition"
        >
          <X className="h-3.5 w-3.5" />
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

// ── Quote row ──

function QuoteRow({ quote, onEdit, onDelete, onToggle }) {
  const { t, locale } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const tplLabel = (key) => TEMPLATE_LABELS[key]?.[locale] ?? key;
  const themeLabel = (key) => THEME_LABELS[key]?.[locale] ?? key;

  return (
    <div className={`p-4 border-b border-zx-line last:border-0 transition ${quote.active ? '' : 'opacity-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm text-zx-text leading-relaxed line-clamp-2">"{quote.vi}"</p>
          <p className="text-xs text-zx-text-soft italic line-clamp-1">"{quote.en}"</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {(quote.templates || []).map(tpl => (
              <span key={tpl} className="rounded-full bg-zx-accent/10 text-zx-accent px-2 py-0.5 text-[10px] font-medium">{tplLabel(tpl)}</span>
            ))}
            {(quote.themes || []).map(th => (
              <span key={th} className="rounded-full bg-zx-surface-2 text-zx-text-soft px-2 py-0.5 text-[10px]">{themeLabel(th)}</span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggle(quote.id, !quote.active)}
            className="rounded p-1.5 text-zx-text-soft hover:text-zx-text transition"
            aria-label={quote.active ? t('adminSettings.quotes.deactivate') : t('adminSettings.quotes.activate')}
            title={quote.active ? t('adminSettings.quotes.deactivate') : t('adminSettings.quotes.activate')}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onEdit(quote)}
            className="rounded p-1.5 text-zx-text-soft hover:text-zx-text transition"
            aria-label={t('common.edit')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {confirming ? (
            <div className="flex items-center gap-1">
              <button onClick={() => onDelete(quote.id)}
                className="rounded px-2 py-1 text-xs bg-zx-negative/10 text-zx-negative hover:bg-zx-negative/20 transition">
                {t('common.confirm')}
              </button>
              <button onClick={() => setConfirming(false)}
                className="rounded px-2 py-1 text-xs text-zx-text-soft hover:text-zx-text transition">
                {t('common.cancel')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="rounded p-1.5 text-zx-text-soft hover:text-zx-negative transition"
              aria-label={t('common.delete')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Quotes tab ──

function QuotesTab() {
  const { t, locale } = useI18n();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterTemplate, setFilterTemplate] = useState('all');
  const [filterTheme, setFilterTheme] = useState('');
  const [filterActive, setFilterActive] = useState('all'); // 'all' | 'active' | 'inactive'
  const [showForm, setShowForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load(fresh = false) {
    setLoading(true);
    try {
      const data = await getQuotes({ forceRefresh: fresh });
      setQuotes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(true); }, []);

  async function handleSave(form) {
    setSaving(true);
    try {
      if (editingQuote) {
        await updateQuote(editingQuote.id, form);
      } else {
        await createQuote(form);
      }
      setShowForm(false);
      setEditingQuote(null);
      await load(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteQuote(id);
      await load(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggle(id, active) {
    try {
      await toggleQuoteActive(id, active);
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, active } : q));
    } catch (err) {
      setError(err.message);
    }
  }

  function handleEdit(quote) {
    setEditingQuote(quote);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelForm() {
    setShowForm(false);
    setEditingQuote(null);
  }

  const filtered = quotes.filter(q => {
    if (filterTemplate !== 'all' && !q.templates?.includes(filterTemplate) && !q.templates?.includes('all')) return false;
    if (filterTheme && !q.themes?.includes(filterTheme)) return false;
    if (filterActive === 'active' && !q.active) return false;
    if (filterActive === 'inactive' && q.active) return false;
    return true;
  });

  const activeCount = quotes.filter(q => q.active).length;
  const tplLabel = (key) => TEMPLATE_LABELS[key]?.[locale] ?? key;
  const themeLabel = (key) => THEME_LABELS[key]?.[locale] ?? key;

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative">
          {error}
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <QuoteForm
          initial={editingQuote}
          onSave={handleSave}
          onCancel={handleCancelForm}
          saving={saving}
        />
      )}

      {/* Header + Add button */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-zx-text-soft">
            {t('adminSettings.quotes.summary', { total: quotes.length, active: activeCount })}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setEditingQuote(null); setShowForm(true); }}
            className="flex items-center gap-2 rounded-zx-sm bg-zx-accent px-4 py-2 text-sm font-semibold text-zx-on-accent hover:opacity-90 transition shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('adminSettings.quotes.addNew')}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Template filter */}
        <select
          value={filterTemplate}
          onChange={e => setFilterTemplate(e.target.value)}
          className="rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-1.5 text-xs text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
        >
          <option value="all">{t('adminSettings.quotes.filterAllTemplates')}</option>
          {QUOTE_TEMPLATES.filter(tp => tp !== 'all').map(tp => (
            <option key={tp} value={tp}>{tplLabel(tp)}</option>
          ))}
        </select>

        {/* Theme filter */}
        <select
          value={filterTheme}
          onChange={e => setFilterTheme(e.target.value)}
          className="rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-1.5 text-xs text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
        >
          <option value="">{t('adminSettings.quotes.filterAllThemes')}</option>
          {QUOTE_THEMES.map(th => (
            <option key={th} value={th}>{themeLabel(th)}</option>
          ))}
        </select>

        {/* Active filter */}
        {['all', 'active', 'inactive'].map(v => (
          <button
            key={v}
            onClick={() => setFilterActive(v)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
              filterActive === v
                ? 'bg-zx-surface-2 text-zx-text border-zx-text-soft'
                : 'border-zx-line text-zx-text-soft hover:text-zx-text'
            }`}
          >
            {t(`adminSettings.quotes.filter_${v}`)}
          </button>
        ))}

        <span className="text-xs text-zx-text-soft ml-1">
          {filtered.length} {t('adminSettings.quotes.results')}
        </span>
      </div>

      {/* Quote list */}
      {loading ? (
        <p className="text-zx-text-soft text-sm">{t('common.loading')}</p>
      ) : (
        <div className="rounded-zx border border-zx-line bg-zx-surface divide-y divide-zx-line">
          {filtered.length === 0 ? (
            <p className="p-6 text-sm text-zx-text-soft text-center">{t('adminSettings.quotes.empty')}</p>
          ) : (
            filtered.map(q => (
              <QuoteRow
                key={q.id}
                quote={q}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── API Settings tab ──

function ApiTab() {
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

  if (error && !loading) return (
    <div className="rounded border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative">{error}</div>
  );

  return loading ? (
    <p className="text-zx-text-soft">{t('common.loading')}</p>
  ) : (
    <form onSubmit={handleSave} className="space-y-5 max-w-2xl">
      {message && <div className="rounded border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">{message}</div>}

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
  );
}

// ── Page ──

export default function AdminSettings() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { isAdmin } = useFeatureAccess(user);
  const [activeTab, setActiveTab] = useState('api');

  if (!isAdmin) {
    return (
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <p className="text-zx-text-soft">{t('adminAccess.noAccessBody')}</p>
      </main>
    );
  }

  const tabConfig = {
    api: { label: t('adminSettings.tabApi'), icon: Settings2 },
    quotes: { label: t('adminSettings.tabQuotes'), icon: BookOpen },
  };

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-zx-sm bg-zx-icon-bg flex items-center justify-center" style={{ color: 'var(--zx-accent)' }}>
          <Settings2 className="h-4.5 w-4.5" />
        </div>
        <div>
          <h1 className="font-zx-head text-xl font-bold text-zx-text">{t('adminSettings.title')}</h1>
          <p className="text-sm text-zx-text-soft">{t('adminSettings.subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-zx-line">
        {TABS.map(tab => {
          const cfg = tabConfig[tab];
          const Icon = cfg.icon;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                activeTab === tab
                  ? 'border-zx-accent text-zx-text'
                  : 'border-transparent text-zx-text-soft hover:text-zx-text'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'api' && <ApiTab />}
      {activeTab === 'quotes' && <QuotesTab />}
    </main>
  );
}
