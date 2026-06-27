# Implementation Log

This file records meaningful implementation changes so the project can be followed without reading every commit.

## 2026-06-27 — Spec 1/5/6/7 + Debt-Aware Allocation Overlay

**Spec 1 — Decimal precision:**
- Refactored `calculateFutureValue` in `financialCalculations.js` to use `decimal.js` internally (same signature, `Number` return). Installed `decimal.js`.
- Added unit tests: reference value check (900k/month, 8%, 240mo), zero-rate, zero-months.

**Spec 5 — Three-scenario projection:**
- Added `growth` field (11% rate) to `buildLatteProjectionSeries`.
- Updated `OnboardingFlow.jsx` Step 5 chart: added 3rd Line (`growth`, green dashed), added `<Legend>`, updated summary grid to show 3 values per year column (savings / invested / growth).
- i18n: `latteLegendSavings`, `latteLegendInvested`, `latteLegendGrowth` in vi.js + en.js.

**Spec 6 — Reverse Goal Calculator (PMT inverse):**
- Added `calculateRequiredMonthlySaving({ futureValueGoal, presentValue, annualRatePct, months })` to `financialCalculations.js`. Uses Decimal, returns `{ requiredMonthlySaving }` or `{ requiredMonthlySaving: 0, alreadyMet: true }` or `null`.
- Round-trip test confirms PMT → FV → PMT within Decimal precision.
- Added `ReverseGoalCalculator` card in `PlanHub.jsx` right panel (below priority CTA). Uses `NumericInput`, `formatMoney`.
- i18n: `planHub.reverseGoal.*` in vi.js + en.js.

**Spec 7 — Goal Health Check (Phase 1):**
- Extended `goalTrackingService.js`: `getGoalChecksRef(userId)` → subcollection `users/{userId}/goalChecks`. `maybeCreateGoalCheck` reads latest check, creates new record if ≥3 months gap (read-triggered, no Cloud Function needed). Added `saveGoalCheckAction(userId, checkId, userAction)` export.
- `GoalTracking.jsx`: added "Kiểm tra tiến độ" card showing when `latestCheck.userAction` is null. Two buttons: "Điều chỉnh mục tiêu" / "Giữ nguyên" → saves `userAction` to Firestore, shows confirmation.
- i18n: `goalTracking.check*` keys in vi.js + en.js.

**Spec Debt-Aware Allocation Overlay:**
- Added `applyDebtOverlay(baseAllocation, debtSummary, monthlyIncome)` to `financialCalculations.js`. Floors: `emergencyFund=5%`, `longTermAsset=5%` (proposed, pending confirmation). Tier logic: <10% light / 10-25% moderate / >25% heavy.
- Total always sums to 100 (excess freed beyond debt need returns to `longTermAsset`).
- Integrated in `PlanHub.jsx`: shows debt-adjusted allocation section when `badDebt > 0`, with explanatory copy using real interest rate. `ReverseGoalCalculator` added below.
- Added `debtRepayment: 0` to all 5 templates in `budgetTemplates.js` for consistent 6-key shape.
- i18n: `planHub.debtOverlay.*` + `planHub.alloc.*` in vi.js + en.js.

**Tests:** 34 core service tests pass (20 calculations, 6 serviceContracts, 8 goalParsing).
**Files:** `src/core/services/financialCalculations.js`, `src/core/services/__tests__/calculations.test.js`, `src/core/services/goalTrackingService.js`, `src/web/pages/GoalTracking.jsx`, `src/web/pages/OnboardingFlow.jsx`, `src/web/pages/PlanHub.jsx`, `src/core/data/budgetTemplates.js`, `src/core/i18n/dictionaries/vi.js`, `src/core/i18n/dictionaries/en.js`

---

## 2026-06-27 — Reports stability + AI Coach i18n + locale-switch access bug

