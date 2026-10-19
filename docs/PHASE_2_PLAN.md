# Phase 2 Execution Plan: Supabase Architecture, Anonymous Auth & RPC Ingestion

> **Architecture Standard:** 
> - Server Authoritative: All state transitions (XP, streaks, levels, badges) are calculated and reconciled inside atomic PostgreSQL stored procedures.
> - Strict Cairo Timezone: All day boundaries and streaks are calculated as `(now() AT TIME ZONE 'Africa/Cairo')::date`.
> - Tamper-Proof & Idempotent: Client sends client-generated UUIDs; RPC executes `ON CONFLICT (id) DO NOTHING` ensuring zero duplicate XP on replays/retries.
> - Zero-Friction Anonymous Auth: Seamless `auth.signInAnonymously()` gives every student a valid `auth.uid()` immediately with RLS protection, upgradable later to email.

---

## 🎯 Phase 2 Objectives

1. **Anonymous Auth Integration (`frontend/src/lib/supabase/auth.ts`):** Ensure persistent anonymous authentication with session caching and auto-fallback.
2. **Database Schema Migration (`supabase/migrations/20261019_phase2_gamification_schema.sql`):** Five relational tables (`profiles`, `activity_events`, `daily_activity`, `user_achievements`, `lecture_progress`) with strict constraints and foreign keys to `auth.users`.
3. **Atomic Idempotent Ingestion RPC (`public.ingest_events(events jsonb)`):** Stored procedure executing in a single database transaction with Africa/Cairo date boundaries and streak evaluation.
4. **Row Level Security (RLS) Policies:** Strict tenant isolation (`auth.uid() = user_id`) and public read views for cohort leaderboards.
5. **Frontend RPC Bridge (`frontend/src/lib/supabase/gamification.ts`):** Typed client methods to sync batches of events to the backend.
6. **Automated Verification Suite:** 
   - Python & Node end-to-end verification script testing table creation, anonymous auth, RPC idempotency, streak calculations, and RLS enforcement.
   - Quality Gate: `npm run typecheck`, `npm test`, `npm run build`, Wrangler CLI deploy, Render CLI check, and live Playwright verification.

---

## 📋 Granular Subtasks

### Subtask 2.1: Supabase Anonymous Authentication & Client Bridge
- [x] Create `frontend/src/modules/gamification/supabase/client.ts` with browser-safe Supabase client initialization.
- [x] Create `frontend/src/modules/gamification/supabase/auth.ts`:
  - `getOrCreateAnonymousSession()`: checks existing session, signs in anonymously if needed, and returns active user.
  - Persona & profile sync helper.
- [x] Verify Supabase anonymous sign-in capability.

### Subtask 2.2: Relational Schema & Indexes Migration
- [x] Write SQL migration file `supabase/migrations/20261019_phase2_gamification_schema.sql`:
  - `public.profiles`: stores user level, XP, Cairo streak, freeze tokens, and student persona.
  - `public.activity_events`: immutable audit log of raw client events keyed by client UUID.
  - `public.daily_activity`: composite PK `(user_id, day)` tracking daily XP against the daily cap.
  - `public.user_achievements`: composite PK `(user_id, achievement_id)` recording unlocked Egyptian badges.
  - `public.lecture_progress`: composite PK `(user_id, lecture_id)` recording media progress and quiz scores.
  - Create performance indexes on `(user_id, server_ts DESC)` and `(user_id, event_type)`.

### Subtask 2.3: Atomic Ingestion Stored Procedure (`ingest_events`)
- [x] Implement `public.ingest_events(events jsonb)` in PL/pgSQL:
  - Security Definer with `search_path = public, auth`.
  - Validate caller `auth.uid()`.
  - Calculate `cairo_now` and `cairo_today` strictly in `'Africa/Cairo'`.
  - Deduplicate events via `INSERT INTO activity_events ... ON CONFLICT (id) DO NOTHING`.
  - Calculate effective XP (respecting daily cap from `daily_activity`).
  - Calculate streak preservation and incrementation.
  - Unlock eligible achievements automatically.
  - Update `public.profiles` atomically.
  - Return reconciled state: `{ success, profile: { total_xp, level, current_streak, longest_streak, freezes_left }, new_badges }`.

### Subtask 2.4: Row Level Security (RLS) & Leaderboard View
- [x] Enable RLS on all five tables.
- [x] Create policies:
  - Read access restricted to `auth.uid() = user_id` (or `auth.uid() = id`).
  - Direct INSERT/UPDATE blocked from client (all mutations routed through `ingest_events`).
- [x] Create sanitized cohort leaderboard RPC or view:
  - `get_cohort_leaderboard(limit_count int)` returning only public sanitized fields (`id, nickname, persona, total_xp, level, current_streak`).

### Subtask 2.5: Automated Verification & Live Quality Gate
- [x] Apply migration directly to Supabase PostgreSQL database.
- [x] Write and run `scripts/verify_gamification_rpc.py`:
  - Test anonymous auth session creation.
  - Test batch event ingestion.
  - Test idempotency (replay exact same batch -> zero extra XP).
  - Test streak calculation logic under Cairo date boundaries.
  - Test RLS security enforcement.
- [x] Execute Quality Gate:
  - `npm run typecheck` & `npm test` & `npm run build` locally in `frontend/`.
  - Conventional commit & push to `main`.
  - Multi-cloud deploy via Wrangler CLI & Render CLI.
  - Post-deploy live browser verification on production.
