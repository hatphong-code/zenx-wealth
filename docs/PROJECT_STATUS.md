# ZenX Wealth Project Status

Last updated: 2026-06-11

## Current Phase

Late-stage MVP buildout. The app now covers the core financial operating loop plus the first wealth-building, reporting, coaching, lint/test hardening, and Free/Premium gating layer.

## Firebase Project

```text
Project ID: zenx-wealth
Production domain: https://wealth.zenx.asia
Default hosting URL: https://zenx-wealth.web.app
```

## Implemented

- React + Vite app shell
- Firebase Auth and Firestore setup
- Protected routes
- Login and registration with email/password, Google account, and Apple ID
- Dashboard route
- Transactions list route
- Add Transaction route
- Latte Factor route
- Emergency Fund route
- Pay Yourself First route
- Debt Control route
- Income Builder route
- Trading Risk route
- Assets route
- Wealth Roadmap route
- Weekly Review route
- Reports route
- AI Coach route
- Reports v2 trend layer with current balance sheet and estimated net worth line
- ESLint baseline with project-wide lint script
- Cloud Functions snapshot engine live for backend-triggered refresh of:
  - `dashboard`
  - `latte-current`
  - `weekly-current`
  - `roadmap-current`
  - `reports-current`
- User Profile route
- Settings route
- Admin Access route
- i18n foundation with Vietnamese as default UI locale and English-ready dictionaries
- Shared top navigation with sign out
- Grouped mobile-first navigation with bottom tabs and contextual sub-navigation
- Route-level code splitting via `React.lazy`
- Shared auth state via a single `AuthProvider`
- Split Firebase into `auth`, `core`, and `firestore` vendor chunks
- Switched app data access to Firestore Lite for lower initial bundle cost
- Session-level cache for user profile, Dashboard stats, and Latte Factor reads
- Session-level cache for Transactions, Emergency Fund, Weekly Review, and Profile reads
- Stale-while-refresh behavior across primary authenticated routes instead of blocking full-screen loading
- Dashboard now reads from `users/{userId}/snapshots/dashboard` instead of recomputing from raw collections on every open
- Latte Factor now reads from `users/{userId}/snapshots/latte-current`
- Weekly Review now reads from `users/{userId}/snapshots/weekly-current`
- Wealth Roadmap now reads from `users/{userId}/snapshots/roadmap-current`
- Firestore rules scoped under `users/{userId}`
- Firebase Hosting config for Vite build output
- Focused Vitest coverage for financial and roadmap calculation logic
- Service contract tests for summary read models and AI Coach state shaping
- UI flow tests for grouped navigation and the Weekly Review save path
- Structured Cloud Logging around backend snapshot refresh start, completion, duration, and failure context

## Core Routes

```text
/login
/
/transactions
/transactions/new
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
/profile
/settings
/admin/access
```

## User Settings Shape

```text
users/{userId}
  subscriptionTier: free | premium
  goal12Month: string
  displayName: string
  email: string
  photoURL: string
  settings.currency: VND | USD
  settings.monthlyEssentialExpense: number
  settings.emergencyFundTargetMonths: number
  settings.payYourselfFirstRate: number
  settings.allocationRule.living: number
  settings.allocationRule.emergencyFund: number
  settings.allocationRule.longTermAsset: number
  settings.allocationRule.businessLearning: number
  settings.allocationRule.highRiskTrading: number
  settings.customCategories.income: string[]
  settings.customCategories.expense: string[]
```

## Firestore Collections In Use

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
```

## Debt Shape

```text
debtName: string
totalAmount: number
remainingAmount: number
interestRate: number
minimumPayment: number
dueDate: string
debtType: string
priority: High | Medium | Low
isBadDebt: boolean
note: string
createdAt: serverTimestamp
updatedAt: serverTimestamp
```

## Income Source Shape

```text
sourceName: string
sourceType: string
currentMonthlyIncome: number
targetMonthlyIncome: number
stage: string
nextAction: string
note: string
createdAt: serverTimestamp
updatedAt: serverTimestamp
```

## Emergency Fund Record Shape

```text
amount: number
currency: VND | USD
date: Timestamp
note: string
createdAt: serverTimestamp
updatedAt: serverTimestamp
```

## Weekly Review Shape

```text
weekStart: Timestamp
weekEnd: Timestamp
currency: VND | USD
income: number
expense: number
latteFactorTotal: number
savingsRate: number
emergencyFundMonths: number
wealthDisciplineScore: number
topLatteCategory: string
oneLesson: string
oneActionNextWeek: string
updatedAt: serverTimestamp
```

## Transaction Shape

```text
amount: number
currency: VND | USD
type: income | expense
category: string
date: Timestamp
isLatteFactor: boolean
isRecurring: boolean
note: string
createdAt: serverTimestamp
updatedAt: serverTimestamp
```

## Known Gaps

- Latte Factor month-over-month percentage is still simplified
- Test coverage now includes calculation logic, service contracts, and a first slice of UI flows, but still does not cover Firebase integration paths broadly
- Firebase Auth is still a meaningful first-load cost, but Firestore is no longer bundled into auth bootstrap and the app now uses Firestore Lite
- Add Transaction still fetches the transaction being edited directly, but it now invalidates related caches after save
- Transactions, Emergency Fund, Debt, Income, Trading Risk, and Assets still read raw records, while summary-style routes use snapshot documents
- AI Coach is currently rule-based on top of existing read models, not an LLM-backed assistant
- Reports uses route-level charting and is intentionally heavier than most other routes, but remains isolated in its own lazy chunk
- Backend snapshot refresh is now the primary path for summary-style read models; the client mainly invalidates local caches after writes
- Free/Premium gating currently relies on a Firestore-driven feature matrix plus admin-email-based write access in Firestore rules, not a billing backend yet
- Settings custom categories currently extend built-in suggestions rather than replacing them
- Firebase Authentication must have Apple, Google, and Email/Password providers enabled in the console
- Firebase Authentication authorized domains must include `wealth.zenx.asia`

## Next Recommended Work

1. Broaden tests to cover UI flows and Firebase-facing service behavior.
2. Decide whether AI Coach should stay rule-based or move to an LLM-backed recommendation layer.
3. Add deeper historical reporting once true monthly close history exists.
4. Add backend observability for snapshot recompute latency and failure rate.
5. Consider paginated or summarized read models for list-heavy routes if record volumes grow.
