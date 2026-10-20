-- ====================================================================
-- Phase 2 Security Hardening: Supabase Advisors & Least Privilege
-- 1. Ensure RLS on public.ingestion_errors with zero policies (complete lockout of anon)
-- 2. Revoke EXECUTE from anon and PUBLIC on sensitive RPC functions
-- 3. Grant EXECUTE strictly to authenticated and service_role
-- 4. Set search_path = public, auth, pg_temp to prevent schema hijacking
-- ====================================================================

-- 1. Lock down public.ingestion_errors
ALTER TABLE public.ingestion_errors ENABLE ROW LEVEL SECURITY;

-- 2. Hardened search_path
ALTER FUNCTION public.ingest_events(JSONB) SET search_path = public, auth, pg_temp;
ALTER FUNCTION public.submit_mistake_review(TEXT, BOOLEAN, INT) SET search_path = public, auth, pg_temp;

-- 3. Enforce Least-Privilege Execution (Revoke anon & PUBLIC)
REVOKE EXECUTE ON FUNCTION public.ingest_events(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ingest_events(JSONB) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.submit_mistake_review(TEXT, BOOLEAN, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_mistake_review(TEXT, BOOLEAN, INT) TO authenticated, service_role;
