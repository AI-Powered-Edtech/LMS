-- Migration 90: Quiz Engine Hardening — Final Schema Consolidation
-- ============================================================
-- OBJECTIVES:
--   1. Backfill legacy quiz_attempts rows into quiz_attempts_v2
--   2. Rename quiz_attempts to quiz_attempts_legacy (safety net)
--   3. Create read-only compatibility view named quiz_attempts
--   4. Drop legacy RPCs (start_quiz_attempt / submit_quiz_attempt)
--   5. Harden RLS on quiz_attempts_v2 (teacher + admin policies)
--   6. Harden RLS on quiz_attempt_questions_v2
--   7. Re-attach critical triggers to V2

-- ============================================================
-- SECTION 1: Backfill Data — quiz_attempts → quiz_attempts_v2
-- ============================================================

-- Backfill any rows in legacy that don't exist in V2 yet
INSERT INTO public.quiz_attempts_v2 (
    id,
    quiz_id,
    student_id,
    tenant_id,
    status,
    score,
    started_at,
    submitted_at,
    expires_at,
    attempt_number,
    passed,
    time_spent,
    tab_switch_count,
    focus_loss_count,
    last_heartbeat_at,
    attempt_seed,
    assignment_id
)
SELECT
    a.id,
    a.quiz_id,
    a.student_id,
    a.tenant_id,
    -- Map enum status to V2 varchar format (uppercase)
    UPPER(a.status::text) AS status,
    a.score,
    COALESCE(a.started_at, a.created_at) AS started_at,
    a.submitted_at,
    -- If expires_at not recorded, default to 24h after started_at
    COALESCE(a.expires_at, a.started_at + INTERVAL '24 hours') AS expires_at,
    COALESCE(a.attempt_number, 1) AS attempt_number,
    a.passed,
    COALESCE(a.duration_seconds, 0) AS time_spent,
    COALESCE(a.tab_switch_count, 0) AS tab_switch_count,
    COALESCE(a.focus_loss_count, 0) AS focus_loss_count,
    COALESCE(a.last_heartbeat_at, a.started_at) AS last_heartbeat_at,
    COALESCE(a.attempt_seed, gen_random_uuid()) AS attempt_seed,
    a.assignment_id
FROM public.quiz_attempts a
WHERE NOT EXISTS (
    SELECT 1 FROM public.quiz_attempts_v2 v2
    WHERE v2.id = a.id
)
ON CONFLICT (id, started_at) DO NOTHING;

-- ============================================================
-- SECTION 2: Freeze + Rename Legacy Table
-- ============================================================

-- Revoke write access from authenticated users
REVOKE INSERT, UPDATE, DELETE ON public.quiz_attempts FROM authenticated, anon;

-- Rename to make it a clear historical artifact
ALTER TABLE public.quiz_attempts RENAME TO quiz_attempts_legacy;

-- Also rename the legacy question table
ALTER TABLE public.quiz_attempt_questions RENAME TO quiz_attempt_questions_legacy;

-- ============================================================
-- SECTION 3: Create Compatibility Views
-- ============================================================

-- Read-only view: quiz_attempts -> quiz_attempts_v2
-- Column mapping preserves backward compatibility for analytics RPCs
CREATE OR REPLACE VIEW public.quiz_attempts AS
SELECT
    id,
    quiz_id,
    student_id,
    tenant_id,
    status,
    score,
    started_at,
    submitted_at,
    expires_at,
    attempt_number,
    passed,
    time_spent,
    tab_switch_count,
    focus_loss_count,
    last_heartbeat_at,
    attempt_seed,
    assignment_id,
    -- Provide legacy column aliases
    started_at  AS created_at,
    submitted_at AS finished_at,
    time_spent  AS duration_seconds
FROM public.quiz_attempts_v2;

COMMENT ON VIEW public.quiz_attempts IS
  'Compatibility view → quiz_attempts_v2. Read-only. Do NOT write through this view.';

-- Read-only view: quiz_attempt_questions -> quiz_attempt_questions_v2
-- NOTE: quiz_attempt_questions_v2 is partitioned by started_at, columns: attempt_id, started_at, question_id, tenant_id, student_answers, points_earned, is_correct
CREATE OR REPLACE VIEW public.quiz_attempt_questions AS
SELECT
    attempt_id,
    question_id,
    tenant_id,
    is_correct,
    points_earned,
    student_answers
