# HANDOFF: Cross-Cutting Concerns ke Phase 1

## Overview

Dokumen ini menandai serah terima cross-cutting concerns dari tim migration planning ke tim Phase 1 execution.

## Current Status

| CC                                  | Status                    | Readiness |
| ----------------------------------- | ------------------------- | --------- |
| CC1: Monitoring & Observability     | Ready to start in Phase 1 | High      |
| CC2: Database Migration Strategy    | Active since Phase 0      | High      |
| CC3: Staging Environment            | Ready to start in Phase 1 | Medium    |
| CC4: Rate Limiting                  | Deferred to Phase 2       | N/A       |
| CC5: Graceful Degradation           | Deferred to Phase 3       | N/A       |
| CC6: Offline Queue Semantics        | Ready to start in Phase 1 | Medium    |
| CC7: Worker Queue Runtime           | Deferred to Phase 2       | N/A       |
| CC8: Frontend Runtime Compatibility | Ready to start in Phase 1 | High      |

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

### Untuk CC3: Staging Environment

Required:

- [ ] Staging Supabase project provisioned
- [ ] Staging VIL server infrastructure available

Deliverables in Phase 1:

- Staging VIL server operational
- Nightly data sync from production
- Parity test infrastructure ready

### Untuk CC6: Offline Queue Semantics

Required:

- [ ] PWA service worker ready for queue handling
- [ ] Redis or database queue store available

Deliverables in Phase 1:

- Idempotency key format defined
- Basic retry with backoff in frontend
- Offline detection working

### Untuk CC8: Frontend Runtime Compatibility

Required:

- [ ] Feature flags system implemented
- [ ] Request ID tracking capability

Deliverables in Phase 1:

- Feature flag system functional
- VIL auth integration in frontend
- Request ID correlation working

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

## handoff Sign-off

| Role           | Name | Date |
| -------------- | ---- | ---- |
| Migration Lead | TBD  |      |
| Phase 1 Lead   | TBD  |      |
| DevOps Lead    | TBD  |      |
| Frontend Lead  | TBD  |      |

## Referensi

- Main Plan: [.kilo/plans/1775748006789-clever-sailor.md](../.kilo/plans/1775748006789-clever-sailor.md)
- Phase 0: [02_PHASE_0_FRONTEND_ABSTRACTION/README.md](../02_PHASE_0_FRONTEND_ABSTRACTION/README.md)
- Phase 1: [03_PHASE_1_AUTH_AND_SCAFFOLD/README.md](../03_PHASE_1_AUTH_AND_SCAFFOLD/README.md)
- CC Documents: See [README.md](./README.md) for full list
