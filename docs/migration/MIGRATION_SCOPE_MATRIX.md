# Migration Scope Matrix — Workstream D

## Metadata

- **Tanggal:** 2026-04-10
- **Branch:** main
- **Author:** Agent (Migration Planning)
- **Sources Used:**
  - `docs/migration/REALITY_SYNC_BASELINE.md`
  - `docs/migration/SUPABASE_COUPLING_INVENTORY.md`
  - `docs/migration/GAP_RECLASSIFICATION.md`

---

## Purpose

This document defines migration scope decisions for each domain:

- **migrate-first**: Execute now (Phase 0A)
- **migrate-later**: Target migration, but not yet safe to execute
- **stay-on-supabase (temporary)**: Deliberately held from early execution

---

## Decision Rules

1. **migrate-first** only for areas required to open safe proving path
2. **migrate-later** for domains that are final migration targets, but not yet safe to execute
3. **stay-on-supabase (temporary)** for high-blast-radius domains deliberately held

**Note:** "stay-on-supabase (temporary)" does NOT mean cancelled from full migration. It means: do not touch in early phases, revisit after gates pass and parity proof exists.

---

## Scope Matrix

| Domain                           | Decision                         | Execution Window | Gate Required     | Why                                        | Evidence                    |
| -------------------------------- | -------------------------------- | ---------------- | ----------------- | ------------------------------------------ | --------------------------- |
| Client SDK types / `types.ts`    | **migrate-first**                | Phase 0A         | None              | Prerequisite for all abstractions          | Coupling Inventory Bucket 7 |
| ApiClient interface              | **migrate-first**                | Phase 0A         | None              | Core abstraction interface                 | GAP AB-02                   |
| SupabaseApiClient implementation | **migrate-first**                | Phase 0A         | None              | Current implementation, will remain active | GAP AB-03                   |
| VilApiClient stub                | **migrate-first**                | Phase 0A         | None              | Stub for future VIL backend                | GAP AB-03                   |
| Course service POC               | **migrate-first**                | Phase 0A         | None              | Proving vertical slice                     | GAP AB-04                   |
| Routing compatibility decision   | **migrate-first**                | Phase 0A         | None              | Plan/repo mismatch identified              | GAP R-01                    |
| CI verification                  | **migrate-first**                | Phase 0A         | None              | CI exists but needs format proof           | GAP CI-02                   |
| Auth                             | **migrate-later**                | Phase 1          | Gate 0A + Gate RS | 6 live gaps, highest risk                  | GAP AUTH-01–06              |
| Database tenant / RLS semantics  | **migrate-later**                | Phase 1          | Gate 0A           | TenantGuard must replicate RLS             | GAP DB-01, DB-02, DB-04     |
| Core CRUD beyond POC             | **migrate-later**                | Phase 2          | Gate 1 + Gate 0A  | After proving path established             | GAP AB-02                   |
| AI Edge Functions                | **migrate-later**                | Phase 3          | Gate 2            | 8 AI functions identified                  | Coupling Inventory Bucket 6 |
| LTI / SCORM                      | **migrate-later**                | Phase 3          | Gate 2            | 4 LTI functions, 1 SCORM                   | Coupling Inventory Bucket 6 |
| Background jobs / reports        | **migrate-later**                | Phase 3          | Gate 2            | Notification, digest functions             | Coupling Inventory Bucket 6 |
| Observability parity             | **migrate-later**                | Phase 3          | Gate 2            | VIL logging + metrics                      | GAP M-01                    |
| Realtime                         | **stay-on-supabase (temporary)** | Phase 4+         | Gate 3            | VIL WebSocket stability TBD                | GAP RT-02                   |
| Storage                          | **stay-on-supabase (temporary)** | Phase 5+         | Gate 3            | Cost/effort analysis pending               | GAP ST-02                   |
| Offline Sync                     | **stay-on-supabase (temporary)** | Phase 5+         | Gate 3            | Depends on storage decision                | GAP AB-05                   |

---

## migrate-first Summary

These domains are **ACTIVE in Phase 0A**:

| Domain                           | Task Count | Priority |
| -------------------------------- | ---------- | -------- |
| Client SDK types / `types.ts`    | 1          | Critical |
| ApiClient interface              | 1          | Critical |
| SupabaseApiClient implementation | 1          | High     |
| VilApiClient stub                | 1          | High     |
| Course service POC               | 1          | High     |
| Routing compatibility decision   | 1          | High     |
| CI verification                  | 1          | Medium   |

---

## migrate-later Summary

These domains are **TARGET but not yet safe**:

| Domain            | Target Phase | Gate Before Start |
| ----------------- | ------------ | ----------------- |
| Auth              | Phase 1      | Gate 0A + Gate RS |
| Database / RLS    | Phase 1      | Gate 0A           |
| Core CRUD         | Phase 2      | Gate 1            |
| AI Edge Functions | Phase 3      | Gate 2            |
| LTI / SCORM       | Phase 3      | Gate 2            |
| Background jobs   | Phase 3      | Gate 2            |
| Observability     | Phase 3      | Gate 2            |

---

## stay-on-supabase (temporary) Summary

These domains are **HELD from early execution**:

| Domain       | Target Phase | Blocker                          |
| ------------ | ------------ | -------------------------------- |
| Realtime     | Phase 4+     | VIL WebSocket stability unproven |
| Storage      | Phase 5+     | Cost/effort analysis pending     |
| Offline Sync | Phase 5+     | Depends on storage               |

---

## What is Explicitly NOT in Early Scope

The following MUST NOT be executed during Phase 0A:

- ❌ Auth cutover
- ❌ Realtime replacement
- ❌ Storage replacement
- ❌ Offline sync migration
- ❌ Wide Edge Functions porting
- ❌ Phase 1 auth scaffold
- ❌ Any work assuming path-based routing is default

---

## Acceptance Checklist

- [x] All 18 domains have decisions
- [x] Decision column uses only: migrate-first / migrate-later / stay-on-supabase (temporary)
- [x] Execution Window column filled for all
- [x] Gate Required column identifies blocking gates
- [x] migrate-first domains: types.ts, ApiClient, SupabaseApiClient, VilApiClient, courseService POC, routing, CI
- [x] migrate-later domains: auth, database/RLS, CRUD beyond POC, edge functions, AI/LTI/SCORM, observability
- [x] stay-on-supabase domains: realtime, storage, offline sync
- [x] Realtime/storage/offline NOT in early execution scope
- [x] Routing mismatch and CI verification reflected as early tasks
- [x] Matrix ready for Workstream E use
