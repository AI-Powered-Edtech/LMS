# Acceptance Criteria — Phase 1: Auth & Scaffold

**Gate 2 Exit Criteria — ALL items must pass before Phase 2**

---

## Critical Security Requirements

### TenantGuard Middleware

- [ ] Extracts `tenant_id` from JWT claims
- [ ] Validates tenant exists and is active in DB
- [ ] Injects `TenantId` into request extensions
- [ ] Returns 403 for missing/invalid tenant_id
- [ ] Unit tests pass: valid → 200, missing → 403, inactive → 403

### RbacGuard + 5 Roles

- [ ] 5 roles defined: admin, principal, teacher, student, parent
- [ ] Wildcard permissions work correctly (e.g., teacher can courses:write)
- [ ] Role escalation blocked (student cannot access admin endpoints)
- [ ] Unit tests pass for all 5 roles

### SET LOCAL Injection

- [ ] `current_user_id()` returns correct UUID per request
- [ ] `current_tenant_id()` returns correct UUID per request
- [ ] Values scoped to transaction (not visible outside)
- [ ] Replaces Supabase `auth.uid()` and `get_my_tenant_id()`

### Role Resolution

- [ ] Reads from `user_roles` table (NOT `profiles.role`)
- [ ] Per-tenant role resolution working
- [ ] `get_primary_role()` returns correct priority
- [ ] 3 dev accounts return correct roles

### RLS Guards

- [ ] profiles: User can R/W own; admin can read all in tenant
- [ ] user_roles: Only admin can modify; self-escalation blocked
- [ ] tenant_memberships: Users see only their tenants
- [ ] sessions: Users see/revoke only own sessions

### CSRF Protection

- [ ] POST to protected endpoint without CSRF token → 403
- [ ] POST to exempt endpoint (login, register, refresh) → allowed
- [ ] POST with valid CSRF cookie + header → allowed

### Brute Force Protection

- [ ] 5 failed login attempts → 6th returns 429
- [ ] After 15 min lockout → login allowed again
- [ ] Per IP + email combination tracking

### Sentry Integration

- [ ] Sentry initialized on server start
- [ ] 5xx errors captured and sent to Sentry
- [ ] Panics captured with stack traces
- [ ] No SENTRY_DSN → server starts without crash

---

## Auth Endpoint Requirements

### Register (POST /api/v1/auth/register)

- [ ] Validates email format
- [ ] Validates password strength (min 8 chars)
- [ ] Checks email uniqueness
- [ ] Hashes password with Argon2
- [ ] Creates user in `public.users`
- [ ] Ensures profile exists
- [ ] Returns AuthResponse with tokens

### Login (POST /api/v1/auth/login)

- [ ] Verifies credentials (dual-format: Argon2 + bcrypt)
- [ ] Re-hashes bcrypt → Argon2 on successful login
- [ ] Checks `banned_until` field
- [ ] Returns MFA required if enrolled
- [ ] Returns AuthResponse with tokens
- [ ] Updates `last_sign_in_at`
- [ ] 3 dev accounts (teacher/student/admin @edusync.dev) login successfully

### SignOut (POST /api/v1/auth/signout)

- [ ] Revokes refresh token
- [ ] Returns 204 always (even if token invalid)

### Token Refresh (POST /api/v1/auth/refresh)

- [ ] Validates refresh token JWT
- [ ] Checks token not revoked
- [ ] Rotates tokens (old revoked, new created)
- [ ] Detects token reuse → revokes all user sessions
- [ ] Returns new AuthResponse

### get_auth_bootstrap (GET /api/v1/auth/bootstrap)

- [ ] **PALING KRITIS:** Response shape IDENTICAL to Supabase RPC
- [ ] `profile`: id, email, first_name, last_name, avatar_url, tenant_id
- [ ] `memberships`: tenant_id, tenant_name, tenant_logo, tenant_slug, role, status, is_active, joined_at
- [ ] `default_tenant_id`: correct tenant UUID
- [ ] Role from `user_roles` table (NOT `profiles.role`)

### Password Hashing

- [ ] New users: Argon2 hash
- [ ] Existing Supabase users: bcrypt verification works
- [ ] On successful login: bcrypt → Argon2 re-hash
- [ ] `verify_password()` tries Argon2 first, fallback bcrypt

### Password Reset

- [ ] POST /reset-password: Always returns 200 (prevent enumeration)
- [ ] POST /update-password: Validates token, updates hash, invalidates sessions
- [ ] Token: SHA-256 hashed, 1 hour expiry, one-time use

### Email Verification

- [ ] Templates in Bahasa Indonesia
- [ ] Verification link sent on register
- [ ] POST /verify-email marks `email_confirmed_at`

### Google OAuth (PKCE)

- [ ] GET /oauth/google initiates PKCE flow
- [ ] GET /callback/google exchanges code for tokens
- [ ] Creates/updates user with `is_sso_user = true`
- [ ] Redirects to PATH `/auth/callback` (NOT hash)

