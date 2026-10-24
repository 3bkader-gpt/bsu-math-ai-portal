# 🗄️ DATABASE.md — Complete Database Reference
> Source of truth for all Supabase tables, RPCs, views, and policies.
> Last Updated: 2026-10-21 | Supabase Project: `cjmlnpdtfclzcvehebsv` (eu-central-1)

---

## Security Model

- **RLS:** Every table has Row Level Security enabled.
- **Client access:** `anon` key — READ own rows only via SELECT policies.
- **All writes:** Exclusively through `SECURITY DEFINER` RPCs running as `postgres`.
- **Service role key:** Backend only (`app/db/supabase.py`). Never in frontend.

---

## Tables

### `public.profiles`
Core student identity, XP, and streak.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | UUID PK | — | References `auth.users(id)` |
| `nickname` | TEXT | `'عاشق الرياضيات'` | Student display name |
| `persona` | TEXT | `'boys'` | `'boys'` or `'girls'` (affects praise bank) |
| `cohort_id` | INT | `1` | Future: multi-cohort support |
| `total_xp` | BIGINT | `0` | Cumulative XP (≥ 0) |
| `level` | INT | `1` | Computed: `floor(sqrt(total_xp / 60)) + 1` |
| `current_streak` | INT | `0` | Consecutive active days (Cairo TZ) |
| `longest_streak` | INT | `0` | All-time best streak |
| `last_active_date` | DATE | NULL | Last Cairo date with earned XP |
| `freezes_left` | INT | `1` | Streak freeze tokens available |
| `last_active_lecture_id` | INT | NULL | → `lectures(id)` (added by resume migration) |
| `last_active_tab` | TEXT | `'guide'` | Last tab in lecture view |
| `created_at` | TIMESTAMPTZ | `now()` | |
| `updated_at` | TIMESTAMPTZ | `now()` | Auto-updated by trigger |

**RLS Policies:**
- `SELECT`: `auth.uid() = id`
- `INSERT/UPDATE/DELETE`: Forbidden for clients (RPCs only)

---

### `public.activity_events`
Immutable audit log of all XP-earning events.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Client-generated UUID (idempotency key) |
| `user_id` | UUID | References `auth.users(id)` |
| `event_type` | TEXT | e.g., `media.progress`, `quiz.finished`, `quiz.question_answered` |
| `lecture_id` | INT | Optional — references `lectures(id)` |
| `payload` | JSONB | Event-specific data |
| `client_ts` | TIMESTAMPTZ | Timestamp on client device |
| `server_ts` | TIMESTAMPTZ | Timestamp on Supabase server (authoritative) |

**Indexes:** `(user_id, server_ts DESC)`, `(user_id, event_type)`
**Client access:** No direct read access (admin-only view)

---

### `public.daily_activity`
Rolled-up daily stats per student per Cairo day.

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID | |
| `day` | DATE | Cairo-timezone date (PK component) |
| `xp_earned` | INT | XP earned that day (≥ 0) |
| `seconds_active` | INT | Active seconds that day |
| `items_completed` | INT | Activities completed count |

**Primary Key:** `(user_id, day)`

---

### `public.user_achievements`
Unlocked badges per student.

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID | |
| `achievement_id` | TEXT | e.g., `'first_quiz'`, `'streak_7'`, `'notebook_master'` |
| `unlocked_at` | TIMESTAMPTZ | When badge was earned |

**Primary Key:** `(user_id, achievement_id)`
**RLS:** `SELECT auth.uid() = user_id`

---

### `public.lecture_progress`
Per-student, per-lecture progress tracking.

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID | |
| `lecture_id` | INT | References `lectures(id)` |
| `audio_completed` | BOOLEAN | `true` after 80%+ listen |
| `video_completed` | BOOLEAN | `true` after 80%+ watch |
| `flashcards_completed` | BOOLEAN | |
| `study_guide_read` | BOOLEAN | |
| `quiz_completed` | BOOLEAN | |
| `quiz_score` | INT | Last quiz score |
| `quiz_total` | INT | Total questions in last quiz |
| `media_progress` | JSONB | Resume state: `{audioSec, videoSec, cardIndex, lastTab, updatedAt}` |
| `updated_at` | TIMESTAMPTZ | |

**Primary Key:** `(user_id, lecture_id)`
**RLS:** `SELECT auth.uid() = user_id`

---

