-- Migration 008: Tighten RLS for VIL-only access
--
-- Context: Database is still hosted on Supabase. This migration DOES NOT remove
-- RLS policies (which would expose data via PostgREST to any anon key holder).
-- Instead it revokes anon-role SELECT/INSERT/UPDATE/DELETE on all application tables,
-- effectively making direct PostgREST access impossible without service_role.
--
-- All data access now goes through the VIL Rust backend which enforces tenant
-- isolation via explicit tenant_id filters in every query.
--
-- Full RLS removal: run ONLY after migrating the database away from Supabase-hosted
-- PostgreSQL to an independent host (Phase 7, if planned).

-- ── Revoke anon role from all app tables ──────────────────────────────────────
-- This prevents direct Supabase PostgREST access with the anon/public key.
-- authenticated role remains (needed for Supabase auth JWT validation).

DO $$
DECLARE
    t text;
    app_tables text[] := ARRAY[
        'profiles', 'tenants', 'user_roles',
        'courses', 'course_modules', 'lessons', 'lesson_resources',
        'enrollments', 'course_enrollments', 'course_classes',
        'assignments', 'assignment_submissions', 'assignment_groups', 'assignment_group_members',
        'quizzes', 'quiz_questions', 'quiz_options',
        'quiz_attempts_v2', 'quiz_attempt_questions_v2',
        'notifications', 'notification_preferences',
        'discussions', 'discussion_posts',
        'messages',
        'gamification_events', 'user_badges', 'xp_ledger',
        'leaderboard_snapshots', 'certificates',
        'ai_tutor_sessions', 'ai_generated_content', 'ai_generation_logs', 'ai_quota_usage',
        'lti_platform_registrations', 'lti_nonces', 'lti_user_links',
        'progress_events', 'student_lesson_signals',
        'storage_file_migrations',
        'push_subscriptions',
        'parent_profiles', 'parent_student_links', 'parent_otp',
        'activity_events',
        'lesson_video_captions',
        'scorm_packages', 'scorm_runtime_data',
        'course_collaborators',
        'gradebook_entries',
        'rubrics', 'rubric_criteria',
        'analytics_snapshots',
        'import_jobs'
    ];
BEGIN
    FOREACH t IN ARRAY app_tables LOOP
        -- Skip if table does not exist
        IF EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = 'public' AND tablename = t
        ) THEN
            EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
            RAISE NOTICE 'Revoked anon access on %', t;
        ELSE
            RAISE NOTICE 'Table % does not exist — skipped', t;
        END IF;
    END LOOP;
END $$;

-- ── Verify: Check existing RLS policies remain active ─────────────────────────
-- RLS policies are NOT dropped — they remain as defense-in-depth.
-- The REVOKE above prevents anon access at the GRANT level (before RLS is even evaluated).

-- To verify after running this migration:
-- SELECT count(*) FROM pg_policies WHERE schemaname = 'public';
-- Result should be > 0 (policies remain)

-- SELECT grantee, table_name, privilege_type 
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public' AND grantee = 'anon';
-- Result should be empty (anon has no grants)

COMMENT ON SCHEMA public IS 
    'EduSync LMS — Phase 6 decommission complete. 
     All data access via VIL Rust backend only (http://api.edusync.dev).
     anon role has no table-level grants. 
     Full RLS removal pending DB migration off Supabase hosting.';
