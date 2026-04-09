# TASK QUEUE — Phase 1A: VIL Server Scaffold

**Week 11-14 | ~25-35 jam**

## Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** gunakan `npm` atau `yarn` — Rust workspace pakai `cargo`, frontend pakai `pnpm`
3. Jalankan verify commands setelah setiap task
4. **JANGAN** ubah `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`
5. **JANGAN** buat keputusan arsitektur baru — semua sudah locked di spec
6. Jika ketemu coupling tak terduga → **BLOCKED**, bukan improvisasi
7. VIL version: **pin ke specific git tag** di `Cargo.toml`
8. Multi-tenancy adalah **100% custom** `TenantGuard` middleware
9. **🛠️ Rollback rule:** Commit SEBELUM mulai task: `git add -A && git commit -m "checkpoint: before task 1A-XX"`. Jika verify gagal: `git stash` atau `git checkout -- <files>`
10. **🛠️ Nginx route update:** Setiap task yang menambah endpoint baru HARUS dicatat. Task 1A-9 (Nginx config) harus mencakup SEMUA routes.

## Effort Estimate

| Wave   | Tasks                      | Jam | Parallelism                 |
| ------ | -------------------------- | --- | --------------------------- |
| Wave 0 | 1A-0 (VIL verify)          | 2-3 | Serial (blocking)           |
| Wave 1 | 1A-1                       | 2-3 | Serial                      |
| Wave 2 | 1A-2 + 1A-8 + 1A-10        | 5-7 | **Parallel** (3 agents)     |
| Wave 3 | 1A-3 + 1A-4 + 1A-9         | 5-7 | **Parallel** (setelah deps) |
| Wave 4 | 1A-5 + 1A-6 + 1A-7 + 1A-11 | 6-8 | **Parallel** (setelah 1A-4) |
| Wave 5 | 1A-13 (integration verify) | 2-3 | Serial                      |

## Dependency Map

```
1A-0  VIL API Verification (BLOCKING)
  │
  └── 1A-1  Cargo workspace init
        │
        ├── 1A-2  AppState + DB connection
        │     │
        │     ├── 1A-3  Core model structs
        │     │
        │     └── 1A-4  VilApp bootstrap + health/ready
        │           │
        │           ├── 1A-5  Error response adapter
        │           │
        │           ├── 1A-6  CORS middleware
        │           │
        │           └── 1A-7  JwtAuth placeholder + RateLimit
        │
        ├── 1A-8  Docker Compose (PARALLEL with 1A-2)
        │     │
        │     └── 1A-9  Nginx reverse proxy config
        │
        ├── 1A-10 CI/CD pipeline (PARALLEL with 1A-2)
        │
        └── 1A-11 Observability (after 1A-4)
```

## Tasks

### Task 1A-0: VIL API Verification

```
TASK ID:       1A-0
OWNER TYPE:    Rust CLI Agent / Human
GOAL:          Verify actual VIL crate names, module paths, function signatures
EDIT ONLY:     edusync-api/VIL_API_AUDIT.md (new)
DEPENDENCY:    None
```

**Steps:**

1. Clone VIL repo: `git clone https://github.com/OceanOS-id/VIL.git /tmp/vil-audit`
2. List available crates: `ls /tmp/vil-audit/*/Cargo.toml`
3. Verify assumed API paths exist (VilApp, ServiceProcess, JwtAuth, RateLimit, vil_log)
4. Document findings in `VIL_API_AUDIT.md`

**Verify:** `wc -l edusync-api/VIL_API_AUDIT.md` (>30 lines, no empty cells)

**STOP IF:** >50% of APIs don't match → consider Axum fallback

---

### Task 1A-1: Cargo Workspace Init

```
TASK ID:       1A-1
OWNER TYPE:    Rust CLI Agent
GOAL:          Initialize Rust workspace edusync-api/ with 5 crates
EDIT ONLY:     edusync-api/ (new directory)
DEPENDENCY:    1A-0
```

**Creates:**