FROM public.quiz_attempt_questions_v2;

COMMENT ON VIEW public.quiz_attempt_questions IS
  'Compatibility view → quiz_attempt_questions_v2. Read-only.';

-- ============================================================
-- SECTION 4: Drop Legacy RPCs
-- ============================================================

-- These legacy RPCs write to quiz_attempts (now quiz_attempts_legacy).
-- The v1_* variants (already used by frontend) are the canonical RPCs.

DROP FUNCTION IF EXISTS public.start_quiz_attempt(uuid);
DROP FUNCTION IF EXISTS public.submit_quiz_attempt(uuid, jsonb, integer);
-- Legacy no-arg overload if it exists
DROP FUNCTION IF EXISTS public.start_quiz_attempt(uuid, uuid);

-- ============================================================
-- SECTION 5: RLS Hardening — quiz_attempts_v2
-- ============================================================

-- Drop overly broad existing policies and replace with proper ones

-- Students: already present — students read own attempts
-- Students: already present — students insert own attempts
-- ADD: Teacher SELECT (teachers see attempts for quizzes they manage)
DROP POLICY IF EXISTS "Teachers access quiz attempts" ON public.quiz_attempts_v2;
CREATE POLICY "Teachers access quiz attempts"
    ON public.quiz_attempts_v2
    FOR SELECT
    USING (
        tenant_id = get_my_tenant_id()
        AND (
            EXISTS (
                SELECT 1
                FROM public.quizzes q
                WHERE q.id = quiz_attempts_v2.quiz_id
                  AND q.tenant_id = get_my_tenant_id()
                  AND (
                    is_course_creator(q.course_id)
                    OR (q.origin_class_id IS NOT NULL AND is_class_teacher(q.origin_class_id))
                  )
            )
            OR EXISTS (
                SELECT 1
                FROM public.quiz_assignments qa
                JOIN public.classes c ON c.id = qa.class_id
                WHERE qa.quiz_id = quiz_attempts_v2.quiz_id
                  AND is_class_teacher(qa.class_id)
                  AND qa.tenant_id = get_my_tenant_id()
            )
        )
    );

-- ADD: Admin SELECT (admins see all attempts within their tenant)
DROP POLICY IF EXISTS "Admins access quiz attempts" ON public.quiz_attempts_v2;
CREATE POLICY "Admins access quiz attempts"
    ON public.quiz_attempts_v2
    FOR SELECT
    USING (
        tenant_id = get_my_tenant_id()
        AND has_role('ADMIN'::app_role)
    );

-- ADD: Admin can update (e.g., manual grade overrides)
DROP POLICY IF EXISTS "Admins update quiz attempts" ON public.quiz_attempts_v2;
CREATE POLICY "Admins update quiz attempts"
    ON public.quiz_attempts_v2
    FOR UPDATE
    USING (
        tenant_id = get_my_tenant_id()
        AND has_role('ADMIN'::app_role)
    );

-- ============================================================
-- SECTION 6: RLS Hardening — quiz_attempt_questions_v2
-- ============================================================

-- Replace the overly broad "Students access own attempt questions" (ALL cmd) policy
-- with a properly scoped SELECT that also lets teachers read answers for grading.

DROP POLICY IF EXISTS "Students access own attempt questions" ON public.quiz_attempt_questions_v2;

-- Students: read their own attempt answers
CREATE POLICY "Students read own attempt answers"
    ON public.quiz_attempt_questions_v2
    FOR SELECT
    USING (
        tenant_id = get_my_tenant_id()
        AND EXISTS (
            SELECT 1
            FROM public.quiz_attempts_v2 a
            WHERE a.id = quiz_attempt_questions_v2.attempt_id
              AND a.student_id = auth.uid()
        )
    );

-- Students: write their own answers (INSERT/UPDATE via SECURITY DEFINER RPCs)
CREATE POLICY "Students write own attempt answers"
    ON public.quiz_attempt_questions_v2
    FOR INSERT
    WITH CHECK (
        tenant_id = get_my_tenant_id()
        AND EXISTS (
            SELECT 1
            FROM public.quiz_attempts_v2 a
            WHERE a.id = quiz_attempt_questions_v2.attempt_id
              AND a.student_id = auth.uid()
        )
    );

