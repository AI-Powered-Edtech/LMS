# HANDOFF: Cross-Cutting Concerns ke Phase 1

## Overview

Dokumen ini menandai serah terima cross-cutting concerns dari tim migration planning ke tim Phase 1 execution.

## When to Start Each Concern

Each concern has a specific phase gate. Do NOT start a concern before its gate is reached.

| CC  | Concern                    | Start At   | Phase Gate Reference                                              | Blocker If Late?                              |
| --- | -------------------------- | ---------- | ----------------------------------------------------------------- | --------------------------------------------- |
| CC8 | Frontend Compatibility     | Phase 0A   | [02_PHASE_0](../02_PHASE_0_FRONTEND_ABSTRACTION/README.md)       | Yes — no backend work can begin without this  |
| CC2 | Database Migration         | Phase 1A   | [03_PHASE_1](../03_PHASE_1_AUTH_AND_SCAFFOLD/README.md)          | Yes — schema changes will break without this  |
| CC1 | Monitoring & Observability | Phase 1A   | [03_PHASE_1](../03_PHASE_1_AUTH_AND_SCAFFOLD/README.md)          | Yes — blind deployment without monitoring     |
| CC3 | Staging Environment        | Phase 1A   | [03_PHASE_1](../03_PHASE_1_AUTH_AND_SCAFFOLD/README.md)          | Yes — no safe place to test cutover           |
| CC4 | Rate Limiting              | Phase 1B   | [03_PHASE_1](../03_PHASE_1_AUTH_AND_SCAFFOLD/README.md)          | No — can retrofit, but auth is exposed        |
| CC7 | Worker Queue Runtime       | Phase 3    | [05_PHASE_3](../05_PHASE_3_EDGE_FUNCTIONS/README.md)             | Yes — async jobs will fail without queue infra |
| CC5 | Graceful Degradation       | Phase 2    | [04_PHASE_2](../04_PHASE_2_CORE_SERVICES/README.md)              | No — but outages will have no fallback        |
| CC6 | Offline Queue Semantics    | Phase 4    | [06_PHASE_4](../06_PHASE_4_FRONTEND_FINALIZATION/README.md)      | No — offline features degrade gracefully      |

## Current Status

| CC                                  | Status                    | Readiness |
| ----------------------------------- | ------------------------- | --------- |
| CC1: Monitoring & Observability     | Ready to start in Phase 1 | High      |
| CC2: Database Migration Strategy    | Active since Phase 0      | High      |
| CC3: Staging Environment            | Ready to start in Phase 1 | Medium    |
| CC4: Rate Limiting                  | Deferred to Phase 1B      | N/A       |
| CC5: Graceful Degradation           | Deferred to Phase 2       | N/A       |
| CC6: Offline Queue Semantics        | Deferred to Phase 4       | N/A       |
| CC7: Worker Queue Runtime           | Deferred to Phase 3       | N/A       |
| CC8: Frontend Runtime Compatibility | Active since Phase 0A     | High      |

## Prerequisites untuk Phase 1

### Dari Phase 0 (Should be Complete)

- [x] API Client abstraction in place
- [x] `getApiClient()` callable from hooks and services
- [x] Error shape compatibility with PostgREST format
- [x] React Query parity verified for courses module
- [x] Zero Supabase imports in features/ (via ESLint)

### Untuk CC1: Monitoring & Observability

Required:

- [ ] VIL server deployed (Phase 1 task)
- [ ] Prometheus endpoint configured
- [ ] Grafana datasource available

Deliverables in Phase 1:

- VIL Observer Dashboard at `/_vil/dashboard/`
- Basic metrics (request rate, error rate, latency)
- Structured logging (vil_log) for auth endpoints

Verification commands:

```bash
# Verify Prometheus endpoint responds
curl -s http://localhost:9090/-/healthy | grep -q "Prometheus Server is Healthy"

# Verify VIL Observer Dashboard is accessible
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/_vil/dashboard/ | grep -q "200"

# Verify Grafana datasource is configured
curl -s http://localhost:3000/api/datasources | jq '.[].name' | grep -q "vil-prometheus"

# Verify structured logging outputs valid JSON
curl -s http://localhost:3001/api/v1/health | head -1 && journalctl -u vil -n 5 --output=cat | jq . > /dev/null 2>&1 && echo "OK" || echo "FAIL"
```

### Untuk CC3: Staging Environment

Required:

- [ ] Staging Supabase project provisioned
- [ ] Staging VIL server infrastructure available

Deliverables in Phase 1:

- Staging VIL server operational
- Nightly data sync from production
- Parity test infrastructure ready

Verification commands:

```bash
# Verify staging VIL server responds
curl -s -o /dev/null -w "%{http_code}" https://staging-vil.edusync.dev/api/v1/health | grep -q "200"

# Verify staging database has recent data (< 24h old)
psql "$STAGING_DATABASE_URL" -c "SELECT now() - max(created_at) < interval '24 hours' AS fresh FROM courses;" | grep -q "t"

# Verify parity test suite passes
cd migration-plan-agents && cargo test --test parity -- --ignored 2>&1 | tail -1 | grep -q "ok"
```

### Untuk CC6: Offline Queue Semantics

Required:

- [ ] PWA service worker ready for queue handling
- [ ] Redis or database queue store available

Deliverables in Phase 1:

- Idempotency key format defined
- Basic retry with backoff in frontend
- Offline detection working

Verification commands:

