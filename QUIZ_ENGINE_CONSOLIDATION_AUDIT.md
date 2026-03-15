# QUIZ ENGINE CONSOLIDATION AUDIT

## 1. Files still referencing `quiz_attempts` (Legacy)
The following files still contain direct references to the legacy `quiz_attempts` table:

**Source Code & Scripts:**
- `testApi.ts` (Lines 11-14: direct supabase query to `quiz_attempts`)
- `get_table_def.js` (Line 2: `\d public.quiz_attempts`)
- `src/services/progressService.ts` (Line 54: parses `data.quiz_attempts` from an RPC response)

**Documentation:**
- `docs/SYSTEM_MAP.md` (Line 673: explicitly documents `supabase.from('quiz_attempts')`)
- `docs/architecture/FEATURE_MAP.md` (Concepts still named `QuizAttempts`)

**Migrations (Active & Backup):**
- Various legacy migrations (`02_enhance_quiz_security.sql`, `10_learning_analytics.sql`, `11_production_hardening.sql`, `43_migration.sql`, `56_quiz_rls_sync.sql`, `71_schema_reconciliation.sql`, `77_quiz_analytics_rpc.sql`, `79_quiz_engine_v1_rpcs.sql`, `80_fix_quiz_attempt_number.sql`, `121_fix_analytics_security.sql`) still reference the old table in their creation scripts. 

## 2. Files using `quiz_attempts_v2`
The following files have been successfully migrated to use the new `quiz_attempts_v2` table:

**Source Code:**
- `src/services/quizService.ts`
- `src/services/studentProgressService.ts`
- `src/services/gradebookService.ts`
- `supabase/functions/grade-quiz-attempt/index.ts`

**Migrations & Plans:**
- `supabase/migrations/76_quiz_engine_phase1.sql`
- `supabase/migrations/78_quiz_audit_fixes.sql`
- `supabase/migrations/81_quiz_assignments_schema.sql`
- `supabase/migrations/82_class_assignment_quiz_v2_refactor.sql`
- `supabase/migrations/84_quiz_v1_v2_consolidation.sql`
- `plans/gradebook_critical_bugs_fix_plan.md`
- `docs/architecture/QUIZ_SYSTEM_ARCHITECTURE.md`

## 3. RPC functions touching quiz attempts

**Functions referencing legacy `quiz_attempts`:**
- `get_course_analytics` (from `10_learning_analytics.sql`, `121_fix_analytics_security.sql`)
- `get_student_progress` (from `11_production_hardening.sql`)
- `get_quiz_analytics` (from `77_quiz_analytics_rpc.sql`)
- `start_quiz_attempt` (legacy v1)
- `submit_quiz_attempt` (legacy v1)
- `trg_update_quiz_stats` (Trigger function from `71_schema_reconciliation.sql`)

**Functions referencing `quiz_attempts_v2`:**
- `v2_start_quiz_attempt`
- `v2_submit_quiz_attempt`
- `v2_abandon_quiz_attempt`
- `v2_heartbeat_quiz_attempt`
- `v1_submit_quiz_attempt` (Updated in migration 84 to write to V2)
- `sync_quiz_to_grades` (Trigger function)

## 4. Potential schema mismatches
- **Analytics RPC Mismatch:** Functions like `get_course_analytics` and `get_quiz_analytics` appear to still be querying the legacy `public.quiz_attempts` table. This means analytics dashboards will not reflect the new V2 attempts.
- **Student Progress RPC Mismatch:** The `get_student_progress` RPC aggregates JSON data directly from `public.quiz_attempts`. `src/services/progressService.ts` relies on this response. This means student progress views may show outdated or empty quiz data.
- **`user_id` vs `student_id`:** Older references and indexes sometimes used `user_id` (e.g., in early migrations), but V2 strictly enforces `student_id`. Any legacy RPCs still using `user_id` against V2 or expecting it from V1 will fail.

## 5. Recommended fixes
1. **Update Analytics RPCs:** Rewrite `get_course_analytics`, `get_quiz_analytics`, and any related analytics queries to `JOIN` on `quiz_attempts_v2` instead of `quiz_attempts`.
2. **Update Student Progress RPC:** Rewrite `get_student_progress` to fetch the `quiz_attempts` JSON aggregate from `quiz_attempts_v2`.
3. **Refactor `testApi.ts`:** Update the script to test the `quiz_attempts_v2` table.
4. **Update Documentation:** Correct `docs/SYSTEM_MAP.md` to indicate that `quiz_attempts_v2` is the canonical table.
5. **Deprecate & Drop Legacy Table:** Once all RPCs are confirmed to be using V2, formally drop the `quiz_attempts` table or replace it with a read-only view pointing to `quiz_attempts_v2` to prevent further regressions.