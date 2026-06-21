# ZenX Wealth Project Status

Last updated: 2026-06-21 (v3.0)

## Current Phase

**Production-ready Personal Finance OS.**

Full feature set live: two-theme design system, i18n VI/EN, desktop 2-column layouts, recurring detection with Firestore persistence, LLM-backed AI Coach, email delivery via Resend, MoMo billing, and a unified Admin panel for all backend configuration.

## Firebase Project

```text
Project ID: zenx-wealth
Production domain: https://wealth.zenx.asia
Default hosting URL: https://zenx-wealth.web.app
```

## Implemented

### Core App
- React + Vite app shell with route-level code splitting
- Firebase Auth (email/password, Google, Apple)
- Firestore Lite for all data reads
- Protected routes + feature-gated access (free/premium)
- Admin access control + unified Admin panel (4 tabs)
- PWA: service worker, web manifest, offline-first cache

### Financial Modules (all routes live)
- Dashboard (2-column desktop layout)
- Transactions (list, add, edit) — search + sort + category/flag filters + filtered totals
- Latte Factor engine + Convert→Emergency Fund flow
- Pay Yourself First (allocation rule + progress)
- Emergency Fund (balance tracker, progress)
- Debt Control
- Income Builder
- Trading Risk
- Assets
- Wealth Roadmap (phase-based checklist, i18n)
- Weekly Review (3-step wizard, 2-col desktop, sticky summary panel)
- Reports (trend layer + estimated net worth)
- AI Coach (LLM-backed via Claude API Cloud Function)
- Monthly Financial Letter (download + email delivery via Resend)
- Goal Tracking (12-month goal, multi-format parsing, on-track signal)
- Financial Health Score (5-pillar composite metric)
- Budget Templates (pre-built category structures by life phase)
- User Profile + Settings
- Onboarding Flow (5 steps: theme → language → currency+goal → numbers → summary; saves primaryGoal)
- Welcome Screen (/welcome) — guided quickstart page after onboarding (3 CTA actions)
- Dashboard Empty State (when no transactions: centered card + CTA)
- First Win Celebration (special toast + FAB pulse indicator on first transaction)
- Import Transactions (CSV bulk import)
- Upgrade page (MoMo payment, dynamic plans from admin)

### i18n
- Vietnamese default + English full support
- All user-visible strings use `t()` — no hardcoded Vietnamese in UI components
- Language toggle persisted to localStorage + synced to Firestore
- `{symbol}` interpolation for currency in amount labels
- Category chips use locale-aware defaults; custom Firestore categories preserved separately

### UI Components (src/components/ui/)
- `Toast.jsx` + `useToast()` hook — success/error/info variants, auto-dismiss, stacks
- `Input.jsx`, `Textarea.jsx`, `Select.jsx` — base form components, token-based styling, `error` prop
- `Skeleton.jsx` — `Skeleton`, `SkeletonText`, `SkeletonCard`, `SkeletonRow` for loading states
- `Button.jsx`, `Card.jsx` — existing

### Design System (ZenXWealthUI)
- CSS token layer: colors, typography, spacing — two themes
  - **Ấm** (Trẻ): cream/terracotta, Be Vietnam Pro + Bricolage Grotesque, light
  - **Tư gia** (Trung niên): navy/gold, Playfair Display + Hanken Grotesk, dark
- Theme labels i18n via `t('settings.themeYoungStyle')` / `t('settings.themeMidStyle')`
- `data-theme` switching live, persisted to localStorage
- `ThemeProvider` context + toggle in sidebar and mobile top bar
- Tailwind extended with `zx-*` semantic utility classes

### Desktop Layout
- Plan pages: `max-w-5xl` (standard); `max-w-6xl` for data-heavy pages (Assets, TradingRisk, BudgetTemplates)
- All Plan sub-pages use `px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-6` container pattern
- Stats cards: `sm:grid-cols-2 xl:grid-cols-4` grid, each card `rounded-zx border border-zx-line bg-zx-surface p-4`
- List sections: `rounded-zx border border-zx-line bg-zx-surface overflow-hidden`
- All pages use design token border-radius (`rounded-zx`, `rounded-zx-sm`) — no `rounded-lg`
- 2-column `lg:grid` layout:
  - TrackHub: cashflow+latte left | recurring+recent+actions right
  - PlanHub: phase+items left | priority CTA right
  - ReviewHub: score+stats+lesson left | tools right
  - WeeklyReview: wizard left | sticky summary panel right
  - AddTransaction: form left | today's entries right (auto-refreshes per save)
