-- 035_admin_backfill.sql
-- Fill missing tables + RPCs surfaced by admin QA sweep.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------- tenant_invitations (used by admin /users Invitations tab) --------
CREATE TABLE IF NOT EXISTS public.tenant_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  email       text NOT NULL,
  role        text NOT NULL,
  status      text NOT NULL DEFAULT 'pending',
  token       text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant ON public.tenant_invitations(tenant_id, status);

-- -------- PPDB tables --------
CREATE TABLE IF NOT EXISTS public.ppdb_periods (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  academic_year  text NOT NULL,
  name           text NOT NULL,
  start_date     date NOT NULL,
  end_date       date NOT NULL,
  quota          integer NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'draft',
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ppdb_periods_tenant ON public.ppdb_periods(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ppdb_registrations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  period_id           uuid NOT NULL REFERENCES public.ppdb_periods(id) ON DELETE CASCADE,
  registration_number text NOT NULL,
  student_name        text NOT NULL,
  birth_date          date NOT NULL,
  gender              text NOT NULL CHECK (gender IN ('L','P')),
  previous_school     text,
  parent_name         text NOT NULL,
  parent_phone        text NOT NULL,
  parent_email        text,
  address             text,
  documents           jsonb NOT NULL DEFAULT '{}'::jsonb,
  status              text NOT NULL DEFAULT 'pending',
  notes               text,
  reviewed_by         uuid,
  reviewed_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ppdb_reg_period ON public.ppdb_registrations(period_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ppdb_reg_number ON public.ppdb_registrations(tenant_id, registration_number);

-- -------- app_metrics --------
CREATE TABLE IF NOT EXISTS public.app_metrics (
  id           bigserial PRIMARY KEY,
  metric_name  text NOT NULL,
  metric_value double precision NOT NULL,
  tags         jsonb,
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  tenant_id    uuid
);
CREATE INDEX IF NOT EXISTS idx_app_metrics_recorded ON public.app_metrics(recorded_at DESC);

-- -------- RPC: get_tenant_users --------
DROP FUNCTION IF EXISTS public.get_tenant_users(text, text, text, integer);
CREATE OR REPLACE FUNCTION public.get_tenant_users(
  p_search text,
  p_role   text,
  p_cursor text,
  p_limit  integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_caller uuid := auth.uid();
  v_total  integer;
  v_rows   json;
BEGIN
  IF v_caller IS NULL THEN
    RETURN '[]'::json;
  END IF;

  SELECT tenant_id INTO v_tenant FROM public.profiles WHERE id = v_caller LIMIT 1;
  IF v_tenant IS NULL THEN
    RETURN '[]'::json;
  END IF;

  WITH base AS (
    SELECT p.id,
           p.email,
           COALESCE(p.first_name,'') AS first_name,
           COALESCE(p.last_name,'')  AS last_name,
           p.avatar_url,
           COALESCE(p.is_active, true) AS is_active,
           p.created_at,
           ARRAY(
             SELECT DISTINCT lower(tm.role)
             FROM public.tenant_memberships tm
             WHERE tm.user_id = p.id AND tm.tenant_id = v_tenant
           ) AS roles
    FROM public.profiles p
    WHERE p.tenant_id = v_tenant
      AND (p_search IS NULL OR p_search = '' OR
           p.email ILIKE '%' || p_search || '%' OR
           COALESCE(p.full_name,'') ILIKE '%' || p_search || '%' OR
           COALESCE(p.first_name,'') ILIKE '%' || p_search || '%' OR
           COALESCE(p.last_name,'')  ILIKE '%' || p_search || '%')
  ),
  filtered AS (
    SELECT * FROM base
    WHERE (p_role IS NULL OR p_role = '' OR p_role = ANY (roles))
      AND (p_cursor IS NULL OR p_cursor = '' OR created_at < p_cursor::timestamptz)
  ),
  counted AS (SELECT count(*)::int AS n FROM filtered),
  page AS (
    SELECT f.*, c.n AS total_count
    FROM filtered f CROSS JOIN counted c
    ORDER BY f.created_at DESC
    LIMIT GREATEST(COALESCE(p_limit, 20), 1)
  )
  SELECT json_agg(row_to_json(page.*)) INTO v_rows FROM page;

  RETURN COALESCE(v_rows, '[]'::json);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_tenant_users(text, text, text, integer) TO PUBLIC;

-- -------- RPC: update_user_role --------
DROP FUNCTION IF EXISTS public.update_user_role(uuid, text);
CREATE OR REPLACE FUNCTION public.update_user_role(p_user_id uuid, p_new_role text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid;
  v_old text;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'no_tenant'; END IF;
  SELECT role INTO v_old FROM public.tenant_memberships
    WHERE tenant_id = v_tenant AND user_id = p_user_id LIMIT 1;
  UPDATE public.tenant_memberships
    SET role = upper(p_new_role), updated_at = now()
    WHERE tenant_id = v_tenant AND user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.tenant_memberships(tenant_id, user_id, role, status)
    VALUES (v_tenant, p_user_id, upper(p_new_role), 'active');
  END IF;
  RETURN json_build_object('old_role', COALESCE(v_old,''), 'new_role', upper(p_new_role));
END;$$;
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, text) TO PUBLIC;

-- -------- RPC: deactivate_user --------
DROP FUNCTION IF EXISTS public.deactivate_user(uuid, boolean);
CREATE OR REPLACE FUNCTION public.deactivate_user(p_user_id uuid, p_active boolean)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET is_active = COALESCE(p_active, false), updated_at = now() WHERE id = p_user_id;
  RETURN json_build_object('user_id', p_user_id, 'is_active', COALESCE(p_active, false));
END;$$;
GRANT EXECUTE ON FUNCTION public.deactivate_user(uuid, boolean) TO PUBLIC;

-- -------- RPC: get_audit_logs --------
DROP FUNCTION IF EXISTS public.get_audit_logs(text, text, integer);
CREATE OR REPLACE FUNCTION public.get_audit_logs(
  p_action text,
  p_cursor text,
  p_limit  integer
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid;
  v_rows   json;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  IF v_tenant IS NULL THEN RETURN '[]'::json; END IF;

  WITH base AS (
    SELECT al.id            AS log_id,
           al.user_id        AS actor_id,
           COALESCE(p.full_name, p.email, '') AS actor_name,
           COALESCE(p.email,'')  AS actor_email,
           COALESCE(al.action,'') AS action,
           COALESCE(al.entity_type,'') AS target_type,
           al.entity_id      AS target_id,
           COALESCE(al.entity_id,'') AS target_name,
           COALESCE(al.metadata, '{}'::jsonb) AS details,
           al.created_at
    FROM public.activity_logs al
    LEFT JOIN public.profiles p ON p.id = al.user_id
    WHERE al.tenant_id = v_tenant
      AND (p_action IS NULL OR p_action = '' OR al.action ILIKE '%' || p_action || '%')
      AND (p_cursor IS NULL OR p_cursor = '' OR al.created_at < p_cursor::timestamptz)
  ),
  counted AS (SELECT count(*)::int AS n FROM base),
  page AS (
    SELECT b.*, c.n AS total_count
    FROM base b CROSS JOIN counted c
    ORDER BY b.created_at DESC
    LIMIT GREATEST(COALESCE(p_limit, 50), 1)
  )
  SELECT json_agg(row_to_json(page.*)) INTO v_rows FROM page;

  RETURN COALESCE(v_rows, '[]'::json);
END;$$;
GRANT EXECUTE ON FUNCTION public.get_audit_logs(text, text, integer) TO PUBLIC;

-- -------- RPC: get_finance_overview --------
DROP FUNCTION IF EXISTS public.get_finance_overview(uuid);
CREATE OR REPLACE FUNCTION public.get_finance_overview(p_tenant_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total  double precision;
  v_paid   double precision;
  v_unpaid double precision;
  v_rate   double precision;
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO v_total
    FROM public.invoices WHERE tenant_id = p_tenant_id
      AND date_trunc('month', created_at) = date_trunc('month', now());
  SELECT COALESCE(SUM(amount),0) INTO v_paid
    FROM public.invoices WHERE tenant_id = p_tenant_id
      AND status = 'paid'
      AND date_trunc('month', created_at) = date_trunc('month', now());
  SELECT COALESCE(SUM(amount),0) INTO v_unpaid
    FROM public.invoices WHERE tenant_id = p_tenant_id AND status <> 'paid';
  v_rate := CASE WHEN v_total > 0 THEN ROUND((v_paid / v_total * 100.0)::numeric, 2) ELSE 0 END;
  RETURN json_build_object(
    'total_this_month', v_total,
    'paid_this_month',  v_paid,
    'unpaid_total',     v_unpaid,
    'payment_rate',     v_rate
  );
END;$$;
GRANT EXECUTE ON FUNCTION public.get_finance_overview(uuid) TO PUBLIC;

-- -------- RPC: get_finance_monthly --------
DROP FUNCTION IF EXISTS public.get_finance_monthly(uuid);
CREATE OR REPLACE FUNCTION public.get_finance_monthly(p_tenant_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows json;
BEGIN
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', now()) - interval '11 months',
      date_trunc('month', now()),
      interval '1 month'
    )::date AS month_start
  )
  SELECT json_agg(row_to_json(t.*)) INTO v_rows FROM (
    SELECT to_char(m.month_start, 'Mon YYYY') AS month_label,
           to_char(m.month_start, 'YYYY-MM')  AS month_key,
           COALESCE(SUM(i.amount), 0)::float  AS total,
           COALESCE(SUM(CASE WHEN i.status='paid' THEN i.amount ELSE 0 END), 0)::float AS paid
    FROM months m
    LEFT JOIN public.invoices i
      ON i.tenant_id = p_tenant_id
     AND date_trunc('month', i.created_at)::date = m.month_start
    GROUP BY m.month_start
    ORDER BY m.month_start
  ) t;
  RETURN COALESCE(v_rows, '[]'::json);
END;$$;
GRANT EXECUTE ON FUNCTION public.get_finance_monthly(uuid) TO PUBLIC;

-- -------- RPC: get_finance_dashboard_page --------
DROP FUNCTION IF EXISTS public.get_finance_dashboard_page(uuid, text, text, integer, integer);
CREATE OR REPLACE FUNCTION public.get_finance_dashboard_page(
  p_tenant_id uuid,
  p_status    text,
  p_search    text,
  p_page      integer,
  p_page_size integer
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_page int := GREATEST(COALESCE(p_page,1),1);
  v_size int := GREATEST(COALESCE(p_page_size,20),1);
  v_offset int := (v_page - 1) * v_size;
  v_rows json;
BEGIN
  WITH filtered AS (
    SELECT i.id,
           i.student_id,
           COALESCE(p.full_name, p.email,'') AS student_name,
           i.amount,
           0::float AS amount_paid,
           COALESCE(i.status,'pending') AS status,
           NULL::text AS description,
           to_char(i.created_at, 'YYYY-MM') AS month_year,
           NULL::date AS due_date,
           NULL::timestamptz AS paid_at,
           i.created_at,
           i.updated_at
    FROM public.invoices i
    LEFT JOIN public.profiles p ON p.id = i.student_id
    WHERE i.tenant_id = p_tenant_id
      AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR i.status = p_status)
      AND (p_search IS NULL OR p_search = '' OR
           COALESCE(p.full_name,'') ILIKE '%' || p_search || '%' OR
           COALESCE(p.email,'')     ILIKE '%' || p_search || '%')
  ),
  counted AS (SELECT count(*)::int AS n FROM filtered),
  page AS (
    SELECT f.*, c.n AS total_count
    FROM filtered f CROSS JOIN counted c
    ORDER BY f.created_at DESC
    LIMIT v_size OFFSET v_offset
  )
  SELECT json_agg(row_to_json(page.*)) INTO v_rows FROM page;
  RETURN COALESCE(v_rows, '[]'::json);
END;$$;
GRANT EXECUTE ON FUNCTION public.get_finance_dashboard_page(uuid, text, text, integer, integer) TO PUBLIC;

COMMIT;
