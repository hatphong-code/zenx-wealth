# ZenX Wealth Project Status

Last updated: 2026-06-12

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

## Known Gaps

- **QuickCapture FAB**: no floating action button for instant expense logging from any screen
- **Latte → Convert flow**: user can see leaks but cannot directly transfer detected leakage to emergency fund
- **Net worth tile** on Dashboard: roadmap specifies this as a key metric; currently absent
- **PlanHub phase celebration**: no milestone animation/feedback when emergency fund hits 1/3/6 months
- **ReviewHub → WeeklyReview UX**: review form itself still a plain form; could be more guided (step-by-step)
- Latte Factor month-over-month percentage is still simplified
- AI Coach is rule-based, not LLM-backed
- Reports still reads raw records for list-heavy routes
- Free/Premium gating has no billing backend
- Firebase Auth must have Apple/Google/Email providers enabled manually in console
- Authorized domains must include `wealth.zenx.asia`

## Next Recommended Work (Priority Order)

1. **QuickCapture FAB** — floating button visible on all mobile screens; one-tap to `/transactions/new` with pre-filled date. Highest friction reducer in the entire app.
2. **Latte → Convert flow** — from TrackHub, user taps "Convert X tr to emergency fund" → shows confirmation → creates an emergency fund record. Closes the feedback loop.
3. **Net worth tile** — add to Dashboard hero section alongside net cash flow.
4. **Smart AddTransaction** — category autosuggest from recent patterns, one-tap Latte Factor toggle, recents shown first.
5. **Phase milestone celebration** — PlanHub shows a congratulations state when emergency fund crosses 1/3/6 month milestones.
6. **ReviewHub → guided step form** — transform the weekly review from a plain form into a 3-step guided flow (numbers → reflection → commitment).
7. **AI Coach upgrade** — use actual user data to generate contextual weekly insight (rule-based is fine, just more personalized).
8. **Desktop layout polish** — once mobile is solid, desktop sidebar customization and wide-screen Dashboard layout.
