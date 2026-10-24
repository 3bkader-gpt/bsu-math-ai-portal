# BSU Math & AI Portal ΓÇö Behavioral & Gamification Engine Master Roadmap

> **Architectural Philosophy:** 
> - **Pure TypeScript Core:** Zero React/DOM dependencies in core calculations, guaranteeing 100% deterministic testability.
> - **Event-Driven Pub/Sub:** UI and media players only emit factual raw events; the engine autonomously calculates rewards.
> - **Optimistic Local + Server Authoritative:** Instant UI gratification via Zustand & IndexedDB outbox, paired with tamper-proof Cairo-timezone server reconciliation via Supabase RPC.
> - **Zero KaTeX Lag (60fps):** Gamification operates as an isolated island (`<GamificationHost />`); mathematical KaTeX rendering remains completely unaffected by XP animations.
> - **Egyptian Collegiate Soul:** Custom achievement badges, encouraging persona copy, and peer leaderboard tailored to the faculty of science culture.

---

## ≡ƒöÆ Strict Quality Gate & CI/CD Protocol
Every task, feature, and code modification across all 6 phases adhered strictly to the following 5-step loop:
1. **Implementation:** Modular, fully typed TypeScript code adhering strictly to domain boundaries.
2. **Local Validation:** `npm run typecheck` and `npm run build` locally in `frontend/` (0 errors required).
3. **Automated Verification:** 34 Vitest unit tests covering domain core, storage outbox, telemetry, KaTeX caching, and audio effects.
4. **Atomic Conventional Commit & Push:** Semantic commits (`feat:`, `perf:`, `docs:`, `fix:`) pushed to `main`.
5. **Multi-Cloud Production Deployment:** Cloudflare Pages (via Wrangler CLI) + Render Backend (via Render CLI) + Playwright live browser E2E verification.

---

## ≡ƒù║∩╕Å Master Progress Tracker (100% COMPLETE)

- [x] **Phase 0: Baseline Freeze (`v1.0.0-stable`) & CI/CD Quality Gate Setup**
- [x] **Phase 1: Event Bus & Pure Core Engine (Contracts & Testing)**
- [x] **Phase 2: Supabase Architecture, Anonymous Auth & RPC Ingestion**
- [x] **Phase 3: State Management, IndexedDB Outbox & Gamification Host**
- [x] **Phase 4: Telemetry Detectors & Content Modalities Integration**
- [x] **Phase 5: KaTeX Performance Optimization & Zero-Lag Guard**
- [x] **Phase 6: Audio Sprite, Micro-Interactions, Badges & Cohort Leaderboard**

---

## ≡ƒôû Detailed Implementation Journey & Technical Narrative

### ≡ƒö╖ Phase 0: Baseline Freeze & CI/CD Quality Gate
> **Goal:** Freeze the stable foundation of the portal, lock existing academic functionality, and install automated CI/CD checks before adding any gamification code.

- **Accomplishments & Narrative:**
  - Tagged the golden baseline `v1.0.0-stable` on git to allow instant rollback if necessary.
  - Authored `.github/workflows/ci.yml` with dual verification pipelines:
    - **Frontend:** Node.js 20 typecheck (`tsc --noEmit`), Vitest suite (`npm test`), and production Next.js build (`next build`).
    - **Backend:** Python 3.12 syntax and compilation check (`python -m compileall`).
  - Authored `scripts/deploy_and_verify.py` as a unified multi-cloud orchestrator leveraging Wrangler CLI and Render CLI alongside Playwright live testing.

---

### ≡ƒö╖ Phase 1: Event Bus & Pure Core Engine
> **Goal:** Create a single source of truth for events, game rules, and domain mathematics without touching React or network layers.

- **Accomplishments & Narrative:**
  - **Shared Events Contract (`src/shared/events/types.ts`):** Defined strongly typed domain event interfaces for `AppEvent` (`media.progress`, `media.completed`, `quiz.finished`, `flashcard.flipped`, `study_guide.read`, `lecture.completed`) and `GamificationEffect` (`xp.gained`, `level.up`, `streak.updated`, `badge.unlocked`, `confetti.trigger`, `sound.play`).
  - **Buffered Event Bus (`src/shared/events/bus.ts`):** Built a zero-dependency, ultra-lightweight publish-subscribe bus with an event buffering queue so early media player events are preserved and replayed once gamification listeners mount.
  - **Egyptian Gamification Rules (`src/config/gamification-rules.ts`):** Configured XP award curves, level progression milestone thresholds (`floor(0.1 * sqrt(totalXp)) + 1`), and authentic Egyptian badges:
    - *"╪»╪¡┘è╪¡ ╪º┘ä╪»┘ü╪╣╪⌐"* (First lecture 5/5 completed).
    - *"╪│┘ç╪▒╪º┘å ┘à╪╣ ┘ü┘è╪▒┘à╪º"* (Completed Number Theory lecture after 10 PM).
    - *"┘ê╪¡╪┤ ╪º┘ä╪º╪│╪¬╪º╪¬┘è┘â╪º"* (Perfect score on Statics quiz).
    - *"┘à╪¡╪º╪▒╪¿ ╪º┘ä╪┤┘ä┘ä"* (Maintained a 3-day active streak).
    - *"╪«╪¬┘à ╪º┘ä┘à┘å┘ç╪¼"* (Finished an entire subject).
  - **Pure Core Engine (`src/modules/gamification/core/`):**
    - `xp.ts`: Pure XP addition and level threshold calculation.
    - `streak.ts`: Deterministic streak state progression with Cairo timezone date normalization.
    - `achievements.ts`: Criteria evaluation against incoming events.
    - `reducer.ts`: Pure root reducer `processEvent(currentState, event) => { nextState, effects[] }`.
  - **Test Verification:** 11 Vitest tests in `tests/gamification/core.test.ts` validating mathematical invariants with 0 DOM dependencies.

