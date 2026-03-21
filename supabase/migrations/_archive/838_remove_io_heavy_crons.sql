-- Remove IO-heavy pg_cron jobs that run constantly even with 0 active users
-- These computations are now handled by:
--   a) Database triggers (badge/XP/streak — event-driven instead of scheduled)
--   b) On-demand client calls (analytics — teacher-triggered refresh)
--   c) Increased intervals for remaining jobs

DO $$
BEGIN
  -- Analytics cron jobs (heaviest IO — reads all course data every 5-15 min)
  BEGIN SELECT cron.unschedule('refresh-all-course-stats'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN SELECT cron.unschedule('refresh-course-stats'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN SELECT cron.unschedule('detect-new-struggles'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN SELECT cron.unschedule('compute-retention'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN SELECT cron.unschedule('compute-predictions'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN SELECT cron.unschedule('generate-recommendations'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN SELECT cron.unschedule('process-progress-events-safety'); EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Badge/XP/streak jobs — killed and re-scheduled at reduced frequency below
  BEGIN SELECT cron.unschedule('check-badge-eligibility'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN SELECT cron.unschedule('badge-xp-streak-processor'); EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Also try the combined job name in case it was scheduled as one
  BEGIN SELECT cron.unschedule('check-badge-eligibility + badge-xp-streak-processor'); EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Remove the batch variant for course stats
  BEGIN SELECT cron.unschedule('refresh-course-stats batch'); EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- Re-schedule badge+XP+streak at 30min instead of 5min
-- Gamification lag of up to 30min is acceptable on free tier.
-- Covers the case where badge eligibility checks still need server authority
-- (e.g. milestones that cannot be safely computed client-side).
SELECT cron.schedule(
  'badge-xp-streak-30min',
  '*/30 * * * *',
  $$SELECT check_badge_eligibility(NULL); SELECT process_xp_awards();$$
);
