import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../core/auth/useAuth';
import { useFeatureAccess } from '../../core/hooks/useFeatureAccess';
import { useI18n } from '../../core/i18n/useI18n';
import EmergencyFund from './EmergencyFund';
import PayYourselfFirst from './PayYourselfFirst';
import DebtControl from './DebtControl';
import IncomeBuilder from './IncomeBuilder';
import Assets from './Assets';

const TABS = [
  { id: 'emergency', featureKey: 'emergency_fund' },
  { id: 'pyf',       featureKey: 'pay_yourself_first' },
  { id: 'debts',     featureKey: 'debt_control' },
  { id: 'income',    featureKey: 'income_builder' },
  { id: 'assets',    featureKey: 'assets' },
];

export default function FinancialBase() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { canAccess } = useFeatureAccess(user);
  const [searchParams, setSearchParams] = useSearchParams();

  const visibleTabs = TABS.filter(tab => canAccess(tab.featureKey));
  const rawTab = searchParams.get('tab');
  const activeTab = visibleTabs.find(tab => tab.id === rawTab)?.id ?? visibleTabs[0]?.id;

  if (visibleTabs.length === 0) return null;

  return (
    <div>
      <div className="border-b border-zx-line">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="-mb-px flex gap-0 overflow-x-auto">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSearchParams({ tab: tab.id }, { replace: true })}
                className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'border-zx-accent text-zx-text'
                    : 'border-transparent text-zx-text-soft hover:text-zx-text'
                }`}
              >
                {t(`nav.items.${tab.featureKey}`, {}, tab.id)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'emergency' && <EmergencyFund />}
      {activeTab === 'pyf' && <PayYourselfFirst />}
      {activeTab === 'debts' && <DebtControl />}
      {activeTab === 'income' && <IncomeBuilder />}
      {activeTab === 'assets' && <Assets />}
    </div>
  );
}
