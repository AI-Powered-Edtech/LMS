-- Phase 35C: LTI Grade Passback
-- Adds AGS fields to lti_platform_registrations and creates audit log table

ALTER TABLE public.lti_platform_registrations
    ADD COLUMN IF NOT EXISTS ags_lineitem_url text,
    ADD COLUMN IF NOT EXISTS ags_scope        text;

-- lti_grade_passback_log: audit log for grade passback attempts
CREATE TABLE IF NOT EXISTS public.lti_grade_passback_log (
    id               uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    platform_id      uuid REFERENCES public.lti_platform_registrations(id) ON DELETE SET NULL,
    user_id          uuid NOT NULL REFERENCES auth.users(id),
    resource_type    text NOT NULL CHECK (resource_type IN ('quiz','assignment')),
    resource_id      uuid NOT NULL,
    score_sent       numeric(5,2),
    max_score        numeric(5,2),
    status           text DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
    error_message    text,
    tenant_id        uuid NOT NULL,
    created_at       timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.lti_grade_passback_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_lgpl_tenant_id ON public.lti_grade_passback_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lgpl_user_id ON public.lti_grade_passback_log(user_id);
CREATE INDEX IF NOT EXISTS idx_lgpl_created_at ON public.lti_grade_passback_log(created_at DESC);

CREATE POLICY "lgpl_tenant_isolation" ON public.lti_grade_passback_log
    FOR ALL USING (tenant_id = (SELECT public.get_my_tenant_id()));

GRANT ALL ON TABLE public.lti_grade_passback_log TO authenticated;

CREATE TRIGGER set_tenant_id_lgpl
    BEFORE INSERT ON public.lti_grade_passback_log
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

COMMENT ON TABLE public.lti_grade_passback_log IS
    'Audit log for LTI 1.3 Assignment and Grade Services (AGS) grade passback attempts. Phase 35C.';
