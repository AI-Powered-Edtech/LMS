-- Phase 36B: Discussion Forum Gamification
-- Adds upvote_count + is_accepted_answer to discussions table.
-- Creates discussion_votes table, vote trigger, and RPCs.
-- NOTE: The project uses the "discussions" table, not "discussion_posts".

-- ────────────────────────────────────────────────────────────
-- 1. Extend discussions table
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.discussions
    ADD COLUMN IF NOT EXISTS upvote_count       int     DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_accepted_answer boolean DEFAULT false;

-- ────────────────────────────────────────────────────────────
-- 2. DISCUSSION_VOTES table
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.discussion_votes (
    id         uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    post_id    uuid NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES auth.users(id),
    vote_type  text NOT NULL DEFAULT 'upvote' CHECK (vote_type IN ('upvote','downvote')),
    tenant_id  uuid NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (post_id, user_id)
);

ALTER TABLE public.discussion_votes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dv_post_id   ON public.discussion_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_dv_user_id   ON public.discussion_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_dv_tenant_id ON public.discussion_votes(tenant_id);

DROP POLICY IF EXISTS "dv_tenant_isolation" ON public.discussion_votes;
CREATE POLICY "dv_tenant_isolation" ON public.discussion_votes
    FOR ALL USING (
        tenant_id = (SELECT public.get_my_tenant_id())
    )
    WITH CHECK (
        tenant_id = (SELECT public.get_my_tenant_id())
        AND user_id = auth.uid()
    );

GRANT ALL ON TABLE public.discussion_votes TO authenticated;

CREATE OR REPLACE TRIGGER set_tenant_id_dv
    BEFORE INSERT ON public.discussion_votes
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- ────────────────────────────────────────────────────────────
-- 3. Trigger: keep upvote_count in sync
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_post_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    UPDATE public.discussions
    SET upvote_count = (
        SELECT COUNT(*)
        FROM   public.discussion_votes
        WHERE  post_id   = COALESCE(NEW.post_id, OLD.post_id)
          AND  vote_type = 'upvote'
    )
    WHERE id = COALESCE(NEW.post_id, OLD.post_id);

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_update_post_vote_count ON public.discussion_votes;
CREATE TRIGGER trg_update_post_vote_count
    AFTER INSERT OR UPDATE OR DELETE ON public.discussion_votes
    FOR EACH ROW EXECUTE FUNCTION public.update_post_vote_count();

-- ────────────────────────────────────────────────────────────
-- 4. RPC: toggle_post_vote
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.toggle_post_vote(
    p_post_id   uuid,
    p_vote_type text DEFAULT 'upvote'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id   uuid;
    v_tenant_id uuid;
    v_existing  record;
    v_action    text;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_tenant_id := public.get_my_tenant_id();

    -- Self-vote prevention
    IF EXISTS (
        SELECT 1 FROM public.discussions
        WHERE id = p_post_id AND author_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Tidak dapat memberi vote pada postingan sendiri';
    END IF;

    SELECT * INTO v_existing
    FROM   public.discussion_votes
    WHERE  post_id = p_post_id
      AND  user_id = v_user_id;

    IF FOUND THEN
        IF v_existing.vote_type = p_vote_type THEN
            -- Toggle off: remove the vote
            DELETE FROM public.discussion_votes WHERE id = v_existing.id;
            v_action := 'removed';
        ELSE
            -- Change vote type
            UPDATE public.discussion_votes
            SET    vote_type = p_vote_type
            WHERE  id = v_existing.id;
            v_action := 'changed';
        END IF;
    ELSE
        INSERT INTO public.discussion_votes (post_id, user_id, vote_type, tenant_id)
        VALUES (p_post_id, v_user_id, p_vote_type, v_tenant_id);
        v_action := 'added';
    END IF;

    RETURN jsonb_build_object('action', v_action, 'post_id', p_post_id);
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_post_vote(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.toggle_post_vote(uuid, text) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 5. RPC: accept_discussion_answer (teacher marks best answer)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_discussion_answer(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id   uuid;
    v_thread_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT (public.has_role('TEACHER') OR public.has_role('ADMIN')) THEN
        RAISE EXCEPTION 'Hanya pengajar yang dapat menandai jawaban terbaik';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.discussions WHERE id = p_post_id) THEN
        RAISE EXCEPTION 'Postingan tidak ditemukan';
    END IF;

    -- Get parent thread id for this reply
    SELECT parent_id INTO v_thread_id
    FROM   public.discussions
    WHERE  id = p_post_id;

    IF v_thread_id IS NOT NULL THEN
        -- Un-accept all other answers in the same thread
        UPDATE public.discussions
        SET    is_accepted_answer = false
        WHERE  (parent_id = v_thread_id OR id = v_thread_id)
          AND  id != p_post_id;
    END IF;

    -- Mark this reply as accepted
    UPDATE public.discussions
    SET    is_accepted_answer = true
    WHERE  id = p_post_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_discussion_answer(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.accept_discussion_answer(uuid) TO authenticated;
