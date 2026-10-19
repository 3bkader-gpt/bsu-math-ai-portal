# Phase 3 Execution Plan: State Management, IndexedDB Outbox & Gamification Host

> **Architecture Standard:** 
> - Optimistic UI + Server Authoritative: Instant local gratification (0ms latency) calculated via pure core reducer, followed by reliable background synchronization.
> - Asynchronous IndexedDB Outbox: High-capacity, non-blocking queue preventing main-thread lag and LocalStorage 5MB quota exhaustion.
> - Zero Data Loss: Flushes on `visibilitychange: hidden` and `pagehide` using `navigator.sendBeacon` fallback.
> - Isolated Island Architecture: Gamification runs in an isolated `<GamificationHost />` component; math formulas and KaTeX layouts never re-render when XP updates.

---

## 🎯 Phase 3 Objectives

1. **IndexedDB Outbox Queue (`src/modules/gamification/sync/idb.ts`):** Robust async storage using `idb-keyval` for queueing events across sessions and offline states.
2. **Atomic Zustand Store (`src/modules/gamification/store/useGamificationStore.ts`):** Fast reactive store with optimistic local dispatching, fine-grained selectors, and SSR hydration guards.
3. **Background Synchronizer (`src/modules/gamification/sync/outbox.ts`):** Autonomous queue drainer with periodic batch flushing (15-30s), exponential backoff, and tab close protection.
4. **Isolated Host Island (`src/modules/gamification/ui/GamificationHost.tsx`):** Root client component that handles synchronization lifecycles and listens to `effectBus` without leaking re-renders to the document tree.
5. **Automated Verification:** Comprehensive Vitest tests (`frontend/tests/gamification/store_and_outbox.test.ts`) and live Playwright production Quality Gate verification.

---

## 📋 Granular Subtasks

### Subtask 3.1: IndexedDB Outbox Engine (`src/modules/gamification/sync/idb.ts`)
- [x] Implement `idb.ts` with `idb-keyval`:
  - `enqueueOutboxEvent(event)`: Appends an event to the persistent queue.
  - `getOutboxEvents(limit)`: Retrieves pending events for batch sync.
  - `removeOutboxEvents(ids)`: Removes successfully ingested event IDs.
  - `getOutboxCount()`: Returns count of pending unsynced events.
  - `clearOutbox()`: Empties the queue (for testing/reset).

### Subtask 3.2: Reactive Zustand Gamification Store (`src/modules/gamification/store/useGamificationStore.ts`)
- [x] Define `GamificationStoreState`:
  - `totalXp`, `level`, `currentStreak`, `longestStreak`, `lastActiveDate`, `freezesLeft`, `unlockedBadges`, `pendingCount`, `dailyXpEarned`, `isSyncing`.
- [x] Implement actions:
  - `dispatchAppEvent(event)`: Evaluates event with pure reducer, updates state optimistically, enqueues to IndexedDB, and emits effects on `effectBus`.
  - `reconcileWithServer(profile)`: Reconciles local state with authoritative server profile.
  - `hydrateStore()`: Restores state from local cache and triggers anonymous session bootstrap.
- [x] Export fine-grained atomic selectors (`useTotalXp`, `useLevel`, `useStreak`, `useBadges`, `usePendingCount`).

### Subtask 3.3: Autonomous Outbox Synchronizer (`src/modules/gamification/sync/outbox.ts`)
- [x] Implement `OutboxSyncService`:
  - Periodic background flush (every 20 seconds).
  - Online/offline event listener (`window.addEventListener('online', ...)`).
  - Drain queue using `ingestEventsRpc(events)` from Phase 2.
  - Reconcile returned server profile with Zustand store.
  - Drain on `visibilitychange: hidden` for tab-close durability.

### Subtask 3.4: Isolated Gamification Host (`src/modules/gamification/ui/GamificationHost.tsx`)
- [x] Create `<GamificationHost />` client component:
  - Mounts in `src/app/layout.tsx`.
  - Initializes anonymous auth session and outbox sync in non-blocking `requestIdleCallback`.
  - Subscribes to `effectBus` for imperative toast/modal/audio triggers.
  - Exposes debug probe `window.__GAMIFICATION_HOST__` for automated post-deploy validation.

### Subtask 3.5: Unit Test Suite & Automated Quality Gate
- [x] Write Vitest test suite `frontend/tests/gamification/store_and_outbox.test.ts`:
  - Test store optimistic dispatching.
  - Test outbox queue operations.
  - Test server reconciliation logic.
- [x] Execute 5-step Quality Gate:
  - Local checks: `npm run typecheck`, `npm test`, `npm run build`.
  - Conventional commit & push to `main`.
  - Deploy via Wrangler CLI (Cloudflare Pages) & verify Render Backend (Render CLI).
  - Playwright live in-browser verification on `https://bsu-math-ai-portal.pages.dev`.
  - Zero-regression E2E tests (5/5).
