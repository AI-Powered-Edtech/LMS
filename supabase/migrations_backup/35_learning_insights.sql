-- ==========================================================================
-- Migration 35: Learning Insights (AI-Ready)
--
-- Creates the course_insights table to store computed insights and patterns
-- detected in student data, ready for ingestion by the AI Tutor.
-- ==========================================================================

-- 1. Create the course_insights table
CREATE TABLE IF NOT EXISTS public.course_insights (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    insight_type text NOT NULL, -- e.g., 'bottleneck', 'engagement_drop', 'high_performer_pattern'
    severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    data jsonb DEFAULT '{}'::jsonb, -- dynamic structure for the insight data
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Add indexes
CREATE INDEX IF NOT EXISTS idx_course_insights_tenant ON public.course_insights(tenant_id);
CREATE INDEX IF NOT EXISTS idx_course_insights_course ON public.course_insights(course_id);
CREATE INDEX IF NOT EXISTS idx_course_insights_type ON public.course_insights(insight_type);

-- 3. Enable RLS
ALTER TABLE public.course_insights ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Admins can manage tenant insights"
ON public.course_insights FOR ALL
USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid 
    AND (auth.jwt() ->> 'role') = 'admin'
)
WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid 
    AND (auth.jwt() ->> 'role') = 'admin'
);

CREATE POLICY "Teachers can view tenant insights"
ON public.course_insights FOR SELECT
USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid 
    AND (auth.jwt() ->> 'role') IN ('teacher', 'admin')
);

-- 5. Trigger for updated_at
CREATE TRIGGER set_course_insights_updated_at
BEFORE UPDATE ON public.course_insights
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.course_insights IS 'Storage for AI-ready insights and pattern detection results.';
