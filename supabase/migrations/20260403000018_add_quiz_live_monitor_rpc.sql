-- =============================================================================
-- Migration  : 20260403000018_add_quiz_live_monitor_rpc.sql
-- Description: Adds get_quiz_live_status RPC for teacher live quiz monitoring.
--              Returns real-time status, progress, heartbeat, and suspicion flags
--              for every student who has an attempt on a given assignment.
-- Caller     : Teacher or Admin only (ownership verified inside the function).
-- Polling    : Designed for 10-second polling intervals from the frontend.
-- Phase      : 31 — Teacher Live Quiz Monitor
-- Author     : EduSync Engineering
-- Date       : 2026-04-03
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_quiz_live_status(
  p_assignment_id uuid,
  p_tenant_id     uuid
)
RETURNS TABLE (
  student_id          uuid,
  student_name        text,
  status              text,
  answered_count      integer,
  total_questions     integer,
  last_heartbeat_at   timestamptz,
  score               numeric,
  is_suspicious       boolean,
  tab_switch_count    integer,
  started_at          timestamptz,
  submitted_at        timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
  v_quiz_id   uuid;
BEGIN
  -- Auth guard: reject unauthenticated callers immediately
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_tenant_id := get_my_tenant_id();

  -- Ownership check: caller must be the class teacher or a tenant admin
  IF NOT EXISTS (
    SELECT 1
    FROM public.quiz_assignments qa
    JOIN public.classes c ON c.id = qa.class_id
    WHERE qa.id = p_assignment_id
      AND qa.tenant_id = v_tenant_id
      AND (
        c.teacher_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id  = auth.uid()
            AND ur.tenant_id = v_tenant_id
            AND UPPER(ur.role::text) = 'ADMIN'
        )
      )
  ) THEN
    RAISE EXCEPTION 'Unauthorized: harus guru atau admin';
  END IF;

  -- Resolve quiz_id for the given assignment
  SELECT qa.quiz_id INTO v_quiz_id
  FROM public.quiz_assignments qa
  WHERE qa.id = p_assignment_id
    AND qa.tenant_id = v_tenant_id;

  -- Return one row per student attempt, ordered by active-first then name
  RETURN QUERY
  SELECT
    qa.student_id,
    COALESCE(p.full_name, 'Siswa')                         AS student_name,
    qa.status::text,
    (
      SELECT COUNT(*)::integer
      FROM public.quiz_attempt_questions_v2 qaq
      WHERE qaq.attempt_id = qa.id
        AND qaq.student_answers IS NOT NULL
        AND qaq.student_answers != 'null'::jsonb
    )                                                      AS answered_count,
    COALESCE(array_length(qa.question_manifest, 1), 0)     AS total_questions,
    qa.last_heartbeat_at,
    qa.score,
    (qa.tab_switch_count + qa.focus_loss_count) > 5        AS is_suspicious,
    qa.tab_switch_count,
    qa.started_at,
    qa.submitted_at
  FROM public.quiz_attempts_v2 qa
  JOIN public.profiles p ON p.id = qa.student_id
  WHERE qa.assignment_id = p_assignment_id
    AND qa.tenant_id     = v_tenant_id
  ORDER BY
    CASE WHEN UPPER(qa.status) = 'IN_PROGRESS' THEN 0 ELSE 1 END,
    p.full_name ASC;
END;
$$;

-- Grant execution to all authenticated users (RLS inside function enforces
-- teacher/admin ownership — students who call this will get EXCEPTION).
GRANT EXECUTE ON FUNCTION public.get_quiz_live_status(uuid, uuid) TO authenticated;
