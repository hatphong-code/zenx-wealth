import { useEffect, useMemo, useState } from 'react';
import { Save, Settings2, Target, Tags } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import AppNav from '../components/AppNav';
import { Button } from '../components/ui/button';
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
    allocationRule: {
      ...defaultAllocationRule,
      ...(settings.allocationRule || {}),
    },
  };
}

function sanitizeCategories(items) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

export default function Settings() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;

    let active = true;
    getUserProfile(user.uid, { forceFresh: true })
      .then((profile) => {
        if (!active) return;
        setForm(toForm(profile));
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load settings.');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const allocationTotal = useMemo(
    () => Object.values(form.allocationRule).reduce((sum, value) => sum + Number(value || 0), 0),
    [form.allocationRule]
  );

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateAllocation = (field, value) => {
    setForm((current) => ({
      ...current,
      allocationRule: {
        ...current.allocationRule,
        [field]: value,
      },
    }));
  };

  const addCategory = (field, inputField) => {
    const value = form[inputField].trim();
    if (!value) return;

    setForm((current) => ({
      ...current,
      [field]: sanitizeCategories([...current[field], value]),
      [inputField]: '',
    }));
  };

  const removeCategory = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].filter((item) => item !== value),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;

    const allocationRule = Object.fromEntries(
      Object.entries(form.allocationRule).map(([key, value]) => [key, Number(value || 0)])
    );

    if (allocationTotal !== 100) {
      setError(t('settings.allocationError'));
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

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

      await setDoc(
        doc(db, 'users', user.uid),
        {
          ...nextProfile,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setUserProfileCache(user.uid, nextProfile);
      invalidatePayYourselfFirstCache(user.uid);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      invalidateWealthRoadmapCache(user.uid);
      setMessage(t('settings.saveSuccess'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      <AppNav />
      <main className="mx-auto max-w-5xl space-y-6 p-4 pb-24 md:p-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1F2937] bg-[#111827] px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-gray-300">
            <Settings2 className="h-3.5 w-3.5" />
            {t('settings.badge')}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h1>
          <p className="max-w-2xl text-sm text-gray-400">
            {t('settings.subtitle')}
          </p>
          {loading && <p className="text-sm text-gray-400">{t('settings.loading')}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-[#1F2937] bg-[#111827] p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-blue-950/50 p-2 text-blue-300">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold">{t('settings.goalTitle')}</h2>
                <p className="text-sm text-gray-400">{t('settings.goalSubtitle')}</p>
              </div>
            </div>
            <textarea
              value={form.goal12Month}
              onChange={(event) => updateField('goal12Month', event.target.value)}
              rows={4}
              placeholder={t('settings.goalPlaceholder')}
              className="w-full rounded-xl border border-gray-600 bg-[#1F2937] p-4 text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            {[
              {
                title: t('settings.incomeCategories'),
                field: 'incomeCategories',
                inputField: 'newIncomeCategory',
                placeholder: t('settings.incomePlaceholder'),
              },
              {
                title: t('settings.expenseCategories'),
                field: 'expenseCategories',
                inputField: 'newExpenseCategory',
                placeholder: t('settings.expensePlaceholder'),
              },
            ].map((section) => (
              <div key={section.field} className="rounded-2xl border border-[#1F2937] bg-[#111827] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-purple-950/50 p-2 text-purple-300">
                    <Tags className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold">{section.title}</h2>
                    <p className="text-sm text-gray-400">{t('settings.categoriesSubtitle')}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {form[section.field].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => removeCategory(section.field, item)}
                      className="rounded-full border border-[#374151] bg-[#0B1020] px-3 py-1.5 text-sm text-gray-200 transition hover:border-red-500 hover:text-red-300"
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={form[section.inputField]}
                    onChange={(event) => updateField(section.inputField, event.target.value)}
                    placeholder={section.placeholder}
                    className="flex-1 rounded-xl border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    type="button"
                    onClick={() => addCategory(section.field, section.inputField)}
                    className="bg-[#0B1020] text-white hover:bg-[#1F2937]"
                  >
                    {t('settings.addCategory')}
                  </Button>
                </div>

                <div className="mt-4 border-t border-[#1F2937] pt-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{t('settings.builtInSuggestions')}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(section.field === 'incomeCategories' ? defaultIncomeCategories : defaultExpenseCategories).map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-[#1F2937] bg-[#0B1020] px-3 py-1.5 text-xs text-gray-500"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-[#1F2937] bg-[#111827] p-5">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-semibold">{t('settings.allocationTitle')}</h2>
                <p className="text-sm text-gray-400">{t('settings.allocationSubtitle')}</p>
              </div>
              <div className={`text-sm ${allocationTotal === 100 ? 'text-emerald-300' : 'text-amber-300'}`}>
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
                  <span className="text-sm text-gray-300">{label}</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={form.allocationRule[key]}
                    onChange={(event) => updateAllocation(key, event.target.value)}
                    className="w-full rounded-xl border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </section>

          {error && <p className="rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
          {message && <p className="rounded-xl border border-green-900 bg-green-950/40 p-3 text-sm text-green-300">{message}</p>}

          <Button type="submit" disabled={saving} className="w-full bg-blue-600 text-white hover:bg-blue-700 md:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {saving ? t('common.saving') : t('settings.saveButton')}
          </Button>
        </form>
      </main>
    </div>
  );
}

