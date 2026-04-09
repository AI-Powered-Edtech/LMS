# CC4: Rate Limiting

**Started:** Phase 2  
**Duration:** Phase 2-6  
**Owner:** Backend/Security

## Tujuan

Implement per-tenant dan per-user rate limiting untuk melindungi VIL backend dari abuse dan memastikan fair resource allocation.

## Arsitektur Rate Limiting

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Client    │────▶│  Rate Limiter   │────▶│   Backend   │
│             │     │   (Middleware)  │     │   Handler   │
└─────────────┘     └─────────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────────┐
                    │   Redis/PG      │
                    │  Rate Limiter   │
                    │     Store       │
                    └─────────────────┘
```

## Implementasi

### Per-Tenant Rate Limits

```rust
// Rate limit configuration per tenant
struct TenantRateLimit {
    tenant_id: Uuid,
    requests_per_minute: u32,
    requests_per_hour: u32,
    burst_limit: u32,
}

// Default limits
const DEFAULT_TENANT_LIMITS: TenantRateLimit = TenantRateLimit {
    tenant_id: uuid!("00000000-0000-0000-0000-000000000000"),
    requests_per_minute: 60,
    requests_per_hour: 1000,
    burst_limit: 10,
};
```

### Per-User Rate Limits

```rust
// Within tenant, per-user limits
struct UserRateLimit {
    user_id: Uuid,
    requests_per_minute: u32,
    requests_per_hour: u32,
}
```

### Special Limits

| Operation    | Limit            | Rationale               |
| ------------ | ---------------- | ----------------------- |
| File Upload  | 10/min, 100/hour | Prevent storage abuse   |
| AI Endpoints | 5/min, 50/hour   | Control AI costs        |
| Quiz Submit  | 30/min           | Prevent cheating        |
| Auth Login   | 10/min           | Prevent brute force     |
| Bulk Import  | 5/hour           | Control processing load |

## Replace check-rate-limit Edge Function

Existing Supabase Edge Function `check-rate-limit` akan di-replace dengan VIL-native implementation:

```rust
// VIL rate limiter middleware
async fn rate_limit_middleware(
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let user = require_auth(&req)?;
    let tenant_id = user.tenant_id;
    let user_id = user.id;

    // Check rate limits
    let rate_limiter = get_rate_limiter();

    if !rate_limiter.check(&tenant_id, &user_id).await {
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }

    next.run(req).await
}
```

## Configuration

### Tenant-Specific Overrides

```sql
-- Database table for custom rate limits
CREATE TABLE rate_limit_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    endpoint_pattern TEXT NOT NULL,
    requests_per_minute INTEGER NOT NULL,
    requests_per_hour INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);
```

### Monitoring

Metrics to track:

- `rate_limit_exceeded_total{tenant_id, endpoint, reason}`
- `rate_limit_current{tenant_id, user_id}`

## Implementation Steps

### Phase 2 (Week 23-28)

1. Implement basic rate limiter middleware
2. Add per-tenant default limits
3. Add Redis storage for counters

### Phase 3 (Week 37-44)

1. Add per-user limits
2. Implement special limits for uploads/AI/quiz
3. Add admin UI for viewing rate limit stats
4. Replace Supabase check-rate-limit Edge Function

### Phase 4-6 (Week 45-72)

1. Add tenant-specific overrides
2. Implement circuit breaker pattern
3. Add adaptive rate limiting based on system load
4. Full monitoring and alerting

## Integration dengan Existing Features

- Continue using Supabase Edge Function for Phase 0-2
- VIL rate limiter active by Phase 3
- Feature flag to toggle between implementations

## Exit Criteria

- [ ] Per-tenant rate limiting functional
- [ ] Per-user rate limiting functional
- [ ] Special limits for uploads/AI/quiz implemented
- [ ] check-rate-limit Edge Function replaced
- [ ] Monitoring dashboards showing rate limit stats

## Referensi

- Related: [01_MONITORING_OBSERVABILITY.md](./01_MONITORING_OBSERVABILITY.md) untuk metrics
- Related: [05_GRACEFUL_DEGRADATION.md](./05_GRACEFUL_DEGRADATION.md) untuk circuit breaker
