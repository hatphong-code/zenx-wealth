# Phase 1 Handoff Document (2026-06-21)

**Status:** Ready to start Phase 1 (Gesture Navigation, Offline-first, Push Notifications)

---

## ✅ What's Complete

### v3.0 Architecture Refactor (Sprints 1-6)
- ✅ Services own all Firestore writes (zero direct Firebase in pages)
- ✅ Cache coordinator centralizes invalidation
- ✅ Storage adapter (sessionStorage → RN AsyncStorage ready)
- ✅ Folder structure: `src/core/` (portable) + `src/web/` (web-only)
- ✅ Hook factory eliminates boilerplate (10 data hooks)
- ✅ Service-level i18n via `getTranslation()`

### Mobile UX Fixes (Issues 1 & 2)
- ✅ ConfirmDialog component (replaces window.confirm)
- ✅ NumericInput component (adds inputMode="decimal")
- ✅ Applied to 6 delete operations + 12+ numeric inputs

### Current Commit
```
8cd74f9 feat: implement Issues 1 & 2 mobile UX fixes (ConfirmDialog + NumericInput)
```

**Production URL:** https://wealth.zenx.asia (v3.0 deployed)

---

## 📋 Phase 1 Scope (Gesture Navigation, Offline-first, Push Notifications)

### 1. Gesture Navigation (Mobile UX)
**Files to create/modify:**
- `src/web/components/GestureDetector.jsx` — wrapper component
- `src/web/pages/*.jsx` — add swipe handlers to page-level components
- `src/web/components/AppShell.jsx` — integrate gesture navigation with routing

**Expected UX:**
- Swipe left/right to navigate between Hub pages (Dashboard ↔ TrackHub ↔ PlanHub ↔ ReviewHub)
- Swipe back from sub-page to Hub
- Visual hint (slide animation during swipe)
- Desktop: ignore swipe (no change)

**Technical:**
- Use `react-use-gesture` or build with Pointer events
- Integrate with React Router (programmatic navigation)
- Track swipe direction + distance
- Debounce rapid swipes

---

### 2. Offline-first Sync
**Files to create/modify:**
- `src/core/services/syncQueue.js` — queue Firestore writes when offline
- `src/core/services/storageAdapter.js` — already exists, use for queue persistence
- `src/web/components/SyncStatus.jsx` — visual indicator (online/offline/syncing)
- Update all services to retry via queue

**Expected UX:**
- User makes edits while offline → queued locally
- "Offline" badge shows in header/topbar
- When online: auto-sync, badge disappears
- If sync fails: "Sync error" badge + retry button

**Technical:**
- Store write operations in sessionStorage/AsyncStorage
- Poll navigator.onLine
- Retry on connection restored
- Deduplicate writes (same resource, last write wins)

---

### 3. Push Notifications
**Files to create/modify:**
- `src/core/services/pushNotificationService.js` — Firebase Cloud Messaging
- `src/web/pages/Settings.jsx` — notification preference toggle
- `src/web/components/PushPrompt.jsx` — browser permission dialog
- `src/core/utils/notificationHandlers.js` — handle incoming notifications

**Expected UX:**
- On first visit: prompt user to enable notifications
- Settings page: toggle notifications on/off
- Notifications for: transaction added, goal milestone, weekly summary
- Click notification → navigate to relevant page

**Technical:**
- Firebase Cloud Messaging (FCM) + Workbox integration
- Request Notification API permission
- Store FCM token in Firestore (users/{userId}/fcmTokens)
- Backend (Cloud Function) sends notifications via FCM

---

## 🗂️ Project Structure (Current)

```
src/
  core/                 ← Portable (web + RN)
    /services/          ← All Firestore ops, cache, i18n
    /hooks/             ← Data hooks (factory-based)
    /utils/             ← Formatters, validators
    /i18n/              ← i18n system + dictionaries
    /auth/              ← Auth services
    /data/              ← Access control, feature gates
  
  web/                  ← Web-specific (React + Tailwind)
    /components/
      /ui/              ← Button, Card, Input, Toast, ConfirmDialog, NumericInput
      AppShell.jsx      ← Main layout
      UserSettingsSync.jsx
    /pages/             ← All page components (30+)
    App.jsx             ← Route definitions
    index.css           ← Tailwind + design tokens
    main.jsx            ← Vite entry
```

