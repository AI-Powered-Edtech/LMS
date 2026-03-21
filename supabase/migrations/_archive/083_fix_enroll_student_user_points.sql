-- ==========================================================================
-- Migration 83: Fix enroll_student user_points ON CONFLICT error
--
-- Root cause: enroll_student RPC uses ON CONFLICT (user_id) on user_points,
-- but user_points no longer has a unique constraint on user_id alone.
-- The table was evolved to a per-tenant points history log.
--
-- Fix: Replace the broken raw INSERT...ON CONFLICT with a call to the
-- existing add_user_points() function which handles the insert correctly.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.enroll_student(p_join_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_class    public.classes;
  v_enrollment public.enrollments;
  v_count    int;
  v_tenant_id uuid;
BEGIN
  -- Get caller's tenant
  v_tenant_id := public.get_my_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User has no tenant assigned';
  END IF;

  -- Find class WITHIN same tenant only
  SELECT * INTO v_class FROM public.classes
  WHERE join_code = p_join_code AND tenant_id = v_tenant_id;

  IF v_class.id IS NULL THEN
    RAISE EXCEPTION 'Invalid join code' USING ERRCODE = 'P0002';
  END IF;

  -- Check duplicate
  IF EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE class_id = v_class.id AND student_id = auth.uid() AND tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Already enrolled in this class' USING ERRCODE = 'P0003';
  END IF;

  -- Check capacity
  IF v_class.max_students IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.enrollments
    WHERE class_id = v_class.id AND tenant_id = v_tenant_id;
    IF v_count >= v_class.max_students THEN
      RAISE EXCEPTION 'Class is full' USING ERRCODE = 'P0004';
    END IF;
  END IF;

  -- Enroll with tenant_id
  INSERT INTO public.enrollments (class_id, student_id, status, tenant_id)
  VALUES (v_class.id, auth.uid(), 'ACTIVE', v_tenant_id)
  RETURNING * INTO v_enrollment;

  -- Award 10 XP for joining — use add_user_points() which handles
  -- the per-tenant points model, leaderboards, and level recompute.
  PERFORM public.add_user_points(auth.uid(), 10);

  RETURN json_build_object(
    'enrollment_id', v_enrollment.id,
    'class_id', v_class.id,
    'class_name', v_class.name,
    'status', v_enrollment.status
  );
END;
$$;
