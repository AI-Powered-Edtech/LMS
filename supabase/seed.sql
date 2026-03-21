-- =============================================================================
-- EduSync LMS — Master Seed File
-- =============================================================================
-- Jalankan otomatis oleh: supabase db reset
-- Atau manual via SQL Editor setelah migrasi selesai.
--
-- Urutan eksekusi:
--   1. seed_base.sql         → Buat tenant demo + enable modules
--   2. seed_users.sql        → Buat user di auth.users (teacher, student, admin)
--   3. seed_demo.sql         → Buat profiles, roles, courses, quizzes, classes
--   4. seed_gamification.sql → XP events, streaks, badges, leaderboard data
--
-- Semua file IDEMPOTENT — aman dijalankan berulang kali.
--
-- Dev accounts (password: password123):
--   teacher@edusync.dev  — TEACHER role
--   student@edusync.dev  — STUDENT role
--   admin@edusync.dev    — ADMIN role
-- =============================================================================

-- 1. Tenant infrastructure
\i seed/seed_base.sql

-- 2. Auth users (password: password123)
\i seed/seed_users.sql

-- 3. Demo data (courses, modules, lessons, quizzes, classes, enrollments)
\i seed/seed_demo.sql

-- 4. Gamification data (XP events, streaks, badges, leaderboard)
\i seed/seed_gamification.sql