- AddTransaction: multi-entry UX — save clears form, stays on page, "Done" to exit

### Navigation & Shell
- `AppShell` — full layout wrapper
- **Desktop**: accordion sidebar with chevron groups
- **Mobile**: fixed bottom tabs (5 groups) + Hub pages
- Hub pages: TrackHub, PlanHub, ReviewHub
- i18n theme labels, `t('appShell.defaultName')` fallback

### Backend (Cloud Functions)
- Snapshot engine: dashboard, latte-current, weekly-current, roadmap-current, reports-current
- `generateAIInsights` — calls Claude API, reads key + model from `appConfig/api-settings`
- `sendMonthlyLetter` — sends email via Resend, reads config from `appConfig/api-settings`
- `createMomoPayment` / `momoIPN` — billing, reads credentials from `appConfig/api-settings` with Firebase Secrets fallback
- Session-level cache + stale-while-refresh for all primary routes
- Structured Cloud Logging for snapshot refresh

### Admin Panel (`/admin/access`)
5-tab unified admin interface:

| Tab | Content |
|-----|---------|
| Feature Access | Free/Premium toggle matrix, group pill filter (All / Core / Premium) |
| Preview Plan | Switch admin account between Free/Premium for live testing |
| API & Config | Claude key + model, Resend key + from email — status panel shows ✓/– per service |
| Plans & Billing | Monthly/yearly plan config + MoMo credentials — live preview panel updates in real-time |
| Budget Templates | Full CRUD for budget templates — VI/EN names, allocation editor with live total validator, category lists |

### Recurring Detection
- Auto-detects by category + amount + day-of-month (±3 day tolerance, 2+ occurrences)
- **Persists to Firestore**: newly detected flags batch-written on first fetch
- User-set flags preserved — detection only adds, never removes

### Goal Parsing
Handles: `500 triệu`, `1.5 tỷ`, `1,5 tỷ`, `tỷ rưỡi`, `2 tỷ rưỡi`, `500.000.000`, `500,000,000`, `1 billion`, `500 million`, natural language embedding (`tích lũy được 500 triệu`)

### Billing
- MoMo payment integration (createMomoPayment + momoIPN Cloud Functions)
- Dynamic plan pricing via `appConfig/billing-settings` (admin configurable)
- Fallback to hardcoded defaults if not configured
- Subscription status read from user profile (`subscriptionTier`, `subscriptionExpiresAt`)

## Routes

```text
/login
/onboarding
/welcome               ← Welcome Screen (post-onboarding quickstart)
/                      ← Dashboard
/track                 ← TrackHub
/plan                  ← PlanHub
/review                ← ReviewHub
/transactions
/transactions/new
/transactions/:id/edit
/latte
/pay-yourself-first
/emergency
/debts
/income
/assets
/trading-risk
/roadmap
/weekly-review
/reports
/ai-coach
/monthly-letter
/goal-tracking
/health-score
/budget-templates
/import
/profile
/settings
/upgrade
/admin/access          ← 4-tab admin panel
/admin/settings        ← standalone API settings (same content as admin tab)
```

## Firestore Collections

```text
users/{userId}
users/{userId}/transactions/{transactionId}
users/{userId}/emergencyFund/{recordId}
users/{userId}/debts/{debtId}
users/{userId}/incomeSources/{sourceId}
users/{userId}/accounts/{accountId}
users/{userId}/roadmap/{phaseId}
users/{userId}/weeklyReviews/{reviewId}
users/{userId}/snapshots/{snapshotId}
users/{userId}/tradingRisk/{recordId}
appConfig/access-control
appConfig/api-settings        ← Claude key/model, Resend key/from, MoMo credentials
appConfig/billing-settings    ← plan pricing (monthly/yearly amounts, labels, days)
momoPayments/{orderId}
```

## User Settings Shape

```text
users/{userId}
  subscriptionTier: free | premium
  subscriptionExpiresAt: Timestamp | null
  subscriptionPlan: monthly | yearly | null
  goal12Month: string
  displayName / email / photoURL
  hasFirstTransaction: boolean ← set on first transaction add (for empty state logic)
  onboardingCompleted: boolean
  settings.currency: VND | USD
  settings.monthlyEssentialExpense: number
  settings.emergencyFundTargetMonths: number
  settings.payYourselfFirstRate: number
  settings.primaryGoal: track | emergency | debt | invest ← set during onboarding
  settings.theme: young | mid ← saved from onboarding + settings toggle
  settings.locale: vi | en
  settings.numberUnit: full | compact ← number format display unit
  settings.allocationRule: { living, emergencyFund, longTermAsset, businessLearning, highRiskTrading }
  settings.customCategories: { income: string[], expense: string[] }   ← merged (with locale defaults)
  settings.customCategoriesRaw: { income: string[], expense: string[] } ← user-added only
```

