-- =============================================================================
-- Migration: rate_limits table for server-side rate limiting
-- Date: 2026-03-29
-- Purpose: Support server-side rate limiting for login, password-reset, etc.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id          uuid    DEFAULT gen_random_uuid() NOT NULL,
  key         text    NOT NULL,           -- e.g. 'login:user@example.com' or 'login:1.2.3.4'
  action      text    NOT NULL,           -- 'login', 'password_reset', 'quiz_submit'
  attempts    integer DEFAULT 1 NOT NULL,
  window_start timestamptz DEFAULT now() NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT rate_limits_pkey PRIMARY KEY (id),
  CONSTRAINT rate_limits_key_action_unique UNIQUE (key, action)
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No direct user access — only accessible via service role in Edge Functions
-- (deny all by default, Edge Functions use service role key)

-- Auto-cleanup old entries (older than 1 hour)
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start 
  ON public.rate_limits (window_start);

-- Comment
COMMENT ON TABLE public.rate_limits IS 
  'Server-side rate limiting counters. Managed exclusively by Edge Functions using service role.';
