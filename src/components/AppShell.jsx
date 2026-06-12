import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import {
  ClipboardCheck, Compass, Home, LogOut, Menu, Plus, UserCircle, Wallet, X,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useI18n } from '../i18n/useI18n';
import { useTheme } from '../hooks/useTheme';
import { auth } from '../services/firebaseAuth';

const navGroups = [
  { id: 'home',    icon: Home,          mobileTo: '/',              label: 'Home' },
  { id: 'track',   icon: Wallet,        mobileTo: '/transactions',  label: 'Track' },
  { id: 'plan',    icon: Compass,       mobileTo: '/roadmap',       label: 'Plan' },
  { id: 'review',  icon: ClipboardCheck,mobileTo: '/weekly-review', label: 'Review' },
  { id: 'profile', icon: UserCircle,    mobileTo: '/profile',       label: 'Profile' },
];

const subItems = {
  home:    [{ to: '/', featureKey: 'dashboard', matches: p => p === '/' }],
  track:   [
    { to: '/transactions',     featureKey: 'transactions',   matches: p => p === '/transactions' || /^\/transactions\/[^/]+\/edit$/.test(p) },
    { to: '/transactions/new', featureKey: 'add_transaction',matches: p => p === '/transactions/new' },
    { to: '/latte',            featureKey: 'latte_factor',   matches: p => p === '/latte' },
  ],
  plan: [
    { to: '/roadmap',           featureKey: 'roadmap',           matches: p => p === '/roadmap' },
    { to: '/assets',            featureKey: 'assets',            matches: p => p === '/assets' },
    { to: '/pay-yourself-first',featureKey: 'pay_yourself_first',matches: p => p === '/pay-yourself-first' },
    { to: '/emergency',         featureKey: 'emergency_fund',    matches: p => p === '/emergency' },
    { to: '/debts',             featureKey: 'debt_control',      matches: p => p === '/debts' },
    { to: '/income',            featureKey: 'income_builder',    matches: p => p === '/income' },
    { to: '/trading-risk',      featureKey: 'trading_risk',      matches: p => p === '/trading-risk' },
  ],
  review: [
    { to: '/weekly-review', featureKey: 'weekly_review', matches: p => p === '/weekly-review' },
    { to: '/reports',       featureKey: 'reports',       matches: p => p === '/reports' },
    { to: '/ai-coach',      featureKey: 'ai_coach',      matches: p => p === '/ai-coach' },
  ],
  profile: [
    { to: '/profile',      featureKey: 'profile',  matches: p => p === '/profile' },
    { to: '/settings',     featureKey: 'settings', matches: p => p === '/settings' },
    { to: '/admin/access', featureKey: 'admin_access', adminOnly: true, matches: p => p === '/admin/access' },
  ],
};

function useNav() {
  const location = useLocation();
  const { user } = useAuth();
  const { canAccess, isAdmin } = useFeatureAccess(user);

  const visibleGroups = useMemo(() => navGroups.map(g => ({
    ...g,
    items: (subItems[g.id] || []).filter(item =>
      item.adminOnly ? isAdmin : canAccess(item.featureKey)
    ),
  })).filter(g => g.items.length > 0), [canAccess, isAdmin]);

  const activeGroup = useMemo(() =>
    visibleGroups.find(g => g.items.some(item => item.matches(location.pathname))) || visibleGroups[0],
    [location.pathname, visibleGroups]
  );

  const activeItem = useMemo(() =>
    activeGroup?.items.find(item => item.matches(location.pathname)) || activeGroup?.items[0],
    [activeGroup, location.pathname]
  );

  return { visibleGroups, activeGroup, activeItem };
}