**Reports intermittent loading:**
- Root cause: `Promise.all` in `computeReports` — any one of 11 service calls failing aborted the entire computation. Also `await setDoc` blocked return even when compute succeeded.
- Fix: replaced `Promise.all` with `Promise.allSettled` + per-service safe fallbacks; made snapshot `setDoc` fire-and-forget.
- Root cause 2: `useReportsData` DEFAULT had wrong field names (`cashFlowTrend`, `closeMetrics`) vs what `Reports.jsx` accesses (`data.trends.cashFlow`, `data.monthlyClose`). On cold load (no session cache), `data.trends` was `undefined` → crash → black screen.
- Fix: replaced hardcoded DEFAULT with `normalizeReports({})` so shape always matches.
- Root cause 3: `isEmptyTrend` checked wrong field names for Net Worth (`estimatedNetWorth`) and Emergency Fund (`monthsCovered`) charts → both always showed empty state.
- Fix: added correct field names to `isEmptyTrend`.

**Locale-switch causing feature-locked screen:**
- Root cause: `LocaleToggle.changeLocale` called `setUserProfileCache` with a fake profile (no `subscriptionTier`) when profile cache was null → `notifyUserProfileChanged` fired → `handleAccessChange` rebuilt state with `subscriptionTier: 'free'` → `canAccess('reports')` = false.
- Fix 1 (`AppShell.jsx`): skip `setUserProfileCache` when cached profile is null.
- Fix 2 (`useFeatureAccess.js`): functional setState in `handleAccessChange` falls back to existing state values when cache is expired.

**AI Coach i18n incomplete:**
- Root cause: `useAICoachData` only had `[userId]` as dependency; locale change didn't trigger re-fetch; `fetchAICoach` read locale from (potentially cached) profile.
- Fix: `getAICoach` / `fetchAICoach` accept explicit `locale` param; `useAICoachData(userId, locale)` adds locale to dependency array; `AICoach.jsx` passes `locale` from `useI18n`.
- Files: `src/core/services/reportsService.js`, `src/core/hooks/useReportsData.js`, `src/web/pages/Reports.jsx`, `src/web/components/AppShell.jsx`, `src/core/hooks/useFeatureAccess.js`, `src/core/services/aiCoachService.js`, `src/core/hooks/useAICoachData.js`, `src/web/pages/AICoach.jsx`

---

## 2026-06-23 — Fix vertical scroll on hub pages (Dashboard, PlanHub, TrackHub, ReviewHub)

- Root cause 1 (mobile): `touchAction: 'manipulation'` in `GestureNavigationWrapper` blocked all touch pan events, including vertical scroll. Changed to `touchAction: 'pan-y'` — browser now handles vertical scroll natively while JS still detects horizontal swipe deltaX.
- Root cause 2 (desktop): GestureWrapper div (`flex-col flex-1`) lacked `overflow-hidden` → `<main>` (flex-1 inside) had `min-height: auto` (default) and grew with content → no overflow → no scroll context created. Added `overflow-hidden` to wrapper div to constrain height chain correctly. Non-hub pages were unaffected because `<main>` was a direct child of the main column which already had `overflow-hidden`.
- Cleanup: removed 4 debug `console.log` from `useSwipeNavigation.js`, removed 3 unused pointer handler stubs.
- Files: `src/web/components/GestureNavigationWrapper.jsx`, `src/web/hooks/useSwipeNavigation.js`

---

## 2026-06-23 — i18n: fix missing translation keys

- `common.done` — dùng trong Notification "Done" button sau khi allow push notifications
- `profile.ageRange` + `profile.ageRangeHint` — dùng trong trang Hồ Sơ / Profile
- Files: `src/core/i18n/dictionaries/vi.js`, `src/core/i18n/dictionaries/en.js`

---

## 2026-06-23 — PWA/deployment stability fixes

- `ChunkErrorBoundary` added to `App.jsx` wrapping every `<Suspense>` route — auto-reloads page when a lazy chunk 404s after deploy (stale service worker scenario)
- `public/firebase-messaging-sw.js` created — fixes FCM "unsupported MIME type" console error; service worker now registered correctly for push notifications background handling
- Files: `src/web/App.jsx`, `public/firebase-messaging-sw.js`

