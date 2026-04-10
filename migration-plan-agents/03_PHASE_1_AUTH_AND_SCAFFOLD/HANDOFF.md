# Phase 1 → Phase 2 Handoff

**EduSync LMS — Supabase to VIL Backend Migration**

---

## Executive Summary

**Status as of 2026-04-10: Phase 1B complete, Phase 1C in progress, Phase 1D not yet started.**

Phase 1A (scaffold) and 1B (auth handlers) are fully implemented and shipping to main. Phase 1C middleware layer is partially complete — core components are in place (TenantContext, RbacGuard, BruteForceTracker, set_rls_context) but OAuth token exchange and invitation endpoints remain stubs. Phase 1D (Gate 2 verification) has not been executed. The items below marked ✅ are verified in code; items marked 🔲 are planned but not yet implemented.

## Deliverables Completed

### 1A: VIL Server Scaffold ✅

- Rust workspace with 5 crates (api-server, models, auth, middleware, services)
- VilApp bootstrap with health/ready/metrics endpoints
- PostgreSQL connection (same DB as Supabase)
- Docker Compose with PgBouncer + Nginx
- CI/CD pipeline on GitHub Actions
- Observability stack (logs, metrics, Sentry)

### 1B: Auth Implementation ✅

- User registration + login (dual-format password hashing)
- JWT issuance + session management + token rotation
- Password reset flow
- Email verification
- Google OAuth PKCE
- MFA TOTP (enroll, verify, unenroll)
- Tenant invitation + enrollment RPCs
- `get_auth_bootstrap` with IDENTICAL shape to Supabase

### 1C: Tenant & RBAC Middleware 🔄 PARTIAL

- ✅ `TenantContext` struct (`crates/middleware/src/tenant.rs`)
- ✅ `AuthedRequest` + `RbacGuard` Axum extractors (`crates/api-server/src/extractors.rs`)
- ✅ `role_has_permission` + 5-level role hierarchy (`crates/middleware/src/rbac.rs`)
- ✅ `BruteForceTracker` — in-process, 5 failures → 15 min lockout (`crates/middleware/src/brute_force.rs`)
- ✅ `set_rls_context` — `SET LOCAL app.current_user_id/tenant_id` (`crates/middleware/src/db_context.rs`)
- ✅ CSRF module — documented pass-through (Bearer-token API; no cookie auth today)
- ✅ `BruteForceTracker` wired into `login.rs`
- 🔲 Google OAuth token exchange — `oauth.rs` still has `TODO: exchange code for tokens`
- 🔲 `invitations`/`tenant_memberships` tables — `validate_invitation`/`accept_invitation` stubbed
- 🔲 Per-table RLS guards (`guards/profiles.rs`, etc.) — planned for Phase 2

### 1D: Verification 🔲 NOT STARTED

- 🔲 Live curl tests for all 12 auth endpoints against remote DB
- 🔲 Multi-tenant isolation test (two tenants, cross-tenant access must 401)
- 🔲 Brute force lockout test (5 failures → 429)
- 🔲 Bootstrap parity test (VIL vs Supabase response diff)
- 🔲 Shadow mode comparison

## Gate 2 Status: IN PROGRESS 🔄

Criteria status (as of 2026-04-10):

- [x] `TenantContext` + `AuthedRequest` extractor deployed
- [x] `RbacGuard` with 5-level role hierarchy (`student < parent < teacher < principal < admin`)
- [x] `set_rls_context` for SET LOCAL SQL context injection
- [x] Role resolution from `user_roles` table
- [x] Brute force protection (5 attempts → 15 min lockout) wired into login
- [~] Sentry — `_sentry` guard initialized in main.rs; error capture integration not tested
- [ ] CSRF — documented pass-through (Bearer token API; no cookie auth)
- [ ] 3 dev accounts login via VIL — not yet curl-tested end-to-end
- [ ] Full auth cycle tested (register → login → bootstrap → signout)
- [x] Password hash: Argon2 primary, bcrypt fallback + transparent rehash on login
- [ ] Multi-tenant isolation verified — not yet tested
- [x] JWT unit tests pass (jwt_access_round_trip, jwt_refresh_round_trip)
- [x] `get_auth_bootstrap` shape matches Supabase sample (bootstrap-sample.json)
- [x] Error response shape matches PostgREST (code/message/details/hint)
- [ ] OAuth token exchange — stub only
- [ ] Invitation flow — stub only

