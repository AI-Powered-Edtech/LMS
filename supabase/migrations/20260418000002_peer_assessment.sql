-- Phase 33B: Peer Review System
-- Creates peer_review_config and peer_reviews tables with RLS + assignment RPC

CREATE TABLE IF NOT EXISTS public.peer_review_config (
    id                  uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    assignment_id       uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    reviews_per_student int NOT NULL DEFAULT 3 CHECK (reviews_per_student BETWEEN 1 AND 5),
    is_anonymous        boolean DEFAULT true,
    rubric_id           uuid REFERENCES public.rubrics(id) ON DELETE SET NULL,
    weight_in_grade     numeric(3,2) DEFAULT 0.20 CHECK (weight_in_grade BETWEEN 0 AND 1),
    status              text DEFAULT 'pending' CHECK (status IN ('pending','assigning','in_review','completed')),
    due_date            timestamptz,
    tenant_id           uuid NOT NULL,
    created_by          uuid NOT NULL REFERENCES auth.users(id),
    created_at          timestamptz DEFAULT now() NOT NULL,
    UNIQUE (assignment_id)
);
ALTER TABLE public.peer_review_config ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_prc_assignment_id ON public.peer_review_config(assignment_id);
CREATE INDEX IF NOT EXISTS idx_prc_tenant_id     ON public.peer_review_config(tenant_id);
CREATE POLICY "prc_tenant_isolation" ON public.peer_review_config
    FOR ALL USING (tenant_id = (SELECT public.get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));
GRANT ALL ON TABLE public.peer_review_config TO authenticated;
CREATE TRIGGER set_tenant_id_prc
    BEFORE INSERT ON public.peer_review_config
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

CREATE TABLE IF NOT EXISTS public.peer_reviews (
    id              uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    config_id       uuid NOT NULL REFERENCES public.peer_review_config(id) ON DELETE CASCADE,
    reviewer_id     uuid NOT NULL REFERENCES auth.users(id),
    submission_id   uuid NOT NULL REFERENCES public.assignment_submissions(id) ON DELETE CASCADE,
    status          text DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','submitted','disputed')),
    overall_score   numeric(5,2),
    overall_comment text,
    submitted_at    timestamptz,
    tenant_id       uuid NOT NULL,
    created_at      timestamptz DEFAULT now() NOT NULL,
    UNIQUE (reviewer_id, submission_id)
);
ALTER TABLE public.peer_reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_pr_reviewer_id   ON public.peer_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_pr_submission_id ON public.peer_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_pr_tenant_id     ON public.peer_reviews(tenant_id);
-- Reviewers see their own; teachers/admins see all in tenant
CREATE POLICY "pr_access" ON public.peer_reviews
    FOR ALL USING (
        tenant_id = (SELECT public.get_my_tenant_id())
        AND (reviewer_id = auth.uid() OR public.has_role('TEACHER') OR public.has_role('ADMIN'))
    )
    WITH CHECK (
        tenant_id = (SELECT public.get_my_tenant_id())
        AND reviewer_id = auth.uid()
    );
GRANT ALL ON TABLE public.peer_reviews TO authenticated;
CREATE TRIGGER set_tenant_id_pr
    BEFORE INSERT ON public.peer_reviews
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- RPC: assign_peer_reviews — randomly assign reviewers ensuring no self-review
CREATE OR REPLACE FUNCTION public.assign_peer_reviews(p_config_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id    uuid;
    v_tenant_id  uuid;
    v_config     record;
    v_assignment record;
    v_submissions uuid[];
    v_reviewer   uuid;
    v_sub_id     uuid;
    v_assigned   int := 0;
    rec          record;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
    v_tenant_id := public.get_my_tenant_id();

    SELECT * INTO v_config FROM public.peer_review_config WHERE id = p_config_id AND tenant_id = v_tenant_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Config not found'; END IF;

    SELECT * INTO v_assignment FROM public.assignments WHERE id = v_config.assignment_id AND tenant_id = v_tenant_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Assignment not found'; END IF;

    -- Get submitted student IDs
    SELECT ARRAY_AGG(s.id)
    INTO v_submissions
    FROM public.assignment_submissions s
    WHERE s.assignment_id = v_config.assignment_id
      AND s.status IN ('submitted','graded')
      AND s.tenant_id = v_tenant_id;

    IF v_submissions IS NULL OR ARRAY_LENGTH(v_submissions, 1) < 2 THEN
        RAISE EXCEPTION 'Need at least 2 submissions to assign peer reviews';
    END IF;

    -- For each submission, assign reviews_per_student reviewers
    FOREACH v_sub_id IN ARRAY v_submissions LOOP
        -- Get the submitter ID
        SELECT student_id INTO v_reviewer FROM public.assignment_submissions WHERE id = v_sub_id;

        -- Assign other students to review this submission (exclude self)
        FOR rec IN
            SELECT s.student_id
            FROM public.assignment_submissions s
            WHERE s.assignment_id = v_config.assignment_id
              AND s.student_id != v_reviewer
              AND s.status IN ('submitted','graded')
              AND NOT EXISTS (
                  SELECT 1 FROM public.peer_reviews pr2
                  WHERE pr2.reviewer_id = s.student_id AND pr2.submission_id = v_sub_id
              )
            ORDER BY random()
            LIMIT v_config.reviews_per_student
        LOOP
            INSERT INTO public.peer_reviews (config_id, reviewer_id, submission_id, status, tenant_id)
            VALUES (p_config_id, rec.student_id, v_sub_id, 'assigned', v_tenant_id)
            ON CONFLICT (reviewer_id, submission_id) DO NOTHING;
            v_assigned := v_assigned + 1;
        END LOOP;
    END LOOP;

    UPDATE public.peer_review_config SET status = 'in_review' WHERE id = p_config_id;
    RETURN v_assigned;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_peer_reviews(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_peer_reviews(uuid) TO authenticated;
