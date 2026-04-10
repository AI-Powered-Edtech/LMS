# Phase 1: Auth & Scaffold

**EduSync LMS — Migrasi Supabase → VIL Backend**

**Status:** ⚠️ **DITUNDA** — Seluruh phase frozen hingga execution readiness 88/100
**Execution Readiness:** 68/100 → Target: 88/100

## Gambaran

Phase 1 membangun fondasi backend VIL dan mengimplementasikan sistem autentikasi lengkap yang paritas dengan Supabase Auth. VIL menggunakan **Axum-style handler pattern (Pattern A)** dari `VIL_FOR_EDUSYNC.md` — familiar bagi developer TypeScript/Deno, tidak memerlukan zero-copy SHM.

## Current Auth-Related Codebase Files

These are the existing frontend auth files that Phase 1 must achieve parity with:

| File | Lines | Key Details |
|------|-------|-------------|
| `src/features/auth/api/authService.ts` | ~120 | 8 RPC calls: `get_auth_bootstrap`, `ensure_profile_exists`, `accept_invitation`, `validate_invitation`, `enroll_student`, `public_lookup_class`, `onboard_student`, `create_school_tenant` |
| `src/features/auth/api/mfaService.ts` | ~80 | MFA TOTP enroll/verify/unenroll via Supabase Auth MFA API |
| `src/features/auth/components/ParentRegisterPage.tsx` | ~200 | Parent self-registration flow (must be replicated in VIL) |
| `src/contexts/auth/useSessionManagement.ts` | 286 | Core session hook: 7 `supabase.auth.*` calls (onAuthStateChange, getSession, getUser, signInWithPassword, signUp, signOut, refreshSession) |
| `src/features/auth/components/LoginForm.tsx` | ~150 | Login UI — calls authService |
| `src/features/auth/components/RegisterForm.tsx` | ~150 | Registration UI |
| `src/features/auth/components/MFASettings.tsx` | ~100 | MFA management UI |
| `src/features/auth/components/MFASetupPage.tsx` | ~100 | MFA setup flow |
| `src/features/auth/components/MFAVerifyPage.tsx` | ~80 | MFA verification step |

### Edge Functions (30 total)

The codebase has **30 Edge Functions** in `supabase/functions/` (excluding `_shared/`). Phase 1 does NOT migrate Edge Functions — those stay on Supabase. Phase 1 only migrates auth endpoints.

### VIL Pattern Reference

VIL provides two handler patterns. Phase 1 uses **Pattern A (Axum-style)** exclusively:

```rust
// Pattern A: Axum-style (recommended for migration)
async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    // Business logic here — nearly identical to TypeScript/Deno patterns
}
```

See `migration-plan-agents/10_VIL_BOOTSTRAP_CONTEXT/VIL_FOR_EDUSYNC.md` for full pattern reference.

## Timeline

**Weeks 11-22 | ~180 jam total**

| Sub-phase               | Weeks | Jam Est. | Status      | Deskripsi                                                  |
| ----------------------- | ----- | -------- | ----------- | ---------------------------------------------------------- |
| 1A: VIL Scaffold        | 11-14 | ~25-35   | 🚫 DEFERRED | Cargo workspace, AppState, health endpoints, Docker, Nginx |
| 1B: Auth Implementation | 14-20 | ~95-115  | 🚫 DEFERRED | JWT, password hashing, register/login, OAuth, MFA          |
| 1C: Tenant & RBAC       | 18-20 | ~35-40   | 🚫 DEFERRED | TenantGuard, RbacGuard, SET LOCAL injection, RLS guards    |
| 1D: Verification        | 21-22 | ~20-25   | 🚫 DEFERRED | E2E tests, parity tests, cutover drill                     |

## Gate Structure

```
Gate 1 (Week 14)  ────────────────── VIL API verified? ──────────────► STOP if fails
     │
     ▼
Phase 1A (Week 11-14)
     │
     ▼
Gate 2 (Week 22)  ────────── Auth parity with Supabase? ──────────────► STOP if fails
      │                                                                  (stay with Supabase Auth)
      ▼
Phase 2
```

> **NOTE:** Phase 1 is completely frozen until:
>
> - Execution readiness reaches 88/100
> - Gate RS (Reality Sync) passed
> - Gate 0A passed
>
> **DO NOT EXECUTE** any Phase 1 tasks until these criteria are met.

## Gate 2 Criteria

Jika auth parity gagal → **STOP**, tetap dengan Supabase Auth. Migrasi hanya Edge Functions.

### Must Pass untuk Lanjut ke Phase 2

- [ ] TenantGuard middleware deployed
- [ ] RbacGuard dengan 5 roles (admin, principal, teacher, student, parent)
- [ ] SET LOCAL injection untuk SQL context
- [ ] Role resolution dari `user_roles` table (BUKAN `profiles.role`)
- [ ] RLS guards untuk: profiles, user_roles, tenant_memberships, sessions
- [ ] Sentry error capture working
- [ ] CSRF protection configured
- [ ] Brute force protection (5 attempts → 15 min lockout)
- [ ] 3 dev accounts login via VIL (teacher/student/admin @edusync.dev)
- [ ] Full auth cycle: register → login → MFA → logout
- [ ] Password hash migration (bcrypt Supabase → Argon2 VIL)
- [ ] Multi-tenant isolation verified
- [ ] JWT tampering rejected
- [ ] `get_auth_bootstrap` response IDENTICAL to Supabase
- [ ] Error response shape IDENTICAL to PostgREST format
- [ ] Feature flag switch works both ways (`VITE_API_BACKEND=vil/supabase`)
- [ ] Cutover drill < 2 min

