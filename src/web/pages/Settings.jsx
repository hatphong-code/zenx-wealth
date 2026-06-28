import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, LayoutTemplate, Save, Settings2, Target, Tags, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../core/auth/useAuth';
import { Button } from '../../core/../web/components/ui/button';
import { Input } from '../../core/../web/components/ui/Input';
import { Textarea } from '../../core/../web/components/ui/Textarea';
import { useToast } from '../../core/../web/components/ui/Toast';
import { useTheme } from '../../core/hooks/useTheme';
import { useNumberFormat } from '../../core/hooks/useNumberFormat';
import { defaultExpenseCategories, defaultIncomeCategories } from '../../core/data/categories';
import { getUserProfile, setUserProfileCache, updateTheme, updateUserSettings } from '../../core/services/userService';
import { getBudgetTemplates } from '../../core/services/budgetTemplatesService';
import { invalidateAfterSettingsWrite } from '../../core/services/cacheCoordinator';
import { useI18n } from '../../core/i18n/useI18n';
import { PushNotificationService } from '../../core/services/pushNotificationService';

const defaultAllocationRule = {
  living: 55,
  emergencyFund: 15,
  longTermAsset: 15,
  businessLearning: 10,
  highRiskTrading: 5,
};

const defaultNotificationPrefs = {
  weeklyReview: true,
  transactionLog: false,
  milestones: true,
  monthlyLetter: true,
};

const emptyForm = {
  goal12Month: '',
  incomeCategories: [],
  expenseCategories: [],
  newIncomeCategory: '',
  newExpenseCategory: '',
  allocationRule: defaultAllocationRule,
  notificationPrefs: defaultNotificationPrefs,
};

function toForm(profile) {
  const settings = profile?.settings || {};
  return {
    goal12Month: profile?.goal12Month || '',
    incomeCategories: settings.customCategoriesRaw?.income || [],
    expenseCategories: settings.customCategoriesRaw?.expense || [],
    newIncomeCategory: '',
    newExpenseCategory: '',
    allocationRule: { ...defaultAllocationRule, ...(settings.allocationRule || {}) },
    notificationPrefs: { ...defaultNotificationPrefs, ...(settings.notificationPrefs || {}) },
  };
}

function sanitizeCategories(items) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}


