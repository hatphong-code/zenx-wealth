import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../core/auth/useAuth';
import { useI18n } from '../../core/i18n/useI18n';
import { useTheme } from '../../core/hooks/useTheme';
import { useNumberFormat } from '../../core/hooks/useNumberFormat';
import { db } from '../../core/services/firebaseDb';
import { setUserProfileCache, getUserProfile } from '../../core/services/userService';
import { buildLatteProjectionSeries } from '../../core/services/financialCalculations';
import { formatMoney } from '../../core/utils/formatters';
import { LATTE_ITEMS, AGE_BRACKETS, recommendTemplateIdByAgeRange } from '../../core/data/latteOnboarding';

const TOTAL_STEPS = 6;

const GOAL_OPTIONS = [
  { key: 'track',     icon: '🔍' },
  { key: 'emergency', icon: '🛡️' },
  { key: 'debt',      icon: '💳' },
  { key: 'invest',    icon: '🌱' },
];

function StepDots({ current }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all duration-300 ${
          i + 1 === current ? 'w-6 h-2 bg-zx-accent' : i + 1 < current ? 'w-2 h-2 bg-zx-positive' : 'w-2 h-2 bg-zx-line'
        }`} />
      ))}
    </div>
  );
}

function NavButtons({ onNext, onBack, nextLabel, nextDisabled, saving }) {
  const { t } = useI18n();
  return (
    <div className="space-y-2 pt-2">
      <button onClick={onNext} disabled={nextDisabled || saving}
        className="w-full rounded-zx-sm bg-zx-accent py-3.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 transition disabled:opacity-60">
        {saving ? t('onboarding.saving') : (nextLabel || `${t('onboarding.next')} →`)}
      </button>
      {onBack && (
        <button onClick={onBack} disabled={saving}
          className="w-full py-2 text-xs text-zx-text-soft hover:text-zx-text transition">
          ← {t('common.back')}
        </button>
      )}
    </div>
  );
}

export default function OnboardingFlow() {
  const { user } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { fmtNum } = useNumberFormat();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState('VND');
  const [primaryGoal, setPrimaryGoal] = useState('track');
  const [monthlyExpense, setMonthlyExpense] = useState('');
  const [emergencyTarget, setEmergencyTarget] = useState('6');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ageRange, setAgeRange] = useState('22-29');
  const [selectedLatte, setSelectedLatte] = useState([]);
  const [useManualDaily, setUseManualDaily] = useState(false);
  const [manualDaily, setManualDaily] = useState('');

  const dailySavingReal = useManualDaily
    ? Number(manualDaily) || 0
    : selectedLatte.reduce((sum, id) => {
        const item = LATTE_ITEMS.find(i => i.id === id);
        return sum + (item ? (currency === 'USD' ? item.usd : item.vnd) : 0);
      }, 0);
  const hasRealLatteInput = dailySavingReal > 0;

  // ── Step 1: Theme ──────────────────────────────────────────────────
  const themeOptions = [
    {
      key: 'young',
      name: t('onboarding.themeYoungName'),
      desc: t('onboarding.themeYoungDesc'),
      accent: '#C8643C',
      bg: '#FBF4EA',
      text: '#2D1E13',
    },
    {
      key: 'mid',
      name: t('onboarding.themeMidName'),
      desc: t('onboarding.themeMidDesc'),
      accent: '#C9A24B',
      bg: '#0C1420',
      text: '#ECE5D6',
    },
  ];

  const handleFinishAndView = async () => {
    if (!user) return;
    const expense = Number(monthlyExpense);
    if (!Number.isFinite(expense) || expense <= 0) { setError(t('onboarding.errorExpense')); return; }
    setSaving(true);
    setError('');
    try {
      const existing = await getUserProfile(user.uid);
      const settings = {
        ...(existing.settings || {}),
        currency, locale, theme, primaryGoal, ageRange,
        monthlyEssentialExpense: Number(monthlyExpense),
        emergencyFundTargetMonths: Number(emergencyTarget) || 6,
        ...(hasRealLatteInput ? { estimatedDailySaving: dailySavingReal } : {}),
      };
      const next = { ...existing, settings, onboardingCompleted: true, updatedAt: serverTimestamp() };
      await setDoc(doc(db, 'users', user.uid), next, { merge: true });
      setUserProfileCache(user.uid, next);
      navigate('/welcome', { state: { recommendedTemplateId } });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

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
        theme,
        primaryGoal,
        ageRange,
        ...(skip ? {} : {
          monthlyEssentialExpense: Number(monthlyExpense),
          emergencyFundTargetMonths: Number(emergencyTarget) || 6,
          ...(hasRealLatteInput ? { estimatedDailySaving: dailySavingReal } : {}),
        }),
      };
      const next = { ...existing, settings, onboardingCompleted: true, updatedAt: serverTimestamp() };
      await setDoc(doc(db, 'users', user.uid), next, { merge: true });
      setUserProfileCache(user.uid, next);
      navigate('/welcome');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const validateStep4 = () => {
    const expense = Number(monthlyExpense);
    if (!Number.isFinite(expense) || expense <= 0) { setError(t('onboarding.errorExpense')); return false; }
    setError(''); return true;
  };

  const expenseNum = Number(monthlyExpense);
  const expensePreview = Number.isFinite(expenseNum) && expenseNum > 0 ? formatMoney(expenseNum, currency) : null;

  const DEFAULT_SEED_DAILY = currency === 'USD' ? 3 : 50000;
  const dailySavingDisplay = hasRealLatteInput ? dailySavingReal : DEFAULT_SEED_DAILY;
  const projectionSeries = buildLatteProjectionSeries(dailySavingDisplay * 30);
  const recommendedTemplateId = recommendTemplateIdByAgeRange(ageRange);

  const goalLabels = {
    track:     t('onboarding.goalTrack'),
    emergency: t('onboarding.goalEmergency'),
    debt:      t('onboarding.goalDebt'),
    invest:    t('onboarding.goalInvest'),
  };

  return (
    <div className="min-h-screen bg-zx-bg flex items-center justify-center p-4 zx-transition">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="font-zx-display text-2xl font-bold text-zx-text tracking-tight">ZenX Wealth</p>
        </div>
        <StepDots current={step} />

        {/* ── Step 1: Theme ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zx-text-soft">{t('onboarding.step', { current: 1, total: TOTAL_STEPS })}</p>
              <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('onboarding.themeTitle')}</h1>
              <p className="text-sm text-zx-text-soft">{t('onboarding.themeSubtitle')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {themeOptions.map(opt => (
                <button key={opt.key} onClick={() => setTheme(opt.key)}
                  className={`relative overflow-hidden rounded-zx border-2 transition-all ${
                    theme === opt.key ? 'border-zx-accent ring-1 ring-zx-accent' : 'border-zx-line hover:border-zx-accent/50'
                  }`}>
                  {/* Mini preview */}
                  <div className="h-24 flex flex-col items-center justify-center gap-1.5 p-3"
                    style={{ background: opt.bg }}>
                    <div className="w-8 h-1.5 rounded-full" style={{ background: opt.accent }} />
                    <div className="w-12 h-1 rounded-full opacity-40" style={{ background: opt.text }} />
                    <div className="w-10 h-1 rounded-full opacity-25" style={{ background: opt.text }} />
                  </div>
                  <div className="p-3 text-left bg-zx-surface">
                    <p className="font-semibold text-sm text-zx-text">{opt.name}</p>
                    <p className="text-[11px] text-zx-text-soft mt-0.5 leading-tight">{opt.desc}</p>
                  </div>
                  {theme === opt.key && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-zx-accent flex items-center justify-center">
                      <span className="text-[10px] font-bold text-zx-on-accent">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <NavButtons onNext={() => setStep(2)} />
          </div>
        )}

        {/* ── Step 2: Language ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zx-text-soft">{t('onboarding.step', { current: 2, total: TOTAL_STEPS })}</p>
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
                      locale === o.v ? 'border-zx-accent bg-zx-accent-soft ring-1 ring-zx-accent' : 'border-zx-line bg-zx-surface hover:border-zx-accent'
                    }`}>
                    <span className="font-zx-display text-2xl font-bold text-zx-text tracking-wider">{o.badge}</span>
                    <span className="font-medium text-zx-text text-sm">{o.l}</span>
                    {locale === o.v && <span className="text-xs text-zx-accent font-semibold">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <NavButtons onNext={() => setStep(3)} onBack={() => setStep(1)} />
          </div>
        )}

        {/* ── Step 3: Currency + Goal ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zx-text-soft">{t('onboarding.step', { current: 3, total: TOTAL_STEPS })}</p>
              <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('onboarding.currencyGoalTitle')}</h1>
              <p className="text-sm text-zx-text-soft">{t('onboarding.currencyGoalSubtitle')}</p>
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
                      currency === o.v ? 'border-zx-accent bg-zx-accent-soft ring-1 ring-zx-accent' : 'border-zx-line bg-zx-surface hover:border-zx-accent'
                    }`}>
                    <span className="font-zx-display text-2xl font-bold text-zx-text">{o.symbol}</span>
                    <span className="text-xs text-zx-text-soft">{o.v}</span>
                    {currency === o.v && <span className="text-xs text-zx-accent font-semibold">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Goal */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-zx-text-soft">{t('onboarding.goalTitle')}</p>
              <div className="space-y-2">
                {GOAL_OPTIONS.map(g => (
                  <button key={g.key} onClick={() => setPrimaryGoal(g.key)}
                    className={`w-full flex items-center gap-3 rounded-zx-sm border px-4 py-3 text-left transition ${
                      primaryGoal === g.key ? 'border-zx-accent bg-zx-accent-soft text-zx-accent' : 'border-zx-line bg-zx-surface text-zx-text hover:border-zx-accent/50'
                    }`}>
                    <span className="text-lg shrink-0">{g.icon}</span>
                    <span className="text-sm font-medium">{goalLabels[g.key]}</span>
                    {primaryGoal === g.key && <span className="ml-auto text-xs font-semibold">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <NavButtons onNext={() => setStep(4)} onBack={() => setStep(2)} />
          </div>
        )}

        {/* ── Step 4: Numbers ── */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zx-text-soft">{t('onboarding.step', { current: 4, total: TOTAL_STEPS })}</p>
              <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('onboarding.step2Title')}</h1>
              <p className="text-sm text-zx-text-soft">{t('onboarding.step2Subtitle')}</p>
            </div>

            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-zx-text-soft">{t('onboarding.monthlyExpenseLabel')}</span>
                <input type="number" min="1" step="any" value={monthlyExpense}
                  onChange={e => { setMonthlyExpense(e.target.value); setError(''); }}
                  placeholder={t('onboarding.monthlyExpensePlaceholder')}
                  className="mt-2 w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" />
                {expensePreview && <p className="mt-1.5 text-xs text-zx-accent font-medium">≈ {expensePreview}</p>}
                <p className="mt-1 text-xs text-zx-text-soft">{t('onboarding.monthlyExpenseHint')}</p>
              </label>
            </div>

            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-zx-text-soft">{t('onboarding.emergencyTargetLabel')}</span>
                <div className="mt-2 flex gap-2">
                  {['3', '6', '12'].map(n => (
                    <button key={n} type="button" onClick={() => setEmergencyTarget(n)}
                      className={`flex-1 rounded-zx-sm border py-2.5 text-sm font-semibold transition ${
                        emergencyTarget === n ? 'border-zx-accent bg-zx-accent-soft text-zx-accent' : 'border-zx-line bg-zx-surface text-zx-text-soft hover:border-zx-accent'
                      }`}>
                      {n} {t('common.months')}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-zx-text-soft">{t('onboarding.emergencyTargetHint')}</p>
              </label>
            </div>

            {/* Age */}
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-zx-text-soft">{t('onboarding.ageLabel')}</span>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {AGE_BRACKETS.map(a => (
                    <button key={a} type="button" onClick={() => setAgeRange(a)}
                      className={`rounded-zx-sm border py-2.5 text-sm font-semibold transition ${
                        ageRange === a
                          ? 'border-zx-accent bg-zx-accent-soft text-zx-accent'
                          : 'border-zx-line bg-zx-surface text-zx-text-soft hover:border-zx-accent'
                      }`}>
                      {a}
                    </button>
                  ))}
                </div>
              </label>
            </div>

            {error && <p className="rounded-zx-sm border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative">{error}</p>}

            <NavButtons
              onNext={() => { if (validateStep4()) setStep(5); }}
              onBack={() => setStep(3)}
            />
          </div>
        )}

        {/* ── Step 5: Latte Factor Projection ── */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zx-text-soft">
                {t('onboarding.step', { current: 5, total: TOTAL_STEPS })}
              </p>
              <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('onboarding.step3Title')}</h1>
              <p className="text-sm text-zx-text-soft">{t('onboarding.step3Subtitle')}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-zx-text-soft">{t('onboarding.latteIntro')}</p>
              <div className="grid grid-cols-2 gap-2">
                {LATTE_ITEMS.map(item => {
                  const price = currency === 'USD' ? item.usd : item.vnd;
                  const selected = selectedLatte.includes(item.id);
                  return (
                    <button key={item.id} type="button"
                      onClick={() => setSelectedLatte(prev =>
                        selected ? prev.filter(id => id !== item.id) : [...prev, item.id]
                      )}
                      className={`flex items-center gap-2 rounded-zx-sm border px-3 py-2.5 text-left transition ${
                        selected
                          ? 'border-zx-accent bg-zx-accent-soft ring-1 ring-zx-accent'
                          : 'border-zx-line bg-zx-surface hover:border-zx-accent'
                      }`}>
                      <span className="text-xl">{item.icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-zx-text truncate">{t(`onboarding.${item.labelKey}`)}</span>
                        <span className="block text-xs text-zx-text-soft">≈ {formatMoney(price, currency)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {!useManualDaily ? (
              <button type="button" onClick={() => setUseManualDaily(true)}
                className="text-xs text-zx-text-soft underline underline-offset-2 hover:text-zx-text">
                {t('onboarding.latteAdjustManually')}
              </button>
            ) : (
              <label className="block">
                <span className="text-sm font-medium text-zx-text-soft">{t('onboarding.latteAmountLabel')}</span>
                <input type="number" inputMode="decimal" min="0" step="any" value={manualDaily}
                  onChange={e => setManualDaily(e.target.value)}
                  className="mt-2 w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" />
              </label>
            )}

            <div className="rounded-zx-sm border border-zx-line bg-zx-surface-2 p-4 text-center">
              <p className="text-xs text-zx-text-soft">{t('onboarding.latteDailyTotal')}</p>
              <p className="font-zx-display text-2xl font-bold text-zx-accent mt-1">
                {formatMoney(dailySavingDisplay, currency)}
              </p>
              {!hasRealLatteInput && (
                <p className="mt-1 text-[11px] text-zx-text-soft">{t('onboarding.latteIllustrativeNote')}</p>
              )}
            </div>

            <div className="rounded-zx border border-zx-line bg-zx-surface p-4 space-y-3">
              <p className="text-sm font-semibold text-zx-text">{t('onboarding.latteProjectionTitle')}</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={projectionSeries}>
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} tickFormatter={(y) => `${y}y`} />
                    <YAxis hide />
                    <Tooltip formatter={(v) => formatMoney(v, currency)} />
                    <Line type="monotone" dataKey="savings" stroke="var(--zx-text-soft)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="invested" stroke="var(--zx-accent)" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[1, 10, 20].map(y => (
                  <div key={y} className="rounded-zx-sm bg-zx-surface-2 p-2">
                    <p className="text-[10px] text-zx-text-soft">{t(`onboarding.latteYear${y}`)}</p>
                    <p className="text-sm font-bold text-zx-text">
                      {formatMoney(projectionSeries.find(p => p.year === y)?.invested || 0, currency)}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-zx-text-soft text-center">{t('onboarding.latteDisclaimer')}</p>
            </div>

            <div className="space-y-2">
              <button onClick={() => setStep(6)}
                className="w-full rounded-zx-sm bg-zx-accent py-3.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 transition">
                {t('onboarding.next')} →
              </button>
              <button onClick={() => setStep(4)}
                className="w-full py-2 text-xs text-zx-text-soft hover:text-zx-text transition">
                ← {t('common.back')}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 6: Summary ── */}
        {step === 6 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="text-4xl mb-3">✦</div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zx-text-soft">{t('onboarding.step', { current: 6, total: TOTAL_STEPS })}</p>
              <h1 className="font-zx-head text-2xl font-bold text-zx-positive">{t('onboarding.step4Title')}</h1>
              <p className="text-sm text-zx-text-soft">{t('onboarding.step4Subtitle')}</p>
            </div>

            <div className="rounded-zx-sm border border-zx-line bg-zx-surface divide-y divide-zx-line">
              {[
                { label: t('onboarding.summaryLanguage'), value: locale === 'vi' ? t('onboarding.langVI') : t('onboarding.langEN') },
                { label: t('onboarding.summaryCurrency'), value: currency },
                { label: t('onboarding.summaryGoal'), value: goalLabels[primaryGoal] },
                { label: t('onboarding.summaryExpense'), value: formatMoney(Number(monthlyExpense), currency) },
                { label: t('onboarding.summaryEmergency'), value: t('onboarding.summaryMonths', { n: emergencyTarget }) },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-zx-text-soft">{row.label}</span>
                  <span className="text-sm font-semibold text-zx-text">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Budget template recommendation */}
            <div className="rounded-zx-sm border border-zx-accent/40 bg-zx-accent-soft p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-zx-text-soft">{t('onboarding.templateRecommendLabel')}</p>
                <p className="text-sm font-semibold text-zx-text">
                  {t(`budgetTemplates.templates.${recommendedTemplateId}.name`, {}, recommendedTemplateId)}
                </p>
              </div>
              <button type="button"
                onClick={handleFinishAndView}
                disabled={saving}
                className="flex-shrink-0 rounded-zx-sm bg-zx-accent px-3 py-2 text-xs font-semibold text-zx-on-accent hover:opacity-90 transition disabled:opacity-60">
                {saving ? t('onboarding.saving') : t('onboarding.templateRecommendView')}
              </button>
            </div>

            {error && <p className="rounded-zx-sm border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative">{error}</p>}

            <NavButtons
              onNext={() => handleFinish(false)}
              onBack={() => setStep(5)}
              nextLabel={`${t('onboarding.startButton')} 🚀`}
              saving={saving}
            />

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
