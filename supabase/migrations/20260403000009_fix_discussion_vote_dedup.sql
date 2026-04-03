-- Vote deduplication table
CREATE TABLE IF NOT EXISTS public.discussion_votes (
    id             BIGSERIAL PRIMARY KEY,
    discussion_id  UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id      UUID NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(discussion_id, user_id)  -- prevents double-voting
);

ALTER TABLE public.discussion_votes ENABLE ROW LEVEL SECURITY;

-- Users can see their own votes
CREATE POLICY "votes_read_own" ON public.discussion_votes
    FOR SELECT USING (user_id = auth.uid() AND tenant_id = get_my_tenant_id());

-- Insert via RPC only
CREATE POLICY "votes_no_direct_insert" ON public.discussion_votes
    FOR INSERT WITH CHECK (false);

-- Update vote_discussion_secure to use discussion_votes table
CREATE OR REPLACE FUNCTION public.vote_discussion_secure(p_discussion_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant UUID := get_my_tenant_id();
    v_user   UUID := auth.uid();
    v_already_voted BOOLEAN;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;

    -- Self-vote prevention
    IF EXISTS (
        SELECT 1 FROM public.discussions d
        WHERE d.id = p_discussion_id AND d.author_id = v_user
    ) THEN
        RETURN json_build_object('success', false, 'reason', 'self_vote_not_allowed');
    END IF;

    -- Check if already voted (deduplication)
    SELECT EXISTS(
        SELECT 1 FROM public.discussion_votes
        WHERE discussion_id = p_discussion_id AND user_id = v_user
    ) INTO v_already_voted;

    IF v_already_voted THEN
        RETURN json_build_object('success', false, 'reason', 'already_voted');
    END IF;

    -- Record vote
    INSERT INTO public.discussion_votes (discussion_id, user_id, tenant_id)
    VALUES (p_discussion_id, v_user, v_tenant);

    -- Increment upvote counter
    UPDATE public.discussions
    SET upvotes = COALESCE(upvotes, 0) + 1
    WHERE id = p_discussion_id AND tenant_id = v_tenant;

    RETURN json_build_object('success', true, 'new_count', (
        SELECT upvotes FROM public.discussions WHERE id = p_discussion_id
    ));
END;
$$;

GRANT EXECUTE ON FUNCTION public.vote_discussion_secure(UUID) TO authenticated;
