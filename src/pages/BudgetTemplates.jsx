import { useState } from 'react';
import { CheckCircle, LayoutTemplate } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { budgetTemplates } from '../data/budgetTemplates';
import { db } from '../services/firebaseDb';
import { setUserProfileCache, getUserProfile } from '../services/userService';
import { invalidatePayYourselfFirstCache } from '../services/payYourselfFirstService';
import { invalidateReportsCache } from '../services/reportsService';
import { invalidateWealthRoadmapCache } from '../services/wealthRoadmapService';
import { invalidateAICoachCache } from '../services/aiCoachService';

const ALLOCATION_FIELDS = [
  { key: 'living', label: 'Sinh hoạt' },
  { key: 'emergencyFund', label: 'Quỹ dự phòng' },
  { key: 'longTermAsset', label: 'Tài sản dài hạn' },
  { key: 'businessLearning', label: 'Kinh doanh / học tập' },
  { key: 'highRiskTrading', label: 'Rủi ro cao' },
];

function AllocationBar({ allocation }) {
  const colors = ['bg-zx-accent', 'bg-zx-positive', 'bg-blue-500', 'bg-purple-500', 'bg-red-500'];
  const entries = ALLOCATION_FIELDS.map((f, i) => ({ ...f, value: allocation[f.key] || 0, color: colors[i] }));
  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {entries.map((e) => e.value > 0 && (
          <div key={e.key} className={`${e.color} h-full`} style={{ width: `${e.value}%` }} title={`${e.label}: ${e.value}%`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {entries.map((e) => (
          <span key={e.key} className="flex items-center gap-1 text-xs text-zx-text-soft">
            <span className={`w-2 h-2 rounded-full ${e.color}`} />
            {e.label} {e.value}%
          </span>
        ))}
      </div>
    </div>
  );
}

export default function BudgetTemplates() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [applying, setApplying] = useState(null);
  const [applied, setApplied] = useState(null);
  const [error, setError] = useState('');

  const handleApply = async (template) => {
    if (!user) return;
    const templateName = t(`budgetTemplates.templates.${template.id}.name`, {}, template.id);
    const confirmMsg = t('budgetTemplates.applyConfirm', { name: templateName }, `Áp dụng mẫu "${templateName}"?`);
    if (!window.confirm(confirmMsg)) return;

    setApplying(template.id);
    setError('');
    try {
      const profile = await getUserProfile(user.uid);
      const nextSettings = {
        ...(profile.settings || {}),
        allocationRule: template.allocation,
        customCategories: {
          income: template.categories.income,
          expense: template.categories.expense,
        },
        emergencyFundTargetMonths: template.emergencyTargetMonths,
      };
      await setDoc(doc(db, 'users', user.uid), {
        settings: nextSettings,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setUserProfileCache(user.uid, { ...profile, settings: nextSettings });
      invalidatePayYourselfFirstCache(user.uid);
      invalidateReportsCache(user.uid);
      invalidateWealthRoadmapCache(user.uid);
      invalidateAICoachCache(user.uid);
      setApplied(template.id);
    } catch (err) {
      setError(t('budgetTemplates.applyError', {}, 'Không thể áp dụng mẫu.'));
    } finally {
      setApplying(null);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-6">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-zx-line px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zx-text-soft">
          <LayoutTemplate className="h-3.5 w-3.5" />
          {t('budgetTemplates.badge')}
        </div>
        <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('budgetTemplates.title')}</h1>
        <p className="text-sm text-zx-text-soft">{t('budgetTemplates.subtitle')}</p>
      </div>

      {error && <div className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}

      <div className="grid gap-5 md:grid-cols-2">
        {budgetTemplates.map((template) => {
          const isApplied = applied === template.id;
          const isApplying = applying === template.id;
          const name = t(`budgetTemplates.templates.${template.id}.name`, {}, template.id);
          const description = t(`budgetTemplates.templates.${template.id}.description`, {}, '');
          return (
            <Card key={template.id} className={isApplied ? 'ring-2 ring-zx-positive' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{name}</CardTitle>
                    <p className="mt-1 text-sm text-zx-text-soft leading-5">{description}</p>
                  </div>
                  {isApplied && <CheckCircle className="h-5 w-5 text-zx-positive flex-shrink-0 mt-0.5" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zx-text-soft">{t('budgetTemplates.allocation')}</p>
                  <AllocationBar allocation={template.allocation} />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-zx-text-soft mb-1">{t('budgetTemplates.savingsTarget')}</p>
                    <p className="font-semibold text-zx-text">{Math.round(template.savingsRateTarget * 100)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-zx-text-soft mb-1">{t('budgetTemplates.emergencyTarget')}</p>
                    <p className="font-semibold text-zx-text">{template.emergencyTargetMonths} {t('budgetTemplates.months')}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zx-text-soft">{t('budgetTemplates.categories')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...template.categories.income, ...template.categories.expense].slice(0, 10).map((cat) => (
                      <span key={cat} className="rounded-full bg-zx-surface-2 px-2.5 py-1 text-xs text-zx-text-soft">{cat}</span>
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => handleApply(template)}
                  disabled={isApplying}
                  className={`w-full ${isApplied ? 'bg-zx-positive/20 text-zx-positive' : 'bg-zx-accent text-zx-on-accent hover:opacity-90'}`}
                >
                  {isApplied
                    ? t('budgetTemplates.currentLabel')
                    : isApplying
                    ? '...'
                    : t('budgetTemplates.applyButton')}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
