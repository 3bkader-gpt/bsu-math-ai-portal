-- Migration: Add resume state tracking columns and RPC
-- Date: 2026-10-20

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_active_lecture_id INT REFERENCES public.lectures(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_active_tab TEXT DEFAULT 'guide';

CREATE OR REPLACE FUNCTION public.update_resume_state(
    p_lecture_id INT,
    p_tab TEXT DEFAULT 'guide',
    p_media_progress JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID;
BEGIN
    caller_id := auth.uid();
    IF caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- 1. Update last active lecture & tab in profiles
    UPDATE public.profiles
    SET 
        last_active_lecture_id = p_lecture_id,
        last_active_tab = coalesce(p_tab, 'guide'),
        updated_at = now()
    WHERE id = caller_id;

    -- 2. Upsert media progress in lecture_progress if lecture_id is valid
    IF p_lecture_id IS NOT NULL THEN
        INSERT INTO public.lecture_progress (user_id, lecture_id, media_progress, updated_at)
        VALUES (caller_id, p_lecture_id, coalesce(p_media_progress, '{}'::JSONB), now())
        ON CONFLICT (user_id, lecture_id) DO UPDATE SET
            media_progress = public.lecture_progress.media_progress || EXCLUDED.media_progress,
            updated_at = now();
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_resume_state(INT, TEXT, JSONB) TO authenticated;
