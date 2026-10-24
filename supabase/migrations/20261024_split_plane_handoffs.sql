-- ====================================================================
-- Migration: Split-Plane Pipeline — source_pdf_url + media_handoffs
-- Date: 2026-10-24
-- Blueprint: BLUEPRINT.md (rev 1)
--
-- 1. lectures.source_pdf_url: the dashboard stores the public Storage URL
--    of the uploaded PDF so the home Control-Plane daemon can fetch it
--    without any GitHub dispatch payload.
-- 2. media_handoffs: credential-bearing handoff queue from the Control
--    Plane (home) to the Data Plane (GitHub Actions). Holds artifact
--    download URLs + a fresh one-shot cookie jar. RLS is ENABLED with NO
--    anon/authenticated policies => only the service role (both planes
--    hold SERVICE_ROLE_KEY) can read/write. Rows are purged by the Data
--    Plane immediately after consumption (cookies are account-equivalent).
-- 3. admin_upsert_lecture: new p_source_pdf_url parameter (8-arg
--    signature). The previous 7-arg version is dropped to avoid signature
--    ambiguity. SHA-256 authorization gate unchanged.
-- ====================================================================

-- 1. Source PDF URL on lectures
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS source_pdf_url TEXT;

-- 2. Media handoff queue (service-role only)
CREATE TABLE IF NOT EXISTS public.media_handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecture_id INT NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
    notebook_id TEXT,
    subject_name TEXT,
    lecture_num INT,
    lecture_title TEXT,
    doctor TEXT,
    audio_url TEXT,
    video_url TEXT,
    cookie_jar JSONB,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.media_handoffs ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: anon/authenticated get nothing; service_role
-- bypasses RLS and is the only accessor (both pipeline planes use it).

-- 3. Replace admin_upsert_lecture with the 8-arg source-aware version
DROP FUNCTION IF EXISTS public.admin_upsert_lecture(INT, INT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.admin_upsert_lecture(
    p_subject_id INT,
    p_lecture_num INT,
    p_title TEXT DEFAULT NULL,
    p_doctor TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'queued',
    p_stage_info TEXT DEFAULT 'تم الرفع سحابياً بنجاح، جاري بدء المعالجة بالذكاء الاصطناعي 🚀',
    p_admin_secret TEXT DEFAULT NULL,
    p_source_pdf_url TEXT DEFAULT NULL
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
    -- SHA-256(ADMIN_MASTER_KEY). Rotate together with the backend env var.
    v_expected_hash TEXT := '1eb091f24e673b5321f0bea52d12aeeabc23c53d23d8f3234f5f46a677aa39a7';
BEGIN
    IF p_admin_secret IS NULL OR encode(
        sha256(convert_to(p_admin_secret, 'UTF8')), 'hex'
    ) != v_expected_hash THEN
        RAISE EXCEPTION 'Unauthorized: Invalid admin credentials' USING ERRCODE = '42501';
    END IF;

    v_clean_doctor := NULLIF(trim(p_doctor), '');
    v_clean_title := NULLIF(trim(p_title), '');

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
        UPDATE public.lectures
        SET title = COALESCE(v_clean_title, title),
            doctor = v_clean_doctor,
            status = COALESCE(p_status, 'queued'),
            stage_info = COALESCE(p_stage_info, stage_info),
            source_pdf_url = COALESCE(p_source_pdf_url, source_pdf_url),
            error_message = NULL,
            updated_at = NOW()
        WHERE id = v_lecture_id;
    ELSE
        INSERT INTO public.lectures (
            subject_id, lecture_num, title, doctor, status, stage_info,
            source_pdf_url, created_at, updated_at
        )
        VALUES (
            p_subject_id,
            p_lecture_num,
            COALESCE(v_clean_title, 'المحاضرة ' || p_lecture_num),
            v_clean_doctor,
            COALESCE(p_status, 'queued'),
            COALESCE(p_stage_info, 'تم الرفع سحابياً بنجاح، جاري بدء المعالجة بالذكاء الاصطناعي 🚀'),
            p_source_pdf_url,
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
        'status', COALESCE(p_status, 'queued')
    ) INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_lecture(INT, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
