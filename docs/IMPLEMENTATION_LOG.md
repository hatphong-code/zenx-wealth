# Implementation Log

This file records meaningful implementation changes so the project can be followed without reading every commit.

## 2026-06-17 — v2.0 Production Hardening

### i18n — Complete English Support

- Fixed category chips showing Vietnamese in EN mode: `AddTransaction` now uses `customCategoriesRaw` (user-added only) for autocomplete, and a separate `chipCategories` array from `t()` for quick-tap chips. Root cause was `mergeTransactionCategories('vi')` baking VI defaults into `customCategories` in `userService`.
- Fixed theme labels `'Ấm'`/`'Tư gia'` hardcoded in `AppShell.jsx` → uses `t('settings.themeYoungStyle')` / `t('settings.themeMidStyle')`.
- Fixed `amountLabel` hardcoding `₫` in both dictionaries → template `'Amount ({symbol})'` with currency interpolated from user settings.
- Replaced all remaining hardcoded Vietnamese strings in `PlanHub`, `Dashboard`, `GoalTracking`, `Reports`, `AppShell` with `t()` keys. New keys added: `planHub.nextStep`, `planHub.needsAttention`, `planHub.solidFoundation`, `planHub.goalReached`, `planHub.pctOfGoal`, `planHub.items.trading`, `dashboard.cards.savedSoFar`, `goalTracking.toStayOnTrack`, `reports.insights.smallRecurring`, `appShell.defaultName`.

### Desktop Layout — 2-Column + Size Consistency

- Standardized all pages to `max-w-5xl`. Previously: Dashboard `max-w-6xl`, Profile `max-w-4xl`, AddTransaction `max-w-2xl`, WeeklyReview done-state `max-w-lg`.
- TrackHub: `lg:grid-cols-[1fr_380px]` — cashflow+latte left, recurring+recent+quick-actions right.
- PlanHub: `lg:grid-cols-[1fr_380px]` — phase+ETA+plan-items left, priority CTA right.
- ReviewHub: `lg:grid-cols-[1fr_360px]` — score+stats+lesson left, tools right.
- WeeklyReview: `lg:grid-cols-[1fr_300px]` — wizard left, sticky numbers summary panel right (hidden on mobile).
- AddTransaction: `lg:grid-cols-[1fr_300px]` — form left (centered `max-w-2xl`), today's entries panel right.

### AddTransaction — Multi-Entry UX

- After successful save (non-edit mode): form clears, amount input focused, panel updates — page does NOT navigate away.
- Added "Done" button to exit to `/track` when finished entering.
- Edit mode retains existing behavior (navigate to `/transactions` after save).
- Right panel shows today's transactions (filtered by selected date), income/expense totals, and entry list.

### Recurring Detection — Firestore Persistence

- `recurringDetectionService.js`: changed `isRecurring: recurringTxIds.has(tx.id)` to `isRecurring: tx.isRecurring === true || recurringTxIds.has(tx.id)` — user-set flags now preserved.
- `transactionService.js`: after detection, filters for newly-detected flags (stored `false` → detected `true`) and batch-writes them to Firestore via `writeBatch`. Fire-and-forget — does not block the return.

### Goal Parsing — Multi-Format Support

- Rewrote `parseGoalAmount` in `goalTrackingService.js`.
- Added `parseViNum` helper: handles VN decimal (`,`/`.`), VN thousand separators (`1.000.000`), and mixed formats.
- Handles: `500 triệu`, `1.5 tỷ`, `1,5 tỷ`, `tỷ rưỡi`, `2 tỷ rưỡi`, `500.000.000`, `500,000,000`, `1 billion`, `500 million`, natural-language sentences (`tích lũy được 500 triệu`).
- Root issue: `\b` word boundary doesn't work after Vietnamese non-ASCII chars — fixed with `(?=[^a-z]|$)` lookahead.
- Added `goalParsing.test.js` with 8 test cases covering all formats; all pass.

### Transaction Search/Filter — Enhanced

