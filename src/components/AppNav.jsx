import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import {
  ClipboardCheck,
  Compass,
  Home,
  Lock,
  Menu,
  Plus,
  UserCircle,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useI18n } from '../i18n/useI18n';
import { auth } from '../services/firebaseAuth';

const navGroups = [
  {
    id: 'home',
    label: 'Home',
    mobileTo: '/',
    icon: Home,
    items: [
      {
        to: '/',
        label: 'Dashboard',
        featureKey: 'dashboard',
        matches: (pathname) => pathname === '/',
      },
    ],
  },
  {
    id: 'track',
    label: 'Track',
    mobileTo: '/transactions',
    icon: Wallet,
    items: [
      {
        to: '/transactions',
        label: 'Transactions',
        featureKey: 'transactions',
        matches: (pathname) => pathname === '/transactions' || /^\/transactions\/[^/]+\/edit$/.test(pathname),
      },
      {
        to: '/transactions/new',
        label: 'Add',
        featureKey: 'add_transaction',
        matches: (pathname) => pathname === '/transactions/new',
      },
      {
        to: '/latte',
        label: 'Latte Factor',
        featureKey: 'latte_factor',
        matches: (pathname) => pathname === '/latte',
      },
    ],
  },
  {
    id: 'plan',
    label: 'Plan',
    mobileTo: '/roadmap',
    icon: Compass,
    items: [
      {
        to: '/roadmap',
        label: 'Roadmap',
        featureKey: 'roadmap',
        matches: (pathname) => pathname === '/roadmap',
      },
      {
        to: '/assets',
        label: 'Assets',
        featureKey: 'assets',
        matches: (pathname) => pathname === '/assets',
      },
      {
        to: '/pay-yourself-first',
        label: 'Pay Yourself First',
        featureKey: 'pay_yourself_first',
        matches: (pathname) => pathname === '/pay-yourself-first',
      },
      {
        to: '/emergency',
        label: 'Emergency Fund',
        featureKey: 'emergency_fund',
        matches: (pathname) => pathname === '/emergency',
      },
      {
        to: '/debts',
        label: 'Debt',
        featureKey: 'debt_control',
        matches: (pathname) => pathname === '/debts',
      },
      {
        to: '/income',
        label: 'Income',
        featureKey: 'income_builder',
        matches: (pathname) => pathname === '/income',
      },
      {
        to: '/trading-risk',
        label: 'Trading Risk',
        featureKey: 'trading_risk',
        matches: (pathname) => pathname === '/trading-risk',
      },
    ],
  },
  {
    id: 'review',
    label: 'Review',
    mobileTo: '/weekly-review',
    icon: ClipboardCheck,
    items: [
      {
        to: '/weekly-review',
        label: 'Weekly Review',
        featureKey: 'weekly_review',
        matches: (pathname) => pathname === '/weekly-review',
      },
      {
        to: '/reports',
        label: 'Reports',
        featureKey: 'reports',
        matches: (pathname) => pathname === '/reports',
      },
      {
        to: '/ai-coach',
        label: 'AI Coach',
        featureKey: 'ai_coach',
        matches: (pathname) => pathname === '/ai-coach',
      },
    ],
  },
  {
    id: 'profile',
    label: 'Profile',
    mobileTo: '/profile',
    icon: UserCircle,
    items: [
      {
        to: '/profile',
        label: 'Profile',
        featureKey: 'profile',
        matches: (pathname) => pathname === '/profile',
      },
      {
        to: '/settings',
        label: 'Settings',
        featureKey: 'settings',
        matches: (pathname) => pathname === '/settings',
      },
      {
        to: '/admin/access',
        label: 'Admin Access',
        featureKey: 'admin_access',
        adminOnly: true,
        matches: (pathname) => pathname === '/admin/access',
      },
    ],
  },
];

function getActiveItem(group, pathname) {
  return group.items.find((item) => item.matches(pathname)) || group.items[0];
}

function GroupIcon({ icon: Icon, active }) {
  return <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-gray-400'}`} />;
}