## Version History

### v3.0 (2026-06-21) — Architecture Refactor (RN-Ready Core)

**A. Complete Service Layer Writes (Sprint 1):**
- All Firestore write operations moved to services (transactionService, userService, emergencyFundService, weeklyReviewService)
- Pages no longer import firebase/firestore directly — zero direct Firestore calls in UI
- Added methods: createTransaction, updateTransaction, deleteTransaction, getTransaction, updateUserSettings, updateTheme, updateLocale, createEmergencyFundRecord, saveWeeklyReview

**B. Cache Invalidation Coordinator (Sprint 2):**
- Created cacheCoordinator.js to group cache invalidations by operation type
- Reduced fan-out: 8 individual invalidate*Cache() calls → 1 invalidateAfterTransactionWrite() call
- Simplified cache management: pages → services → cacheCoordinator

**C. Platform-Abstract Storage Adapter (Sprint 3):**
- Created storageAdapter.js to abstract sessionStorage access
- sessionCache.js now uses pluggable storage interface (default: window.sessionStorage)
- React Native can inject AsyncStorage at startup via setStorageAdapter()

**D. Folder Structure Refactored (Sprint 4):**
- Created src/core/ (portable logic): auth/, data/, hooks/, i18n/, services/, utils/
- Created src/web/ (web-specific): components/, pages/, App.jsx, index.css
- Updated 100+ import paths throughout codebase
- Core is now truly platform-agnostic — zero web dependencies (no Tailwind, react-router, DOM APIs)

**E. Hook Factory (Sprint 5):**
- Created createDataHook() factory function — eliminates ~550 lines of boilerplate
- Replaced 10 nearly-identical data hooks: useAssetsData, useDebtData, useEmergencyFundData, useIncomeSourcesData, usePayYourselfFirstData, useReportsData, useTradingRiskData, useTransactionsData, useWealthRoadmapData, useWeeklyReviewData
- All data hooks now share identical loading/refreshing/error state management
- Reduced maintenance burden — cache + state logic defined once, reused 10 times

**F. Service-Level i18n (Sprint 6):**
- Created src/core/i18n/getTranslation.js — allows services to access translations without React context
- Moved 50+ aiCoachService copy strings from inline object to i18n dictionaries (vi.js + en.js under aiCoach.* keys)
- Updated aiCoachService to use getTranslation() instead of hardcoded coachCopy
- Services can now scale: future services (monthlyLetterService, etc.) will also use centralized i18n

**Impact:** All 6 sprints complete. Core is fully portable for React Native: zero Firestore imports in pages, abstracted storage, structured folders, DRY hooks, and service-level i18n. Architecture ready for RN project setup.

### v2.9 (2026-06-21) — Complete New User Flow (Onboarding Redesign + Welcome + First Win)

**A. Onboarding Redesign (5 steps, theme-first):**
- Step 1: Theme picker (Young/Classic) with live mini preview — user customizes visual persona immediately
- Step 2: Language (VI/EN)
- Step 3: Currency (₫/$) + Primary Goal (track spending, build emergency fund, pay debt, long-term investing)
- Step 4: Numbers (monthly expense, emergency fund months)
- Step 5: Summary review + "Start journey" CTA
- Saves theme + primaryGoal to Firestore (alongside existing currency, locale)
- Redirect to /welcome (not dashboard) on completion

**B. Welcome Screen (/welcome):**
- Fullscreen "Where to start?" with 3 prominent CTA cards
- Primary action: "Add your first transaction" (highlighted)
- Secondary actions: "View financial roadmap", "Explore Dashboard"
- Skip link to bypass directly to Dashboard
- No AppShell — clean, focused entry experience

**C. Dashboard Guided Empty State:**
- When txData.transactions.length === 0: centered card replaces hero section
- Title: "Welcome! Start with your first transaction."
- Buttons: "Add transaction" (primary) + "View roadmap"
- Mobile FAB (animate-pulse) hints user toward primary action

**D. First Win Celebration:**
- AddTransaction detects first transaction (check txData before save)
- On success: special 🎉 toast ("First transaction! You've started your financial journey...")
- Sets localStorage 'zx-first-tx-done' → FAB stops pulsing
- Writes hasFirstTransaction=true to Firestore for persistence