- Added 4-mode sort cycle: newest → oldest → highest amount → lowest amount (button with label).
- Added category dropdown (exact match from existing transaction data).
- Added flag toggles: ☕ Latte Factor, ↻ Recurring (pill buttons, toggle on/off).
- Collapsible "Advanced filters" panel with active-filter dot indicator.
- Filtered totals: shown above list (income / expense / net) and in desktop table footer row.
- Row hover highlight on desktop table.
- All new keys added to both i18n dictionaries.

### LLM AI Coach — Real Claude API

- `functions/src/llmInsights.js`: reads API key from `appConfig/api-settings` at call time; falls back to Firebase Secret `ANTHROPIC_API_KEY`. Model also configurable via admin.
- `generateAIInsights` exported from `functions/src/index.js`.
- `src/services/llmCoachService.js` already wired correctly.

### Monthly Letter — Email Delivery

- New `functions/src/sendEmail.js`: `sendMonthlyLetter` Cloud Function. Reads Resend API key and from-address from `appConfig/api-settings`. Converts letter markdown to branded HTML email template. Returns `{ success, id }`.
- `sendMonthlyLetter` exported from `functions/src/index.js`.
- New `src/services/emailService.js`: frontend caller.
- `MonthlyLetter.jsx`: replaced `alert()` placeholder with real email form — pre-fills user's email, shows loading spinner, success message, error state.

### Admin Panel — 4-Tab Unified Interface

- Replaced stacked sections with tab navigation: **Feature Access** / **Preview Plan** / **API & Config** / **Plans & Billing**.
- Feature Access tab: group pill filter (All / Core / Premium), feature count per group, row hover, stat counters.
- Preview Plan tab: tier switching with explanatory note.
- API & Config tab: `lg:grid-cols-[1fr_260px]` — form left, status panel right (✓/– per service, "AI Coach ready" / "Email delivery ready" badges).
- Plans & Billing tab: `lg:grid-cols-[1fr_280px]` — plan forms + MoMo credentials left, **live preview** of plan cards right (updates on every keystroke).
- New `src/services/adminSettingsService.js`: read/write `appConfig/api-settings`.
- New `src/pages/AdminSettings.jsx`: standalone settings page at `/admin/settings`.

### Dynamic Billing — Plans Configurable via Admin

- `billingService.js`: `getPlans()` async function reads `appConfig/billing-settings` (5 min cache), falls back to `DEFAULT_PLANS`.
- `Upgrade.jsx`: uses `getPlans()` instead of hardcoded `PLANS`.
- `functions/src/momo.js`: `createMomoPayment` and `momoIPN` read MoMo credentials from `appConfig/api-settings` via new `getBillingConfig()`, fall back to Firebase Secrets.
- `appConfig/billing-settings` structure: `{ plans: { monthly: { amount, label, durationLabel, days }, yearly: { ..., badge } } }`.

### PlanHub Bug Fix

- `getPriority()` was a module-level function referencing `fmt` and `fmtNum` not in its scope.
- Fix: added `fmt, fmtNum` parameters to function signature; updated call site to pass them.

## 2026-06-11

### Vietnamese-First I18n Foundation

- Added an app-wide i18n provider with Vietnamese as the default locale and English-ready dictionaries.
- Split i18n context and hook into separate files so React fast refresh stays clean under ESLint.
- Moved navigation, dashboard, login, admin-access, reports, AI Coach, and settings page copy onto translation keys instead of hardcoded component strings.
- Localized AI Coach and Reports service-generated insight/action copy through locale-aware templates rather than hardcoded English strings inside business logic.
- Refactored category presets so locale-specific defaults can diverge later without changing Firestore keys or route slugs.

### Functions Runtime Upgrade And Backend-Driven Snapshot Refresh