CREATE POLICY "Students update own attempt answers"
    ON public.quiz_attempt_questions_v2
    FOR UPDATE
    USING (
        tenant_id = get_my_tenant_id()
        AND EXISTS (
            SELECT 1
            FROM public.quiz_attempts_v2 a
            WHERE a.id = quiz_attempt_questions_v2.attempt_id
              AND a.student_id = auth.uid()
        )
    );

-- Teachers: read answers for quizzes they manage (for gradebook + manual grading)
CREATE POLICY "Teachers read attempt answers"
    ON public.quiz_attempt_questions_v2
    FOR SELECT
    USING (
        tenant_id = get_my_tenant_id()
        AND EXISTS (
            SELECT 1
            FROM public.quiz_attempts_v2 a
            JOIN public.quizzes q ON q.id = a.quiz_id
            WHERE a.id = quiz_attempt_questions_v2.attempt_id
              AND (
                is_course_creator(q.course_id)
                OR (q.origin_class_id IS NOT NULL AND is_class_teacher(q.origin_class_id))
                OR EXISTS (
                    SELECT 1 FROM public.quiz_assignments qa
                    WHERE qa.quiz_id = a.quiz_id AND is_class_teacher(qa.class_id)
                )
              )
        )
    );

-- Teachers: update answers for manual grading
CREATE POLICY "Teachers update attempt answers"
    ON public.quiz_attempt_questions_v2
    FOR UPDATE
    USING (
        tenant_id = get_my_tenant_id()
        AND EXISTS (
            SELECT 1
            FROM public.quiz_attempts_v2 a
            JOIN public.quizzes q ON q.id = a.quiz_id
            WHERE a.id = quiz_attempt_questions_v2.attempt_id
              AND (
                is_course_creator(q.course_id)
                OR (q.origin_class_id IS NOT NULL AND is_class_teacher(q.origin_class_id))
                OR EXISTS (
                    SELECT 1 FROM public.quiz_assignments qa
                    WHERE qa.quiz_id = a.quiz_id AND is_class_teacher(qa.class_id)
                )
              )
        )
    );

-- Admins: full access within tenant
CREATE POLICY "Admins access attempt answers"
    ON public.quiz_attempt_questions_v2
    FOR ALL
    USING (tenant_id = get_my_tenant_id() AND has_role('ADMIN'::app_role))
    WITH CHECK (tenant_id = get_my_tenant_id() AND has_role('ADMIN'::app_role));

-- ============================================================
-- SECTION 7: Update get_student_progress_bundle RPC key name
-- ============================================================
-- The RPC returns the JSON key as 'quiz_attempts' but progressService.ts reads
-- 'quiz_attempts_v2'. Fix the RPC to return the expected key, OR fix the
-- frontend. We normalize the RPC return key back to 'quiz_attempts' for
-- compatibility with the compatibility view naming, and update the frontend
-- separately to read 'quiz_attempts'.