**i18n additions:**
- onboarding: theme selection labels + descriptions, goal options (track/emergency/debt/invest)
- welcome: intro text + 3 CTA descriptions
- dashboard: empty state headings + hints
- toast: first transaction celebration message

**Impact:** New users now experience a cohesive, personalized onboarding journey with clear guidance and celebration of their first action — removing the blank-dashboard friction point.

### v2.8 (2026-06-21) — Bug fixes + Full cross-device settings sync
- **Mobile Sign Out**: BottomSheet (Profile group) shows Sign Out button at bottom
- **Cross-device settings sync**: UserSettingsSync component reads Firestore on login and applies locale/theme/numberUnit; ThemeToggle + Settings also save theme to Firestore immediately
- **BudgetTemplates applied state**: appliedTemplateId saved to Firestore, restored on page reload
- **Settings save frozen bug**: stale setMessage() call outside try block was crashing before finally → stuck in "Đang lưu..."
- **i18n duplicate key bug**: duplicate reports: key shadowing dateRange* keys — fixed

### v2.7 (2026-06-21) — Items 8–10 + Dropdown fixes
- **Chart Brush**: Recharts Brush scrubber on cashFlow BarChart (shown when data > 6 months)
- **Pagination**: Transactions — 50 items/page, smart page buttons, resets on filter change
- **DateRangePicker**: react-day-picker v10, 2-month calendar, preset shortcuts, locale VI/EN
  - Reports: alongside preset tabs, filters trend arrays by computed month date
  - Transactions: in advanced filter panel, filters by exact tx.date
- **Dropdown i18n**: debtTypes, debtPriorities, incomeTypes, incomeStages, accountTypes, accountPurposes — all keys in vi.js + en.js, translated at runtime
- **Combobox**: replaced native `<select>` in DebtControl, IncomeBuilder, Assets (styling bug fix)
- **Bug fix**: duplicate `reports:` key in i18n caused dateRange* keys to be shadowed

### v2.6 (2026-06-21) — Remaining UX Polish (items 1–7)
- **AICoach hero**: Compact row layout — saves ~40% vertical space, badge+title inline, focus box conditional
- **Bulk re-categorize**: Inline input + datalist in bulk action bar; writeBatch updates category field
- **Roadmap scroll cue**: Fade-right gradient overlay on phase tabs scroll container
- **Admin cleanup**: AdminAccessControl + AdminSettings — all red-* → zx-negative, rounded-zx-sm fixes
- **Combobox keyboard nav**: ArrowUp/Down/Enter/Escape; role=combobox/listbox/option; aria-expanded/selected
- **aria-describedby**: Assets, IncomeBuilder, TradingRisk — id + role=alert on errors, aria-describedby on key inputs

### v2.5 (2026-06-20) — Scorecard Improvements (Accessibility + PDF + Responsive + Form Migration)
- **Accessibility**: skip-to-content link; aria-live on AICoach + GlobalSearch; aria-describedby + role=alert on all error messages; bulk-fixed red-* → zx-negative across 19+ pages
- **Export PDF**: `@media print` CSS + window.print() button in Reports
- **Responsive**: `lg:grid-cols-3` on all `sm→xl` stat grids in 6 pages; charts `h-72 md:h-80 xl:h-96`
- **Form migration**: Input component now used in EmergencyFund, DebtControl, IncomeBuilder, TradingRisk (was inline Tailwind)

### v2.4 (2026-06-20) — Priority 3 UI/UX Polish
- **prefers-reduced-motion**: `@media` query in `index.css` respects OS accessibility preference
- **Chart Empty States**: `EmptyChart` component in Reports — shown when trend data is empty
- **Weekly Review Auto-save**: debounced 30s save to Firestore, "Đã lưu tự động" indicator
- **Focus Trap**: `useFocusTrap` hook + wired into BottomSheet (modal) in AppShell
- **Combobox**: `Combobox.jsx` searchable dropdown, replaces `<select>` in Transactions filters

### v2.3 (2026-06-20) — Priority 2 UI/UX Improvements
- **Export CSV**: Transactions → "Xuất CSV" exports filtered list, Excel-safe BOM
- **Breadcrumb**: Desktop TopBar shows "Group › Page" on sub-pages, links to hub
- **Date Range Presets**: Reports page — 3M/6M/YTD/All toggle filters trend charts
- **Bulk Actions**: Transactions selection mode → checkbox → batch delete via writeBatch
- **Global Search**: Ctrl+K overlay — searches pages + cached transactions, navigate on select