### MFA TOTP

- [ ] POST /mfa/enroll: Generates secret + QR code + 10 recovery codes
- [ ] POST /mfa/verify: Validates TOTP, marks verified, issues upgraded session
- [ ] DELETE /mfa/:factor_id: Unenrolls MFA
- [ ] Login with MFA enrolled returns `mfa_verified: false`

### Tenant RPCs

- [ ] accept_invitation: Validates token, adds to tenant_memberships + user_roles
- [ ] validate_invitation: Public endpoint, returns invite validity
- [ ] enroll_student: Lookup class by join_code, enroll student
- [ ] public_lookup_class: Public endpoint, returns class preview
- [ ] onboard_student: Register + enroll + create session in one transaction
- [ ] create_school_tenant: Creates tenant, adds creator as admin

---

## Error Response Format

All error responses MUST match PostgREST format:

```json
{
  "code": "string",
  "message": "string (Bahasa Indonesia)",
  "details": "string|null",
  "hint": "string|null"
}
```

- [ ] Invalid credentials → 401, `invalid_credentials`
- [ ] Token expired → 401, `token_expired`
- [ ] Tenant mismatch → 403, `tenant_mismatch`
- [ ] Rate limited → 429, `too_many_requests`
- [ ] Validation error → 400, `validation_error`
- [ ] Not found → 404, `not_found`
- [ ] Internal error → 500, `internal_error`

---

## Integration Test Requirements

### E2E Tests (1D-01 to 1D-04)

- [ ] 3 dev accounts login: teacher/student/admin @edusync.dev → 200
- [ ] Bootstrap returns correct shape for all 3 roles
- [ ] Full auth cycle: register → login → bootstrap → logout → refresh fails
- [ ] Token rotation: old refresh token revoked after use
- [ ] MFA: enroll → verify → session upgraded
- [ ] Multi-tenant isolation: user in tenant A cannot access tenant B
- [ ] JWT tampering rejected (alg:none, modified payload, wrong secret)
- [ ] Rate limiting on login (429 after threshold)
- [ ] bcrypt login migration (existing accounts work)

### Parity Tests (1D-05)

- [ ] Login response has same keys as Supabase
- [ ] Bootstrap response has same structure as Supabase
- [ ] Error response has `{ code, message, details, hint }` keys

### Cutover Tests (1D-06 to 1D-08)

- [ ] Shadow mode logs match/mismatch counts
- [ ] Feature flag switch works both ways
- [ ] Cutover to VIL < 1 minute
- [ ] Rollback to Supabase < 1 minute
- [ ] Smoke test passes after switch

### Routing Tests (1D-09)

- [ ] OAuth redirect_uri uses PATH routing (`/auth/callback`)
- [ ] OAuth redirect_uri does NOT use HASH routing (`/#/auth/callback`)

### Load Test (1D-10)

- [ ] 100 VU smoke test completes
- [ ] Error rate < 1%
- [ ] p95 latency < 500ms for auth endpoints

---

## Code Quality Requirements

- [ ] `cargo check --all-targets` → 0 errors
- [ ] `cargo clippy -- -D warnings` → 0 warnings
- [ ] `cargo test` → all tests pass
- [ ] No hardcoded secrets or credentials
- [ ] No `TODO` comments in production code (except documented placeholders)
- [ ] All public APIs documented with doc comments
- [ ] Error messages in Bahasa Indonesia for user-facing text

---

## Infrastructure Requirements

- [ ] Docker Compose builds successfully
- [ ] Server runs: `curl localhost:8080/api/v1/health` → 200
- [ ] Nginx routes `/api/v1/auth/*` to VIL
- [ ] PostgreSQL connection works (same DB as Supabase)
- [ ] PgBouncer pooling active (transaction mode)
- [ ] CI/CD pipeline runs on push/PR
- [ ] Observability: logs, metrics, Sentry all functional

---

## Known Gaps (Acknowledged but Not Blocking)

These gaps are acknowledged in the migration plan and will be addressed in later phases:

| Gap                      | Status   | Addressed In                                       |
| ------------------------ | -------- | -------------------------------------------------- |
| Email verification test  | Deferred | Phase 2 (seed data has email_confirmed_at = NOW()) |
| tenant_memberships table | Deferred | Schema audit in 1D-00                              |
| Audit logging            | Deferred | Phase 2 CRUD endpoints                             |
| Tenant owner concept     | Deferred | Phase 2 spec resolution                            |

---

## Decision Point

**If ANY of the following fail → STOP, stay with Supabase Auth:**

1. `get_auth_bootstrap` response shape does NOT match Supabase
2. 3 dev accounts cannot login (bcrypt hash mismatch)
3. Multi-tenant isolation breach detected
4. JWT tampering not rejected
5. Password hash migration fails for existing users

**If auth parity passes → Proceed to Phase 2**
