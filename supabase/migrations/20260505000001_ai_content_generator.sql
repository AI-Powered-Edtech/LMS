-- Phase 38A: AI Content Generator — Production Ready
-- Tables: ai_generated_content, ai_generation_logs
-- Provides persistence, history, and usage tracking for the AI Content Generator.
-- Follows multi-tenant architecture: tenant_id required, RLS enabled, auto_set_tenant_id trigger.

-- ─── ai_generated_content ─────────────────────────────────────────────────────
-- Stores AI-generated content (quizzes, reading tasks, writing prompts)
-- created by teachers/admins from uploaded documents.

CREATE TABLE IF NOT EXISTS public.ai_generated_content (
    id              uuid        DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_by      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name       text        NOT NULL,
    file_type       text        NOT NULL,
    assignment_type text        NOT NULL CHECK (assignment_type IN ('quiz', 'reading', 'writing')),
    bloom_level     text        NOT NULL,
    question_count  integer     NOT NULL CHECK (question_count BETWEEN 1 AND 50),
    summary         text,
    questions       jsonb       NOT NULL DEFAULT '[]'::jsonb,
    used_at         timestamptz,
    created_at      timestamptz DEFAULT now() NOT NULL,
    updated_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_generated_content ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_gen_content_tenant_id  ON public.ai_generated_content(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_gen_content_created_by ON public.ai_generated_content(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_gen_content_created_at ON public.ai_generated_content(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_gen_content_type       ON public.ai_generated_content(assignment_type);

GRANT ALL ON TABLE public.ai_generated_content TO authenticated;

DROP POLICY IF EXISTS "ai_gen_content_select"  ON public.ai_generated_content;
DROP POLICY IF EXISTS "ai_gen_content_insert"  ON public.ai_generated_content;
DROP POLICY IF EXISTS "ai_gen_content_update"  ON public.ai_generated_content;
DROP POLICY IF EXISTS "ai_gen_content_delete"  ON public.ai_generated_content;

CREATE POLICY "ai_gen_content_select" ON public.ai_generated_content
    FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()));

CREATE POLICY "ai_gen_content_insert" ON public.ai_generated_content
    FOR INSERT WITH CHECK (
        tenant_id = (SELECT public.get_my_tenant_id())
        AND created_by = auth.uid()
    );

CREATE POLICY "ai_gen_content_update" ON public.ai_generated_content
    FOR UPDATE USING (
        tenant_id = (SELECT public.get_my_tenant_id())
        AND created_by = auth.uid()
    );

CREATE POLICY "ai_gen_content_delete" ON public.ai_generated_content
    FOR DELETE USING (
        tenant_id = (SELECT public.get_my_tenant_id())
        AND created_by = auth.uid()
    );

CREATE OR REPLACE TRIGGER set_tenant_id_ai_gen_content
    BEFORE INSERT ON public.ai_generated_content
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

CREATE OR REPLACE TRIGGER touch_updated_at_ai_gen_content
    BEFORE UPDATE ON public.ai_generated_content
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ─── ai_generation_logs ────────────────────────────────────────────────────────
-- Append-only usage log for AI generation events.
-- Inserted by the edge function via service role (bypasses RLS).
-- Used for rate limiting, cost attribution, and usage analytics.

CREATE TABLE IF NOT EXISTS public.ai_generation_logs (
    id              uuid        DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    generation_id   uuid        REFERENCES public.ai_generated_content(id) ON DELETE SET NULL,
    assignment_type text        NOT NULL,
    bloom_level     text        NOT NULL,
    question_count  integer     NOT NULL,
    file_name       text        NOT NULL,
    file_size_bytes integer,
    processing_ms   integer,
    tokens_used     integer,
    model           text        NOT NULL DEFAULT 'llama-3.1-70b-versatile',
    status          text        NOT NULL DEFAULT 'success'
                                CHECK (status IN ('success', 'error', 'rate_limited')),
    error_message   text,
    created_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_gen_logs_tenant_id  ON public.ai_generation_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_gen_logs_user_id    ON public.ai_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_gen_logs_created_at ON public.ai_generation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_gen_logs_status     ON public.ai_generation_logs(status);

GRANT SELECT ON TABLE public.ai_generation_logs TO authenticated;

-- Read: users see their own tenant logs (for admin analytics dashboard)
-- Insert/Update/Delete: service role only (edge function uses service key)
DROP POLICY IF EXISTS "ai_gen_logs_select" ON public.ai_generation_logs;
CREATE POLICY "ai_gen_logs_select" ON public.ai_generation_logs
    FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()));

-- RPC: get_ai_generation_stats
-- Returns usage statistics for a tenant (for admin analytics)
CREATE OR REPLACE FUNCTION public.get_ai_generation_stats(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
    v_caller_tenant uuid;
    v_result jsonb;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    v_caller_tenant := public.get_my_tenant_id();
    IF v_caller_tenant IS DISTINCT FROM p_tenant_id THEN
        RAISE EXCEPTION 'Forbidden';
    END IF;

    SELECT jsonb_build_object(
        'total_generations',    COUNT(*),
        'success_count',        COUNT(*) FILTER (WHERE status = 'success'),
        'error_count',          COUNT(*) FILTER (WHERE status = 'error'),
        'rate_limited_count',   COUNT(*) FILTER (WHERE status = 'rate_limited'),
        'total_questions',      COALESCE(SUM(question_count) FILTER (WHERE status = 'success'), 0),
        'unique_users',         COUNT(DISTINCT user_id),
        'avg_processing_ms',    ROUND(AVG(processing_ms) FILTER (WHERE status = 'success'))
    ) INTO v_result
    FROM public.ai_generation_logs
    WHERE tenant_id = p_tenant_id;

    RETURN v_result;
END;
$$;
