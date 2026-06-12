# Development Workflow

## Working Principle

**Mobile-first, then desktop.** The primary user experience is on smartphone. Every feature is designed for the mobile hub-navigation flow first, then adapted for desktop accordion sidebar.

**Status-driven, not menu-driven.** The app guides users based on their current financial state — what needs attention now — not by exposing a flat list of features. Hub pages (TrackHub, PlanHub, ReviewHub) are the entry points on mobile; they show context before offering actions.

**Ít khung (open/airy) visual language.** Hairlines + whitespace instead of nested card boxes. Content leads, chrome follows. Applies consistently across all pages.

**Design system first.** All styling goes through `ZenXWealthUI/tokens/` CSS variables + Tailwind `zx-*` utility classes. Never add hardcoded hex colors to page files.

## Standard Loop

1. Read `docs/ZenX_Wealth_Web_App_Roadmap.md` for the feature's place in the journey.
2. Design the mobile hub entry point first — what does the user see before they act?
3. Implement the smallest complete user workflow.
4. Run `npm run build`.
5. Deploy with `firebase deploy --only hosting` to verify on real device.
6. Update `docs/PROJECT_STATUS.md` and `docs/IMPLEMENTATION_LOG.md`.

## Design System Usage

```text
Theme variables:  ZenXWealthUI/tokens/colors.css
Typography:       ZenXWealthUI/tokens/typography.css
Spacing/radii:    ZenXWealthUI/tokens/spacing.css

Switch theme:     document.documentElement.setAttribute('data-theme', 'young' | 'mid')
Theme context:    src/hooks/useTheme.jsx

Tailwind tokens:  bg-zx-bg, bg-zx-surface, text-zx-text, text-zx-accent, border-zx-line...
Font utilities:   font-zx-display (numbers), font-zx-head (headings), font-zx-body (body)
Number format:    fmtShort(n) from src/utils/formatters.js → "12,5 tr" / "500k"
```

## Navigation Architecture

```text
Desktop:
  AppShell → sidebar accordion (groups expand in-place)
  TopBar   → greeting + current page title + QuickAdd button

Mobile:
  AppShell → bottom tabs (5 groups, fixed)
  Tapping a tab → navigates to Hub page
  Hub pages = status overview + contextual actions + links to sub-pages
  MobileTopBar → current sub-item label + theme toggle + QuickAdd + avatar

Hub pages:
  /           = Dashboard (home hub)
  /track      = TrackHub
  /plan       = PlanHub
  /review     = ReviewHub
  /settings   = Settings (profile hub)
```

## Code Conventions

- All pages under `src/pages/`. Hub pages go in `src/pages/` directly (e.g. `TrackHub.jsx`).
- Shared shell in `src/components/AppShell.jsx`. Do not add `AppNav` to new pages — AppShell wraps all authenticated routes in `App.jsx`.
- Keep user data under `users/{userId}` in Firestore.
- Move repeated Firestore logic into `src/services/`.
- Store money values as numbers; persist transaction currency.
- Display money through `src/utils/formatters.js` — use `fmtShort()` for hub/dashboard, `formatMoney()` for detail pages.
- Store dates as Firestore `Timestamp`.
- Keep Firebase web config in Vite env vars.

## Ít Khung Page Pattern

Every page follows this structure:

```jsx
// max-w-lg (mobile hubs) or max-w-5xl (full pages)
<div className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8">

  {/* Hero / status section */}
  <section className="pb-6">
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft mb-3">Label</p>
    <p className="font-zx-display text-4xl font-bold text-zx-text">BigNumber</p>
  </section>

  <div className="h-px bg-zx-line" />   {/* hairline separator */}

  {/* Content section */}
  <section className="py-6">
    {/* section content */}
  </section>

  <div className="h-px bg-zx-line" />

  {/* Actions */}
  <section className="pt-5">...</section>
</div>
```

No Card wrappers, no shadow boxes for top-level sections. Use `rounded-zx-sm border border-zx-line` only for inline form fields or nested items that need visual grouping.

## MVP Priority (Current)

1. QuickCapture FAB — floating action button for instant expense logging
2. Latte → Convert flow — move detected leakage to emergency fund
3. Net worth tile on Dashboard
4. Smart AddTransaction UX
5. Phase milestone celebration in PlanHub
6. Guided Weekly Review flow (step-by-step)

## Definition Of Done

A feature is done when:

- Mobile hub entry point works (user sees status before acting).
- It has a reachable route or visible UI entry point.
- It writes or reads the intended Firestore collection.
- Firestore rules allow only the authenticated owner to access it.
- Design system tokens used throughout (no hardcoded hex).
- `npm run build` passes.
- Project docs are updated.