---

## 📖 Key Files to Know for Phase 1

**Architecture / Services:**
- `src/core/services/transactionService.js` — write operations pattern
- `src/core/services/cacheCoordinator.js` — cache invalidation pattern
- `src/core/services/storageAdapter.js` — pluggable storage (use for offline queue)
- `src/core/i18n/getTranslation.js` — service-level i18n

**UI / Components:**
- `src/web/components/AppShell.jsx` — navigation shell, contains sidebar + topbar
- `src/web/components/ConfirmDialog.jsx` — new! dialog pattern (reuse for other modals)
- `src/web/components/ui/NumericInput.jsx` — new! numeric input pattern
- `src/web/components/AppNav.jsx` — bottom tabs (mobile) + sidebar (desktop)

**Design System:**
- `ZenXWealthUI/tokens/colors.css` — all color tokens
- `ZenXWealthUI/readme.md` — design system rules
- `src/web/index.css` — Tailwind extended with `zx-*` utilities

---

## 🛠️ Tech Stack (Phase 1 additions)

**Gesture Navigation:**
- `react-use-gesture` OR native Pointer events

**Offline Sync:**
- Navigator.onLine API (built-in)
- Existing sessionStorage / storageAdapter

**Push Notifications:**
- Firebase Cloud Messaging (FCM)
- Workbox (already in PWA setup)
- Notification API (built-in)

---

## 📝 CLAUDE.md & Docs Status

**Updated for v3.0:**
- ✅ CLAUDE.md → Folder architecture, services, storage adapter
- ✅ DEVELOPMENT_WORKFLOW.md → Code conventions (core/web boundary)
- ✅ PROJECT_STATUS.md → v3.0 features, Sprints 1-6
- ✅ IMPLEMENTATION_LOG.md → Session log (v3.0 complete)

**For Phase 1:**
- Add sections to CLAUDE.md for gesture/offline/push patterns (optional, can add as you go)
- Update IMPLEMENTATION_LOG.md with Phase 1 progress per session

---

## 🚀 Next Steps (Phase 1 Session)

1. **Decide priority order:** Gesture navigation? Offline-first? Push notifications?
   - Recommend: **Gesture first** (straightforward, high UX impact) → Offline (complex but critical) → Push (backend dependency)

2. **Set up Phase 1 tracking:**
   - Create subtasks in `IMPLEMENTATION_LOG.md` or project issue tracker

3. **Start with Gesture Navigation:**
   - Research library choice (react-use-gesture vs Pointer events)
   - Create `GestureDetector.jsx` wrapper
   - Integrate with AppShell routing

---

## 📞 Context Summary for Next Session

**Current branch:** `claude/desktop-ui-ux-analysis-m70gtr`  
**Build status:** ✅ `npm run build` passes  
**Production:** ✅ Deployed to https://wealth.zenx.asia  
**Git commits:** 8cd74f9 (latest)  

**Latest architecture:**
- Zero Firestore imports in `src/web/pages/` ✅
- All services abstracted in `src/core/services/` ✅
- Storage adapter pluggable (ready for RN) ✅
- Mobile UX: ConfirmDialog + NumericInput ✅

---

## ⚠️ Known Issues (Not in Scope for Phase 1)

From `zenx-wealth-mobile-ux-fix-spec.md`:
- **Issue 3:** monthLabel i18n (low priority, already noted in spec)
- **Issue 4:** rounded-lg remnants (design token cleanup, low priority)
- **Issue 5:** Dashboard StatTile arrow opacity (already partially fixed)
- **Issue 6:** formatDate() hardcoded vi-VN (future i18n task)

These can be addressed later — not blocking Phase 1.

---

## 📊 Metrics

| Metric | Value |
|--------|-------|
| Files in `src/core/` | ~35 (portable, RN-ready) |
| Files in `src/web/` | ~50 (web-specific) |
| Data hooks refactored | 10 (via factory) |
| Boilerplate eliminated | ~550 lines |
| Service layer write methods | 8+ |
| i18n keys | 1000+ (VI + EN) |
| Design tokens | 20+ (colors, typography, spacing) |

---

**Ready for Phase 1.** No blockers. Good luck! 🚀
