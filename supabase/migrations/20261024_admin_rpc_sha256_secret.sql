-- ====================================================================
-- Migration: Harden admin_upsert_lecture with SHA-256 Secret Verification
-- Date: 2026-10-24
-- Purpose:
--   Replace the previous authorization check (plaintext literal 'admin_academic_2026'
--   plus permissive fallbacks: 'bsu_master_academic_%', 'ey%' JWT prefix, or any
--   string >= 16 chars) with a strict SHA-256 digest comparison.
--
--   The plaintext master key (ADMIN_MASTER_KEY) lives ONLY in the backend
--   environment and is handed to the admin dashboard on successful login.
--   This file contains just its digest, so the secret itself never appears
--   in the repository or the client bundle.
--
--   To rotate the key: generate a new random value, update ADMIN_MASTER_KEY
--   in the backend env, and re-run this CREATE OR REPLACE with the new digest.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.admin_upsert_lecture(
    p_subject_id INT,
    p_lecture_num INT,
    p_title TEXT DEFAULT NULL,
    p_doctor TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'queued',
    p_stage_info TEXT DEFAULT 'تم الرفع سحابياً بنجاح، جاري بدء المعالجة بالذكاء الاصطناعي 🚀',
    p_admin_secret TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_lecture_id INT;
    v_clean_doctor TEXT;
    v_clean_title TEXT;
    v_result JSONB;
    -- SHA-256(ADMIN_MASTER_KEY). UTF-8, lowercase hex, no separators.
    v_expected_hash TEXT := '1eb091f24e673b5321f0bea52d12aeeabc23c53d23d8f3234f5f46a677aa39a7';
BEGIN
    -- Authorization check: strict constant-time-style digest comparison.
    IF p_admin_secret IS NULL OR encode(
        sha256(convert_to(p_admin_secret, 'UTF8')), 'hex'
    ) != v_expected_hash THEN
        RAISE EXCEPTION 'Unauthorized: Invalid admin credentials' USING ERRCODE = '42501';
    END IF;

    v_clean_doctor := NULLIF(trim(p_doctor), '');
    v_clean_title := NULLIF(trim(p_title), '');

    -- Find existing lecture record matching (subject_id, lecture_num, doctor)
    SELECT id INTO v_lecture_id
    FROM public.lectures
    WHERE subject_id = p_subject_id
      AND lecture_num = p_lecture_num
      AND (
          (doctor IS NULL AND v_clean_doctor IS NULL) OR
          (doctor = v_clean_doctor)
      )
    ORDER BY id ASC
    LIMIT 1;

    IF v_lecture_id IS NOT NULL THEN
        -- Update existing lecture
        UPDATE public.lectures
        SET title = COALESCE(v_clean_title, title),
            doctor = v_clean_doctor,
            status = COALESCE(p_status, 'queued'),
            stage_info = COALESCE(p_stage_info, stage_info),
            error_message = NULL,
            updated_at = NOW()
        WHERE id = v_lecture_id;
    ELSE
        -- Insert new lecture
        INSERT INTO public.lectures (
            subject_id,
            lecture_num,
            title,
            doctor,
            status,
            stage_info,
            created_at,
            updated_at
        )
        VALUES (
            p_subject_id,
            p_lecture_num,
            COALESCE(v_clean_title, 'المحاضرة ' || p_lecture_num),
            v_clean_doctor,
            COALESCE(p_status, 'queued'),
            COALESCE(p_stage_info, 'تم الرفع سحابياً بنجاح، جاري بدء المعالجة بالذكاء الاصطناعي 🚀'),
            NOW(),
            NOW()
        )
        RETURNING id INTO v_lecture_id;
    END IF;

    SELECT jsonb_build_object(
        'id', v_lecture_id,
        'subject_id', p_subject_id,
        'lecture_num', p_lecture_num,
        'title', COALESCE(v_clean_title, 'المحاضرة ' || p_lecture_num),
        'doctor', v_clean_doctor,
        'status', COALESCE(p_status, 'queued'),
        'stage_info', COALESCE(p_stage_info, 'تم الرفع سحابياً بنجاح، جاري بدء المعالجة بالذكاء الاصطناعي 🚀')
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- The digest gate above is the authorization boundary; keep the callable
-- surface unchanged (dashboard invokes it with the anon key).
GRANT EXECUTE ON FUNCTION public.admin_upsert_lecture(INT, INT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
