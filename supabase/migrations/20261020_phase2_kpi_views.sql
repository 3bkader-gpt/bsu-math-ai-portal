-- ====================================================================
-- Phase 2 Soft Launch: Analytics & KPI SQL Views
-- Designed to measure real student cohort behavior (10-20 students)
-- 1. v_kpi_mistake_review_completion: Spaced repetition retrieval health
-- 2. v_kpi_time_to_first_action: Friction & activation speed
-- 3. v_kpi_retention_d7: Multi-day Cairo cohort retention
-- 4. v_kpi_daily_cohort_summary: High-level daily telemetry health
-- ====================================================================

-- 1. Mistake Review Completion Rate
CREATE OR REPLACE VIEW public.v_kpi_mistake_review_completion AS
SELECT 
    COUNT(*) AS total_mistakes_recorded,
    COUNT(*) FILTER (WHERE box_level > 1) AS mistakes_successfully_reviewed,
    COUNT(*) FILTER (WHERE box_level = 5 OR is_mastered = true) AS mistakes_fully_mastered,
    COUNT(*) FILTER (WHERE next_review_date <= (now() AT TIME ZONE 'Africa/Cairo')::DATE) AS currently_due_count,
    ROUND(
        COUNT(*) FILTER (WHERE box_level > 1)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 
        2
    ) AS review_completion_pct
FROM public.mistake_notebook;

-- 2. Time to First Action KPI
CREATE OR REPLACE VIEW public.v_kpi_time_to_first_action AS
SELECT 
    payload->>'actionType' AS first_action_type,
    COUNT(*) AS session_count,
    ROUND(AVG((payload->>'timeToFirstActionMs')::NUMERIC / 1000.0), 2) AS avg_time_to_first_action_sec,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (payload->>'timeToFirstActionMs')::NUMERIC / 1000.0)::NUMERIC, 2) AS median_time_to_first_action_sec
FROM public.activity_events
WHERE event_type = 'session.first_action'
GROUP BY payload->>'actionType';

-- 3. Daily Cohort Activity Summary
CREATE OR REPLACE VIEW public.v_kpi_daily_cohort_summary AS
SELECT 
    day,
    COUNT(DISTINCT user_id) AS active_students_dau,
    SUM(xp_earned) AS total_xp_distributed,
    ROUND(AVG(xp_earned), 1) AS avg_xp_per_student,
    SUM(items_completed) AS total_learning_items_completed,
    ROUND(SUM(seconds_active) / 60.0, 1) AS total_active_minutes
FROM public.daily_activity
GROUP BY day
ORDER BY day DESC;

-- 4. Cohort D7 Retention View
CREATE OR REPLACE VIEW public.v_kpi_retention_d7 AS
WITH student_first_day AS (
    SELECT 
        user_id,
        MIN(day) AS signup_day
    FROM public.daily_activity
    GROUP BY user_id
),
retention_matrix AS (
    SELECT 
        s.signup_day,
        s.user_id,
        (a.day - s.signup_day) AS day_diff
    FROM student_first_day s
    JOIN public.daily_activity a ON s.user_id = a.user_id
)
SELECT 
    signup_day,
    COUNT(DISTINCT user_id) AS cohort_size,
    COUNT(DISTINCT CASE WHEN day_diff = 1 THEN user_id END) AS retained_d1,
    COUNT(DISTINCT CASE WHEN day_diff = 3 THEN user_id END) AS retained_d3,
    COUNT(DISTINCT CASE WHEN day_diff = 7 THEN user_id END) AS retained_d7,
    ROUND(COUNT(DISTINCT CASE WHEN day_diff = 1 THEN user_id END)::NUMERIC / NULLIF(COUNT(DISTINCT user_id), 0) * 100, 1) AS d1_pct,
    ROUND(COUNT(DISTINCT CASE WHEN day_diff = 7 THEN user_id END)::NUMERIC / NULLIF(COUNT(DISTINCT user_id), 0) * 100, 1) AS d7_pct
FROM retention_matrix
GROUP BY signup_day
ORDER BY signup_day DESC;

-- Grant SELECT only to authenticated & service_role
GRANT SELECT ON public.v_kpi_mistake_review_completion TO authenticated, service_role;
GRANT SELECT ON public.v_kpi_time_to_first_action TO authenticated, service_role;
GRANT SELECT ON public.v_kpi_daily_cohort_summary TO authenticated, service_role;
GRANT SELECT ON public.v_kpi_retention_d7 TO authenticated, service_role;
