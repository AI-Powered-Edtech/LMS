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
2. Apply all migrations in sequence (01_migration.sql → 94_quiz_autosave_history_timer.sql)
3. Seed any configured initial data

## Migration Chain Structure

The migrations are numbered and organized as follows:

| Range | Purpose |
|-------|---------|
| 01-09 | Core schema, extensions, base tables |
| 10-19 | Analytics, AI tutor, progress engine |
| 20-29 | Production hardening, distribution |
| 30-39 | Multi-tenant, gamification base |
| 40-49 | Quiz engine v1, leaderboards |
| 50-59 | Gamification phases 3-5 |
| 60-69 | Quiz engine v2, question bank |
| 70-79 | Schema reconciliation, consolidation |
| 80-89 | Quiz v1/v2 consolidation, RLS |
| 90-99 | Quiz hardening, performance |

### Key Migrations

- **`01_migration.sql`** - Baseline schema (4854 lines). Contains all core tables, indexes, functions, triggers, and RLS policies.
- **`06_rls_policies.sql`** - Row Level Security policies
- **`64_quiz_engine_rpc.sql`** - Quiz engine RPC functions
- **`82_class_assignment_quiz_v2_refactor.sql`** - Major quiz v2 refactor

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

-- Triggers: Drop if exists before creating
DROP TRIGGER IF EXISTS trigger_name ON table_name;
CREATE TRIGGER trigger_name ...;
```

## Troubleshooting

### "relation already exists" Error

This should not occur after the migration hardening. If seen, it indicates a migration is missing `IF NOT EXISTS`. Please report this issue.

### "relation does not exist" Error

This indicates a dependency issue where a migration references an object created in a later migration. This should not occur in the current migration chain.

### Migration Fails on Fresh Database

If migrations fail on a fresh database but work on an existing one:

1. Check if there are local schema changes not yet migrated
2. Verify all tables in `01_migration.sql` exist
3. Try resetting with: `supabase db reset --db-url <your-db-url>`

## Development Workflow

### Adding New Migrations

When adding new features:

1. Create a new migration file with an incrementing number
2. Use idempotent patterns:
   - `CREATE TABLE IF NOT EXISTS`
   - `CREATE INDEX IF NOT EXISTS`
   - `CREATE OR REPLACE FUNCTION`
   - `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`
3. Test on a fresh database using `supabase db reset`

### Recommended Testing

```bash
# Before pushing changes
supabase db reset

# Verify with a simple query
psql -c "SELECT COUNT(*) FROM courses;"
```

## Migration Files Reference

Total: 94 migration files (including 8 placeholder files for future features)

- **Core Schema**: 01_migration.sql
- **Extensions**: pg_graphql, pg_stat_statements, pgcrypto, uuid-ossp, vector
- **Core Tables**: tenants, profiles, courses, modules, lessons, quizzes, quiz_attempts, enrollments, etc.
- **Analytics**: course_stats, learning_events, analytics_audit
- **Gamification**: user_points, leaderboards, user_streaks, badges
- **Quiz V2**: quiz_attempts_v2, quiz_attempt_questions_v2, quiz_assignments

## Support

For migration-related issues:
1. Check the migration chain ordering in `supabase/migrations/`
2. Verify `01_migration.sql` contains the baseline schema
3. Contact the backend team for complex schema changes