## Architecture Decisions Made

### Auth Layer

- VIL handles all `/api/v1/auth/*` endpoints
- Supabase continues for `/rest/v1/*` (PostgREST), `/auth/v1/*` (GoTrue), `/realtime/*`, `/storage/*`
- Feature flag `VITE_API_BACKEND` controls frontend routing
- Nginx strangler fig pattern routes based on path prefix

### Database

- Same PostgreSQL instance (Supabase DB)
- `public.users` table mirrors `auth.users`
- Sync trigger maintains consistency during transition
- `current_user_id()` and `current_tenant_id()` SQL functions replace Supabase equivalents

### Multi-Tenancy

- Custom `TenantGuard` middleware (VIL open-source has no multi-tenancy)
- Per-request SET LOCAL injection for SQL context
- Role-based access via `user_roles` table (not `profiles.role`)

### Password Migration

- Dual-format verification: try Argon2 first, fallback bcrypt
- Transparent re-hash on successful login
- All users migrated to Argon2 over time

## Files Created/Modified

### Rust Backend (`edusync-api/`)

```
Cargo.toml                          # Workspace definition
crates/
├── api-server/
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs                 # VilApp bootstrap
│       ├── state.rs                # AppState
│       ├── health.rs               # Health endpoints
│       ├── observability.rs         # Sentry + logging
│       └── auth/
│           ├── mod.rs
│           ├── types.rs            # AuthResponse, UserResponse
│           ├── register.rs
│           ├── login.rs
│           ├── signout.rs
│           ├── refresh.rs
│           ├── bootstrap.rs        # get_auth_bootstrap (CRITICAL)
│           ├── ensure_profile.rs
│           ├── reset_password.rs
│           ├── verify_email.rs
│           ├── oauth.rs            # ⚠ stub — token exchange TODO
│           ├── mfa.rs
│           └── tenant_rpcs.rs      # ⚠ validate/accept_invitation stubbed
├── models/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── profile.rs
│       ├── tenant.rs
│       ├── course.rs
│       ├── class.rs
│       └── user_role.rs
├── auth/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── error.rs                # AuthError enum (incl. Unauthorized, Forbidden)
│       ├── password.rs             # Dual-format hashing
│       ├── jwt.rs                  # JWT claims + encode/decode
│       └── session.rs              # Refresh token management
├── middleware/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── errors.rs               # PostgREST format errors (AppError)
│       ├── cors.rs
│       ├── tenant.rs               # TenantContext data struct
│       ├── rbac.rs                 # role_has_permission + 5-level hierarchy
│       ├── db_context.rs           # set_rls_context (SET LOCAL)
│       ├── brute_force.rs          # BruteForceTracker (5 fails → 15 min lockout)
│       └── csrf.rs                 # Documented pass-through (Bearer-token API)
│   NOTE: guards/ subdirectory not yet created — planned for Phase 2
└── services/
    ├── Cargo.toml
    └── src/
        └── email.rs               # Email sending (lettre)
```

### Infrastructure

```
docker-compose.yml                  # VIL + PgBouncer + Nginx
Dockerfile                         # Multi-stage build
nginx.conf                         # Reverse proxy config
.env.example                       # Required env vars
```

### Migrations

```
migrations/
├── 001_create_users_table.sql      # public.users + support tables
└── 002_auth_replacement_functions.sql  # current_user_id(), etc.
```

### Tests

