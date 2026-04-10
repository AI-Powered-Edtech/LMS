# Spec 3: VIL Runtime, Worker & CI Operations

<aside>
⚙️

**WAJIB BACA sebelum Phase 1A scaffold dan Phase 2 worker implementation.** Dokumen ini mendefinisikan runtime architecture, worker separation, CI/CD pipeline, dan operational model untuk Rust/VIL stack. Tanpa ini, risiko request timeout, pool starvation, retry chaos, dan build pipeline bottleneck.

</aside>

---

# 1. Runtime Process Classification

Setiap workload di EduSync harus masuk SATU dari 4 kategori berikut. Tidak boleh ada ambiguity.

## 1.1 Synchronous HTTP Handlers

**Karakteristik:** User-facing, <500ms P99, tenant-scoped, rate-limited.

| Endpoint Group                  | Max Latency     | DB Pool     | Rate Limit       |
| ------------------------------- | --------------- | ----------- | ---------------- |
| Auth (login, register, refresh) | 200ms           | `default`   | 10/min per IP    |
| Course CRUD                     | 300ms           | `default`   | 100/min per user |
| Quiz fetch/load                 | 200ms           | `default`   | 100/min per user |
| Quiz submit                     | 500ms           | `default`   | 5/min per user   |
| File upload presigned URL       | 100ms           | `default`   | 20/min per user  |
| Analytics RPC                   | 2000ms          | `analytics` | 30/min per user  |
| AI tutor chat                   | 30s (streaming) | `default`   | 50/hr per user   |
| AI grade essay                  | 30s (streaming) | `default`   | 50/hr per user   |

**VIL Config:**

```rust
let api = ServiceProcess::new("api")
    .visibility(Visibility::Public)
    .prefix("/api/v1");
```

## 1.2 Internal Async Workers

**Karakteristik:** Triggered via Tri-Lane, no HTTP exposure, own retry policy, DLQ on failure.

| Worker                    | Trigger                | Max Duration | Retry Policy                | DLQ                                          |
| ------------------------- | ---------------------- | ------------ | --------------------------- | -------------------------------------------- |
| Quiz grading              | `quiz.submitted` event | 2 min        | 3x exponential (30s→2m→10m) | `quiz_submission_queue.status='dead_letter'` |
| Bulk import               | Admin action           | 30 min       | Per-chunk, 3x               | `dead_letter_jobs` table                     |
| AI content generation     | Teacher action         | 60s          | 2x (10s→30s)                | Log + skip                                   |
| Progress event processing | Batch                  | 5 min        | 3x (5s→15s→45s)             | Drop after max                               |
| xAPI flush                | Timer                  | 30s          | 3x                          | Drop after max                               |
| Notification fanout       | Event                  | 10s          | 2x                          | Log + skip                                   |

**VIL Config:**

```rust
let grader = ServiceProcess::new("grader")
    .visibility(Visibility::Internal);  // Only reachable via Tri-Lane

let importer = ServiceProcess::new("importer")
    .visibility(Visibility::Internal);
```

## 1.3 Scheduled Jobs (Cron)

**Karakteristik:** Time-triggered, no user context, may be long-running.

| Job                  | Schedule                    | Max Duration | Failure Behavior        |
| -------------------- | --------------------------- | ------------ | ----------------------- |
| Email digest         | Daily 17:00 WIB (10:00 UTC) | 10 min       | Log + retry next day    |
| Parent digest        | Daily 17:00 WIB             | 10 min       | Log + retry next day    |
| Analytics MV refresh | Every 15 min                | 5 min        | Skip + retry next cycle |
| Cleanup expired data | Daily 02:00 WIB             | 5 min        | Log + retry next day    |
| AI quota reset       | Monthly 1st 00:00 WIB       | 1 min        | Retry in 1 hour         |
| xAPI queue flush     | Every 30 seconds            | 10s          | Skip + retry next cycle |

**VIL Config:**

```rust
use vil_trigger_cron::CronScheduler;
let scheduler = CronScheduler::new();
// Heavy jobs:
scheduler.add("0 10 * * *", send_email_digests);      // 10:00 UTC = 17:00 WIB
scheduler.add("*/15 * * * *", refresh_analytics_mv);
// Lightweight jobs (use Scheduler for in-process):
use vil_server::scheduler::Scheduler;
scheduler.add("*/30 * * * * *", flush_xapi_queue);
```

## 1.4 Realtime Event Fanout

**Karakteristik:** Triggered by DB change or user action, broadcast via WebSocket.

| Event Source                 | Channel                   | Delivery        | Failure               |
| ---------------------------- | ------------------------- | --------------- | --------------------- |
| `pg_notify('notifications')` | `notifications:{user_id}` | WsHub broadcast | Client reconnect      |
| `pg_notify('discussions')`   | `discussion:{thread_id}`  | WsHub broadcast | Client reconnect      |
| Builder content update       | `builder:{course_id}`     | WsHub broadcast | Buffered on reconnect |
| Builder presence             | `builder:{course_id}`     | WsHub presence  | Ephemeral             |
| Parent message               | `messaging:{thread_id}`   | WsHub broadcast | Client reconnect      |