### `public.mistake_notebook`
Leitner spaced repetition mistake tracking.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `user_id` | UUID | References `auth.users(id)` |
| `lecture_id` | INT | References `lectures(id)` |
| `question_hash` | TEXT | SHA-256 of normalized question text |
| `question_text` | TEXT | Full question content |
| `correct_answer` | TEXT | Correct answer text |
| `user_last_mistake` | TEXT | What the student answered wrong |
| `explanation` | TEXT | Pedagogical explanation |
| `box_level` | INT | 1–5 (Leitner box) |
| `next_review_date` | DATE | Cairo-timezone date of next review |
| `is_mastered` | BOOLEAN | `true` after Box 5 correct |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Unique constraint:** `(user_id, question_hash)`
**RLS:**
- `SELECT`: `auth.uid() = user_id`
- `INSERT/UPDATE/DELETE`: Forbidden for clients

**Leitner Box Intervals:**
| Box | Interval |
|---|---|
| 1 | 1 day |
| 2 | 3 days |
| 3 | 7 days |
| 4 | 14 days |
| 5 | 30 days (Mastered) |

---

## RPCs (Stored Procedures)

### `ingest_events(events JSONB) → JSONB`
**File:** `supabase/migrations/20261020_fix_ingest_events_rpc.sql`
**Called from:** `frontend/src/modules/gamification/sync/outbox.ts`

Atomic batch event processor:
1. Validates each event (type, payload shape)
2. Deduplicates by `id` (`ON CONFLICT DO NOTHING`)
3. Computes XP using Cairo-TZ streak logic
4. Enforces daily XP cap per `daily_activity`
5. Updates `profiles` (xp, level, streak, last_active_date)
6. Returns: `{ success, awardedXp, profile, newBadges }`

**Speed guard:** `durationMs < 3000` → `awardedXp = 0` (anti-click-spam)
**Anti-replay:** UUID idempotency per event

---

### `submit_mistake_review(p_question_hash, p_is_correct, p_duration_ms) → JSONB`
**File:** `supabase/migrations/20261020_phase2_leitner_notebook.sql`
**Called from:** `frontend/src/modules/gamification/supabase/gamification.ts`

Leitner review processor:
1. Validates question is due (`next_review_date <= cairo_today`)
2. Speed guard: `durationMs < 3000` → 0 XP, no demotion on correct
3. Advances box on correct / resets to Box 1 on wrong
4. Routes XP through `ingest_events` pipeline
5. Returns: `{ boxLevel, isMastered, awardedXp }`

**Caller rule:** Mistake Notebook UI must ONLY call this RPC, never `quiz.question_answered`

---

### `update_resume_state(p_lecture_id, p_tab, p_media_progress) → void`
**File:** `supabase/migrations/20261020_add_resume_state.sql`
**Called from:** `frontend/src/modules/gamification/resume/resumeManager.ts`

Persists playback position:
1. Updates `profiles.last_active_lecture_id` + `last_active_tab`
2. Upserts `lecture_progress.media_progress` JSONB

---

### `get_cohort_leaderboard(limit_count INT) → TABLE`
**Called from:** `frontend/src/components/gamification/StudentGamificationPill.tsx`

Returns anonymized top-N students:
- `user_id`, `nickname`, `persona`, `total_xp`, `level`, `current_streak`, `rank`

---

## KPI Views

| View | Purpose |
|---|---|
| `v_daily_active_users` | Count of students active per day |
| `v_xp_distribution` | XP histogram across student population |
| `v_streak_health` | Streak lengths distribution |
| `v_mistake_notebook_health` | Box distribution + mastery rate |

**Access:** Admin/service role only (RLS blocks anonymous access)

---

## Auto-Provisioning Trigger

```sql
-- On every new Supabase auth user (including anonymous):
CREATE OR REPLACE FUNCTION public.handle_new_user()
-- Inserts default profile row automatically
-- Trigger: AFTER INSERT ON auth.users
```

This ensures every student has a `profiles` row immediately upon app load, without any client-side initialization logic.

---

## Migration Order (Apply in Sequence)

```
1. 20261016_add_semester_to_subjects.sql
2. 20261019_phase2_gamification_schema.sql     ← Core tables
3. 20261020_add_resume_state.sql               ← Resume columns
4. 20261020_fix_ingest_events_rpc.sql          ← Patched ingest RPC
5. 20261020_lockdown_kpi_views.sql             ← Secure KPI views
6. 20261020_phase2_kpi_views.sql               ← KPI view definitions
7. 20261020_phase2_leitner_notebook.sql        ← Mistake notebook
8. 20261020_phase2_security_hardening.sql      ← Final RLS tightening
```
