-- Fix: Enable RLS pada aggregation_state + restrict ke admin only
ALTER TABLE public.aggregation_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_read_aggregation_state" ON public.aggregation_state;
CREATE POLICY "admins_read_aggregation_state"
    ON public.aggregation_state FOR SELECT
    USING (
        tenant_id = get_my_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = get_my_tenant_id()
              AND UPPER(ur.role::text) IN ('ADMIN', 'TEACHER')
        )
    );

-- System processes (background jobs via service role) bypass RLS anyway
-- so no SECURITY DEFINER needed here
