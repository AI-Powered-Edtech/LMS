-- ============================================================
-- Migration 92: Quiz Triggers V2 + Remediation Integration
-- ============================================================
-- Fixes 7 missing triggers on quiz_attempts_v2,
-- patches 3 buggy trigger functions, adds telemetry RLS,
-- and integrates Supabase audit remediation items.
-- ============================================================

-- ============================================================
-- SECTION 0: Fix 3 Broken Trigger Functions
-- ============================================================

-- 0a. trigger_quiz_passed: user_id → student_id
CREATE OR REPLACE FUNCTION public.trigger_quiz_passed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.passed = true AND (OLD.passed IS NULL OR OLD.passed = false) THEN
        INSERT INTO public.activity_events (tenant_id, user_id, event_type, metadata)
        VALUES (
            NEW.tenant_id,
            NEW.student_id,  -- was: NEW.user_id (bug)
            'QUIZ_PASSED',
            jsonb_build_object('quiz_id', NEW.quiz_id, 'score', NEW.score)
        );
    END IF;
    RETURN NEW;
END;
$$;

-- 0b. handle_quiz_badges: quiz_attempts → quiz_attempts_v2
CREATE OR REPLACE FUNCTION public.handle_quiz_badges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Award "First Quiz" badge on first submission
    IF NOT EXISTS (
        SELECT 1 FROM public.quiz_attempts_v2
        WHERE student_id = NEW.student_id
          AND tenant_id = NEW.tenant_id
          AND status IN ('SUBMITTED', 'GRADED')
          AND id != NEW.id
    ) THEN
        PERFORM public.award_badge_if_qualified(NEW.student_id, 'First Quiz', NEW.tenant_id);
    END IF;

    -- Award "Perfect Score" badge if score is 100
    IF NEW.score >= 100 THEN
        PERFORM public.award_badge_if_qualified(NEW.student_id, 'Perfect Score', NEW.tenant_id);
    END IF;

    RETURN NEW;
END;
$$;

-- 0c. trg_update_quiz_stats: fix VIEW references → canonical tables
CREATE OR REPLACE FUNCTION public.trg_update_quiz_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_score NUMERIC(5,2);
    v_is_first_attempt BOOLEAN;
BEGIN
    IF NEW.status != 'GRADED' OR (OLD.status = 'GRADED') THEN
        RETURN NEW;
    END IF;

    v_new_score := COALESCE(NEW.score, 0);

    v_is_first_attempt := NOT EXISTS(
        SELECT 1 FROM public.quiz_attempts_v2  -- was: quiz_attempts (VIEW)
        WHERE quiz_id = NEW.quiz_id
          AND student_id = NEW.student_id
          AND status = 'GRADED'
          AND id != NEW.id
    );

    -- Upsert quiz_stats
    INSERT INTO public.quiz_stats (
        quiz_id, tenant_id, total_attempts, total_unique_students,
        avg_score, highest_score, lowest_score, pass_rate, updated_at
    )
    VALUES (
        NEW.quiz_id, NEW.tenant_id, 1,
        CASE WHEN v_is_first_attempt THEN 1 ELSE 0 END,
        v_new_score, v_new_score, v_new_score,
        CASE WHEN COALESCE(NEW.passed, false) THEN 100.0 ELSE 0.0 END,
        now()
    )
    ON CONFLICT (quiz_id) DO UPDATE SET
        total_attempts      = quiz_stats.total_attempts + 1,
        total_unique_students = quiz_stats.total_unique_students
                              + CASE WHEN v_is_first_attempt THEN 1 ELSE 0 END,
        avg_score           = ROUND(
            ((quiz_stats.avg_score * quiz_stats.total_attempts) + v_new_score)
            / (quiz_stats.total_attempts + 1), 2
        ),
        highest_score       = GREATEST(quiz_stats.highest_score, v_new_score),
        lowest_score        = LEAST(quiz_stats.lowest_score, v_new_score),
        pass_rate           = ROUND(
            ((quiz_stats.pass_rate * quiz_stats.total_attempts)
             + CASE WHEN COALESCE(NEW.passed, false) THEN 100.0 ELSE 0.0 END)
            / (quiz_stats.total_attempts + 1), 2
        ),
        updated_at          = now();

    -- Upsert question_stats
    INSERT INTO public.question_stats (
        question_id, quiz_id, tenant_id,
        total_answers, correct_answers, difficulty_rate, updated_at
    )
    SELECT
        aq.question_id, NEW.quiz_id, NEW.tenant_id, 1,
        CASE WHEN aq.is_correct THEN 1 ELSE 0 END,
        CASE WHEN aq.is_correct THEN 100.0 ELSE 0.0 END,
        now()
    FROM public.quiz_attempt_questions_v2 aq  -- was: quiz_attempt_questions (VIEW)
    WHERE aq.attempt_id = NEW.id
      AND aq.is_correct IS NOT NULL
    ON CONFLICT (question_id, quiz_id) DO UPDATE SET
        total_answers   = question_stats.total_answers + 1,
        correct_answers = question_stats.correct_answers
                        + CASE WHEN EXCLUDED.correct_answers > 0 THEN 1 ELSE 0 END,
        difficulty_rate = ROUND(
            ((question_stats.correct_answers
              + CASE WHEN EXCLUDED.correct_answers > 0 THEN 1 ELSE 0 END)::NUMERIC
             / (question_stats.total_answers + 1)::NUMERIC) * 100, 2
        ),
        updated_at      = now();

    RETURN NEW;
