-- 036_confirm_demo_seed_users.sql
-- QA-Dev Loop fix: demo seed users (admin/teacher/student/parent/principal @edusync.dev)
-- lacked email_confirmed_at, causing bootstrap to set requires_email_verification=true
-- which redirected every login to /verify-email. Mark all pre-seeded @edusync.dev
-- accounts as confirmed so role-based flows are reachable for QA sweeps.

UPDATE public.users
   SET email_confirmed_at = COALESCE(email_confirmed_at, now())
 WHERE email LIKE '%@edusync.dev'
   AND email_confirmed_at IS NULL;