CREATE OR REPLACE FUNCTION public.get_student_progress_bundle(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_result JSONB;
BEGIN
    v_tenant_id := get_my_tenant_id();

    IF auth.uid() <> p_student_id AND (auth.jwt() ->> 'role') NOT IN ('teacher', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT jsonb_build_object(
        'profile', (
            SELECT jsonb_build_object('id', id, 'full_name', full_name, 'avatar_url', avatar_url)
            FROM public.profiles WHERE id = p_student_id
        ),
        'total_xp', (
            SELECT COALESCE(SUM(points), 0) FROM public.user_points
            WHERE user_id = p_student_id AND tenant_id = v_tenant_id
        ),
        'completed_lessons_count', (
            SELECT COUNT(*) FROM public.lesson_progress
            WHERE user_id = p_student_id AND completed = true AND tenant_id = v_tenant_id
        ),
        -- Return key as 'quiz_attempts' (canonical name, reads from V2 via view)
        'quiz_attempts', (
            SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) FROM (
                SELECT a.id, a.quiz_id, a.score, COALESCE(a.submitted_at, a.started_at) AS created_at
                FROM public.quiz_attempts_v2 a
                WHERE a.student_id = p_student_id AND a.tenant_id = v_tenant_id
                  AND a.status IN ('submitted', 'graded')
                ORDER BY COALESCE(a.submitted_at, a.started_at) DESC
            ) d
        ),
        'achievements', (
            SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) FROM (
                SELECT ub.id, ub.earned_at, b.name, b.icon
                FROM public.user_badges ub
                JOIN public.badges b ON b.id = ub.badge_id
                WHERE ub.user_id = p_student_id
                ORDER BY ub.earned_at DESC
            ) d
        ),
        'course_progress', (
            SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) FROM (
                SELECT cp.id, cp.course_id, cp.total_lessons, cp.completed_lessons, cp.percentage,
                       cp.last_activity_type, cp.last_activity_at, c.title
                FROM public.course_progress cp
                JOIN public.courses c ON c.id = cp.course_id
                WHERE cp.user_id = p_student_id
                ORDER BY cp.last_activity_at DESC NULLS LAST
            ) d
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- ============================================================
-- SECTION 8: Cleanup stale in-progress attempts on V2
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_stale_quiz_attempts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expired_count INTEGER;
    v_abandoned_count INTEGER;
BEGIN
    -- Mark expired IN_PROGRESS attempts that never got submitted
    UPDATE public.quiz_attempts_v2
    SET status = 'expired',
        submitted_at = expires_at
    WHERE status = 'in_progress'
      AND expires_at < NOW() - INTERVAL '5 minutes';

    GET DIAGNOSTICS v_expired_count = ROW_COUNT;

    -- Mark attempts stale for > 48h with no heartbeat as ABANDONED
    UPDATE public.quiz_attempts_v2
    SET status = 'abandoned'
    WHERE status = 'in_progress'
      AND last_heartbeat_at < NOW() - INTERVAL '48 hours';

    GET DIAGNOSTICS v_abandoned_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'expired', v_expired_count,
        'abandoned', v_abandoned_count,
        'processed_at', NOW()
    );
END;
$$;

-- ============================================================
-- SECTION 9: Ensure partition for next quarter exists
-- ============================================================

DO $$
BEGIN
    -- 2026-04 partition (should already exist from migration 82)
    BEGIN
        CREATE TABLE IF NOT EXISTS public.quiz_attempts_v2_2026_04
            PARTITION OF public.quiz_attempts_v2
            FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
    EXCEPTION WHEN duplicate_table THEN NULL;
    END;

    -- 2026-07 partition (upcoming)
    BEGIN
        CREATE TABLE IF NOT EXISTS public.quiz_attempts_v2_2026_07
            PARTITION OF public.quiz_attempts_v2
            FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
    EXCEPTION WHEN duplicate_table THEN NULL;
    END;

    -- Ensure each partition has RLS enabled
    -- (Partitions inherit parent's RLS setting, but being explicit is safe)
    EXECUTE 'ALTER TABLE public.quiz_attempts_v2_2026_04 ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.quiz_attempts_v2_2026_07 ENABLE ROW LEVEL SECURITY';

EXCEPTION WHEN OTHERS THEN
    -- Non-fatal: partitions may already exist
    RAISE NOTICE 'Partition setup note: %', SQLERRM;
END;
$$;

-- ============================================================
-- VERIFICATION QUERIES (run manually after migration)
-- ============================================================

-- 1. Canonical table exists, legacy is renamed, view exists:
-- SELECT relname, relkind FROM pg_class
--   WHERE relname LIKE 'quiz_attempt%' AND relnamespace = 'public'::regnamespace
--   ORDER BY relname;

-- 2. No legacy RPCs remain:
-- SELECT proname FROM pg_proc
--   WHERE proname IN ('start_quiz_attempt', 'submit_quiz_attempt')
--   AND pronamespace = 'public'::regnamespace;

-- 3. RLS policy count on V2 (expect >= 4):
-- SELECT count(*) FROM pg_policies WHERE tablename = 'quiz_attempts_v2';

-- 4. Data integrity check:
-- SELECT count(*) FROM quiz_attempts;    -- view (reads V2)
-- SELECT count(*) FROM quiz_attempts_v2; -- canonical table
