# CC5: Graceful Degradation

**Started:** Phase 3  
**Duration:** Phase 3-6  
**Owner:** Backend/Frontend

## Tujuan

Memastikan aplikasi tetap functional ketika VIL server atau service tertentu mengalami kegagalan.

## Strategi Degradation

### Circuit Breaker Pattern (Rust)

AI endpoints (essay grading, AI tutor, content generation) adalah kandidat utama untuk circuit breaker.

**File:** `vil-backend/src/infra/circuit_breaker.rs`

```rust
use std::sync::atomic::{AtomicU32, Ordering};
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

/// Circuit breaker states.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum CircuitState {
    Closed,   // Normal — requests flow through
    Open,     // Failing — reject immediately
    HalfOpen, // Testing — allow one probe request
}

/// Thread-safe circuit breaker.
/// Shared across request handlers via Axum `State`.
pub struct CircuitBreaker {
    state: RwLock<CircuitState>,
    failure_count: AtomicU32,
    success_count: AtomicU32,
    threshold: u32,
    half_open_max: u32,
    timeout: Duration,
    last_failure: RwLock<Option<Instant>>,
    name: String,
}

impl CircuitBreaker {
    /// Create a new circuit breaker.
    ///
    /// * `name` — label for metrics (e.g. "ai-essay-grading")
    /// * `threshold` — consecutive failures before opening
    /// * `timeout` — how long to stay open before probing
    /// * `half_open_max` — successes needed in HalfOpen to close
    pub fn new(name: &str, threshold: u32, timeout: Duration, half_open_max: u32) -> Self {
        Self {
            state: RwLock::new(CircuitState::Closed),
            failure_count: AtomicU32::new(0),
            success_count: AtomicU32::new(0),
            threshold,
            half_open_max,
            timeout,
            last_failure: RwLock::new(None),
            name: name.to_string(),
        }
    }

    /// Execute `f` through the circuit breaker.
    /// Returns `Err(AppError::CircuitOpen)` when the circuit is open.
    pub async fn call<F, Fut, T>(&self, f: F) -> Result<T, AppError>
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<T, AppError>>,
    {
        // 1. Check state
        let current = *self.state.read().await;
        match current {
            CircuitState::Open => {
                let last = self.last_failure.read().await;
                if last.map_or(false, |t| t.elapsed() >= self.timeout) {
                    // Transition to HalfOpen — allow one probe
                    *self.state.write().await = CircuitState::HalfOpen;
                    self.success_count.store(0, Ordering::SeqCst);
                    tracing::info!(circuit = %self.name, "circuit half-open, probing");
                } else {
                    tracing::warn!(circuit = %self.name, "circuit open, rejecting");
                    metrics::counter!("circuit_breaker_rejected_total", "circuit" => self.name.clone()).increment(1);
                    return Err(AppError::CircuitOpen(self.name.clone()));
                }
            }
            _ => {}
        }

        // 2. Execute
        match f().await {
            Ok(val) => {
                self.on_success().await;
                Ok(val)
            }
            Err(e) => {
                self.on_failure().await;
                Err(e)
            }
        }
    }

    async fn on_success(&self) {
        self.failure_count.store(0, Ordering::SeqCst);
        let prev = self.success_count.fetch_add(1, Ordering::SeqCst);
        let state = *self.state.read().await;
        if state == CircuitState::HalfOpen && prev + 1 >= self.half_open_max {
            *self.state.write().await = CircuitState::Closed;
            tracing::info!(circuit = %self.name, "circuit closed (recovered)");
            metrics::counter!("circuit_breaker_state_total", "circuit" => self.name.clone(), "to" => "closed").increment(1);
        }
    }

    async fn on_failure(&self) {
        let prev = self.failure_count.fetch_add(1, Ordering::SeqCst);
        *self.last_failure.write().await = Some(Instant::now());
        let state = *self.state.read().await;

        if state == CircuitState::HalfOpen {
            // Single failure in HalfOpen re-opens
            *self.state.write().await = CircuitState::Open;
            tracing::warn!(circuit = %self.name, "circuit re-opened from half-open");
        } else if prev + 1 >= self.threshold {
            *self.state.write().await = CircuitState::Open;
            tracing::error!(circuit = %self.name, failures = prev + 1, "circuit opened");
            metrics::counter!("circuit_breaker_state_total", "circuit" => self.name.clone(), "to" => "open").increment(1);
        }
    }

    /// Current state (for health endpoint).
    pub async fn current_state(&self) -> CircuitState {
        *self.state.read().await
    }
}
```

