-- ============================================================
-- Migration 93: Single Active Attempt Guard
-- ============================================================
-- Adds a BEFORE INSERT trigger to enforce that a student
-- cannot have more than one IN_PROGRESS attempt per quiz.
-- This is the database-level enforcement for a constraint
-- that was previously only enforced programmatically in
-- v1_start_quiz_attempt RPC.
--
-- Why a trigger instead of a partial unique index?
-- quiz_attempts_v2 is partitioned by RANGE(started_at).
-- Postgres requires partial unique indexes on partitioned
-- tables to include the partition key, but started_at differs
-- per attempt, making a unique index ineffective.
-- ============================================================


-- ============================================================
-- SECTION 1: Guard Function
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_single_active_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_id UUID;
BEGIN
    -- Only check when inserting an IN_PROGRESS attempt
    IF NEW.status <> 'in_progress' THEN
        RETURN NEW;
    END IF;

    -- Lock any existing active attempt to prevent race conditions
    -- Also check tenant_id for multi-tenant isolation
    SELECT id INTO v_existing_id
    FROM public.quiz_attempts_v2
    WHERE student_id = NEW.student_id
      AND quiz_id = NEW.quiz_id
      AND tenant_id = NEW.tenant_id
      AND status = 'in_progress'
    LIMIT 1
    FOR UPDATE;

    IF v_existing_id IS NOT NULL THEN
        RAISE EXCEPTION 'Student already has an active attempt for this quiz (attempt_id: %)',
            v_existing_id
            USING ERRCODE = 'P0010';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_single_active_attempt() IS
'BEFORE INSERT guard: prevents multiple IN_PROGRESS attempts per student per quiz. Uses FOR UPDATE lock to handle concurrent inserts on partitioned table.';


-- ============================================================
-- SECTION 2: Register Trigger
-- ============================================================

CREATE TRIGGER trg_single_active_attempt
    BEFORE INSERT ON public.quiz_attempts_v2
    FOR EACH ROW
    WHEN (NEW.status = 'in_progress')
    EXECUTE FUNCTION public.check_single_active_attempt();


-- ============================================================
-- DONE
-- ============================================================