---

# 2. Tri-Lane Mesh Mapping

VIL Tri-Lane separates inter-service communication into 3 lanes with different semantics:

| Lane        | Semantics                           | EduSync Usage                                         |
| ----------- | ----------------------------------- | ----------------------------------------------------- |
| **Trigger** | Fire-and-forget, initiates work     | Quiz submit → grading, lesson complete → XP award     |
| **Data**    | Request-response, carries payload   | Grading results back to quiz service, import progress |
| **Control** | Backpressure-aware, rate-controlled | Notification fanout, analytics refresh signals        |

```rust
let mesh = VxMeshConfig::new()
    // Quiz grading pipeline
    .route("api", "grader", VxLane::Trigger)     // Submit → start grading
    .route("grader", "api", VxLane::Data)         // Results back
    // Notification fanout
    .route("api", "notifier", VxLane::Control)    // Backpressure-aware
    // Bulk import
    .route("api", "importer", VxLane::Trigger)    // Start import
    .route("importer", "api", VxLane::Data);      // Progress updates
```

---

# 3. DB Pool Isolation

Separate pools prevent heavy queries from starving CRUD operations:

| Pool        | Max Connections | Purpose                  | Used By                    |
| ----------- | --------------- | ------------------------ | -------------------------- |
| `default`   | 50              | General CRUD, auth, quiz | HTTP handlers              |
| `analytics` | 20              | Heavy aggregation RPCs   | Analytics RPCs, dashboards |
| `grading`   | 10              | Quiz grading writes      | Grading worker             |
| `cron`      | 5               | Scheduled job queries    | Cron workers               |

```rust
use vil_server::db::MultiPoolManager;
let pools = MultiPoolManager::new()
    .pool("default", PgPoolOptions::new().max_connections(50))
    .pool("analytics", PgPoolOptions::new().max_connections(20))
    .pool("grading", PgPoolOptions::new().max_connections(10))
    .pool("cron", PgPoolOptions::new().max_connections(5));
```

---

# 4. Idempotency & Dedup Rules

| Entity            | Idempotency Key Format                         | Strategy                              | TTL |
| ----------------- | ---------------------------------------------- | ------------------------------------- | --- |
| Quiz submission   | `quiz:{attempt_id}:{user_id}`                  | Exactly-once (immutable after submit) | 24h |
| xAPI statement    | `xapi:{verb}:{objectType}:{objectId}:{userId}` | At-least-once (server dedup)          | 24h |
| Progress event    | `progress:{lesson_id}:{user_id}`               | Last-write-wins                       | N/A |
| Assignment upload | `assignment:{submission_id}`                   | At-least-once (server dedup)          | 24h |
| Notification      | `notif:{type}:{entity_id}:{user_id}`           | At-least-once (dedup by key)          | 1h  |

```rust
use vil_server::auth::idempotency::IdempotencyStore;
let idem = IdempotencyStore::new()
    .ttl(Duration::from_secs(86400))
    .max_entries(10_000);
```

---

# 5. Graceful Shutdown & Drain

**Critical for in-flight quiz submissions and file uploads.**

```rust
use vil_server::lifecycle::RestartCoordinator;

let coordinator = RestartCoordinator::new();

// On SIGTERM:
// 1. Stop accepting NEW connections
coordinator.start_drain();

// 2. Wait for in-flight requests (max 30s)
coordinator.wait_for_drain(Duration::from_secs(30)).await;

// 3. Flush pending workers
flush_xapi_queue(&pools).await;           // Flush xAPI buffer
wait_for_grading_completion(5).await;     // Wait max 5s for active grading

// 4. Close DB pools
pools.close_all().await;

// 5. Exit
```

**Drain priority order:**

1. Quiz submissions (data loss = student work lost)
2. File uploads (resumable, but annoying)
3. xAPI flush (can retry)
4. Notifications (can miss, non-critical)
5. Analytics (can refresh next cycle)

---

# 6. CI/CD Pipeline for Rust/VIL

## 6.1 Build Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Swatinem/rust-cache@v2 # Cache cargo registry + target
        with:
          shared-key: 'edusync-api'
      - run: cargo check --all-targets
      - run: cargo clippy -- -D warnings
      - run: cargo test

  build:
    runs-on: ubuntu-latest
    needs: check
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: Swatinem/rust-cache@v2
      - run: cargo build --release
      - name: Build Docker
        run: docker build -t edusync-api:$ github.sha  .
      - name: Push to registry
        run: docker push registry/edusync-api:$ github.sha
```

## 6.2 Multi-stage Dockerfile

```docker
# Stage 1: Chef (dependency planning)
FROM rust:1.78-slim AS chef
RUN cargo install cargo-chef
WORKDIR /app

# Stage 2: Planner (create recipe)
FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# Stage 3: Builder (cook deps, then build)
FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json  # Cached!
COPY . .
RUN cargo build --release

