# CC5: Graceful Degradation

**Started:** Phase 3  
**Duration:** Phase 3-6  
**Owner:** Backend/Frontend

## Tujuan

Memastikan aplikasi tetap functional ketika VIL server atau service tertentu mengalami kegagalan.

## Strategi Degradation

### Circuit Breaker untuk AI Endpoints

AI endpoints (essay grading, AI tutor, content generation) adalah kandidat utama untuk circuit breaker:

```rust
// Circuit breaker states
enum CircuitState {
    Closed,      // Normal operation
    Open,        // Failing, reject requests
    HalfOpen,   // Testing recovery
}

struct CircuitBreaker {
    state: CircuitState,
    failures: u32,
    last_failure: DateTime,
    threshold: u32,
    timeout: Duration,
}

impl CircuitBreaker {
    async fn call(&mut self, operation: impl Future) -> Result<Response, Error> {
        match self.state {
            CircuitState::Open => {
                if self.last_failure + self.timeout < now() {
                    self.state = CircuitState::HalfOpen;
                } else {
                    return Err(Error::CircuitOpen);
                }
            }
            _ => {}
        }

        match operation.await {
            Ok(resp) => {
                self.on_success();
                Ok(resp)
            }
            Err(e) => {
                self.on_failure();
                Err(e)
            }
        }
    }
}
```

### Fallback Behavior

| Service            | Fallback                                       | User Feedback              |
| ------------------ | ---------------------------------------------- | -------------------------- |
| AI Essay Grading   | Return "Grading unavailable, please try later" | Toast notification         |
| AI Tutor           | Show FAQ instead                               | "AI tutor sedang sibuk"    |
| Content Generation | Show template library                          | "Generator tidak tersedia" |
| VIL Server Down    | Show cached data if available                  | "Sedang maintenance"       |

### Frontend Error Handling

Global error handler di frontend:

```typescript
// Error boundary for API errors
function handleApiError(error: ApiError) {
  if (error.status === 503) {
    showToast('Layanan sedang maintenance. Mencoba ulang...', 'warning')
    retryWithBackoff()
  } else if (error.status === 429) {
    showToast('Terlalu banyak permintaan. Tunggu sebentar.', 'warning')
  } else if (error.status === 0) {
    showToast('Koneksi internet bermasalah.', 'error')
  }
}
```

## Implementation Steps

### Phase 3 (Week 37-44)

1. Implement circuit breaker for AI endpoints
2. Add fallback responses for each AI service
3. Create error handling middleware in VIL

### Phase 4-5 (Week 45-58)

1. Add global error handler in frontend
2. Implement offline detection and cached data fallback
3. Add retry logic with exponential backoff

### Phase 6 (Week 59-72)

1. Full degradation testing
2. Measure user impact during degradation
3. Optimize fallback paths based on usage patterns

## Monitoring & Alerts

- Track circuit breaker state transitions
- Alert when circuit opens for > 5 minutes
- Log degradation events for analysis

## Exit Criteria

- [ ] Circuit breaker functional for AI endpoints
- [ ] Fallback responses tested for each service
- [ ] Frontend error handling catches all API errors
- [ ] Retry logic implemented with backoff
- [ ] Degradation scenarios documented and tested

## Referensi

- Related: [04_RATE_LIMITING.md](./04_RATE_LIMITING.md) untuk rate limiting integration
- Related: [01_MONITORING_OBSERVABILITY.md](./01_MONITORING_OBSERVABILITY.md) untuk monitoring
- Related: [06_OFFLINE_QUEUE_SEMANTICS.md](./06_OFFLINE_QUEUE_SEMANTICS.md) untuk offline handling
