import { useEffect, useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { useAuth } from '../../core/auth/useAuth';
import { useI18n } from '../../core/i18n/useI18n';
import { Save, UserCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { db } from '../../core/services/firebaseDb';
import { formatMoney } from '../../core/utils/formatters';
import { getCachedUserProfile, getUserProfile, setUserProfileCache } from '../../core/services/userService';
import { invalidateDashboardStatsCache } from '../../core/services/dashboardService';
import { invalidateEmergencyFundCache } from '../../core/services/emergencyFundService';
import { invalidateLatteFactorCache } from '../../core/services/latteFactorService';
import { invalidatePayYourselfFirstCache } from '../../core/services/payYourselfFirstService';
import { invalidateReportsCache } from '../../core/services/reportsService';
import { invalidateTransactionsCache } from '../../core/services/transactionService';
import { getCurrentWeekMeta, invalidateWeeklyReviewCache } from '../../core/services/weeklyReviewService';
import { invalidateWealthRoadmapCache } from '../../core/services/wealthRoadmapService';
import { invalidateAICoachCache } from '../../core/services/aiCoachService';

const defaultSettings = {
  currency: 'VND',
  monthlyEssentialExpense: 15000000,
  emergencyFundTargetMonths: 6,
  payYourselfFirstRate: 0.3,
  allocationRule: {
    living: 55,
    emergencyFund: 15,
    longTermAsset: 15,
    businessLearning: 10,
    highRiskTrading: 5,
  },
};

function toForm(user, userData = {}) {
  const settings = {
    ...defaultSettings,
    ...(userData.settings || {}),
  };

  return {
    displayName: userData.displayName || user?.displayName || user?.email?.split('@')[0] || 'User',
    email: userData.email || user?.email || '',
    currency: settings.currency || 'VND',
    monthlyEssentialExpense: String(settings.monthlyEssentialExpense || defaultSettings.monthlyEssentialExpense),
    emergencyFundTargetMonths: String(settings.emergencyFundTargetMonths || defaultSettings.emergencyFundTargetMonths),
    payYourselfFirstRate: String(Math.round((settings.payYourselfFirstRate || defaultSettings.payYourselfFirstRate) * 100)),
  };
}

export default function Profile() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [form, setForm] = useState(toForm(user));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    const cached = getCachedUserProfile(user.uid);
    if (cached) {
      setForm(toForm(user, cached));
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }

    let active = true;

    getUserProfile(user.uid, { forceFresh: true })
      .then((profile) => {
        if (!active) return;
        setForm((current) => ({
          ...current,
          ...toForm(user, profile),
        }));
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load profile.');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;

    const monthlyEssentialExpense = Number(form.monthlyEssentialExpense);
    const emergencyFundTargetMonths = Number(form.emergencyFundTargetMonths);
    const payYourselfPercent = Number(form.payYourselfFirstRate);

    if (!Number.isFinite(monthlyEssentialExpense) || monthlyEssentialExpense <= 0) {
      setError(t('profile.errors.monthlyExpenseRequired'));
      return;
    }

    if (!Number.isFinite(emergencyFundTargetMonths) || emergencyFundTargetMonths <= 0) {
      setError(t('profile.errors.emergencyTargetRequired'));
      return;
    }

    if (!Number.isFinite(payYourselfPercent) || payYourselfPercent < 0 || payYourselfPercent > 100) {
      setError(t('profile.errors.pyfRateInvalid'));
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const displayName = form.displayName.trim() || user.email?.split('@')[0] || 'User';
      const existingProfile = await getUserProfile(user.uid);

      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }

      const cachedProfile = {
        ...existingProfile,
        email: user.email || form.email,
        displayName,
        photoURL: user.photoURL || '',
        settings: {
          ...(existingProfile.settings || {}),
          currency: form.currency,
          monthlyEssentialExpense,
          emergencyFundTargetMonths,
          payYourselfFirstRate: payYourselfPercent / 100,
        },
      };

      await setDoc(doc(db, 'users', user.uid), {
        ...cachedProfile,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setUserProfileCache(user.uid, cachedProfile);
      invalidateDashboardStatsCache(user.uid);
      invalidateEmergencyFundCache(user.uid);
      invalidateLatteFactorCache(user.uid);
      invalidatePayYourselfFirstCache(user.uid);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      invalidateTransactionsCache(user.uid);
      const weekMeta = getCurrentWeekMeta();
      invalidateWeeklyReviewCache(user.uid, weekMeta.weekKey);
      invalidateWealthRoadmapCache(user.uid);
      setMessage(t('profile.saveSuccess'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8">
        <div className="flex items-center gap-3">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="h-12 w-12 rounded-full" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zx-surface">
              <UserCircle className="h-7 w-7 text-zx-text-soft" />
            </div>
          )}
          <div className="space-y-1">
            <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('profile.title')}</h1>
            <p className="text-sm text-zx-text-soft">{t('profile.subtitle')}</p>
            {loading && <p className="text-sm text-zx-text-soft">{t('profile.loading')}</p>}
            {refreshing && <p className="text-sm text-zx-accent">{t('profile.refreshing')}</p>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="py-6 space-y-6">
          <section className="space-y-4">
            <h2 className="font-zx-head text-lg font-semibold text-zx-text">{t('profile.account')}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm text-zx-text-soft">{t('profile.displayName')}</span>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(event) => updateField('displayName', event.target.value)}
                  className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-zx-text-soft">{t('profile.email')}</span>
                <input
                  type="email"
                  value={form.email}
                  className="w-full rounded border border-zx-line bg-zx-bg p-3 text-zx-text-soft"
                  disabled
                />
              </label>
            </div>
          </section>

          <section className="space-y-4 border-t border-zx-line pt-5">
            <h2 className="font-zx-head text-lg font-semibold text-zx-text">{t('profile.financialSettings')}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm text-zx-text-soft">{t('profile.currency')}</span>
                <select
                  value={form.currency}
                  onChange={(event) => updateField('currency', event.target.value)}
                  className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
                >
                  <option value="VND">VND</option>
                  <option value="USD">USD</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-zx-text-soft">{t('profile.monthlyExpense')}</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={form.monthlyEssentialExpense}
                  onChange={(event) => updateField('monthlyEssentialExpense', event.target.value)}
                  className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
                  required
                />
                <span className="text-xs text-zx-text-soft">
                  {form.monthlyEssentialExpense
                    ? `~ ${formatMoney(form.monthlyEssentialExpense, form.currency)}`
                    : `Hint: ${formatMoney(defaultSettings.monthlyEssentialExpense, form.currency)}`}
                </span>
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-zx-text-soft">{t('profile.emergencyTarget')}</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.emergencyFundTargetMonths}
                  onChange={(event) => updateField('emergencyFundTargetMonths', event.target.value)}
                  className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-zx-text-soft">{t('profile.pyfRate')}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.payYourselfFirstRate}
                  onChange={(event) => updateField('payYourselfFirstRate', event.target.value)}
                  className="w-full rounded border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
                  required
                />
              </label>
            </div>
          </section>

          {error && <p className="rounded border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative">{error}</p>}
          {message && <p className="rounded border border-green-900 bg-green-950/40 p-3 text-sm text-zx-positive">{message}</p>}

          <Button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 bg-zx-accent text-zx-on-accent hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          >
            <Save className="h-4 w-4" />
            {saving ? t('profile.saving') : t('profile.saveButton')}
          </Button>
        </form>
      </main>
  );
}




