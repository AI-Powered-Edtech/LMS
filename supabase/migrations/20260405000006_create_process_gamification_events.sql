-- Sprint 1.3: Create process_gamification_events()
-- ============================================================
-- Fixes the silent cron failure introduced by migration
-- 20260324120000_optimize_cron_jobs_free_tier.sql, which
-- schedules `SELECT public.process_gamification_events();`
-- at 02:00 daily but the function was never created in any
-- active migration.
--
-- Design decisions:
--   1. SECURITY DEFINER with no auth.uid() check — this function
--      is invoked by pg_cron (service role), where auth.uid()
--      is always NULL.  All existing record_xp_transaction()
--      overloads guard with `IF auth.uid() IS NULL THEN RAISE`,
--      so we perform the XP DML directly here instead of
--      delegating to that RPC.
--
--   2. Watermark via activity_events.processed_gamification_at —
--      the column already exists in the baseline schema.
--      We SELECT rows WHERE processed_gamification_at IS NULL,
--      then UPDATE them after processing.  This is fully
--      idempotent: if the cron re-runs on the same rows they
--      are already marked and skipped.
--
--   3. XP award amounts:
--        LESSON_COMPLETED       → 10 XP
--        QUIZ_COMPLETED         → 20 XP
--        ASSIGNMENT_SUBMITTED   → 15 XP
--
--   4. xp_transactions idempotency is preserved via the unique
--      constraint uq_xp_tx_user_source (user_id, source_type,
--      source_id) with ON CONFLICT DO NOTHING.
--
--   5. Streak update uses the inline logic from the archive
--      reference (822_streaks_xp.sql lines 549-574), operating
--      on student_xp_summary.streak_last_active_date /
--      last_activity_date (both columns exist after migration
--      20260405000003).
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_gamification_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_processed  INTEGER := 0;
  v_event      RECORD;
  v_xp_amount  INTEGER;
  v_source_type TEXT;
  v_now         TIMESTAMPTZ := NOW();
