# CC4: Rate Limiting

**Started:** Phase 2  
**Duration:** Phase 2-6  
**Owner:** Backend/Security

## Tujuan

Implement per-tenant dan per-user rate limiting untuk melindungi VIL backend dari abuse dan memastikan fair resource allocation.

## Prerequisites

```bash
# Verify Rust toolchain
rustc --version   # expect 1.77+
cargo --version
```

## Cargo.toml Dependencies

Add these to `edusync-api/Cargo.toml`:

```toml
[dependencies]
axum = "0.7"
tower = "0.4"
tower-governor = "0.4"
governor = "0.6"
tokio = { version = "1", features = ["full"] }
uuid = { version = "1", features = ["v4"] }
tracing = "0.1"
```

## Step 1: Global Rate Limiting with tower-governor

Create `edusync-api/src/rate_limit.rs`:

```rust
use axum::Router;
use tower_governor::{governor::GovernorConfigBuilder, GovernorLayer};

/// Apply global rate limiting to the router.
/// Default: 10 requests/second with burst of 20.
pub fn apply_global_rate_limit(app: Router) -> Router {
    let governor_conf = GovernorConfigBuilder::default()
        .per_second(10)
        .burst_size(20)
        .finish()
        .unwrap();

    app.layer(GovernorLayer {
        config: std::sync::Arc::new(governor_conf),
    })
}
```

## Step 2: Per-Tenant Rate Limiting Middleware

Create `edusync-api/src/rate_limit_tenant.rs`:

```rust
use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};
use governor::{Quota, RateLimiter};
use std::collections::HashMap;
use std::num::NonZeroU32;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

/// Per-tenant rate limiter using an in-memory HashMap of governors.
/// For production with multiple instances, replace with Redis-backed storage.
pub struct TenantRateLimiter {
    limiters: RwLock<HashMap<Uuid, Arc<RateLimiter<governor::state::NotKeyed, governor::state::InMemoryState, governor::clock::DefaultClock>>>>,
    requests_per_minute: NonZeroU32,
    burst_size: NonZeroU32,
}

impl TenantRateLimiter {
    pub fn new(requests_per_minute: u32, burst_size: u32) -> Self {
        Self {
            limiters: RwLock::new(HashMap::new()),
            requests_per_minute: NonZeroU32::new(requests_per_minute).unwrap(),
            burst_size: NonZeroU32::new(burst_size).unwrap(),
        }
    }

    pub async fn check(&self, tenant_id: &Uuid) -> bool {
        // Get or create limiter for this tenant
        let limiter = {
            let read = self.limiters.read().await;
            if let Some(l) = read.get(tenant_id) {
                l.clone()
            } else {
                drop(read);
                let mut write = self.limiters.write().await;
                let quota = Quota::per_minute(self.requests_per_minute)
                    .allow_burst(self.burst_size);
                let limiter = Arc::new(RateLimiter::direct(quota));
                write.insert(*tenant_id, limiter.clone());
                limiter
            }
        };

        limiter.check().is_ok()
    }
}

/// Axum middleware that extracts tenant_id from request extensions and checks rate limit.
pub async fn tenant_rate_limit_middleware(
    request: Request,
    next: Next,
) -> Response {
    // Extract tenant_id from request extensions (set by auth middleware)
    let tenant_id = request
        .extensions()
        .get::<Uuid>()
        .copied();

    if let Some(tenant_id) = tenant_id {
        let limiter = request
            .extensions()
            .get::<Arc<TenantRateLimiter>>()
            .cloned();

        if let Some(limiter) = limiter {
            if !limiter.check(&tenant_id).await {
                tracing::warn!(tenant_id = %tenant_id, "Tenant rate limit exceeded");
                return (
                    StatusCode::TOO_MANY_REQUESTS,
                    [("Retry-After", "60")],
                    "Rate limit exceeded for tenant",
                ).into_response();
            }
        }
    }

    next.run(request).await
}
```