---

### ≡ƒö╖ Phase 2: Supabase Architecture, Anonymous Auth & RPC Ingestion
> **Goal:** Establish a secure, tamper-proof, Cairo-timezone-aligned backend database infrastructure with atomic batch ingestion.

- **Accomplishments & Narrative:**
  - **Anonymous Authentication (`src/modules/gamification/supabase/auth.ts`):** Configured `getOrCreateAnonymousSession()` to guarantee an authenticated `auth.uid()` from the first interaction without friction or mandatory signup.
  - **Database Schema Migration (`supabase/migrations/20261019_phase2_gamification_schema.sql`):** Deployed 5 core tables with foreign keys and indexes:
    - `public.profiles`: Stores student persona, total XP, current level, Cairo streak, freeze tokens, and nickname.
    - `public.activity_events`: Raw audit trail with unique UUIDs.
    - `public.daily_activity`: Rollup daily stats partitioned by `(user_id, day)`.
    - `public.user_achievements`: Records unlocked badge timestamps.
    - `public.lecture_progress`: Progress tracking per lecture.
  - **Idempotent PostgreSQL RPC (`ingest_events(p_events jsonb)`):** A `SECURITY DEFINER` stored procedure that ingests batches idempotently (`ON CONFLICT (id) DO NOTHING`), computes streak updates strictly in `Africa/Cairo` timezone (`(now() at time zone 'Africa/Cairo')::date`), and returns reconciled profile balances atomically.
  - **Row Level Security (RLS):** Restricted mutations exclusively to the RPC function; protected private records while exposing a public sanitized leaderboard query.
  - **Verification:** Authored `scripts/verify_gamification_rpc.js` to simulate anonymous auth and verify database ingestion.

---

### ≡ƒö╖ Phase 3: State Management, IndexedDB Outbox & Gamification Host
> **Goal:** Deliver instant optimistic UI updates paired with resilient, offline-capable asynchronous synchronization.

- **Accomplishments & Narrative:**
  - **IndexedDB Storage Engine (`src/modules/gamification/sync/idb.ts`):** Integrated `idb-keyval` for persistent outbox event storage, completely bypassing main-thread LocalStorage bottlenecks and 5MB storage limitations.
  - **Zustand Store (`src/modules/gamification/store/useGamificationStore.ts`):** Constructed client state with `skipHydration: true` to prevent SSR mismatches, exposing granular atomic hooks (`useTotalXp()`, `useLevel()`, `useStreak()`, `useBadges()`, `usePendingCount()`, `useIsSyncing()`).
  - **Outbox Synchronization Engine (`src/modules/gamification/sync/outbox.ts`):** Flushes event batches periodically (every 20s) and drains pending events upon page unload using `navigator.sendBeacon` for zero data loss.
  - **Gamification Host Island (`src/modules/gamification/ui/GamificationHost.tsx`):** Mounted in `src/app/layout.tsx` to handle background sync, toast notifications, sound dispatch, and confetti without triggering layout re-renders.
  - **Student Gamification Pill (`src/components/gamification/StudentGamificationPill.tsx`):** Sleek floating navbar pill and modal drawer presenting live XP, streak flame, level progress bar, and sync status.

---

### ≡ƒö╖ Phase 4: Telemetry Detectors & Content Modalities Integration
> **Goal:** Connect streaming players and interactive content to the event bus without coupling lecture views with gamification logic.

- **Accomplishments & Narrative:**
  - **Telemetry Collector (`src/modules/telemetry/collector.ts`):** Central entry point receiving raw signals, normalizing timestamps, and deduplicating events.
  - **Streaming Media Progress Detector (`src/modules/telemetry/detectors/mediaDetector.ts`):**
    - Throttles continuous `timeupdate` signals to emit `media.progress` strictly once every 5 seconds.
    - Built-in **Anti-Scrubbing Guard:** Employs a rolling time window to verify active listening and discard fraudulent slider skipping.
    - Automatically emits `audio.streak_5min` and `media.completed` milestones.
  - **Active Recall Quiz Detector (`src/modules/telemetry/detectors/quizDetector.ts`):** Monitors quiz completions, computes score ratios, and fires `quiz.perfect_score` on 100% results.
  - **Flashcards & Study Guide Detectors (`flashcardDetector.ts`, `studyGuideDetector.ts`):** Tracks card flips, speed runs, and dwell inspection time on mathematical formulas.
  - **Component Wiring:** Connected directly into `AudioPlayer`, `VideoPlayer`, `QuizViewer`, `FlashcardsViewer`, and `StudyGuideViewer` across all 29 curriculum lectures.

