# Database Migration Reset Guide

This document explains how to initialize and reset the EduSync database using Supabase migrations.

## Overview

EduSync uses Supabase migrations to manage database schema changes. The migration system has been audited and hardened to ensure idempotency - migrations can be safely run multiple times without causing errors.

## Quick Start

### Reset Database from Scratch

To completely reset the database and apply all migrations from a fresh state:

```bash
# Using Supabase CLI
supabase db reset

# Or with custom project
supabase db reset --project-ref <your-project-ref>
```

This command will:
1. Drop all existing tables and data
2. Apply all migrations in sequence (001_migration.sql → 825_seed_default_tenant.sql)
3. Seed any configured initial data

## Migration Chain Structure

The migrations are numbered and organized as follows:

| Range | Purpose |
|-------|---------|
| 001–099 | Core schema, auth, RLS, analytics, gamification v1, quiz engine v1/v2 |
| 100–199 | Storage RLS, quiz audit, RLS standardization, security hardening |
| 200–299 | JWT role fixes, admin security |
| 300–499 | Archived/ignored (v1 consolidation) |
| 800–820 | Smart Player events, aggregation engine, advanced analytics |
| 821–822 | Achievements (badges v2), XP/streaks/leaderboard v2 |
| 823–825 | Registration helpers, attendance, default tenant seed |

### Key Migrations

- **`001_migration.sql`** — Baseline schema (~4900 lines). Core tables, indexes, functions, triggers, RLS policies, `handle_new_user()` trigger.
- **`082_class_assignment_quiz_v2_refactor.sql`** — Major quiz v2 refactor introducing `quiz_attempts_v2`.
- **`095_quiz_security_fixes.sql`** — Quiz security hardening, anti-cheat.
- **`808_learning_events.sql`** — Structured event log for Smart Player.
- **`810_analytics_aggregation_tables.sql`** — Aggregation engine tables + `aggregation_state` watermark.
- **`821_achievements.sql`** — Badge definitions, student_badges, certificates; `check_badge_eligibility()` pg_cron.
- **`822_streaks_xp.sql`** — XP transactions, student_xp_summary, leaderboard v2, `process_xp_awards()` pg_cron.
- **`825_seed_default_tenant.sql`** — Seeds default tenant UUID `00000000-0000-0000-0000-000000000001` required by `handle_new_user()` on fresh projects.

## Idempotency Guarantees

The migration chain has been hardened to ensure idempotent execution:

### ✅ Safe Patterns Used

```sql
-- Tables: Only create if not exists
CREATE TABLE IF NOT EXISTS table_name (...);

-- Indexes: Only create if not exists
CREATE INDEX IF NOT EXISTS idx_name ON table_name (...);

-- Functions: Replace if exists
CREATE OR REPLACE FUNCTION function_name(...);

-- Policies: Drop before create
DROP POLICY IF EXISTS "policy_name" ON table_name;
CREATE POLICY "policy_name" ON table_name ...;

-- Triggers: Drop if exists before creating
DROP TRIGGER IF EXISTS trigger_name ON table_name;
CREATE TRIGGER trigger_name ...;

-- Inserts: Conflict-safe
INSERT INTO table (...) VALUES (...) ON CONFLICT DO NOTHING;

-- pg_cron: Unschedule before schedule
DO $$ BEGIN PERFORM cron.unschedule('job-name'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('job-name', ...);
```

## Fresh Project Setup

When applying migrations on a brand-new Supabase project, note:

- **`825_seed_default_tenant.sql`** must run before any user sign-up — it seeds the default tenant that `handle_new_user()` fallbacks to.
- pg_cron extension must be enabled on the Supabase project for migrations 810–822 (aggregation + gamification cron jobs).
- `supabase db push` applies migrations in filename-sorted order — duplicate prefixes would be ambiguous. All migration filenames are unique.

## Troubleshooting

### "relation already exists" Error

This should not occur after the migration hardening. If seen, it indicates a migration is missing `IF NOT EXISTS`. Please report this issue.

### "relation does not exist" Error

This indicates a dependency issue where a migration references an object created in a later migration. This should not occur in the current migration chain.

### Migration Fails on Fresh Database

If migrations fail on a fresh database but work on an existing one:

1. Verify `825_seed_default_tenant.sql` is present (required for FK in `handle_new_user()`)
2. Check that pg_cron extension is enabled for cron-dependent migrations
3. Try resetting with: `supabase db reset --db-url <your-db-url>`

## Development Workflow

### Adding New Migrations

When adding new features:

1. Create a new migration file with an incrementing number (next after 825)
2. Use idempotent patterns:
   - `CREATE TABLE IF NOT EXISTS`
   - `CREATE INDEX IF NOT EXISTS`
   - `CREATE OR REPLACE FUNCTION`
   - `DROP POLICY IF EXISTS` before `CREATE POLICY`
   - `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`
   - `INSERT ... ON CONFLICT DO NOTHING`
3. Test on a fresh database using `supabase db reset`

### Recommended Testing

```bash
# Before pushing changes
supabase db reset

# Verify with a simple query
psql -c "SELECT COUNT(*) FROM courses;"
```

## Migration Files Reference

Total: **157 migration files** (range: 001–825)

- **Core Schema**: 001_migration.sql
- **Extensions**: pg_graphql, pg_stat_statements, pgcrypto, uuid-ossp, vector, pg_cron
- **Core Tables**: tenants, profiles, courses, modules, lessons, quizzes, enrollments, etc.
- **Analytics Engine**: student_lesson_signals, lesson_analytics_summary, course_analytics_summary, aggregation_state
- **Advanced Analytics**: predictive_alerts, struggle_alerts, funnel_definitions, student_cohorts
- **Gamification v2**: badge_definitions, student_badges, certificates, xp_transactions, student_xp_summary
- **Quiz v2**: quiz_attempts_v2, quiz_attempt_questions (canonical; legacy quiz_attempts retained for gradebook)
- **Guidance**: guidance_tours, user_guidance_state
- **Attendance**: attendance_records (per-class daily scan sessions)
- **Registration**: public_lookup_class(), enroll_student() RPCs; default tenant seed

## Support

For migration-related issues:
1. Check the migration chain ordering in `supabase/migrations/`
2. Verify `001_migration.sql` contains the baseline schema
3. Verify `825_seed_default_tenant.sql` is present for fresh project setup
