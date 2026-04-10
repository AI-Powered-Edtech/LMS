# Phase 1 → Phase 2 Handoff

**EduSync LMS — Supabase to VIL Backend Migration**

---

## What Exists When You Arrive (Phase 0 Outputs)

Phase 0 completed the Frontend Abstraction Layer. These files already exist and are working:

### API Client Abstraction (`src/services/api/`)

```
src/services/api/
├── types.ts              # QueryResult, ApiClient interface
├── apiClient.ts          # getApiClient(), setApiClient() singleton
├── supabaseApiClient.ts  # Supabase implementation (active)
├── vilApiClient.ts       # VIL stub (throws "Not implemented")
└── index.ts              # Barrel export
```

### Auth Provider Abstraction (`src/services/auth/`)

```
src/services/auth/
├── types.ts              # AuthProvider, AuthUser, AuthSession interfaces
├── authProvider.ts       # getAuthProvider(), setAuthProvider() singleton
├── supabaseAuthProvider.ts  # Supabase implementation (active)
└── vilAuthProvider.ts    # VIL stub
```

### Realtime & Storage Providers

```
src/services/realtime/    # RealtimeProvider + Supabase/VIL implementations
src/services/storage/     # StorageProvider + Supabase/VIL implementations
```

### Service Files Refactored

All ~30 service files in `src/features/*/api/` use `getApiClient()` instead of direct Supabase imports. The ESLint guard blocks direct `supabase` imports at ERROR level.

### Auth Files That Phase 1 Must Replicate

| File | Lines | What It Does |
|------|-------|--------------|
| `src/features/auth/api/authService.ts` | ~120 | 8 RPCs: `get_auth_bootstrap`, `ensure_profile_exists`, `accept_invitation`, `validate_invitation`, `enroll_student`, `public_lookup_class`, `onboard_student`, `create_school_tenant` |
| `src/features/auth/api/mfaService.ts` | ~80 | MFA TOTP enroll/verify/unenroll via Supabase Auth MFA API |
| `src/contexts/auth/useSessionManagement.ts` | 286 | Core session hook: 7 `supabase.auth.*` calls (onAuthStateChange, getSession, getUser, signInWithPassword, signUp, signOut, refreshSession) |
| `src/features/auth/components/ParentRegisterPage.tsx` | ~200 | Parent self-registration flow |
| `src/features/auth/components/LoginForm.tsx` | ~150 | Login UI |
| `src/features/auth/components/RegisterForm.tsx` | ~150 | Registration UI |
| `src/features/auth/components/MFA*.tsx` | ~280 | MFA setup, settings, verify pages |

### Entry Criteria Checklist

Run these to confirm Phase 0 outputs are intact before starting Phase 1:

```bash
# 1. API client abstraction files exist
for f in types.ts apiClient.ts supabaseApiClient.ts vilApiClient.ts index.ts; do
  test -f src/services/api/$f && echo "PASS: $f" || echo "FAIL: $f missing"
done

# 2. Auth provider abstraction files exist
for f in types.ts authProvider.ts supabaseAuthProvider.ts vilAuthProvider.ts; do
  test -f src/services/auth/$f && echo "PASS: $f" || echo "FAIL: $f missing"
done

# 3. ESLint guard blocks direct supabase imports
grep -rq "no-restricted-imports.*supabase" .eslintrc* eslint.config.* 2>/dev/null && echo "PASS: ESLint guard" || echo "FAIL: ESLint guard missing"

# 4. Frontend builds clean
pnpm build 2>&1 | tail -5 | grep -q "error" && echo "FAIL: build errors" || echo "PASS: frontend builds"

# 5. Dev accounts work on current Supabase auth
curl -sf -X POST https://YOUR_SUPABASE_URL/auth/v1/token?grant_type=password \
  -H "apikey: YOUR_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}' \
  | jq -e '.access_token' > /dev/null && echo "PASS: Supabase auth works" || echo "FAIL: Supabase auth broken"
```

---

## What This Phase Creates

### `edusync-api/` Rust Workspace

```
edusync-api/
├── Cargo.toml                     # Workspace: 5 crates
├── crates/
│   ├── api-server/                # VilApp bootstrap, routes, handlers
│   │   └── src/auth/              # Auth endpoint handlers (register, login, logout, etc.)
│   ├── models/                    # Shared model structs (Profile, Tenant, UserRole, etc.)
│   ├── auth/                      # Auth logic (password hashing, JWT, sessions, roles)
│   ├── middleware/                 # TenantGuard, RbacGuard, CSRF, brute force, CORS
│   │   └── src/guards/            # RLS guards (profiles, user_roles, tenants, sessions)
│   └── services/                  # Email sending (lettre)
├── migrations/
│   ├── 001_create_users_table.sql
│   └── 002_auth_replacement_functions.sql
├── tests/                         # E2E, parity, security, load tests
├── docker-compose.yml             # VIL + PgBouncer + Nginx
├── Dockerfile                     # Multi-stage Rust build
├── nginx.conf                     # Reverse proxy (strangler fig)
└── .env.example                   # Required environment variables
```

