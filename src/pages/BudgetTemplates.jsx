import { useEffect, useState } from 'react';
import { CheckCircle, LayoutTemplate, X } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { getBudgetTemplates } from '../services/budgetTemplatesService';
import { db } from '../services/firebaseDb';
import { getUserProfile, setUserProfileCache } from '../services/userService';
import { invalidatePayYourselfFirstCache } from '../services/payYourselfFirstService';
import { invalidateDashboardStatsCache } from '../services/dashboardService';
import { invalidateReportsCache } from '../services/reportsService';
import { invalidateWealthRoadmapCache } from '../services/wealthRoadmapService';
import { invalidateAICoachCache } from '../services/aiCoachService';
import { getCurrentWeekMeta, invalidateWeeklyReviewCache } from '../services/weeklyReviewService';

const ALLOCATION_KEYS = ['living', 'emergencyFund', 'longTermAsset', 'businessLearning', 'highRiskTrading'];
const ALLOC_COLORS = ['bg-zx-accent', 'bg-zx-positive', 'bg-blue-500', 'bg-purple-500', 'bg-red-500'];

/* Full bar + legend — dùng trong modal */
function AllocationBar({ allocation, t }) {
  const entries = ALLOCATION_KEYS.map((key, i) => ({
    key, label: t(`settings.fields.${key}`), value: allocation[key] || 0, color: ALLOC_COLORS[i],
  }));
  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {entries.map(e => e.value > 0 && (
          <div key={e.key} className={`${e.color} h-full`} style={{ width: `${e.value}%` }} title={`${e.label}: ${e.value}%`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {entries.map(e => (
          <span key={e.key} className="flex items-center gap-1 text-xs text-zx-text-soft">
            <span className={`w-2 h-2 rounded-full ${e.color}`} />
            {e.label} {e.value}%
          </span>
        ))}
      </div>
    </div>
  );
}

/* Compact bar — chỉ bar + dot-% không label, dùng trong card */
function AllocationBarCompact({ allocation }) {
  const entries = ALLOCATION_KEYS.map((key, i) => ({
    key, value: allocation[key] || 0, color: ALLOC_COLORS[i],
  }));
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {entries.map(e => e.value > 0 && (
          <div key={e.key} className={`${e.color} h-full`} style={{ width: `${e.value}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {entries.filter(e => e.value > 0).map(e => (
          <span key={e.key} className="flex items-center gap-1 text-[11px] text-zx-text-soft">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.color}`} />
            {e.value}%
          </span>
        ))}
      </div>
    </div>
  );
}

function DiffRow({ label, current, next }) {
  const changed = current !== next;
  return (
    <div className={`flex items-center justify-between py-2 text-sm ${changed ? '' : 'opacity-50'}`}>
      <span className="text-zx-text-soft">{label}</span>
      <span className="flex items-center gap-2">
        {changed && <span className="text-zx-text-soft line-through text-xs">{current}</span>}
        <span className={changed ? 'text-zx-accent font-medium' : 'text-zx-text'}>{next}</span>
      </span>
    </div>
  );
}

function ApplyModal({ template, currentSettings, onConfirm, onCancel, applying, t, locale }) {
  const name = (locale === 'en' ? template.nameEN : template.nameVI)
    || t(`budgetTemplates.templates.${template.id}.name`, {}, template.nameVI || template.id);
  const cats = locale === 'en' && template.categoriesEN
    ? template.categoriesEN
    : template.categories;

  const currentAlloc = currentSettings?.allocationRule || {};
  const currentEmergency = currentSettings?.emergencyFundTargetMonths || 6;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-zx border border-zx-line bg-zx-surface shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zx-line">
          <h2 className="font-zx-head text-base font-bold text-zx-text">{t('budgetTemplates.previewTitle', { name })}</h2>
          <button onClick={onCancel} aria-label={t('common.close')} className="text-zx-text-soft hover:text-zx-text transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-zx-text-soft">{t('budgetTemplates.previewHint')}</p>

          {/* Allocation */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-2">{t('budgetTemplates.allocation')}</p>
            <AllocationBar allocation={template.allocation} t={t} />
            <div className="mt-3 divide-y divide-zx-line/50">
              {ALLOCATION_KEYS.map(key => (
                <DiffRow
                  key={key}
                  label={t(`settings.fields.${key}`)}
                  current={`${currentAlloc[key] ?? '—'}%`}
                  next={`${template.allocation[key]}%`}
                />
              ))}
            </div>
          </div>

          {/* Emergency */}
          <div className="divide-y divide-zx-line/50 border-t border-zx-line pt-3">
            <DiffRow
              label={t('budgetTemplates.emergencyTarget')}
              current={`${currentEmergency} ${t('budgetTemplates.months')}`}
              next={`${template.emergencyTargetMonths} ${t('budgetTemplates.months')}`}
            />
          </div>

          {/* Categories — tách income / expense */}
          <div className="border-t border-zx-line pt-3 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft">{t('budgetTemplates.categories')}</p>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zx-positive mb-1.5">{t('budgetTemplates.income')}</p>
              <div className="flex flex-wrap gap-1.5">
                {cats.income.map(cat => (
                  <span key={cat} className="rounded-full bg-emerald-950/40 border border-emerald-900/50 px-2.5 py-1 text-xs text-zx-positive">{cat}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zx-text-soft mb-1.5">{t('budgetTemplates.expense')}</p>
              <div className="flex flex-wrap gap-1.5">
                {cats.expense.map(cat => (
                  <span key={cat} className="rounded-full bg-zx-accent-soft border border-zx-accent/30 px-2.5 py-1 text-xs text-zx-accent">{cat}</span>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-amber-400 bg-amber-950/30 rounded-zx-sm px-3 py-2">
            {t('budgetTemplates.overwriteWarning')}
          </p>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-zx-line bg-zx-surface-2">
          <button onClick={onCancel}
            className="flex-1 rounded-zx-sm border border-zx-line py-2.5 text-sm text-zx-text-soft hover:text-zx-text transition">
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} disabled={applying}
            className="flex-1 rounded-zx-sm bg-zx-accent py-2.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 disabled:opacity-50 transition">
            {applying ? '...' : t('budgetTemplates.applyButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BudgetTemplates() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [applying, setApplying] = useState(null);
  const [applied, setApplied] = useState(null);
  const [error, setError] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [currentSettings, setCurrentSettings] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then(p => {
      setCurrentSettings(p.settings || {});
      if (p.appliedTemplateId) setApplied(p.appliedTemplateId);
    }).catch(() => {});
    getBudgetTemplates().then(setTemplates).finally(() => setLoadingTemplates(false));
  }, [user]);

  const openPreview = (template) => setPreviewTemplate(template);
  const closePreview = () => setPreviewTemplate(null);

  const handleApply = async () => {
    const template = previewTemplate;
    if (!user || !template) return;
    setApplying(template.id);
    setError('');
    try {
      const profile = await getUserProfile(user.uid);
      const nextSettings = {
        ...(profile.settings || {}),
        allocationRule: template.allocation,
        payYourselfFirstRate: 1 - (template.allocation.living / 100),
        customCategories: {
          income: template.categories.income,
          expense: template.categories.expense,
        },
        emergencyFundTargetMonths: template.emergencyTargetMonths,
      };
      await setDoc(doc(db, 'users', user.uid), { settings: nextSettings, appliedTemplateId: template.id, updatedAt: serverTimestamp() }, { merge: true });
      setUserProfileCache(user.uid, { ...profile, settings: nextSettings });
      setCurrentSettings(nextSettings);
      invalidateDashboardStatsCache(user.uid);
      invalidatePayYourselfFirstCache(user.uid);
      invalidateReportsCache(user.uid);
      invalidateWealthRoadmapCache(user.uid);
      invalidateAICoachCache(user.uid);
      invalidateWeeklyReviewCache(user.uid, getCurrentWeekMeta().weekKey);
      setApplied(template.id);
      closePreview();
    } catch {
      setError(t('budgetTemplates.applyError', {}, 'Không thể áp dụng mẫu.'));
      closePreview();
    } finally {
      setApplying(null);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-6">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-zx-line px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zx-text-soft">
          <LayoutTemplate className="h-3.5 w-3.5" />
          {t('budgetTemplates.badge')}
        </div>
        <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('budgetTemplates.title')}</h1>
        <p className="text-sm text-zx-text-soft">{t('budgetTemplates.subtitle')}</p>
      </div>

      {error && <div className="rounded-zx-sm border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative">{error}</div>}

      {applied && (
        <div className="flex items-center gap-2 rounded-zx border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {t('budgetTemplates.appliedSuccess', { name: t(`budgetTemplates.templates.${applied}.name`, {}, applied) })}
        </div>
      )}

      {loadingTemplates && <p className="text-sm text-zx-text-soft">{t('common.loading')}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => {
          const isApplied = applied === template.id;
          const name = (locale === 'en' ? template.nameEN : template.nameVI)
            || t(`budgetTemplates.templates.${template.id}.name`, {}, template.nameVI || template.id);
          const description = (locale === 'en' ? template.descEN : template.descVI)
            || t(`budgetTemplates.templates.${template.id}.description`, {}, template.descVI || '');
          const incCats = (locale === 'en' && template.categoriesEN)
            ? template.categoriesEN.income
            : template.categories.income;
          const expCats = (locale === 'en' && template.categoriesEN)
            ? template.categoriesEN.expense
            : template.categories.expense;

          return (
            <Card key={template.id} className={`flex flex-col ${isApplied ? 'ring-2 ring-zx-positive' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{name}</CardTitle>
                  {isApplied && <CheckCircle className="h-4 w-4 text-zx-positive flex-shrink-0 mt-0.5" />}
                </div>
                <p className="text-xs text-zx-text-soft leading-relaxed mt-1">{description}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide border border-zx-line rounded-full px-2 py-0.5 text-zx-text-soft">
                    {t('budgetTemplates.savingsTarget')} {Math.round(template.savingsRateTarget * 100)}%
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide border border-zx-line rounded-full px-2 py-0.5 text-zx-text-soft">
                    {t('budgetTemplates.emergencyTarget')} {template.emergencyTargetMonths}{t('budgetTemplates.months')}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-4 flex flex-col flex-1">
                {/* Compact allocation bar */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-2">
                    {t('budgetTemplates.allocation')}
                  </p>
                  <AllocationBarCompact allocation={template.allocation} />
                </div>

                {/* Categories — income / expense split */}
                <div className="space-y-2.5 flex-1">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zx-positive mb-1.5">
                      {t('budgetTemplates.income')}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {incCats.slice(0, 4).map(cat => (
                        <span key={cat} className="rounded-full bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 text-[11px] text-zx-positive">
                          {cat}
                        </span>
                      ))}
                      {incCats.length > 4 && (
                        <span className="px-1 text-[11px] text-zx-text-soft self-center">+{incCats.length - 4}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-1.5">
                      {t('budgetTemplates.expense')}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {expCats.slice(0, 5).map(cat => (
                        <span key={cat} className="rounded-full bg-zx-surface-2 border border-zx-line px-2 py-0.5 text-[11px] text-zx-text-soft">
                          {cat}
                        </span>
                      ))}
                      {expCats.length > 5 && (
                        <span className="px-1 text-[11px] text-zx-text-soft self-center">+{expCats.length - 5}</span>
                      )}
                    </div>
                  </div>
                </div>

                <Button type="button"
                  onClick={() => openPreview(template)}
                  disabled={Boolean(applying)}
                  className={`w-full mt-auto ${isApplied ? 'bg-zx-positive/20 text-zx-positive hover:opacity-80' : 'bg-zx-accent text-zx-on-accent hover:opacity-90'}`}>
                  {isApplied ? t('budgetTemplates.currentLabel') : t('budgetTemplates.previewApplyButton')}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {previewTemplate && (
        <ApplyModal
          template={previewTemplate}
          currentSettings={currentSettings}
          onConfirm={handleApply}
          onCancel={closePreview}
          applying={applying === previewTemplate.id}
          t={t}
          locale={locale}
        />
      )}
    </main>
  );
}

