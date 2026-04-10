# CC1: Monitoring & Observability

**Started:** Phase 1  
**Duration:** Parallel with Phase 1-6  
**Owner:** Backend/DevOps

## Tujuan

Membangun observability stack lengkap untuk VIL Backend yang memberikan visibilitas penuh ke sistem migration.

## Prerequisites

```bash
# Verify Rust toolchain
rustc --version   # expect 1.77+
cargo --version
docker --version  # expect 24+
docker compose version
```

## Cargo.toml Dependencies

Add these to `edusync-api/Cargo.toml`:

```toml
[dependencies]
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
tracing-opentelemetry = "0.22"
opentelemetry = "0.21"
opentelemetry-otlp = "0.14"
metrics = "0.22"
metrics-exporter-prometheus = "0.13"
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4"] }
```

## Step 1: Tracing Setup

Create `edusync-api/src/observability.rs`:

```rust
use opentelemetry::global;
use opentelemetry_otlp::WithExportConfig;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

/// Initialize the full observability stack: structured JSON logs, OTLP tracing, Prometheus metrics.
/// Call once at startup before any other tracing calls.
pub fn init_observability() {
    // 1. JSON structured logging layer
    let fmt_layer = tracing_subscriber::fmt::layer()
        .json()
        .with_target(true)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true);

    // 2. Environment-based log filter (default: info, override with RUST_LOG)
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,edusync_api=debug,sqlx=warn"));

    // 3. OpenTelemetry tracing layer (sends spans to OTLP collector)
    let otlp_endpoint =
        std::env::var("OTEL_EXPORTER_OTLP_ENDPOINT").unwrap_or_else(|_| "http://localhost:4317".to_string());
    let tracer = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(
            opentelemetry_otlp::new_exporter()
                .tonic()
                .with_endpoint(&otlp_endpoint),
        )
        .install_batch(opentelemetry::runtime::Tokio)
        .expect("Failed to install OTLP tracer");
    let otel_layer = tracing_opentelemetry::layer().with_tracer(tracer);

    // 4. Compose and install
    tracing_subscriber::registry()
        .with(filter)
        .with(fmt_layer)
        .with(otel_layer)
        .init();

    tracing::info!("Observability stack initialized (OTLP endpoint: {})", otlp_endpoint);
}

/// Call at shutdown to flush pending spans.
pub fn shutdown_observability() {
    global::shutdown_tracer_provider();
}
```

## Step 2: Prometheus Metrics Endpoint

Create `edusync-api/src/metrics_endpoint.rs`:

```rust
use axum::{routing::get, Router, response::IntoResponse};
use metrics::{counter, histogram};
use metrics_exporter_prometheus::{PrometheusBuilder, PrometheusHandle};
use std::time::Instant;

/// Build the Prometheus recorder and return its handle (for the /metrics endpoint).
pub fn setup_metrics() -> PrometheusHandle {
    let builder = PrometheusBuilder::new();
    let handle = builder
        .install_recorder()
        .expect("Failed to install Prometheus recorder");
    handle
}

/// Axum handler: serves Prometheus text exposition format at GET /metrics.
pub async fn metrics_handler(
    handle: axum::extract::State<PrometheusHandle>,
) -> impl IntoResponse {
    handle.render()
}

/// Record an HTTP request metric. Call from middleware after each request completes.
pub fn record_http_request(method: &str, path: &str, status: u16, duration: std::time::Duration) {
    let labels = [
        ("method", method.to_string()),
        ("path", path.to_string()),
        ("status", status.to_string()),
    ];
    counter!("http_requests_total", &labels).increment(1);
    histogram!("http_request_duration_seconds", &labels).record(duration.as_secs_f64());
}

/// Record a database query metric.
pub fn record_db_query(query_name: &str, duration: std::time::Duration) {
    let labels = [("query_name", query_name.to_string())];
    histogram!("db_query_duration_seconds", &labels).record(duration.as_secs_f64());
}

/// Record an auth event.
pub fn record_auth_event(tenant_id: &str, result: &str) {
    let labels = [
        ("tenant_id", tenant_id.to_string()),
        ("result", result.to_string()),
    ];
    counter!("auth_login_total", &labels).increment(1);
}

/// Register the /metrics route on the given router.
pub fn register_metrics_routes(app: Router, handle: PrometheusHandle) -> Router {
    app.route("/metrics", get(metrics_handler).with_state(handle))
}
```

## Step 3: Wire into main.rs

```rust
// edusync-api/src/main.rs
mod observability;
mod metrics_endpoint;

#[tokio::main]
async fn main() {
    // 1. Init observability (logs + tracing)
    observability::init_observability();

    // 2. Init Prometheus metrics
    let prom_handle = metrics_endpoint::setup_metrics();

    // 3. Build router with /metrics endpoint
    let app = axum::Router::new()
        .route("/health", axum::routing::get(|| async { "ok" }));
    let app = metrics_endpoint::register_metrics_routes(app, prom_handle);

    // 4. Start server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    tracing::info!("VIL server listening on :8080");
    axum::serve(listener, app).await.unwrap();

    // 5. Shutdown
    observability::shutdown_observability();
}
```

## Step 4: Docker Compose for Grafana + Prometheus

Create `docker/docker-compose.observability.yml`:

```yaml
services:
  prometheus:
    image: prom/prometheus:v2.51.0
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.retention.time=30d"

  grafana:
    image: grafana/grafana:10.4.0
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: edusync-grafana
      GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH: /var/lib/grafana/dashboards/edusync.json
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards

  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.96.0
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "8888:8888"   # Collector metrics
    volumes:
      - ./otel-collector-config.yml:/etc/otelcol-contrib/config.yaml

volumes:
  prometheus-data:
  grafana-data:
```