- Upgraded Firebase Functions from Node 20 to Node 22.
- Upgraded `firebase-functions` and `firebase-admin` in `functions/`.
- Successfully deployed Gen 2 Firestore triggers in `asia-southeast1` for:
  - `onAccountWrite`
  - `onDebtWrite`
  - `onEmergencyFundWrite`
  - `onIncomeSourceWrite`
  - `onRoadmapWrite`
  - `onTradingRiskWrite`
  - `onTransactionWrite`
  - `onUserProfileWrite`
  - `onWeeklyReviewWrite`
- Shifted the client away from direct snapshot recompute calls after writes.
- Kept local cache invalidation on the client so navigation stays responsive while backend triggers refresh the snapshot documents.
- Fixed `Weekly Review` local cache handling so the route no longer wipes the fresh cache entry immediately after save.

### Snapshot Observability And Service Contracts

- Added structured Cloud Logging fields for snapshot refresh start, completion, failure, duration, trigger label, trigger path, change type, and event id.
- Exported stable service-layer normalizers for Dashboard, Reports, and Weekly Review snapshots.
- Exported AI Coach state shaping so it can be tested as a contract rather than only through runtime behavior.
- Added focused service contract tests covering:
  - dashboard snapshot normalization
  - reports snapshot normalization
  - weekly review snapshot normalization
  - urgent AI Coach prioritization when cash flow and risk both degrade

### UI Flow Test Coverage

- Added Testing Library and `jsdom` test runtime for UI-level verification.
- Added grouped navigation tests covering:
  - review-section route grouping
  - sign-out navigation flow
- Added Weekly Review UI flow test covering:
  - textarea editing
  - trimmed payload persistence
  - local cache update
  - downstream cache invalidation for Reports and AI Coach

### Free / Premium Access Control Layer

- Added a feature catalog and Free/Premium access matrix persisted in Firestore at `appConfig/access-control`.
- Added per-user `subscriptionTier` support with `free` as the default.
- Added `useFeatureAccess` so nav and routes read the same gating state.
- Added route-level feature locking so hidden Premium routes cannot still be opened directly by URL under a Free tier.
- Added an admin-only `Admin Access` page to toggle each feature for Free and Premium independently, plus switch the current admin account between Free and Premium for live testing.
- Extended Firestore rules so authenticated users can read app-wide access config and the admin email can write it.
- Added service contract tests for access-control normalization and tier-based feature checks.

### Reports v2, Net Worth Layer, And AI Coach v2

- Expanded `Reports` into a richer decision surface with:
  - current balance sheet
  - six-month cash-flow trend
  - emergency coverage trend
  - estimated net worth line
  - monthly close summary
- Added shared trend and balance-sheet calculations so reporting and coaching use the same logic instead of recomputing separately.
- Upgraded `AI Coach` to read from the report layer first, then surface one focus, a small watchlist, visible wins, and ordered actions.

### Hardening Pass

- Added an ESLint baseline with `npm run lint`.
- Extracted `useAuth` and `AuthContext` into dedicated auth files so the lint setup stays compatible with React fast refresh.
- Added test coverage for monthly trend, emergency coverage trend, balance sheet, and estimated net worth calculations.

### Backend Snapshot Engine Preparation

- Added a Firebase Functions codebase under `functions/`.
- Implemented Firestore-triggered backend recompute for:
  - `dashboard`
  - `latte-current`
  - `weekly-current`
  - `roadmap-current`
  - `reports-current`
- Updated client `reportsService` to read `reports-current` snapshot first, with compute fallback if the snapshot does not exist yet.
- Verified local syntax for the Functions code.
- Attempted deployment, but production deployment is currently blocked because Firebase project `zenx-wealth` is not yet on the Blaze plan required for Cloud Functions and Cloud Build.

### Assets, Reports, Settings, And AI Coach

- Added `Assets` route with asset account tracking across liquid, long-term, and risk buckets.
- Wired asset data into roadmap signals so roadmap progression can detect separated accounts and long-term asset ownership.
- Added `Reports` route that composes Dashboard, Weekly Review, Roadmap, Debt, Income, Assets, and Trading Risk into a single summary view.
- Added `AI Coach` route on top of current read models with rule-based guidance, action surfacing, and route shortcuts.
- Added `Settings` route for 12-month goal, custom transaction categories, and allocation rule management.
- Extended user settings handling to preserve built-in category suggestions separately from user-added categories.

