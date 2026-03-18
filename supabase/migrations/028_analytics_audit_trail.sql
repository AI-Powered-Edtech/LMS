-- ==========================================================================
-- Migration 28: Analytics Audit Trail
--
-- Creates an audit trail for analytics access to track who is viewing 
-- which course data and when.
-- ==========================================================================

-- 1. Create the analytics audit table
CREATE TABLE IF NOT EXISTS public.analytics_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    action text NOT NULL,
    course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address inet,
    user_agent text,
    timestamp timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.analytics_audit ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Only admins can view all audit logs in their tenant
CREATE POLICY "Admins can view tenant analytics audit"
ON public.analytics_audit FOR SELECT
USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid 
    AND (auth.jwt() ->> 'role') = 'admin'
);

-- Teachers can view logs related to their own actions or their courses
CREATE POLICY "Teachers can view related analytics audit"
ON public.analytics_audit FOR SELECT
USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid 
    AND (auth.jwt() ->> 'role') = 'teacher'
    AND (
        user_id = auth.uid() 
        OR 
        course_id IN (SELECT id FROM public.courses WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
    )
);

-- 4. Function to log analytics access
CREATE OR REPLACE FUNCTION public.log_analytics_access(
    p_action text,
    p_course_id uuid DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.analytics_audit (
        tenant_id,
        user_id,
        action,
        course_id,
        metadata,
        ip_address,
        user_agent
    )
    VALUES (
        (auth.jwt() ->> 'tenant_id')::uuid,
        auth.uid(),
        p_action,
        p_course_id,
        p_metadata,
        (SELECT inet_client_addr()),
        (SELECT current_setting('request.headers', true)::jsonb ->> 'user-agent')
    );
END;
$$;

COMMENT ON TABLE public.analytics_audit IS 'Audit trail for analytics access and actions.';
COMMENT ON FUNCTION public.log_analytics_access IS 'Utility function to log analytics-related actions with tenant and user context.';
