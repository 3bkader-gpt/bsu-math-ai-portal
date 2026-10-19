# BSU Math & AI Portal — Behavioral & Gamification Engine Roadmap

> **Architectural Philosophy:** 
> - **Pure TypeScript Core:** Zero React/DOM dependencies in calculations.
> - **Event-Driven:** UI/Players only emit factual raw events; engine decides rewards.
> - **Optimistic Local + Server Authoritative:** Instant UI gratification, tamper-proof Cairo-timezone server reconciliation via Supabase RPC.
> - **Zero KaTeX Lag:** Gamification runs as an isolated island (`<GamificationHost />`); math formulas remain untouched by state changes.

---

## 🔒 Strict Quality Gate & CI/CD Protocol
Every task, feature, or code modification in this roadmap must adhere strictly to the following 5-step loop:
1. **Implement Feature/Fix:** Write modular, typed code adhering strictly to the phase checklist.
2. **Local Validation:** Run `npm run typecheck` and `npm run build` locally in `frontend/` (0 errors required).
3. **Verification Test:** Verify functionality and edge cases with automated tests or scripts.
4. **Atomic Conventional Commit & Push:** Commit with clear semantic prefix (`feat:`, `fix:`, `refactor:`) and push to `main`.
5. **CI Gate & Auto-Deploy:** GitHub Actions CI (`.github/workflows/ci.yml`) validates the build on Ubuntu; Cloudflare Pages deploys to production. Check off the completed subtask in this document.

---

## 🗺️ Master Progress Tracker

- [x] **Phase 0: Baseline Freeze (`v1.0.0-stable`) & CI/CD Quality Gate Setup**
- [x] **Phase 1: Event Bus & Pure Core Engine (Contracts & Testing)**
- [x] **Phase 2: Supabase Architecture, Anonymous Auth & RPC Ingestion**
- [x] **Phase 3: State Management, IndexedDB Outbox & Gamification Host**
- [x] **Phase 4: Telemetry Detectors & Content Modalities Integration**
- [ ] **Phase 5: KaTeX Performance Optimization & Zero-Lag Guard**
- [ ] **Phase 6: Audio Sprite, Micro-Interactions, Badges & Cohort Leaderboard**

---

## Detailed Implementation Breakdown

### 🔷 Phase 1: Event Bus & Pure Core Engine
> **Goal:** Create the single source of truth for events, game rules, and pure domain math without touching React or network calls.

- [x] **1.1 Shared Events Contract (`src/shared/events/types.ts`)**
  - Define `AppEvents` map (`media.progress`, `quiz.finished`, `flashcard.flipped`, `lecture.completed`, `study_guide.read`).
  - Define `EffectEvent` map (`xp.gained`, `level.up`, `streak.updated`, `badge.unlocked`, `confetti.trigger`, `sound.play`).
  - Add standardized event metadata (`eventId: uuid`, `timestamp: number`, `lectureId: number`).

- [x] **1.2 Buffered Event Bus (`src/shared/events/bus.ts`)**
  - Implement a lightweight (~35 LOC) zero-dependency pub/sub bus.
  - Implement **Event Buffering Queue**: If listeners (Gamification Engine) are not yet loaded or initialized, buffer emitted events and flush them once registered.
  - Export singleton `eventBus` and helper `createEventBus<T>()`.

- [x] **1.3 Gamification Rules Configuration (`src/config/gamification-rules.ts`)**
  - Define XP gain table:
    - Audio podcast: +5 XP per 5 min, +25 XP on completion.
    - Video explainer: +10 XP per 5 min, +35 XP on completion.
    - Quiz completion: +10 XP baseline + (score / total) * 40 XP.
    - Perfect Quiz bonus: +25 XP ("عاش يا وحش").
    - Flashcards set mastery: +15 XP.
    - Daily streak bonus: 10 XP * min(streak, 7).
  - Define Level Curves (`level = floor(0.1 * sqrt(total_xp)) + 1` or exponential milestone brackets).
  - Define Badges catalog with Egyptian collegiate flavor:
    - *"دحيح الدفعة"* (First lecture 5/5 completed).
    - *"سهران مع فيرما"* (Completed Number Theory lecture after 10 PM).
    - *"وحش الاستاتيكا"* (Perfect score on Statics quiz).
    - *"محارب الشلل"* (Maintained a 3-day active streak).
    - *"ختم المنهج"* (Finished an entire subject).

- [x] **1.4 Pure Core Logic Engine (`src/modules/gamification/core/`)**
  - `types.ts`: Define domain models (`GamificationState`, `StreakData`, `AchievementRecord`).
  - `xp.ts`: Pure functions for XP addition, level progression calculation, and daily XP cap guards.
  - `streak.ts`: Streak progression calculation, streak preservation, and freeze token mechanics.
  - `achievements.ts`: Check achievement criteria against current state & incoming events.
  - `reducer.ts`: Pure root reducer `processEvent(currentState, event) => { nextState, effects[] }`.

