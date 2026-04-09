# CC1: Monitoring & Observability

**Started:** Phase 1  
**Duration:** Parallel with Phase 1-6  
**Owner:** Backend/DevOps

## Tujuan

Membangun observability stack lengkap untuk VIL Backend yang memberikan visibilitas penuh ke sistem migration.

## Komponen

### VIL Observer Dashboard

- Endpoint `/_vil/dashboard/` untuk monitoring internal
- Menampilkan:
  - Request latency percentiles (p50, p95, p99)
  - Error rate per endpoint
  - Active connections
  - Database pool status
  - Recent logs excerpt

### Prometheus Metrics

Standard metrics yang di-export:

```
# Request metrics
http_requests_total{method, path, status}
http_request_duration_seconds{method, path}

# Database metrics
db_pool_active_connections
db_pool_idle_connections
db_query_duration_seconds{query_name}

# Business metrics
auth_login_total{tenant_id, result}
api_request_total{tenant_id, user_id, path}
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

### Structured Logging (vil_log)

Format log standar:

```json
{
  "timestamp": "2026-04-09T10:00:00Z",
  "level": "info",
  "message": "User logged in",
  "context": {
    "tenant_id": "abc123",
    "user_id": "user456",
    "request_id": "req789",
    "ip": "10.0.0.1"
  }
}
```

Log levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`

Contexts yang harus di-log:

- Auth: login, logout, token refresh, MFA
- API: request/response (bukan body lengkap)
- DB: query execution time > 1s
- Business: enrollment, course completion, quiz submission

## Implementasi

### Phase 1 (Week 11-14)

1. Setup Prometheus scrape endpoint di VIL server
2. Configure Grafana datasource
3. Create basic dashboard dengan:
   - Request rate
   - Error rate
   - Latency histogram
4. Add vil_log ke auth handlers

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

- Frontend↔Backend observability correlation via `X-Request-ID`
- PWA service worker error reporting
- Edge Function monitoring (continue using existing)

## Exit Criteria

- [ ] VIL Observer Dashboard accessible di `/_vil/dashboard/`
- [ ] Prometheus scraping configured
- [ ] Grafana dashboard showing basic metrics
- [ ] Structured logging functional untuk auth
- [ ] Error rate alerts configured

## Referensi

- Related: [03_STAGING_ENVIRONMENT.md](./03_STAGING_ENVIRONMENT.md) untuk staging monitoring
- Related: [05_GRACEFUL_DEGRADATION.md](./05_GRACEFUL_DEGRADATION.md) untuk error handling
