-- Sprint 1.1: Activate Gamification XP v2
-- ============================================================
-- Promotes XP v2 tables and RPCs from _archive to active state.
-- Safe to run whether or not 20260504000003 has already been applied:
--   • Tables use CREATE ... IF NOT EXISTS
--   • Columns use ADD COLUMN IF NOT EXISTS
--   • Constraints use DO $$ ... IF NOT EXISTS $$ guards
--   • All RPCs use CREATE OR REPLACE
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. xp_transactions — append-only XP ledger
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.xp_transactions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id),
    tenant_id   UUID        NOT NULL REFERENCES public.tenants(id),
    xp_amount   INTEGER     NOT NULL,
    source_type TEXT        NOT NULL,
    source_id   UUID,
    metadata    JSONB       NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add metadata column if table existed without it (idempotent)
ALTER TABLE public.xp_transactions
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

-- Idempotency: unique constraint prevents double-award for same (user, source)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.xp_transactions'::regclass
          AND conname  = 'uq_xp_tx_user_source'
    ) THEN
        ALTER TABLE public.xp_transactions
            ADD CONSTRAINT uq_xp_tx_user_source
            UNIQUE (user_id, source_type, source_id);
    END IF;
END $$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_xp_tx_user    ON public.xp_transactions(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_xp_tx_created ON public.xp_transactions(tenant_id, created_at DESC);

-- RLS
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

-- Students read only their own; admin can read all in tenant (handled below)
DROP POLICY IF EXISTS "xp_tx_read"      ON public.xp_transactions;
DROP POLICY IF EXISTS "xp_tx_insert"    ON public.xp_transactions;
DROP POLICY IF EXISTS "xp_tx_read_own"  ON public.xp_transactions;

-- Own-record read for students
CREATE POLICY "xp_tx_read_own"
    ON public.xp_transactions FOR SELECT
    USING (
        user_id   = auth.uid()
        AND tenant_id = public.get_my_tenant_id()
    );

-- Admin read-all in tenant
DROP POLICY IF EXISTS "xp_tx_admin_read" ON public.xp_transactions;
CREATE POLICY "xp_tx_admin_read"
    ON public.xp_transactions FOR SELECT
    USING (
        tenant_id = public.get_my_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id   = auth.uid()
              AND ur.tenant_id = public.get_my_tenant_id()
              AND UPPER(ur.role::text) = 'ADMIN'
        )
    );

-- No direct INSERT from clients — only via SECURITY DEFINER RPCs

-- auto_set_tenant_id trigger
DROP TRIGGER IF EXISTS set_tenant_id_xp_tx ON public.xp_transactions;
CREATE TRIGGER set_tenant_id_xp_tx
    BEFORE INSERT ON public.xp_transactions
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

GRANT SELECT ON public.xp_transactions TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 2. student_xp_summary — per-student aggregate
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_xp_summary (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID        NOT NULL REFERENCES auth.users(id),
    tenant_id              UUID        NOT NULL REFERENCES public.tenants(id),
    total_xp               INTEGER     NOT NULL DEFAULT 0,
    streak_current         INTEGER     NOT NULL DEFAULT 0,
    streak_longest         INTEGER     NOT NULL DEFAULT 0,
    last_activity_date     DATE,
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, tenant_id)
);

-- Idempotent column additions:
--   last_activity_date      — canonical column name for this migration
--   streak_last_active_date — column name used in archive/37B migration (20260504000003)
-- Both are added safely; whichever already exists is a no-op.
ALTER TABLE public.student_xp_summary
    ADD COLUMN IF NOT EXISTS last_activity_date     DATE;
