-- ====================================================================
-- Migration: Admin Autonomous Cloud Pipeline & Extended RLS Hardening
-- Date: 2026-10-24
-- Purpose:
-- 1. Enable RLS on public.media_assets (Public SELECT, Service-role write).
-- 2. Enable RLS on public.users (Strict Service-role access only; protect password hashes).
--
-- NOTE (2026-10-24 security hardening): the original insecure
-- 'admin_upsert_lecture' definition (plaintext secret + permissive
-- fallbacks) that lived in this file was REMOVED so that a fresh schema
-- rebuild can never reintroduce it. The only authorized definition is the
-- SHA-256-gated version in 20261024_admin_rpc_sha256_secret.sql — this
-- file must be applied BEFORE that one.
-- ====================================================================

-- 2. Lock down media_assets table
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_assets_public_read" ON public.media_assets;
CREATE POLICY "media_assets_public_read"
  ON public.media_assets
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "media_assets_service_write" ON public.media_assets;
CREATE POLICY "media_assets_service_write"
  ON public.media_assets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ====================================================================

-- 3. Lock down users table (Only service_role / direct backend can access)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_service_all" ON public.users;
CREATE POLICY "users_service_all"
  ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ====================================================================

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
