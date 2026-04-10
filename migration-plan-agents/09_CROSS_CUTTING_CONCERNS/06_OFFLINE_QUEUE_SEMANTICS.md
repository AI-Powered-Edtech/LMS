# CC6: Offline Queue Semantics

**Started:** Phase 1  
**Duration:** Phase 1-6  
**Owner:** Backend/Frontend

## Tujuan

Menetapkan delivery semantics yang jelas untuk offline operations dan queue processing.

## Current State

The app already has `src/utils/offlineQueue.ts` which imports Supabase directly and uses IndexedDB via `src/utils/offlineStorage.ts`. The existing `QueuedOperation` interface supports idempotency keys, retry counts, conflict strategies, and exponential backoff. This document defines the contract that the VIL backend must honor so the existing frontend queue works unchanged.

## Kontrak Offline Delivery

| Entity            | Delivery        | Idempotency Key Format                         | Replay Response |
| ----------------- | --------------- | ---------------------------------------------- | --------------- |
| xAPI Statement    | At-least-once   | `xapi-statement:{verb}:{objectId}:{userId}`    | 200 OK          |
| Quiz Submit       | Exactly-once    | `quiz-submission:{attempt_id}:{user_id}`       | 200 OK          |
| Progress Event    | Last-write-wins | `progress:{lesson_id}:{user_id}`               | 200 OK          |
| Assignment Upload | At-least-once   | `assignment-upload:{submission_id}:{user_id}`  | 200 OK          |
| Attendance Mark   | At-least-once   | `attendance-mark:{schedule_id}:{user_id}`      | 200 OK          |
| Grade Update      | Last-write-wins | `grade-update:{submission_id}:{user_id}`       | 200 OK          |

## Queued Operation Interface

This matches the existing `src/utils/offlineQueue.ts` interface:

```typescript
// src/utils/offlineQueue.ts — existing interface (do NOT modify)
export interface QueuedOperation {
  id: string;                          // UUID — IndexedDB primary key
  type: QueueOperationType;            // 'quiz-submission' | 'assignment-upload' | ...
  payload: QueuePayload;               // operation-specific data
  idempotencyKey: string;              // deterministic key for dedup
  createdAt: number;                   // Date.now() at enqueue time
  attempts: number;                    // current retry count
  maxRetries: number;                  // per-operation limit
  nextRetryAt: number | null;          // epoch ms — exponential backoff
  lastError: string | null;            // last failure reason
  conflictStrategy: 'client-wins' | 'server-wins' | 'manual' | null;
}
```

## Queue Persistence (IndexedDB)

The existing `src/utils/offlineStorage.ts` stores queued items in IndexedDB. Schema:

```typescript
// IndexedDB store: "syncQueue"
// Key path: "id"
// Indexes: "status", "createdAt"
interface SyncQueueItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  createdAt: number;
  updatedAt: number;
  retryCount: number;
  error?: string;
}
```

Items persist across page reloads and browser restarts. The queue is drained when the app detects connectivity via `navigator.onLine` + a fetch probe to `/health`.

## Sync Protocol with Idempotency

### Frontend Enqueue Flow

```typescript
// src/utils/offlineQueue.ts — enqueue function (existing)
import { v4 as uuid } from 'uuid';

export function generateIdempotencyKey(
  type: QueueOperationType,
  entityId: string,
  userId: string,
): string {
  return `${type}:${entityId}:${userId}`;
}

export async function enqueueOperation(
  type: QueueOperationType,
  entityId: string,
  userId: string,
  payload: Record<string, unknown>,
  options?: { conflictStrategy?: 'client-wins' | 'server-wins' | 'manual'; maxRetries?: number },
): Promise<string> {
  const op: QueuedOperation = {
    id: uuid(),
    type,
    payload: { ...payload, idempotencyKey: generateIdempotencyKey(type, entityId, userId) },
    idempotencyKey: generateIdempotencyKey(type, entityId, userId),
    createdAt: Date.now(),
    attempts: 0,
    maxRetries: options?.maxRetries ?? 5,
    nextRetryAt: null,
    lastError: null,
    conflictStrategy: options?.conflictStrategy ?? 'client-wins',
  };
  await addToSyncQueue(op);
  return op.id;
}
```

### Frontend Sync Drain Loop

