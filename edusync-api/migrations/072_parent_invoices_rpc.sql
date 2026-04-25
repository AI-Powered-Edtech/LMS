-- 072_parent_invoices_rpc.sql
-- Workstream C3 (FE) support: RPC for parent invoice list.
--
-- The Snap creation flow runs through `POST /api/v1/payments/snap` (Rust
-- handler), but the listing/refresh path goes through PostgREST/db.rpc.
-- We expose a SECURITY DEFINER RPC that joins invoices → students → parent
-- links so RLS can stay simple (no policy on `invoices` for parents — the
-- RPC is the only entry point).

CREATE OR REPLACE FUNCTION public.get_parent_invoices()
RETURNS TABLE(
    id                 UUID,
    invoice_number     TEXT,
    student_id         UUID,
    student_name       TEXT,
    amount_due         NUMERIC,
    amount_paid        NUMERIC,
    due_date           DATE,
    status             TEXT,
    midtrans_order_id  TEXT,
    notes              TEXT,
    created_at         TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn$
    SELECT
        i.id,
        i.invoice_number,
        i.student_id,
        p.full_name AS student_name,
        i.amount_due,
        i.amount_paid,
        i.due_date,
        i.status,
        i.midtrans_order_id,
        i.notes,
        i.created_at
    FROM public.invoices i
    JOIN public.profiles p
      ON p.id = i.student_id
    JOIN public.parent_student_links psl
      ON psl.student_id = i.student_id
     AND psl.parent_id = auth.uid()
    ORDER BY
      CASE i.status
        WHEN 'pending'   THEN 0
        WHEN 'unpaid'    THEN 0
        WHEN 'failed'    THEN 1
        WHEN 'paid'      THEN 2
        WHEN 'cancelled' THEN 3
        ELSE 4
      END,
      i.due_date NULLS LAST,
      i.created_at DESC;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_parent_invoices() TO PUBLIC;