Create `docker/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "edusync-api"
    static_configs:
      - targets: ["host.docker.internal:8080"]
    metrics_path: /metrics
    scrape_interval: 10s
```

Create `docker/otel-collector-config.yml`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
  logging:
    loglevel: info

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```

Create `docker/grafana/provisioning/datasources/prometheus.yml`:

```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

## Step 5: Grafana Dashboard Template

Create `docker/grafana/dashboards/edusync.json`:

```json
{
  "dashboard": {
    "title": "EduSync VIL Overview",
    "uid": "edusync-vil-overview",
    "panels": [
      {
        "title": "Request Rate (req/s)",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
        "targets": [
          {
            "expr": "rate(http_requests_total[1m])",
            "legendFormat": "{{method}} {{path}} {{status}}"
          }
        ]
      },
      {
        "title": "Error Rate (%)",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 },
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "5xx error rate"
          }
        ]
      },
      {
        "title": "Latency p50 / p95 / p99",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 8 },
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p50"
          },
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p95"
          },
          {
            "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p99"
          }
        ]
      },
      {
        "title": "Auth Events",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 8 },
        "targets": [
          {
            "expr": "rate(auth_login_total[5m])",
            "legendFormat": "{{tenant_id}} {{result}}"
          }
        ]
      }
    ]
  }
}
```

## Komponen

### Prometheus Metrics

Standard metrics yang di-export:

```
# Request metrics
http_requests_total{method, path, status}
http_request_duration_seconds{method, path}

# Database metrics
db_query_duration_seconds{query_name}

# Business metrics
auth_login_total{tenant_id, result}
```

### Grafana Alerting

Alert rules:

| Alert              | Condition                       | Severity |
| ------------------ | ------------------------------- | -------- |
| High Error Rate    | error_rate > 5% for 5m          | Critical |
| High Latency       | p99 > 2s for 5m                 | Warning  |
| DB Pool Exhaustion | active_connections > 80%        | Critical |
| Auth Failures      | auth_failure_rate > 10% for 10m | Warning  |

### OpenTelemetry Distributed Tracing

- Trace context propagation dari frontend hingga backend
- Span attributes: tenant_id, user_id, request_id, correlation_id
- Sampling: 10% for normal, 100% for errors
- OTLP exporter sends to collector at `localhost:4317`

### Structured Logging

Format log standar (output by `tracing-subscriber` JSON layer):

```json
{
  "timestamp": "2026-04-09T10:00:00Z",
  "level": "info",
  "target": "edusync_api::auth",
  "message": "User logged in",
  "span": { "tenant_id": "abc123", "user_id": "user456", "request_id": "req789" }
}
```

Log levels: `trace`, `debug`, `info`, `warn`, `error`

Contexts yang harus di-log:

- Auth: login, logout, token refresh, MFA
- API: request/response (bukan body lengkap)
- DB: query execution time > 1s
- Business: enrollment, course completion, quiz submission

## Verification

Run these commands to verify the stack works end-to-end:

```bash
# 1. Build and start the API
cd edusync-api && cargo build
cargo run &
sleep 2

# 2. Verify metrics endpoint returns Prometheus format
curl -s http://localhost:8080/metrics | head -5
# Expected: lines starting with "# HELP" or "# TYPE" or metric names

# 3. Start observability stack
cd docker && docker compose -f docker-compose.observability.yml up -d

# 4. Verify Prometheus is scraping
curl -s http://localhost:9090/api/v1/targets | grep -o '"health":"up"'
# Expected: "health":"up"

# 5. Verify Grafana is running
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health
# Expected: 200

# 6. Generate test traffic and verify metrics
for i in $(seq 1 10); do curl -s http://localhost:8080/health > /dev/null; done
curl -s http://localhost:8080/metrics | grep http_requests_total
# Expected: http_requests_total lines with method="GET" path="/health"

# 7. Cleanup
kill %1
docker compose -f docker-compose.observability.yml down
```

## Implementasi

### Phase 1 (Week 11-14)

1. Add Cargo.toml dependencies (copy from above)
2. Create `observability.rs` and `metrics_endpoint.rs`
3. Wire into `main.rs`
4. Deploy `docker-compose.observability.yml`
5. Verify with the commands in the Verification section

### Phase 2-3 (Week 23-44)

1. Add database metrics (pool, query duration)
2. Implement OpenTelemetry with W3C trace context
3. Add tenant-level aggregations
4. Create per-tenant dashboards

### Phase 4-6 (Week 45-72)

1. Full distributed tracing across services
2. Custom business metrics
3. SLI/SLO dashboards
4. On-call alerting integration

## Integration Points

- Frontend-Backend observability correlation via `X-Request-ID`
- PWA service worker error reporting
- Edge Function monitoring (continue using existing)

## Exit Criteria

- [ ] `/metrics` endpoint returns Prometheus text format
- [ ] Prometheus scraping configured and targets show "up"
- [ ] Grafana dashboard showing request rate, error rate, latency
- [ ] Structured JSON logging functional for auth
- [ ] Error rate alerts configured in Grafana
- [ ] `curl -s http://localhost:8080/metrics | head -5` returns metric lines

## Referensi

- Related: [03_STAGING_ENVIRONMENT.md](./03_STAGING_ENVIRONMENT.md) untuk staging monitoring
- Related: [05_GRACEFUL_DEGRADATION.md](./05_GRACEFUL_DEGRADATION.md) untuk error handling
