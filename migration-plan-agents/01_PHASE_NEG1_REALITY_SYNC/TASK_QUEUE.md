# Phase -1 Reality Sync — Task Queue

## Workstream A: Baseline Truth Refresh

| Task | Description                                                     | Output             |
| ---- | --------------------------------------------------------------- | ------------------ |
| A-1  | Run `pnpm typecheck && pnpm lint && pnpm test:ci && pnpm build` | Pass/fail status   |
| A-2  | Count feature modules and Edge Functions                        | Module inventory   |
| A-3  | Verify 81/100 readiness score source                            | Confirmed baseline |
| A-4  | Identify any critical vulnerabilities still present             | Vuln list (live)   |
| A-5  | Document current CI/CD pipeline status                          | CI inventory       |
| A-6  | Verify Supabase CLI/schema sync status                          | Schema baseline    |

**Output:** `REALITY_SYNC_BASELINE.md`

---

## Workstream B: Supabase Coupling Inventory

| Bucket | Description                          | Classification                       |
| ------ | ------------------------------------ | ------------------------------------ |
| B-1    | Auth: session, getAuthBootstrap, MFA | **Core** — migrate last              |
| B-2    | RPCs: 21+ analytics calls            | **Procedure** — migrate after CRUD   |
| B-3    | Realtime: 9 hooks + 5 services       | **Realtime** — migrate Phase 4       |
| B-4    | Storage: upload/delete/getPublicUrl  | **Storage** — migrate Phase 5        |
| B-5    | Edge Functions: 22 functions         | **Functions** — migrate Phase 3      |
| B-6    | Database: RLS policies, triggers     | **Schema** — migrate with auth       |
| B-7    | Polling fallbacks for offline        | **Fallback** — migrate with realtime |

**Output:** `SUPABASE_COUPLING_INVENTORY.md`

---

## Workstream C: Gap Classification

| Task | Description                                                               | Output          |
| ---- | ------------------------------------------------------------------------- | --------------- |
| C-1  | Review all blockers from old roadmap                                      | Blocker list    |
| C-2  | Classify each as Live (still blocking), Stale (fixed), or Competing (new) | Gap matrix      |
| C-3  | Identify obsolete tasks that were already completed                       | Stale task list |
| C-4  | Identify tasks that need reframing for current state                      | Reframe list    |

**Output:** `GAP_RECLASSIFICATION.md`

---

## Workstream D: Scope Narrowing Matrix

| Decision             | Domain                 | Rationale                         |
| -------------------- | ---------------------- | --------------------------------- |
| **Migrate-first**    | API Client Abstraction | Low risk, high isolation          |
| **Migrate-first**    | Course CRUD            | Vertical slice POC                |
| **Migrate-later**    | Auth                   | High risk, needs auth parity gate |
| **Migrate-later**    | Analytics RPCs         | Complex, many procedures          |
| **Migrate-later**    | Edge Functions         | 22 functions, complex             |
| **Stay-on-supabase** | Realtime (Phase 4)     | May stay if VIL WS unstable       |
| **Stay-on-supabase** | Storage (Phase 5)      | MinIO cost/effort vs benefit      |

**Output:** `MIGRATION_SCOPE_MATRIX.md`

---

## Workstream E: Revised Phase 0 Prep

| Task | Description                                            | Output            |
| ---- | ------------------------------------------------------ | ----------------- |
| E-1  | Remove tasks referencing non-existent CI               | Cleaned task list |
| E-2  | Update auth abstraction order (after CRUD, not before) | Reordered tasks   |
| E-3  | Verify 51 E2E tests exist and pass                     | Test status       |
| E-4  | Draft compatibility contract                           | Contract doc      |
| E-5  | Create feature flag plan                               | Flag matrix       |

**Output:** `REVISED_PHASE_0.md`

---

## Execution Order

1. **Day 1 AM:** Workstream A (Baseline) + Workstream B (Coupling Inventory)
2. **Day 1 PM:** Workstream C (Gap Classification)
3. **Day 2:** Workstream D (Scope Matrix) + Workstream E (Phase 0 Revision)
4. **Day 3:** Review, sign-off, enter Phase 0
