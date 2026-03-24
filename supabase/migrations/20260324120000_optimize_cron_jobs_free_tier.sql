-- Enable pg_cron if not already
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
    -- 1. Unschedule all known heavy background jobs first to prevent duplicates
    PERFORM cron.unschedule('badge-xp-streak-processor');
    PERFORM cron.unschedule('analytics_cron_job');
    PERFORM cron.unschedule('refresh_retention_cohort');
    PERFORM cron.unschedule('refresh_course_stats');
    PERFORM cron.unschedule('struggle_detection_job');
    PERFORM cron.unschedule('funnel_analysis_job');
    PERFORM cron.unschedule('path_analysis_job');

    -- 2. Reschedule only gamification (which doesn't rely on massive MAT VIEWs)
    -- to run once a day at 2:00 AM. 
    -- We pass the SQL execution as a literal string block.
    PERFORM cron.schedule(
        'badge-xp-streak-processor',
        '0 2 * * *',
        'SELECT public.process_gamification_events();'
    );
END $$;
