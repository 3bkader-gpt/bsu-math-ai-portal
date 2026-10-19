-- ====================================================================
-- BSU Math & AI Portal — Phase 2 Gamification & Behavioral Schema
-- ====================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL DEFAULT 'عاشق الرياضيات',
    persona TEXT NOT NULL DEFAULT 'boys' CHECK (persona IN ('boys', 'girls')),
    cohort_id INT NOT NULL DEFAULT 1,
    total_xp BIGINT NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
    level INT NOT NULL DEFAULT 1 CHECK (level >= 1),
    current_streak INT NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    longest_streak INT NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
    last_active_date DATE,
    freezes_left INT NOT NULL DEFAULT 1 CHECK (freezes_left >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Activity Events Table (Immutable Audit Log)
CREATE TABLE IF NOT EXISTS public.activity_events (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    lecture_id INT REFERENCES public.lectures(id) ON DELETE SET NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    client_ts TIMESTAMPTZ NOT NULL,
    server_ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_user_server_ts 
    ON public.activity_events (user_id, server_ts DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_user_event_type 
    ON public.activity_events (user_id, event_type);

-- 3. Daily Activity Table (Daily XP Cap & Heatmap)
CREATE TABLE IF NOT EXISTS public.daily_activity (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    xp_earned INT NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
    seconds_active INT NOT NULL DEFAULT 0 CHECK (seconds_active >= 0),
    items_completed INT NOT NULL DEFAULT 0 CHECK (items_completed >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, day)
);

-- 4. User Achievements Table
CREATE TABLE IF NOT EXISTS public.user_achievements (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, achievement_id)
);

-- 5. Lecture Progress Table
CREATE TABLE IF NOT EXISTS public.lecture_progress (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lecture_id INT NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
    audio_completed BOOLEAN NOT NULL DEFAULT false,
    video_completed BOOLEAN NOT NULL DEFAULT false,
    flashcards_completed BOOLEAN NOT NULL DEFAULT false,
    study_guide_read BOOLEAN NOT NULL DEFAULT false,
    quiz_completed BOOLEAN NOT NULL DEFAULT false,
    quiz_score INT DEFAULT NULL,
    quiz_total INT DEFAULT NULL,
    media_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, lecture_id)
);

-- 6. Trigger: Auto-Provision Profile on New User Signup/Anonymous Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Atomic Idempotent Ingestion Stored Procedure
CREATE OR REPLACE FUNCTION public.ingest_events(events JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    caller_id UUID := auth.uid();
    cairo_now TIMESTAMPTZ;
    cairo_today DATE;
    cairo_yesterday DATE;
    elem JSONB;
    event_id UUID;
    event_type TEXT;
    lec_id INT;
    event_payload JSONB;
    client_time TIMESTAMPTZ;
    
    event_xp INT := 0;
    effective_xp INT := 0;
    total_effective_xp INT := 0;
    daily_cap INT := 500;
    current_day_xp INT := 0;
    available_xp INT := 0;
    
    prof public.profiles%ROWTYPE;
    newly_unlocked_badges TEXT[] := ARRAY[]::TEXT[];
    is_night_owl BOOLEAN := false;
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to ingest events.';
    END IF;

    -- Guarantee profile exists
    INSERT INTO public.profiles (id)
    VALUES (caller_id)
    ON CONFLICT (id) DO NOTHING;

    -- Strict Cairo Timezone boundaries
    cairo_now := now() AT TIME ZONE 'Africa/Cairo';
    cairo_today := cairo_now::DATE;
    cairo_yesterday := cairo_today - 1;
    is_night_owl := (EXTRACT(HOUR FROM cairo_now) >= 22 OR EXTRACT(HOUR FROM cairo_now) < 4);

    -- Load current profile with row lock
    SELECT * INTO prof 
    FROM public.profiles 
    WHERE id = caller_id 
    FOR UPDATE;

    -- Process each event in the input array
    FOR elem IN SELECT * FROM jsonb_array_elements(events)
    LOOP
        event_id := (elem->>'id')::UUID;
        event_type := elem->>'type';
        lec_id := (elem->>'lectureId')::INT;
        event_payload := coalesce(elem->'payload', '{}'::JSONB);
        client_time := coalesce((elem->>'clientTs')::TIMESTAMPTZ, now());

        -- 1. Idempotency Check: insert into activity_events
        INSERT INTO public.activity_events (id, user_id, event_type, lecture_id, payload, client_ts)
        VALUES (event_id, caller_id, event_type, lec_id, event_payload, client_time)
        ON CONFLICT (id) DO NOTHING;

        -- If row was not inserted, it is a duplicate replay -> skip
        IF NOT FOUND THEN
            CONTINUE;
        END IF;

        -- 2. Calculate Base XP for Event
        event_xp := 0;
        CASE event_type
            WHEN 'media.completed' THEN
                IF event_payload->>'kind' = 'video' THEN
                    event_xp := 35;
                ELSE
                    event_xp := 25;
                END IF;
            WHEN 'quiz.finished' THEN
                DECLARE
                    q_score INT := coalesce((event_payload->>'score')::INT, 0);
                    q_total INT := coalesce((event_payload->>'total')::INT, 1);
                BEGIN
                    event_xp := 10 + round((q_score::NUMERIC / GREATEST(q_total, 1)) * 40);
                    IF q_score = q_total AND q_total >= 5 THEN
                        event_xp := event_xp + 25; -- Perfect score bonus
                    END IF;
                END;
            WHEN 'flashcard.deck_completed' THEN
                event_xp := 15;
            WHEN 'study_guide.read' THEN
                event_xp := 15;
            WHEN 'lecture.completed' THEN
                event_xp := 50;
            ELSE
                event_xp := 5;
        END CASE;

        -- 3. Check and apply daily cap
        SELECT coalesce(xp_earned, 0) INTO current_day_xp
        FROM public.daily_activity
        WHERE user_id = caller_id AND day = cairo_today;

        available_xp := GREATEST(0, daily_cap - current_day_xp);
        effective_xp := LEAST(event_xp, available_xp);
        total_effective_xp := total_effective_xp + effective_xp;

        -- 4. Update daily_activity
        INSERT INTO public.daily_activity (user_id, day, xp_earned, items_completed, updated_at)
        VALUES (caller_id, cairo_today, effective_xp, 1, now())
        ON CONFLICT (user_id, day) DO UPDATE SET
            xp_earned = daily_activity.xp_earned + EXCLUDED.xp_earned,
            items_completed = daily_activity.items_completed + 1,
            updated_at = now();

        -- 5. Update lecture_progress if lecture_id provided
        IF lec_id IS NOT NULL THEN
            INSERT INTO public.lecture_progress (user_id, lecture_id)
            VALUES (caller_id, lec_id)
            ON CONFLICT (user_id, lecture_id) DO NOTHING;

            IF event_type = 'media.completed' THEN
                IF event_payload->>'kind' = 'video' THEN
                    UPDATE public.lecture_progress SET video_completed = true, updated_at = now()
                    WHERE user_id = caller_id AND lecture_id = lec_id;
                ELSE
                    UPDATE public.lecture_progress SET audio_completed = true, updated_at = now()
                    WHERE user_id = caller_id AND lecture_id = lec_id;
                END IF;
            ELSIF event_type = 'quiz.finished' THEN
                UPDATE public.lecture_progress SET 
                    quiz_completed = true,
                    quiz_score = (event_payload->>'score')::INT,
                    quiz_total = (event_payload->>'total')::INT,
                    updated_at = now()
                WHERE user_id = caller_id AND lecture_id = lec_id;
            ELSIF event_type = 'flashcard.deck_completed' THEN
                UPDATE public.lecture_progress SET flashcards_completed = true, updated_at = now()
                WHERE user_id = caller_id AND lecture_id = lec_id;
            ELSIF event_type = 'study_guide.read' THEN
                UPDATE public.lecture_progress SET study_guide_read = true, updated_at = now()
                WHERE user_id = caller_id AND lecture_id = lec_id;
            END IF;
        END IF;

        -- 6. Achievements Check
        -- A. "أول الغيث" - First step
        INSERT INTO public.user_achievements (user_id, achievement_id)
        VALUES (caller_id, 'first_step')
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
        IF FOUND THEN
            newly_unlocked_badges := array_append(newly_unlocked_badges, 'first_step');
        END IF;

        -- B. "قناص الدرجات" - Perfect Quiz
        IF event_type = 'quiz.finished' AND (event_payload->>'score')::INT = (event_payload->>'total')::INT THEN
            INSERT INTO public.user_achievements (user_id, achievement_id)
            VALUES (caller_id, 'perfect_quiz')
            ON CONFLICT (user_id, achievement_id) DO NOTHING;
            IF FOUND THEN
                newly_unlocked_badges := array_append(newly_unlocked_badges, 'perfect_quiz');
            END IF;
        END IF;

        -- C. "سهران مع فيرما" - Night Owl
        IF is_night_owl THEN
            INSERT INTO public.user_achievements (user_id, achievement_id)
            VALUES (caller_id, 'night_owl')
            ON CONFLICT (user_id, achievement_id) DO NOTHING;
            IF FOUND THEN
                newly_unlocked_badges := array_append(newly_unlocked_badges, 'night_owl');
            END IF;
        END IF;
    END LOOP;

    -- 7. Update Streak Logic strictly according to Cairo date
    IF prof.last_active_date IS NULL THEN
        prof.current_streak := 1;
    ELSIF prof.last_active_date = cairo_today THEN
        -- Already active today, streak remains unchanged
        NULL;
    ELSIF prof.last_active_date = cairo_yesterday THEN
        -- Active yesterday -> streak increases
        prof.current_streak := prof.current_streak + 1;
    ELSE
        -- Gap of >= 2 days
        IF prof.freezes_left > 0 AND prof.last_active_date = (cairo_yesterday - 1) THEN
            -- Use streak freeze protection
            prof.freezes_left := prof.freezes_left - 1;
            prof.current_streak := prof.current_streak + 1;
        ELSE
            -- Streak broke
            prof.current_streak := 1;
        END IF;
    END IF;

    -- Update longest streak
    prof.longest_streak := GREATEST(prof.longest_streak, prof.current_streak);

    -- Check streak badges
    IF prof.current_streak >= 3 THEN
        INSERT INTO public.user_achievements (user_id, achievement_id)
        VALUES (caller_id, 'streak_3')
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
        IF FOUND THEN
            newly_unlocked_badges := array_append(newly_unlocked_badges, 'streak_3');
        END IF;
    END IF;

    IF prof.current_streak >= 7 THEN
        INSERT INTO public.user_achievements (user_id, achievement_id)
        VALUES (caller_id, 'streak_7')
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
        IF FOUND THEN
            newly_unlocked_badges := array_append(newly_unlocked_badges, 'streak_7');
        END IF;
    END IF;

    -- 8. Apply Total XP and Recalculate Level
    prof.total_xp := prof.total_xp + total_effective_xp;
    prof.level := FLOOR(SQRT(prof.total_xp::NUMERIC / 60)) + 1;
    prof.last_active_date := cairo_today;
    prof.updated_at := now();

    UPDATE public.profiles
    SET total_xp = prof.total_xp,
        level = prof.level,
        current_streak = prof.current_streak,
        longest_streak = prof.longest_streak,
        last_active_date = prof.last_active_date,
        freezes_left = prof.freezes_left,
        updated_at = prof.updated_at
    WHERE id = caller_id;

    RETURN jsonb_build_object(
        'success', true,
        'awardedXp', total_effective_xp,
        'profile', jsonb_build_object(
            'id', prof.id,
            'nickname', prof.nickname,
            'persona', prof.persona,
            'totalXp', prof.total_xp,
            'level', prof.level,
            'currentStreak', prof.current_streak,
            'longestStreak', prof.longest_streak,
            'lastActiveDate', prof.last_active_date,
            'freezesLeft', prof.freezes_left
        ),
        'newBadges', newly_unlocked_badges
    );
END;
$$;

-- 8. Cohort Leaderboard Sanitized Function
CREATE OR REPLACE FUNCTION public.get_cohort_leaderboard(limit_count INT DEFAULT 50)
RETURNS TABLE (
    user_id UUID,
    nickname TEXT,
    persona TEXT,
    total_xp BIGINT,
    level INT,
    current_streak INT,
    rank BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        id AS user_id,
        nickname,
        persona,
        total_xp,
        level,
        current_streak,
        ROW_NUMBER() OVER (ORDER BY total_xp DESC, current_streak DESC, updated_at ASC) AS rank
    FROM public.profiles
    WHERE total_xp > 0
    ORDER BY total_xp DESC, current_streak DESC
    LIMIT LEAST(limit_count, 100);
$$;

-- 9. Row Level Security (RLS) Configuration
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_progress ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own nickname/persona" ON public.profiles;
CREATE POLICY "Users can update own nickname/persona" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Activity Events Policies
DROP POLICY IF EXISTS "Users can view own events" ON public.activity_events;
CREATE POLICY "Users can view own events" 
    ON public.activity_events FOR SELECT 
    USING (auth.uid() = user_id);

-- Daily Activity Policies
DROP POLICY IF EXISTS "Users can view own daily activity" ON public.daily_activity;
CREATE POLICY "Users can view own daily activity" 
    ON public.daily_activity FOR SELECT 
    USING (auth.uid() = user_id);

-- User Achievements Policies
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements" 
    ON public.user_achievements FOR SELECT 
    USING (auth.uid() = user_id);

-- Lecture Progress Policies
DROP POLICY IF EXISTS "Users can view own lecture progress" ON public.lecture_progress;
CREATE POLICY "Users can view own lecture progress" 
    ON public.lecture_progress FOR SELECT 
    USING (auth.uid() = user_id);

-- Permissions grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, UPDATE(nickname, persona) ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.activity_events TO authenticated;
GRANT SELECT ON public.daily_activity TO authenticated;
GRANT SELECT ON public.user_achievements TO authenticated;
GRANT SELECT ON public.lecture_progress TO authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_events(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cohort_leaderboard(INT) TO anon, authenticated;
