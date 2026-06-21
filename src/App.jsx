import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import { featureCatalogByKey } from './data/accessControl';
import { useFeatureAccess } from './hooks/useFeatureAccess';
import { useI18n } from './i18n/useI18n';
import AppShell from './components/AppShell';
import { UserSettingsSync } from './components/UserSettingsSync';
import { getCachedUserProfile, getUserProfile } from './services/userService';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const TrackHub = lazy(() => import('./pages/TrackHub'));
const PlanHub = lazy(() => import('./pages/PlanHub'));
const ReviewHub = lazy(() => import('./pages/ReviewHub'));
const LatteFactor = lazy(() => import('./pages/LatteFactor'));
const Login = lazy(() => import('./pages/Login'));
const AddTransaction = lazy(() => import('./pages/AddTransaction'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Profile = lazy(() => import('./pages/Profile'));
const EmergencyFund = lazy(() => import('./pages/EmergencyFund'));
const WeeklyReview = lazy(() => import('./pages/WeeklyReview'));
const DebtControl = lazy(() => import('./pages/DebtControl'));
const IncomeBuilder = lazy(() => import('./pages/IncomeBuilder'));
const WealthRoadmap = lazy(() => import('./pages/WealthRoadmap'));
const PayYourselfFirst = lazy(() => import('./pages/PayYourselfFirst'));
const TradingRisk = lazy(() => import('./pages/TradingRisk'));
const Assets = lazy(() => import('./pages/Assets'));
const Reports = lazy(() => import('./pages/Reports'));
const AICoach = lazy(() => import('./pages/AICoach'));
const MonthlyLetter = lazy(() => import('./pages/MonthlyLetter'));
const GoalTracking = lazy(() => import('./pages/GoalTracking'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminAccessControl = lazy(() => import('./pages/AdminAccessControl'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const OnboardingFlow = lazy(() => import('./pages/OnboardingFlow'));
const BudgetTemplates = lazy(() => import('./pages/BudgetTemplates'));
const ImportTransactions = lazy(() => import('./pages/ImportTransactions'));
const HealthScore = lazy(() => import('./pages/HealthScore'));
const Upgrade = lazy(() => import('./pages/Upgrade'));
const WelcomeScreen = lazy(() => import('./pages/WelcomeScreen'));

function PageFallback() {
  const { t } = useI18n();
  return <div className="p-10 text-center">{t('common.loading')}</div>;
}

function LockedFeature({ featureKey, subscriptionTier, isAdmin }) {
  const { t } = useI18n();
  const feature = featureCatalogByKey[featureKey];
  const featureLabel = t(`features.${featureKey}.label`, {}, feature?.label || 'Feature');
  const tierLabel = subscriptionTier === 'premium' ? t('common.premium') : t('common.free');

  return (
    <div className="min-h-screen bg-zx-bg p-4 text-zx-text md:p-6">
      <div className="mx-auto max-w-2xl rounded-zx border border-zx-line bg-zx-surface p-6 shadow-zx">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-zx-gold">
          {t('locked.badge', { tier: tierLabel })}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {t('locked.title', { feature: featureLabel })}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zx-text-soft">{t('locked.body')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="/upgrade" className="rounded-zx-sm bg-zx-gold px-4 py-2 text-sm font-medium text-black">
            {t('locked.upgradeButton')}
          </a>
          <a href="/" className="rounded-zx-sm border border-zx-line px-4 py-2 text-sm text-zx-text-soft">
            {t('locked.backDashboard')}
          </a>
          {isAdmin && (
            <a href="/admin/access" className="rounded-zx-sm border border-zx-line px-4 py-2 text-sm text-zx-text-soft">
              {t('locked.openAdmin')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function PrivateRoute({ children, featureKey, adminOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { canAccess, isAdmin, loading: accessLoading, subscriptionTier } = useFeatureAccess(user);
  const [onboardingDone, setOnboardingDone] = useState(null); // null=checking, true/false=known

  useEffect(() => {
    if (!user) return;
    // Check cached profile first for instant response
    const cached = getCachedUserProfile(user.uid);
    if (cached) {
      setOnboardingDone(Boolean(cached.onboardingCompleted));
      return;
    }
    // Fetch from Firestore if not cached
    getUserProfile(user.uid).then(profile => {
      setOnboardingDone(Boolean(profile.onboardingCompleted));
    }).catch(() => setOnboardingDone(true)); // fail-safe: don't block app
  }, [user]);

  if (loading) return <PageFallback />;
  if (!user) return <Navigate to="/login" />;
  if (accessLoading) return <PageFallback />;

  // Redirect to onboarding if not completed (skip check on /onboarding itself)
  if (onboardingDone === null) return <PageFallback />; // still checking
  if (!onboardingDone && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (adminOnly && !isAdmin) return <Navigate to="/" />;
  if (featureKey && !adminOnly && !canAccess(featureKey)) {
    return <AppShell><LockedFeature featureKey={featureKey} subscriptionTier={subscriptionTier} isAdmin={isAdmin} /></AppShell>;
  }

  return <AppShell>{children}</AppShell>;
}

function routeElement(element) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>;
}

export default function App() {
  return (
    <BrowserRouter>
      <UserSettingsSync />
      <Routes>
        <Route path="/login" element={routeElement(<Login />)} />
        <Route path="/onboarding" element={routeElement(<OnboardingFlow />)} />
        <Route path="/welcome" element={routeElement(<WelcomeScreen />)} />
        <Route path="/" element={routeElement(<PrivateRoute featureKey="dashboard"><Dashboard /></PrivateRoute>)} />
        <Route path="/track" element={routeElement(<PrivateRoute featureKey="transactions"><TrackHub /></PrivateRoute>)} />
        <Route path="/plan" element={routeElement(<PrivateRoute featureKey="roadmap"><PlanHub /></PrivateRoute>)} />
        <Route path="/review" element={routeElement(<PrivateRoute featureKey="weekly_review"><ReviewHub /></PrivateRoute>)} />
        <Route path="/transactions" element={routeElement(<PrivateRoute featureKey="transactions"><Transactions /></PrivateRoute>)} />
        <Route path="/transactions/new" element={routeElement(<PrivateRoute featureKey="add_transaction"><AddTransaction /></PrivateRoute>)} />
        <Route path="/transactions/:transactionId/edit" element={routeElement(<PrivateRoute featureKey="transactions"><AddTransaction /></PrivateRoute>)} />
        <Route path="/latte" element={routeElement(<PrivateRoute featureKey="latte_factor"><LatteFactor /></PrivateRoute>)} />
        <Route path="/pay-yourself-first" element={routeElement(<PrivateRoute featureKey="pay_yourself_first"><PayYourselfFirst /></PrivateRoute>)} />
        <Route path="/emergency" element={routeElement(<PrivateRoute featureKey="emergency_fund"><EmergencyFund /></PrivateRoute>)} />
        <Route path="/debts" element={routeElement(<PrivateRoute featureKey="debt_control"><DebtControl /></PrivateRoute>)} />
        <Route path="/income" element={routeElement(<PrivateRoute featureKey="income_builder"><IncomeBuilder /></PrivateRoute>)} />
        <Route path="/assets" element={routeElement(<PrivateRoute featureKey="assets"><Assets /></PrivateRoute>)} />
        <Route path="/trading-risk" element={routeElement(<PrivateRoute featureKey="trading_risk"><TradingRisk /></PrivateRoute>)} />
        <Route path="/roadmap" element={routeElement(<PrivateRoute featureKey="roadmap"><WealthRoadmap /></PrivateRoute>)} />
        <Route path="/weekly-review" element={routeElement(<PrivateRoute featureKey="weekly_review"><WeeklyReview /></PrivateRoute>)} />
        <Route path="/reports" element={routeElement(<PrivateRoute featureKey="reports"><Reports /></PrivateRoute>)} />
        <Route path="/ai-coach" element={routeElement(<PrivateRoute featureKey="ai_coach"><AICoach /></PrivateRoute>)} />
        <Route path="/monthly-letter" element={routeElement(<PrivateRoute featureKey="reports"><MonthlyLetter /></PrivateRoute>)} />
        <Route path="/goal-tracking" element={routeElement(<PrivateRoute featureKey="reports"><GoalTracking /></PrivateRoute>)} />
        <Route path="/profile" element={routeElement(<PrivateRoute featureKey="profile"><Profile /></PrivateRoute>)} />
        <Route path="/settings" element={routeElement(<PrivateRoute featureKey="settings"><Settings /></PrivateRoute>)} />
        <Route path="/admin/access" element={routeElement(<PrivateRoute adminOnly><AdminAccessControl /></PrivateRoute>)} />
        <Route path="/admin/settings" element={routeElement(<PrivateRoute adminOnly><AdminSettings /></PrivateRoute>)} />
        <Route path="/budget-templates" element={routeElement(<PrivateRoute featureKey="budget_templates"><BudgetTemplates /></PrivateRoute>)} />
        <Route path="/import" element={routeElement(<PrivateRoute featureKey="import_transactions"><ImportTransactions /></PrivateRoute>)} />
        <Route path="/health-score" element={routeElement(<PrivateRoute featureKey="health_score"><HealthScore /></PrivateRoute>)} />
        <Route path="/upgrade" element={routeElement(<PrivateRoute featureKey="dashboard"><Upgrade /></PrivateRoute>)} />
      </Routes>
    </BrowserRouter>
  );
}
