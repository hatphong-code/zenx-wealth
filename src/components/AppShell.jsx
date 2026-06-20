import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import {
  ChevronRight, ClipboardCheck, Compass, Home, LogOut, Plus, Search, SlidersHorizontal, UserCircle, Wallet, X,
} from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useAuth } from '../auth/useAuth';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useI18n } from '../i18n/useI18n';
import { useTheme } from '../hooks/useTheme';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useWealthRoadmapData } from '../hooks/useWealthRoadmapData';
import { auth } from '../services/firebaseAuth';
import { useNumberFormat } from '../hooks/useNumberFormat';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore/lite';
import { db } from '../services/firebaseDb';
import { getCachedUserProfile, setUserProfileCache } from '../services/userService';

/* ─────────────── nav data ─────────────── */

const NAV_GROUPS = [
  { id: 'home',    icon: Home,               mobileTo: '/',             label: 'Home' },
  { id: 'track',   icon: Wallet,             mobileTo: '/track',        label: 'Track' },
  { id: 'plan',    icon: Compass,            mobileTo: '/plan',         label: 'Plan' },
  { id: 'review',  icon: ClipboardCheck,     mobileTo: '/review',       label: 'Review' },
  { id: 'profile', icon: UserCircle,         mobileTo: '/settings',     label: 'Profile' },
  { id: 'admin',   icon: SlidersHorizontal,  mobileTo: '/admin/access', label: 'Admin' },
];

const isTrack   = p => ['/track','/transactions','/transactions/new','/latte','/import'].includes(p) || /^\/transactions\/[^/]+\/edit$/.test(p);
const isPlan    = p => ['/plan','/roadmap','/assets','/pay-yourself-first','/emergency','/debts','/income','/trading-risk','/budget-templates'].includes(p);
const isReview  = p => ['/review','/weekly-review','/reports','/ai-coach','/health-score'].includes(p);
const isProfile = p => ['/settings','/profile','/monthly-letter','/goal-tracking','/upgrade'].includes(p);
const isAdminP  = p => ['/admin/access','/admin/settings'].includes(p);

const SUB_ITEMS = {
  home:    [{ to: '/', featureKey: 'dashboard', matches: p => p === '/' }],
  track:   [
    { to: '/track',            featureKey: 'transactions',       navKey: 'track_hub', matches: p => p === '/track' },
    { to: '/transactions',     featureKey: 'transactions',                            matches: p => p === '/transactions' || /^\/transactions\/[^/]+\/edit$/.test(p) },
    { to: '/transactions/new', featureKey: 'add_transaction',                         matches: p => p === '/transactions/new' },
    { to: '/latte',            featureKey: 'latte_factor',                            matches: p => p === '/latte' },
    { to: '/import',           featureKey: 'import_transactions',                     matches: p => p === '/import' },
  ],
  plan: [
    { to: '/plan',               featureKey: 'roadmap',            navKey: 'plan_hub', matches: p => p === '/plan' },
    { to: '/roadmap',            featureKey: 'roadmap',                                matches: p => p === '/roadmap' },
    { to: '/emergency',          featureKey: 'emergency_fund',                         matches: p => p === '/emergency' },
    { to: '/pay-yourself-first', featureKey: 'pay_yourself_first',                     matches: p => p === '/pay-yourself-first' },
    { to: '/debts',              featureKey: 'debt_control',                           matches: p => p === '/debts' },
    { to: '/income',             featureKey: 'income_builder',                         matches: p => p === '/income' },
    { to: '/assets',             featureKey: 'assets',                                 matches: p => p === '/assets' },
    { to: '/trading-risk',       featureKey: 'trading_risk',                           matches: p => p === '/trading-risk' },
    { to: '/budget-templates',   featureKey: 'budget_templates',                       matches: p => p === '/budget-templates' },
  ],
  review: [
    { to: '/review',        featureKey: 'weekly_review', navKey: 'review_hub', matches: p => p === '/review' },
    { to: '/weekly-review', featureKey: 'weekly_review',                        matches: p => p === '/weekly-review' },
    { to: '/reports',       featureKey: 'reports',                              matches: p => p === '/reports' },
    { to: '/ai-coach',      featureKey: 'ai_coach',                             matches: p => p === '/ai-coach' },
    { to: '/health-score',  featureKey: 'health_score',                         matches: p => p === '/health-score' },
  ],
  profile: [
    { to: '/settings', featureKey: 'settings',  matches: p => p === '/settings' },
    { to: '/profile',  featureKey: 'profile',   matches: p => p === '/profile' },
    { to: '/upgrade',  featureKey: 'dashboard', matches: p => p === '/upgrade' },
  ],
  admin: [
    { to: '/admin/access',   navKey: 'admin_access',   adminOnly: true, matches: p => p === '/admin/access' },
    { to: '/admin/settings', navKey: 'admin_settings', adminOnly: true, matches: p => p === '/admin/settings' },
  ],
};

