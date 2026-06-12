# ZenX Wealth Project Status

Last updated: 2026-06-12 (v1.4)

## Current Phase

**Design system applied + Mobile-first UX foundation complete.**

The app has transitioned from a functional MVP with hardcoded styles to a full design-system-driven product with two audience themes (Ấm / Tư gia), a status-driven hub navigation for mobile, and a consistent ít khung visual language across all pages.

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
- Admin access control

### Financial Modules (all routes live)
- Dashboard
- Transactions (list, add, edit)
- Latte Factor engine
- Pay Yourself First (allocation rule + progress)
- Emergency Fund (balance tracker, progress)
- Debt Control
- Income Builder
- Trading Risk
- Assets
- Wealth Roadmap (phase-based checklist)
- Weekly Review (score + lesson + next action)
- Reports (trend layer + estimated net worth)
- AI Coach (rule-based on existing read models)
- User Profile + Settings

### Design System (ZenXWealthUI)
- CSS token layer: colors, typography, spacing — two themes
  - **Ấm** (Trẻ): cream/terracotta, Be Vietnam Pro + Bricolage Grotesque, light
  - **Tư gia** (Trung niên): navy/gold, Playfair Display + Hanken Grotesk, dark
- `data-theme` switching live, persisted to localStorage
- `ThemeProvider` context + toggle in sidebar and mobile top bar
- Tailwind extended with `zx-*` semantic utility classes
- `fmtShort()` compact number formatter (12,5 tr / 500k)

### Navigation & Shell
- `AppShell` component — full layout wrapper (replaces page-level AppNav)
- **Desktop**: accordion sidebar — groups expand in-place with chevron, sub-items indented
- **Mobile**: fixed bottom tabs (5 groups) + status-driven Hub pages per group
- **Hub pages** (mobile entry points — data-driven, not menus):
  - `TrackHub` — dòng tiền tháng + Latte Factor trend + 5 giao dịch gần nhất
  - `PlanHub` — current phase + auto-priority (urgent/active/done) + 7 plan items with status (✓/●/○/🔒)
  - `ReviewHub` — week status (reviewed/not reviewed) + score + metrics + CTAs
- Mobile top bar shows current sub-item name, not just group name
- Bottom tabs `position: fixed` — does not scroll with content

### Backend
- Cloud Functions snapshot engine for: dashboard, latte-current, weekly-current, roadmap-current, reports-current
- Session-level cache with stale-while-refresh for all primary routes
- Structured Cloud Logging for snapshot refresh

### Other
- i18n: Vietnamese default, English ready (vi.js double-encoding bug fixed 2026-06-12)
- ESLint baseline

## Routes

```text
/login
/                      ← Dashboard (Home hub)
/track                 ← TrackHub (NEW)
/plan                  ← PlanHub (NEW)
/review                ← ReviewHub (NEW)
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
/profile
/settings
/admin/access
```

## User Settings Shape

```text
users/{userId}
  subscriptionTier: free | premium
  goal12Month: string
  displayName / email / photoURL
  settings.currency: VND | USD
  settings.monthlyEssentialExpense: number
  settings.emergencyFundTargetMonths: number
  settings.payYourselfFirstRate: number
  settings.allocationRule: { living, emergencyFund, longTermAsset, businessLearning, highRiskTrading }
  settings.customCategories: { income: string[], expense: string[] }
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
```

## Completed in v1.1–v1.4 (2026-06-12)

- **QuickCapture FAB** — fixed `+` above bottom tabs on all mobile pages
- **Latte→Convert** — TrackHub bottom sheet → creates emergency fund record → success state
- **Net Worth tile** — Dashboard hero: assets − debts alongside net cash flow
- **Savings Rate tile** — replaced redundant cash flow tile with savings %
- **Smart AddTransaction** — Vietnamese UI, type toggle, Latte auto-detect by keyword, quick-tap chips
- **PlanHub ETA** — months to next emergency fund milestone at current rate
- **Milestone celebration** — ✦ + colored label at 1/3/6/12 month thresholds
- **Latte tip in PlanHub** — "Cắt Latte Factor = +X/tháng" contextual insight
- **Guided 3-step Weekly Review** — Numbers → Reflect (AI insight) → Commit; success screen
- **AI contextual insight** — personalized text from latte %, savings rate, score
- **ReviewHub score history** — last 5 weekly scores as mini bar chart sparkline

## Known Gaps

- Latte Factor month-over-month percentage still simplified
- AI Coach is rule-based, not LLM-backed
- Reports still reads raw records for list-heavy routes
- Free/Premium gating has no billing backend
- Firebase Auth must have Apple/Google/Email providers enabled in console
- Authorized domains must include `wealth.zenx.asia`

## Next Recommended Work

1. **Desktop layout polish** — sidebar stat summaries, wider Dashboard on large screens
2. **PWA / Add to homescreen** — service worker, offline read, home icon
3. **Recurring transaction detection** — auto-flag expenses that repeat monthly
4. **AI Coach LLM upgrade** — replace rule-based with actual LLM analysis
5. **Monthly financial letter** — personalized 200-word month-end summary
6. **Goal tracking** — 12-month goal → weekly trajectory signal
