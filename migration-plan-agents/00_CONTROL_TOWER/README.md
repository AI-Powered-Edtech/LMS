# EduSync LMS Migration: Control Tower

**Versi:** 1.0  
**Status:** Phase -1 Complete, Phase 0A Next  
**Tanggal:** 2026-04-10  
**Repo:** AI-Powered-Edtech/LMS

---

## Ringkasan Eksekutif

Dokumen ini mengkoordinasikan migrasi EduSync LMS dari **Supabase** ke **VIL Backend (Rust)**. Proyek ini adalah konversi arsitektur full-stack yang memindahkan semua logika dari PostgreSQL/Edge Functions ke server Rust dengan VIL framework.

**Total Estimasi Effort:** ~1,060 jam (~72 minggu part-time)  
**Strategic Fit:** 88/100  
**Execution Readiness:** 68/100 → Target: 88/100 (Phase -1 complete, Phase 0A next)

---

## Phases Overview

| Phase  | Nama                       | Minggu | Effort   | Risk       |
| ------ | -------------------------- | ------ | -------- | ---------- |
| **-1** | Reality Sync               | 1      | ~40 jam  | Rendah     |
| **0**  | Frontend Abstraction Layer | 1-10   | ~150 jam | Sedang     |
| **1**  | Auth + Scaffold            | 11-22  | ~180 jam | **Tinggi** |
| **2**  | Core CRUD Endpoints        | 23-38  | ~240 jam | **Tinggi** |
| **3**  | Edge Functions + Cron      | 39-52  | ~200 jam | Sedang     |
| **4**  | Realtime Migration         | 53-60  | ~120 jam | Sedang     |
| **5**  | Storage Migration          | 61-66  | ~80 jam  | Rendah     |
| **6**  | Supabase Decommission      | 67-72  | ~50 jam  | Rendah     |

**Total: ~1,060 jam / ~72 minggu**

---

## Key Statistics

| Metrik               | Nilai                         |
| -------------------- | ----------------------------- |
| Strategic Fit        | 88/100                        |
| Execution Readiness  | 68/100 → 88/100 (target)      |
| Repository Readiness | 81/100 (Production Candidate) |
| Feature Modules      | 48+                           |
| Edge Functions       | 30                            |
| Realtime Hooks       | 9                             |
| E2E Tests            | 51 Playwright tests           |
| Go/No-Go Gates       | 6                             |

---

## Gate Status

| Gate       | Timing                | Criteria                                       |
| ---------- | --------------------- | ---------------------------------------------- |
| Gate 1     | After Phase 0         | Abstraction layer causes regressions > 2 weeks |
| **Gate 2** | After Phase 1 Auth    | VIL auth parity — **STOP if failed**           |
| Gate 3     | After Phase 2 Batch 1 | RLS→middleware security                        |
| Gate 4     | After Phase 3         | VIL stability                                  |
| Gate 5     | After Phase 4         | Realtime reliability                           |
| Gate 6     | After Phase 6         | Final success                                  |

---

## Phase Directories

- [Phase -1: Reality Sync](./01_PHASE_NEG1_REALITY_SYNC/)
- [Phase 0: Frontend Abstraction](./02_PHASE_0_FRONTEND_ABSTRACTION/)
- [Phase 1: Auth + Scaffold](./03_PHASE_1_AUTH_AND_SCAFFOLD/)
- [Phase 2: Core CRUD](./04_PHASE_2_CORE_CRUD/)
- [Phase 3: Edge Functions](./05_PHASE_3_EDGE_FUNCTIONS/)
- [Phase 4: Realtime](./06_PHASE_4_REALTIME/)
- [Phase 5: Storage](./07_PHASE_5_STORAGE/)
- [Phase 6: Decommission](./08_PHASE_6_DECOMMISSION/)
- [Cross-Cutting Concerns](./09_CROSS_CUTTING_CONCERNS/)
- [VIL Bootstrap Context](./10_VIL_BOOTSTRAP_CONTEXT/)
- [Deferred & Legacy](./11_DEFERRED_AND_LEGACY/)

---

## Key Contracts

### Routing

EduSync uses **hash-based routing** (HashRouter with `/#/` prefix).

- All app links use `/#/` prefix
- OAuth callback: `/#/auth/callback`
- No Nginx fallback required — hash routing handles client-side navigation

### Auth State Side-Effects

| Event                 | Side Effects                                                               |
| --------------------- | -------------------------------------------------------------------------- |
| Sign Out              | Clear React state → Remove localStorage → Call backend → Navigate to login |
| Token Refresh Failure | Toast → Set sessionExpired=true → Trigger signOut → Redirect               |
| Unhandled 401/403     | Guard prevents double redirect → window.location.assign('/login')          |

### Rollback Strategy

| Phase   | Rollback                    | Time    |
| ------- | --------------------------- | ------- |
| Phase 0 | `VITE_API_BACKEND=supabase` | Instant |
| Phase 1 | Nginx route auth → Supabase | <1 min  |
| Phase 2 | Per-flow feature flags      | <1 min  |
| Phase 6 | **No rollback**             | N/A     |

---

## Quick Links

- [Master Plan](<../migration-plan/Full%20Migration%20EduSync%20LMS%20Supabase%20→%20VIL%20Backend%20(ace54d0)>)
- [VIL Framework Reference](../10_VIL_BOOTSTRAP_CONTEXT/)
- [Database Schema](../../docs/DATABASE.md)
- [Component Registry](../../COMPONENT_REGISTRY.md)
- [Engineering Guide](../../CLAUDE.md)

---

## Start Here

1. Baca [CURRENT_STATUS.md](./CURRENT_STATUS.md) untuk status terkini
2. Baca [GLOBAL_RULES.md](./GLOBAL_RULES.md) untuk aturan konsistensi
3. Baca [NEXT_ACTION.md](./NEXT_ACTION.md) untuk langkah selanjutnya
