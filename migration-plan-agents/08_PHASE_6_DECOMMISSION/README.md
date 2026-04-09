# Phase 6: Decommission

**Timeline:** Weeks 67-72  
**Effort:** ~50 hours

## Overview

Phase 6 removes all Supabase dependencies and completes the migration. This is the final phase with no rollback option.

## Goals

1. Remove @supabase/supabase-js from package.json
2. Remove Supabase abstraction implementations
3. Remove Edge Functions directory
4. Remove RLS policies from database
5. Update PWA service worker
6. Final E2E tests
7. Final load tests (k6)

## Decommission Checklist

### Remove Dependencies

- [ ] `@supabase/supabase-js` from package.json
- [ ] All `@supabase/*` packages
- [ ] Supabase environment variables

### Remove Implementations

- [ ] `src/services/api/supabaseApiClient.ts`
- [ ] `src/services/auth/supabaseAuthProvider.ts`
- [ ] `src/services/storage/supabaseStorageProvider.ts`
- [ ] `src/services/realtime/supabaseRealtimeProvider.ts`

### Remove Backend

- [ ] `supabase/functions/` directory
- [ ] All Edge Functions

### Database

- [ ] Remove all RLS policies
- [ ] Verify VIL TenantGuard active
- [ ] Verify VIL RbacGuard active

### Final Testing

- [ ] All E2E tests pass
- [ ] Load tests pass (p95 < 500ms)
- [ ] PWA works offline

## Final Stack

| Component  | Solution       |
| ---------- | -------------- |
| API Server | VIL (Rust)     |
| Database   | PostgreSQL     |
| Auth       | VIL Auth (JWT) |
| Storage    | S3/R2          |
| Realtime   | VIL WebSocket  |
| Frontend   | React + Vite   |

## Gate Criteria

- [ ] Zero Supabase imports in production code
- [ ] All E2E tests pass
- [ ] Load tests pass
- [ ] PWA updated
- [ ] No Supabase dependencies

## NO ROLLBACK

**Phase 6 is final. There is no rollback.**

If critical issues found:

1. Fix in VIL backend
2. Hotfix deployment
3. No return to Supabase

---

## Artefak

- [x] README.md (dokumen ini)
- [x] TASK_QUEUE.md - Antrian tugas decommission
- [x] FINAL_GO_LIVE_CHECKS.md - Checklist go-live
- [x] HANDOFF.md - Handoff final (project complete)