# Stage 4: Runtime (minimal image)
FROM gcr.io/distroless/cc-debian12
COPY --from=builder /app/target/release/edusync-api /
EXPOSE 8080
CMD ["/edusync-api"]
```

**Build time expectations:**

- Fresh build (no cache): ~15-25 min
- Cached deps (code change only): ~2-5 min
- CI with `cargo-chef`: ~3-8 min typical

## 6.3 Release Profile

```toml
# Cargo.toml
[profile.release]
lto = true          # Link-time optimization
strip = true        # Remove debug symbols
codegen-units = 1   # Better optimization
panic = "abort"     # Smaller binary
```

**Target:** Binary <50MB, Docker image <100MB (distroless).

---

# 7. Observability Correlation

## 7.1 Request Tracing

```
Browser → VIL API → DB/Worker → Response
   |          |          |
   X-Request-ID propagated throughout
   W3C traceparent auto-generated by VIL
```

**Headers:**

- `X-Request-ID`: UUID, generated by frontend or VIL if missing
- `traceparent`: W3C format, auto-generated by `vil_otel`
- Propagated to: async workers, cron jobs, DB queries (via `sqlx` instrumentation)

## 7.2 Error Code Catalog

Map VIL error codes to existing UI toast messages:

| VIL Error             | HTTP Status | Frontend Toast                               |
| --------------------- | ----------- | -------------------------------------------- |
| `invalid_credentials` | 401         | "Email atau password salah"                  |
| `account_locked`      | 429         | "Akun terkunci. Coba lagi dalam 15 menit."   |
| `token_expired`       | 401         | "Sesi Anda telah berakhir"                   |
| `tenant_mismatch`     | 403         | "Anda tidak memiliki akses ke data ini"      |
| `rate_limited`        | 429         | "Terlalu banyak percobaan. Coba lagi nanti." |
| `validation_error`    | 400         | Field-specific errors from `Valid<T>`        |
| `not_found`           | 404         | "Data tidak ditemukan"                       |
| `conflict`            | 409         | "Data sudah ada" / conflict resolution       |
| `internal_error`      | 500         | "Terjadi kesalahan. Coba lagi nanti."        |

## 7.3 VIL Observer Dashboard

Enabled via `.observer(true)` — provides:

- `/_vil/dashboard/` — Live metrics UI
- `/_vil/metrics` — Prometheus scrape endpoint
- `/_vil/api/routes` — All registered routes
- `/_vil/api/health` — Detailed health status

Custom Grafana panels:

- Request rate: VIL vs Supabase proxy (% cutover)
- P99 latency per endpoint group
- Error rate per endpoint
- DB pool utilization per pool
- Worker queue depth + DLQ count
- WebSocket connection count

---

# 8. Staging Parity Checklist

Before any phase goes to production:

- [ ] Staging VIL server runs same binary as production
- [ ] Staging connects to DB read replica (or snapshot)
- [ ] Shadow mode: 10% traffic duplicated to VIL, responses compared
- [ ] All E2E tests pass against staging VIL
- [ ] Load test (k6) passes against staging VIL
- [ ] Error rate in shadow mode < 0.1% mismatch
- [ ] Latency in shadow mode within 2x of Supabase
- [ ] Graceful shutdown tested (kill -TERM during load)
- [ ] Rollback tested (switch back to Supabase within 1 minute)

---

# 9. Rollback Strategy per Phase

| Phase                  | Rollback Mechanism                             | Rollback Time | Data Impact      |
| ---------------------- | ---------------------------------------------- | ------------- | ---------------- |
| Phase 0                | `VITE_API_BACKEND=supabase`                    | Instant       | None             |
| Phase 1 (Auth)         | Nginx route auth → Supabase                    | <1 min        | None (same DB)   |
| Phase 2 (CRUD)         | Per-flow feature flags                         | <1 min        | None (same DB)   |
| Phase 3 (Edge Fn)      | Route specific paths → Supabase Edge Functions | <5 min        | None             |
| Phase 4 (Realtime)     | Frontend RealtimeProvider → Supabase           | <1 min        | Reconnect needed |
| Phase 5 (Storage)      | Dual-write ensures both have data              | <5 min        | URL rewrite      |
| Phase 6 (Decommission) | **No rollback** — Supabase removed             | N/A           | N/A              |

---

# 10. Debug Story for Async Worker Failures

When a background job fails:

1. **VIL Observer** shows error in `/_vil/dashboard/` → worker section
2. **Structured log** via `vil_log`:

```rust
vil_error!("Quiz grading failed",
    attempt_id = %attempt.id,
    student_id = %attempt.student_id,
    error = %err,
    trace_id = %ctx.trace_id(),
    retry_count = attempt.retry_count,
);
```

1. **DLQ entry** created with full context
2. **Sentry** captures error with trace context
3. **Grafana alert** fires if DLQ count > threshold
4. **Manual replay** via DLQ API:

```rust
let dlq = mesh.dead_letter_queue();
for msg in dlq.recent(10).await {
    // Inspect, fix root cause, then:
    dlq.mark_replayed(&msg.id).await;
}
```