function Avatar({ size = 36 }) {
  const { user } = useAuth();
  if (user?.photoURL) {
    return <img src={user.photoURL} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  const initials = (user?.displayName || user?.email || 'U').slice(0, 1).toUpperCase();
  return (
    <div className="flex items-center justify-center rounded-full font-bold text-zx-on-accent"
      style={{ width: size, height: size, fontSize: size * 0.42, background: 'linear-gradient(135deg, var(--zx-accent), var(--zx-gold-fg))' }}>
      {initials}
    </div>
  );
}

function Sidebar({ visibleGroups, activeGroup, onNav }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === 'mid';
  return (
    <aside className="hidden md:flex w-56 flex-col border-r border-zx-line bg-zx-surface/60 backdrop-blur-sm zx-transition flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div className={`flex items-center justify-center font-bold text-sm ${isDark ? 'rounded-full border border-zx-gold text-zx-gold' : 'rounded-xl text-zx-on-accent bg-zx-accent'}`}
          style={{ width: 34, height: 34, fontFamily: 'var(--zx-font-display)' }}>
          {isDark ? 'ZX' : 'Z'}
        </div>
        <span className="font-zx-head font-semibold text-base text-zx-text">ZenX Wealth</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {visibleGroups.map(g => {
          const isActive = activeGroup?.id === g.id;
          const Icon = g.icon;
          return (
            <button key={g.id} onClick={() => onNav(g.mobileTo)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-zx-sm text-sm font-medium transition-all text-left ${
                isActive ? 'bg-zx-accent-soft text-zx-accent' : 'text-zx-text-soft hover:bg-zx-surface-2 hover:text-zx-text'
              }`}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              {t(`nav.groups.${g.id}`, {}, g.label)}
            </button>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t border-zx-line p-3">
        <SignOutButton />
      </div>
    </aside>
  );
}

function SignOutButton() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const handleSignOut = async () => { await signOut(auth); navigate('/login'); };
  return (
    <button onClick={handleSignOut}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-zx-sm text-sm text-zx-text-soft hover:text-zx-text hover:bg-zx-surface-2 transition">
      <LogOut className="h-4 w-4" />
      {t('nav.signOut')}
    </button>
  );
}

function TopBar({ activeGroup, activeItem, visibleGroups, onNav }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const pageTitle = activeGroup ? t(`nav.groups.${activeGroup.id}`, {}, activeGroup.label) : '';
  const firstName = user?.displayName?.split(' ').pop() || user?.email?.split('@')[0] || 'bạn';
  const hasSubItems = (activeGroup?.items?.length || 0) > 1;

  return (
    <div className="flex-shrink-0 border-b border-zx-line zx-transition">
      <div className="flex items-center justify-between gap-4 px-6 py-4 md:px-8">
        <div className="min-w-0">
          <p className="text-xs text-zx-text-soft">{t('dashboard.greeting', { name: firstName })}</p>
          <h1 className="font-zx-head text-xl font-semibold text-zx-text leading-tight mt-0.5">{pageTitle}</h1>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link to="/transactions/new"
            className="hidden sm:inline-flex items-center gap-2 rounded-zx-sm bg-zx-accent px-3 py-2 text-sm font-medium text-zx-on-accent transition hover:opacity-90">
            <Plus className="h-4 w-4" />
            <span>{t('nav.add')}</span>
          </Link>
          <Avatar />
        </div>
      </div>

      {/* Sub-nav */}
      {hasSubItems && (
        <div className="flex items-center gap-1 overflow-x-auto px-6 pb-3 md:px-8">
          {activeGroup.items.map(item => {
            const isActive = item.matches(location.pathname);
            return (
              <button key={item.to} onClick={() => onNav(item.to)}
                className={`shrink-0 rounded-zx-sm px-3 py-1.5 text-sm transition ${
                  isActive ? 'bg-zx-surface-2 text-zx-text font-medium' : 'text-zx-text-soft hover:text-zx-text'
                }`}>
                {t(`nav.items.${item.featureKey}`, {}, item.featureKey)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MobileTopBar({ activeGroup }) {
  const { t } = useI18n();
  const pageTitle = activeGroup ? t(`nav.groups.${activeGroup.id}`, {}, activeGroup.label) : '';
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-zx-line flex-shrink-0 md:hidden zx-transition">
      <span className="font-zx-head font-semibold text-zx-text">{pageTitle}</span>
      <div className="flex items-center gap-2">
        <Link to="/transactions/new" className="flex items-center justify-center w-8 h-8 rounded-full bg-zx-accent text-zx-on-accent">
          <Plus className="h-4 w-4" />
        </Link>
        <Avatar size={30} />
      </div>
    </div>
  );
}

function BottomTabs({ visibleGroups, activeGroup, onNav }) {
  const { t } = useI18n();
  return (
    <nav className="md:hidden flex-shrink-0 border-t border-zx-line bg-zx-surface/95 backdrop-blur zx-transition">
      <div className="grid px-2 py-2" style={{ gridTemplateColumns: `repeat(${visibleGroups.length}, 1fr)` }}>
        {visibleGroups.map(g => {
          const isActive = activeGroup?.id === g.id;
          const Icon = g.icon;
          return (
            <button key={g.id} onClick={() => onNav(g.mobileTo)}
              className={`flex flex-col items-center justify-center gap-1 min-h-[52px] rounded-zx-sm text-[11px] font-medium transition ${
                isActive ? 'text-zx-accent' : 'text-zx-text-soft'
              }`}>
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2]' : 'stroke-[1.7]'}`} />
              <span>{t(`nav.groups.${g.id}`, {}, g.label)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default function AppShell({ children }) {
  const navigate = useNavigate();
  const { visibleGroups, activeGroup, activeItem } = useNav();
  const onNav = (path) => navigate(path);

  return (
    <div className="flex h-screen bg-zx-bg text-zx-text overflow-hidden zx-transition">
      {/* Desktop sidebar */}
      <Sidebar visibleGroups={visibleGroups} activeGroup={activeGroup} onNav={onNav} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Desktop top bar */}
        <div className="hidden md:block">
          <TopBar activeGroup={activeGroup} activeItem={activeItem} visibleGroups={visibleGroups} onNav={onNav} />
        </div>

        {/* Mobile top bar */}
        <MobileTopBar activeGroup={activeGroup} />

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto scrollbar-hide">
          {children}
        </main>

        {/* Mobile bottom tabs */}
        <BottomTabs visibleGroups={visibleGroups} activeGroup={activeGroup} onNav={onNav} />
      </div>
    </div>
  );
}