- [x] **1.5 Unit Test Suite (`tests/gamification/core.test.ts`)**
  - Test XP additions & level transitions.
  - Test perfect quiz handling and confetti trigger effect output.
  - Test streak calculation boundary conditions.
  - Verify zero React/DOM imports in `core/`.

---

### 🔷 Phase 2: Supabase Architecture, Anonymous Auth & RPC Ingestion
> **Goal:** Build the secure, tamper-proof, Cairo-timezone-aligned backend database infrastructure.

- [x] **2.1 Supabase Anonymous Authentication Setup**
  - Enable Anonymous Sign-ins in Supabase Project Settings.
  - Configure frontend client helper `getOrCreateAnonymousSession()` to guarantee an authenticated `auth.uid()` with RLS protection from the first millisecond.
  - Prepare `linkIdentity` flow for seamless future conversion to permanent email/account without losing progress.

- [x] **2.2 Database Schema Migration (`supabase/migrations/`)**
  - Create table `public.profiles`:
    - Columns: `id (uuid, FK auth.users)`, `nickname (text)`, `persona ('boys'|'girls')`, `cohort_id (int)`, `total_xp (bigint)`, `level (int)`, `current_streak (int)`, `longest_streak (int)`, `last_active_date (date)`, `freezes_left (int)`.
  - Create table `public.activity_events`:
    - Columns: `id (uuid, PK)`, `user_id (uuid, FK)`, `event_type (text)`, `lecture_id (int)`, `payload (jsonb)`, `client_ts (timestamptz)`, `server_ts (timestamptz default now())`.
    - Index on `(user_id, server_ts desc)`.
  - Create table `public.daily_activity`:
    - Composite PK `(user_id, day date)`.
    - Columns: `xp_earned (int)`, `seconds_active (int)`, `items_completed (int)`.
  - Create table `public.user_achievements`:
    - Composite PK `(user_id, achievement_id text)`.
    - Column: `unlocked_at (timestamptz default now())`.
  - Create table `public.lecture_progress`:
    - Composite PK `(user_id, lecture_id int)`.
    - Columns: `media_progress (jsonb)`, `quiz_completed (bool)`, `updated_at (timestamptz)`.

- [x] **2.3 Idempotent Ingestion RPC (`ingest_events(jsonb)`)**
  - Stored Procedure in PostgreSQL with `SECURITY DEFINER`.
  - Handle idempotency via `ON CONFLICT (id) DO NOTHING` on `activity_events`.
  - Calculate date boundaries strictly in Cairo timezone: `(now() at time zone 'Africa/Cairo')::date`.
  - Update `daily_activity`, recalculate `profiles.current_streak` & `total_xp` in a single atomic transaction.
  - Return reconciled profile values to client for instant verification.

- [x] **2.4 Row Level Security (RLS) Policies**
  - Enforce `auth.uid() = user_id` for reads on all user tables.
  - Prevent direct client `INSERT`/`UPDATE` on `profiles` and `daily_activity` (mutations allowed only through `ingest_events` RPC).
  - Public read-only access for sanitized cohort leaderboard view.

- [x] **2.5 Automated Verification Script**
  - Write and run `scripts/verify_gamification_rpc.js` to simulate anonymous auth and event ingestion.

---

### 🔷 Phase 3: State Management, IndexedDB Outbox & Gamification Host
> **Goal:** Enable optimistic instant UI updates with asynchronous, fault-tolerant offline persistence.

- [x] **3.1 IndexedDB Storage Engine (`src/modules/gamification/sync/idb.ts`)**
  - Integrate lightweight `idb-keyval` for persistent outbox queue (avoiding main-thread blocking and 5MB LocalStorage limits).
  - Outbox structure: array of serialized events with retry counts and timestamps.

- [x] **3.2 Zustand Store (`src/modules/gamification/store/useGamificationStore.ts`)**
  - Define state: `totalXp`, `level`, `currentStreak`, `achievements`, `pendingEventsCount`, `dailyActivity`.
  - Configure `skipHydration: true` to prevent Next.js SSR hydration mismatches.
  - Provide atomic selectors (e.g., `useXP()`, `useStreak()`, `useBadges()`) to guarantee fine-grained reactivity.

- [x] **3.3 Outbox & Batch Synchronization (`src/modules/gamification/sync/outbox.ts`)**
  - Batch event flushing every 15–30 seconds.
  - Drain outbox on `visibilitychange: hidden` using `navigator.sendBeacon` for zero data loss on tab close.
  - Handle network disconnection gracefully (keep events in IndexedDB until online).
  - Reconcile local state with authoritative server response.

