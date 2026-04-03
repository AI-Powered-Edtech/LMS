-- Fix: xp_transactions INSERT harus hanya melalui SECURITY DEFINER RPC
-- Problem: RLS policy "xp_tx_insert" dengan WITH CHECK (tenant_id = get_my_tenant_id())
-- memungkinkan student langsung INSERT via REST API
-- Schema aktual: id, tenant_id, user_id, xp_amount, source_type, source_id, created_at
-- TIDAK ADA kolom description
-- ========================================================

-- Drop old permissive insert policy
DROP POLICY IF EXISTS "xp_tx_insert" ON public.xp_transactions;
DROP POLICY IF EXISTS "xp_transactions_insert" ON public.xp_transactions;

-- No direct INSERT from authenticated users — only via SECURITY DEFINER RPC
-- RLS akan block semua INSERT direct
-- record_xp_transaction RPC sudah SECURITY DEFINER — bypass RLS correctly

-- READ: Students can only see their own XP
DROP POLICY IF EXISTS "xp_tx_read" ON public.xp_transactions;
CREATE POLICY "xp_tx_read_own"
    ON public.xp_transactions FOR SELECT
    USING (
        user_id = auth.uid()
        AND tenant_id = get_my_tenant_id()
    );

-- Admin can read all tenant XP
DROP POLICY IF EXISTS "xp_tx_admin_read" ON public.xp_transactions;
CREATE POLICY "xp_tx_admin_read"
    ON public.xp_transactions FOR SELECT
    USING (
        tenant_id = get_my_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = get_my_tenant_id()
              AND UPPER(ur.role::text) = 'ADMIN'
        )
    );

-- ============================================================
-- Fix: Patch existing record_xp_transaction RPC
-- Signature asli: (p_user_id, p_xp_amount, p_source_type, p_source_id)
-- Kita GANTI signature dengan menambahkan p_tenant_id di posisi kedua.
-- Untuk backward compatibility, buat OVERLOAD wrapper yang memanggil versi baru.
-- ============================================================

-- 1. Drop fungsi lama (4 parameter) agar bisa diganti dengan yang baru (5 parameter)
DROP FUNCTION IF EXISTS public.record_xp_transaction(UUID, INTEGER, TEXT, UUID);

-- 2. Buat fungsi baru dengan signature: (p_user_id, p_tenant_id, p_xp_amount, p_source_type, p_source_id)
CREATE OR REPLACE FUNCTION public.record_xp_transaction(
    p_user_id    UUID,
    p_tenant_id  UUID,
    p_xp_amount  INTEGER,
    p_source_type TEXT,
    p_source_id  UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;

    -- Validate XP amount bounds
    IF p_xp_amount <= 0 OR p_xp_amount > 10000 THEN
        RAISE EXCEPTION 'Invalid XP amount: must be between 1 and 10000' USING ERRCODE = 'P0003';
    END IF;

    -- Validate tenant matches JWT
    IF p_tenant_id != get_my_tenant_id() THEN
        RAISE EXCEPTION 'Tenant mismatch' USING ERRCODE = 'P0002';
    END IF;

    -- Insert XP transaction
    -- FIXED: TIDAK ADA kolom description di xp_transactions
    INSERT INTO public.xp_transactions (
        user_id, tenant_id, xp_amount, source_type, source_id, created_at
    ) VALUES (
        p_user_id, p_tenant_id, p_xp_amount, p_source_type, p_source_id, NOW()
    );

    -- Update summary (atomic)
    INSERT INTO public.student_xp_summary (user_id, tenant_id, total_xp, updated_at)
    VALUES (p_user_id, p_tenant_id, p_xp_amount, NOW())
    ON CONFLICT (user_id, tenant_id) DO UPDATE
        SET total_xp = student_xp_summary.total_xp + EXCLUDED.total_xp,
            updated_at = NOW();
END;
$$;

-- 3. Buat OVERLOAD wrapper untuk backward compatibility
--    Caller lama yang memanggil record_xp_transaction(user_id, xp, source_type, source_id)
--    akan otomatis menggunakan wrapper ini yang resolve tenant dari get_my_tenant_id()
CREATE OR REPLACE FUNCTION public.record_xp_transaction(
    p_user_id    UUID,
    p_xp_amount  INTEGER,
    p_source_type TEXT,
    p_source_id  UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Delegate ke fungsi baru dengan tenant dari JWT
    PERFORM public.record_xp_transaction(
        p_user_id,
        get_my_tenant_id(),
        p_xp_amount,
        p_source_type,
        p_source_id
    );
END;
$$;