```typescript
// src/utils/offlineQueue.ts — sync loop (existing pattern)

const BASE_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 300_000; // 5 minutes

function getBackoffMs(attempt: number): number {
  const jitter = Math.random() * 1000;
  return Math.min(BASE_BACKOFF_MS * Math.pow(2, attempt) + jitter, MAX_BACKOFF_MS);
}

export async function drainQueue(): Promise<SyncResult> {
  const pending = await getPendingSubmissions();
  const result: SyncResult = { synced: 0, failed: 0, conflicts: 0, permanent: 0 };

  for (const item of pending) {
    // Skip items whose backoff has not elapsed
    if (item.nextRetryAt && Date.now() < item.nextRetryAt) continue;

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': item.idempotencyKey,
        },
        body: JSON.stringify({ type: item.type, payload: item.payload }),
      });

      if (response.ok) {
        await markSynced(item.id);
        result.synced++;
      } else if (response.status === 409) {
        // Conflict — apply strategy
        await handleConflict(item, await response.json());
        result.conflicts++;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      item.attempts++;
      item.lastError = (err as Error).message;
      item.nextRetryAt = Date.now() + getBackoffMs(item.attempts);

      if (item.attempts >= item.maxRetries) {
        await moveToDLQ(item);
        result.permanent++;
      } else {
        await updateQueueItem(item);
        result.failed++;
      }
    }
  }
  return result;
}
```

### Backend Idempotency Check

**File:** `vil-backend/src/middleware/idempotency.rs`

```rust
use axum::{extract::State, http::Request, middleware::Next, response::Response};
use sqlx::PgPool;
use uuid::Uuid;

/// Middleware: check Idempotency-Key header.
/// If key was already processed, return cached response.
/// If new, proceed and cache result.
pub async fn idempotency_middleware(
    State(db): State<PgPool>,
    req: Request<axum::body::Body>,
    next: Next,
) -> Result<Response, AppError> {
    let key = req
        .headers()
        .get("Idempotency-Key")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let Some(key) = key else {
        // No idempotency key — pass through
        return Ok(next.run(req).await);
    };

    // Check cache
    let cached: Option<(i16, Vec<u8>)> = sqlx::query_as(
        "SELECT status_code, response_body FROM idempotency_cache WHERE key = $1 AND created_at > NOW() - INTERVAL '24 hours'"
    )
    .bind(&key)
    .fetch_optional(&db)
    .await?;

    if let Some((status, body)) = cached {
        // Return cached response
        let resp = Response::builder()
            .status(status as u16)
            .header("X-Idempotent-Replay", "true")
            .body(axum::body::Body::from(body))
            .unwrap();
        return Ok(resp);
    }

    // Process request
    let response = next.run(req).await;

    // Cache result (fire-and-forget)
    let status_code = response.status().as_u16() as i16;
    let body_bytes = axum::body::to_bytes(response.into_body(), 1_048_576).await?;
    sqlx::query(
        "INSERT INTO idempotency_cache (key, status_code, response_body) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING"
    )
    .bind(&key)
    .bind(status_code)
    .bind(&body_bytes.to_vec())
    .execute(&db)
    .await?;

    Ok(Response::builder()
        .status(status_code as u16)
        .body(axum::body::Body::from(body_bytes))
        .unwrap())
}
```

**SQL — idempotency cache table:**

```sql
-- Migration: create idempotency cache
CREATE TABLE IF NOT EXISTS idempotency_cache (
    key TEXT PRIMARY KEY,
    status_code SMALLINT NOT NULL,
    response_body BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-cleanup: remove entries older than 24 hours
CREATE INDEX idx_idempotency_cache_created ON idempotency_cache (created_at);

-- pg_cron or VIL cron job:
-- DELETE FROM idempotency_cache WHERE created_at < NOW() - INTERVAL '24 hours';
```

## Conflict Resolution Strategy

| Strategy      | When Used                          | Behavior                                               |
| ------------- | ---------------------------------- | ------------------------------------------------------ |
| client-wins   | Progress events, attendance marks  | Client value overwrites server unconditionally          |
| server-wins   | Quiz submissions (graded)          | Server value kept; client notified of existing result   |
| manual        | Assignment uploads (teacher graded)| Return 409 with both versions; UI shows merge dialog   |

**Frontend conflict handler:**

```typescript
async function handleConflict(
  item: QueuedOperation,
  serverResponse: { serverVersion: unknown; message: string },
): Promise<void> {
  switch (item.conflictStrategy) {
    case 'client-wins':
      // Re-send with force flag
      await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': item.idempotencyKey,
          'X-Conflict-Resolution': 'client-wins',
        },
        body: JSON.stringify({ type: item.type, payload: item.payload }),
      });
      await markSynced(item.id);
      break;

    case 'server-wins':
      // Accept server version silently
      await markSynced(item.id);
      break;

    case 'manual':
      // Store conflict for UI resolution
      await storeConflict(item, serverResponse.serverVersion);
      break;
  }
}
```

