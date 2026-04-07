-- Phase 31: Gradebook Columns Table
-- Migrates column definitions from sentinel rows in gradebook_entries
-- to a dedicated gradebook_columns table.
--
-- Before: Column definitions were stored as sentinel rows in gradebook_entries
-- (student_id = '00000000-0000-0000-0000-000000000001').
-- After: Column definitions live in gradebook_columns with proper schema.

-- ────────────────────────────────────────────────────────────
-- 1. gradebook_columns — column definitions per course
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gradebook_columns (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
    course_id  UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL CHECK (type IN ('quiz', 'assignment', 'manual')),
    weight     NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    "order"    INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gradebook_columns_tenant ON public.gradebook_columns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_columns_course ON public.gradebook_columns(course_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_columns_order  ON public.gradebook_columns(course_id, "order");

ALTER TABLE public.gradebook_columns ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.gradebook_columns TO authenticated;

-- Teachers/admins can read columns in their tenant
DROP POLICY IF EXISTS "gradebook_columns_read" ON public.gradebook_columns;
CREATE POLICY "gradebook_columns_read" ON public.gradebook_columns
    FOR SELECT USING (tenant_id = public.get_my_tenant_id());

-- Teachers/admins can manage columns in their tenant
DROP POLICY IF EXISTS "gradebook_columns_manage" ON public.gradebook_columns;
CREATE POLICY "gradebook_columns_manage" ON public.gradebook_columns
    FOR ALL USING (
        tenant_id = public.get_my_tenant_id()
        AND public.has_role('TEACHER'::public.app_role)
    )
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND public.has_role('TEACHER'::public.app_role)
    );

CREATE OR REPLACE TRIGGER set_tenant_id_gradebook_columns
    BEFORE INSERT ON public.gradebook_columns
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- ────────────────────────────────────────────────────────────
-- 2. Migrate existing sentinel rows from gradebook_entries
-- ────────────────────────────────────────────────────────────
-- Only runs if the sentinel column-definition rows exist.
-- Sentinel UUID: '00000000-0000-0000-0000-000000000001'

DO $$
DECLARE
    rec RECORD;
    v_order INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT DISTINCT
            tenant_id,
            course_id,
            entity_type,
            entity_id,
            COALESCE(title, entity_type || '_' || entity_id) AS col_name,
            max_score
        FROM public.gradebook_entries
        WHERE student_id = '00000000-0000-0000-0000-000000000001'
          AND entity_type IN ('quiz', 'assignment', 'manual')
        ORDER BY course_id, created_at
    LOOP
        v_order := v_order + 1;

        INSERT INTO public.gradebook_columns (
            tenant_id, course_id, name, type, "order", weight
        ) VALUES (
            rec.tenant_id,
            rec.course_id,
            rec.col_name,
            rec.entity_type,
            v_order,
            1.00
        ) ON CONFLICT DO NOTHING;

        -- Reset order counter per course
        IF NOT FOUND OR v_order > 1000 THEN
            v_order := 0;
        END IF;
    END LOOP;
END;
$$;

COMMENT ON TABLE public.gradebook_columns IS 'Gradebook column definitions per course. Phase 31.';
