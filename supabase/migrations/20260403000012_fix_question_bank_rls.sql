-- Fix: Explicit RLS policies for question_bank table
-- FIXED: Policy names aligned with spec, DELETE policy allows teacher-own + admin
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qb_teachers_read"   ON public.question_bank;
DROP POLICY IF EXISTS "qb_teachers_insert" ON public.question_bank;
DROP POLICY IF EXISTS "qb_teachers_update" ON public.question_bank;
DROP POLICY IF EXISTS "qb_delete"          ON public.question_bank;

-- Also drop old policy names from previous migration version
DROP POLICY IF EXISTS "teachers_read_questions"       ON public.question_bank;
DROP POLICY IF EXISTS "teachers_insert_questions"     ON public.question_bank;
DROP POLICY IF EXISTS "teachers_update_own_questions" ON public.question_bank;
DROP POLICY IF EXISTS "admins_delete_questions"       ON public.question_bank;

-- SELECT: teachers/admins in same tenant
CREATE POLICY "qb_teachers_read" ON public.question_bank
    FOR SELECT
    USING (tenant_id = get_my_tenant_id());

-- INSERT: teachers/admins only
CREATE POLICY "qb_teachers_insert" ON public.question_bank
    FOR INSERT
    WITH CHECK (
        tenant_id = get_my_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id   = auth.uid()
              AND ur.tenant_id = get_my_tenant_id()
              AND UPPER(ur.role::text) IN ('TEACHER','ADMIN')
        )
    );

-- UPDATE: own questions OR admin
CREATE POLICY "qb_teachers_update" ON public.question_bank
    FOR UPDATE
    USING (
        tenant_id = get_my_tenant_id()
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE ur.user_id = auth.uid()
                  AND ur.tenant_id = get_my_tenant_id()
                  AND UPPER(ur.role::text) = 'ADMIN'
            )
        )
    );

-- DELETE: same as UPDATE
CREATE POLICY "qb_delete" ON public.question_bank
    FOR DELETE
    USING (
        tenant_id = get_my_tenant_id()
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE ur.user_id = auth.uid()
                  AND ur.tenant_id = get_my_tenant_id()
                  AND UPPER(ur.role::text) = 'ADMIN'
            )
        )
    );