---

## 2026-06-23 — Onboarding flow bug fixes

- Step 6 "View" button: navigating to `/budget-templates` while `onboardingCompleted: false` caused PrivateRoute to redirect back to step 1 → fixed by saving onboarding complete then navigating to `/welcome` with `{ state: { recommendedTemplateId } }`
- `WelcomeScreen` updated: reads `location.state.recommendedTemplateId`; if present, renders highlighted gold card "Xem bộ ngân sách gợi ý" at top of action list → user reaches budget template after going through welcome screen
- i18n: added `welcome.templateTitle` + `welcome.templateHint` to vi.js + en.js
- Files: `src/web/pages/OnboardingFlow.jsx`, `src/web/pages/WelcomeScreen.jsx`, `src/core/i18n/dictionaries/vi.js`, `src/core/i18n/dictionaries/en.js`

---

## 2026-06-23 — Fix onboarding reset end-to-end (3 bugs)

- Bug 1: `ConfirmDialog` missing `open` prop in UsersTab → dialog always returned null → all 3 action buttons (Set Premium, Set Free, Reset onboarding) appeared to do nothing
- Bug 2: `setUserProfileCache(userId, null)` throws TypeError (`null.subscriptionTier`) → replaced with `invalidateUserProfileCache(userId)` in both PreviewTab and UsersTab
- Bug 3 (previous session): `App.jsx` PrivateRoute returned early from cache without fetching fresh data after admin reset
- All 3 fixed; onboarding reset flow now works end-to-end ✓

---

## 2026-06-23 — User Management tab in Admin Panel

- Cloud Functions: `adminListUsers` (list Auth users + Firestore enrich), `adminUpdateUser` (setTier / resetOnboarding), admin-only guard
- Client service: `src/core/services/adminUserService.js` via firebase/functions httpsCallable
- UI: new "Users" tab in AdminAccessControl — email search, tier filter pills, user table, inline actions (set tier, reset onboarding), ConfirmDialog, load more
- i18n: `adminAccess.users.*` keys in vi.js + en.js
- Hosting deployed ✓ — functions deploy blocked by Secret Manager API (pre-existing, needs enable once in GCP Console)

---

## 2026-06-23 — Systemic null-access fix post-v3.0 switch

- Root cause: `createDataHook` initialized `data = null` (no cache) vs OLD hooks that had typed defaults
- Fix: added `defaultValue` third param to `createDataHook`; all 9 hooks updated with service-accurate default objects
- Affected: useTransactionsData, useAssetsData, useDebtData, useEmergencyFundData, usePayYourselfFirstData, useWealthRoadmapData, useIncomeSourcesData, useTradingRiskData, useReportsData, useWeeklyReviewData
- Pages no longer crash on first render before fetch completes (Dashboard, PlanHub, AppShell)
- Deployed: ✓

---

## 2026-06-23 — v3.0 Architecture Switch Complete

- `src/main.jsx` switched to `src/web/App.jsx` + `src/core/` providers
- Deleted OLD flat structure (src/pages/, src/services/, src/auth/, src/hooks/, src/data/, src/components/, src/utils/, src/i18n/, src/App.jsx)
- Fixed broken imports in `src/web/pages/`: AdminAccessControl, IncomeBuilder, Transactions, Login (dynamic import), Profile, DateRangePicker
- Fixed hook export name mismatches in `src/core/hooks/`: useDebtData, useIncomeSourcesData, usePayYourselfFirstData, useTradingRiskData
- Updated test files in `src/web/` and `src/core/` (import paths + normalizeDashboardStats shape with income/expense)
- Added ageRange bracket picker to `src/web/pages/Profile.jsx`
- Added Reset Onboarding feature to `src/web/pages/AdminAccessControl.jsx` (Preview tab)
- Build: ✓ clean. Tests: 1 pre-existing WeeklyReview label association failure (unrelated to switch)

---

