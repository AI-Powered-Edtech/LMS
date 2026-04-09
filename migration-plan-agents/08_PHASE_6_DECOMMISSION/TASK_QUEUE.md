# TASK QUEUE — Phase 6: Decommission

**Weeks 67-72 | ~50 jam**

## Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** gunakan `npm` atau `yarn` — pakai `pnpm`
3. Jalankan verify commands setelah setiap task
4. **JANGAN** ubah `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`
5. **JANGAN** buat keputusan arsitektur baru — semua sudah locked di synthesized plan
6. Jika ketemu coupling tak terduga → **BLOCKED**, bukan improvisasi
7. **🛠️ Rollback rule:** Commit SEBELUM mulai task: `git add -A && git commit -m "checkpoint: before task 6X-XX"`. Jika verify gagal: `git stash` atau `git checkout -- <files>`

## Effort Estimate

| Wave | Tasks                        | Jam   | Parallelism |
| ---- | ---------------------------- | ----- | ----------- |
| 6A   | Remove Supabase Dependencies | 10-15 | Parallel    |
| 6B   | Remove Edge Functions        | 10-15 | Serial      |
| 6C   | Database Cleanup             | 10-15 | Serial      |
| 6D   | Final Testing                | 15-20 | Serial      |

## Dependency Map

```
6A-0: Final Audit (BLOCKING)
  │
  ├── 6A-1: Remove @supabase/supabase-js
  │     │
  │     ├── 6A-2: Remove abstraction implementations
  │     │
  │     └── 6A-3: Remove Supabase config
  │           │
  │           └── 6B-0: Remove Edge Functions
  │                 │
  │                 ├── 6B-1: Delete functions directory
  │                 │
  │                 └── 6B-2: Update nginx (if needed)
  │                       │
  │                       └── 6C-0: Database Cleanup
  │                             │
  │                             ├── 6C-1: Remove RLS policies
  │                             │
  │                             ├── 6C-2: Migrate DB hosting (if needed)
  │                             │
  │                             └── 6C-3: Update Sentry
  │                                   │
  │                                   └── 6D-0: Final Testing
  │                                         │
  │                                         ├── 6D-1: E2E test suite
  │                                         │
  │                                         ├── 6D-2: Load test (k6)
  │                                         │
  │                                         └── 6D-3: PWA update
```

## Tasks

### 6A: Remove Supabase Dependencies

#### Task 6A-0: Final Audit

```
TASK ID:       6A-0
OWNER TYPE:    Backend Agent
GOAL:          Final audit of Supabase dependencies
EDIT ONLY:     docs/DECOMMISSION_AUDIT.md (new)
DEPENDENCY:    Phase 5 complete
```

**Audit:**

1. List all Supabase imports remaining
2. List all Supabase config files
3. List all Supabase environment variables
4. Confirm no blocking dependencies

**Verify:** No Supabase imports in codebase (except tests)

---

#### Task 6A-1: Remove @supabase/supabase-js

```
TASK ID:       6A-1
OWNER TYPE:    Frontend Agent
GOAL:          Remove Supabase JS package from package.json
EDIT ONLY:     package.json, pnpm-lock.yaml
DEPENDENCY:    6A-0
```

**Removes:**

- `@supabase/supabase-js` from dependencies
- `@supabase/gotrue-js` from dependencies
- Any other @supabase/\* packages

**Verify:** `pnpm install && pnpm typecheck` passes

---

#### Task 6A-2: Remove Abstraction Implementations

```
TASK ID:       6A-2
OWNER TYPE:    Frontend Agent
GOAL:          Remove Supabase API/Auth/Storage/Realtime providers
EDIT ONLY:     src/services/api/supabaseApiClient.ts (delete)
               src/services/auth/supabaseAuthProvider.ts (delete)
               src/services/storage/supabaseStorageProvider.ts (delete)
               src/services/realtime/supabaseRealtimeProvider.ts (delete)
DEPENDENCY:    6A-1
```

**Deletes:**

- `src/services/api/supabaseApiClient.ts`
- `src/services/auth/supabaseAuthProvider.ts`
- `src/services/storage/supabaseStorageProvider.ts`
- `src/services/realtime/supabaseRealtimeProvider.ts`

**Keeps:**

- `src/services/api/vilApiClient.ts`
- `src/services/auth/vilAuthProvider.ts`
- `src/services/storage/vilStorageProvider.ts`
- `src/services/realtime/vilRealtimeProvider.ts`

**Verify:** Build passes with VIL providers only

---

#### Task 6A-3: Remove Supabase Config

```
TASK ID:       6A-3
OWNER TYPE:    Frontend Agent
GOAL:          Remove Supabase environment variables and config
EDIT ONLY:     .env, .env.example, vite-env.d.ts
DEPENDENCY:    6A-2
```

**Removes:**

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- Any VITE*SUPABASE*\* variables

**Keeps:**

- VITE_API_URL (VIL)
- VITE_WS_URL (VIL WebSocket)

