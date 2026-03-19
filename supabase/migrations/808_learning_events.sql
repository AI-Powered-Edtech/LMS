-- ==========================================================================
-- Migration 808: Learning Events Table
-- SP-12.1 — Core event tracking infrastructure
--
-- Event types (LOCKED):
--   LESSON_STARTED, LESSON_COMPLETED, BLOCK_VIEWED, VIDEO_PROGRESS,
--   QUIZ_STARTED, QUIZ_SUBMITTED, ASSIGNMENT_SUBMITTED, FILE_DOWNLOADED
--
-- Metadata is event-specific JSONB, kept flat (max 2 levels, snake_case).
-- session_id groups events into learning sessions for behavior analysis.
-- ==========================================================================

SET search_path = public;

CREATE TABLE IF NOT EXISTS learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,

  course_id uuid,
  lesson_id uuid,
  module_id uuid,

  session_id uuid NOT NULL,

  event_type text NOT NULL,
  event_version int DEFAULT 1,

  client_timestamp timestamptz,
  server_timestamp timestamptz DEFAULT now(),

  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now()
);

-- Constrain event_type to locked enum values
ALTER TABLE learning_events
  DROP CONSTRAINT IF EXISTS learning_events_event_type_check;

ALTER TABLE learning_events
  ADD CONSTRAINT learning_events_event_type_check
  CHECK (event_type IN (
    'LESSON_STARTED',
    'LESSON_COMPLETED',
    'BLOCK_VIEWED',
    'VIDEO_PROGRESS',
    'QUIZ_STARTED',
    'QUIZ_SUBMITTED',
    'ASSIGNMENT_SUBMITTED',
    'FILE_DOWNLOADED'
  ));

-- ==========================================================================
-- Indexes for common query patterns
-- ==========================================================================

-- Analytics queries: "all events for a user in a tenant"
CREATE INDEX IF NOT EXISTS idx_learning_events_tenant_user
  ON learning_events (tenant_id, user_id);

-- Per-lesson analytics: "all events for a lesson"
CREATE INDEX IF NOT EXISTS idx_learning_events_lesson
  ON learning_events (lesson_id) WHERE lesson_id IS NOT NULL;

-- Session replay: "all events in a session"
CREATE INDEX IF NOT EXISTS idx_learning_events_session
  ON learning_events (session_id);

-- Time-based queries: "events in last 24h"
CREATE INDEX IF NOT EXISTS idx_learning_events_server_ts
  ON learning_events (server_timestamp);

-- Event type filtering: "all QUIZ_SUBMITTED events"
CREATE INDEX IF NOT EXISTS idx_learning_events_type
  ON learning_events (event_type);

-- ==========================================================================
-- RLS: students can insert own events, teachers/admins can read tenant events
-- ==========================================================================

ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own events" ON learning_events;
CREATE POLICY "Users can insert own events"
  ON learning_events FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = get_my_tenant_id()
  );

DROP POLICY IF EXISTS "Users can read own events" ON learning_events;
CREATE POLICY "Users can read own events"
  ON learning_events FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND tenant_id = get_my_tenant_id()
  );

DROP POLICY IF EXISTS "Teachers can read tenant events" ON learning_events;
CREATE POLICY "Teachers can read tenant events"
  ON learning_events FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_my_tenant_id()
    AND (has_role('TEACHER') OR has_role('ADMIN'))
  );

-- ==========================================================================
-- Batch insert RPC (for SP-12.2 client batching)
-- Accepts an array of events, validates, and inserts in one transaction
-- ==========================================================================

CREATE OR REPLACE FUNCTION insert_learning_events(p_events jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
  v_inserted int := 0;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = v_user_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_NOT_FOUND';
  END IF;

  INSERT INTO learning_events (
    tenant_id, user_id, course_id, lesson_id, module_id,
    session_id, event_type, event_version,
    client_timestamp, metadata
  )
  SELECT
    v_tenant_id,
    v_user_id,
    (e->>'course_id')::uuid,
    (e->>'lesson_id')::uuid,
    (e->>'module_id')::uuid,
    (e->>'session_id')::uuid,
    e->>'event_type',
    COALESCE((e->>'event_version')::int, 1),
    COALESCE((e->>'client_timestamp')::timestamptz, now()),
    COALESCE(e->'metadata', '{}'::jsonb)
  FROM jsonb_array_elements(p_events) AS e
  WHERE e->>'event_type' IN (
    'LESSON_STARTED', 'LESSON_COMPLETED', 'BLOCK_VIEWED', 'VIDEO_PROGRESS',
    'QUIZ_STARTED', 'QUIZ_SUBMITTED', 'ASSIGNMENT_SUBMITTED', 'FILE_DOWNLOADED'
  )
  AND e->>'session_id' IS NOT NULL;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'inserted', v_inserted);
END;
$$;

GRANT EXECUTE ON FUNCTION insert_learning_events TO authenticated;