// Group matching for activeGroup detection
const GROUP_MATCH = {
  home:    p => p === '/',
  track:   isTrack,
  plan:    isPlan,
  review:  isReview,
  profile: isProfile,
  admin:   isAdminP,
};

/* ─────────────── hooks ─────────────── */

function useNav() {
  const location = useLocation();
  const { user } = useAuth();
  const { canAccess, isAdmin } = useFeatureAccess(user);

  const visibleGroups = useMemo(() => NAV_GROUPS.map(g => ({
    ...g,
    items: (SUB_ITEMS[g.id] || []).filter(item =>
      item.adminOnly ? isAdmin : canAccess(item.featureKey)
    ),
  })).filter(g => g.items.length > 0), [canAccess, isAdmin]);

  const activeGroup = useMemo(() =>
    visibleGroups.find(g => GROUP_MATCH[g.id]?.(location.pathname)) || visibleGroups[0],
    [location.pathname, visibleGroups]
  );

  const activeItem = useMemo(() =>
    activeGroup?.items.find(item => item.matches(location.pathname)) || activeGroup?.items[0],
    [activeGroup, location.pathname]
  );

  return { visibleGroups, activeGroup, activeItem };
}

/* ─────────────── tiny components ─────────────── */

function Avatar({ size = 34 }) {
  const { user } = useAuth();
  if (user?.photoURL) {
    return <img src={user.photoURL} alt="" className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }} />;
  }
  const initial = (user?.displayName || user?.email || 'U').slice(0, 1).toUpperCase();
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-zx-on-accent flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42,
        background: 'linear-gradient(135deg,var(--zx-accent),var(--zx-gold-fg))' }}>
      {initial}
    </div>
  );
}

function ThemeToggle({ compact = false }) {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const themeOptions = [
    { v: 'young', l: t('settings.themeYoungStyle') },
    { v: 'mid', l: t('settings.themeMidStyle') },
  ];
  if (compact) {
    const current = themeOptions.find(o => o.v === theme) || themeOptions[0];
    return (
      <button onClick={() => setTheme(theme === 'mid' ? 'young' : 'mid')}
        title={t('appShell.themeLabel')}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-zx-sm border border-zx-line text-xs font-medium text-zx-text-soft hover:text-zx-text hover:border-zx-accent transition">
        <span className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: theme === 'mid' ? '#C9A24B' : '#C8643C' }} />
        {current.l}
      </button>
    );
  }
  return (
    <div className="p-1 rounded-zx-sm bg-zx-surface-2 flex gap-1">
      {themeOptions.map(o => (
        <button key={o.v} onClick={() => setTheme(o.v)}
          className={`flex-1 text-xs font-medium py-1.5 rounded transition ${
            theme === o.v ? 'bg-zx-accent text-zx-on-accent' : 'text-zx-text-soft hover:text-zx-text'
          }`}>{o.l}</button>
      ))}
    </div>
  );
}

