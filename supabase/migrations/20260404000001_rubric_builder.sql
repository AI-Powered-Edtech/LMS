-- ============================================================
-- Phase 31A: Dynamic Rubric Builder
-- ============================================================

-- rubrics table
CREATE TABLE IF NOT EXISTS public.rubrics (
    id              uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    assignment_id   uuid REFERENCES public.assignments(id) ON DELETE SET NULL,
    title           text NOT NULL,
    description     text,
    is_template     boolean DEFAULT false,
    total_points    int DEFAULT 0,
    tenant_id       uuid NOT NULL,
    created_by      uuid NOT NULL REFERENCES auth.users(id),
    created_at      timestamptz DEFAULT now() NOT NULL,
    updated_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rubrics_tenant_id ON public.rubrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rubrics_assignment_id ON public.rubrics(assignment_id);
CREATE INDEX IF NOT EXISTS idx_rubrics_is_template ON public.rubrics(is_template) WHERE is_template = true;

CREATE POLICY "rubrics_tenant_isolation" ON public.rubrics
    FOR ALL USING (tenant_id = (SELECT public.get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

GRANT ALL ON TABLE public.rubrics TO authenticated;

CREATE TRIGGER set_tenant_id_rubrics
    BEFORE INSERT ON public.rubrics
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- rubric_criteria table
CREATE TABLE IF NOT EXISTS public.rubric_criteria (
    id          uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    rubric_id   uuid NOT NULL REFERENCES public.rubrics(id) ON DELETE CASCADE,
    title       text NOT NULL,
    description text,
    max_points  int NOT NULL DEFAULT 10,
    "order"     int DEFAULT 0,
    tenant_id   uuid NOT NULL,
    created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rubric_criteria_rubric_id ON public.rubric_criteria(rubric_id);
CREATE INDEX IF NOT EXISTS idx_rubric_criteria_tenant_id ON public.rubric_criteria(tenant_id);

CREATE POLICY "rubric_criteria_tenant_isolation" ON public.rubric_criteria
    FOR ALL USING (tenant_id = (SELECT public.get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

GRANT ALL ON TABLE public.rubric_criteria TO authenticated;

CREATE TRIGGER set_tenant_id_rubric_criteria
    BEFORE INSERT ON public.rubric_criteria
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- rubric_levels table
CREATE TABLE IF NOT EXISTS public.rubric_levels (
    id           uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    criterion_id uuid NOT NULL REFERENCES public.rubric_criteria(id) ON DELETE CASCADE,
    label        text NOT NULL,
    description  text,
    points       int NOT NULL DEFAULT 0,
    "order"      int DEFAULT 0,
    tenant_id    uuid NOT NULL,
    created_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.rubric_levels ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rubric_levels_criterion_id ON public.rubric_levels(criterion_id);
CREATE INDEX IF NOT EXISTS idx_rubric_levels_tenant_id ON public.rubric_levels(tenant_id);

CREATE POLICY "rubric_levels_tenant_isolation" ON public.rubric_levels
    FOR ALL USING (tenant_id = (SELECT public.get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

GRANT ALL ON TABLE public.rubric_levels TO authenticated;

CREATE TRIGGER set_tenant_id_rubric_levels
    BEFORE INSERT ON public.rubric_levels
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- rubric_scores table
CREATE TABLE IF NOT EXISTS public.rubric_scores (
    id            uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    submission_id uuid NOT NULL REFERENCES public.assignment_submissions(id) ON DELETE CASCADE,
    criterion_id  uuid NOT NULL REFERENCES public.rubric_criteria(id) ON DELETE CASCADE,
    level_id      uuid REFERENCES public.rubric_levels(id) ON DELETE SET NULL,
    score         numeric(5,2) NOT NULL DEFAULT 0,
    comment       text,
    graded_by     uuid REFERENCES auth.users(id),
    tenant_id     uuid NOT NULL,
    created_at    timestamptz DEFAULT now() NOT NULL,
    updated_at    timestamptz DEFAULT now() NOT NULL,
    UNIQUE (submission_id, criterion_id)
);

ALTER TABLE public.rubric_scores ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rubric_scores_submission_id ON public.rubric_scores(submission_id);
CREATE INDEX IF NOT EXISTS idx_rubric_scores_tenant_id ON public.rubric_scores(tenant_id);

CREATE POLICY "rubric_scores_tenant_isolation" ON public.rubric_scores
    FOR ALL USING (tenant_id = (SELECT public.get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

GRANT ALL ON TABLE public.rubric_scores TO authenticated;

CREATE TRIGGER set_tenant_id_rubric_scores
    BEFORE INSERT ON public.rubric_scores
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- ============================================================
-- RPCs
-- ============================================================

-- save_rubric: upsert rubric + criteria + levels transactionally
CREATE OR REPLACE FUNCTION public.save_rubric(p_rubric jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id    uuid;
    v_tenant_id  uuid;
    v_rubric_id  uuid;
    v_criterion  jsonb;
    v_level      jsonb;
    v_crit_id    uuid;
    v_total_pts  int := 0;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    v_tenant_id := public.get_my_tenant_id();

    -- Upsert rubric
    INSERT INTO public.rubrics (id, assignment_id, title, description, is_template, tenant_id, created_by)
    VALUES (
        COALESCE((p_rubric->>'id')::uuid, gen_random_uuid()),
        NULLIF(p_rubric->>'assignment_id', '')::uuid,
        p_rubric->>'title',
        p_rubric->>'description',
        COALESCE((p_rubric->>'is_template')::boolean, false),
        v_tenant_id,
        v_user_id
    )
    ON CONFLICT (id) DO UPDATE SET
        title       = EXCLUDED.title,
        description = EXCLUDED.description,
        is_template = EXCLUDED.is_template,
        updated_at  = now()
    RETURNING id INTO v_rubric_id;

    -- Delete old criteria (cascade deletes levels)
    DELETE FROM public.rubric_criteria WHERE rubric_id = v_rubric_id;

    -- Insert criteria and levels
    FOR v_criterion IN SELECT * FROM jsonb_array_elements(COALESCE(p_rubric->'criteria', '[]'::jsonb))
    LOOP
        INSERT INTO public.rubric_criteria (id, rubric_id, title, description, max_points, "order", tenant_id)
        VALUES (
            COALESCE((v_criterion->>'id')::uuid, gen_random_uuid()),
            v_rubric_id,
            v_criterion->>'title',
            v_criterion->>'description',
            COALESCE((v_criterion->>'max_points')::int, 10),
            COALESCE((v_criterion->>'order')::int, 0),
            v_tenant_id
        )
        RETURNING id INTO v_crit_id;

        v_total_pts := v_total_pts + COALESCE((v_criterion->>'max_points')::int, 10);

        FOR v_level IN SELECT * FROM jsonb_array_elements(COALESCE(v_criterion->'levels', '[]'::jsonb))
        LOOP
            INSERT INTO public.rubric_levels (criterion_id, label, description, points, "order", tenant_id)
            VALUES (
                v_crit_id,
                v_level->>'label',
                v_level->>'description',
                COALESCE((v_level->>'points')::int, 0),
                COALESCE((v_level->>'order')::int, 0),
                v_tenant_id
            );
        END LOOP;
    END LOOP;

    UPDATE public.rubrics SET total_points = v_total_pts, updated_at = now() WHERE id = v_rubric_id;

    RETURN v_rubric_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_rubric(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_rubric(jsonb) TO authenticated;

-- get_rubric_with_criteria: deep join for a rubric
CREATE OR REPLACE FUNCTION public.get_rubric_with_criteria(p_rubric_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id   uuid;
    v_result    jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    SELECT jsonb_build_object(
        'id',          r.id,
        'title',       r.title,
        'description', r.description,
        'is_template', r.is_template,
        'total_points',r.total_points,
        'assignment_id', r.assignment_id,
        'tenant_id',   r.tenant_id,
        'created_by',  r.created_by,
        'created_at',  r.created_at,
        'criteria', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id',          c.id,
                    'title',       c.title,
                    'description', c.description,
                    'max_points',  c.max_points,
                    'order',       c."order",
                    'levels', COALESCE((
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'id',          l.id,
                                'label',       l.label,
                                'description', l.description,
                                'points',      l.points,
                                'order',       l."order"
                            ) ORDER BY l."order"
                        )
                        FROM public.rubric_levels l WHERE l.criterion_id = c.id
                    ), '[]'::jsonb)
                ) ORDER BY c."order"
            )
            FROM public.rubric_criteria c WHERE c.rubric_id = r.id
        ), '[]'::jsonb)
    ) INTO v_result
    FROM public.rubrics r
    WHERE r.id = p_rubric_id AND r.tenant_id = public.get_my_tenant_id();

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_rubric_with_criteria(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rubric_with_criteria(uuid) TO authenticated;

-- score_submission_rubric: bulk upsert rubric scores for a submission
CREATE OR REPLACE FUNCTION public.score_submission_rubric(
    p_submission_id uuid,
    p_scores        jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id   uuid;
    v_tenant_id uuid;
    v_score     jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
    v_tenant_id := public.get_my_tenant_id();

    FOR v_score IN SELECT * FROM jsonb_array_elements(p_scores)
    LOOP
        INSERT INTO public.rubric_scores (submission_id, criterion_id, level_id, score, comment, graded_by, tenant_id)
        VALUES (
            p_submission_id,
            (v_score->>'criterion_id')::uuid,
            NULLIF(v_score->>'level_id', '')::uuid,
            COALESCE((v_score->>'score')::numeric, 0),
            v_score->>'comment',
            v_user_id,
            v_tenant_id
        )
        ON CONFLICT (submission_id, criterion_id) DO UPDATE SET
            level_id   = EXCLUDED.level_id,
            score      = EXCLUDED.score,
            comment    = EXCLUDED.comment,
            graded_by  = EXCLUDED.graded_by,
            updated_at = now();
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.score_submission_rubric(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.score_submission_rubric(uuid, jsonb) TO authenticated;