END;
$$;

-- 0d. Harden search_path on remaining trigger functions
ALTER FUNCTION public.handle_quiz_attempt_activity    SET search_path = public;
ALTER FUNCTION public.handle_quiz_attempt_status_change SET search_path = public;
ALTER FUNCTION public.trg_validate_attempt_status_change SET search_path = public;
ALTER FUNCTION public.auto_set_tenant_id              SET search_path = public;


-- ============================================================
-- SECTION 1: Apply 7 Triggers to quiz_attempts_v2
-- ============================================================

-- 1a. Status FSM guard (BEFORE UPDATE) — prevents invalid transitions
CREATE TRIGGER trg_validate_attempt_status_guard
    BEFORE UPDATE ON public.quiz_attempts_v2
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_validate_attempt_status_change();

-- 1b. Auto-set tenant_id (BEFORE INSERT) — fallback if RPC doesn't set it
CREATE TRIGGER set_tenant_id_quiz_attempts_v2
    BEFORE INSERT ON public.quiz_attempts_v2
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_set_tenant_id();

-- 1c. Status change activity events (AFTER INSERT OR UPDATE)
CREATE TRIGGER trg_quiz_attempt_status_change_v2
    AFTER INSERT OR UPDATE OF status ON public.quiz_attempts_v2
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_quiz_attempt_status_change();

-- 1d. Quiz passed event (AFTER UPDATE) — fires when passed goes true
CREATE TRIGGER quiz_attempt_passed_trigger_v2
    AFTER UPDATE ON public.quiz_attempts_v2
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_quiz_passed();

-- 1e. Badge awards (AFTER UPDATE of status on submission/grading)
CREATE TRIGGER trg_quiz_badges_v2
    AFTER UPDATE OF status ON public.quiz_attempts_v2
    FOR EACH ROW
    WHEN (NEW.status IN ('SUBMITTED', 'GRADED'))
    EXECUTE FUNCTION public.handle_quiz_badges();

-- 1f. Quiz stats update (AFTER UPDATE of status → GRADED)
CREATE TRIGGER trg_quiz_attempt_stats_v2
    AFTER UPDATE OF status ON public.quiz_attempts_v2
    FOR EACH ROW
    WHEN (NEW.status = 'GRADED')
    EXECUTE FUNCTION public.trg_update_quiz_stats();

-- 1g. Activity event on insert
CREATE TRIGGER trg_quiz_attempt_activity_v2
    AFTER INSERT ON public.quiz_attempts_v2
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_quiz_attempt_activity();


-- ============================================================
-- SECTION 2: Remediation Script Integration
-- ============================================================

-- 2a. Security invoker views (partition RLS already enabled — skip that)
-- Recreate views with security_invoker = true

DROP VIEW IF EXISTS public.quiz_attempt_questions;
CREATE VIEW public.quiz_attempt_questions
WITH (security_invoker = true) AS
SELECT attempt_id, question_id, tenant_id, is_correct, points_earned, student_answers
FROM public.quiz_attempt_questions_v2;
COMMENT ON VIEW public.quiz_attempt_questions IS 'Compatibility view → quiz_attempt_questions_v2. Read-only. security_invoker=true.';

DROP VIEW IF EXISTS public.quiz_attempts;
CREATE VIEW public.quiz_attempts
WITH (security_invoker = true) AS
SELECT
    id, quiz_id, student_id, tenant_id, status, score,
    started_at, submitted_at, expires_at, attempt_number,
    passed, time_spent, tab_switch_count, focus_loss_count,
    last_heartbeat_at, attempt_seed, assignment_id,
    started_at  AS created_at,
    submitted_at AS finished_at,
    time_spent   AS duration_seconds
FROM public.quiz_attempts_v2;
COMMENT ON VIEW public.quiz_attempts IS 'Compatibility view → quiz_attempts_v2. Read-only. security_invoker=true.';

