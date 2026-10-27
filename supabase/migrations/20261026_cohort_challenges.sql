-- ==============================================================================
-- Migration: 20261026_cohort_challenges.sql
-- Description: Phase 6 — Sybil-Proof Collaborative Cohort Challenge Schema & RPCs
-- ==============================================================================

-- 1. Cohort Challenges Table
CREATE TABLE IF NOT EXISTS public.cohort_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    target_count INT NOT NULL DEFAULT 500 CHECK (target_count > 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Append-Only Contributions Table (Non-blocking, Sybil-proof)
CREATE TABLE IF NOT EXISTS public.cohort_challenge_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES public.cohort_challenges(id) ON DELETE CASCADE,
    question_hash TEXT NOT NULL,
    cairo_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Cairo')::DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, challenge_id, question_hash)
);

CREATE INDEX IF NOT EXISTS idx_cohort_contrib_challenge ON public.cohort_challenge_contributions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_cohort_contrib_user_date ON public.cohort_challenge_contributions(user_id, cairo_date);

-- Enable RLS
ALTER TABLE public.cohort_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_challenge_contributions ENABLE ROW LEVEL SECURITY;

-- Public read policies
DROP POLICY IF EXISTS "cohort_challenges_public_read" ON public.cohort_challenges;
CREATE POLICY "cohort_challenges_public_read" ON public.cohort_challenges
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "cohort_contrib_user_read" ON public.cohort_challenge_contributions;
CREATE POLICY "cohort_contrib_user_read" ON public.cohort_challenge_contributions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "cohort_contrib_insert_own" ON public.cohort_challenge_contributions;
CREATE POLICY "cohort_contrib_insert_own" ON public.cohort_challenge_contributions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Function to get the current active challenge and user stats
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

    -- Aggregate total contributions without locking
    SELECT count(*) INTO v_total_contribs
    FROM public.cohort_challenge_contributions ccc
    WHERE ccc.challenge_id = v_challenge.id;

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

-- 4. Function to record a contribution with daily cap guard
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
BEGIN
    IF v_user_id IS NULL OR p_challenge_id IS NULL OR p_question_hash IS NULL THEN
        RETURN false;
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

GRANT EXECUTE ON FUNCTION public.get_active_cohort_challenge(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_cohort_contribution(UUID, TEXT) TO anon, authenticated;

-- Seed an initial active weekly challenge if none exists
INSERT INTO public.cohort_challenges (
    title, description, target_count, start_date, end_date, is_active
)
SELECT 
    'تحدي الأسبوع: ٥٠٠ سؤال للدفعة 🎓',
    'كل سؤال كويز صحيح تحله يساهم مباشرة في تحقيق هدف الدفعة الأسبوعي!',
    500,
    (now() AT TIME ZONE 'Africa/Cairo')::DATE,
    (now() AT TIME ZONE 'Africa/Cairo')::DATE + 7,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.cohort_challenges WHERE is_active = true
);
