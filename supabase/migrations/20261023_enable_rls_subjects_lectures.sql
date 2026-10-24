-- ====================================================================
-- Security Fix: Enable RLS on subjects & lectures tables
-- Reason: Supabase security advisor flagged these tables as
--         publicly accessible without Row Level Security.
-- Date: 2026-10-23
-- ====================================================================

-- 1. Enable RLS on subjects (course catalog - read-only for everyone)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anon) to SELECT subjects (public course catalog)
DROP POLICY IF EXISTS "subjects_public_read" ON public.subjects;
CREATE POLICY "subjects_public_read"
  ON public.subjects
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only service_role can INSERT/UPDATE/DELETE subjects (admin only)
DROP POLICY IF EXISTS "subjects_service_write" ON public.subjects;
CREATE POLICY "subjects_service_write"
  ON public.subjects
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ====================================================================

-- 2. Enable RLS on lectures (public course catalog - read-only)
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;

-- Allow anyone to SELECT lectures
DROP POLICY IF EXISTS "lectures_public_read" ON public.lectures;
CREATE POLICY "lectures_public_read"
  ON public.lectures
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only service_role can INSERT/UPDATE/DELETE lectures
DROP POLICY IF EXISTS "lectures_service_write" ON public.lectures;
CREATE POLICY "lectures_service_write"
  ON public.lectures
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ====================================================================

-- 3. Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