BEGIN
  -- ──────────────────────────────────────────────────────────
  -- 1. Iterate over unprocessed events of the relevant types.
  --    The WHERE processed_gamification_at IS NULL clause
  --    acts as the watermark; we update it after a successful
  --    award so the row is never re-processed.
  -- ──────────────────────────────────────────────────────────
  FOR v_event IN
    SELECT
      ae.id,
      ae.user_id,
      ae.tenant_id,
      ae.event_type,
      ae.entity_id,
      ae.created_at
    FROM public.activity_events ae
    WHERE ae.event_type IN (
        'LESSON_COMPLETED'::public.activity_event_type,
        'QUIZ_COMPLETED'::public.activity_event_type,
        'ASSIGNMENT_SUBMITTED'::public.activity_event_type
      )
      AND ae.processed_gamification_at IS NULL
      AND ae.created_at < v_now          -- do not race with concurrent inserts
    ORDER BY ae.created_at ASC
  LOOP
    -- ──────────────────────────────────────────────────────
    -- 2. Map event type → XP amount + source_type label
    -- ──────────────────────────────────────────────────────
    CASE v_event.event_type::text
      WHEN 'LESSON_COMPLETED'     THEN
        v_xp_amount   := 10;
        v_source_type := 'lesson_complete';
      WHEN 'QUIZ_COMPLETED'       THEN
        v_xp_amount   := 20;
        v_source_type := 'quiz_score';
      WHEN 'ASSIGNMENT_SUBMITTED' THEN
        v_xp_amount   := 15;
        v_source_type := 'assignment_submit';
      ELSE
        v_xp_amount   := 0;
        v_source_type := NULL;
    END CASE;

    IF v_xp_amount > 0 THEN
      -- ────────────────────────────────────────────────────
      -- 3. Insert XP transaction directly.
      --    ON CONFLICT DO NOTHING ensures idempotency via
      --    uq_xp_tx_user_source (user_id, source_type, source_id).
      --    We bypass record_xp_transaction() because that RPC
      --    enforces auth.uid() IS NOT NULL, which is always
      --    false inside a pg_cron invocation (service role).
      -- ────────────────────────────────────────────────────
      INSERT INTO public.xp_transactions (
        user_id,
        tenant_id,
        xp_amount,
        source_type,
        source_id,
        created_at
      ) VALUES (
        v_event.user_id,
        v_event.tenant_id,
        v_xp_amount,
        v_source_type,
        v_event.entity_id,
        v_now
      )
      ON CONFLICT ON CONSTRAINT uq_xp_tx_user_source DO NOTHING;

      -- ────────────────────────────────────────────────────
      -- 4. Update XP summary only when the INSERT landed
      --    (i.e. not a duplicate that was silently ignored).
      -- ────────────────────────────────────────────────────
      IF FOUND THEN
        INSERT INTO public.student_xp_summary (
          user_id,
          tenant_id,
          total_xp,
          updated_at
        ) VALUES (
          v_event.user_id,
          v_event.tenant_id,
          v_xp_amount,
          v_now
        )
        ON CONFLICT (user_id, tenant_id) DO UPDATE
          SET total_xp   = public.student_xp_summary.total_xp + EXCLUDED.total_xp,
              updated_at = v_now;
      END IF;

      -- ────────────────────────────────────────────────────
      -- 5. Mark the activity_event as processed so it is
      --    skipped in all future cron runs (watermark).
      -- ────────────────────────────────────────────────────
      UPDATE public.activity_events
        SET processed_gamification_at = v_now
      WHERE id = v_event.id;

      v_processed := v_processed + 1;
    END IF;
  END LOOP;

  -- ──────────────────────────────────────────────────────────
  -- 6. Streak update — run once per active user per tenant.
  --    Active = has at least one activity_event today that was
  --    processed in this run (processed_gamification_at = v_now).
  --    Inline streak logic mirrors 822_streaks_xp.sql:549-574.
  --    Both streak_last_active_date and last_activity_date columns
  --    exist after migration 20260405000003; we update both for
  --    forward/backward compatibility.
  -- ──────────────────────────────────────────────────────────
  INSERT INTO public.student_xp_summary (
    tenant_id,
    user_id,
    streak_current,
    streak_longest,
    streak_last_active_date,
    last_activity_date,
    updated_at
  )
  SELECT DISTINCT
    ae.tenant_id,
    ae.user_id,
    1,            -- initial streak_current for new rows
    1,            -- initial streak_longest for new rows
    CURRENT_DATE,
    CURRENT_DATE,
    v_now
  FROM public.activity_events ae
  WHERE ae.processed_gamification_at = v_now
  ON CONFLICT (user_id, tenant_id) DO UPDATE
    SET
      streak_current = CASE
        WHEN public.student_xp_summary.streak_last_active_date = CURRENT_DATE
          -- Already updated today (multiple events in same run) — no change
          THEN public.student_xp_summary.streak_current
        WHEN public.student_xp_summary.streak_last_active_date = CURRENT_DATE - 1
          -- Consecutive day — extend streak
          THEN public.student_xp_summary.streak_current + 1
        ELSE
          -- Gap in activity — reset to 1
          1
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
      last_activity_date      = CURRENT_DATE,
      updated_at              = v_now;

  RETURN v_processed;
END;
$$;

COMMENT ON FUNCTION public.process_gamification_events() IS
  'Sprint 1.3: Cron-safe batch processor for XP awards and streak updates. '
  'Called daily at 02:00 by pg_cron job ''badge-xp-streak-processor''. '
  'Uses activity_events.processed_gamification_at as watermark for idempotency.';

-- ──────────────────────────────────────────────────────────
-- Grants: service_role only — no client access.
-- pg_cron executes as service_role; no JWT means auth.uid()
-- would be NULL so authenticated/anon roles must not call this.
-- ──────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.process_gamification_events() TO service_role;
REVOKE EXECUTE ON FUNCTION public.process_gamification_events() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_gamification_events() FROM anon;