export default function Settings() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { unit, setUnit } = useNumberFormat();
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    PushNotificationService.isNotificationEnabled()
  );

  const changeTheme = async (key) => {
    setTheme(key);
    if (!user) return;
    try {
      await updateTheme(user.uid, key);
    } catch {}
  };

  const handleNotificationsToggle = (enabled) => {
    setNotificationsEnabled(enabled);
    PushNotificationService.setNotificationEnabled(enabled);
    if (enabled && Notification.permission === 'default') {
      PushNotificationService.requestPermission().then((permitted) => {
        if (permitted) {
          PushNotificationService.registerServiceWorker();
          PushNotificationService.getFCMToken();
        }
      });
    } else if (!enabled) {
      PushNotificationService.clearFCMToken();
    }
  };

  const themeOptions = [
    {
      key: 'young',
      name: t('settings.themeYoungName'),
      style: t('settings.themeYoungStyle'),
      desc: t('settings.themeYoungDesc'),
      swatches: ['#C8643C', '#5E7E5A', '#FBF4EA'],
    },
    {
      key: 'mid',
      name: t('settings.themeMidName'),
      style: t('settings.themeMidStyle'),
      desc: t('settings.themeMidDesc'),
      swatches: ['#0C1420', '#C9A24B', '#ECE5D6'],
    },
  ];
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [appliedTemplateId, setAppliedTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([
      getUserProfile(user.uid, { forceFresh: true }),
      getBudgetTemplates(),
    ]).then(([profile, templates]) => {
        if (!active) return;
        setForm(toForm(profile));
        setError('');
        const savedUnit = profile?.settings?.numberUnit;
        if (savedUnit && savedUnit !== unit) setUnit(savedUnit);
        const tid = profile?.appliedTemplateId || profile?.settings?.budgetTemplate || '';
        setAppliedTemplateId(tid);
        if (tid) {
          const tmpl = templates.find(t => t.id === tid);
          if (tmpl) {
            const name = (locale === 'en' ? tmpl.nameEN : tmpl.nameVI)
              || t(`budgetTemplates.templates.${tmpl.id}.name`, {}, tmpl.id);
            setTemplateName(name);
          }
        }
      })
      .catch((err) => { if (!active) return; setError(err.message || 'Failed to load settings.'); })
      .finally(() => { if (!active) return; setLoading(false); });
    return () => { active = false; };
  }, [user]);

  const allocationTotal = useMemo(
    () => Object.values(form.allocationRule).reduce((sum, v) => sum + Number(v || 0), 0),
    [form.allocationRule]
  );

  const updateField = (field, value) => setForm((c) => ({ ...c, [field]: value }));
  const updateAllocation = (field, value) => setForm((c) => ({ ...c, allocationRule: { ...c.allocationRule, [field]: value } }));

  const addCategory = (field, inputField) => {
    const value = form[inputField].trim();
    if (!value) return;
    setForm((c) => ({ ...c, [field]: sanitizeCategories([...c[field], value]), [inputField]: '' }));
  };

  const removeCategory = (field, value) => {
    setForm((c) => ({ ...c, [field]: c[field].filter((item) => item !== value) }));
  };

  const toggleNotifPref = async (key) => {
    const next = { ...form.notificationPrefs, [key]: !form.notificationPrefs[key] };
    setForm(f => ({ ...f, notificationPrefs: next }));
    if (!user) return;
    try {
      await updateUserSettings(user.uid, { notificationPrefs: next });
    } catch {}
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;
    const allocationRule = Object.fromEntries(
      Object.entries(form.allocationRule).map(([key, value]) => [key, Number(value || 0)])
    );
    if (allocationTotal !== 100) { setError(t('settings.allocationError')); return; }
    setSaving(true); setError('');
    try {
      const existingProfile = await getUserProfile(user.uid);
      const nextProfile = {
        ...existingProfile,
        goal12Month: form.goal12Month.trim(),
        settings: {
          ...(existingProfile.settings || {}),
          allocationRule,
          numberUnit: unit,
          theme,
          notificationPrefs: form.notificationPrefs,
          customCategories: {
            income: sanitizeCategories(form.incomeCategories),
            expense: sanitizeCategories(form.expenseCategories),
          },
        },
      };
      await updateUserSettings(user.uid, nextProfile.settings);
      setUserProfileCache(user.uid, nextProfile);
      invalidateAfterSettingsWrite(user.uid);
      toast({ title: t('toast.settingsSaved'), variant: 'success' });
    } catch (err) {
      setError(err.message);
      toast({ title: err.message, variant: 'error' });
    }
    finally { setSaving(false); }
  };

  return (
      <main className="mx-auto max-w-5xl space-y-6 p-4 pb-24 md:p-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-zx-line bg-zx-surface px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zx-text-soft">
            <Settings2 className="h-3.5 w-3.5" />
            {t('settings.badge')}
          </div>
          <h1 className="font-zx-head text-2xl font-bold tracking-tight">{t('settings.title')}</h1>
          <p className="max-w-2xl text-sm text-zx-text-soft">{t('settings.subtitle')}</p>
          {loading && <p className="text-sm text-zx-text-soft">{t('settings.loading')}</p>}
        </div>

        {/* ── Theme selector ── */}
        <section className="rounded-zx border border-zx-line bg-zx-surface p-5 shadow-zx zx-transition">
          <div className="mb-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zx-text-soft">{t('settings.themePersonalize')}</p>
            <h2 className="font-zx-head mt-1 text-lg font-semibold">{t('settings.themeDisplayStyle')}</h2>
            <p className="mt-1 text-sm text-zx-text-soft">
              {t('settings.themeHint')}
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {themeOptions.map((opt) => {
              const active = theme === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => changeTheme(opt.key)}
                  className={`rounded-zx-sm border p-4 text-left transition hover:shadow-zx ${
                    active
                      ? 'border-zx-accent bg-zx-accent-soft'
                      : 'border-zx-line bg-zx-surface-2 hover:border-zx-accent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {opt.swatches.map((c, i) => (
                        <span
                          key={i}
                          className="inline-block h-5 w-5 rounded-full border border-black/10"
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      active ? 'bg-zx-accent text-zx-on-accent' : 'border border-zx-line'
                    }`}>
                      {active && '✓'}
                    </span>
                  </div>
                  <p className="font-zx-head mt-3 font-semibold text-zx-text">{opt.name}</p>
                  <p className="text-xs font-medium text-zx-accent">{opt.style}</p>
                  <p className="mt-1 text-xs leading-relaxed text-zx-text-soft">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Number display unit ── */}
        <section className="rounded-zx border border-zx-line bg-zx-surface p-5 shadow-zx zx-transition">
          <div className="mb-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zx-text-soft">{t('settings.numberUnitTitle')}</p>
            <p className="mt-1 text-sm text-zx-text-soft">{t('settings.numberUnitHint')}</p>
          </div>
          <div className="mt-4 p-1 rounded-zx-sm bg-zx-surface-2 flex gap-1">
            {[
              { v: 'full', l: t('settings.numberUnitFull') },
              { v: 'compact', l: t('settings.numberUnitCompact') },
            ].map(o => (
              <button key={o.v} type="button" onClick={() => setUnit(o.v)}
                className={`flex-1 text-xs font-medium py-2 px-3 rounded transition text-left ${
                  unit === o.v ? 'bg-zx-accent text-zx-on-accent' : 'text-zx-text-soft hover:text-zx-text'
                }`}>
                {o.l}
              </button>
            ))}
          </div>
        </section>

        {/* ── Notifications ── */}
        <section className="rounded-zx border border-zx-line bg-zx-surface p-5 shadow-zx zx-transition">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 rounded-zx-sm bg-zx-icon-bg p-2 text-zx-accent">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold">{t('settings.notificationsTitle')}</h2>
                <p className="text-sm text-zx-text-soft">{t('settings.notificationsSubtitle')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleNotificationsToggle(!notificationsEnabled)}
              aria-pressed={notificationsEnabled}
              className={`flex-shrink-0 rounded-full h-7 w-12 p-1 transition ${notificationsEnabled ? 'bg-zx-positive' : 'bg-zx-surface-2'}`}
            >
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${notificationsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {notificationsEnabled && (
            <div className="mt-4 border-t border-zx-line pt-4 space-y-3">
              {[
                { key: 'weeklyReview',             label: t('settings.notifPrefs.weeklyReview'),             desc: t('settings.notifPrefs.weeklyReviewDesc') },
                { key: 'transactionLog',           label: t('settings.notifPrefs.transactionLog'),           desc: t('settings.notifPrefs.transactionLogDesc') },
                { key: 'milestones',               label: t('settings.notifPrefs.milestones'),               desc: t('settings.notifPrefs.milestonesDesc') },
                { key: 'monthlyLetter',            label: t('settings.notifPrefs.monthlyLetter'),            desc: t('settings.notifPrefs.monthlyLetterDesc') },
                { key: 'savingsScheduleReminder',  label: t('settings.notifPrefs.savingsScheduleReminder'),  desc: t('settings.notifPrefs.savingsScheduleReminderDesc') },
              ].map(pref => (
                <div key={pref.key} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zx-text">{pref.label}</p>
                    <p className="text-xs text-zx-text-soft">{pref.desc}</p>
                  </div>
                  <button
                    type="button"
                    aria-pressed={form.notificationPrefs[pref.key]}
                    onClick={() => toggleNotifPref(pref.key)}
                    className={`flex-shrink-0 rounded-full h-6 w-10 p-1 transition ${form.notificationPrefs[pref.key] ? 'bg-zx-accent' : 'bg-zx-surface-2 border border-zx-line'}`}
                  >
                    <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${form.notificationPrefs[pref.key] ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Budget Template ── */}
        <section className="rounded-zx border border-zx-line bg-zx-surface p-5 shadow-zx zx-transition">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 rounded-zx-sm bg-zx-icon-bg p-2 text-zx-gold">
                <LayoutTemplate className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold">{t('settings.budgetTemplateTitle')}</h2>
                <p className="text-sm text-zx-text-soft">{t('settings.budgetTemplateSubtitle')}</p>
              </div>
            </div>
            <Link
              to="/budget-templates"
              className="flex-shrink-0 flex items-center gap-1 rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-1.5 text-xs text-zx-text-soft hover:text-zx-text transition"
            >
              {t('settings.budgetTemplateSwitch')}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {appliedTemplateId && (
            <div className="mt-3 flex items-center gap-2 rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2">
              <span className="text-xs text-zx-positive font-semibold">✓</span>
              <span className="text-xs text-zx-text-soft">{t('settings.budgetTemplateCurrent')}</span>
              <span className="text-xs font-medium text-zx-text">{templateName || appliedTemplateId}</span>
            </div>
          )}
        </section>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Goal */}
          <section className="rounded-zx border border-zx-line bg-zx-surface p-5 shadow-zx zx-transition">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-zx-sm bg-zx-icon-bg p-2 text-zx-accent">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold">{t('settings.goalTitle')}</h2>
                <p className="text-sm text-zx-text-soft">{t('settings.goalSubtitle')}</p>
              </div>
            </div>
            <Textarea
              value={form.goal12Month}
              onChange={(e) => updateField('goal12Month', e.target.value)}
              rows={4}
              placeholder={t('settings.goalPlaceholder')}
            />
          </section>

          {/* Categories */}
          <section className="grid gap-4 xl:grid-cols-2">
            {[
              { title: t('settings.incomeCategories'), field: 'incomeCategories', inputField: 'newIncomeCategory', placeholder: t('settings.incomePlaceholder') },
              { title: t('settings.expenseCategories'), field: 'expenseCategories', inputField: 'newExpenseCategory', placeholder: t('settings.expensePlaceholder') },
            ].map((section) => (
              <div key={section.field} className="rounded-zx border border-zx-line bg-zx-surface p-5 shadow-zx zx-transition">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-zx-sm bg-zx-icon-bg p-2 text-zx-gold">
                    <Tags className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold">{section.title}</h2>
                    <p className="text-sm text-zx-text-soft">{t('settings.categoriesSubtitle')}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form[section.field].map((item) => (
                    <button key={item} type="button" onClick={() => removeCategory(section.field, item)}
                      className="rounded-full border border-zx-line bg-zx-surface-2 px-3 py-1.5 text-sm text-zx-text-soft transition hover:border-red-500 hover:text-red-400">
                      {item}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Input value={form[section.inputField]} onChange={(e) => updateField(section.inputField, e.target.value)}
                    placeholder={section.placeholder} className="flex-1 py-2.5 px-3" />
                  <Button type="button" onClick={() => addCategory(section.field, section.inputField)}
                    className="bg-zx-surface-2 text-zx-text hover:bg-zx-line">
                    {t('settings.addCategory')}
                  </Button>
                </div>
                <div className="mt-4 border-t border-zx-line pt-4">
                  <p className="text-xs uppercase tracking-wide text-zx-text-soft">{t('settings.builtInSuggestions')}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(section.field === 'incomeCategories' ? defaultIncomeCategories : defaultExpenseCategories).map((item) => (
                      <span key={item} className="rounded-full border border-zx-line px-3 py-1.5 text-xs text-zx-text-soft">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Allocation */}
          <section className="rounded-zx border border-zx-line bg-zx-surface p-5 shadow-zx zx-transition">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-semibold">{t('settings.allocationTitle')}</h2>
                <p className="text-sm text-zx-text-soft">{t('settings.allocationSubtitle')}</p>
              </div>
              <div className={`text-sm font-medium ${allocationTotal === 100 ? 'text-zx-positive' : 'text-zx-gold'}`}>
                {t('settings.total', { value: allocationTotal })}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[
                ['living', t('settings.fields.living')],
                ['emergencyFund', t('settings.fields.emergencyFund')],
                ['longTermAsset', t('settings.fields.longTermAsset')],
                ['businessLearning', t('settings.fields.businessLearning')],
                ['highRiskTrading', t('settings.fields.highRiskTrading')],
              ].map(([key, label]) => (
                <label key={key} className="space-y-2">
                  <span className="text-sm text-zx-text-soft">{label}</span>
                  <Input type="number" min="0" max="100" step="1" value={form.allocationRule[key]}
                    onChange={(e) => updateAllocation(key, e.target.value)} className="py-2.5" />
                </label>
              ))}
            </div>
          </section>

          {error && <p id="settings-error" role="alert" className="rounded-zx-sm border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative">{error}</p>}

          <Button type="submit" disabled={saving}
            className="w-full bg-zx-accent text-zx-on-accent hover:opacity-90 md:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {saving ? t('common.saving') : t('settings.saveButton')}
          </Button>
        </form>
      </main>
  );
}