```bash
# Verify idempotency key format is documented
grep -q "idempotency" migration-plan-agents/09_CROSS_CUTTING_CONCERNS/06_OFFLINE_QUEUE_SEMANTICS.md && echo "OK"

# Verify service worker registers successfully
curl -s http://localhost:5173/sw.js | head -1 | grep -q "self" && echo "OK" || echo "FAIL"
```

### Untuk CC8: Frontend Runtime Compatibility

Required:

- [ ] Feature flags system implemented
- [ ] Request ID tracking capability

Deliverables in Phase 1:

- Feature flag system functional
- VIL auth integration in frontend
- Request ID correlation working

Verification commands:

```bash
# Verify feature flags module exists
test -f src/features/feature-flags/hooks/useFeatureFlag.ts && echo "OK" || echo "FAIL"

# Verify API client sends request IDs
grep -rn "x-request-id\|X-Request-Id" src/lib/api-client* && echo "OK" || echo "FAIL"

# Verify no direct Supabase imports in features/
grep -rn "from.*@supabase" src/features/ | grep -v "node_modules" | wc -l | grep -q "^0$" && echo "OK" || echo "FAIL"
```

### Untuk CC2: Database Migration Strategy

Verification commands:

```bash
# Verify Supabase CLI is available
supabase --version && echo "OK" || echo "FAIL"

# Verify migrations directory exists and has files
ls supabase/migrations/*.sql | wc -l | xargs -I{} test {} -gt 0 && echo "OK" || echo "FAIL"

# Verify migrations apply cleanly
supabase db reset --dry-run 2>&1 | tail -1 | grep -q "Finished" && echo "OK" || echo "FAIL"
```

### Untuk CC4: Rate Limiting

Verification commands:

```bash
# Verify rate limit middleware is registered
grep -rn "rate.limit\|RateLimit" src/ --include="*.ts" | head -5

# Verify rate limit headers are returned
curl -s -D - http://localhost:3001/api/v1/auth/login -X POST | grep -qi "x-ratelimit" && echo "OK" || echo "FAIL"
```

### Untuk CC5: Graceful Degradation

Verification commands:

```bash
# Verify circuit breaker is configured for AI endpoints
grep -rn "circuit.breaker\|CircuitBreaker" src/ --include="*.rs" | head -5

# Verify fallback responses exist
grep -rn "fallback\|Fallback" src/features/ --include="*.ts" | head -5
```

### Untuk CC7: Worker Queue Runtime

Verification commands:

```bash
# Verify worker queue handler exists
test -f src/workers/queue_handler.rs && echo "OK" || echo "FAIL"

# Verify cron job configuration exists
grep -rn "vil_trigger_cron\|cron" src/ --include="*.rs" | head -5
```

## Known Dependencies

1. **CC2 (Database)** depends on:
   - Supabase CLI available
   - Migration files in `supabase/migrations/`

2. **CC1 (Monitoring)** depends on:
   - VIL server deployed (Phase 1A)
   - Prometheus/Grafana infrastructure

3. **CC3 (Staging)** depends on:
   - Infrastructure provisioning (DevOps)
   - Staging Supabase project

## Parallel Workstreams

During Phase 1, these CCs can proceed in parallel:

| Workstream        | CCs      | Dependencies        |
| ----------------- | -------- | ------------------- |
| A: Infrastructure | CC1, CC3 | VIL server deployed |
| B: Frontend       | CC8      | Feature flag system |
| C: Database       | CC2      | Supabase CLI        |
| D: Offline        | CC6      | PWA service worker  |

## Blockers to Address

If any of these are not resolved, CC work cannot proceed:

1. **No VIL server** → CC1, CC3 blocked
2. **No feature flag system** → CC8 blocked
3. **No offline detection** → CC6 blocked
4. **No Supabase CLI** → CC2 blocked

## Action Items untuk Phase 1 Team

### Immediate (Week 11-12)

1. Setup infrastructure for staging VIL server
2. Configure Prometheus/Grafana for monitoring
3. Initialize feature flags in frontend codebase

### Short-term (Week 13-18)

1. Deploy VIL Observer Dashboard
2. Implement structured logging for auth
3. Setup staging database sync
4. Define idempotency key formats

### Medium-term (Week 19-22)

1. Full monitoring stack operational
2. Staging environment fully functional
3. Offline queue semantics implemented
4. Frontend feature flags ready for Phase 2

## Exit Criteria untuk Phase 1

Cross-cutting concerns yang harus ready sebelum Phase 2:

- [ ] CC1: Monitoring operational
- [ ] CC2: Database strategy documented and tested
- [ ] CC3: Staging environment functional
- [ ] CC6: Offline queue basics implemented
- [ ] CC8: Feature flags system operational

## Handoff Sign-off

| Role           | Name                          | Date |
| -------------- | ----------------------------- | ---- |
| Migration Lead | (assigned at execution start) |      |
| Phase 1 Lead   | (assigned at execution start) |      |
| DevOps Lead    | (assigned at execution start) |      |
| Frontend Lead  | (assigned at execution start) |      |

## Referensi

- Main Plan: [.kilo/plans/1775748006789-clever-sailor.md](../.kilo/plans/1775748006789-clever-sailor.md)
- Phase 0: [02_PHASE_0_FRONTEND_ABSTRACTION/README.md](../02_PHASE_0_FRONTEND_ABSTRACTION/README.md)
- Phase 1: [03_PHASE_1_AUTH_AND_SCAFFOLD/README.md](../03_PHASE_1_AUTH_AND_SCAFFOLD/README.md)
- CC Documents: See [README.md](./README.md) for full list