### Mobile-First Navigation And Strategic Screen Pass

- Expanded grouped navigation to include Assets, Reports, AI Coach, and Settings without returning to a wide horizontal desktop-style menu.
- Polished Dashboard, Weekly Review, Wealth Roadmap, and Trading Risk for clearer mobile-first hierarchy.
- Added category suggestions and quick-select chips to Add Transaction so mobile data entry is faster and less error-prone.

### Cache Invalidation And Read-Path Consistency

- Wired Transactions, Emergency Fund, Debt, Income, Assets, Trading Risk, Weekly Review, Profile, and Settings mutations to invalidate Reports and AI Coach caches.
- Fixed Trading Risk fresh reads so risk configuration survives refresh instead of being excluded by a `date` sort query.

### Verification

```bash
npm test
```

Result: passed.

## 2026-06-10

### Foundation App Review

- Reviewed repository structure, stack, roadmap documents, Firebase config, and current app code.
- Confirmed that the Git history only tracked planning documents while the app files were still untracked.
- Identified Dashboard runtime risk caused by missing Firestore imports in `useDashboardStats`.
- Confirmed `npm run build` passed, with a bundle-size warning.
- Confirmed the original `npm test` script failed because no test command was configured.

### MVP Foundation Implementation

- Added shared authenticated navigation.
- Added `/transactions/new` Add Transaction screen.
- Persisted transactions to `users/{userId}/transactions`.
- Added redirect from `/login` when a user is already authenticated.
- Fixed Dashboard stats hook imports.
- Updated Pay Yourself First rate to read from user settings.
- Updated Emergency Fund calculation to read from `users/{userId}/emergencyFund`.
- Removed unused imports from Dashboard and Latte Factor.
- Expanded Firestore rules for roadmap-aligned user subcollections.
- Changed `npm test` to run `npm run build` as a temporary smoke test.
- Added `dist/` to `.gitignore`.

### Verification

```bash
npm run build
```

Result: passed.

### Styling Deployment Fix

- Added PostCSS config so Tailwind directives are compiled into production CSS.
- Confirmed the accessible Firebase project id is `zenx-wealh`.
- Added Firebase config for Firestore rules deployment.

### Latte Factor Query Fix

- Removed the composite Firestore query on `date` and `isLatteFactor`.
- Kept the monthly `date` query and filtered Latte Factor transactions in the client for the MVP.
- Added error handling so the Latte Factor screen does not remain stuck in loading state.

### Firebase Project Migration

- Switched Firebase default project from `zenx-wealh` to `zenx-wealth`.
- Updated local Firebase web app environment variables for project `zenx-wealth`.
- Kept `dist/` ignored and out of Git.

### Login UX And Google Auth

- Added Google sign-in with Firebase Auth popup flow.
- Added Apple ID sign-in with Firebase Auth popup flow.
- Ensured user documents are created or merged for both Google and email sign-in.
- Reworked the login screen layout for clearer product positioning and friendlier authentication states.
- Replaced raw Firebase auth errors with user-facing messages.

### User Profile

- Added `/profile` route.
- Added profile navigation entry.
- Added editable display name and financial settings.
- Persisted user settings to `users/{userId}.settings` for dashboard calculations.

### Number And Currency Formatting

- Added shared formatting helpers for money, numbers, percentages, and Firestore dates.
- Standardized money display across Dashboard, Latte Factor, Transactions, Profile, and Add Transaction.
- Read currency from `users/{userId}.settings.currency` where money is displayed.
- Persisted transaction currency for new entries.
- Avoided aggregating transactions across different currencies in Dashboard and Latte Factor.
- Cleaned remaining mojibake text in financial screens touched by formatting work.
- Removed strict HTML number step validation from money inputs and made money previews look like muted hints.

### Emergency Fund Module

