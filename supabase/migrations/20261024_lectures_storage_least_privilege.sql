-- ====================================================================
-- Migration: Tighten lectures Storage Bucket Policies
-- Date: 2026-10-24
-- Purpose:
--   The lectures bucket previously had a single 'FOR ALL ... TO public'
--   policy, allowing anonymous UPDATE and DELETE of lecture PDFs.
--   Split into least-privilege policies while preserving both live flows:
--     - Student reads (public object URL)          -> SELECT public
--     - Autonomous dashboard PDF upload (anon key) -> INSERT public
--     - Backend / pipeline maintenance             -> service_role ALL
--   Anonymous UPDATE / DELETE are revoked.
-- ====================================================================

DROP POLICY IF EXISTS "Public Access lectures bucket" ON storage.objects;
DROP POLICY IF EXISTS "lectures_public_read" ON storage.objects;
DROP POLICY IF EXISTS "lectures_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "lectures_service_all" ON storage.objects;

CREATE POLICY "lectures_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'lectures');

CREATE POLICY "lectures_public_insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'lectures');

CREATE POLICY "lectures_service_all"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'lectures')
  WITH CHECK (bucket_id = 'lectures');
