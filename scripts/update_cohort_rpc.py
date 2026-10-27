import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('.env')

dsn = os.getenv('DATABASE_URL').replace('postgresql+psycopg2://', 'postgresql://')
conn = psycopg2.connect(dsn)
conn.autocommit = True
cur = conn.cursor()

sql = """
CREATE OR REPLACE FUNCTION public.record_cohort_contribution(
    p_challenge_id UUID DEFAULT NULL,
    p_question_hash TEXT DEFAULT NULL
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
    v_target_challenge_id UUID := p_challenge_id;
BEGIN
    IF v_user_id IS NULL OR p_question_hash IS NULL THEN
        RETURN false;
    END IF;

    -- If no challenge_id supplied, resolve the active one automatically
    IF v_target_challenge_id IS NULL THEN
        SELECT id INTO v_target_challenge_id
        FROM public.cohort_challenges
        WHERE is_active = true 
          AND v_cairo_today BETWEEN start_date AND end_date
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    IF v_target_challenge_id IS NULL THEN
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
        v_user_id, v_target_challenge_id, p_question_hash, v_cairo_today
    )
    ON CONFLICT (user_id, challenge_id, question_hash) DO NOTHING;

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_cohort_contribution(UUID, TEXT) TO anon, authenticated;
"""

cur.execute(sql)
print("Updated record_cohort_contribution with auto-resolution of active challenge!")
