-- ============================================================
-- Phase 37B: Streaks, XP & Leaderboard v2
-- Deployed from _archive/822_streaks_xp.sql
--
-- Tables:  xp_transactions, student_xp_summary, xp_processing_state
-- RPCs:    compute_level, xp_for_level, record_xp_transaction,
--           update_streak, get_leaderboard_v2, get_student_xp_profile,
--           process_xp_awards
-- Cron:    badge-xp-streak-processor every 5 min (replaces badge-only job)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. xp_transactions — append-only XP ledger
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.xp_transactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
    user_id     UUID NOT NULL REFERENCES public.profiles(id),
    xp_amount   INTEGER NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN (
        'lesson_complete','quiz_score','streak_bonus',
        'badge_earned','assignment_submit'
    )),
    source_id   UUID,    -- lesson_id, quiz_id, badge_id, etc.
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_tx_user    ON public.xp_transactions(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_xp_tx_created ON public.xp_transactions(tenant_id, created_at DESC);

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.xp_transactions TO authenticated;

DROP POLICY IF EXISTS "xp_tx_read" ON public.xp_transactions;
CREATE POLICY "xp_tx_read" ON public.xp_transactions FOR SELECT
    USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "xp_tx_insert" ON public.xp_transactions;
CREATE POLICY "xp_tx_insert" ON public.xp_transactions FOR INSERT
    WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE OR REPLACE TRIGGER set_tenant_id_xp_tx
    BEFORE INSERT ON public.xp_transactions
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();


-- ────────────────────────────────────────────────────────────
-- 2. student_xp_summary — per-student aggregate
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_xp_summary (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id              UUID NOT NULL REFERENCES public.tenants(id),
    user_id                UUID NOT NULL REFERENCES public.profiles(id),
    total_xp               INTEGER NOT NULL DEFAULT 0,
    level                  INTEGER NOT NULL DEFAULT 1,
    streak_current         INTEGER NOT NULL DEFAULT 0,
    streak_longest         INTEGER NOT NULL DEFAULT 0,
    streak_last_active_date DATE,
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_xp_summary_total  ON public.student_xp_summary(tenant_id, total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_xp_summary_streak ON public.student_xp_summary(tenant_id, streak_current DESC);

ALTER TABLE public.student_xp_summary ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.student_xp_summary TO authenticated;

DROP POLICY IF EXISTS "xp_summary_read" ON public.student_xp_summary;
CREATE POLICY "xp_summary_read" ON public.student_xp_summary FOR SELECT
    USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "xp_summary_upsert" ON public.student_xp_summary;
CREATE POLICY "xp_summary_upsert" ON public.student_xp_summary FOR INSERT
    WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "xp_summary_update" ON public.student_xp_summary;
CREATE POLICY "xp_summary_update" ON public.student_xp_summary FOR UPDATE
    USING (tenant_id = public.get_my_tenant_id());


-- ────────────────────────────────────────────────────────────
-- Level threshold helpers
-- L1=0, L2=100, L3=300, L4=600, L5=1000,
-- L6=1500, L7=2200, L8=3000, L9=4000, L10=5500
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.compute_level(integer);
CREATE OR REPLACE FUNCTION public.compute_level(p_total_xp INTEGER)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
    SELECT CASE
        WHEN p_total_xp >= 5500 THEN 10
        WHEN p_total_xp >= 4000 THEN 9
        WHEN p_total_xp >= 3000 THEN 8
        WHEN p_total_xp >= 2200 THEN 7
        WHEN p_total_xp >= 1500 THEN 6
        WHEN p_total_xp >= 1000 THEN 5
        WHEN p_total_xp >= 600  THEN 4
        WHEN p_total_xp >= 300  THEN 3
        WHEN p_total_xp >= 100  THEN 2
        ELSE 1
    END;
$$;

CREATE OR REPLACE FUNCTION public.xp_for_level(p_level INTEGER)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
    SELECT CASE p_level
        WHEN 1 THEN 0
        WHEN 2 THEN 100
        WHEN 3 THEN 300
        WHEN 4 THEN 600
        WHEN 5 THEN 1000
        WHEN 6 THEN 1500
        WHEN 7 THEN 2200
        WHEN 8 THEN 3000
        WHEN 9 THEN 4000
        WHEN 10 THEN 5500
        ELSE 5500
    END;
$$;


-- ────────────────────────────────────────────────────────────
-- RPCs
-- ────────────────────────────────────────────────────────────

-- record_xp_transaction: add XP and update summary
CREATE OR REPLACE FUNCTION public.record_xp_transaction(
    p_user_id     UUID,
    p_xp_amount   INTEGER,
    p_source_type TEXT,
    p_source_id   UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant UUID := public.get_my_tenant_id();
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    INSERT INTO public.xp_transactions (tenant_id, user_id, xp_amount, source_type, source_id)
    VALUES (v_tenant, p_user_id, p_xp_amount, p_source_type, p_source_id);

    INSERT INTO public.student_xp_summary (tenant_id, user_id, total_xp, level, updated_at)
    VALUES (v_tenant, p_user_id, p_xp_amount, public.compute_level(p_xp_amount), now())
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET
        total_xp   = public.student_xp_summary.total_xp + p_xp_amount,
        level      = public.compute_level(public.student_xp_summary.total_xp + p_xp_amount),
        updated_at = now();
END;
$$;


-- update_streak: check daily activity and update streak counter
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant   UUID := public.get_my_tenant_id();
    v_today    DATE := CURRENT_DATE;
    v_last     DATE;
    v_current  INTEGER;
    v_longest  INTEGER;
    v_bonus    INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Check if student was active today
    IF NOT EXISTS (
        SELECT 1 FROM public.learning_events
        WHERE user_id = p_user_id
          AND tenant_id = v_tenant
          AND DATE(created_at) = v_today
    ) THEN
        RETURN;
    END IF;

    -- Get current streak state
    SELECT streak_last_active_date, streak_current, streak_longest
    INTO v_last, v_current, v_longest
    FROM public.student_xp_summary
    WHERE tenant_id = v_tenant AND user_id = p_user_id;

    -- No summary yet — create one
    IF NOT FOUND THEN
        INSERT INTO public.student_xp_summary
            (tenant_id, user_id, streak_current, streak_longest, streak_last_active_date)
        VALUES (v_tenant, p_user_id, 1, 1, v_today)
        ON CONFLICT (tenant_id, user_id) DO UPDATE SET
            streak_current          = 1,
            streak_longest          = GREATEST(public.student_xp_summary.streak_longest, 1),
            streak_last_active_date = v_today,
            updated_at              = now();
        PERFORM public.record_xp_transaction(p_user_id, 5, 'streak_bonus');
        RETURN;
    END IF;

    -- Already processed today
    IF v_last = v_today THEN RETURN; END IF;

    -- Calculate new streak
    IF v_last = v_today - 1 THEN
        v_current := v_current + 1;   -- consecutive day
    ELSE
        v_current := 1;               -- gap — reset
    END IF;
    v_longest := GREATEST(v_longest, v_current);

    UPDATE public.student_xp_summary SET
        streak_current          = v_current,
        streak_longest          = v_longest,
        streak_last_active_date = v_today,
        updated_at              = now()
    WHERE tenant_id = v_tenant AND user_id = p_user_id;

    -- Award daily streak bonus: 5 × streak_day
    v_bonus := 5 * v_current;
    PERFORM public.record_xp_transaction(p_user_id, v_bonus, 'streak_bonus');
END;
$$;


-- get_leaderboard_v2: sortable, filterable, period-aware leaderboard
CREATE OR REPLACE FUNCTION public.get_leaderboard_v2(
    p_course_id UUID    DEFAULT NULL,
    p_sort_by   TEXT    DEFAULT 'xp',
    p_period    TEXT    DEFAULT 'all_time',
    p_limit     INTEGER DEFAULT 50
)
RETURNS TABLE (
    rank          BIGINT,
    user_id       UUID,
    student_name  TEXT,
    avatar_url    TEXT,
    value         BIGINT,
    level         INTEGER,
    streak        INTEGER
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant UUID := public.get_my_tenant_id();
    v_since  TIMESTAMPTZ;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Determine period window
    IF p_period = 'weekly' THEN
        v_since := date_trunc('week', now());
    ELSIF p_period = 'monthly' THEN
        v_since := date_trunc('month', now());
    ELSE
        v_since := NULL;
    END IF;

    IF v_since IS NOT NULL THEN
        -- Period-based: aggregate from xp_transactions
        RETURN QUERY
        WITH period_xp AS (
            SELECT xt.user_id, SUM(xt.xp_amount)::bigint AS period_value
            FROM public.xp_transactions xt
            WHERE xt.tenant_id = v_tenant AND xt.created_at >= v_since
            GROUP BY xt.user_id
        )
        SELECT
            ROW_NUMBER() OVER (ORDER BY px.period_value DESC)::bigint AS rank,
            px.user_id,
            p.full_name  AS student_name,
            p.avatar_url,
            px.period_value AS value,
            COALESCE(xs.level, 1) AS level,
            COALESCE(xs.streak_current, 0) AS streak
        FROM period_xp px
        JOIN public.profiles p ON p.id = px.user_id
        LEFT JOIN public.student_xp_summary xs
            ON xs.user_id = px.user_id AND xs.tenant_id = v_tenant
        ORDER BY px.period_value DESC
        LIMIT p_limit;
    ELSE
        IF p_sort_by = 'streak' THEN
            RETURN QUERY
            SELECT
                ROW_NUMBER() OVER (ORDER BY xs.streak_current DESC, xs.total_xp DESC)::bigint,
                xs.user_id,
                p.full_name,
                p.avatar_url,
                xs.streak_current::bigint AS value,
                xs.level,
                xs.streak_current
            FROM public.student_xp_summary xs
            JOIN public.profiles p ON p.id = xs.user_id
            WHERE xs.tenant_id = v_tenant
            ORDER BY xs.streak_current DESC, xs.total_xp DESC
            LIMIT p_limit;
        ELSE
            -- Default: sort by total XP
            RETURN QUERY
            SELECT
                ROW_NUMBER() OVER (ORDER BY xs.total_xp DESC)::bigint,
                xs.user_id,
                p.full_name,
                p.avatar_url,
                xs.total_xp::bigint AS value,
                xs.level,
                xs.streak_current
            FROM public.student_xp_summary xs
            JOIN public.profiles p ON p.id = xs.user_id
            WHERE xs.tenant_id = v_tenant
            ORDER BY xs.total_xp DESC
            LIMIT p_limit;
        END IF;
    END IF;
END;
$$;


-- get_student_xp_profile: full XP/streak profile for a student
CREATE OR REPLACE FUNCTION public.get_student_xp_profile(p_user_id UUID)
RETURNS TABLE (
    total_xp         INTEGER,
    level            INTEGER,
    xp_current_level INTEGER,
    xp_next_level    INTEGER,
    streak_current   INTEGER,
    streak_longest   INTEGER,
    last_active      DATE,
    recent_xp        JSONB
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant  UUID := public.get_my_tenant_id();
    v_summary public.student_xp_summary%ROWTYPE;
    v_recent  JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_summary
    FROM public.student_xp_summary xs
    WHERE xs.tenant_id = v_tenant AND xs.user_id = p_user_id;

    IF NOT FOUND THEN
        total_xp := 0; level := 1; xp_current_level := 0;
        xp_next_level := 100; streak_current := 0;
        streak_longest := 0; last_active := NULL; recent_xp := '[]'::jsonb;
        RETURN NEXT;
        RETURN;
    END IF;

    -- Get last 10 XP transactions
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_recent
    FROM (
        SELECT xp_amount, source_type, source_id, created_at
        FROM public.xp_transactions
        WHERE tenant_id = v_tenant AND user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 10
    ) t;

    total_xp         := v_summary.total_xp;
    level            := v_summary.level;
    xp_current_level := public.xp_for_level(v_summary.level);
    xp_next_level    := public.xp_for_level(LEAST(v_summary.level + 1, 10));
    streak_current   := v_summary.streak_current;
    streak_longest   := v_summary.streak_longest;
    last_active      := v_summary.streak_last_active_date;
    recent_xp        := v_recent;
    RETURN NEXT;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- process_xp_awards: cron-driven batch XP awarding
-- Uses watermark to avoid double-awarding
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.xp_processing_state (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL UNIQUE REFERENCES public.tenants(id),
    last_processed_at TIMESTAMPTZ NOT NULL DEFAULT '2000-01-01'::timestamptz
);

ALTER TABLE public.xp_processing_state ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.xp_processing_state TO authenticated;

DROP POLICY IF EXISTS "xp_state_manage" ON public.xp_processing_state;
CREATE POLICY "xp_state_manage" ON public.xp_processing_state FOR ALL
    USING (tenant_id = public.get_my_tenant_id());


CREATE OR REPLACE FUNCTION public.process_xp_awards()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant    UUID;
    v_watermark TIMESTAMPTZ;
    v_now       TIMESTAMPTZ := now();
    v_awarded   INTEGER := 0;
    v_rec       RECORD;
BEGIN
    -- Process each tenant
    FOR v_tenant IN SELECT id FROM public.tenants LOOP
        -- Get or create watermark
        INSERT INTO public.xp_processing_state (tenant_id, last_processed_at)
        VALUES (v_tenant, '2000-01-01'::timestamptz)
        ON CONFLICT (tenant_id) DO NOTHING;

        SELECT last_processed_at INTO v_watermark
        FROM public.xp_processing_state WHERE tenant_id = v_tenant;

        -- Award XP for lesson completions since watermark (+10 per lesson)
        FOR v_rec IN
            SELECT DISTINCT ON (le.user_id, le.payload->>'lesson_id')
                le.user_id,
                (le.payload->>'lesson_id')::uuid AS source_id
            FROM public.learning_events le
            WHERE le.tenant_id = v_tenant
              AND le.event_type = 'LESSON_COMPLETED'
              AND le.created_at > v_watermark
              AND le.created_at <= v_now
              AND NOT EXISTS (
                  SELECT 1 FROM public.xp_transactions xt
                  WHERE xt.user_id = le.user_id
                    AND xt.tenant_id = v_tenant
                    AND xt.source_type = 'lesson_complete'
                    AND xt.source_id = (le.payload->>'lesson_id')::uuid
              )
        LOOP
            INSERT INTO public.xp_transactions (tenant_id, user_id, xp_amount, source_type, source_id)
            VALUES (v_tenant, v_rec.user_id, 10, 'lesson_complete', v_rec.source_id);

            INSERT INTO public.student_xp_summary (tenant_id, user_id, total_xp, level)
            VALUES (v_tenant, v_rec.user_id, 10, 1)
            ON CONFLICT (tenant_id, user_id) DO UPDATE SET
                total_xp   = public.student_xp_summary.total_xp + 10,
                level      = public.compute_level(public.student_xp_summary.total_xp + 10),
                updated_at = now();

            v_awarded := v_awarded + 1;
        END LOOP;

        -- Award XP for quiz submissions (+5 base, +25 bonus for perfect score)
        FOR v_rec IN
            SELECT qa.student_id AS user_id, qa.id AS source_id, qa.score
            FROM public.quiz_attempts_v2 qa
            WHERE qa.tenant_id = v_tenant
              AND qa.status IN ('submitted', 'graded')
              AND qa.started_at > v_watermark
              AND qa.started_at <= v_now
              AND NOT EXISTS (
                  SELECT 1 FROM public.xp_transactions xt
                  WHERE xt.user_id = qa.student_id
                    AND xt.tenant_id = v_tenant
                    AND xt.source_type = 'quiz_score'
                    AND xt.source_id = qa.id
              )
        LOOP
            INSERT INTO public.xp_transactions (tenant_id, user_id, xp_amount, source_type, source_id)
            VALUES (v_tenant, v_rec.user_id, 5, 'quiz_score', v_rec.source_id);

            INSERT INTO public.student_xp_summary (tenant_id, user_id, total_xp, level)
            VALUES (v_tenant, v_rec.user_id, 5, 1)
            ON CONFLICT (tenant_id, user_id) DO UPDATE SET
                total_xp   = public.student_xp_summary.total_xp + 5,
                level      = public.compute_level(public.student_xp_summary.total_xp + 5),
                updated_at = now();

            IF v_rec.score IS NOT NULL AND v_rec.score >= 100 THEN
                INSERT INTO public.xp_transactions (tenant_id, user_id, xp_amount, source_type, source_id)
                VALUES (v_tenant, v_rec.user_id, 25, 'quiz_score', v_rec.source_id);

                UPDATE public.student_xp_summary SET
                    total_xp   = total_xp + 25,
                    level      = public.compute_level(total_xp + 25),
                    updated_at = now()
                WHERE tenant_id = v_tenant AND user_id = v_rec.user_id;
            END IF;

            v_awarded := v_awarded + 1;
        END LOOP;

        -- Award XP for assignment submissions (+15)
        FOR v_rec IN
            SELECT DISTINCT ON (le.user_id, le.payload->>'assignment_id')
                le.user_id,
                (le.payload->>'assignment_id')::uuid AS source_id
            FROM public.learning_events le
            WHERE le.tenant_id = v_tenant
              AND le.event_type = 'ASSIGNMENT_SUBMITTED'
              AND le.created_at > v_watermark
              AND le.created_at <= v_now
              AND NOT EXISTS (
                  SELECT 1 FROM public.xp_transactions xt
                  WHERE xt.user_id = le.user_id
                    AND xt.tenant_id = v_tenant
                    AND xt.source_type = 'assignment_submit'
                    AND xt.source_id = (le.payload->>'assignment_id')::uuid
              )
        LOOP
            INSERT INTO public.xp_transactions (tenant_id, user_id, xp_amount, source_type, source_id)
            VALUES (v_tenant, v_rec.user_id, 15, 'assignment_submit', v_rec.source_id);

            INSERT INTO public.student_xp_summary (tenant_id, user_id, total_xp, level)
            VALUES (v_tenant, v_rec.user_id, 15, 1)
            ON CONFLICT (tenant_id, user_id) DO UPDATE SET
                total_xp   = public.student_xp_summary.total_xp + 15,
                level      = public.compute_level(public.student_xp_summary.total_xp + 15),
                updated_at = now();

            v_awarded := v_awarded + 1;
        END LOOP;

        -- Award XP for badges earned since watermark
        FOR v_rec IN
            SELECT sb.user_id, sb.badge_id, bd.xp_reward
            FROM public.student_badges sb
            JOIN public.badge_definitions bd ON bd.id = sb.badge_id
            WHERE sb.tenant_id = v_tenant
              AND sb.earned_at > v_watermark
              AND sb.earned_at <= v_now
              AND bd.xp_reward > 0
              AND NOT EXISTS (
                  SELECT 1 FROM public.xp_transactions xt
                  WHERE xt.user_id = sb.user_id
                    AND xt.tenant_id = v_tenant
                    AND xt.source_type = 'badge_earned'
                    AND xt.source_id = sb.badge_id
              )
        LOOP
            INSERT INTO public.xp_transactions (tenant_id, user_id, xp_amount, source_type, source_id)
            VALUES (v_tenant, v_rec.user_id, v_rec.xp_reward, 'badge_earned', v_rec.badge_id);

            INSERT INTO public.student_xp_summary (tenant_id, user_id, total_xp, level)
            VALUES (v_tenant, v_rec.user_id, v_rec.xp_reward, 1)
            ON CONFLICT (tenant_id, user_id) DO UPDATE SET
                total_xp   = public.student_xp_summary.total_xp + v_rec.xp_reward,
                level      = public.compute_level(public.student_xp_summary.total_xp + v_rec.xp_reward),
                updated_at = now();

            v_awarded := v_awarded + 1;
        END LOOP;

        -- Update streaks for all active users today
        FOR v_rec IN
            SELECT DISTINCT user_id
            FROM public.learning_events
            WHERE tenant_id = v_tenant AND DATE(created_at) = CURRENT_DATE
        LOOP
            INSERT INTO public.student_xp_summary
                (tenant_id, user_id, streak_current, streak_longest, streak_last_active_date)
            VALUES (v_tenant, v_rec.user_id, 1, 1, CURRENT_DATE)
            ON CONFLICT (tenant_id, user_id) DO UPDATE SET
                streak_current = CASE
                    WHEN public.student_xp_summary.streak_last_active_date = CURRENT_DATE
                        THEN public.student_xp_summary.streak_current
                    WHEN public.student_xp_summary.streak_last_active_date = CURRENT_DATE - 1
                        THEN public.student_xp_summary.streak_current + 1
                    ELSE 1
                END,
                streak_longest = GREATEST(
                    public.student_xp_summary.streak_longest,
                    CASE
                        WHEN public.student_xp_summary.streak_last_active_date = CURRENT_DATE
                            THEN public.student_xp_summary.streak_current
                        WHEN public.student_xp_summary.streak_last_active_date = CURRENT_DATE - 1
                            THEN public.student_xp_summary.streak_current + 1
                        ELSE 1
                    END
                ),
                streak_last_active_date = CURRENT_DATE,
                updated_at = now();
        END LOOP;

        -- Advance watermark
        UPDATE public.xp_processing_state
        SET last_processed_at = v_now
        WHERE tenant_id = v_tenant;
    END LOOP;

    RETURN v_awarded;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- pg_cron: Replace badge-only job with combined badge+XP+streak job
-- Wrapped in exception block — safe if pg_cron is not available
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
    PERFORM cron.unschedule('check-badge-eligibility');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    PERFORM cron.unschedule('badge-xp-streak-processor');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    PERFORM cron.schedule(
        'badge-xp-streak-processor',
        '7-59/5 * * * *',
        $$SELECT public.check_badge_eligibility(NULL); SELECT public.process_xp_awards();$$
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available — badge-xp-streak-processor cron not scheduled';
END $$;

COMMENT ON TABLE public.xp_transactions     IS 'Append-only XP ledger per student. Phase 37B.';
COMMENT ON TABLE public.student_xp_summary  IS 'Per-student XP aggregate + streak counter. Phase 37B.';
COMMENT ON TABLE public.xp_processing_state IS 'Watermark table for cron-based XP awarding. Phase 37B.';
