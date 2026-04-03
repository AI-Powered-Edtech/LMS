CREATE OR REPLACE FUNCTION public.vote_discussion_secure(
  p_discussion_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_existing_vote_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan' USING ERRCODE = 'P0001';
  END IF;

  -- Verify discussion belongs to user's tenant
  SELECT tenant_id INTO v_tenant_id
  FROM public.discussions
  WHERE id = p_discussion_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Diskusi tidak ditemukan' USING ERRCODE = 'P0002';
  END IF;

  IF v_tenant_id != get_my_tenant_id() THEN
    RAISE EXCEPTION 'Akses ditolak' USING ERRCODE = 'P0003';
  END IF;

  -- Atomic toggle: check for existing vote
  SELECT id INTO v_existing_vote_id
  FROM public.discussion_votes
  WHERE discussion_id = p_discussion_id AND user_id = v_user_id;

  IF v_existing_vote_id IS NOT NULL THEN
    -- Remove vote
    DELETE FROM public.discussion_votes WHERE id = v_existing_vote_id;
    RETURN json_build_object('success', true, 'action', 'removed');
  ELSE
    -- Add vote
    INSERT INTO public.discussion_votes (discussion_id, user_id, tenant_id)
    VALUES (p_discussion_id, v_user_id, v_tenant_id);
    RETURN json_build_object('success', true, 'action', 'added');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vote_discussion_secure(UUID) TO authenticated;
