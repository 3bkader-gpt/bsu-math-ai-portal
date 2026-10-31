-- Auto-generated test account isolation migration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN DEFAULT false;

CREATE OR REPLACE VIEW public.v_question_cohort_stats AS
SELECT
    COALESCE(a.payload->>'questionHash', a.payload->>'question_id') AS question_hash,
    COALESCE((a.payload->>'lectureId')::int, (a.payload->>'lecture_id')::int) AS lecture_id,
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
  AND a.user_id NOT IN (
      SELECT p.id FROM public.profiles p 
      WHERE p.is_test_account = true 
         OR p.nickname ILIKE '%فرماو%'
         OR p.nickname ILIKE '%تجربة%'
         OR p.nickname ILIKE '%test%'
  )
GROUP BY 
    COALESCE(a.payload->>'questionHash', a.payload->>'question_id'),
    COALESCE((a.payload->>'lectureId')::int, (a.payload->>'lecture_id')::int);


CREATE OR REPLACE VIEW public.v_lecture_cohort_momentum AS
SELECT
    l.id AS lecture_id,
    l.subject_id,
    COUNT(a.id) FILTER (WHERE a.server_ts >= NOW() - INTERVAL '7 days') AS weekly_activity_count,
    COUNT(a.id) FILTER (WHERE a.server_ts >= (NOW() AT TIME ZONE 'Africa/Cairo')::date) AS today_activity_count
FROM public.lectures l
LEFT JOIN public.activity_events a ON 
    COALESCE((a.payload->>'lectureId')::int, (a.payload->>'lecture_id')::int) = l.id
    AND (a.payload->>'is_test' IS NULL OR a.payload->>'is_test' != 'true')
    AND a.user_id NOT IN (
        SELECT p.id FROM public.profiles p 
        WHERE p.is_test_account = true 
           OR p.nickname ILIKE '%فرماو%'
           OR p.nickname ILIKE '%تجربة%'
           OR p.nickname ILIKE '%test%'
    )
GROUP BY l.id, l.subject_id;


CREATE OR REPLACE FUNCTION public.record_cohort_contribution(
    p_challenge_id UUID,
    p_question_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_cairo_today DATE := (now() AT TIME ZONE 'Africa/Cairo')::DATE;
    v_today_count INT := 0;
    v_cap INT := 15;
    v_is_test BOOLEAN := false;
BEGIN
    IF v_user_id IS NULL OR p_challenge_id IS NULL OR p_question_hash IS NULL THEN
        RETURN false;
    END IF;

    -- Check if user is a test user
    SELECT COALESCE(is_test_account, false) INTO v_is_test
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_is_test THEN
        -- Silently report success for test sessions without adding to cohort challenge
        RETURN true;
    END IF;

    -- Check daily cap for this user
    SELECT count(*) INTO v_today_count
    FROM public.cohort_challenge_contributions ccc
    WHERE ccc.user_id = v_user_id 
      AND ccc.cairo_date = v_cairo_today;

    IF v_today_count >= v_cap THEN
        RETURN false; -- Daily cap reached
    END IF;

    -- Insert append-only contribution
    INSERT INTO public.cohort_challenge_contributions (
        user_id, challenge_id, question_hash, cairo_date
    )
    VALUES (
        v_user_id, p_challenge_id, p_question_hash, v_cairo_today
    )
    ON CONFLICT (user_id, challenge_id, question_hash) DO NOTHING;

    RETURN true;
END;
$$;


CREATE OR REPLACE FUNCTION public.get_active_cohort_challenge(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    challenge_id UUID,
    title TEXT,
    description TEXT,
    target_count INT,
    current_count BIGINT,
    user_contributions_total BIGINT,
    user_contributions_today BIGINT,
    daily_cap INT,
    is_completed BOOLEAN,
    days_remaining INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cairo_today DATE := (now() AT TIME ZONE 'Africa/Cairo')::DATE;
    v_challenge RECORD;
    v_total_contribs BIGINT := 0;
    v_user_total BIGINT := 0;
    v_user_today BIGINT := 0;
    v_cap INT := 15;
BEGIN
    -- Select current active challenge
    SELECT id, c.title, c.description, c.target_count, c.end_date
    INTO v_challenge
    FROM public.cohort_challenges c
    WHERE c.is_active = true 
      AND v_cairo_today BETWEEN c.start_date AND c.end_date
    ORDER BY c.created_at DESC
    LIMIT 1;

    IF v_challenge.id IS NULL THEN
        RETURN;
    END IF;

    -- Aggregate total contributions without test accounts
    SELECT count(*) INTO v_total_contribs
    FROM public.cohort_challenge_contributions ccc
    WHERE ccc.challenge_id = v_challenge.id
      AND ccc.user_id NOT IN (
          SELECT p.id FROM public.profiles p 
          WHERE p.is_test_account = true 
             OR p.nickname ILIKE '%فرماو%'
             OR p.nickname ILIKE '%تجربة%'
             OR p.nickname ILIKE '%test%'
      );

    -- Aggregate user-specific contributions if user_id provided
    IF p_user_id IS NOT NULL THEN
        SELECT count(*) INTO v_user_total
        FROM public.cohort_challenge_contributions ccc
        WHERE ccc.challenge_id = v_challenge.id AND ccc.user_id = p_user_id;

        SELECT count(*) INTO v_user_today
        FROM public.cohort_challenge_contributions ccc
        WHERE ccc.challenge_id = v_challenge.id 
          AND ccc.user_id = p_user_id 
          AND ccc.cairo_date = v_cairo_today;
    END IF;

    RETURN QUERY
    SELECT 
        v_challenge.id,
        v_challenge.title,
        v_challenge.description,
        v_challenge.target_count,
        v_total_contribs,
        v_user_total,
        v_user_today,
        v_cap,
        (v_total_contribs >= v_challenge.target_count),
        GREATEST(0, (v_challenge.end_date - v_cairo_today)::INT);
END;
$$;