- `edusync-api/Cargo.toml` (workspace)
- `edusync-api/crates/api-server/Cargo.toml`
- `edusync-api/crates/models/Cargo.toml`
- `edusync-api/crates/auth/Cargo.toml`
- `edusync-api/crates/middleware/Cargo.toml`
- `edusync-api/crates/services/Cargo.toml`
- `edusync-api/crates/*/src/{main,lib}.rs` (placeholders)

**Dependencies (pinned):**

- vil-server, vil-log (git tag)
- tokio, serde, sqlx, jsonwebtoken, argon2, bcrypt, totp-rs, sentry

**Verify:** `cargo check --all-targets && cargo clippy -- -D warnings`

---

### Task 1A-2: AppState + PostgreSQL Connection

```
TASK ID:       1A-2
OWNER TYPE:    Rust CLI Agent
GOAL:          Connect to SAME PostgreSQL as Supabase, define AppState
EDIT ONLY:     edusync-api/crates/api-server/src/main.rs
               edusync-api/crates/api-server/src/state.rs (new)
DEPENDENCY:    1A-1
```

**Creates:**

- `state.rs` with `AppState` struct (db pool, jwt_secret, config)
- DB connection via `DATABASE_URL` env var
- Pool config: 50 connections (Spec 3 §3)

**Verify:** `cargo run -p edusync-api-server` with real DATABASE_URL

---

### Task 1A-3: Core Model Structs

```
TASK ID:       1A-3
OWNER TYPE:    Rust CLI Agent
GOAL:          Generate Rust structs for 5 EXISTING tables
EDIT ONLY:     edusync-api/crates/models/src/*.rs
DEPENDENCY:    1A-2
```

**Tables (MUST introspect actual schema first):**

- `profiles` (NOTE: public.users BELUM ADA)
- `tenants`
- `courses`
- `classes`
- `user_roles`

**Verify:** `cargo check && cargo clippy` + schema introspection matches

---

### Task 1A-4: VilApp Bootstrap + Health/Ready Endpoints

```
TASK ID:       1A-4
OWNER TYPE:    Rust CLI Agent
GOAL:          Bootstrap VilApp with .observer(true), health/ready endpoints
EDIT ONLY:     edusync-api/crates/api-server/src/main.rs
               edusync-api/crates/api-server/src/health.rs (new)
DEPENDENCY:    1A-2
```

**Creates:**

- `health.rs` with custom health + ready handlers
- VilApp bootstrap with `.observer(true)` + `.profile("prod")`
- Endpoints: `/api/v1/health`, `/api/v1/ready`
- VIL auto-generates: `/health`, `/ready`, `/metrics`, `/_vil/dashboard/`

**Verify:**

```bash
curl http://localhost:8080/api/v1/health
curl http://localhost:8080/api/v1/ready
curl http://localhost:8080/health
curl http://localhost:8080/metrics
```

---

### Task 1A-5: Error Response Adapter

```
TASK ID:       1A-5
OWNER TYPE:    Rust CLI Agent
GOAL:          Create error types matching Supabase PostgREST format
EDIT ONLY:     edusync-api/crates/middleware/src/errors.rs (new)
               edusync-api/crates/middleware/src/lib.rs
DEPENDENCY:    1A-4
```

**Format:** `{ code, message, details, hint }` — PostgREST format

**Verify:** `cargo check && cargo clippy`

---

### Task 1A-6: CORS Middleware

```
TASK ID:       1A-6
OWNER TYPE:    Rust CLI Agent
GOAL:          CORS configuration for localhost:5173 (dev) + production
EDIT ONLY:     edusync-api/crates/middleware/src/cors.rs (new)
               edusync-api/crates/middleware/src/lib.rs
               edusync-api/crates/api-server/src/main.rs
DEPENDENCY:    1A-4
```

**Origins:**

- `http://localhost:5173`, `http://127.0.0.1:5173`
- Production from `CORS_ORIGINS` env var

**Headers:** Authorization, Content-Type, X-Client-Info, X-Request-ID, apikey

**Verify:** CORS preflight request returns correct headers

---

### Task 1A-7: JwtAuth Placeholder + RateLimit

