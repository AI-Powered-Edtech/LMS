-- Content Reports table for moderation system
CREATE TABLE IF NOT EXISTS public.content_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  content_id    TEXT NOT NULL,
  content_type  TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'assignment', 'user')),
  reporter_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_name TEXT NOT NULL,
  reason        TEXT NOT NULL CHECK (reason IN ('ai_generated', 'inappropriate', 'spam', 'harassment', 'other')),
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  content_snippet TEXT,
  content_author  TEXT,
  resolved_by   UUID REFERENCES auth.users(id),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_content_reports_tenant_id ON public.content_reports(tenant_id);
CREATE INDEX idx_content_reports_status ON public.content_reports(status);
CREATE INDEX idx_content_reports_reporter_id ON public.content_reports(reporter_id);

-- RLS
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Teachers and admins can read all reports for their tenant
CREATE POLICY "tenant_read_reports"
  ON public.content_reports FOR SELECT
  USING (tenant_id = (SELECT get_my_tenant_id()));

-- Any authenticated user can submit a report
CREATE POLICY "user_insert_report"
  ON public.content_reports FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT get_my_tenant_id())
    AND reporter_id = auth.uid()
  );

-- Only admins/teachers can update (resolve) reports
CREATE POLICY "admin_update_report"
  ON public.content_reports FOR UPDATE
  USING (
    tenant_id = (SELECT get_my_tenant_id())
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'teacher')
        AND tenant_id = (SELECT get_my_tenant_id())
    )
  );