## 2026-06-22 — Onboarding: Latte Factor Projection + Budget Template Recommendation

- Created `src/core/data/latteOnboarding.js`: LATTE_ITEMS (5 habits), AGE_BRACKETS, recommendTemplateIdByAgeRange()
- Added `calculateFutureValue()` and `buildLatteProjectionSeries()` to `financialCalculations.js`
- Extended onboarding from 5 → 6 steps (theme → language → currency+goal → numbers+age → latte → summary)
- Step 4 (Numbers): added 4-button age bracket picker (<22, 22-29, 30-44, 45+)
- Step 5 (new Latte Factor): tap-to-toggle habit chips, auto-sum daily saving, manual override input, seed example when no selection, Recharts LineChart (savings vs invested, 20 years)
- Step 6 (Summary): added template recommendation card with "Xem" → /budget-templates?recommend={id}
- `handleFinish` saves ageRange; only saves estimatedDailySaving when user has real input (not seed)
- `BudgetTemplates.jsx`: reads ?recommend= query param and auto-opens preview modal for that template
- i18n: 26 new keys in both vi.js and en.js; step3Title/step3Subtitle renamed → step4Title/step4Subtitle

---

## 2026-06-21 — Phase 1: Mobile Enhancement Infrastructure (1.1 - 1.3)

**Phase 1.1 (Gesture Navigation) - LIVE:**
- `useSwipeNavigation` hook: Detects left/right swipes on hub pages. Min threshold: 50px distance OR 0.5px/ms velocity. Navigation sequence: Dashboard ↔ TrackHub ↔ PlanHub ↔ ReviewHub.
- `GestureNavigationWrapper` component: Visual feedback during swipe (transform ±8px, opacity 0.75). Only active on mobile hub pages.
- Updated `AppShell.jsx` to wrap main content. Deployed.

**Phase 1.2 (Offline-first Sync) - LIVE:**
- `syncQueue.js`: Queue management with deduplication. Persists to sessionStorage. Auto-processes on connection restored.
- `useSyncStatus` hook: Tracks online/offline/syncing state. Dispatches custom events for UI updates.
- `SyncStatus` component: Visual indicator in sidebar (red offline, orange syncing with count, green online).
- `useQueueProcessor` hook: Global processor initialized in App.jsx. Listens to 'online' event.
- Operations queued for sync: createTransaction, updateTransaction, deleteTransaction, updateUserSettings, updateTheme, updateLocale, createEmergencyFundRecord, saveWeeklyReview.
- Deduplication ensures only latest write per resource is queued. Deployed.

**Phase 1.3 (Push Notifications) - LIVE:**
- `pushNotificationService.js`: FCM integration. requestPermission(), registerServiceWorker(), getFCMToken() (cached), setupMessageListener().
- `usePushNotification` hook: Initializes on app load. Shows permission dialog on first visit.
- `PushNotificationPermissionDialog` component: Bottom-sheet on mobile. Allow/Not Now actions.
- Service Worker (`public/sw.js`): Handles background FCM messages via Firebase SDK (compat mode). Displays notifications, handles clicks.
- Settings toggle: New notifications section with enable/disable button. Syncs with PushNotificationService.
- i18n: Added common.notNow, common.processing, notifications.permissionDialog, settings.notificationsTitle/Subtitle.
- Deployed.

**Phase 1 Complete** — All three subphases live at https://wealth.zenx.asia. Gesture navigation works on real Android devices. Offline sync infrastructure ready (write queuing implemented but not integrated into individual services — can be added later if needed). Push notification system ready for FCM backend integration.

---

## 2026-06-21 — v3.0 Architecture Refactor Complete (Sprints 1-6)

**Sprint 1**: All Firestore writes moved to services. Pages no longer import firebase/firestore. createTransaction, updateTransaction, deleteTransaction, updateUserSettings, updateTheme, updateLocale, createEmergencyFundRecord, saveWeeklyReview — all in service layer.

**Sprint 2**: Cache invalidation centralized via cacheCoordinator.js. 8 individual calls → 1 per operation type (transaction/settings/emergency/review).

