-- =============================================================================
-- Migration: Atomic rate-limit RPC for check-rate-limit Edge Function
-- Date: 2026-04-02
-- Purpose: Replace the non-atomic SELECT→INSERT/UPDATE pattern in the
--          check-rate-limit edge function with a single PL/pgSQL function
--          that uses INSERT ... ON CONFLICT DO UPDATE to atomically increment
--          the attempts counter and apply fixed-window bucket logic.
--
-- Depends on: 20260329000001_rate_limits_table.sql (public.rate_limits)
--
-- The rate_limits table has UNIQUE (key, action). Window bucketing is
-- implemented by storing the bucket start in window_start and resetting
-- attempts to 1 when the stored window_start falls outside the current bucket.
-- =============================================================================

-- Add updated_at column to rate_limits if it does not already exist
-- (the base table created in 20260329000001 does not include it)
ALTER TABLE public.rate_limits
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

-- ---------------------------------------------------------------------------
-- Function: check_and_increment_rate_limit_v2
--
-- Atomically checks and increments the rate-limit counter for a given
-- (key, action) pair using a fixed-width time bucket.
--
-- Parameters:
--   p_key         TEXT    — rate-limit key, e.g. 'login:user@example.com'
--   p_action      TEXT    — action identifier, e.g. 'login'
--   p_max_attempts INT    — maximum allowed attempts per window
--   p_window_ms   BIGINT  — window size in milliseconds
--
-- Returns a single JSON object:
--   { "allowed": bool, "remaining": int, "retry_after_ms": bigint }
--
-- Security: SECURITY DEFINER so service_role can call it via supabase.rpc().
--           search_path is pinned to 'public' to prevent search-path injection.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit_v2(
  p_key         TEXT,
  p_action      TEXT,
  p_max_attempts INT     DEFAULT 5,
  p_window_ms   BIGINT  DEFAULT 60000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  -- Fixed-width bucket start: floor(epoch_ms / window_ms) * window_ms
  v_bucket      timestamptz;
  v_epoch_ms    BIGINT;
  v_attempts    INT;
  v_remaining   INT;
  v_retry_ms    BIGINT;
  v_existing    record;
BEGIN
  -- Compute the start of the current time bucket
  v_epoch_ms := floor(extract(epoch FROM clock_timestamp()) * 1000)::BIGINT;
  v_bucket   := to_timestamp((v_epoch_ms / p_window_ms * p_window_ms)::DOUBLE PRECISION / 1000);

  -- Try to read the existing row for this (key, action) pair
  SELECT id, attempts, window_start
    INTO v_existing
    FROM public.rate_limits
   WHERE key    = p_key
     AND action = p_action
  FOR UPDATE;  -- advisory row lock prevents concurrent races on this row

  IF NOT FOUND THEN
    -- First ever attempt: insert a new row
    INSERT INTO public.rate_limits (key, action, attempts, window_start, updated_at)
    VALUES (p_key, p_action, 1, v_bucket, clock_timestamp())
    ON CONFLICT (key, action) DO UPDATE
      SET attempts    = CASE
                          WHEN rate_limits.window_start >= v_bucket
                          THEN rate_limits.attempts + 1   -- same bucket: increment
                          ELSE 1                          -- new bucket: reset
                        END,
          window_start = CASE
                           WHEN rate_limits.window_start >= v_bucket
                           THEN rate_limits.window_start  -- keep existing bucket start
                           ELSE v_bucket                   -- reset to new bucket
                         END,
          updated_at  = clock_timestamp()
    RETURNING attempts INTO v_attempts;
  ELSE
    -- Row exists: check whether the stored window is still current
    IF v_existing.window_start >= v_bucket THEN
      -- Same window bucket: atomically increment
      UPDATE public.rate_limits
         SET attempts   = attempts + 1,
             updated_at = clock_timestamp()
       WHERE id = v_existing.id
      RETURNING attempts INTO v_attempts;
    ELSE
      -- Window has expired: reset counter to 1 for the new bucket
      UPDATE public.rate_limits
         SET attempts    = 1,
             window_start = v_bucket,
             updated_at  = clock_timestamp()
       WHERE id = v_existing.id
      RETURNING attempts INTO v_attempts;
    END IF;
  END IF;

  -- Build response
  IF v_attempts > p_max_attempts THEN
    -- Over limit (can happen if max_attempts was lowered after recording)
    v_retry_ms := p_window_ms;
    RETURN jsonb_build_object(
      'allowed',        false,
      'remaining',      0,
      'retry_after_ms', v_retry_ms
    );
  ELSIF v_attempts = p_max_attempts THEN
    -- This request consumed the last allowed slot — still allowed but 0 remaining
    v_remaining := 0;
    RETURN jsonb_build_object(
      'allowed',        true,
      'remaining',      v_remaining,
      'retry_after_ms', 0
    );
  ELSE
    v_remaining := p_max_attempts - v_attempts;
    RETURN jsonb_build_object(
      'allowed',        true,
      'remaining',      v_remaining,
      'retry_after_ms', 0
    );
  END IF;
END;
$$;

-- Grant execute to service_role only (edge functions use the service role key)
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit_v2(TEXT, TEXT, INT, BIGINT)
  TO service_role;

-- Revoke from public and authenticated to prevent direct caller abuse
REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit_v2(TEXT, TEXT, INT, BIGINT)
  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit_v2(TEXT, TEXT, INT, BIGINT)
  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit_v2(TEXT, TEXT, INT, BIGINT)
  FROM anon;

COMMENT ON FUNCTION public.check_and_increment_rate_limit_v2(TEXT, TEXT, INT, BIGINT) IS
  'Atomically increments the rate-limit counter for (key, action) using a fixed-width '
  'time bucket. Uses SELECT FOR UPDATE to prevent TOCTOU races. Returns JSON with '
  '{allowed, remaining, retry_after_ms}. Called exclusively by the check-rate-limit '
  'Edge Function via the service role.';