### Registering Circuit Breakers in Axum App State

**File:** `vil-backend/src/app_state.rs`

```rust
use std::sync::Arc;
use std::time::Duration;
use crate::infra::circuit_breaker::CircuitBreaker;

pub struct AppState {
    pub db: sqlx::PgPool,
    pub cb_ai_essay: Arc<CircuitBreaker>,
    pub cb_ai_tutor: Arc<CircuitBreaker>,
    pub cb_ai_content: Arc<CircuitBreaker>,
}

impl AppState {
    pub fn new(db: sqlx::PgPool) -> Self {
        Self {
            db,
            cb_ai_essay: Arc::new(CircuitBreaker::new(
                "ai-essay-grading",
                5,                           // open after 5 consecutive failures
                Duration::from_secs(30),     // probe after 30 s
                3,                           // 3 successes to close
            )),
            cb_ai_tutor: Arc::new(CircuitBreaker::new(
                "ai-tutor",
                5,
                Duration::from_secs(30),
                3,
            )),
            cb_ai_content: Arc::new(CircuitBreaker::new(
                "ai-content-gen",
                5,
                Duration::from_secs(60),
                3,
            )),
        }
    }
}
```

### Fallback Handler Pattern

Each AI endpoint wraps its call with the circuit breaker and returns a typed fallback:

**File:** `vil-backend/src/handlers/ai_essay.rs`

```rust
use axum::{extract::State, Json};
use crate::app_state::AppState;
use std::sync::Arc;

pub async fn grade_essay(
    State(state): State<Arc<AppState>>,
    Json(req): Json<GradeEssayRequest>,
) -> Result<Json<GradeEssayResponse>, AppError> {
    // Attempt via circuit breaker
    let result = state.cb_ai_essay.call(|| async {
        call_groq_grading_api(&req).await
    }).await;

    match result {
        Ok(resp) => Ok(Json(resp)),
        Err(AppError::CircuitOpen(_)) => {
            // Return structured fallback — frontend shows toast
            Ok(Json(GradeEssayResponse {
                status: "unavailable".into(),
                message: "Penilaian AI sedang tidak tersedia. Silakan coba lagi nanti.".into(),
                score: None,
                feedback: None,
            }))
        }
        Err(e) => Err(e),
    }
}
```

### Fallback Behavior Table

| Service            | Fallback Response                                 | Frontend Behavior                          |
| ------------------ | ------------------------------------------------- | ------------------------------------------ |
| AI Essay Grading   | `{ status: "unavailable", message: "..." }`       | Toast: "Penilaian AI sedang tidak tersedia" |
| AI Tutor           | `{ status: "unavailable", fallback_url: "/faq" }` | Redirect to FAQ page                       |
| Content Generation | `{ status: "unavailable" }`                       | Show template library instead              |
| VIL Server Down    | N/A (frontend detects)                            | Show cached data + "Sedang maintenance"    |

### Frontend Error Handling

**File:** `src/utils/apiErrorHandler.ts`

```typescript
import { toast } from 'sonner';

interface ApiError {
  status: number;
  code?: string;
  message?: string;
}

/**
 * Global API error handler.
 * Called from React Query's `onError` or Axios interceptor.
 */
export function handleApiError(error: ApiError): void {
  switch (error.status) {
    case 503:
      toast.warning('Layanan sedang maintenance. Mencoba ulang...');
      break;
    case 429:
      toast.warning('Terlalu banyak permintaan. Tunggu sebentar.');
      break;
    case 0:
      // Network error — no response received
      toast.error('Koneksi internet bermasalah.');
      break;
    default:
      if (error.status >= 500) {
        toast.error('Terjadi kesalahan server. Silakan coba lagi.');
      }
  }
}

/**
 * React Query default error handler.
 * Add to QueryClient defaultOptions.mutations.onError.
 */
export function reactQueryErrorHandler(error: unknown): void {
  if (error && typeof error === 'object' && 'status' in error) {
    handleApiError(error as ApiError);
  } else {
    toast.error('Terjadi kesalahan. Silakan coba lagi.');
  }
}
```

### Health Check Degradation Endpoint

**File:** `vil-backend/src/handlers/health.rs`