function LocaleToggle({ compact = false }) {
  const { locale, setLocale } = useI18n();
  const { user } = useAuth();
  const next = locale === 'vi' ? 'en' : 'vi';

  const changeLocale = async (nextLocale) => {
    setLocale(nextLocale);
    // Sync to Firestore so services generate text in correct language
    if (!user) return;
    try {
      const cached = getCachedUserProfile(user.uid);
      const next = { ...(cached || {}), settings: { ...(cached?.settings || {}), locale: nextLocale }, updatedAt: serverTimestamp() };
      setUserProfileCache(user.uid, next);
      await setDoc(doc(db, 'users', user.uid), { settings: { locale: nextLocale }, updatedAt: serverTimestamp() }, { merge: true });
    } catch {}
  };

  if (compact) {
    return (
      <button onClick={() => changeLocale(next)}
        title={locale === 'vi' ? 'Switch to English' : 'Chuyển sang tiếng Việt'}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-zx-sm border border-zx-line text-xs font-semibold text-zx-text-soft hover:text-zx-text hover:border-zx-accent transition uppercase tracking-wide">
        {locale === 'vi' ? 'VI' : 'EN'}
      </button>
    );
  }
  return (
    <div className="p-1 rounded-zx-sm bg-zx-surface-2 flex gap-1">
      {[{ v: 'vi', l: 'Tiếng Việt' }, { v: 'en', l: 'English' }].map(o => (
        <button key={o.v} onClick={() => changeLocale(o.v)}
          className={`flex-1 text-xs font-medium py-1.5 rounded transition ${
            locale === o.v ? 'bg-zx-accent text-zx-on-accent' : 'text-zx-text-soft hover:text-zx-text'
          }`}>{o.l}</button>
      ))}
    </div>
  );
}

/* ─────────────── sidebar stats ─────────────── */

