-- ====================================================================
-- Migration: Restore Leitner-Parity ingest_events to Production
-- Date: 2026-10-24
-- Purpose:
--   The live production body of ingest_events had regressed to the older
--   Phase-2-core version (500 XP cap, no speed guard, no per-question
--   idempotency, no mistake-notebook auto-ingestion). This restores the
--   frozen v1.2.2 behavioral baseline exactly as specified in
--   20261020_phase2_leitner_notebook.sql:
--     - 400 XP daily cap (matches frontend gamification-rules.ts)
--     - 3000ms deliberation speed filter
--     - Per-question / per-lecture daily idempotency
--     - Automatic server-side mistake_notebook ingestion on wrong answers
--     - quiz.mistake_reviewed => 15 XP
--     - session.* and unknown events award 0 XP
-- ====================================================================

CREATE OR REPLACE FUNCTION public.ingest_events(events JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_cairo_now TIMESTAMPTZ;
    v_cairo_today DATE;
    v_cairo_yesterday DATE;
    v_cairo_day_start TIMESTAMPTZ;
    v_cairo_day_end TIMESTAMPTZ;
    
    v_elem JSONB;
    v_event_id UUID;
    v_event_type TEXT;
    v_lec_id INT;
    v_event_payload JSONB;
    v_client_time TIMESTAMPTZ;
    
    v_event_xp INT := 0;
    v_effective_xp INT := 0;
    v_total_effective_xp INT := 0;
    v_daily_cap INT := 400;
    v_current_day_xp INT := 0;
    v_available_xp INT := 0;
    
    v_prof public.profiles%ROWTYPE;
    v_newly_unlocked_badges TEXT[] := ARRAY[]::TEXT[];
    v_is_night_owl BOOLEAN := false;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to ingest events.';
    END IF;

    -- Strict Cairo Timezone boundaries
    v_cairo_now := now() AT TIME ZONE 'Africa/Cairo';
    v_cairo_today := v_cairo_now::DATE;
    v_cairo_yesterday := v_cairo_today - 1;
    v_cairo_day_start := (v_cairo_today::text || ' 00:00:00 Africa/Cairo')::TIMESTAMPTZ;
    v_cairo_day_end := v_cairo_day_start + INTERVAL '1 day';
    v_is_night_owl := (EXTRACT(HOUR FROM v_cairo_now) >= 22 OR EXTRACT(HOUR FROM v_cairo_now) < 4);

    -- Guarantee profile exists
    INSERT INTO public.profiles (id)
    VALUES (v_caller_id)
    ON CONFLICT (id) DO NOTHING;

    -- Concurrency Guard 1: Lock profile row
    SELECT * INTO v_prof 
    FROM public.profiles 
    WHERE id = v_caller_id 
    FOR UPDATE;

    -- Concurrency Guard 2: Lock daily_activity row to strictly enforce 400 XP cap across parallel tabs
    INSERT INTO public.daily_activity (user_id, day, xp_earned, seconds_active, items_completed, updated_at)
    VALUES (v_caller_id, v_cairo_today, 0, 0, 0, now())
    ON CONFLICT (user_id, day) DO NOTHING;

    SELECT coalesce(xp_earned, 0) INTO v_current_day_xp
    FROM public.daily_activity
    WHERE user_id = v_caller_id AND day = v_cairo_today
    FOR UPDATE;

    v_available_xp := GREATEST(0, v_daily_cap - v_current_day_xp);

    FOR v_elem IN SELECT * FROM jsonb_array_elements(events)
    LOOP
        BEGIN
            v_event_id := (v_elem->>'id')::UUID;
        v_event_type := v_elem->>'type';
        v_lec_id := (v_elem->>'lectureId')::INT;
        v_event_payload := coalesce(v_elem->'payload', '{}'::JSONB);
        v_client_time := coalesce((v_elem->>'clientTs')::TIMESTAMPTZ, now());

        -- 1. Idempotency Check: insert into activity_events
        INSERT INTO public.activity_events (id, user_id, event_type, lecture_id, payload, client_ts)
        VALUES (v_event_id, v_caller_id, v_event_type, v_lec_id, v_event_payload, v_client_time)
        ON CONFLICT (id) DO NOTHING;

        -- If row was not inserted, it is a duplicate replay -> skip
        IF NOT FOUND THEN
            CONTINUE;
        END IF;

        -- 2. Calculate Base XP strictly for completed milestones
        v_event_xp := 0;
        CASE v_event_type
            WHEN 'media.completed' THEN
                IF v_event_payload->>'kind' = 'video' THEN
                    v_event_xp := 35;
                ELSE
                    v_event_xp := 25;
                END IF;

            WHEN 'audio.streak_5min' THEN
                v_event_xp := 5;

            WHEN 'video.streak_5min' THEN
                v_event_xp := 10;

            WHEN 'quiz.finished' THEN
                DECLARE
                    q_score INT := coalesce((v_event_payload->>'score')::INT, 0);
                    q_total INT := coalesce((v_event_payload->>'total')::INT, 1);
                    q_duration INT := coalesce((v_event_payload->>'durationMs')::INT, 0);
                    already_finished_today BOOLEAN := false;
                BEGIN
                    -- Deliberation speed filter >= 3000ms
                    IF q_duration >= 3000 AND v_lec_id IS NOT NULL THEN
                        -- Daily replay guard: exactly 1 completion award per lecture per Cairo day
                        SELECT EXISTS (
                            SELECT 1 FROM public.activity_events a
                            WHERE a.user_id = v_caller_id
                              AND a.event_type = 'quiz.finished'
                              AND a.lecture_id = v_lec_id
                              AND a.id <> v_event_id
                              AND a.server_ts >= v_cairo_day_start AND a.server_ts < v_cairo_day_end
                        ) INTO already_finished_today;

                        IF NOT already_finished_today THEN
                            v_event_xp := 10 + round((q_score::NUMERIC / GREATEST(q_total, 1)) * 40);
                            IF q_score = q_total AND q_total >= 5 THEN
                                v_event_xp := v_event_xp + 25; -- Perfect score bonus
                            END IF;
                        ELSE
                            v_event_xp := 0;
                        END IF;
                    ELSE
                        v_event_xp := 0;
                    END IF;
                END;

            WHEN 'quiz.question_answered' THEN
                DECLARE
                    q_hash TEXT := v_event_payload->>'questionHash';
                    q_correct BOOLEAN := coalesce((v_event_payload->>'isCorrect')::BOOLEAN, false);
                    q_duration INT := coalesce((v_event_payload->>'durationMs')::INT, 0);
                    already_answered_today BOOLEAN := false;
                BEGIN
                    IF q_correct AND q_duration >= 3000 AND q_hash IS NOT NULL THEN
                        -- Idempotency check: 1 reward per question per Cairo day using index
                        SELECT EXISTS (
                            SELECT 1 FROM public.activity_events a
                            WHERE a.user_id = v_caller_id
                              AND a.event_type = 'quiz.question_answered'
                              AND a.payload->>'questionHash' = q_hash
                              AND (a.payload->>'isCorrect')::BOOLEAN = true
                              AND a.id <> v_event_id
                              AND a.server_ts >= v_cairo_day_start AND a.server_ts < v_cairo_day_end
                        ) INTO already_answered_today;

                        IF NOT already_answered_today THEN
                            v_event_xp := 5; -- Base question mastery
                            IF v_event_payload->>'confidence' = 'high' THEN
                                v_event_xp := v_event_xp + 3; -- Confidence bonus
                            END IF;
                        ELSE
                            v_event_xp := 0;
                        END IF;
                    ELSE
                        v_event_xp := 0;
                    END IF;

                    -- Automatic Server-Side Notebook Ingestion for mistakes (isolated sub-transaction)
                    IF NOT q_correct AND q_hash IS NOT NULL AND v_lec_id IS NOT NULL THEN
                        BEGIN
                            INSERT INTO public.mistake_notebook (
                                user_id, lecture_id, question_hash, question_text, 
                                correct_answer, user_last_mistake, explanation, 
                                box_level, next_review_date
                            )
                            VALUES (
                                v_caller_id, v_lec_id, q_hash,
                                coalesce(v_event_payload->>'questionText', 'سؤال المحاضرة'),
                                coalesce(v_event_payload->>'correctAnswer', ''),
                                coalesce(v_event_payload->>'userAnswer', ''),
                                v_event_payload->>'explanation',
                                1,
                                v_cairo_today + 1
                            )
                            ON CONFLICT (user_id, question_hash) DO UPDATE SET
                                user_last_mistake = EXCLUDED.user_last_mistake,
                                box_level = 1,
                                next_review_date = v_cairo_today + 1,
                                is_mastered = false,
                                updated_at = now();
                        EXCEPTION WHEN OTHERS THEN
                            -- Log error to ingestion_errors without aborting batch
                            INSERT INTO public.ingestion_errors (user_id, event_id, event_type, error_message, payload)
                            VALUES (v_caller_id, v_event_id, v_event_type, SQLERRM, v_event_payload);
                            RAISE WARNING 'Mistake notebook upsert failed for hash %: %', q_hash, SQLERRM;
                        END;
                    END IF;
                END;

            WHEN 'quiz.mistake_reviewed' THEN
                -- Deliberate spaced retrieval recall awards 15 XP
                v_event_xp := 15;

            WHEN 'flashcard.deck_completed' THEN
                v_event_xp := 15;

            WHEN 'study_guide.read' THEN
                v_event_xp := 15;

            WHEN 'lecture.completed' THEN
                v_event_xp := 50;

            ELSE
                -- Raw progress, session.*, and unknown events award ZERO XP
                v_event_xp := 0;
        END CASE;

        -- 3. Check and apply daily cap
        v_effective_xp := LEAST(v_event_xp, v_available_xp);
        v_available_xp := v_available_xp - v_effective_xp;
        v_total_effective_xp := v_total_effective_xp + v_effective_xp;

        -- 4. Update daily_activity only if meaningful XP or item completion
        IF v_effective_xp > 0 OR v_event_xp > 0 THEN
            UPDATE public.daily_activity SET
                xp_earned = daily_activity.xp_earned + v_effective_xp,
                items_completed = daily_activity.items_completed + 1,
                updated_at = now()
            WHERE user_id = v_caller_id AND day = v_cairo_today;
        END IF;

        -- 5. Update lecture_progress if lecture_id provided
        IF v_lec_id IS NOT NULL THEN
            INSERT INTO public.lecture_progress (user_id, lecture_id)
            VALUES (v_caller_id, v_lec_id)
            ON CONFLICT (user_id, lecture_id) DO NOTHING;

            IF v_event_type = 'media.completed' THEN
                IF v_event_payload->>'kind' = 'video' THEN
                    UPDATE public.lecture_progress SET video_completed = true, updated_at = now()
                    WHERE user_id = v_caller_id AND lecture_id = v_lec_id;
                ELSE
                    UPDATE public.lecture_progress SET audio_completed = true, updated_at = now()
                    WHERE user_id = v_caller_id AND lecture_id = v_lec_id;
                END IF;
            ELSIF v_event_type = 'quiz.finished' THEN
                UPDATE public.lecture_progress SET 
                    quiz_completed = true,
                    quiz_score = (v_event_payload->>'score')::INT,
                    quiz_total = (v_event_payload->>'total')::INT,
                    updated_at = now()
                WHERE user_id = v_caller_id AND lecture_id = v_lec_id;
            ELSIF v_event_type = 'flashcard.deck_completed' THEN
                UPDATE public.lecture_progress SET flashcards_completed = true, updated_at = now()
                WHERE user_id = v_caller_id AND lecture_id = v_lec_id;
            ELSIF v_event_type = 'study_guide.read' THEN
                UPDATE public.lecture_progress SET study_guide_read = true, updated_at = now()
                WHERE user_id = v_caller_id AND lecture_id = v_lec_id;
            END IF;
        END IF;

        -- 6. Check Achievements (Only for completed events)
        IF v_event_xp > 0 THEN
            -- First Step Badge (أول الغيث)
            IF NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = v_caller_id AND achievement_id = 'first_step') THEN
                INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (v_caller_id, 'first_step') ON CONFLICT DO NOTHING;
                v_newly_unlocked_badges := array_append(v_newly_unlocked_badges, 'first_step');
            END IF;

            -- Night Owl Badge (سهران مع فيرما)
            IF v_is_night_owl AND (v_event_type = 'quiz.finished' OR v_event_type = 'lecture.completed') THEN
                IF NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = v_caller_id AND achievement_id = 'night_owl') THEN
                    INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (v_caller_id, 'night_owl') ON CONFLICT DO NOTHING;
                    v_newly_unlocked_badges := array_append(v_newly_unlocked_badges, 'night_owl');
                END IF;
            END IF;

            -- Perfect Quiz Badge (قناص الدرجات)
            IF v_event_type = 'quiz.finished' AND (v_event_payload->>'score')::INT = (v_event_payload->>'total')::INT AND (v_event_payload->>'total')::INT >= 5 THEN
                IF NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = v_caller_id AND achievement_id = 'perfect_quiz') THEN
                    INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (v_caller_id, 'perfect_quiz') ON CONFLICT DO NOTHING;
                    v_newly_unlocked_badges := array_append(v_newly_unlocked_badges, 'perfect_quiz');
                END IF;
            END IF;

            -- Five of Five Badge (دحيح الدفعة)
            IF v_event_type = 'lecture.completed' THEN
                IF NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = v_caller_id AND achievement_id = 'five_of_five') THEN
                    INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (v_caller_id, 'five_of_five') ON CONFLICT DO NOTHING;
                    v_newly_unlocked_badges := array_append(v_newly_unlocked_badges, 'five_of_five');
                END IF;
            END IF;
        END IF;
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO public.ingestion_errors (user_id, event_id, event_type, error_message, payload)
            VALUES (v_caller_id, v_event_id, v_event_type, SQLERRM, v_event_payload);
            RAISE WARNING 'Event % failed: %', v_event_id, SQLERRM;
        END;
    END LOOP;

    -- 7. Update Daily Streak only if student earned XP or completed a meaningful activity today
    IF v_total_effective_xp > 0 THEN
        IF v_prof.last_active_date IS NULL THEN
            v_prof.current_streak := 1;
            v_prof.longest_streak := 1;
            v_prof.last_active_date := v_cairo_today;
        ELSIF v_prof.last_active_date = v_cairo_today THEN
            -- Already counted today
            NULL;
        ELSIF v_prof.last_active_date = v_cairo_yesterday THEN
            v_prof.current_streak := v_prof.current_streak + 1;
            v_prof.longest_streak := GREATEST(v_prof.longest_streak, v_prof.current_streak);
            v_prof.last_active_date := v_cairo_today;
        ELSIF (v_cairo_today - v_prof.last_active_date) = 2 AND v_prof.freezes_left > 0 THEN
            -- Streak Freeze Protected!
            v_prof.freezes_left := v_prof.freezes_left - 1;
            v_prof.current_streak := v_prof.current_streak + 1;
            v_prof.longest_streak := GREATEST(v_prof.longest_streak, v_prof.current_streak);
            v_prof.last_active_date := v_cairo_today;
        ELSE
            -- Streak broken
            v_prof.current_streak := 1;
            v_prof.last_active_date := v_cairo_today;
        END IF;

        -- Streak Badges
        IF v_prof.current_streak >= 3 THEN
            IF NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = v_caller_id AND achievement_id = 'streak_3') THEN
                INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (v_caller_id, 'streak_3') ON CONFLICT DO NOTHING;
                v_newly_unlocked_badges := array_append(v_newly_unlocked_badges, 'streak_3');
            END IF;
        END IF;
        IF v_prof.current_streak >= 7 THEN
            IF NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = v_caller_id AND achievement_id = 'streak_7') THEN
                INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (v_caller_id, 'streak_7') ON CONFLICT DO NOTHING;
                v_newly_unlocked_badges := array_append(v_newly_unlocked_badges, 'streak_7');
            END IF;
        END IF;
    END IF;

    -- 8. Apply Total XP and calculate Level: floor(sqrt(total_xp / 60)) + 1
    v_prof.total_xp := v_prof.total_xp + v_total_effective_xp;
    v_prof.level := floor(sqrt(v_prof.total_xp::NUMERIC / 60.0)) + 1;
    v_prof.updated_at := now();

    -- Save updated profile
    UPDATE public.profiles SET
        total_xp = v_prof.total_xp,
        level = v_prof.level,
        current_streak = v_prof.current_streak,
        longest_streak = v_prof.longest_streak,
        last_active_date = v_prof.last_active_date,
        freezes_left = v_prof.freezes_left,
        updated_at = now()
    WHERE id = v_caller_id;

    -- 9. Return atomic reconciled response with guaranteed awardedXp key
    RETURN jsonb_build_object(
        'success', true,
        'awardedXp', v_total_effective_xp,
        'profile', jsonb_build_object(
            'id', v_prof.id,
            'nickname', v_prof.nickname,
            'persona', v_prof.persona,
            'totalXp', v_prof.total_xp,
            'level', v_prof.level,
            'currentStreak', v_prof.current_streak,
            'longestStreak', v_prof.longest_streak,
            'lastActiveDate', v_prof.last_active_date,
            'freezesLeft', v_prof.freezes_left
        ),
        'newBadges', to_jsonb(v_newly_unlocked_badges)
    );
END;
$$;

NOTIFY pgrst, 'reload schema';