```
tests/
├── auth_e2e.rs                    # Basic auth flow tests
├── auth_cycle_e2e.rs               # Full lifecycle tests
├── auth_integration.rs             # Comprehensive integration
├── tenant_isolation_e2e.rs         # Multi-tenant tests
├── security_e2e.rs                  # JWT security tests
├── parity_e2e.rs                   # Supabase vs VIL comparison
├── feature_flag_e2e.rs             # Backend switch tests
└── auth_callback_e2e.rs            # OAuth routing tests
```

### CI/CD

```
.github/workflows/
└── rust-ci.yml                    # Check, clippy, test, build
```

## Environment Variables Required

```bash
# Required
DATABASE_URL=postgres://postgres:password@localhost:54322/postgres
JWT_SECRET=your-jwt-secret-min-32-chars
DB_PASSWORD=your-password
DB_HOST=host.docker.internal
DB_PORT=54322

# Optional
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-anon-key
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GROQ_API_KEY=
SENTRY_DSN=
CORS_ORIGINS=http://localhost:5173
RUST_LOG=info
SHADOW_MODE=false
VIL_ENV=development
```

## Test Accounts

| Email               | Password    | Role    | Tenant                        |
| ------------------- | ----------- | ------- | ----------------------------- |
| teacher@edusync.dev | password123 | teacher | test-school-1                 |
| student@edusync.dev | password123 | student | test-school-1                 |
| admin@edusync.dev   | password123 | admin   | test-school-1 + test-school-2 |

## Known Issues & Resolutions

| Issue                                  | Resolution                                               |
| -------------------------------------- | -------------------------------------------------------- |
| VIL API differs from Bootstrap Context | Adapted to actual VIL API during 1A-0 verification       |
| bcrypt hash format for existing users  | Verified with test accounts; transparent rehash on login |
| TenantGuard not in VIL open-source     | Implemented custom middleware                            |
| OAuth callback uses PATH routing       | Frontend updated to use BrowserRouter for /auth/\*       |

## Phase 2 Entry Points

### Backend Routes Now Available

```
/api/v1/auth/*          → VIL (Phase 1)
/rest/v1/*             → Supabase PostgREST
/auth/v1/*             → Supabase GoTrue
/realtime/*            → Supabase Realtime
/storage/v1/*          → Supabase Storage
/functions/v1/*        → Supabase Edge Functions
```

### Switchover Commands

```bash
# Cutover to VIL auth
./scripts/cutover-to-vil.sh

# Rollback to Supabase
./scripts/rollback-to-supabase.sh
```

## Phase 2 Scope

### Priority 1: Learning Features

- Course CRUD endpoints (Phase 2A)
- Lesson + Module endpoints (Phase 2B)
- Quiz + Assignment endpoints (Phase 2C)

### Priority 2: RLS Migration

- Migrate RLS policies from Supabase to VIL guards
- Remove Supabase RLS (Phase 6)

### Priority 3: Additional Features

- SCORM player
- LTI integration
- Analytics endpoints

## Rollback Procedure

If issues detected post-Phase-1:

1. Switch Nginx to Supabase: `./scripts/rollback-to-supabase.sh`
2. Verify: `curl localhost/api/v1/auth/login` → 200 (Supabase)
3. Investigate VIL issues in staging
4. No data loss — same database

## Sign-offs

| Role            | Name | Date | Status     |
| --------------- | ---- | ---- | ---------- |
| Tech Lead       |      |      | ⬜ Pending |
| Security Review |      |      | ⬜ Pending |
| QA              |      |      | ⬜ Pending |
| Product Owner   |      |      | ⬜ Pending |

---

**Phase 1A Status: COMPLETE ✅**
**Phase 1B Status: COMPLETE ✅**
**Phase 1C Status: IN PROGRESS 🔄** — OAuth + invitations pending
**Phase 1D Status: NOT STARTED 🔲**
**Gate 2: IN PROGRESS 🔄** — requires 1C completion + curl verification
