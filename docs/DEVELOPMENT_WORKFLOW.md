# Development Workflow

## Working Principle

Keep the MVP aligned with the product roadmap, but implement in thin usable slices. Each slice should leave the app runnable and should update this documentation when project direction or implementation status changes.

## Standard Loop

1. Read the related roadmap section.
2. Implement the smallest complete user workflow.
3. Run `npm run build`.
4. Update `docs/PROJECT_STATUS.md` when state changes.
5. Add an entry to `docs/IMPLEMENTATION_LOG.md`.

## Code Conventions

- Keep user data under `users/{userId}` in Firestore.
- Prefer route-level pages in `src/pages`.
- Keep shared UI in `src/components`.
- Move repeated Firestore logic into `src/services` when a workflow has more than one caller.
- Store money values as numbers and persist the transaction currency.
- Aggregate financial totals only within the active profile currency until FX conversion exists.
- Display money through `src/utils/formatters.js`; do not call `toLocaleString()` directly in UI.
- Store dates as Firestore `Timestamp`.
- Keep Firebase web config in Vite env vars.

## MVP Priority

Current priority order:

1. Transaction tracker
2. Dashboard correctness
3. Latte Factor engine
4. Emergency Fund screen
5. Weekly Review screen

## Definition Of Done

A feature is done when:

- It has a reachable route or visible UI entry point.
- It writes or reads the intended Firestore collection.
- Firestore rules allow only the authenticated owner to access it.
- `npm run build` passes.
- Project docs are updated if scope, status, or workflow changed.