## Sub-Phase Structure

### 1A: VIL Server Scaffold (Week 11-14)

Membangun infrastruktur dasar VIL server.

**Tasks:**

- 1A-0: VIL API Verification
- 1A-1: Cargo workspace init (5 crates)
- 1A-2: AppState + PostgreSQL connection
- 1A-3: Core model structs
- 1A-4: VilApp bootstrap + health/ready
- 1A-5: Error response adapter
- 1A-6: CORS middleware
- 1A-7: JwtAuth placeholder + RateLimit
- 1A-8: Docker Compose
- 1A-9: Nginx reverse proxy
- 1A-10: CI/CD pipeline
- 1A-11: Observability

**Output:** `edusync-api/` Rust workspace running, health check endpoint

### 1B: Auth Implementation (Week 14-20)

Mengimplementasikan semua endpoint autentikasi.

**Tasks:**

- 1B-01: `auth.users` migration SQL
- 1B-02: Error types
- 1B-03: Password hashing (Argon2 + bcrypt)
- 1B-04: JWT issuance
- 1B-05: Session management
- 1B-06: Register endpoint
- 1B-07: Login endpoint
- 1B-08: SignOut endpoint
- 1B-09: Token refresh endpoint
- 1B-10: `get_auth_bootstrap` RPC (PALING KRITIS)
- 1B-11: `ensure_profile_exists` RPC
- 1B-12: Rate limiting
- 1B-13: Forgot/reset password
- 1B-14: Email verification
- 1B-15: Google OAuth PKCE
- 1B-16: MFA TOTP
- 1B-17: `accept_invitation` RPC
- 1B-18: `validate_invitation` RPC
- 1B-19: `enroll_student` RPC
- 1B-20: `public_lookup_class` RPC
- 1B-21: `onboard_student` RPC
- 1B-22: `create_school_tenant` RPC
- 1B-23: Integration tests
- 1B-24: Nginx route update
- 1B-25: Email wiring

**Output:** Semua auth endpoint fungsional, 3 dev accounts login

### 1C: Tenant & RBAC Middleware (Week 18-20)

Middleware keamanan untuk multi-tenancy.

**Tasks:**

- 1C-01: TenantGuard middleware
- 1C-02: RbacGuard + 5 roles
- 1C-03: SET LOCAL injection
- 1C-04: Role resolution from `user_roles`
- 1C-05: RLS guards - profiles
- 1C-06: RLS guards - user_roles
- 1C-07: RLS guards - tenant_memberships
- 1C-08: RLS guards - sessions
- 1C-09: Sentry integration
- 1C-10: CSRF protection
- 1C-11: Brute force protection

**Output:** Tenant isolation verified, RBAC enforced

### 1D: Verification & Testing (Week 21-22)

Testing komprehensif dan cutover drill.

**Tasks:**

- 1D-00: Seed test data
- 1D-01: Auth E2E test suite
- 1D-02: Full auth cycle test
- 1D-03: Multi-tenant isolation test
- 1D-04: JWT tampering & security tests
- 1D-05: Parity tests
- 1D-06: Shadow mode dry-run
- 1D-07: Feature flag switch test
- 1D-08: Cutover drill
- 1D-09: Auth callback redirect verification
- 1D-10: Auth load test

**Output:** Gate 2 pass/fail decision

## Key Constraints

1. **Bahasa Indonesia** — semua user-facing text dalam Bahasa Indonesia
2. **VIL version pin** — pin ke specific git tag di `Cargo.toml`
3. **Multi-tenancy custom** — TenantGuard middleware 100% custom (VIL open-source tidak ada)
4. **Transaction wrapping** — multi-table inserts wajib dalam transaction
5. **Rollback rule** — commit sebelum setiap task, rollback jika verify gagal
6. **No new decisions** — semua arsitektur sudah locked di spec

## Test Accounts

| Email                 | Password      | Role    |
| --------------------- | ------------- | ------- |
| `teacher@edusync.dev` | `password123` | TEACHER |
| `student@edusync.dev` | `password123` | STUDENT |
| `admin@edusync.dev`   | `password123` | ADMIN   |

## Dependencies

- Rust 1.78+
- VIL Framework (OceanOS-id/VIL)
- PostgreSQL 15+
- Docker + Docker Compose
- Nginx

---

## Catatan Status Terkini

### Allowed Scope

- ✅ Phase -1: Reality Sync
- ✅ Phase 0A only (API Client Abstraction)

### Frozen Scope (DO NOT EXECUTE)

- 🚫 Phase 0B (Auth Abstraction)
- 🚫 Phase 0C (Realtime Abstraction)
- 🚫 Phase 0D (Storage Abstraction)
- 🚫 Phase 0E (Verification)
- 🚫 Phase 1 (Auth + Scaffold) — semua sub-phase 1A, 1B, 1C, 1D

### Entry Criteria untuk Unfreeze

Execution readiness harus mencapai 88/100 terlebih dahulu.