---

### ≡ƒö╖ Phase 5: KaTeX Performance Optimization & Zero-Lag Guard
> **Goal:** Guarantee 60fps rendering performance by isolating complex KaTeX mathematical formulas from gamification animations.

- **Accomplishments & Narrative:**
  - **In-Memory KaTeX Render Cache (`src/lib/katexRenderCache.ts`):**
    - Implemented a high-speed memory cache keyed by formula string and display mode (`formula:displayMode`).
    - Skips repeated expensive KaTeX AST parsing and LaTeX tokenization on re-renders, yielding instantaneous (<0.1ms) lookups.
  - **Memoized KaTeX Math Component (`src/components/common/MathRenderer.tsx`):** Wrapped with `React.memo` using strict string equality comparison to ensure zero DOM re-evaluations during gamification state changes.
  - **Component Isolation:** Validated that `StudyGuideViewer` and `FlashcardsViewer` contain 0 gamification state subscriptions.
  - **Benchmark Verification:** 5 Vitest tests in `tests/gamification/katex_performance.test.ts` verifying rendering speedup (>50x faster) and zero DOM leaks.

---

### ≡ƒö╖ Phase 6: Audio Sprite, Micro-Interactions, Badges & Cohort Leaderboard
> **Goal:** Infuse the platform with collegiate delight, dopamine reward loops, and healthy peer momentum.

- **Accomplishments & Narrative:**
  - **Zero-Dependency Procedural Web Audio Engine (`src/lib/audio/soundEngine.ts`):**
    - Built a native Web Audio API synthesizer that procedurally crafts dopamine chimes on demand with 0 bytes downloaded:
      - `xp_chime`: Ascending crystalline double-tone (C6 Γ₧ö E6).
      - `quiz_correct`: Bright bell chime (A5 Γ₧ö A6).
      - `level_up`: Glorious triumphant collegiate fanfare arpeggio (C5 Γ₧ö E5 Γ₧ö G5 Γ₧ö C6 Γ₧ö E6).
      - `badge_unlock`: Sparkling achievement chord burst.
      - `streak_fire`: Warm rising fire resonance with lowpass filter modulation.
    - Persistent sound mute toggle (`localStorage.getItem('bsu_portal_audio_muted')`) with immediate responsive toggle button in the modal header.
  - **GPU-Composited Canvas Confetti (`src/lib/effects/confetti.ts`):** Lightweight confetti explosion engine rendered entirely on an isolated 2D canvas with self-cleaning lifecycle and Egyptian collegiate palette.
  - **Interactive Badges Shelf & Modal Drawer:** Interactive badges showcase in `StudentGamificationPill` highlighting unlocked vs locked achievements with criteria and unlock badges.
  - **Anonymous Cohort Leaderboard:** Live query view ranking the top students by XP and level while preserving student privacy through avatars and honorific nicknames.

---

## ≡ƒôè Quality Gate & Production Audit Matrix

| Metric / Check | Target | Achieved Result | Status |
| :--- | :--- | :--- | :---: |
| **Vitest Unit Test Pass Rate** | 100% | **34 / 34 Tests Passed (5 Suites)** | Γ£à PASS |
| **TypeScript Typecheck** | 0 Errors | **0 Errors (`tsc --noEmit`)** | Γ£à PASS |
| **Next.js Turbopack Production Build** | Clean Build | **Static Export in 232ms** | Γ£à PASS |
| **Cloudflare Pages Production Deploy** | Live Deployment | **Deployment `4648c031` (Commit `6f9ba16`)** | Γ£à LIVE |
| **Render Python Backend Deploy** | Healthy Online | **Deploy `dep-dbb5jqvavr4c73e42400`** | Γ£à LIVE |
| **Playwright Live Browser Test** | Gamification Active | **Bus, Reducer, Badges & Host Verified** | Γ£à PASS |
| **Zero-Regression E2E Live Tests** | 5 / 5 Endpoints | **5 / 5 Passed (Pages, Render, Storage CDN)** | Γ£à PASS |

---

## ≡ƒîÉ Live Production Verification Endpoints

- **Frontend Portal (Cloudflare Pages):** [https://bsu-math-ai-portal.pages.dev](https://bsu-math-ai-portal.pages.dev)
- **Lecture View (Live Gamification):** [https://bsu-math-ai-portal.pages.dev/lecture?id=28](https://bsu-math-ai-portal.pages.dev/lecture?id=28)
- **Backend API (Render):** [https://bsu-math-api.onrender.com](https://bsu-math-api.onrender.com)
- **Supabase Cloud Database:** `https://cjmlnpdtfclzcvehebsv.supabase.co`
