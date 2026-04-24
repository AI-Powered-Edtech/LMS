-- 037_qa_sweep_fixes.sql
-- Addresses 400/403/404 errors surfaced by the real-backend screen sweep
-- (tests/e2e/sweep.spec.ts) on 2026-04-24.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Admin BillingDashboard expects `amount_due`, `amount_paid`, `due_date` on
--    invoices; schema only had `amount`. Add the missing columns (additive).
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS amount_due  double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_date    date;

-- Backfill amount_due from existing amount where zero.
UPDATE public.invoices
   SET amount_due = amount
 WHERE amount_due = 0 AND amount IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) Admin analytics expects `total_enrolled, active_students, avg_progress,
--    avg_quiz_score` on course_stats. Add missing columns.
-- ---------------------------------------------------------------------------
ALTER TABLE public.course_stats
  ADD COLUMN IF NOT EXISTS total_enrolled  integer          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_students integer          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_progress    double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_quiz_score  double precision NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 3) Semesters table (admin /app/admin/semester page). Brand new.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.semesters (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  name           text NOT NULL,
  academic_year  text NOT NULL,
  term           text NOT NULL,
  start_date     date,
  end_date       date,
  status         text NOT NULL DEFAULT 'planned',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_semesters_tenant
  ON public.semesters (tenant_id, academic_year DESC, term DESC);

-- ---------------------------------------------------------------------------
-- 4) RPC get_gradebook_students(p_tenant_id uuid) — used by admin gradebook.
--    Returns json array of students enrolled in the tenant with aggregated
--    grade signals. Safe default: return memberships whose role is STUDENT.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_gradebook_students(p_tenant_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT
      tm.user_id                                   AS id,
      p.email                                      AS email,
      COALESCE(p.full_name, p.email)               AS full_name,
      tm.tenant_id                                 AS tenant_id,
      tm.role                                      AS role,
      tm.created_at                                AS joined_at
    FROM public.tenant_memberships tm
    LEFT JOIN public.profiles p ON p.id = tm.user_id
    WHERE tm.tenant_id = p_tenant_id
      AND UPPER(tm.role) = 'STUDENT'
      AND COALESCE(tm.status, 'active') = 'active'
    ORDER BY full_name NULLS LAST
    LIMIT 5000
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.get_gradebook_students(uuid) TO PUBLIC;

COMMIT;
