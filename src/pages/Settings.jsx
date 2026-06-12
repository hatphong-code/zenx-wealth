import { useEffect, useMemo, useState } from 'react';
import { Save, Settings2, Target, Tags } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import AppNav from '../components/AppNav';
import { Button } from '../components/ui/button';
import { useTheme } from '../hooks/useTheme';
import { defaultExpenseCategories, defaultIncomeCategories } from '../data/categories';
import { db } from '../services/firebaseDb';
import { getUserProfile, setUserProfileCache } from '../services/userService';
import { invalidatePayYourselfFirstCache } from '../services/payYourselfFirstService';
import { invalidateReportsCache } from '../services/reportsService';
import { invalidateWealthRoadmapCache } from '../services/wealthRoadmapService';
import { invalidateAICoachCache } from '../services/aiCoachService';
import { useI18n } from '../i18n/useI18n';

const defaultAllocationRule = {
  living: 55,
  emergencyFund: 15,
  longTermAsset: 15,
  businessLearning: 10,
  highRiskTrading: 5,
};

const emptyForm = {
  goal12Month: '',
  incomeCategories: [],
  expenseCategories: [],
  newIncomeCategory: '',
  newExpenseCategory: '',
  allocationRule: defaultAllocationRule,
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
  };
}

function sanitizeCategories(items) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

const themeOptions = [
  {
    key: 'young',
    name: 'Trẻ',
    style: 'Phong cách Ấm',
    desc: 'Màu ấm, bo tròn, từ ngữ đơn giản — thân thiện, khích lệ.',
    swatches: ['#C8643C', '#5E7E5A', '#FBF4EA'],
  },
  {
    key: 'mid',
    name: 'Trung niên',
    style: 'Phong cách Tư gia',
    desc: 'Nền trầm, vàng đồng, thuật ngữ tài chính chuẩn — sang trọng, điềm đạm.',
    swatches: ['#0C1420', '#C9A24B', '#ECE5D6'],
  },
];

const inputCls = 'w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent';

export default function Settings() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    getUserProfile(user.uid, { forceFresh: true })
      .then((profile) => { if (!active) return; setForm(toForm(profile)); setError(''); })
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;
    const allocationRule = Object.fromEntries(
      Object.entries(form.allocationRule).map(([key, value]) => [key, Number(value || 0)])
    );
    if (allocationTotal !== 100) { setError(t('settings.allocationError')); return; }
    setSaving(true); setError(''); setMessage('');
    try {
      const existingProfile = await getUserProfile(user.uid);
      const nextProfile = {
        ...existingProfile,
        goal12Month: form.goal12Month.trim(),
        settings: {
          ...(existingProfile.settings || {}),
          allocationRule,
          customCategories: {
            income: sanitizeCategories(form.incomeCategories),
            expense: sanitizeCategories(form.expenseCategories),
          },
        },
      };
      await setDoc(doc(db, 'users', user.uid), { ...nextProfile, updatedAt: serverTimestamp() }, { merge: true });
      setUserProfileCache(user.uid, nextProfile);
      invalidatePayYourselfFirstCache(user.uid);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      invalidateWealthRoadmapCache(user.uid);
      setMessage(t('settings.saveSuccess'));
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-zx-bg text-zx-text">
      <AppNav />
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
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zx-text-soft">Cá nhân hoá</p>
            <h2 className="font-zx-head mt-1 text-lg font-semibold">Phong cách hiển thị</h2>
            <p className="mt-1 text-sm text-zx-text-soft">
              Chọn theo độ tuổi và sở thích. Đổi bất cứ lúc nào — toàn bộ màu sắc, font và từ ngữ sẽ thay đổi.
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {themeOptions.map((opt) => {
              const active = theme === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTheme(opt.key)}
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
            <textarea
              value={form.goal12Month}
              onChange={(e) => updateField('goal12Month', e.target.value)}
              rows={4}
              placeholder={t('settings.goalPlaceholder')}
              className={inputCls}
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
                  <input value={form[section.inputField]} onChange={(e) => updateField(section.inputField, e.target.value)}
                    placeholder={section.placeholder} className={`flex-1 ${inputCls}`} />
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
                  <input type="number" min="0" max="100" step="1" value={form.allocationRule[key]}
                    onChange={(e) => updateAllocation(key, e.target.value)} className={inputCls} />
                </label>
              ))}
            </div>
          </section>

          {error && <p className="rounded-zx-sm border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
          {message && <p className="rounded-zx-sm border border-green-900 bg-green-950/40 p-3 text-sm text-green-300">{message}</p>}

          <Button type="submit" disabled={saving}
            className="w-full bg-zx-accent text-zx-on-accent hover:opacity-90 md:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {saving ? t('common.saving') : t('settings.saveButton')}
          </Button>
        </form>
      </main>
    </div>
  );
}
