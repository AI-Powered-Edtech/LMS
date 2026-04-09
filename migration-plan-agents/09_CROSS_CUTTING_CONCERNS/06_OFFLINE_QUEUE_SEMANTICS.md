# CC6: Offline Queue Semantics

**Started:** Phase 1  
**Duration:** Phase 1-6  
**Owner:** Backend/Frontend

## Tujuan

Menetapkan delivery semantics yang jelas untuk offline operations dan queue processing.

## Kontrak Offline Delivery

| Entity            | Delivery        | Idempotency Key                                | Replay Response |
| ----------------- | --------------- | ---------------------------------------------- | --------------- |
| xAPI Statement    | At-least-once   | `xapi:{verb}:{objectType}:{objectId}:{userId}` | 200 OK          |
| Quiz Submit       | Exactly-once    | `quiz:{attempt_id}:{user_id}`                  | 200 OK          |
| Progress Event    | Last-write-wins | `progress:{lesson_id}:{user_id}`               | 200 OK          |
| Assignment Upload | At-least-once   | `assignment:{submission_id}`                   | 200 OK          |

## Delivery Semantics

### At-Least-Once

- Used for: xAPI statements, assignment uploads
- Implementation:
  - Store in local queue first
  - Retry on failure with exponential backoff
  - Acknowledge only after successful processing
  - Possible duplicate on network failure (handled by idempotency)

```typescript
// At-least-once implementation
async function sendWithRetry(message: Message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await api.post('/queue', message)
      return // Success
    } catch (e) {
      if (i === maxRetries - 1) throw e
      await sleep(Math.pow(2, i) * 1000) // Exponential backoff
    }
  }
}
```

### Exactly-Once

- Used for: Quiz submissions (critical)
- Implementation:
  - Generate unique idempotency key per attempt
  - Server checks key before processing
  - Return cached response if already processed
  - Client retries with same key until success

```rust
// Server-side exactly-once check
async fn submit_quiz(
    attempt_id: Uuid,
    user_id: Uuid,
    idempotency_key: String,
) -> Result<QuizResult, Error> {
    // Check if already processed
    if let Some(cached) = get_cached_result(&idempotency_key).await {
        return Ok(cached);
    }

    // Process quiz
    let result = process_quiz(attempt_id, user_id).await?;

    // Cache result
    set_cached_result(&idempotency_key, &result).await;

    Ok(result)
}
```

### Last-Write-Wins

- Used for: Progress events (high frequency, some loss acceptable)
- Implementation:
  - Send with timestamp
  - Server keeps latest per user/lesson
  - Older writes ignored
  - No retry needed (stale data replaced)

## Idempotency Keys

Format standar:

```
{xpi|quiz|progress|assignment}:{entity_id}:{user_id}
```

Examples:

- `xapi:completed:lesson:123:user456`
- `quiz:attempt-789:user456`
- `progress:lesson-101:user456`
- `assignment:submission-202:user456`

## Retry Policy

| Operation  | Max Retries | Backoff                           | Timeout |
| ---------- | ----------- | --------------------------------- | ------- |
| xAPI       | 5           | Exponential (1s, 2s, 4s, 8s, 16s) | 30s     |
| Quiz       | 10          | Exponential (1s, 2s, ...)         | 60s     |
| Progress   | 3           | Linear (500ms)                    | 10s     |
| Assignment | 5           | Exponential                       | 60s     |

## Dead Letter Queue (DLQ)

Failed messages setelah max retries:

```sql
-- DLQ table
CREATE TABLE dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT NOT NULL,
    payload JSONB NOT NULL,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id UUID REFERENCES tenants(id)
);
```

DLQ processing:

1. Manual review of failed messages
2. Replay capability after fixing issues
3. Auto-cleanup after 30 days

## Implementation Steps

### Phase 1 (Week 11-22)

1. Define idempotency key format for all operations
2. Implement basic retry with backoff in frontend
3. Add offline detection in PWA

### Phase 2 (Week 23-36)

1. Server-side idempotency checking
2. DLQ table and processing
3. Add exactly-once for quiz submissions

### Phase 3-6 (Week 37-72)

1. Full queue monitoring
2. Automatic DLQ replay
3. Performance optimization

## Frontend Integration

PWA service worker handles offline queue:

```javascript
// Service worker background sync
self.addEventListener('sync', (event) => {
  if (event.tag.startsWith('queue:')) {
    event.waitUntil(processQueue(event.tag))
  }
})

async function processQueue(tag) {
  const queue = await getQueue(tag)
  for (const item of queue) {
    await sendWithRetry(item)
  }
}
```

## Exit Criteria

- [ ] Idempotency keys implemented for all offline operations
- [ ] At-least-once delivery for xAPI/assignments
- [ ] Exactly-once delivery for quiz submissions
- [ ] Last-write-wins for progress events
- [ ] DLQ functional for failed messages
- [ ] Retry policy tested end-to-end

## Referensi

- Related: [07_WORKER_QUEUE_RUNTIME.md](./07_WORKER_QUEUE_RUNTIME.md) untuk worker implementation
- Related: [08_FRONTEND_RUNTIME_COMPATIBILITY.md](./08_FRONTEND_RUNTIME_COMPATIBILITY.md) untuk PWA integration
- Contract 4 di main plan document
