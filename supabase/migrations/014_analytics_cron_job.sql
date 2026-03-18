-- ==========================================================================
-- Migration 14: Add Scheduled Analytics Refresh (pg_cron)
--
-- Automatic refresh of course statistics every 5 minutes
-- This ensures analytics data is always up-to-date without manual refresh
--
-- IMPORTANT: This requires Supabase Pro plan or higher for pg_cron
-- If pg_cron is not available, the refresh will happen on-demand via API
-- ==========================================================================

-- First, check if pg_cron extension is available
DO $$
BEGIN
    -- Try to create the extension if it doesn't exist
    -- This may fail on free tier Supabase, which is acceptable
    CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
    WHEN feature_not_supported THEN
        RAISE NOTICE 'pg_cron not available on this Supabase plan. Analytics will refresh on-demand only.';
    WHEN others THEN
        RAISE NOTICE 'Could not enable pg_cron: %', SQLERRM;
END
$$;

-- Grant necessary permissions for pg_cron
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create the scheduled job to refresh all course stats every 5 minutes
DO $$
BEGIN
    -- Unschedule any existing job with the same name first
    PERFORM cron.unschedule('refresh-all-course-stats');
EXCEPTION
    WHEN undefined_table THEN
        -- pg_cron not installed, that's fine
        NULL;
    WHEN OTHERS THEN
        -- Job doesn't exist yet (XX000) or any other non-fatal error, continue
        NULL;
END
$$;

-- Schedule the job (wrapped in DO to handle potential failures)
-- NOTE: outer block uses $outer$ to avoid conflict with $$ inside cron SQL string
DO $outer$
DECLARE
    job_id bigint;
BEGIN
    -- This will fail gracefully if pg_cron is not available
    job_id := cron.schedule(
        'refresh-all-course-stats',
        '*/5 * * * *',
        $cron_job$
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            -- Refresh stats for all active courses
            FOR r IN
                SELECT id FROM public.courses
                WHERE status = 'published'
                LIMIT 100
            LOOP
                BEGIN
                    PERFORM public.refresh_course_stats(r.id);
                EXCEPTION
                    WHEN others THEN
                        RAISE WARNING 'Failed to refresh stats for course %: %', r.id, SQLERRM;
                END;
            END LOOP;
        END
        $$
        $cron_job$
        );
    RAISE NOTICE 'Scheduled job created with ID: %', job_id;
EXCEPTION
    WHEN feature_not_supported THEN
        RAISE NOTICE 'pg_cron not available. Analytics will refresh on-demand only.';
    WHEN undefined_function THEN
        RAISE NOTICE 'cron.schedule function not available. Analytics will refresh on-demand only.';
    WHEN others THEN
        RAISE NOTICE 'Could not create scheduled job: %', SQLERRM;
END
$outer$;

-- Alternative: Create a function to manually trigger refresh for all courses
-- This can be called via API if pg_cron is not available
CREATE OR REPLACE FUNCTION public.refresh_all_course_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    r RECORD;
    v_count integer := 0;
BEGIN
    -- Only allow teachers/admins to run this
    IF (auth.jwt() ->> 'role') NOT IN ('teacher', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only teachers and admins can refresh all course stats';
    END IF;

    FOR r IN
        SELECT id FROM public.courses WHERE status = 'published'
    LOOP
        BEGIN
            PERFORM public.refresh_course_stats(r.id);
            v_count := v_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to refresh stats for course %: %', r.id, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'Refreshed stats for % courses', v_count;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.refresh_all_course_stats() IS
'Manually trigger refresh of all course statistics. Requires teacher or admin role.
Use this if pg_cron is not available on your Supabase plan.';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