## Retry Policy

| Operation         | Max Retries | Backoff                              | Timeout per attempt |
| ----------------- | ----------- | ------------------------------------ | ------------------- |
| xAPI Statement    | 5           | Exponential (2s, 4s, 8s, 16s, 32s)  | 30s                 |
| Quiz Submission   | 10          | Exponential (2s, 4s, ..., capped 5m)| 60s                 |
| Progress Event    | 3           | Linear (500ms)                       | 10s                 |
| Assignment Upload | 5           | Exponential (2s, 4s, 8s, 16s, 32s)  | 60s                 |
| Attendance Mark   | 5           | Exponential (2s, 4s, 8s, 16s, 32s)  | 30s                 |
| Grade Update      | 3           | Exponential (2s, 4s, 8s)            | 30s                 |

## Dead Letter Queue (DLQ)

Failed messages after max retries move to DLQ:

```sql
CREATE TABLE dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    tenant_id UUID NOT NULL REFERENCES tenants(id)
);

ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON dead_letter_queue
  USING (tenant_id = (SELECT get_my_tenant_id()));

CREATE INDEX idx_dlq_unresolved ON dead_letter_queue (tenant_id, created_at)
  WHERE resolved_at IS NULL;
```

DLQ processing rules:

1. Admin dashboard shows unresolved DLQ items per tenant
2. Manual replay: set `resolved_at`, re-enqueue with fresh idempotency key
3. Auto-cleanup: delete resolved items older than 30 days

## Implementation Steps

### Phase 1 (Week 11-22)

1. Verify existing `offlineQueue.ts` idempotency key format matches the contract table above
2. Add `Idempotency-Key` header to all sync requests in `drainQueue()`
3. Add offline detection with `navigator.onLine` + `/health` probe

### Phase 2 (Week 23-36)

1. Create `idempotency_cache` table in VIL database
2. Implement `idempotency_middleware` in VIL Axum app
3. Create `dead_letter_queue` table with RLS
4. Implement conflict resolution handlers in frontend

### Phase 3-6 (Week 37-72)

1. Add DLQ admin dashboard (read-only for teachers, full for admins)
2. Add automatic DLQ replay for transient errors
3. Monitor sync success rate via Prometheus metrics

## Verification Commands

```bash
# 1. Verify offline queue types compile
cd frontend && npx tsc --noEmit src/utils/offlineQueue.ts

# 2. Check idempotency middleware compiles
cd vil-backend && cargo check 2>&1 | head -20

# 3. Test idempotency: send same key twice, second should return cached
KEY="test-key-$(date +%s)"
curl -s -X POST http://localhost:3001/api/sync \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $KEY" \
  -d '{"type":"xapi-statement","payload":{}}' | jq .
# Send again — should get X-Idempotent-Replay: true
curl -sI -X POST http://localhost:3001/api/sync \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $KEY" \
  -d '{"type":"xapi-statement","payload":{}}' | grep Idempotent

# 4. Verify DLQ table exists
psql "$DATABASE_URL" -c "SELECT count(*) FROM dead_letter_queue;"

# 5. Verify idempotency cache cleanup
psql "$DATABASE_URL" -c "SELECT count(*) FROM idempotency_cache WHERE created_at < NOW() - INTERVAL '24 hours';"
# Should be 0 after cron runs
```

## Exit Criteria

- [ ] Idempotency keys follow the contract table format for all operation types
- [ ] `Idempotency-Key` header sent on every sync request
- [ ] VIL `idempotency_middleware` returns cached response for duplicate keys
- [ ] Conflict resolution works for all three strategies (client-wins, server-wins, manual)
- [ ] DLQ table created with RLS and tenant isolation
- [ ] Retry policy matches the table above (backoff, max retries, timeouts)
- [ ] Existing `offlineQueue.ts` interface preserved (no breaking changes)

## Referensi

- Existing code: `src/utils/offlineQueue.ts`, `src/utils/offlineStorage.ts`
- Related: [07_WORKER_QUEUE_RUNTIME.md](./07_WORKER_QUEUE_RUNTIME.md) untuk worker implementation
- Related: [08_FRONTEND_RUNTIME_COMPATIBILITY.md](./08_FRONTEND_RUNTIME_COMPATIBILITY.md) untuk PWA integration
- Contract 4 di main plan document
