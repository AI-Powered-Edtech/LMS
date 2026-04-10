# Reality Sync Baseline

**Status:** COMPLETED

**Filled deliverable:** `docs/migration/REALITY_SYNC_BASELINE.md`

This file was a template. The actual filled baseline lives at the path above.

---

## Key Findings Summary

| Metric                        | Value                                    |
| ----------------------------- | ---------------------------------------- |
| Production Readiness          | **81/100** (Production Candidate)        |
| Migration Execution Readiness | **68/100** (Target: 88/100)              |
| Supabase-importing files      | **129**                                  |
| Edge Functions                | **30**                                   |
| Feature modules               | **49**                                   |
| Routing                       | Hash-based (`/#/`)                       |
| CI/CD                         | GitHub Actions exists, needs verification|
| Program status                | Conditional Go (Phase -1 + 0A only)      |
| Frozen scope                  | Phase 0B+ and Phase 1+                   |

## Architecture Summary

- Application is **Supabase-centric SaaS LMS** with no traditional backend
- Business logic lives in PostgreSQL (RLS + SQL functions) and 30 Deno Edge Functions
- Frontend: React 19 + Vite 6 + TypeScript 5.8 + Tailwind CSS v4
- State: React Query (server), Zustand (local), React Context (auth)
- Hash routing active (`/#/` prefix), NOT path-based

## Critical Migration Facts

1. Auth deeply coupled to Supabase Auth + RPC patterns
2. Multi-tenant isolation via RLS + `tenant_id` -- must replicate as TenantGuard middleware
3. 30 Edge Functions are real backend, not optional
4. Realtime: 11 subscriptions, native Supabase
5. Storage: 6 buckets, native Supabase Storage
6. Abstraction layer does NOT exist yet -- Phase 0A is hard prerequisite

---

**Signed off:** 2026-04-10, Agent (Migration Planning)