**Sprint 3**: Storage abstracted via storageAdapter.js. sessionCache now uses pluggable interface; RN can inject AsyncStorage.

**Sprint 4**: Folder restructure: src/core/ (portable) + src/web/ (web-only). Updated 100+ import paths. Core has zero web dependencies.

**Sprint 5**: Hook factory createDataHook() eliminates 550 lines of boilerplate. 10 data hooks (Assets, Debt, EmergencyFund, IncomeSources, PayYourselfFirst, Reports, TradingRisk, Transactions, WealthRoadmap, WeeklyReview) now share identical implementation.

**Sprint 6**: Service-level i18n. Created getTranslation.js. Moved 50+ aiCoachService copy strings to vi.js + en.js dictionaries. Services can now access translations without React context dependency.

**Impact**: Core is fully platform-agnostic and ready for React Native migration. All write operations abstracted, cache pluggable, storage abstracted, folders separated, hooks DRY, i18n decoupled from UI layer.

---

## 2026-06-20 — v2.4 Priority 3 UI/UX Improvements

### prefers-reduced-motion
- `@media (prefers-reduced-motion: reduce)` trong `index.css` — tắt mọi transition/animation khi OS yêu cầu. Áp dụng cho `*`, `.zx-transition`, `.progress-fill`.

### Chart Empty States (Reports)
- `EmptyChart` component hiển thị icon + "Chưa có dữ liệu" + hint khi trends rỗng.
- `isEmptyTrend()` helper kiểm tra array rỗng hoặc tất cả values = 0.
- Wire vào 3 ChartShell: cashFlow, netWorthEstimate, emergencyCoverage.

### Weekly Review Auto-save
- Debounced `useEffect` 30s: khi `dirty && !saving`, tự save Firestore (merge: true).
- Header hiện "Đang lưu..." khi saving, "Đã lưu tự động HH:MM" sau khi xong.
- Silent fail — user vẫn có thể bấm "Lưu" thủ công.

### Focus Trap (BottomSheet)
- `src/hooks/useFocusTrap.js` — trap Tab/Shift+Tab trong container, restore focus khi đóng.
- Wire vào `BottomSheet` trong `AppShell.jsx` với `useRef`.
- Thêm `role="dialog" aria-modal="true"` cho ARIA compliance.

### Combobox (Transactions filter)
- `src/components/ui/Combobox.jsx` — searchable dropdown: inline search input, clear button, click-outside close.
- Replace `<select>` tháng và danh mục trong Transactions.jsx advanced filter panel.

---

## 2026-06-20 — v2.3 Priority 2 UI/UX Improvements

### Export CSV (Transactions)
- Nút "Xuất CSV" trong header Transactions, chỉ hiện khi có data. Export danh sách đang filter ra `.csv` có BOM (Excel-safe), filename `giao-dich-YYYY-MM-DD.csv`.

### Breadcrumb Navigation
- Desktop TopBar hiển thị `"Group › Page"` trên sub-pages; hub pages vẫn hiện greeting.
- Group label link về hub route (/track, /plan, /review). Profile/Admin group hiện text không có link.

### Date Range Presets (Reports)
- Toggle 4 preset: 3T / 6T / Năm nay / Tất cả — filter các trend arrays (cashFlow, netWorthEstimate, emergencyCoverage) bằng slice, default 6T.

### Bulk Actions (Transactions)
- Nút "Chọn" toggle selection mode. Desktop: checkbox column + click-row-to-toggle. Mobile: checkbox per card.
- "Chọn tất cả" trong thead. Action bar: "Xóa N mục" → `writeBatch` Firestore delete + toast + invalidate caches.

### Global Search (Ctrl+K)
- `GlobalSearch.jsx`: overlay mở bằng Ctrl/Cmd+K hoặc click nút hint trong TopBar. Đóng bằng Escape/click backdrop.
- Tìm trong featureCatalog (static, all features) + cached transactions (category + note). Highlight match.
- Navigate đến page khi chọn. Transaction results navigate về /transactions.