DROP VIEW IF EXISTS public.user_profiles;
CREATE VIEW public.user_profiles
WITH (security_invoker = true) AS
SELECT
    p.id, p.tenant_id, p.email, p.full_name, p.avatar_url,
    r.role, p.level, p.created_at, p.updated_at
FROM public.profiles p
LEFT JOIN (
    SELECT DISTINCT ON (user_roles.user_id)
        user_roles.user_id, user_roles.role
    FROM public.user_roles
    ORDER BY user_roles.user_id, user_roles.created_at DESC
) r ON p.id = r.user_id;
COMMENT ON VIEW public.user_profiles IS 'Aggregated profile + role view. security_invoker=true.';

-- 2b. Search path hardening for remaining quiz RPCs
ALTER FUNCTION public.v1_submit_quiz_attempt       SET search_path = public;
ALTER FUNCTION public.v1_start_quiz_attempt         SET search_path = public;
ALTER FUNCTION public.cleanup_stale_quiz_attempts   SET search_path = public;
ALTER FUNCTION public.ensure_quiz_attempt_partition  SET search_path = public;
ALTER FUNCTION public.record_quiz_heartbeat          SET search_path = public;
ALTER FUNCTION public.record_cheating_signal          SET search_path = public;
ALTER FUNCTION public.v1_save_answer                 SET search_path = public;
ALTER FUNCTION public.grade_attempt_question          SET search_path = public;
ALTER FUNCTION public.recalculate_attempt_score       SET search_path = public;
ALTER FUNCTION public.expire_dead_attempt             SET search_path = public;
ALTER FUNCTION public.get_attempt_detail              SET search_path = public;
ALTER FUNCTION public.get_question_difficulty         SET search_path = public;
ALTER FUNCTION public.save_quiz_builder               SET search_path = public;
ALTER FUNCTION public.add_question_to_quiz            SET search_path = public;
ALTER FUNCTION public.validate_attempt_transition     SET search_path = public;

-- 2c. FK indexes (none exist yet)
CREATE INDEX IF NOT EXISTS idx_ai_generation_metadata_question_id
    ON public.ai_generation_metadata (question_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_feedback_tenant_id
    ON public.ai_tutor_feedback (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_feedback_user_id
    ON public.ai_tutor_feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_lesson_id
    ON public.ai_tutor_sessions (lesson_id);
CREATE INDEX IF NOT EXISTS idx_analytics_audit_user_id
    ON public.analytics_audit (user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id
    ON public.assignments (course_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id
    ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_user_points_class_id
    ON public.user_points (class_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id
    ON public.quizzes (course_id);

-- 2d. Drop duplicate indexes
DROP INDEX IF EXISTS public.idx_activity_events_tenant_id;
DROP INDEX IF EXISTS public.idx_activity_events_user_id;
DROP INDEX IF EXISTS public.idx_course_classes_class_id;
DROP INDEX IF EXISTS public.idx_course_classes_course_id;
DROP INDEX IF EXISTS public.idx_course_classes_tenant_id;


-- ============================================================
-- SECTION 3: Telemetry RLS Policies
-- ============================================================

-- Teachers can read telemetry for attempts on quizzes in their classes
CREATE POLICY "Teachers read telemetry"
    ON public.quiz_attempt_telemetry
    FOR SELECT
    USING (
        tenant_id = (SELECT public.get_my_tenant_id())
        AND EXISTS (
            SELECT 1
            FROM public.quiz_attempts_v2 qa
            JOIN public.quizzes q ON qa.quiz_id = q.id
            JOIN public.classes c ON q.class_id = c.id
            WHERE qa.id = quiz_attempt_telemetry.attempt_id
              AND c.teacher_id = (SELECT auth.uid())
        )
    );

-- Admins can read all telemetry in their tenant
CREATE POLICY "Admins read telemetry"
    ON public.quiz_attempt_telemetry
    FOR SELECT
    USING (
        tenant_id = (SELECT public.get_my_tenant_id())
        AND (SELECT public.has_role('ADMIN'::public.app_role))
    );

-- Students can insert their own telemetry (via RPC, but policy needed for direct access)
CREATE POLICY "Students insert own telemetry"
    ON public.quiz_attempt_telemetry
    FOR INSERT
    WITH CHECK (
        tenant_id = (SELECT public.get_my_tenant_id())
        AND EXISTS (
            SELECT 1
            FROM public.quiz_attempts_v2 qa
            WHERE qa.id = quiz_attempt_telemetry.attempt_id
              AND qa.student_id = (SELECT auth.uid())
        )
    );


-- ============================================================
-- DONE
-- ============================================================