**Verify:** `grep -r "SUPABASE" .env*` returns nothing

---

### 6B: Remove Edge Functions

#### Task 6B-0: Delete Functions Directory

```
TASK ID:       6B-0
OWNER TYPE:    Backend Agent
GOAL:          Remove supabase/functions directory
EDIT ONLY:     supabase/functions/ (delete entire directory)
DEPENDENCY:    6A-3
```

**Deletes:**

- Entire `supabase/functions/` directory
- All Edge Function code

**Rationale:** All functionality migrated to VIL backend

**Verify:** `ls supabase/functions/` returns "No such file or directory"

---

#### Task 6B-1: Update Nginx

```
TASK ID:       6B-1
OWNER TYPE:    DevOps Agent
GOAL:          Remove Supabase Edge Function routes
EDIT ONLY:     nginx.conf
DEPENDENCY:    6B-0
```

**Updates:**

- Remove `/functions/v1/*` routes to Supabase
- Keep other Supabase routes (PostgREST fallback if needed)
- Update CORS configuration

**Verify:** `nginx -t` passes

---

### 6C: Database Cleanup

#### Task 6C-0: Remove RLS Policies

```
TASK ID:       6C-0
OWNER TYPE:    Backend Agent
GOAL:          Remove RLS policies (replaced by VIL middleware)
EDIT ONLY:     migrations/ (new migration file)
DEPENDENCY:    6B-1
```

**Process:**

1. Export existing RLS policies for reference
2. Drop all RLS policies from all tables
3. Verify VIL TenantGuard/RbacGuard working

**Verify:** `SELECT count(*) FROM pg_policies WHERE schemaname = 'public'` returns 0

---

#### Task 6C-1: Migrate Database Hosting (if needed)

```
TASK ID:       6C-1
OWNER TYPE:    DevOps Agent
GOAL:          Move PostgreSQL from Supabase to independent host
EDIT ONLY:     Infrastructure config
DEPENDENCY:    6C-0
```

**Optional:**

- If Supabase DB still used, plan migration
- Export from Supabase
- Import to Cloud SQL / RDS / self-hosted

**Verify:** Application connects to new DB

---

#### Task 6C-2: Update Sentry

```
TASK ID:       6C-2
OWNER TYPE:    Backend Agent
GOAL:          Update Sentry config for VIL-only
EDIT ONLY:     edusync-api/.env, sentry config
DEPENDENCY:    6C-0
```

**Updates:**

- Remove Supabase error tracking
- Update VIL error tracking
- Update environment names

**Verify:** Errors appear in VIL Sentry project

---

### 6D: Final Testing

#### Task 6D-0: E2E Test Suite

```
TASK ID:       6D-0
OWNER TYPE:    QA Agent
GOAL:          Run full E2E test suite
EDIT ONLY:     None
DEPENDENCY:    6C-2
```

**Run:**

```bash
pnpm test:e2e
```

**Pass Criteria:** 100% tests pass

---

#### Task 6D-1: Load Test (k6)

```
TASK ID:       6D-1
OWNER TYPE:    QA Agent
GOAL:          Run k6 load tests
EDIT ONLY:     None
DEPENDENCY:    6D-0
```

**Run:**

```bash
k6 run tests/load/*.js
```

**Pass Criteria:**

- p95 latency < 500ms
- Error rate < 0.1%
- No memory leaks

---

#### Task 6D-2: PWA Service Worker Update

```
TASK ID:       6D-2
OWNER TYPE:    Frontend Agent
GOAL:          Update PWA service worker for VIL-only
EDIT ONLY:     public/sw.js (or vite-plugin-pwa config)
DEPENDENCY:    6D-0
```

**Updates:**

- Remove Supabase-related caching
- Update API endpoints to VIL
- Update offline fallback

**Verify:** PWA installs and works offline

---

## Output Deliverables

After Phase 6:

- [ ] @supabase/supabase-js removed from package.json
- [ ] Supabase abstraction implementations removed
- [ ] Edge Functions directory deleted
- [ ] RLS policies removed
- [ ] Sentry updated for VIL-only
- [ ] All E2E tests pass
- [ ] Load tests pass
- [ ] PWA updated

## NO ROLLBACK

**Phase 6 is final. No rollback possible.**

If critical issues found after Phase 6:

1. Emergency fix in VIL backend
2. Hotfix deployment
3. No return to Supabase

---

## Gate Criteria

- [ ] Zero Supabase imports in production code
- [ ] All E2E tests pass
- [ ] Load tests pass with p95 < 500ms
- [ ] PWA works offline
- [ ] All features verified working

## Final Sign-Off

| Criteria                   | Status |
| -------------------------- | ------ |
| Zero Supabase dependencies | [ ]    |
| All E2E tests pass         | [ ]    |
| Load tests pass            | [ ]    |
| PWA works                  | [ ]    |
| Documentation complete     | [ ]    |

**PROJECT COMPLETE** 🎉