```rust
use axum::{extract::State, Json};
use serde::Serialize;
use std::sync::Arc;
use crate::app_state::AppState;
use crate::infra::circuit_breaker::CircuitState;

#[derive(Serialize)]
pub struct HealthResponse {
    status: &'static str,         // "healthy" | "degraded" | "unhealthy"
    services: Vec<ServiceHealth>,
}

#[derive(Serialize)]
pub struct ServiceHealth {
    name: String,
    status: &'static str,         // "up" | "degraded" | "down"
}

pub async fn health_check(
    State(state): State<Arc<AppState>>,
) -> Json<HealthResponse> {
    let services = vec![
        service_status("ai-essay-grading", state.cb_ai_essay.current_state().await),
        service_status("ai-tutor", state.cb_ai_tutor.current_state().await),
        service_status("ai-content-gen", state.cb_ai_content.current_state().await),
    ];

    let overall = if services.iter().all(|s| s.status == "up") {
        "healthy"
    } else if services.iter().any(|s| s.status == "down") {
        "degraded"
    } else {
        "degraded"
    };

    Json(HealthResponse { status: overall, services })
}

fn service_status(name: &str, state: CircuitState) -> ServiceHealth {
    ServiceHealth {
        name: name.to_string(),
        status: match state {
            CircuitState::Closed => "up",
            CircuitState::HalfOpen => "degraded",
            CircuitState::Open => "down",
        },
    }
}
```

## Implementation Steps

### Phase 3 (Week 37-44)

1. Create `circuit_breaker.rs` with the code above
2. Add `CircuitBreaker` instances to `AppState` for each AI endpoint
3. Wrap AI handler functions with circuit breaker calls
4. Implement fallback JSON responses per the table above
5. Add `/health` endpoint that reports circuit breaker states

### Phase 4-5 (Week 45-58)

1. Add `handleApiError` to frontend React Query defaults
2. Implement offline detection (`navigator.onLine` + fetch probe)
3. Add retry logic with exponential backoff in React Query config
4. Wire toast notifications for degraded states

### Phase 6 (Week 59-72)

1. Chaos testing: kill AI upstream, verify circuit opens within threshold
2. Measure user-visible impact during degradation (track fallback response rate)
3. Tune thresholds based on production traffic patterns

## Verification Commands

```bash
# 1. Compile the circuit breaker module
cd vil-backend && cargo check 2>&1 | head -20

# 2. Run unit tests for circuit breaker
cargo test circuit_breaker -- --nocapture

# 3. Verify health endpoint returns correct shape
curl -s http://localhost:3001/health | jq .
# Expected: { "status": "healthy", "services": [...] }

# 4. Simulate circuit open by killing AI upstream, then verify
curl -s http://localhost:3001/health | jq '.services[] | select(.status != "up")'
# Should list the downed service

# 5. Verify fallback response from AI essay endpoint when circuit is open
curl -s -X POST http://localhost:3001/api/ai/grade-essay \
  -H "Content-Type: application/json" \
  -d '{"essay_id": "test"}' | jq .status
# Expected: "unavailable"

# 6. Check Prometheus metrics for circuit breaker events
curl -s http://localhost:3001/metrics | grep circuit_breaker
```

## Monitoring & Alerts

- Track circuit breaker state transitions via `circuit_breaker_state_total` metric
- Track rejected requests via `circuit_breaker_rejected_total` metric
- Alert when any circuit stays open for > 5 minutes
- Log every state transition at `info` level for audit trail

## Exit Criteria

- [ ] Circuit breaker compiles and passes unit tests
- [ ] Each AI endpoint wrapped with circuit breaker + fallback response
- [ ] `/health` endpoint reports per-service status
- [ ] Frontend `handleApiError` wired into React Query defaults
- [ ] Chaos test: killing AI upstream triggers circuit open within configured threshold
- [ ] Fallback responses return correct Bahasa Indonesia messages

## Referensi

- Related: [04_RATE_LIMITING.md](./04_RATE_LIMITING.md) untuk rate limiting integration
- Related: [01_MONITORING_OBSERVABILITY.md](./01_MONITORING_OBSERVABILITY.md) untuk monitoring
- Related: [06_OFFLINE_QUEUE_SEMANTICS.md](./06_OFFLINE_QUEUE_SEMANTICS.md) untuk offline handling