function SidebarStats({ userId }) {
  const { stats } = useDashboardStats(userId);
  const { data: roadmap } = useWealthRoadmapData(userId);
  const { t } = useI18n();
  const { fmt } = useNumberFormat();
  const currentPhase = roadmap.phases.find(p => p.id === roadmap.currentPhaseId) || roadmap.phases[0];
  const emgPct = stats.targetMonths > 0 ? (stats.emergencyMonths / stats.targetMonths) * 100 : 0;
  const isPositive = stats.netCashFlow >= 0;

  return (
    <div className="border-t border-zx-line px-4 py-3 space-y-3 flex-shrink-0">
      {/* Net cash flow pulse */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft">{t('dashboard.cards.thisMonth')}</span>
        <span className={`font-zx-display text-sm font-bold ${isPositive ? 'text-zx-positive' : 'text-zx-accent'}`}>
          {isPositive ? '+' : ''}{fmt(stats.netCashFlow)}
        </span>
      </div>

      {/* Emergency fund mini */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft">{t('dashboard.cards.emergencyFund')}</span>
          <span className="text-[10px] font-medium text-zx-text-soft">
            {stats.emergencyMonths.toFixed(1)}/{stats.targetMonths}
          </span>
        </div>
        <div className="h-1 rounded-full bg-zx-surface-2 overflow-hidden">
          <div className="h-full rounded-full bg-zx-positive transition-all duration-700"
            style={{ width: `${Math.min(100, emgPct)}%` }} />
        </div>
      </div>

      {/* Current phase */}
      {currentPhase && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft shrink-0">{t('appShell.phaseLabel', { num: roadmap.completedPhases + 1 })}</span>
          <span className="text-[10px] text-zx-text-soft truncate">{t(`roadmap.phases.${currentPhase.id}`, {}, currentPhase.title)}</span>
        </div>
      )}
    </div>
  );
}

/* ─────────────── sidebar (desktop) ─────────────── */

function Sidebar({ visibleGroups, activeGroup, expandedGroups, onGroupClick, onItemClick, userId }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isDark = theme === 'mid';
  const handleSignOut = async () => { await signOut(auth); navigate('/login'); };

  return (
    <aside className="hidden md:flex w-56 flex-col border-r border-zx-line bg-zx-surface/60 backdrop-blur-sm zx-transition flex-shrink-0">

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 flex-shrink-0">
        <div className={`flex items-center justify-center font-bold text-sm flex-shrink-0 ${
          isDark ? 'rounded-full border border-zx-gold text-zx-gold' : 'rounded-zx-sm text-zx-on-accent bg-zx-accent'
        }`} style={{ width: 32, height: 32, fontFamily: 'var(--zx-font-display)' }}>
          {isDark ? 'ZX' : 'Z'}
        </div>
        <span className="font-zx-head font-semibold text-base text-zx-text">ZenX Wealth</span>
      </div>

      {/* Nav accordion */}
      <nav className="flex-1 px-3 overflow-y-auto space-y-px">
        {visibleGroups.map(g => {
          const isActive = activeGroup?.id === g.id;
          const isExpanded = expandedGroups.has(g.id);
          const hasMultiple = g.items.length > 1;
          const Icon = g.icon;

          return (
            <div key={g.id}>
              {/* Group row */}
              <button onClick={() => onGroupClick(g)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-zx-sm text-sm font-medium transition text-left ${
                  isActive ? 'text-zx-accent' : 'text-zx-text-soft hover:bg-zx-surface-2 hover:text-zx-text'
                }`}>
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{t(`nav.groups.${g.id}`, {}, g.label)}</span>
                {hasMultiple && (
                  <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                )}
              </button>

              {/* Sub-items */}
              {hasMultiple && isExpanded && (
                <div className="ml-7 pl-3 border-l border-zx-line space-y-px pb-1">
                  {g.items.map(item => {
                    const isItemActive = item.matches(location.pathname);
                    return (
                      <button key={item.to} onClick={() => onItemClick(item.to)}
                        className={`w-full text-left px-3 py-2 rounded-zx-sm text-sm transition ${
                          isItemActive ? 'text-zx-accent font-medium' : 'text-zx-text-soft hover:text-zx-text'
                        }`}>
                        {t(`nav.items.${item.navKey || item.featureKey}`, {}, item.navKey || item.featureKey)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Mini stats */}
      <SidebarStats userId={userId} />

      {/* Bottom: theme + locale + sign out */}
      <div className="p-3 space-y-1.5 flex-shrink-0">
        <div className="px-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-1.5 px-2">{t('appShell.themeLabel')}</p>
          <ThemeToggle />
        </div>
        <div className="px-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft mb-1.5 px-2">Language</p>
          <LocaleToggle />
        </div>
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-zx-sm text-sm text-zx-text-soft hover:text-zx-text hover:bg-zx-surface-2 transition">
          <LogOut className="h-4 w-4" />
          {t('nav.signOut')}
        </button>
      </div>
    </aside>
  );
}

/* ─────────────── top bar (desktop) ─────────────── */

function getTimeGreeting(t, name) {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return t('dashboard.greetingMorning', { name });
  if (h >= 12 && h < 18) return t('dashboard.greetingAfternoon', { name });
  return t('dashboard.greetingEvening', { name });
}

const GROUP_HUB_ROUTES = { track: '/track', plan: '/plan', review: '/review' };

function TopBar({ activeGroup, activeItem, onSearchOpen }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const firstName = user?.displayName?.split(' ').pop() || user?.email?.split('@')[0] || t('appShell.defaultName');
  const greeting = getTimeGreeting(t, firstName);
  const pageLabel = activeItem
    ? t(`nav.items.${activeItem.navKey || activeItem.featureKey}`, {}, activeItem.navKey || activeItem.featureKey)
    : activeGroup ? t(`nav.groups.${activeGroup.id}`, {}, activeGroup.label) : '';

  const isHubPage = !activeItem || (activeItem.navKey || '').endsWith('_hub') || activeGroup?.id === 'home';
  const showBreadcrumb = !isHubPage && activeGroup && activeGroup.id !== 'home';
  const groupLabel = activeGroup ? t(`nav.groups.${activeGroup.id}`, {}, activeGroup.label) : '';
  const hubRoute = activeGroup ? GROUP_HUB_ROUTES[activeGroup.id] : null;

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-zx-line flex-shrink-0 zx-transition">
      <div className="min-w-0">
        {showBreadcrumb ? (
          <nav aria-label="breadcrumb" className="flex items-center gap-1 text-xs text-zx-text-soft mb-0.5">
            {hubRoute
              ? <Link to={hubRoute} className="hover:text-zx-text transition">{groupLabel}</Link>
              : <span>{groupLabel}</span>
            }
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
            <span className="text-zx-text truncate">{pageLabel}</span>
          </nav>
        ) : (
          <p className="text-xs text-zx-text-soft">{greeting}</p>
        )}
        <h1 className="font-zx-head text-xl font-semibold text-zx-text leading-tight">{pageLabel}</h1>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={onSearchOpen}
          className="hidden md:inline-flex items-center gap-2 rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2 text-sm text-zx-text-soft transition hover:text-zx-text"
          aria-label={t('search.hint')}>
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">{t('search.hint')}</span>
        </button>
        <Link to="/transactions/new"
          className="inline-flex items-center gap-2 rounded-zx-sm bg-zx-accent px-3 py-2 text-sm font-medium text-zx-on-accent hover:opacity-90 transition">
          <Plus className="h-4 w-4" />
          {t('nav.add')}
        </Link>
        <Avatar />
      </div>
    </div>
  );
}

/* ─────────────── mobile top bar ─────────────── */

function MobileTopBar({ activeGroup, activeItem }) {
  const { t } = useI18n();
  const label = activeItem
    ? t(`nav.items.${activeItem.navKey || activeItem.featureKey}`, {}, activeItem.navKey || activeItem.featureKey)
    : activeGroup ? t(`nav.groups.${activeGroup.id}`, {}, activeGroup.label) : '';

  return (
    <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-zx-line flex-shrink-0 zx-transition">
      <span className="font-zx-head font-semibold text-zx-text truncate">{label}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <LocaleToggle compact />
        <ThemeToggle compact />
        <Avatar size={30} />
      </div>
    </div>
  );
}

/* ─────────────── mobile bottom tabs ─────────────── */

function BottomTabs({ visibleGroups, activeGroup, onTabClick }) {
  const { t } = useI18n();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-zx-line bg-zx-surface/95 backdrop-blur zx-transition"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="grid px-1 py-1" style={{ gridTemplateColumns: `repeat(${visibleGroups.length},1fr)` }}>
        {visibleGroups.map(g => {
          const isActive = activeGroup?.id === g.id;
          const Icon = g.icon;
          return (
            <button key={g.id} onClick={() => onTabClick(g)}
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-zx-sm text-[11px] font-medium transition ${
                isActive ? 'text-zx-accent' : 'text-zx-text-soft'
              }`}>
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.6} />
              <span>{t(`nav.groups.${g.id}`, {}, g.label)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ─────────────── mobile bottom sheet ─────────────── */

function BottomSheet({ group, activeItem, onClose, onItemClick, t }) {
  const location = useLocation();
  const sheetRef = useRef(null);
  useFocusTrap(sheetRef, Boolean(group));

  if (!group) return null;
  return (
    <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t(`nav.groups.${group.id}`, {}, group.label)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div ref={sheetRef} className="absolute bottom-0 inset-x-0 bg-zx-surface rounded-t-zx border-t border-zx-line zx-transition"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Handle */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div>
            <div className="w-8 h-1 rounded-full bg-zx-line mx-auto mb-3" />
            <p className="font-zx-head font-semibold text-base text-zx-text">
              {t(`nav.groups.${group.id}`, {}, group.label)}
            </p>
          </div>
          <button onClick={onClose} aria-label={t('common.close')} className="p-1.5 rounded-full hover:bg-zx-surface-2 transition text-zx-text-soft">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Items */}
        <div className="px-4 pb-4">
          {group.items.map((item, i) => {
            const isActive = item.matches(location.pathname);
            return (
              <div key={item.to}>
                {i > 0 && <div className="h-px bg-zx-line" />}
                <button onClick={() => onItemClick(item.to)}
                  className="w-full flex items-center justify-between py-4 text-sm text-left transition hover:text-zx-accent">
                  <span className={isActive ? 'text-zx-accent font-semibold' : 'text-zx-text'}>
                    {t(`nav.items.${item.navKey || item.featureKey}`, {}, item.navKey || item.featureKey)}
                  </span>
                  {isActive && <span className="text-zx-accent text-xs font-semibold">✦</span>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── shell ─────────────── */

export default function AppShell({ children }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const { visibleGroups, activeGroup, activeItem } = useNav();
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
  const [bottomSheet, setBottomSheet] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Auto-expand active group
  useEffect(() => {
    if (activeGroup) {
      setExpandedGroups(prev => new Set([...prev, activeGroup.id]));
    }
  }, [activeGroup?.id]);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  const openSearch = useCallback(() => setSearchOpen(true), []);
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const navigate_ = (path) => { navigate(path); setBottomSheet(null); };

  const handleSidebarGroupClick = (g) => {
    if (g.items.length <= 1) {
      navigate_(g.mobileTo);
    } else {
      setExpandedGroups(prev => {
        const next = new Set(prev);
        if (next.has(g.id)) {
          next.delete(g.id);
        } else {
          next.add(g.id);
          navigate_(g.mobileTo); // navigate to group default on expand
        }
        return next;
      });
    }
  };

  const handleBottomTabClick = (g) => {
    if (g.items.length <= 1) {
      navigate_(g.mobileTo);
    } else if (activeGroup?.id === g.id) {
      setBottomSheet(g); // already on this group → show sheet
    } else {
      navigate_(g.mobileTo); // different group → navigate to default
    }
  };

  return (
    <div className="flex h-screen bg-zx-bg text-zx-text overflow-hidden zx-transition">
      {/* Skip-to-content — visible on keyboard focus only */}
      <a href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-zx-sm focus:bg-zx-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-zx-on-accent">
        {t('appShell.skipToContent', {}, 'Bỏ qua điều hướng')}
      </a>

      {/* Desktop sidebar */}
      <Sidebar
        visibleGroups={visibleGroups}
        activeGroup={activeGroup}
        expandedGroups={expandedGroups}
        onGroupClick={handleSidebarGroupClick}
        onItemClick={navigate_}
        userId={user?.uid}
      />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Desktop top bar */}
        <div className="hidden md:block">
          <TopBar activeGroup={activeGroup} activeItem={activeItem} onSearchOpen={openSearch} />
        </div>

        {/* Mobile top bar */}
        <MobileTopBar activeGroup={activeGroup} activeItem={activeItem} />

        {/* Scrollable content */}
        <main id="main-content" className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          <div className="pb-24 md:pb-0">
            {children}
          </div>
        </main>
      </div>

      {/* QuickCapture FAB — mobile only, always visible */}
      <Link
        to="/transactions/new"
        className="md:hidden fixed bottom-[76px] right-4 z-40 w-14 h-14 rounded-full bg-zx-accent text-zx-on-accent shadow-zx flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
        title={t('appShell.quickAdd')}
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </Link>

      {/* Fixed bottom tabs (mobile) */}
      <BottomTabs
        visibleGroups={visibleGroups}
        activeGroup={activeGroup}
        onTabClick={handleBottomTabClick}
      />

      {/* Bottom sheet */}
      <BottomSheet
        group={bottomSheet}
        activeItem={activeItem}
        onClose={() => setBottomSheet(null)}
        onItemClick={navigate_}
        t={t}
      />

      {/* Global Search */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
