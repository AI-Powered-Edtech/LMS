-- ============================================================
-- SP-14: Funnel Analysis
-- Creates funnel_definitions, funnel_step_results tables,
-- RPCs for save/list/delete/get/recompute, RLS, GRANTs,
-- and a pg_cron job at offset :04 (4-59/5).
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.funnel_definitions (
    funnel_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    created_by  UUID NOT NULL REFERENCES auth.users(id),
    course_id   UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    name        TEXT NOT NULL,
    steps       JSONB NOT NULL DEFAULT '[]',   -- ordered array of event_type strings
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.funnel_step_results (
    funnel_id       UUID NOT NULL REFERENCES public.funnel_definitions(funnel_id) ON DELETE CASCADE,
    step_index      INT  NOT NULL,  -- 0-based
    event_type      TEXT NOT NULL,
    user_count      INT  NOT NULL DEFAULT 0,
    conversion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    drop_off_rate   NUMERIC(5,2) NOT NULL DEFAULT 0,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (funnel_id, step_index)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_funnel_definitions_tenant ON public.funnel_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_funnel_definitions_course ON public.funnel_definitions(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_funnel_step_results_funnel ON public.funnel_step_results(funnel_id);

-- ============================================================
-- 2. RLS
-- ============================================================

ALTER TABLE public.funnel_definitions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_step_results ENABLE ROW LEVEL SECURITY;

-- funnel_definitions: tenant-scoped + created_by for writes
CREATE POLICY "funnel_definitions_select" ON public.funnel_definitions
    FOR SELECT
    USING (tenant_id = get_my_tenant_id());

CREATE POLICY "funnel_definitions_insert" ON public.funnel_definitions
    FOR INSERT
    WITH CHECK (tenant_id = get_my_tenant_id() AND created_by = auth.uid());

CREATE POLICY "funnel_definitions_update" ON public.funnel_definitions
    FOR UPDATE
    USING (tenant_id = get_my_tenant_id() AND created_by = auth.uid())
    WITH CHECK (tenant_id = get_my_tenant_id() AND created_by = auth.uid());

CREATE POLICY "funnel_definitions_delete" ON public.funnel_definitions
    FOR DELETE
    USING (tenant_id = get_my_tenant_id() AND created_by = auth.uid());

-- funnel_step_results: readable if the parent funnel belongs to the tenant
CREATE POLICY "funnel_step_results_select" ON public.funnel_step_results
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.funnel_definitions fd
            WHERE fd.funnel_id = funnel_step_results.funnel_id
              AND fd.tenant_id = get_my_tenant_id()
        )
    );

-- ============================================================
-- 3. GRANTS
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_definitions  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_step_results TO authenticated;

-- ============================================================
-- 4. FUNCTION: recompute_funnel
-- ============================================================

CREATE OR REPLACE FUNCTION public.recompute_funnel(p_funnel_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant_id     UUID;
    v_course_id     UUID;
    v_steps         TEXT[];
    v_step_count    INT;
    v_step_idx      INT;        -- 1-based loop counter
    v_event_type    TEXT;
    v_prev_users    UUID[];
    v_curr_users    UUID[];
    v_user_count    INT;
    v_top_count     INT;
    v_conv_rate     NUMERIC(5,2);
    v_drop_rate     NUMERIC(5,2);
BEGIN
    -- Load funnel definition
    SELECT
        fd.tenant_id,
        fd.course_id,
        ARRAY(SELECT jsonb_array_elements_text(fd.steps))
    INTO v_tenant_id, v_course_id, v_steps
    FROM public.funnel_definitions fd
    WHERE fd.funnel_id = p_funnel_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'funnel not found: %', p_funnel_id;
    END IF;

    v_step_count := array_length(v_steps, 1);
    IF v_step_count IS NULL OR v_step_count = 0 THEN
        RETURN;
    END IF;

    -- Clear previous results for this funnel
    DELETE FROM public.funnel_step_results WHERE funnel_id = p_funnel_id;

    -- Collect first step (step index 1, stored as step_index 0)
    v_event_type := v_steps[1];

    IF v_course_id IS NOT NULL THEN
        SELECT ARRAY(
            SELECT DISTINCT le.user_id
            FROM public.learning_events le
            JOIN public.lessons l ON l.id = le.lesson_id
            JOIN public.course_modules cm ON cm.id = l.module_id
            WHERE le.tenant_id = v_tenant_id
              AND le.event_type = v_event_type
              AND cm.course_id = v_course_id
        ) INTO v_curr_users;
    ELSE
        SELECT ARRAY(
            SELECT DISTINCT le.user_id
            FROM public.learning_events le
            WHERE le.tenant_id = v_tenant_id
              AND le.event_type = v_event_type
        ) INTO v_curr_users;
    END IF;

    v_user_count := COALESCE(array_length(v_curr_users, 1), 0);
    v_top_count  := v_user_count;

    INSERT INTO public.funnel_step_results
        (funnel_id, step_index, event_type, user_count, conversion_rate, drop_off_rate, computed_at)
    VALUES
        (p_funnel_id, 0, v_event_type, v_user_count,
         CASE WHEN v_top_count > 0 THEN 100.00 ELSE 0 END,
         0.00,
         NOW());

    -- Walk subsequent steps
    v_prev_users := v_curr_users;

    FOR v_step_idx IN 2 .. v_step_count LOOP
        v_event_type := v_steps[v_step_idx];

        -- Users who fired event[N] AFTER their first occurrence of event[N-1],
        -- restricted to users who passed step[N-1].
        IF array_length(v_prev_users, 1) IS NULL THEN
            -- No one passed previous step; all counts are 0
            v_curr_users := ARRAY[]::UUID[];
        ELSE
            IF v_course_id IS NOT NULL THEN
                SELECT ARRAY(
                    SELECT DISTINCT le2.user_id
                    FROM public.learning_events le2
                    JOIN public.lessons l ON l.id = le2.lesson_id
                    JOIN public.course_modules cm ON cm.id = l.module_id
                    WHERE le2.tenant_id = v_tenant_id
                      AND le2.event_type = v_event_type
                      AND cm.course_id = v_course_id
                      AND le2.user_id = ANY(v_prev_users)
                      AND le2.created_at > (
                          SELECT MIN(le1.created_at)
                          FROM public.learning_events le1
                          WHERE le1.tenant_id = v_tenant_id
                            AND le1.event_type = v_steps[v_step_idx - 1]
                            AND le1.user_id = le2.user_id
                      )
                ) INTO v_curr_users;
            ELSE
                SELECT ARRAY(
                    SELECT DISTINCT le2.user_id
                    FROM public.learning_events le2
                    WHERE le2.tenant_id = v_tenant_id
                      AND le2.event_type = v_event_type
                      AND le2.user_id = ANY(v_prev_users)
                      AND le2.created_at > (
                          SELECT MIN(le1.created_at)
                          FROM public.learning_events le1
                          WHERE le1.tenant_id = v_tenant_id
                            AND le1.event_type = v_steps[v_step_idx - 1]
                            AND le1.user_id = le2.user_id
                      )
                ) INTO v_curr_users;
            END IF;
        END IF;

        v_user_count := COALESCE(array_length(v_curr_users, 1), 0);

        v_conv_rate := CASE
            WHEN v_top_count > 0 THEN ROUND((v_user_count::NUMERIC / v_top_count) * 100, 2)
            ELSE 0
        END;

        v_drop_rate := CASE
            WHEN v_top_count > 0 THEN ROUND(100.00 - v_conv_rate, 2)
            ELSE 0
        END;

        INSERT INTO public.funnel_step_results
            (funnel_id, step_index, event_type, user_count, conversion_rate, drop_off_rate, computed_at)
        VALUES
            (p_funnel_id, v_step_idx - 1, v_event_type, v_user_count, v_conv_rate, v_drop_rate, NOW());

        v_prev_users := v_curr_users;
    END LOOP;

    -- Stamp last_computed_at (using updated_at as the computed marker)
    UPDATE public.funnel_definitions
    SET updated_at = NOW()
    WHERE funnel_id = p_funnel_id;
END;
$$;

-- ============================================================
-- 5. FUNCTION: recompute_all_funnels
-- ============================================================

CREATE OR REPLACE FUNCTION public.recompute_all_funnels()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_funnel_id UUID;
BEGIN
    FOR v_funnel_id IN
        SELECT funnel_id FROM public.funnel_definitions
    LOOP
        BEGIN
            PERFORM public.recompute_funnel(v_funnel_id);
        EXCEPTION WHEN OTHERS THEN
            -- Log and continue; don't let one bad funnel abort all
            RAISE WARNING 'recompute_funnel failed for %: %', v_funnel_id, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- ============================================================
-- 6. FUNCTION: save_funnel_definition
-- ============================================================

CREATE OR REPLACE FUNCTION public.save_funnel_definition(
    p_name      TEXT,
    p_steps     TEXT[],
    p_course_id UUID DEFAULT NULL,
    p_funnel_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant_id UUID;
    v_result_id UUID;
BEGIN
    -- Auth check: must be teacher or admin
    IF NOT (has_role('TEACHER'::app_role) OR has_role('ADMIN'::app_role)) THEN
        RAISE EXCEPTION 'unauthorized: must be teacher or admin';
    END IF;

    v_tenant_id := get_my_tenant_id();

    IF p_funnel_id IS NOT NULL THEN
        -- Update existing funnel (only if owned by this teacher in this tenant)
        UPDATE public.funnel_definitions
        SET name       = p_name,
            steps      = to_jsonb(p_steps),
            course_id  = p_course_id,
            updated_at = NOW()
        WHERE funnel_id = p_funnel_id
          AND tenant_id = v_tenant_id
          AND created_by = auth.uid()
        RETURNING funnel_id INTO v_result_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'funnel not found or access denied';
        END IF;
    ELSE
        -- Insert new funnel
        INSERT INTO public.funnel_definitions
            (tenant_id, created_by, course_id, name, steps)
        VALUES
            (v_tenant_id, auth.uid(), p_course_id, p_name, to_jsonb(p_steps))
        RETURNING funnel_id INTO v_result_id;
    END IF;

    -- Trigger immediate recompute
    PERFORM public.recompute_funnel(v_result_id);

    RETURN v_result_id;
END;
$$;

-- ============================================================
-- 7. FUNCTION: list_funnel_definitions
-- ============================================================

CREATE OR REPLACE FUNCTION public.list_funnel_definitions(
    p_course_id UUID DEFAULT NULL
)
RETURNS TABLE (
    funnel_id       UUID,
    name            TEXT,
    course_id       UUID,
    steps           JSONB,
    step_count      INT,
    created_at      TIMESTAMPTZ,
    last_computed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Auth check
    IF NOT (has_role('TEACHER'::app_role) OR has_role('ADMIN'::app_role)) THEN
        RAISE EXCEPTION 'unauthorized: must be teacher or admin';
    END IF;

    v_tenant_id := get_my_tenant_id();

    RETURN QUERY
    SELECT
        fd.funnel_id,
        fd.name,
        fd.course_id,
        fd.steps,
        jsonb_array_length(fd.steps) AS step_count,
        fd.created_at,
        fd.updated_at AS last_computed_at
    FROM public.funnel_definitions fd
    WHERE fd.tenant_id = v_tenant_id
      AND fd.created_by = auth.uid()
      AND (p_course_id IS NULL OR fd.course_id = p_course_id)
    ORDER BY fd.created_at DESC;
END;
$$;

-- ============================================================
-- 8. FUNCTION: delete_funnel_definition
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_funnel_definition(
    p_funnel_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Auth check
    IF NOT (has_role('TEACHER'::app_role) OR has_role('ADMIN'::app_role)) THEN
        RAISE EXCEPTION 'unauthorized: must be teacher or admin';
    END IF;

    v_tenant_id := get_my_tenant_id();

    DELETE FROM public.funnel_definitions
    WHERE funnel_id = p_funnel_id
      AND tenant_id = v_tenant_id
      AND created_by = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'funnel not found or access denied';
    END IF;
END;
$$;

-- ============================================================
-- 9. FUNCTION: get_funnel_results
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_funnel_results(
    p_funnel_id UUID
)
RETURNS TABLE (
    step_index      INT,
    event_type      TEXT,
    user_count      INT,
    conversion_rate NUMERIC,
    drop_off_rate   NUMERIC,
    computed_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := get_my_tenant_id();

    -- Verify the caller owns or can see this funnel
    IF NOT EXISTS (
        SELECT 1 FROM public.funnel_definitions fd
        WHERE fd.funnel_id = p_funnel_id
          AND fd.tenant_id = v_tenant_id
    ) THEN
        RAISE EXCEPTION 'funnel not found or access denied';
    END IF;

    RETURN QUERY
    SELECT
        fsr.step_index,
        fsr.event_type,
        fsr.user_count,
        fsr.conversion_rate,
        fsr.drop_off_rate,
        fsr.computed_at
    FROM public.funnel_step_results fsr
    WHERE fsr.funnel_id = p_funnel_id
    ORDER BY fsr.step_index;
END;
$$;

-- ============================================================
-- 10. FUNCTION GRANTs
-- ============================================================

GRANT EXECUTE ON FUNCTION public.recompute_funnel(UUID)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_all_funnels()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_funnel_definition(TEXT, TEXT[], UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_funnel_definitions(UUID)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_funnel_definition(UUID)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_funnel_results(UUID)         TO authenticated;

-- ============================================================
-- 11. pg_cron: schedule recompute at offset :04 (4-59/5)
-- ============================================================

SELECT cron.schedule(
    'recompute-funnels',
    '4-59/5 * * * *',
    $$SELECT public.recompute_all_funnels();$$
);