export default function AppNav() {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { canAccess, isAdmin, subscriptionTier } = useFeatureAccess(user);

  const visibleGroups = useMemo(() => navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.adminOnly) {
          return isAdmin;
        }
        return canAccess(item.featureKey);
      }),
    }))
    .filter((group) => group.items.length > 0), [canAccess, isAdmin]);

  const activeGroup = useMemo(
    () => visibleGroups.find((group) => group.items.some((item) => item.matches(location.pathname))) || visibleGroups[0] || navGroups[0],
    [location.pathname, visibleGroups]
  );
  const activeItem = useMemo(() => getActiveItem(activeGroup, location.pathname), [activeGroup, location.pathname]);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#1F2937] bg-[#0B1020]/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Link to="/" className="block text-lg font-bold tracking-tight text-white">
                {t('common.appName')}
              </Link>
              <p className="truncate text-xs text-gray-400 md:hidden">{t(`nav.items.${activeItem.featureKey}`, {}, activeItem.label)}</p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/transactions/new"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.add')}</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="inline-flex rounded-lg border border-[#1F2937] bg-[#111827] p-2 text-gray-300 transition hover:border-[#374151] hover:text-white md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="hidden rounded-lg border border-[#1F2937] bg-[#111827] px-3 py-2 text-sm text-gray-300 transition hover:border-[#374151] hover:text-white md:inline-flex"
              >
                {t('nav.signOut')}
              </button>
            </div>
          </div>

          <div className="mt-4 hidden items-center gap-2 md:flex">
            {visibleGroups.map((group) => {
              const isActive = activeGroup.id === group.id;
              return (
                <Link
                  key={group.id}
                  to={group.mobileTo}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-[0_8px_24px_rgba(37,99,235,0.28)]'
                      : 'text-gray-300 hover:bg-[#111827] hover:text-white'
                  }`}
                >
                  <GroupIcon icon={group.icon} active={isActive} />
                  {t(`nav.groups.${group.id}`, {}, group.label)}
                </Link>
              );
            })}
          </div>

          <nav className="-mx-1 mt-3 flex items-center gap-2 overflow-x-auto px-1 pb-1">
            {activeGroup.items.map((item) => {
              const isActive = item.matches(location.pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`shrink-0 rounded-lg px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-[#111827] text-white ring-1 ring-[#374151]'
                      : 'text-gray-400 hover:bg-[#111827] hover:text-white'
                  }`}
                >
                  {t(`nav.items.${item.featureKey}`, {}, item.label)}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#1F2937] bg-[#0B1020]/98 px-2 py-2 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {visibleGroups.map((group) => {
            const isActive = activeGroup.id === group.id;
            const Icon = group.icon;
            return (
              <Link
                key={group.id}
                to={group.mobileTo}
                className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-medium transition ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-[#111827] hover:text-white'
                }`}
              >
                <Icon className="mb-1 h-4 w-4" />
                <span>{t(`nav.groups.${group.id}`, {}, group.label)}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {isMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            onClick={() => setIsMenuOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-[#1F2937] bg-[#0F172A] p-4 shadow-[0_-20px_50px_rgba(0,0,0,0.45)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">{t('nav.allModules')}</h2>
                <p className="text-sm text-gray-400">{t('nav.allModulesHint')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-lg border border-[#1F2937] bg-[#111827] p-2 text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[65vh] space-y-4 overflow-y-auto pb-3">
              {visibleGroups.map((group) => (
                <section key={group.id} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <group.icon className="h-4 w-4" />
                    {t(`nav.groups.${group.id}`, {}, group.label)}
                  </div>
                  <div className="grid gap-2">
                    {group.items.map((item) => {
                      const isActive = item.matches(location.pathname);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setIsMenuOpen(false)}
                          className={`rounded-xl border px-3 py-3 text-sm transition ${
                            isActive
                              ? 'border-blue-500 bg-blue-600/15 text-white'
                              : 'border-[#1F2937] bg-[#111827] text-gray-300'
                          }`}
                        >
                          {t(`nav.items.${item.featureKey}`, {}, item.label)}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 text-sm font-medium text-gray-300"
            >
              {t('nav.signOut')}
            </button>
          </div>
        </div>
      )}

      {subscriptionTier === 'free' && (
        <div className="fixed bottom-[84px] right-4 z-20 hidden rounded-full border border-[#1F2937] bg-[#111827]/95 px-3 py-2 text-xs text-amber-200 shadow-lg backdrop-blur md:block">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            {t('nav.freeTierBadge')}
          </div>
        </div>
      )}
    </>
  );
}
