-- Create calendar_events table for user-created events
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    start_date  DATE NOT NULL,
    end_date    DATE,
    event_type  TEXT NOT NULL DEFAULT 'personal'
                    CHECK (event_type IN ('personal','school','reminder','other')),
    color       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_date
    ON public.calendar_events (tenant_id, start_date);

-- Creator can CRUD their own events
CREATE POLICY "calendar_creator_access"
    ON public.calendar_events FOR ALL
    USING  (created_by = auth.uid() AND tenant_id = get_my_tenant_id())
    WITH CHECK (created_by = auth.uid() AND tenant_id = get_my_tenant_id());

-- All tenant members can see school events
CREATE POLICY "calendar_school_events_read"
    ON public.calendar_events FOR SELECT
    USING (tenant_id = get_my_tenant_id() AND event_type = 'school');

-- Update trigger
CREATE OR REPLACE FUNCTION public.set_calendar_event_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_calendar_events_updated
    BEFORE UPDATE ON public.calendar_events
    FOR EACH ROW EXECUTE FUNCTION public.set_calendar_event_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
