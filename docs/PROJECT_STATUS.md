# ZenX Wealth Project Status

Last updated: 2026-06-14 (v1.10)

## Current Phase

**Design system + Enhanced analytics + Smart recurring detection + Personalized coaching.**

The app has matured from MVP to a polished financial OS with two-theme design system, mobile-first hub navigation, recurring transaction auto-detection, and AI-powered personalized insights. Desktop layout optimized with sidebar stats and 2-column layout.

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

## Completed in v1.1–v1.8 (2026-06-14)

### v1.1–v1.4 Foundation
- QuickCapture FAB, Latte→Convert flow, Net Worth + Savings tiles
- Smart AddTransaction, PlanHub ETA, Milestone celebrations, Latte insights
- Guided 3-step Weekly Review with AI contextual insights
- ReviewHub score history sparkline

### v1.5 Desktop Polish
- **Sidebar stats component** — net cash flow, emergency fund bar, current phase
- **Dashboard 2-column layout** — hero + stats (left), focus + quick access (sticky right)
- Better visual hierarchy for desktop

### v1.6 PWA / Add to Homescreen
- Service worker with Workbox caching strategies
- Offline-first read for last-synced data
- Web manifest + PNG icons (192/512) with gold Z branding
- Meta tags for iOS/Android home screen install

### v1.7 Recurring Transaction Detection
- Auto-analysis of last 12 months — groups expenses by category, amount, day-of-month
- Auto-flagged in Transactions list with ↻ Monthly badge
- TrackHub recurring insight section showing monthly fixed costs
- Pattern detection: ±3 day tolerance, 2+ occurrences = recurring

### v1.8 Enhanced AI Coach
- Personalized headline generation based on financial state
- Operating insight analysis — detailed feedback tied to savings rate thresholds
- Better tone + context per user phase

### v1.9 Monthly Financial Letter
- Personalized month-end 200–300 word summary
- Key metrics: net cash flow, savings rate, Latte Factor, emergency fund progress
- Adaptive messaging based on financial state
- Download as Markdown, email delivery placeholder

### v1.10 Goal Tracking
- 12-month financial goal from Settings with auto-parsing
- Weekly trajectory calculation — target savings rate to reach goal
- On-track signal (90% threshold), visual progress bar
- Remaining weeks countdown, weekly savings guidance

## Known Gaps

- Recurring detection doesn't persist flags to Firestore (read-only on fetch)
- AI Coach is enhanced rule-based, not LLM-backed (no external API calls)
- Monthly letter email delivery is not yet implemented (download only)
- Goal parsing is simple regex-based (handles "X triệu" format, but not all variations)
- Reports still reads raw records for list-heavy routes
- Free/Premium gating has no billing backend
- Firebase Auth must have Apple/Google/Email providers enabled in console
- Authorized domains must include `wealth.zenx.asia`

## Next Recommended Work

1. **Transaction search/filter** — improved discovery for large histories
2. **Budget templates** — pre-built category structures by life phase
3. **LLM integration** — backend Cloud Function calling Claude API for insights
4. **Mobile wallet sync** — connect bank/payment app for auto-transactions (future phase)
5. **Financial health score** — composite metric (net worth + savings rate + consistency)