## Step 3: Per-Endpoint Special Limits

Create `edusync-api/src/rate_limit_endpoints.rs`:

```rust
use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};
use governor::{Quota, RateLimiter};
use std::num::NonZeroU32;
use std::sync::Arc;

/// Create a rate limiter for specific sensitive endpoints.
pub fn file_upload_limiter() -> Arc<RateLimiter<governor::state::NotKeyed, governor::state::InMemoryState, governor::clock::DefaultClock>> {
    let quota = Quota::per_minute(NonZeroU32::new(10).unwrap())
        .allow_burst(NonZeroU32::new(5).unwrap());
    Arc::new(RateLimiter::direct(quota))
}

pub fn ai_endpoint_limiter() -> Arc<RateLimiter<governor::state::NotKeyed, governor::state::InMemoryState, governor::clock::DefaultClock>> {
    let quota = Quota::per_minute(NonZeroU32::new(5).unwrap())
        .allow_burst(NonZeroU32::new(3).unwrap());
    Arc::new(RateLimiter::direct(quota))
}

pub fn auth_login_limiter() -> Arc<RateLimiter<governor::state::NotKeyed, governor::state::InMemoryState, governor::clock::DefaultClock>> {
    let quota = Quota::per_minute(NonZeroU32::new(10).unwrap())
        .allow_burst(NonZeroU32::new(5).unwrap());
    Arc::new(RateLimiter::direct(quota))
}

pub fn quiz_submit_limiter() -> Arc<RateLimiter<governor::state::NotKeyed, governor::state::InMemoryState, governor::clock::DefaultClock>> {
    let quota = Quota::per_minute(NonZeroU32::new(30).unwrap())
        .allow_burst(NonZeroU32::new(10).unwrap());
    Arc::new(RateLimiter::direct(quota))
}

/// Generic middleware factory for endpoint-specific rate limiting.
pub fn make_endpoint_rate_limit_middleware(
    limiter: Arc<RateLimiter<governor::state::NotKeyed, governor::state::InMemoryState, governor::clock::DefaultClock>>,
) -> impl Fn(Request, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = Response> + Send>> + Clone + Send {
    move |request: Request, next: Next| {
        let limiter = limiter.clone();
        Box::pin(async move {
            if limiter.check().is_err() {
                return (
                    StatusCode::TOO_MANY_REQUESTS,
                    [("Retry-After", "60")],
                    "Rate limit exceeded",
                ).into_response();
            }
            next.run(request).await
        })
    }
}
```

## Step 4: Wire into Router

```rust
// edusync-api/src/main.rs
mod rate_limit;
mod rate_limit_tenant;
mod rate_limit_endpoints;

use axum::{middleware, Router, routing::{get, post}};
use rate_limit::apply_global_rate_limit;
use rate_limit_tenant::{TenantRateLimiter, tenant_rate_limit_middleware};
use rate_limit_endpoints::{ai_endpoint_limiter, auth_login_limiter, file_upload_limiter, quiz_submit_limiter};
use std::sync::Arc;

#[tokio::main]
async fn main() {
    // Create tenant rate limiter (60 req/min, burst 20)
    let tenant_limiter = Arc::new(TenantRateLimiter::new(60, 20));

    // Build router with endpoint-specific limits
    let app = Router::new()
        .route("/health", get(|| async { "ok" }))
        // AI endpoints with strict limit
        .route("/api/ai/tutor", post(|| async { "ai tutor" }))
        .route_layer(middleware::from_fn(move |req, next| {
            let limiter = ai_endpoint_limiter();
            async move {
                if limiter.check().is_err() {
                    return (axum::http::StatusCode::TOO_MANY_REQUESTS, "AI rate limit exceeded").into_response();
                }
                next.run(req).await
            }
        }))
        // Global tenant rate limiting
        .layer(middleware::from_fn(tenant_rate_limit_middleware));

    // Apply global rate limit (outermost layer)
    let app = apply_global_rate_limit(app);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

## Special Limits

| Operation    | Limit            | Rationale               |
| ------------ | ---------------- | ----------------------- |
| File Upload  | 10/min, burst 5  | Prevent storage abuse   |
| AI Endpoints | 5/min, burst 3   | Control AI costs        |
| Quiz Submit  | 30/min, burst 10 | Prevent cheating        |
| Auth Login   | 10/min, burst 5  | Prevent brute force     |
| Bulk Import  | 5/hour           | Control processing load |

## Database Table for Tenant Overrides

```sql
-- Migration: add_rate_limit_overrides
CREATE TABLE rate_limit_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    endpoint_pattern TEXT NOT NULL,
    requests_per_minute INTEGER NOT NULL,
    burst_size INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE rate_limit_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rate limit overrides"
    ON rate_limit_overrides
    USING (tenant_id = (SELECT get_my_tenant_id()));
