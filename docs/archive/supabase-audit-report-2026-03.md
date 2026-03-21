# Supabase Audit Report - Multi-Tenant LMS

**Project ID:** `omfnkoufjqjqilswldtz`

## Executive Summary

A comprehensive audit of the Supabase project was performed, focusing on database schema, Row Level Security (RLS) policies, RPC functions, query performance, and the recent migration to the `quiz_attempts_v2` architecture.

The core multi-tenant architecture (`tenant_id = get_my_tenant_id()`) is consistently applied across the schema. However, **Critical and High-severity issues** exist regarding RLS bypasses, search path hijacking risks in RPCs, and query performance bottlenecks at scale.

---

## 🚨 1. Critical Issues

### 1.1 Partitioned Tables Missing RLS (Quiz Module Data Leakage)

**Issue:** RLS is enabled on the `quiz_attempts_v2` partitioned tables (e.g., `quiz_attempts_v2_2026_03`, `quiz_attempts_v2_historic`), but **no RLS policies exist** for them.
**Impact:** In PostgreSQL, RLS policies on a partitioned parent table do _not_ cascade to child partitions automatically. Any direct query bypassing the parent (or if accessed improperly) could expose all tenant attempts.
**Recommendation:** Replicate the parent RLS policies directly onto all child partitions.

### 1.2 Security Definer Views Bypassing Tenant Isolation

**Issue:** Views like `quiz_attempt_questions`, `quiz_attempts` (legacy), and `user_profiles` are defined with the `SECURITY DEFINER` property.
**Impact:** Queries executed against these views run with the privileges of the view's creator, bypassing the underlying table-level RLS policies. This is a severe vector for cross-tenant data leakage if the views themselves don't enforce `tenant_id` filtering.
**Recommendation:** Drop and recreate these views with `SECURITY INVOKER` or remove the `security_invoker` flag if defined explicitly.

---

## 🛑 2. High Priority Issues

### 2.1 RPC Search Path Hijacking (Security)

**Issue:** Over 25 custom RPC functions, including core ones like `handle_quiz_attempt_status_change`, `update_streak`, `grade_attempt_question`, and `recalculate_attempt_score` lack a secure `SET search_path` declaration.
**Impact:** A malicious user could create objects in their local schema to hijack the function's execution flow.
**Recommendation:** Alter all affected functions to explicitly include `SET search_path = public` or `public, extensions`.

### 2.2 Unindexed Foreign Keys (Performance)

**Issue:** 37 foreign key constraints lack covering indexes (e.g., `ai_tutor_feedback.tenant_id`, `audit_logs.actor_id`, `user_points.class_id`).
**Impact:** Cascading deletes/updates and standard `JOIN` operations will result in full table scans and potentially lock contention.
**Recommendation:** Create B-Tree indexes on all foreign key columns.

### 2.3 Suboptimal RLS Auth Function Execution (Performance)

**Issue:** More than 40 RLS policies trigger the `auth_rls_initplan` warning (e.g., `user_roles_select_own`, `course_classes_update`). Policies are calling `auth.uid()` or `current_setting('request.jwt.claims', true)` directly.
**Impact:** PostgreSQL evaluates these function calls _per row_. Scanning a table with 100,000 rows will execute the auth function 100,000 times, causing massive CPU load and slow query times.
**Recommendation:** Wrap volatile function calls in a `(SELECT ...)` block so PostgreSQL caches the result per query.
_Example:_ `(tenant_id = (SELECT get_my_tenant_id()))` instead of `(tenant_id = get_my_tenant_id())`.

---

## ⚠️ 3. Medium Priority Issues

### 3.1 Tables with RLS Enabled but No Policies

**Issue:** Tables like `lesson_chunks`, `question_bank`, `quiz_attempt_telemetry`, and `quiz_submission_queue` have RLS enabled but no active policies.
**Impact:** These tables are inaccessible to all authenticated users via the API.
**Recommendation:** Define appropriate `tenant_id` and role-based policies for these tables.

### 3.2 Unused and Duplicate Indexes

**Issue:** Several duplicate indexes exist (e.g., `idx_activity_events_tenant` and `idx_activity_events_tenant_id`). Furthermore, Supabase Advisors flagged dozens of unused indexes.
**Impact:** Duplicate indexes slow down `INSERT` and `UPDATE` operations and consume disk space.
**Recommendation:** Drop duplicate indexes. Monitor "unused" indexes for a few more weeks in production before dropping, as they may be used periodically.

### 3.3 Quiz Module Consistency

**Issue:** The legacy `quiz_attempts` table still exists with active triggers and constraints.
**Impact:** While the codebase has successfully migrated to `quiz_attempts_v2` (verified in `studentProgressService.ts` and `quizService.ts`), the old table and its indexes/triggers add schema bloat.
**Recommendation:** Archive the legacy data and drop the `quiz_attempts` table and associated legacy triggers once confident in the v2 stability.
