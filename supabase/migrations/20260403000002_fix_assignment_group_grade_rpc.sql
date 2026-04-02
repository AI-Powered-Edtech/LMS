-- FIXED: A1 — grade_group_submission RPC missing role check (CRITICAL)
-- Adds teacher/admin authorization check before grading is allowed.

CREATE OR REPLACE FUNCTION public.grade_group_submission(
  p_submission_id uuid,
  p_grade         numeric,
  p_feedback      text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  -- FIXED: Check caller is teacher or admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = get_my_tenant_id()
      AND UPPER(ur.role::text) IN ('TEACHER', 'ADMIN')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only teachers or admins can grade submissions' USING ERRCODE = 'P0002';
  END IF;

  UPDATE group_submissions
  SET
    grade      = p_grade,
    feedback   = p_feedback,
    status     = 'graded',
    graded_at  = now(),
    updated_at = now()
  WHERE id = p_submission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  RETURN json_build_object('success', true);
END;
$$;