```
TASK ID:       1A-7
OWNER TYPE:    Rust CLI Agent
GOAL:          Wire VIL built-in JwtAuth + RateLimit as middleware placeholders
EDIT ONLY:     edusync-api/crates/auth/src/jwt.rs (new)
               edusync-api/crates/auth/src/rate_limit.rs (new)
               edusync-api/crates/auth/src/lib.rs
DEPENDENCY:    1A-4
```

**Rate Limiters (Spec 3 §1.1):**

- auth: 10/min per IP
- ai: 50/hr per user
- quiz: 5/min per user
- general: 100/min per user

**Verify:** `cargo check && cargo clippy`

---

### Task 1A-8: Docker Compose

```
TASK ID:       1A-8
OWNER TYPE:    DevOps / CLI Agent
GOAL:          Docker Compose setup for local dev and staging
EDIT ONLY:     edusync-api/Dockerfile (new)
               edusync-api/docker-compose.yml (new)
               edusync-api/.env.example (new)
DEPENDENCY:    1A-1 (PARALLEL with 1A-2)
```

**Services:**

- VIL API server
- PgBouncer (pool_mode: transaction, 40 connections)
- Nginx reverse proxy

**Verify:** `docker compose config && docker compose build`

---

### Task 1A-9: Nginx Reverse Proxy Config

```
TASK ID:       1A-9
OWNER TYPE:    DevOps / CLI Agent
GOAL:          Nginx config for strangler fig pattern: VIL vs Supabase split
EDIT ONLY:     edusync-api/nginx.conf (new)
DEPENDENCY:    1A-8
```

**Phase 1A routes to VIL:**

- `/api/v1/health`
- `/api/v1/ready`
- `/_vil/` (VIL dashboard)
- `/metrics`

**Everything else** → forward to Supabase

**Verify:** `nginx -t` + `curl http://localhost/api/v1/health` via Nginx

---

### Task 1A-10: CI/CD Pipeline

```
TASK ID:       1A-10
OWNER TYPE:    DevOps / CLI Agent
GOAL:          GitHub Actions CI for Rust
EDIT ONLY:     .github/workflows/rust-ci.yml (new)
DEPENDENCY:    1A-1 (PARALLEL with 1A-2)
```

**Pipeline steps:**

1. checkout
2. Rust cache
3. cargo check
4. cargo clippy
5. cargo test
6. cargo build (release, main branch only)

**Verify:** YAML syntax valid

---

### Task 1A-11: Observability

```
TASK ID:       1A-11
OWNER TYPE:    Rust CLI Agent
GOAL:          Setup structured logging + OpenTelemetry + Sentry
EDIT ONLY:     edusync-api/crates/api-server/src/observability.rs (new)
               edusync-api/crates/api-server/src/main.rs
DEPENDENCY:    1A-4
```

**Components:**

- vil_log initialization
- X-Request-ID propagation
- Sentry error tracking
- VIL `.observer(true)` provides `/metrics` + dashboard

**Verify:** `cargo check`

---

## Git Branch Strategy

**Branch naming:** `phase1a/<task-id>` (e.g. `phase1a/1a-2-appstate`)

**Merge order:** 1A-0 → 1A-1 → {1A-2, 1A-8, 1A-10 parallel} → merge → {1A-3, 1A-4, 1A-9} → dst.

**Conflict hotspot:** `main.rs` diedit oleh 1A-2, 1A-4, 1A-6, 1A-11. Merge 1A-2 dulu, lalu 1A-4 rebase.

---

## Output Deliverables

After Phase 1A:

- [ ] `edusync-api/` Rust workspace compiles
- [ ] `cargo check && cargo clippy` passes with 0 errors, 0 warnings
- [ ] Server runs: `curl localhost:8080/api/v1/health` returns 200
- [ ] Docker Compose builds and starts
- [ ] Nginx routes `/api/v1/health` to VIL
- [ ] CI/CD pipeline runs on GitHub Actions
- [ ] Observability stack initialized (logs, metrics, Sentry)
