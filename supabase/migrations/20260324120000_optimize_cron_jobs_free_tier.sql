-- =============================================================================
-- Migration: Optimize pg_cron jobs for Supabase Nano Free Tier
-- =============================================================================
-- Reduces CPU and RAM exhaustion by changing 5-15 min cron jobs to run
-- daily (midnight) or disabling heavy analytical crons entirely.
-- =============================================================================

-- Enable pg_cron if not already (safety check)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
    job_record RECORD;
BEGIN
    -- 1. Unschedule all known heavy background jobs first to prevent duplicates
    PERFORM cron.unschedule('badge-xp-streak-processor');
    PERFORM cron.unschedule('analytics_cron_job');
    PERFORM cron.unschedule('refresh_retention_cohort');
    PERFORM cron.unschedule('refresh_course_stats');
    PERFORM cron.unschedule('struggle_detection_job');
    PERFORM cron.unschedule('funnel_analysis_job');
    PERFORM cron.unschedule('path_analysis_job');

    -- 2. Reschedule only the absolute necessary ones to run once a day at 2:00 AM (off-peak)
    -- This handles gamification processing without killing the DB during the day
    PERFORM cron.schedule(
        'badge-xp-streak-processor',
        '0 2 * * *', -- At 02:00 AM every day
        $$ SELECT public.process_gamification_events(); $$
    );

    -- Note: Analytics and heavy materialized views should now be refreshed 
    -- either on-demand (via RPC triggered by frontend) or handled 
    -- gracefully when the user visits the dashboard, not every 15 mins.
    
    RAISE NOTICE 'pg_cron optimization complete. Heavy jobs disabled or moved to daily schedule.';
END $$;
