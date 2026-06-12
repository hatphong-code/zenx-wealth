# ZenX Wealth

ZenX Wealth is a personal finance operating system for late starters. The current product direction follows the roadmap in `docs/ZenX_Wealth_Web_App_Roadmap.md`: track cash flow, detect Latte Factor leakage, build an emergency fund, and create a weekly financial review loop.

## Current App

The app is a React + Vite + Firebase MVP with:

- Firebase email/password authentication
- Google account authentication
- Apple ID authentication
- Private dashboard route
- Transaction list and delete flow
- Add Transaction flow
- Pay Yourself First allocation flow
- User profile and financial settings
- Shared currency and number formatting
- Route-level and vendor-level code splitting
- Firestore Lite instead of the full Firestore SDK for one-shot reads and writes
- Session caching and stale-while-refresh reads for Dashboard and Latte Factor
- Session caching and stale-while-refresh reads across the main authenticated routes
- Persistent Dashboard snapshot document to avoid recomputing dashboard metrics on every open
- Persistent snapshot documents for Dashboard, Latte Factor, and Weekly Review read paths
- Persistent snapshot document for Wealth Roadmap read path
- Debt Control, Income Builder, and Wealth Roadmap modules
- Dedicated Pay Yourself First allocation rule screen
- Trading Risk monitor with configurable loss limits and journal entries
- Assets / Invest Tracking module for liquid, long-term, and risk assets
- Reports route aggregating monthly, weekly, growth, and risk views
- Reports v2 with balance sheet, six-month trend views, estimated net worth line, and monthly close summary
- AI Coach v2 route surfacing prioritized focus, wins, watchouts, and next-step actions from the report layer
- Dedicated Settings route for 12-month goal, custom categories, and allocation rule tuning
- Admin-only Free/Premium access matrix with route-level feature gating and per-account tier preview
- i18n foundation with Vietnamese default locale, English-ready dictionaries, and locale-aware service copy
- Mobile-first grouped navigation with bottom tabs, contextual subnav, and condensed route hierarchy
- Focused Vitest coverage for core financial and roadmap calculations
- Service contract tests for snapshot normalization and AI Coach decision-state shaping
- UI flow tests for grouped navigation and Weekly Review save behavior
- ESLint baseline for the React/Firebase client
- Cloud Functions snapshot engine live on Firebase Functions Gen 2 (Node 22) for backend-triggered read-model refresh
- Structured Cloud Logging for snapshot refresh lifecycle, duration, trigger type, and failure context
- Monthly net cash flow calculation
- Monthly Latte Factor calculation
- Emergency fund tracking and progress calculation

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Firebase Auth
- Firestore
- React Router
- lucide-react

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from the Firebase web app config:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

3. Start local development:

```bash
npm run dev
```

Firebase project:

```text
zenx-wealth
```

Production domain:

```text
https://wealth.zenx.asia
```

4. Build or smoke-test the app:

```bash
npm run build
npm test
```

5. Deploy or update backend snapshot triggers:

```bash
cd functions
npm install
cd ..
npx firebase deploy --only functions --project zenx-wealth
```

6. Deploy hosting and Firestore rules:

```bash
npx firebase deploy --only hosting,firestore:rules --project zenx-wealth
```

## Documentation Map

- `docs/ZenX_Wealth_Web_App_Roadmap.md`: product roadmap and module design
- `docs/khoi_dau_muon_mang_ket_thuc_giau_sang_roadmap.md`: financial philosophy and source concept
- `docs/PROJECT_STATUS.md`: current implementation state
- `docs/IMPLEMENTATION_LOG.md`: chronological implementation notes
- `docs/DEVELOPMENT_WORKFLOW.md`: conventions for ongoing work