### v2.2 (2026-06-20) — Priority 1 UI/UX Improvements
- **Toast system**: `ToastProvider` + `useToast()` wired app-wide; replaces inline success messages
- **Base form components**: `Input`, `Textarea`, `Select` in `src/components/ui/` — unified token-based styling
- **aria-labels**: All icon-only buttons now have `aria-label` (AppShell, AppNav, BudgetTemplates, TrackHub)
- **Skeleton loading**: `Skeleton*` components; AddTransaction and Transactions use skeleton on load
- **Error token**: Replaced hard-coded `red-*` error classes with `zx-negative` token across 3 pages

### v2.1 (2026-06-18) — Plan Layout Polish + Budget Templates Overhaul
- **Plan pages layout**: standardized container widths, stats cards (border/bg), section spacing (`space-y-6`), list section borders across 6 pages (EmergencyFund, Assets, TradingRisk, PayYourselfFirst, DebtControl, IncomeBuilder)
- **Design tokens**: replaced all `rounded-lg` with `rounded-zx`/`rounded-zx-sm` across Assets and TradingRisk
- **BudgetTemplates redesign**: 3-column grid (`xl:grid-cols-3`), always-visible income/expense category split, compact allocation bar in card vs full bar in modal
- **Admin Budget Templates tab** (5th tab): full CRUD with bilingual name/description, allocation editor, category management
- **Bug fix**: template `nameVI`/`nameEN` from admin now displayed on user-facing page (was always using i18n key fallback)
- **Bug fix**: `payYourselfFirstRate` now written to Firestore when applying template (was causing Dashboard to show stale PYF progress)
- **Bug fix**: `invalidateDashboardStatsCache` + `invalidateWeeklyReviewCache` added to template apply flow

### v1.1–v1.4 Foundation
- QuickCapture FAB, Latte→Convert flow, Net Worth + Savings tiles
- Smart AddTransaction, PlanHub ETA, Milestone celebrations, Latte insights
- Guided 3-step Weekly Review with AI contextual insights
- ReviewHub score history sparkline

### v1.5 Desktop Polish
- Sidebar stats component — net cash flow, emergency fund bar, current phase
- Dashboard 2-column layout

### v1.6 PWA / Add to Homescreen
- Service worker with Workbox caching strategies
- Web manifest + PNG icons (192/512)

### v1.7 Recurring Transaction Detection
- Auto-analysis of last 12 months
- Auto-flagged in Transactions list with ↻ Monthly badge

### v1.8 Enhanced AI Coach (rule-based)
- Personalized headline + operating insight analysis

### v1.9 Monthly Financial Letter
- Personalized month-end summary, download as Markdown

### v1.10 Goal Tracking
- 12-month goal parsing, weekly trajectory, on-track signal

### v2.0 (2026-06-17) — Production Hardening
- **i18n complete**: all hardcoded strings moved to `t()`, category chips locale-aware, theme labels, amount symbol dynamic
- **Desktop layouts**: 2-column for TrackHub, PlanHub, ReviewHub, WeeklyReview; `max-w-5xl` across all pages
- **AddTransaction redesign**: multi-entry UX, today's entries panel, post-save stays on page
- **Recurring flags persist**: batch-write to Firestore on detection; user flags preserved
- **Goal parsing v2**: handles natural language, `tỷ rưỡi`, VN thousand separators, EN units
- **Transaction search/filter v2**: sort (4 modes), category dropdown, latte/recurring flags, filtered totals
- **LLM AI Coach**: Cloud Function calling Claude API; key + model configurable via admin
- **Email delivery**: Monthly Letter sends via Resend; admin configures key + from address
- **Admin panel v2**: 4-tab UI (Feature Access / Preview Plan / API & Config / Plans & Billing)
- **Dynamic billing**: plan prices editable in admin; MoMo credentials via admin; `billingService` reads from Firestore
- **PlanHub bug**: `fmt is not defined` fixed (passed as parameter to `getPriority`)

## Known Gaps

- **Mobile wallet sync**: connect bank/payment app for auto-transactions — requires banking API partnership (future phase)
- Firebase Auth providers must be enabled manually in Firebase Console (Apple/Google/Email)
- Authorized domains must include `wealth.zenx.asia` in Firebase Auth settings

## Next Work

1. **Mobile wallet sync** — future phase (banking API required, no open API in Vietnam currently)
2. **Reports pagination** — for users with very large datasets, consider paginating the transaction list in Transactions page (Reports itself already uses snapshot)
3. **Push notifications** — remind users to do weekly review, log transactions
4. **Budget template migration guidance** — when user switches template, old transactions retain original categories; consider surfacing a "your X old transactions used category Y" advisory in the success state