- [x] **3.4 Isolated Gamification Island (`src/modules/gamification/ui/GamificationHost.tsx`)**
  - Mount `<GamificationHost />` in `src/app/layout.tsx`.
  - Lazy load the entire gamification module post-hydration via `requestIdleCallback`.
  - Listen to `effectBus` to trigger sounds, toasts, and modals imperatively without causing page re-renders.

---

### 🔷 Phase 4: Telemetry Detectors & Content Modalities Integration
> **Goal:** Connect players and interactive content to the event bus without polluting lecture components with gamification logic.

- [x] **4.1 Telemetry Collector (`src/modules/telemetry/collector.ts`)**
  - Receive raw events from media players, quiz, flashcards.
  - Deduplicate and normalize timestamps before bus emission.

- [x] **4.2 Streaming Progress Detector (`src/modules/telemetry/detectors/mediaDetector.ts`)**
  - Throttle video/audio `timeupdate` to emit `media.progress` only once every 5 seconds.
  - Maintain active listening tracking to identify honest learning vs scrubbing skips.
  - Emit milestone events (`audio.streak_5min`, `lecture.completed`).

- [x] **4.3 Active Recall Quiz Detector (`src/modules/telemetry/detectors/quizDetector.ts`)**
  - Listen to quiz completion.
  - Determine score ratios, first-try bonuses, and perfect streak triggers.

- [x] **4.4 Flashcards & Study Guide Detectors**
  - Track card flips and complete deck traversal.
  - Track dwell time on Study Guide with mathematical formula inspection.

- [x] **4.5 Hooking into Components**
  - Attach telemetry hooks to `AudioPlayer` in `src/app/lecture/page.tsx`.
  - Attach telemetry hooks to `VideoPlayer` in `src/app/lecture/page.tsx`.
  - Attach telemetry hooks to `QuizViewer` and `FlashcardsViewer`.

---

### 🔷 Phase 5: KaTeX Performance Optimization & Zero-Lag Guard
> **Goal:** Guarantee 60fps responsiveness by isolating complex KaTeX mathematical formulas from gamification animations.

- [ ] **5.1 KaTeX Server-Side Rendering (`renderToString`) Architecture**
  - Verify that KaTeX math renders to pure HTML strings without React state attachments.
  - Prevent re-parsing formulas during XP gains or streak increments.

- [ ] **5.2 Micro-Interaction Component Isolation**
  - Use HTML CSS variables for audio/video progress bars instead of React `useState` re-renders.
  - Ensure floating XP indicators render in isolated portals (`ReactDOM.createPortal`).

- [ ] **5.3 Motion Optimization**
  - Use `LazyMotion` + `domAnimation` from Framer Motion.
  - Animate strictly on GPU-accelerated properties (`transform`, `opacity`).
  - Respect `prefers-reduced-motion` browser settings.

---

### 🔷 Phase 6: Audio Sprite, Micro-Interactions, Badges & Cohort Leaderboard
> **Goal:** Infuse the platform with collegiate delight, dopamine reward loops, and healthy peer momentum.

- [ ] **6.1 Audio Sprite Engine (`src/lib/audio-engine/`)**
  - Single lightweight audio sprite (~30KB MP3/AAC) with micro-sounds:
    - *Success Ding* (Correct quiz answer / Flashcard flip).
    - *XP Chime* (Gaining points).
    - *Level Up Horn* (Reaching new tier).
    - *Streak Flame* (Continuing daily streak).
  - Lazy load Web Audio context upon first student interaction (gesture-safe).
  - Respect student mute preference (`localStorage.getItem('bsu_portal_mute')`).

- [ ] **6.2 High-Performance Particle Engine**
  - OffscreenCanvas / WebWorker backed Confetti (`canvas-confetti` with `useWorker: true`).
  - Custom celebration bursts on 100% quiz scores and milestone lectures.

- [ ] **6.3 Visual Gamification UI Components**
  - `<XPBar />`: Sleek header progress indicator showing distance to next level.
  - `<StreakBadge />`: Fire flame counter with Egyptian persona encouraging copy ("3 أيام ورا بعض يا وحش").
  - `<LevelUpModal />`: Exciting collegiate celebration modal upon leveling up.
  - `<BadgeDrawer />`: Shelf displaying unlocked vs locked badges.

- [ ] **6.4 Anonymous Cohort Leaderboard**
  - High-performance cached SQL view: Top students of the week (Nickname + Level + XP).
  - Zero sensitive data exposure; privacy-first student nicknames ("باشمهندس مجهول", "عاشق الجبر").

- [ ] **6.5 End-to-End Stress Test & Cloudflare Deployment**
  - Verify Lighthouse score > 95 on mobile with active gamification.
  - Validate zero hydration mismatches in Next.js Turbopack build.
  - Deploy to production on Cloudflare Pages.