- Added `/emergency` route.
- Added Emergency Fund navigation entry.
- Added current balance, covered months, target balance, and progress UI.
- Added form to record emergency fund deposits.
- Added history table with delete action.
- Stored emergency fund record currency and avoided aggregating records across profile currencies.
- Cleaned Firestore rules file comments to avoid mojibake.

### Weekly Review Module

- Added `/weekly-review` route.
- Added Weekly Review navigation entry.
- Calculated weekly income, expense, Latte Factor, savings rate, and emergency fund coverage from existing data.
- Added deterministic weekly review storage in `users/{userId}/weeklyReviews/{weekStartKey}` so one week updates in place.
- Added editable `oneLesson` and `oneActionNextWeek` notes with save flow.

### Transaction Edit Flow

- Reused the Add Transaction form for both create and edit flows.
- Added `/transactions/:transactionId/edit`.
- Added edit action in the Transactions table.
- Kept transaction currency on edit and update.

### Route-Level Code Splitting

- Switched route pages in `App.jsx` to `React.lazy` with `Suspense`.
- Split each primary page into its own route chunk.
- Reduced the main production JS bundle from about `697 kB` to about `626 kB` after minification.

### Vendor Chunk Optimization

- Replaced `react-firebase-hooks` with a local `AuthProvider` built on `onAuthStateChanged`.
- Centralized auth state so the app subscribes to Firebase Auth once instead of repeating auth hooks across pages.
- Added Vite `manualChunks` to split Firebase by concern (`core`, `auth`, `firestore`) plus `react`, `react-router-dom`, `lucide-react`, and `date-fns`.
- Removed the previous monolithic entry chunk and replaced it with focused vendor chunks.
- Current production chunk sizes are roughly:
  `firebase-auth` 190 kB, `firebase-core` 43 kB, `firebase-firestore` 129 kB, `react-vendor` 142 kB, `router` 21 kB, `date-utils` 21 kB.

### Firestore Lite Migration

- Split Firebase bootstrap into `firebaseApp`, `firebaseAuth`, and `firebaseDb` modules so auth no longer eagerly initializes Firestore.
- Switched all one-shot data access from the full Firestore SDK to `firebase/firestore/lite`.
- Moved login-specific Firestore reads and popup provider setup behind dynamic imports so the login route only pays those costs when the user acts.
- Reduced the Firestore vendor chunk from about `381 kB` to about `129 kB`.
- Reduced the Firebase core chunk from about `95 kB` to about `43 kB`.
- Updated dashboard stats loading to fetch transactions and emergency fund records in parallel after user settings load.

### Cached Reads And Stale UI

- Added a small session cache with TTL and in-flight request deduplication.
- Moved user profile, Dashboard stats, and Latte Factor reads into service modules.
- Changed Dashboard and Latte Factor to render cached data immediately when available, then refresh in the background.
- Added lightweight auth-time preloading for user profile and Dashboard stats after Firebase Auth resolves a user.
- Removed the old blocking pattern where these screens waited on a full client Firestore round-trip before rendering anything useful.

### Cache Extension To Core Routes

- Added service and hook layers for Transactions, Emergency Fund, and Weekly Review reads.
- Switched Transactions, Emergency Fund, Weekly Review, and Profile to the same stale-while-refresh UI pattern.
- Updated deletes and saves to update or invalidate relevant session caches so post-mutation navigation does not show stale snapshots for one TTL cycle.
- Kept the edit transaction form on a direct read path, but wired it to invalidate transactions, dashboard, Latte Factor, and weekly review caches after save.

### Dashboard Snapshot Read Model

- Added a persistent Firestore snapshot document at `users/{userId}/snapshots/dashboard`.
- Changed Dashboard reads to prefer the snapshot document, with raw aggregation only as a first-time bootstrap fallback.
- Added snapshot refresh after transaction writes, transaction deletes, emergency fund writes, emergency fund deletes, and profile setting saves.
- Deployed Firestore rules for the new `snapshots` subcollection.
- This is the first route to move from raw client aggregation toward a proper read model.

