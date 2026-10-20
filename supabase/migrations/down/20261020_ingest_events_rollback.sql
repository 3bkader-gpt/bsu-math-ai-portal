-- ====================================================================
-- ROLLBACK SCRIPT: Restore previous ingest_events RPC (Phase 1 Baseline)
-- ====================================================================

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
    daily_cap INT := 400;
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

        -- 2. Calculate Base XP strictly for completed milestones
        event_xp := 0;
        CASE event_type
            WHEN 'media.completed' THEN
                IF event_payload->>'kind' = 'video' THEN
                    event_xp := 35;
                ELSE
                    event_xp := 25;
                END IF;
            WHEN 'audio.streak_5min' THEN
                event_xp := 5;
            WHEN 'video.streak_5min' THEN
                event_xp := 10;
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
                -- Raw progress and unknown events award ZERO XP
                event_xp := 0;
        END CASE;

        -- 3. Check and apply daily cap
        SELECT coalesce(xp_earned, 0) INTO current_day_xp
        FROM public.daily_activity
        WHERE user_id = caller_id AND day = cairo_today;

        available_xp := GREATEST(0, daily_cap - current_day_xp);
        effective_xp := LEAST(event_xp, available_xp);
        total_effective_xp := total_effective_xp + effective_xp;

        -- 4. Update daily_activity only if meaningful XP or item completion
        IF effective_xp > 0 OR event_xp > 0 THEN
            INSERT INTO public.daily_activity (user_id, day, xp_earned, items_completed, updated_at)
            VALUES (caller_id, cairo_today, effective_xp, 1, now())
            ON CONFLICT (user_id, day) DO UPDATE SET
                xp_earned = daily_activity.xp_earned + EXCLUDED.xp_earned,
                items_completed = daily_activity.items_completed + 1,
                updated_at = now();
        END IF;

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

        -- 6. Check Achievements (Only for completed events)
        IF event_xp > 0 THEN
            -- First Step Badge (أول الغيث)
            IF NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = caller_id AND achievement_id = 'first_step') THEN
                INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (caller_id, 'first_step') ON CONFLICT DO NOTHING;
                newly_unlocked_badges := array_append(newly_unlocked_badges, 'first_step');
            END IF;

            -- Night Owl Badge (سهران مع فيرما)
            IF is_night_owl AND (event_type = 'quiz.finished' OR event_type = 'lecture.completed') THEN
                IF NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = caller_id AND achievement_id = 'night_owl') THEN
                    INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (caller_id, 'night_owl') ON CONFLICT DO NOTHING;
                    newly_unlocked_badges := array_append(newly_unlocked_badges, 'night_owl');
                END IF;
            END IF;

            -- Perfect Quiz Badge (قناص الدرجات)
            IF event_type = 'quiz.finished' AND (event_payload->>'score')::INT = (event_payload->>'total')::INT AND (event_payload->>'total')::INT >= 5 THEN
                IF NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = caller_id AND achievement_id = 'perfect_quiz') THEN
                    INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (caller_id, 'perfect_quiz') ON CONFLICT DO NOTHING;
                    newly_unlocked_badges := array_append(newly_unlocked_badges, 'perfect_quiz');
                END IF;
            END IF;

            -- Five of Five Badge (دحيح الدفعة)
            IF event_type = 'lecture.completed' THEN
                IF NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = caller_id AND achievement_id = 'five_of_five') THEN
                    INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (caller_id, 'five_of_five') ON CONFLICT DO NOTHING;
                    newly_unlocked_badges := array_append(newly_unlocked_badges, 'five_of_five');
                END IF;
            END IF;
        END IF;

    END LOOP;

    -- 7. Update Daily Streak only if student earned XP or completed a meaningful activity today
    IF total_effective_xp > 0 THEN
        IF prof.last_active_date IS NULL THEN
            prof.current_streak := 1;
            prof.longest_streak := 1;
            prof.last_active_date := cairo_today;
        ELSIF prof.last_active_date = cairo_today THEN
            -- Already counted today
            NULL;
        ELSIF prof.last_active_date = cairo_yesterday THEN
            prof.current_streak := prof.current_streak + 1;
            prof.longest_streak := GREATEST(prof.longest_streak, prof.current_streak);
            prof.last_active_date := cairo_today;
        ELSIF (cairo_today - prof.last_active_date) = 2 AND prof.freezes_left > 0 THEN
            -- Streak Freeze Protected!
            prof.freezes_left := prof.freezes_left - 1;
            prof.current_streak := prof.current_streak + 1;
            prof.longest_streak := GREATEST(prof.longest_streak, prof.current_streak);
            prof.last_active_date := cairo_today;
        ELSE
            -- Streak broken
            prof.current_streak := 1;
            prof.last_active_date := cairo_today;
        END IF;

        -- Streak Badges
        IF prof.current_streak >= 3 THEN
            IF NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = caller_id AND achievement_id = 'streak_3') THEN
                INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (caller_id, 'streak_3') ON CONFLICT DO NOTHING;
                newly_unlocked_badges := array_append(newly_unlocked_badges, 'streak_3');
            END IF;
        END IF;
        IF prof.current_streak >= 7 THEN
            IF NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = caller_id AND achievement_id = 'streak_7') THEN
                INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (caller_id, 'streak_7') ON CONFLICT DO NOTHING;
                newly_unlocked_badges := array_append(newly_unlocked_badges, 'streak_7');
            END IF;
        END IF;
    END IF;

    -- 8. Apply Total XP and calculate Level: floor(sqrt(total_xp / 60)) + 1
    prof.total_xp := prof.total_xp + total_effective_xp;
    prof.level := floor(sqrt(prof.total_xp::NUMERIC / 60.0)) + 1;
    prof.updated_at := now();

    -- Save updated profile
    UPDATE public.profiles SET
        total_xp = prof.total_xp,
        level = prof.level,
        current_streak = prof.current_streak,
        longest_streak = prof.longest_streak,
        last_active_date = prof.last_active_date,
        freezes_left = prof.freezes_left,
        updated_at = now()
    WHERE id = caller_id;

    -- 9. Return atomic reconciled response to client
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
        'newBadges', to_jsonb(newly_unlocked_badges)
    );
END;
$$;