### Auth Endpoints Created

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/auth/register` | POST | None | User registration |
| `/api/v1/auth/login` | POST | None | Login (dual bcrypt/Argon2) |
| `/api/v1/auth/signout` | POST | JWT | Logout + revoke refresh token |
| `/api/v1/auth/refresh` | POST | None | Token rotation |
| `/api/v1/auth/bootstrap` | GET | JWT | `get_auth_bootstrap` (CRITICAL) |
| `/api/v1/auth/reset-password` | POST | None | Initiate password reset |
| `/api/v1/auth/update-password` | POST | Token | Complete password reset |
| `/api/v1/auth/verify-email` | POST | Token | Email verification |
| `/api/v1/auth/oauth/google` | GET | None | Google OAuth PKCE initiation |
| `/api/v1/auth/callback/google` | GET | None | OAuth callback |
| `/api/v1/auth/mfa/enroll` | POST | JWT | MFA TOTP enrollment |
| `/api/v1/auth/mfa/verify` | POST | JWT | MFA TOTP verification |
| `/api/v1/auth/mfa/:factor_id` | DELETE | JWT | MFA unenrollment |
| `/api/v1/auth/accept-invitation` | POST | JWT | Accept tenant invitation |
| `/api/v1/auth/validate-invitation` | POST | None | Validate invitation token |
| `/api/v1/auth/enroll-student` | POST | JWT | Enroll student by join code |
| `/api/v1/auth/lookup-class` | GET | None | Public class lookup |
| `/api/v1/auth/onboard-student` | POST | None | Register + enroll in one step |
| `/api/v1/auth/create-tenant` | POST | JWT | Create school tenant |
| `/api/v1/auth/ensure-profile` | POST | JWT | Ensure profile exists |
| `/api/v1/health` | GET | None | Health check |
| `/api/v1/ready` | GET | None | Readiness check |

### Middleware Stack Created

| Middleware | Purpose |
|-----------|---------|
| TenantGuard | Extracts + validates `tenant_id` from JWT, injects into request |
| RbacGuard | Enforces role-based access (5 roles: admin, principal, teacher, student, parent) |
| SET LOCAL | Injects `current_user_id()` + `current_tenant_id()` into SQL context per request |
| CSRF | Blocks state-changing requests without CSRF token (exempts login/register/refresh) |
| BruteForce | 5 failed attempts -> 15 min lockout per IP+email |
| CORS | Configured for frontend origin |
| RateLimit | General rate limiting |

### Reverse Proxy Configuration (Nginx Strangler Fig)

```
/api/v1/auth/*    → VIL server (port 8080)     ← Phase 1 creates this
/api/v1/health    → VIL server (port 8080)     ← Phase 1 creates this
/rest/v1/*        → Supabase PostgREST          ← Unchanged
/auth/v1/*        → Supabase GoTrue             ← Unchanged (legacy, removed Phase 6)
/realtime/*       → Supabase Realtime           ← Unchanged
/storage/v1/*     → Supabase Storage            ← Unchanged
/functions/v1/*   → Supabase Edge Functions     ← Unchanged (30 functions)
```

---

## Executive Summary

Phase 1 completed the implementation of VIL authentication system with full parity to Supabase Auth. The system is production-ready for auth endpoints with multi-tenant isolation and RBAC enforcement.

## Deliverables Completed

### 1A: VIL Server Scaffold

- Rust workspace with 5 crates (api-server, models, auth, middleware, services)
- VilApp bootstrap with health/ready/metrics endpoints
- PostgreSQL connection (same DB as Supabase)
- Docker Compose with PgBouncer + Nginx
- CI/CD pipeline on GitHub Actions
- Observability stack (logs, metrics, Sentry)

### 1B: Auth Implementation

- User registration + login (dual-format password hashing)
- JWT issuance + session management + token rotation
- Password reset flow
- Email verification
- Google OAuth PKCE
- MFA TOTP (enroll, verify, unenroll)
- Tenant invitation + enrollment RPCs
- `get_auth_bootstrap` with IDENTICAL shape to Supabase

### 1C: Tenant & RBAC Middleware

- TenantGuard: extracts + validates tenant_id from JWT
- RbacGuard: 5 roles (admin, principal, teacher, student, parent) with wildcard permissions
- SET LOCAL injection for SQL context
- RLS guards for: profiles, user_roles, tenant_memberships, sessions
- CSRF protection (exempting public auth endpoints)
- Brute force protection (5 attempts -> 15 min lockout)

### 1D: Verification

- Comprehensive E2E test suite (auth_e2e, auth_cycle_e2e, security_e2e)
- Multi-tenant isolation tests
- Parity tests (Supabase vs VIL response shapes)
- Shadow mode for production comparison
- Feature flag switch testing
- Cutover drill completed (< 2 minutes)

## Gate 2 Status: PASSED

All 23 criteria met. See `ACCEPTANCE_CRITERIA.md` for bash-executable verification commands.

## Architecture Decisions Made

### Auth Layer

- VIL handles all `/api/v1/auth/*` endpoints
- Supabase continues for `/rest/v1/*` (PostgREST), `/auth/v1/*` (GoTrue), `/realtime/*`, `/storage/*`
- Feature flag `VITE_API_BACKEND` controls frontend routing
- Nginx strangler fig pattern routes based on path prefix
- All handlers use VIL Pattern A (Axum-style) from `VIL_FOR_EDUSYNC.md`

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
| OAuth callback uses PATH routing       | Frontend updated to use BrowserRouter for /auth/*        |

## Phase 2 Entry Points

### Backend Routes Now Available

```
/api/v1/auth/*          → VIL (Phase 1)
/rest/v1/*             → Supabase PostgREST
/auth/v1/*             → Supabase GoTrue
/realtime/*            → Supabase Realtime
/storage/v1/*          → Supabase Storage
/functions/v1/*        → Supabase Edge Functions (30 functions)
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
2. Verify: `curl localhost/api/v1/auth/login` -> 200 (Supabase)
3. Investigate VIL issues in staging
4. No data loss — same database

## Sign-offs

| Role            | Name | Date | Status     |
| --------------- | ---- | ---- | ---------- |
| Tech Lead       |      |      | Pending |
| Security Review |      |      | Pending |
| QA              |      |      | Pending |
| Product Owner   |      |      | Pending |

---

**Phase 1 Status: COMPLETE**
**Gate 2: PASSED**
**Ready for Phase 2: YES**
