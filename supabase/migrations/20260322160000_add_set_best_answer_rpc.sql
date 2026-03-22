-- =============================================================
-- RPC: set_best_answer
-- Atomically marks a comment as the best answer for a forum post.
-- Clears any previous best answer on the same post in one transaction.
-- =============================================================

CREATE OR REPLACE FUNCTION public.set_best_answer(
  p_post_id UUID,
  p_comment_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Clear previous best answer for this post
  UPDATE discussions
  SET is_best_answer = false
  WHERE parent_id = p_post_id
    AND is_best_answer = true
    AND tenant_id = (SELECT get_my_tenant_id());

  -- Set the new best answer
  UPDATE discussions
  SET is_best_answer = true
  WHERE id = p_comment_id
    AND parent_id = p_post_id
    AND tenant_id = (SELECT get_my_tenant_id());
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.set_best_answer(UUID, UUID) TO authenticated;