```

## Replace check-rate-limit Edge Function

The existing Supabase Edge Function `check-rate-limit` is replaced by the VIL-native middleware above. Migration steps:

1. Phase 2: Deploy VIL rate limiter middleware alongside Edge Function
2. Phase 3: Feature flag `VIL_RATE_LIMIT=true` to switch traffic
3. Phase 4: Remove Edge Function after full cutover

## Monitoring

Metrics to track (integrate with `metrics_endpoint.rs` from CC1):

```rust
use metrics::counter;

// In rate limit middleware, when limit is exceeded:
counter!("rate_limit_exceeded_total", "tenant_id" => tenant_id.to_string(), "endpoint" => path.to_string()).increment(1);
```

## Verification

```bash
# 1. Build and start the API
cd edusync-api && cargo build
cargo run &
sleep 2

# 2. Verify normal requests succeed
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health
# Expected: 200

# 3. Test rate limiting by sending burst of requests
for i in $(seq 1 30); do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)
    echo "Request $i: $STATUS"
done
# Expected: first ~20 return 200, then 429 (Too Many Requests)

# 4. Verify Retry-After header on rate-limited response
curl -s -D - http://localhost:8080/health 2>/dev/null | grep -i retry-after
# Expected: Retry-After: 60 (when rate limited)

# 5. Verify rate limit metrics (if metrics endpoint is set up from CC1)
curl -s http://localhost:8080/metrics | grep rate_limit
# Expected: rate_limit_exceeded_total lines (after triggering limits)

# 6. Cleanup
kill %1
```

## Implementation Steps

### Phase 2 (Week 23-28)

1. Add Cargo.toml dependencies (copy from above)
2. Create `rate_limit.rs` with global tower-governor middleware
3. Create `rate_limit_tenant.rs` with per-tenant middleware
4. Wire into router in `main.rs`
5. Verify with the commands in the Verification section

### Phase 3 (Week 37-44)

1. Create `rate_limit_endpoints.rs` with per-endpoint limits
2. Apply special limits to AI, upload, quiz, auth routes
3. Add rate_limit_overrides table via sqlx migration
4. Replace Supabase `check-rate-limit` Edge Function

### Phase 4-6 (Week 45-72)

1. Load tenant-specific overrides from database
2. Implement circuit breaker pattern
3. Add adaptive rate limiting based on system load
4. Full monitoring and alerting

## Exit Criteria

- [ ] `cargo build` succeeds with rate limiting dependencies
- [ ] Global rate limit returns 429 after burst is exceeded
- [ ] Per-tenant rate limiting functional
- [ ] Special endpoint limits applied to AI/upload/quiz/auth routes
- [ ] `check-rate-limit` Edge Function replaced
- [ ] Rate limit metrics visible in Prometheus

## Referensi

- Related: [01_MONITORING_OBSERVABILITY.md](./01_MONITORING_OBSERVABILITY.md) untuk metrics
- Related: [05_GRACEFUL_DEGRADATION.md](./05_GRACEFUL_DEGRADATION.md) untuk circuit breaker
