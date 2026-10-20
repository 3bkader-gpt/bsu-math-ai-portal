-- ====================================================================
-- Secure KPI Views: Restrict to service_role & Enable security_invoker
-- Prevents leakage of cohort metrics to anon and authenticated students.
-- ====================================================================

-- 1. Revoke public/anon/authenticated access
REVOKE ALL ON public.v_kpi_mistake_review_completion FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_kpi_time_to_first_action FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_kpi_daily_cohort_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_kpi_retention_d7 FROM PUBLIC, anon, authenticated;

-- 2. Grant SELECT exclusively to service_role and postgres
GRANT SELECT ON public.v_kpi_mistake_review_completion TO service_role, postgres;
GRANT SELECT ON public.v_kpi_time_to_first_action TO service_role, postgres;
GRANT SELECT ON public.v_kpi_daily_cohort_summary TO service_role, postgres;
GRANT SELECT ON public.v_kpi_retention_d7 TO service_role, postgres;

-- 3. Set security_invoker = true on Postgres 15+
DO $$
BEGIN
    ALTER VIEW public.v_kpi_mistake_review_completion SET (security_invoker = true);
    ALTER VIEW public.v_kpi_time_to_first_action SET (security_invoker = true);
    ALTER VIEW public.v_kpi_daily_cohort_summary SET (security_invoker = true);
    ALTER VIEW public.v_kpi_retention_d7 SET (security_invoker = true);
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'security_invoker could not be set: %', SQLERRM;
END $$;
