-- 039_academic_years.sql
-- Fase 1 Unit 12: Indonesia academic-year structure
--
-- Tahun ajaran (academic year) is the parent of semester. Indonesia school
-- calendar runs roughly Jul → Jun, formatted as "2026/2027". Each tenant has
-- exactly one ACTIVE academic year at a time; historical years remain ARCHIVED.

CREATE TABLE IF NOT EXISTS public.academic_years (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    label           TEXT         NOT NULL,           -- "2026/2027"
    starts_on       DATE         NOT NULL,           -- typically July 1
    ends_on         DATE         NOT NULL,           -- typically June 30
    status          TEXT         NOT NULL DEFAULT 'planned'
                                 CHECK (status IN ('planned', 'active', 'archived')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by      UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,

    UNIQUE (tenant_id, label),
    CHECK (ends_on > starts_on)
);

CREATE INDEX IF NOT EXISTS idx_academic_years_tenant ON public.academic_years(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_active
    ON public.academic_years(tenant_id) WHERE status = 'active';

-- At-most-one active academic year per tenant (enforced via partial unique index).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_academic_years_one_active_per_tenant
    ON public.academic_years(tenant_id)
    WHERE status = 'active';

-- Realtime notify trigger (matches pattern in migration 014).
DROP TRIGGER IF EXISTS trg_academic_years_realtime ON public.academic_years;
CREATE OR REPLACE FUNCTION public.notify_academic_years_change()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
    PERFORM pg_notify(
        'realtime_changes',
        json_build_object(
            'table', 'academic_years',
            'tenant_id', COALESCE(NEW.tenant_id, OLD.tenant_id),
            'op', TG_OP
        )::text
    );
    RETURN COALESCE(NEW, OLD);
END
$fn$;
CREATE TRIGGER trg_academic_years_realtime
    AFTER INSERT OR UPDATE OR DELETE ON public.academic_years
    FOR EACH ROW EXECUTE FUNCTION public.notify_academic_years_change();

-- Auto-update updated_at.
DROP TRIGGER IF EXISTS trg_academic_years_updated_at ON public.academic_years;
CREATE OR REPLACE FUNCTION public.touch_academic_years_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END
$fn$;
CREATE TRIGGER trg_academic_years_updated_at
    BEFORE UPDATE ON public.academic_years
    FOR EACH ROW EXECUTE FUNCTION public.touch_academic_years_updated_at();

-- RPC: switch active year atomically. Archives the previously-active year and
-- promotes the target year. Refuses if target is already archived.
CREATE OR REPLACE FUNCTION public.set_active_academic_year(
    p_tenant_id UUID,
    p_year_id   UUID
)
RETURNS public.academic_years
LANGUAGE plpgsql
AS $fn$
DECLARE
    target public.academic_years;
BEGIN
    SELECT * INTO target FROM public.academic_years
        WHERE id = p_year_id AND tenant_id = p_tenant_id
        FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'academic_year not found' USING ERRCODE = 'P0002';
    END IF;
    IF target.status = 'archived' THEN
        RAISE EXCEPTION 'cannot reactivate archived year' USING ERRCODE = 'P0003';
    END IF;

    UPDATE public.academic_years
       SET status = 'archived', updated_at = now()
     WHERE tenant_id = p_tenant_id AND status = 'active' AND id <> p_year_id;

    UPDATE public.academic_years
       SET status = 'active', updated_at = now()
     WHERE id = p_year_id
    RETURNING * INTO target;

    RETURN target;
END
$fn$;

GRANT EXECUTE ON FUNCTION public.set_active_academic_year(UUID, UUID) TO PUBLIC;
