-- EduSync LMS — Offline Sync Enhancement Migration
-- Adds queue tracking, conflict detection, and sync audit tables

-- ---------------------------------------------------------------------------
-- 1. Offline Sync Queue Tracking Table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Operation details
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'quiz-submission',
    'assignment-upload',
    'grade-update',
    'attendance-mark',
    'message-send',
    'form-submit'
  )),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,

  -- Payload (JSONB for flexibility)
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Idempotency
  idempotency_key TEXT NOT NULL,

  -- Retry tracking
  attempts INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'syncing',
    'synced',
    'failed',
    'conflict',
    'permanent_failure'
  )),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,

  -- Ensure unique idempotency per user
  UNIQUE(user_id, idempotency_key)
);

-- Indexes for efficient queue operations
CREATE INDEX idx_offline_queue_user_status ON offline_sync_queue(user_id, status)
  WHERE status = 'pending';
CREATE INDEX idx_offline_queue_retry ON offline_sync_queue(next_retry_at, status)
  WHERE status = 'pending' AND next_retry_at IS NOT NULL;
CREATE INDEX idx_offline_queue_entity ON offline_sync_queue(entity_type, entity_id);
CREATE INDEX idx_offline_queue_created ON offline_sync_queue(created_at DESC);

-- RLS
ALTER TABLE offline_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY offline_queue_user_own ON offline_sync_queue
  FOR ALL
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. Sync Audit Log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS offline_sync_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Operation details
  operation_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  idempotency_key TEXT,

  -- Result
  status TEXT NOT NULL CHECK (status IN ('synced', 'failed', 'conflict_resolved', 'permanent_failure')),
  error_message TEXT,
  resolution_strategy TEXT,

  -- Timing
  queued_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_attempts INTEGER NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX idx_offline_audit_user ON offline_sync_audit(user_id, synced_at DESC);
CREATE INDEX idx_offline_audit_entity ON offline_sync_audit(entity_type, entity_id);
CREATE INDEX idx_offline_audit_status ON offline_sync_audit(status);

-- RLS
ALTER TABLE offline_sync_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY offline_audit_user_own ON offline_sync_audit
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY offline_audit_tenant_read ON offline_sync_audit
  FOR SELECT
  USING (tenant_id = get_my_tenant_id() AND has_role('ADMIN'));

-- ---------------------------------------------------------------------------
-- 3. Helper Functions
-- ---------------------------------------------------------------------------

-- Get pending queue count for current user
CREATE OR REPLACE FUNCTION get_offline_queue_count()
RETURNS TABLE (
  pending_count INTEGER,
  syncing_count INTEGER,
  failed_count INTEGER,
  conflict_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER,
    COUNT(*) FILTER (WHERE status = 'syncing')::INTEGER,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER,
    COUNT(*) FILTER (WHERE status = 'conflict')::INTEGER
  FROM offline_sync_queue
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark a queue item as synced and audit it
CREATE OR REPLACE FUNCTION mark_offline_item_synced(p_queue_id UUID)
RETURNS VOID AS $$
DECLARE
  v_queue_record RECORD;
BEGIN
  -- Get the queue item
  SELECT * INTO v_queue_record
  FROM offline_sync_queue
  WHERE id = p_queue_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue item not found';
  END IF;

  -- Update queue item
  UPDATE offline_sync_queue
  SET status = 'synced',
      synced_at = NOW(),
      updated_at = NOW()
  WHERE id = p_queue_id;

  -- Insert audit record
  INSERT INTO offline_sync_audit (
    tenant_id,
    user_id,
    operation_type,
    entity_type,
    entity_id,
    idempotency_key,
    status,
    queued_at,
    synced_at,
    total_attempts
  ) VALUES (
    v_queue_record.tenant_id,
    v_queue_record.user_id,
    v_queue_record.operation_type,
    v_queue_record.entity_type,
    v_queue_record.entity_id,
    v_queue_record.idempotency_key,
    'synced',
    v_queue_record.created_at,
    NOW(),
    v_queue_record.attempts + 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark a queue item as failed and audit it
CREATE OR REPLACE FUNCTION mark_offline_item_failed(
  p_queue_id UUID,
  p_status TEXT DEFAULT 'failed'
)
RETURNS VOID AS $$
DECLARE
  v_queue_record RECORD;
BEGIN
  SELECT * INTO v_queue_record
  FROM offline_sync_queue
  WHERE id = p_queue_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue item not found';
  END IF;

  UPDATE offline_sync_queue
  SET status = p_status::TEXT,
      updated_at = NOW()
  WHERE id = p_queue_id;

  INSERT INTO offline_sync_audit (
    tenant_id,
    user_id,
    operation_type,
    entity_type,
    entity_id,
    idempotency_key,
    status,
    error_message,
    queued_at,
    synced_at,
    total_attempts
  ) VALUES (
    v_queue_record.tenant_id,
    v_queue_record.user_id,
    v_queue_record.operation_type,
    v_queue_record.entity_type,
    v_queue_record.entity_id,
    v_queue_record.idempotency_key,
    p_status,
    v_queue_record.last_error,
    v_queue_record.created_at,
    NOW(),
    v_queue_record.attempts + 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 4. Comments
-- ---------------------------------------------------------------------------

COMMENT ON TABLE offline_sync_queue IS 'Tracks operations queued for sync when device comes back online';
COMMENT ON TABLE offline_sync_audit IS 'Audit trail for all offline sync operations';
COMMENT ON FUNCTION get_offline_queue_count IS 'Returns counts of queue items by status for current user';
COMMENT ON FUNCTION mark_offline_item_synced IS 'Marks a queue item as synced and creates audit record';
COMMENT ON FUNCTION mark_offline_item_failed IS 'Marks a queue item as failed and creates audit record';
