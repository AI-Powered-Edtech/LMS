-- ============================================================
-- Migration 292: E2E Bug Fixes (4 bugs found in E2E testing)
-- Date: 2026-03-20
-- ============================================================

-- ============================================================
-- BUG-001 (CRITICAL): v1_submit_quiz_attempt grading broken
-- Three nested bugs in the grading loop:
-- 1. jsonb_build_array(UUID[]) wraps entire array as single element
-- 2. Reads from non-existent quiz_attempt_answers table
-- 3. Reads from non-existent quiz_question_options table
-- Fix: See migration 291_fix_quiz_submit_grading.sql (already created)
-- This migration does NOT re-apply 291 to avoid duplication.
-- Apply 291 first if not yet applied.
-- ============================================================


-- ============================================================
-- BUG-002 (HIGH): check_analytics_rate_limit crashes when
-- get_my_tenant_id() returns NULL (teacher JWT missing tenant claim)
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_analytics_rate_limit(
    p_user_id uuid,
    p_limit integer DEFAULT 100,
    p_window interval DEFAULT interval '1 hour'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_record record;
    v_tenant_id uuid;
BEGIN
    -- FIX: fallback to profiles table when JWT claim is missing
    v_tenant_id := COALESCE(
        public.get_my_tenant_id(),
        (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

    -- If still null after fallback, skip rate limiting gracefully
    IF v_tenant_id IS NULL THEN
        RETURN true;
    END IF;

    SELECT * INTO v_record
    FROM public.analytics_rate_limits
    WHERE user_id = p_user_id AND tenant_id = v_tenant_id;

    IF v_record IS NULL THEN
        INSERT INTO public.analytics_rate_limits (user_id, tenant_id, request_count, window_start, reset_at)
        VALUES (p_user_id, v_tenant_id, 1, now(), now() + p_window);
        RETURN true;
    END IF;

    IF now() > v_record.reset_at THEN
        UPDATE public.analytics_rate_limits
        SET request_count = 1,
            window_start = now(),
            reset_at = now() + p_window
        WHERE user_id = p_user_id AND tenant_id = v_tenant_id;
        RETURN true;
    END IF;

    IF v_record.request_count >= p_limit THEN
        RETURN false;
    END IF;

    UPDATE public.analytics_rate_limits
    SET request_count = request_count + 1
    WHERE user_id = p_user_id AND tenant_id = v_tenant_id;

    RETURN true;
END;
$$;


-- ============================================================
-- BUG-003 (MEDIUM): upsert_learning_guide crashes when
-- p_segment is explicitly NULL (bypasses DEFAULT 'all')
-- ============================================================

CREATE OR REPLACE FUNCTION public.upsert_learning_guide(
    p_guide_id       UUID DEFAULT NULL,
    p_title          TEXT DEFAULT NULL,
    p_content        TEXT DEFAULT NULL,
    p_guide_type     TEXT DEFAULT 'banner',
    p_target_type    TEXT DEFAULT 'lesson',
    p_target_id      UUID DEFAULT NULL,
    p_segment        TEXT DEFAULT 'all',
    p_trigger_type   TEXT DEFAULT 'on_enter',
    p_trigger_value  INT DEFAULT 0,
    p_priority       INT DEFAULT 0,
    p_is_active      BOOLEAN DEFAULT true,
    p_max_impressions INT DEFAULT NULL,
    p_starts_at      TIMESTAMPTZ DEFAULT NULL,
    p_ends_at        TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_id UUID;
BEGIN
    IF NOT (public.has_role('TEACHER'::public.app_role) OR public.has_role('ADMIN'::public.app_role)) THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: must be teacher or admin';
    END IF;

    IF p_guide_id IS NOT NULL THEN
        UPDATE public.learning_guides SET
            title           = COALESCE(p_title, title),
            content         = COALESCE(p_content, content),
            guide_type      = COALESCE(p_guide_type, guide_type),
            target_type     = COALESCE(p_target_type, target_type),
            target_id       = COALESCE(p_target_id, target_id),
            segment         = COALESCE(p_segment, segment),
            trigger_type    = COALESCE(p_trigger_type, trigger_type),
            trigger_value   = COALESCE(p_trigger_value, trigger_value),
            priority        = COALESCE(p_priority, priority),
            is_active       = COALESCE(p_is_active, is_active),
            max_impressions = p_max_impressions,
            starts_at       = p_starts_at,
            ends_at         = p_ends_at,
            updated_at      = NOW()
        WHERE id = p_guide_id
          AND tenant_id = public.get_my_tenant_id()
        RETURNING id INTO v_id;
    ELSE
        INSERT INTO public.learning_guides (
            tenant_id, created_by, title, content, guide_type,
            target_type, target_id, segment, trigger_type, trigger_value,
            priority, is_active, max_impressions, starts_at, ends_at
        ) VALUES (
            public.get_my_tenant_id(), auth.uid(),
            p_title, p_content, p_guide_type,
            p_target_type, p_target_id,
            COALESCE(p_segment, 'all'),  -- FIX: explicit null bypasses column DEFAULT
            p_trigger_type, p_trigger_value,
            p_priority, p_is_active, p_max_impressions, p_starts_at, p_ends_at
        ) RETURNING id INTO v_id;
    END IF;

    RETURN v_id;
END;
$$;


-- ============================================================
-- BUG-004 (LOW): guide_interactions.action CHECK constraint
-- missing 'viewed' — service sends 'viewed', DB rejects it
-- Fix: add 'viewed' to allowed actions
-- ============================================================

ALTER TABLE public.guide_interactions
    DROP CONSTRAINT IF EXISTS guide_interactions_action_check;

ALTER TABLE public.guide_interactions
    ADD CONSTRAINT guide_interactions_action_check
    CHECK (action IN ('shown', 'dismissed', 'completed', 'clicked', 'viewed'));


-- ============================================================
-- VERIFICATION
-- Run after applying to confirm fixes:
--
-- BUG-002:
--   SELECT prosrc FROM pg_proc WHERE proname = 'check_analytics_rate_limit';
--   -- Should contain: COALESCE(public.get_my_tenant_id(), ...profiles...)
--
-- BUG-003:
--   SELECT prosrc FROM pg_proc WHERE proname = 'upsert_learning_guide';
--   -- Should contain: COALESCE(p_segment, 'all')
--
-- BUG-004:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'guide_interactions_action_check';
--   -- Should include 'viewed'
-- ============================================================