---

## 2026-06-20 — v2.2 Priority 1 UI/UX Improvements

### Toast/Notification System
- Tạo `src/components/ui/Toast.jsx`: `ToastProvider` + `useToast()` hook, 3 variants (success/error/info), auto-dismiss 3.5s, stacks nhiều toast
- Wire vào `main.jsx` (wrap toàn app)
- Wire vào `Transactions.jsx` (delete success/error), `AddTransaction.jsx` (add/edit success), `Settings.jsx` (save success/error)
- Xóa `savedFlash` state và `message` state cũ (replaced by toast)

### Base Form Components
- Tạo `src/components/ui/Input.jsx`, `Textarea.jsx`, `Select.jsx` — unified styling qua design tokens
- Replace `const inputCls` pattern trong `Settings.jsx` và `AddTransaction.jsx`
- Error state prop: `error={true}` đổi border sang `zx-negative`

### aria-label cho icon-only buttons
- `AppShell.jsx`: close button mobile nav group sheet
- `AppNav.jsx`: hamburger menu button + close menu button
- `BudgetTemplates.jsx`: close button template preview modal
- `TrackHub.jsx`: close button convert panel
- i18n keys: `nav.openMenu` thêm vào vi.js + en.js

### Skeleton Loading
- Tạo `src/components/ui/Skeleton.jsx`: `Skeleton`, `SkeletonText`, `SkeletonCard`, `SkeletonRow`
- `AddTransaction.jsx`: thay `<div>Đang tải...</div>` → skeleton form (5 skeleton bars)
- `Transactions.jsx`: khi `loading && transactions.length === 0` → hiện 6 `SkeletonRow`

### Error token fix
- `Transactions.jsx`, `AddTransaction.jsx`, `Settings.jsx`: thay `border-red-900 bg-red-950 text-red-300` → `border-zx-negative/40 bg-zx-negative/10 text-zx-negative`

---

## 2026-06-20 — v2.1 UI/UX Analysis + Project Documentation

### UI/UX Desktop Analysis
- Phân tích toàn diện UI/UX phiên bản desktop, tạo `UI_UX_DESKTOP_REPORT.md` (13 mục, scorecard 6.9/10)
- Nhận diện 3 vấn đề Critical (Toast, base form components, aria-label), 5 High, 5 Medium
- Xác nhận những gì đang tốt: dual-theme token system, lazy loading, mobile-first layout, feature gating

### Project Documentation
- Tạo `CLAUDE.md` tại root — project context và quy tắc làm việc cho mọi Claude session
  - Design system rules (5 quy tắc tuyệt đối), navigation architecture, code conventions
  - i18n đầy đủ: hook signature, interpolation `{token}`, bảng formatters, quy tắc dictionary
  - Danh sách tech debt ưu tiên 🔴🟠🟡 từ UI/UX report
  - Quy tắc cập nhật `PROJECT_STATUS.md` + `IMPLEMENTATION_LOG.md` sau mỗi session

---

## 2026-06-18 — v2.1 Plan Layout Polish + Budget Templates Overhaul

### Plan Section — Layout Standardization (6 pages)

Standardized all Plan sub-pages to consistent container, stats, and spacing patterns:

- **Container widths unified**: EmergencyFund `max-w-6xl` → `max-w-5xl`; Assets + TradingRisk `max-w-7xl` → `max-w-6xl`; BudgetTemplates `max-w-5xl` → `max-w-6xl`
- **Padding pattern**: all use `px-4 md:px-8 py-6 pb-24 md:pb-8` (was `p-4 md:p-6` on 3 pages)
- **`space-y-6`** added to PayYourselfFirst, DebtControl, IncomeBuilder (had no section spacing)
- **Stats cards**: PayYourselfFirst, DebtControl, IncomeBuilder — bare `<div class="py-4">` → `rounded-zx border border-zx-line bg-zx-surface p-4` cards
- **Stats grid**: `md:grid-cols-2 xl:grid-cols-4` → `sm:grid-cols-2 xl:grid-cols-4` (better tablet breakpoint)
- **Progress section**: PayYourselfFirst — bare `py-5` section → card with border/bg
- **Allocation section**: PayYourselfFirst — bare `py-5` → card with border/bg
- **List sections**: DebtControl, IncomeBuilder, Assets — `overflow-hidden` only → `rounded-zx border border-zx-line bg-zx-surface overflow-hidden`
- **Icon headers**: DebtControl (added `CreditCard`), IncomeBuilder (added `TrendingUp`) — now consistent with EmergencyFund, Assets, PayYourselfFirst
- **Design tokens**: Assets + TradingRisk — all `rounded-lg` (Tailwind generic) → `rounded-zx` / `rounded-zx-sm` (design system); form container, inputs, monitor items, status badges, journal entries

### Budget Templates — UI Redesign

- **3-column grid**: `md:grid-cols-2` → `md:grid-cols-2 xl:grid-cols-3` for better use of wide screens; 5 templates now display 3+2 instead of 2+2+1
- **Categories split income/expense**: replaced flat expandable list with always-visible two-section layout — income chips (emerald tones) / expense chips (muted surface-2); shows max 4 income + 5 expense per card, overflow as `+N`
- **Compact allocation bar** (`AllocationBarCompact`): card uses `h-2` bar + dot-% inline (no text labels); full bar with legend retained in modal only — saves ~3 lines per card
- **Badges in header**: savings target + emergency target moved into `CardHeader` as pill badges (previously in CardContent body)
- **Removed** expand/collapse mechanism (`expanded` state, `toggleExpand`, `ChevronDown/Up` icons)
- **Modal categories**: also updated to show income/expense split (was flat `[...income, ...expense]`)
- **New i18n keys**: `budgetTemplates.income` (Thu nhập / Income) and `budgetTemplates.expense` (Chi tiêu / Expenses) in both dictionaries

### Budget Templates — Bug Fixes

**Template name/description not using admin-edited values**
- Root cause: `BudgetTemplates.jsx` used `t('budgetTemplates.templates.{id}.name', {}, template.id)` — always fell back to i18n key, never read `nameVI`/`nameEN` fields saved by admin
- Fix: prefer `template.nameEN` / `template.nameVI` first, fall back to i18n key; same for description
- New templates created by admin (id = `tmpl_{timestamp}`) now display correctly instead of showing raw ID

**`payYourselfFirstRate` not updated when applying template**
- Root cause: `handleApply` wrote `allocationRule` to Firestore but omitted `payYourselfFirstRate`, which `dashboardService` reads directly (`settings.payYourselfFirstRate || 0.3`). `payYourselfFirstService` re-derives it from `allocationRule.living` so PYF page was correct, but Dashboard was stale.
- Fix: added `payYourselfFirstRate: 1 - (template.allocation.living / 100)` to `nextSettings`

**Missing cache invalidations on template apply**
- `invalidateDashboardStatsCache` not called → Dashboard `payYourselfProgress` / `emergencyMonths` stale for up to 5 minutes
- `invalidateWeeklyReviewCache` not called → Weekly review PYF check used old allocation rule
- Fix: both added to `handleApply` in `BudgetTemplates.jsx`

### Admin — Budget Templates Tab

Added 5th tab **Budget Templates** to Admin panel (`/admin/access`):
- Full CRUD: create, edit, delete templates; reset to hardcoded defaults
- `TemplateEditor` component: collapsible per-template editor with VI/EN name+description, allocation inputs (with live total validator showing X/100), savings %, emergency months, and category textareas (comma-separated)
- Templates saved to Firestore `appConfig/budget-templates` via `saveBudgetTemplates()`; in-memory cache invalidated on save
- `getBudgetTemplates()` service: reads from Firestore with 5-min TTL cache, falls back to hardcoded `src/data/budgetTemplates.js` if Firestore doc is empty

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
