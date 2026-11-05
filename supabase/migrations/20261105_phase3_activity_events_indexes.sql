-- ==============================================================================
-- Migration: 20261105_phase3_activity_events_indexes.sql
-- Description:
--   Phase 3.2 — Expression & Composite Indexes for `activity_events` and `profiles`
--   to prevent full-table scans on `v_question_cohort_stats` and `v_lecture_cohort_momentum`
--   as the student cohort scales to multi-year levels (500,000+ events).
-- ==============================================================================

-- 1. Backfill top-level `lecture_id` from JSONB payload where missing
UPDATE public.activity_events
SET lecture_id = COALESCE((payload->>'lectureId')::int, (payload->>'lecture_id')::int)
WHERE lecture_id IS NULL
  AND (
    (payload->>'lectureId' ~ '^\d+$')
    OR (payload->>'lecture_id' ~ '^\d+$')
  );

-- 2. Partial index on test accounts in `profiles` for fast exclusion joins
CREATE INDEX IF NOT EXISTS idx_profiles_test_account_filter
    ON public.profiles (id)
    WHERE is_test_account = true;

-- 3. Composite & Expression index for `v_question_cohort_stats` (Exam Traps & Cohort Hurdles)
CREATE INDEX IF NOT EXISTS idx_activity_events_quiz_qhash_lecture
    ON public.activity_events (
        COALESCE(payload->>'questionHash', payload->>'question_id'),
        COALESCE(lecture_id, (payload->>'lectureId')::int, (payload->>'lecture_id')::int)
    )
    WHERE event_type = 'quiz.question_answered';

-- 4. Composite index for `v_lecture_cohort_momentum` (7-day & daily rolling lecture activity)
CREATE INDEX IF NOT EXISTS idx_activity_events_lecture_server_ts
    ON public.activity_events (
        COALESCE(lecture_id, (payload->>'lectureId')::int, (payload->>'lecture_id')::int),
        server_ts DESC
    );

-- 5. Recreate `v_question_cohort_stats` using indexed `COALESCE(a.lecture_id, ...)`
CREATE OR REPLACE VIEW public.v_question_cohort_stats AS
SELECT
    COALESCE(a.payload->>'questionHash', a.payload->>'question_id') AS question_hash,
    COALESCE(a.lecture_id, (a.payload->>'lectureId')::int, (a.payload->>'lecture_id')::int) AS lecture_id,
    MIN(a.payload->>'questionText') AS question_text,
    MIN(a.payload->>'explanation') AS explanation,
    MIN(a.payload->>'correctAnswer') AS correct_answer,
    COUNT(*) AS total_attempts,
    COUNT(*) FILTER (WHERE COALESCE((a.payload->>'isCorrect')::boolean, (a.payload->>'is_correct')::boolean) = false) AS incorrect_attempts,
    ROUND(
        (COUNT(*) FILTER (WHERE COALESCE((a.payload->>'isCorrect')::boolean, (a.payload->>'is_correct')::boolean) = false)::numeric /
        NULLIF(COUNT(*), 0)::numeric) * 100, 1
    ) AS failure_rate_pct
FROM public.activity_events a
WHERE a.event_type = 'quiz.question_answered'
  AND (a.payload->>'is_test' IS NULL OR a.payload->>'is_test' != 'true')
  AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = a.user_id
        AND (
            p.is_test_account = true
            OR p.nickname ILIKE '%فرماو%'
            OR p.nickname ILIKE '%تجربة%'
            OR p.nickname ILIKE '%test%'
        )
  )
GROUP BY
    COALESCE(a.payload->>'questionHash', a.payload->>'question_id'),
    COALESCE(a.lecture_id, (a.payload->>'lectureId')::int, (a.payload->>'lecture_id')::int);

-- 6. Recreate `v_lecture_cohort_momentum` using `NOT EXISTS` anti-join & indexed lecture_id
CREATE OR REPLACE VIEW public.v_lecture_cohort_momentum AS
SELECT
    l.id AS lecture_id,
    l.subject_id,
    COUNT(a.id) FILTER (WHERE a.server_ts >= NOW() - INTERVAL '7 days') AS weekly_activity_count,
    COUNT(a.id) FILTER (WHERE a.server_ts >= (NOW() AT TIME ZONE 'Africa/Cairo')::date) AS today_activity_count
FROM public.lectures l
LEFT JOIN public.activity_events a ON
    COALESCE(a.lecture_id, (a.payload->>'lectureId')::int, (a.payload->>'lecture_id')::int) = l.id
    AND (a.payload->>'is_test' IS NULL OR a.payload->>'is_test' != 'true')
    AND NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = a.user_id
          AND (
              p.is_test_account = true
              OR p.nickname ILIKE '%فرماو%'
              OR p.nickname ILIKE '%تجربة%'
              OR p.nickname ILIKE '%test%'
          )
    )
GROUP BY l.id, l.subject_id;

NOTIFY pgrst, 'reload schema';