ALTER TABLE public.student_xp_summary
    ADD COLUMN IF NOT EXISTS streak_last_active_date DATE;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_xp_summary_total  ON public.student_xp_summary(tenant_id, total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_xp_summary_streak ON public.student_xp_summary(tenant_id, streak_current DESC);

-- RLS
ALTER TABLE public.student_xp_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "xp_summary_read"   ON public.student_xp_summary;
DROP POLICY IF EXISTS "xp_summary_upsert" ON public.student_xp_summary;
DROP POLICY IF EXISTS "xp_summary_update" ON public.student_xp_summary;

-- All authenticated users in the tenant can read (needed for leaderboard)
CREATE POLICY "xp_summary_read"
    ON public.student_xp_summary FOR SELECT
    USING (tenant_id = public.get_my_tenant_id());

-- Only SECURITY DEFINER RPCs may insert/update — no direct client writes
-- (No INSERT/UPDATE policies: RPC functions bypass RLS via SECURITY DEFINER)

GRANT SELECT ON public.student_xp_summary TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 3. get_leaderboard_v2 — new signature with explicit p_tenant_id
--    Parameters:
--      p_tenant_id  UUID       — tenant to query
--      p_period     TEXT       — 'all_time' | 'weekly' | 'monthly'  (default 'all_time')
--      p_metric     TEXT       — 'xp' | 'streak'                    (default 'xp')
--      p_limit      INT        — max rows returned                   (default 50)
--    Returns TABLE(rank INT, user_id UUID, full_name TEXT, avatar_url TEXT, score BIGINT, streak INT)
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_leaderboard_v2(UUID, TEXT, TEXT, INT);
DROP FUNCTION IF EXISTS public.get_leaderboard_v2(UUID, TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.get_leaderboard_v2(
    p_tenant_id UUID,
    p_period    TEXT    DEFAULT 'all_time',
    p_metric    TEXT    DEFAULT 'xp',
    p_limit     INT     DEFAULT 50
)
RETURNS TABLE (
    rank        INT,
    user_id     UUID,
    full_name   TEXT,
    avatar_url  TEXT,
    score       BIGINT,
    streak      INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_since TIMESTAMPTZ;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Tidak diizinkan' USING ERRCODE = 'P0401';
    END IF;

    -- Resolve period window
    IF p_period = 'weekly' THEN
        v_since := date_trunc('week', now());
    ELSIF p_period = 'monthly' THEN
        v_since := date_trunc('month', now());
    ELSE
        v_since := NULL;  -- all_time: read from summary table
    END IF;

    IF v_since IS NOT NULL THEN
        -- Period-based: aggregate from xp_transactions
        RETURN QUERY
        WITH period_xp AS (
            SELECT
                xt.user_id,
                SUM(xt.xp_amount)::bigint AS period_value
            FROM public.xp_transactions xt
            WHERE xt.tenant_id  = p_tenant_id
              AND xt.created_at >= v_since
            GROUP BY xt.user_id
        )
        SELECT
            ROW_NUMBER() OVER (ORDER BY px.period_value DESC)::int AS rank,
            px.user_id,
            p.full_name,
            p.avatar_url,
            px.period_value                             AS score,
            COALESCE(xs.streak_current, 0)              AS streak
        FROM period_xp px
        JOIN public.profiles p ON p.id = px.user_id
        LEFT JOIN public.student_xp_summary xs
               ON xs.user_id = px.user_id AND xs.tenant_id = p_tenant_id
        ORDER BY px.period_value DESC
        LIMIT p_limit;

    ELSIF p_metric = 'streak' THEN
        -- All-time streak leaderboard
        RETURN QUERY
        SELECT
            ROW_NUMBER() OVER (
                ORDER BY xs.streak_current DESC, xs.total_xp DESC
            )::int                                      AS rank,
            xs.user_id,
            p.full_name,
            p.avatar_url,
            xs.streak_current::bigint                  AS score,
            xs.streak_current                           AS streak
        FROM public.student_xp_summary xs
        JOIN public.profiles p ON p.id = xs.user_id
        WHERE xs.tenant_id = p_tenant_id
        ORDER BY xs.streak_current DESC, xs.total_xp DESC
        LIMIT p_limit;

    ELSE
        -- All-time XP leaderboard (default)
        RETURN QUERY
        SELECT
            ROW_NUMBER() OVER (ORDER BY xs.total_xp DESC)::int AS rank,
            xs.user_id,
            p.full_name,
            p.avatar_url,
            xs.total_xp::bigint                        AS score,
            xs.streak_current                           AS streak
        FROM public.student_xp_summary xs
        JOIN public.profiles p ON p.id = xs.user_id
        WHERE xs.tenant_id = p_tenant_id
        ORDER BY xs.total_xp DESC
        LIMIT p_limit;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard_v2(UUID, TEXT, TEXT, INT) TO authenticated;
-- Explicitly deny anon
REVOKE EXECUTE ON FUNCTION public.get_leaderboard_v2(UUID, TEXT, TEXT, INT) FROM anon;


-- ────────────────────────────────────────────────────────────
-- 4. get_student_xp_profile — XP + streak profile for a student
--    Parameters: p_user_id UUID
--    Returns: total_xp, streak_current, streak_longest,
--             last_activity_date, rank (position in tenant leaderboard)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_student_xp_profile(p_user_id UUID)
RETURNS TABLE (
    total_xp           INTEGER,
    streak_current     INTEGER,
    streak_longest     INTEGER,
    last_activity_date DATE,
    rank               BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant  UUID := public.get_my_tenant_id();
    v_total   INTEGER;
    v_s_cur   INTEGER;
    v_s_long  INTEGER;
    v_last    DATE;
    v_rank    BIGINT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Tidak diizinkan' USING ERRCODE = 'P0401';
    END IF;

    -- Read from summary (explicit columns — no SELECT *)
    -- last_activity_date is the canonical column added by this migration.
    -- streak_last_active_date is the column name used in the archive/37B migration.
    -- Both are added idempotently above, so this query is safe in all states.
    SELECT
        xs.total_xp,
        xs.streak_current,
        xs.streak_longest,
        xs.last_activity_date
    INTO v_total, v_s_cur, v_s_long, v_last
    FROM public.student_xp_summary xs
    WHERE xs.tenant_id = v_tenant
      AND xs.user_id   = p_user_id;

    IF NOT FOUND THEN
        -- Return zeroed profile for students with no XP yet
        total_xp           := 0;
        streak_current     := 0;
        streak_longest     := 0;
        last_activity_date := NULL;
        rank               := NULL;
        RETURN NEXT;
        RETURN;
    END IF;

    -- Compute rank within the tenant by total_xp
    SELECT COUNT(*) + 1 INTO v_rank
    FROM public.student_xp_summary xs2
    WHERE xs2.tenant_id = v_tenant
      AND xs2.total_xp  > v_total;

    total_xp           := v_total;
    streak_current     := v_s_cur;
    streak_longest     := v_s_long;
    last_activity_date := v_last;
    rank               := v_rank;
    RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_xp_profile(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_student_xp_profile(UUID) FROM anon;


-- ────────────────────────────────────────────────────────────
-- 5. record_xp_transaction (5-param) — add pg_advisory_xact_lock
--    Patches the version from 20260403000008_fix_gamification_xp_rls.sql
--    to prevent concurrent double-award for the same (user, source).
--
--    Advisory lock key = hashtext(user_id::text || source_id::text)
--    This is a transaction-level lock: auto-released at end of transaction.
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.record_xp_transaction(UUID, UUID, INTEGER, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.record_xp_transaction(
    p_user_id     UUID,
    p_tenant_id   UUID,
    p_xp_amount   INTEGER,
    p_source_type TEXT,
    p_source_id   UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Tidak diizinkan' USING ERRCODE = 'P0401';
    END IF;

    -- Validate XP amount bounds
    IF p_xp_amount <= 0 OR p_xp_amount > 10000 THEN
        RAISE EXCEPTION 'Jumlah XP tidak valid: harus antara 1 dan 10000'
            USING ERRCODE = 'P0003';
    END IF;

    -- Validate tenant matches calling user's tenant
    IF p_tenant_id != public.get_my_tenant_id() THEN
        RAISE EXCEPTION 'Tenant tidak cocok' USING ERRCODE = 'P0002';
    END IF;

    -- Acquire advisory transaction lock to prevent concurrent double-award
    -- for the same (user_id, source_id) pair.
    PERFORM pg_advisory_xact_lock(
        hashtext(p_user_id::text || COALESCE(p_source_id::text, ''))
    );

    -- Insert XP transaction; ON CONFLICT DO NOTHING handles idempotency
    -- if the uq_xp_tx_user_source unique constraint is present.
    INSERT INTO public.xp_transactions (
        user_id, tenant_id, xp_amount, source_type, source_id, created_at
    ) VALUES (
        p_user_id, p_tenant_id, p_xp_amount, p_source_type, p_source_id, NOW()
    )
    ON CONFLICT ON CONSTRAINT uq_xp_tx_user_source DO NOTHING;

    -- Only update summary if the INSERT landed (i.e. not a duplicate)
    IF FOUND THEN
        INSERT INTO public.student_xp_summary (
            user_id, tenant_id, total_xp, updated_at
        ) VALUES (
            p_user_id, p_tenant_id, p_xp_amount, NOW()
        )
        ON CONFLICT (user_id, tenant_id) DO UPDATE
            SET total_xp   = public.student_xp_summary.total_xp + EXCLUDED.total_xp,
                updated_at = NOW();
    END IF;
END;
$$;

-- Backward-compat wrapper: 4-param signature resolves tenant from JWT
DROP FUNCTION IF EXISTS public.record_xp_transaction(UUID, INTEGER, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.record_xp_transaction(
    p_user_id     UUID,
    p_xp_amount   INTEGER,
    p_source_type TEXT,
    p_source_id   UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    PERFORM public.record_xp_transaction(
        p_user_id,
        public.get_my_tenant_id(),
        p_xp_amount,
        p_source_type,
        p_source_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_xp_transaction(UUID, UUID, INTEGER, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_xp_transaction(UUID, INTEGER, TEXT, UUID)       TO authenticated;
REVOKE EXECUTE ON FUNCTION public.record_xp_transaction(UUID, UUID, INTEGER, TEXT, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_xp_transaction(UUID, INTEGER, TEXT, UUID)       FROM anon;


-- ────────────────────────────────────────────────────────────
-- Comments
-- ────────────────────────────────────────────────────────────
COMMENT ON TABLE public.xp_transactions IS
    'Append-only XP ledger per student. Sprint 1.1 (activate_gamification_xp_v2).';
COMMENT ON TABLE public.student_xp_summary IS
    'Per-student XP aggregate + streak counter. Sprint 1.1 (activate_gamification_xp_v2).';
COMMENT ON FUNCTION public.get_leaderboard_v2(UUID, TEXT, TEXT, INT) IS
    'Tenant-scoped, period-aware, metric-aware leaderboard. Sprint 1.1.';
COMMENT ON FUNCTION public.get_student_xp_profile(UUID) IS
    'Returns total_xp, streak stats, and tenant rank for a student. Sprint 1.1.';
COMMENT ON FUNCTION public.record_xp_transaction(UUID, UUID, INTEGER, TEXT, UUID) IS
    'Insert XP transaction + update summary. Uses pg_advisory_xact_lock for double-award prevention. Sprint 1.1.';
