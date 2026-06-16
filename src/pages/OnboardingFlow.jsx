import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { useNumberFormat } from '../hooks/useNumberFormat';
import { db } from '../services/firebaseDb';
import { setUserProfileCache, getUserProfile } from '../services/userService';
import { formatMoney } from '../utils/formatters';

const TOTAL_STEPS = 3;

function StepDots({ current }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all ${
          i + 1 === current ? 'w-6 h-2 bg-zx-accent' : i + 1 < current ? 'w-2 h-2 bg-zx-positive' : 'w-2 h-2 bg-zx-line'
        }`} />
      ))}
    </div>
  );
}

export default function OnboardingFlow() {
  const { user } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const { fmtNum } = useNumberFormat();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState('VND');
  const [monthlyExpense, setMonthlyExpense] = useState('');
  const [emergencyTarget, setEmergencyTarget] = useState('6');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFinish = async (skip = false) => {
    if (!user) return;

    if (!skip) {
      const expense = Number(monthlyExpense);
      if (!Number.isFinite(expense) || expense <= 0) {
        setError(t('onboarding.errorExpense'));
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      const existing = await getUserProfile(user.uid);
      const settings = {
        ...(existing.settings || {}),
        currency,
        locale,
        ...(skip ? {} : {
          monthlyEssentialExpense: Number(monthlyExpense),
          emergencyFundTargetMonths: Number(emergencyTarget) || 6,
        }),
      };
      const next = { ...existing, settings, onboardingCompleted: true, updatedAt: serverTimestamp() };
      await setDoc(doc(db, 'users', user.uid), next, { merge: true });
      setUserProfileCache(user.uid, next);
      navigate('/');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const expenseNum = Number(monthlyExpense);
  const expensePreview = Number.isFinite(expenseNum) && expenseNum > 0
    ? formatMoney(expenseNum, currency)
    : null;

  return (
    <div className="min-h-screen bg-zx-bg flex items-center justify-center p-4 zx-transition">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <p className="font-zx-display text-2xl font-bold text-zx-text tracking-tight">ZenX Wealth</p>
        </div>

        <StepDots current={step} />

        {/* ── Step 1: Language ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zx-text-soft">
                {t('onboarding.step', { current: 1, total: TOTAL_STEPS })}
              </p>
              <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('onboarding.step1Title')}</h1>
              <p className="text-sm text-zx-text-soft">{t('onboarding.step1Subtitle')}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-zx-text-soft text-center">{t('onboarding.chooseLanguage')}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: 'vi', badge: 'VI', l: t('onboarding.langVI') },
                  { v: 'en', badge: 'EN', l: t('onboarding.langEN') },
                ].map(o => (
                  <button key={o.v} onClick={() => setLocale(o.v)}
                    className={`flex flex-col items-center gap-2 rounded-zx border py-5 transition ${
                      locale === o.v
                        ? 'border-zx-accent bg-zx-accent-soft ring-1 ring-zx-accent'
                        : 'border-zx-line bg-zx-surface hover:border-zx-accent'
                    }`}>
                    <span className="font-zx-display text-2xl font-bold text-zx-text tracking-wider">{o.badge}</span>
                    <span className="font-medium text-zx-text text-sm">{o.l}</span>
                    {locale === o.v && <span className="text-xs text-zx-accent font-semibold">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep(2)}
              className="w-full rounded-zx-sm bg-zx-accent py-3.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 transition">
              {t('onboarding.next')} →
            </button>

            <p className="text-center text-xs text-zx-text-soft">
              {t('onboarding.step', { current: 1, total: TOTAL_STEPS })}
            </p>
          </div>
        )}

        {/* ── Step 2: Currency + Basic Setup ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zx-text-soft">
                {t('onboarding.step', { current: 2, total: TOTAL_STEPS })}
              </p>
              <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('onboarding.step2Title')}</h1>
              <p className="text-sm text-zx-text-soft">{t('onboarding.step2Subtitle')}</p>
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-zx-text-soft">{t('onboarding.chooseCurrency')}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: 'VND', l: t('onboarding.currencyVND'), symbol: '₫' },
                  { v: 'USD', l: t('onboarding.currencyUSD'), symbol: '$' },
                ].map(o => (
                  <button key={o.v} onClick={() => setCurrency(o.v)}
                    className={`flex flex-col items-center gap-1.5 rounded-zx-sm border py-4 transition ${
                      currency === o.v
                        ? 'border-zx-accent bg-zx-accent-soft ring-1 ring-zx-accent'
                        : 'border-zx-line bg-zx-surface hover:border-zx-accent'
                    }`}>
                    <span className="font-zx-display text-2xl font-bold text-zx-text">{o.symbol}</span>
                    <span className="text-xs text-zx-text-soft">{o.v}</span>
                    <span className="text-[10px] text-zx-text-soft text-center leading-tight px-2">{o.l}</span>
                    {currency === o.v && <span className="text-xs text-zx-accent font-semibold">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Monthly expense */}
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-zx-text-soft">{t('onboarding.monthlyExpenseLabel')}</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={monthlyExpense}
                  onChange={e => { setMonthlyExpense(e.target.value); setError(''); }}
                  placeholder={t('onboarding.monthlyExpensePlaceholder')}
                  className="mt-2 w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
                />
                {expensePreview && (
                  <p className="mt-1.5 text-xs text-zx-accent font-medium">≈ {expensePreview}</p>
                )}
                <p className="mt-1 text-xs text-zx-text-soft">{t('onboarding.monthlyExpenseHint')}</p>
              </label>
            </div>

            {/* Emergency target */}
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-zx-text-soft">{t('onboarding.emergencyTargetLabel')}</span>
                <div className="mt-2 flex gap-2">
                  {['3', '6', '12'].map(n => (
                    <button key={n} type="button" onClick={() => setEmergencyTarget(n)}
                      className={`flex-1 rounded-zx-sm border py-2.5 text-sm font-semibold transition ${
                        emergencyTarget === n
                          ? 'border-zx-accent bg-zx-accent-soft text-zx-accent'
                          : 'border-zx-line bg-zx-surface text-zx-text-soft hover:border-zx-accent'
                      }`}>
                      {n} {t('common.months')}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-zx-text-soft">{t('onboarding.emergencyTargetHint')}</p>
              </label>
            </div>

            {error && <p className="rounded-zx-sm bg-red-950/40 border border-red-900 p-3 text-sm text-red-300">{error}</p>}

            <div className="space-y-2">
              <button onClick={() => { setError(''); if (!Number.isFinite(Number(monthlyExpense)) || Number(monthlyExpense) <= 0) { setError(t('onboarding.errorExpense')); return; } setStep(3); }}
                className="w-full rounded-zx-sm bg-zx-accent py-3.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 transition">
                {t('onboarding.next')} →
              </button>
              <button onClick={() => setStep(1)}
                className="w-full py-2 text-xs text-zx-text-soft hover:text-zx-text transition">
                ← {t('common.back')}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="text-4xl mb-3">✦</div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zx-text-soft">
                {t('onboarding.step', { current: 3, total: TOTAL_STEPS })}
              </p>
              <h1 className="font-zx-head text-2xl font-bold text-zx-positive">{t('onboarding.step3Title')}</h1>
              <p className="text-sm text-zx-text-soft">{t('onboarding.step3Subtitle')}</p>
            </div>

            {/* Summary */}
            <div className="rounded-zx-sm border border-zx-line bg-zx-surface divide-y divide-zx-line">
              {[
                { label: t('onboarding.summaryLanguage'), value: locale === 'vi' ? t('onboarding.langVI') : t('onboarding.langEN') },
                { label: t('onboarding.summaryCurrency'), value: currency },
                { label: t('onboarding.summaryExpense'), value: formatMoney(Number(monthlyExpense), currency) },
                { label: t('onboarding.summaryEmergency'), value: t('onboarding.summaryMonths', { n: emergencyTarget }) },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-zx-text-soft">{row.label}</span>
                  <span className="text-sm font-semibold text-zx-text">{row.value}</span>
                </div>
              ))}
            </div>

            {error && <p className="rounded-zx-sm bg-red-950/40 border border-red-900 p-3 text-sm text-red-300">{error}</p>}

            <div className="space-y-2">
              <button onClick={() => handleFinish(false)} disabled={saving}
                className="w-full rounded-zx-sm bg-zx-accent py-3.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 transition disabled:opacity-60">
                {saving ? t('onboarding.saving') : t('onboarding.startButton')} 🚀
              </button>
              <button onClick={() => setStep(2)} disabled={saving}
                className="w-full py-2 text-xs text-zx-text-soft hover:text-zx-text transition">
                ← {t('common.back')}
              </button>
            </div>

            <button onClick={() => handleFinish(true)} disabled={saving}
              className="w-full text-center text-xs text-zx-text-soft hover:text-zx-text transition underline underline-offset-2">
              {t('onboarding.skipForNow')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
