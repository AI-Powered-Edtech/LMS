-- Migration: Phase 35B — xAPI / Learning Record Store
-- Creates partitioned xapi_statements table and record_xapi_statement RPC

CREATE TABLE IF NOT EXISTS public.xapi_statements (
    id          uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id    uuid NOT NULL,
    verb        text NOT NULL,
    object_type text NOT NULL CHECK (object_type IN ('lesson','quiz','assignment','course','block')),
    object_id   uuid NOT NULL,
    result      jsonb DEFAULT '{}',
    context     jsonb DEFAULT '{}',
    timestamp   timestamptz DEFAULT now() NOT NULL,
    stored      timestamptz DEFAULT now() NOT NULL,
    tenant_id   uuid NOT NULL,
    PRIMARY KEY (id, stored)
) PARTITION BY RANGE (stored);

CREATE TABLE IF NOT EXISTS public.xapi_statements_2026_04
    PARTITION OF public.xapi_statements
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

CREATE TABLE IF NOT EXISTS public.xapi_statements_2026_07
    PARTITION OF public.xapi_statements
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

CREATE TABLE IF NOT EXISTS public.xapi_statements_2026_10
    PARTITION OF public.xapi_statements
    FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

CREATE TABLE IF NOT EXISTS public.xapi_statements_historic
    PARTITION OF public.xapi_statements DEFAULT;

ALTER TABLE public.xapi_statements ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_xapi_actor_id   ON public.xapi_statements(actor_id);
CREATE INDEX IF NOT EXISTS idx_xapi_tenant_id  ON public.xapi_statements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xapi_verb       ON public.xapi_statements(verb, tenant_id);

CREATE POLICY "xapi_tenant_isolation" ON public.xapi_statements
    FOR ALL USING (tenant_id = (SELECT public.get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

GRANT ALL ON TABLE public.xapi_statements TO authenticated;

-- RPC: record_xapi_statement
CREATE OR REPLACE FUNCTION public.record_xapi_statement(
    p_verb        text,
    p_object_type text,
    p_object_id   uuid,
    p_result      jsonb DEFAULT '{}',
    p_context     jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id   uuid;
    v_tenant_id uuid;
    v_stmt_id   uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
    v_tenant_id := public.get_my_tenant_id();

    INSERT INTO public.xapi_statements (actor_id, verb, object_type, object_id, result, context, tenant_id)
    VALUES (v_user_id, p_verb, p_object_type, p_object_id, p_result, p_context)
    RETURNING id INTO v_stmt_id;

    RETURN v_stmt_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_xapi_statement(text, text, uuid, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_xapi_statement(text, text, uuid, jsonb, jsonb) TO authenticated;
