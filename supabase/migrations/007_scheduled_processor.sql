-- ==========================================================================
-- Migration: Scheduled Safety Processor
--
-- Creates a pg_cron job that invokes process-progress-events every 30 seconds
-- as a fail-safe in case fire-and-forget triggers from progress-events miss.
--
-- The advisory lock inside the Edge Function ensures only one processor
-- runs at a time, so this cron is safe even if the fire-and-forget is
-- already processing.
--
-- Prerequisites:
--   - pg_cron extension must be enabled in Supabase dashboard
--   - pg_net extension must be enabled for http calls from SQL
-- ==========================================================================

-- Enable required extensions (idempotent)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule the safety processor every 30 seconds
-- Uses pg_net to make an HTTP POST to the Edge Function
select cron.schedule(
  'process-progress-events-safety',   -- job name
  '30 seconds',                       -- interval
  $$
    select net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/process-progress-events',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);