### Latte And Weekly Snapshot Read Models

- Added `users/{userId}/snapshots/latte-current` for Latte Factor reads.
- Added `users/{userId}/snapshots/weekly-current` for Weekly Review reads.
- Changed Latte Factor and Weekly Review to prefer their snapshot documents, with raw aggregation only as a bootstrap fallback.
- Wired transaction writes/deletes, emergency fund writes/deletes, and profile saves to refresh the relevant snapshots after mutation.
- Wired Weekly Review saves to refresh `weekly-current` after persisting the editable weekly note fields.

### Debt, Income, And Roadmap Modules

- Added `Debt Control` route with debt overview, debt creation form, and debt list.
- Added `Income Builder` route with monthly income gap summary, source pipeline tracking, and source creation flow.
- Added `Wealth Roadmap` route with multi-phase checklist progression and persisted per-phase toggle state.
- Added service and hook layers for debts, income sources, and roadmap state with the same session-cache pattern used elsewhere.
- Wired debt and income changes to invalidate roadmap cache so phase progress reflects new data on the next read.

### Pay Yourself First Module

- Added a dedicated `Pay Yourself First` route with allocation-rule editing across living, emergency fund, long-term assets, business learning, and high-risk trading.
- Added a service and hook layer for Pay Yourself First data with the same session-cache and stale-while-refresh pattern as other authenticated routes.
- Derived the monthly income base and allocation suggestions from dashboard snapshot data instead of recomputing a separate income model.
- Preserved `settings.allocationRule` correctly when saving profile settings, so profile updates do not silently wipe the allocation rule.
- Wired transaction and profile mutations to invalidate the Pay Yourself First cache so the route does not render stale income allocation data after writes.

### Edit Flows For New Modules

- Added in-place edit mode for debt records on `Debt Control`, reusing the existing form instead of introducing a second screen.
- Added in-place edit mode for income sources on `Income Builder`, with local cache updates after save.
- Added in-place edit mode for emergency fund records, while keeping dashboard and weekly snapshot refresh after each save.
- Kept mutation handling local-first so users see updated lists immediately before the background snapshot refresh completes.

### Wealth Roadmap Snapshot Read Model

- Added `users/{userId}/snapshots/roadmap-current` as the read model for the roadmap route.
- Changed the roadmap route to prefer the snapshot document and only fall back to the raw multi-source compute path on first bootstrap.
- Wired transaction, emergency fund, profile, debt, and income mutations to refresh the roadmap snapshot after writes so roadmap phase progress stays warm and current.
- Changed roadmap checklist saves to persist the updated roadmap snapshot immediately instead of only invalidating cache.

### Focused Calculation Tests

- Added `vitest` to the project and changed `npm test` from a build-only smoke check to `vitest run && npm run build`.
- Extracted pure financial calculation helpers out of Firebase service modules so the core math is testable without network or Firestore mocks.
- Added focused tests for dashboard metrics, Latte Factor totals, weekly review scoring, and roadmap signal/merge behavior.

### Trading Risk And UI System Pass

- Added a `Trading Risk` route with configurable capital, daily/weekly/monthly loss limits, profit-withdrawal rule, and a lightweight trading P&L journal.
- Added session-cached read and local-first mutation handling for trading risk data.
- Upgraded shared button, card, and top navigation primitives so primary surfaces feel more consistent across the app instead of each page carrying its own visual weight.

### Production Domain

- Confirmed `https://wealth.zenx.asia` is live and serving the Firebase Hosting app.
- Updated project status and README with the production domain.

Remaining cost: authenticated first load still includes the Firebase Auth chunk, which is now the heaviest shared auth-related asset.

### Transaction Tracker Slice

- Removed generated `dist/` build output from the Git index and kept it ignored.
- Added `/transactions` list screen.
- Added transaction deletion from the list screen.
- Added Transactions navigation entry.
- Redirected Add Transaction to the Transactions screen after saving.

### Verification

```bash
npm test
```

Result: passed.
