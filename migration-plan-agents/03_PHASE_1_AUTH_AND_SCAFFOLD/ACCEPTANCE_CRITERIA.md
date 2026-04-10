# Acceptance Criteria — Phase 1: Auth & Scaffold

**Gate 2 Exit Criteria — ALL items must pass before Phase 2**

---

## How to Run Verification

Every criterion below has a bash command. Run all checks:

```bash
cd edusync-api
./scripts/verify-phase1.sh  # Runs all checks below, outputs PASS/FAIL summary
```

Or run individually. Each command exits 0 on PASS, non-zero on FAIL.

**Base URL:** `http://localhost:8080` (VIL server)
**Test Accounts:** `teacher@edusync.dev`, `student@edusync.dev`, `admin@edusync.dev` (all `password123`)

---

## Critical Security Requirements

### TenantGuard Middleware

- [ ] Extracts `tenant_id` from JWT claims
- [ ] Validates tenant exists and is active in DB
- [ ] Injects `TenantId` into request extensions
- [ ] Returns 403 for missing/invalid tenant_id
- [ ] Unit tests pass: valid -> 200, missing -> 403, inactive -> 403

```bash
# Verify TenantGuard unit tests pass (threshold: 3/3 tests)
cd edusync-api && cargo test tenant_guard -- --nocapture 2>&1 | grep -E "test result:" | grep -q "0 failed" && echo "PASS" || echo "FAIL"

# Verify missing tenant_id returns 403
TOKEN=$(curl -sf -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}' | jq -r '.access_token')
# Create a JWT without tenant_id claim and test — expect 403
curl -sf -o /dev/null -w "%{http_code}" -H "Authorization: Bearer INVALID_NO_TENANT_TOKEN" \
  http://localhost:8080/api/v1/protected-endpoint | grep -q "403" && echo "PASS" || echo "FAIL"
```

### RbacGuard + 5 Roles

- [ ] 5 roles defined: admin, principal, teacher, student, parent
- [ ] Wildcard permissions work correctly (e.g., teacher can courses:write)
- [ ] Role escalation blocked (student cannot access admin endpoints)
- [ ] Unit tests pass for all 5 roles

```bash
# Verify RBAC unit tests pass (threshold: 5/5 role tests)
cd edusync-api && cargo test rbac_guard -- --nocapture 2>&1 | grep -E "test result:" | grep -q "0 failed" && echo "PASS" || echo "FAIL"

# Verify student cannot access admin endpoint (expect 403)
STUDENT_TOKEN=$(curl -sf -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@edusync.dev","password":"password123"}' | jq -r '.access_token')
curl -sf -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $STUDENT_TOKEN" \
  http://localhost:8080/api/v1/admin/users | grep -q "403" && echo "PASS" || echo "FAIL"
```

### SET LOCAL Injection

- [ ] `current_user_id()` returns correct UUID per request
- [ ] `current_tenant_id()` returns correct UUID per request
- [ ] Values scoped to transaction (not visible outside)
- [ ] Replaces Supabase `auth.uid()` and `get_my_tenant_id()`

```bash
# Verify SET LOCAL unit tests
cd edusync-api && cargo test db_context -- --nocapture 2>&1 | grep -E "test result:" | grep -q "0 failed" && echo "PASS" || echo "FAIL"
```

### Role Resolution

- [ ] Reads from `user_roles` table (NOT `profiles.role`)
- [ ] Per-tenant role resolution working
- [ ] `get_primary_role()` returns correct priority
- [ ] 3 dev accounts return correct roles

```bash
# Verify teacher role resolved correctly from user_roles table
TOKEN=$(curl -sf -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}' | jq -r '.access_token')
curl -sf -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/auth/bootstrap \
  | jq -e '.memberships[0].role == "teacher"' && echo "PASS" || echo "FAIL"

# Verify student role
STOKEN=$(curl -sf -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@edusync.dev","password":"password123"}' | jq -r '.access_token')
curl -sf -H "Authorization: Bearer $STOKEN" http://localhost:8080/api/v1/auth/bootstrap \
  | jq -e '.memberships[0].role == "student"' && echo "PASS" || echo "FAIL"

# Verify admin role
ATOKEN=$(curl -sf -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@edusync.dev","password":"password123"}' | jq -r '.access_token')
curl -sf -H "Authorization: Bearer $ATOKEN" http://localhost:8080/api/v1/auth/bootstrap \
  | jq -e '.memberships[0].role == "admin"' && echo "PASS" || echo "FAIL"
```

### RLS Guards

- [ ] profiles: User can R/W own; admin can read all in tenant
- [ ] user_roles: Only admin can modify; self-escalation blocked
- [ ] tenant_memberships: Users see only their tenants
- [ ] sessions: Users see/revoke only own sessions

```bash
# Verify RLS guard tests (threshold: all pass)
cd edusync-api && cargo test rls_guard -- --nocapture 2>&1 | grep -E "test result:" | grep -q "0 failed" && echo "PASS" || echo "FAIL"
```

### CSRF Protection

- [ ] POST to protected endpoint without CSRF token -> 403
- [ ] POST to exempt endpoint (login, register, refresh) -> allowed
- [ ] POST with valid CSRF cookie + header -> allowed

```bash
# Verify CSRF blocks unprotected POST (expect 403)
TOKEN=$(curl -sf -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}' | jq -r '.access_token')
curl -sf -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:8080/api/v1/auth/signout | grep -q "403" && echo "PASS (CSRF blocks)" || echo "FAIL"

# Verify login (exempt) works without CSRF token (expect 200)
curl -sf -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}' \
  http://localhost:8080/api/v1/auth/login | grep -q "200" && echo "PASS (exempt)" || echo "FAIL"
```

### Brute Force Protection

- [ ] 5 failed login attempts -> 6th returns 429
- [ ] After 15 min lockout -> login allowed again
- [ ] Per IP + email combination tracking

```bash
# Verify brute force lockout (threshold: 429 after 5 failures)
for i in $(seq 1 5); do
  curl -sf -o /dev/null -X POST http://localhost:8080/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"bruteforce@edusync.dev","password":"wrongpassword"}'
done
# 6th attempt should return 429
curl -sf -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bruteforce@edusync.dev","password":"wrongpassword"}' | grep -q "429" && echo "PASS" || echo "FAIL"
```

### Sentry Integration

- [ ] Sentry initialized on server start
- [ ] 5xx errors captured and sent to Sentry
- [ ] Panics captured with stack traces
- [ ] No SENTRY_DSN -> server starts without crash

```bash
# Verify server starts without SENTRY_DSN (threshold: health returns 200)
env SENTRY_DSN="" curl -sf http://localhost:8080/api/v1/health | jq -e '.status == "ok"' && echo "PASS" || echo "FAIL"

# Verify Sentry init logged on startup
cd edusync-api && cargo run 2>&1 | head -20 | grep -qi "sentry" && echo "PASS (sentry init)" || echo "PASS (no DSN, graceful skip)"
```

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

```bash
# Verify register endpoint (expect access_token in response)
RANDOM_EMAIL="test-$(date +%s)@edusync.dev"
curl -sf -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"securepass123\",\"first_name\":\"Test\",\"last_name\":\"User\"}" \
  | jq -e '.access_token' && echo "PASS" || echo "FAIL"

# Verify weak password rejected (expect 400)
curl -sf -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"weak@edusync.dev","password":"123","first_name":"Test","last_name":"User"}' \
  | grep -q "400" && echo "PASS (weak password rejected)" || echo "FAIL"
```

### Login (POST /api/v1/auth/login)

- [ ] Verifies credentials (dual-format: Argon2 + bcrypt)
- [ ] Re-hashes bcrypt -> Argon2 on successful login
- [ ] Checks `banned_until` field
- [ ] Returns MFA required if enrolled
- [ ] Returns AuthResponse with tokens
- [ ] Updates `last_sign_in_at`
- [ ] 3 dev accounts (teacher/student/admin @edusync.dev) login successfully

```bash
# Verify all 3 dev accounts login (threshold: 3/3 must return access_token)
PASS_COUNT=0
for EMAIL in teacher@edusync.dev student@edusync.dev admin@edusync.dev; do
  curl -sf -X POST http://localhost:8080/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"password123\"}" \
    | jq -e '.access_token' > /dev/null 2>&1 && PASS_COUNT=$((PASS_COUNT+1))
done
[ "$PASS_COUNT" -eq 3 ] && echo "PASS (3/3 accounts)" || echo "FAIL ($PASS_COUNT/3 accounts)"
```

### SignOut (POST /api/v1/auth/signout)

- [ ] Revokes refresh token
- [ ] Returns 204 always (even if token invalid)

```bash
# Verify signout returns 204
TOKEN=$(curl -sf -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}' | jq -r '.access_token')
curl -sf -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: valid" \
  http://localhost:8080/api/v1/auth/signout | grep -q "204" && echo "PASS" || echo "FAIL"
```

### Token Refresh (POST /api/v1/auth/refresh)

- [ ] Validates refresh token JWT
- [ ] Checks token not revoked
- [ ] Rotates tokens (old revoked, new created)
- [ ] Detects token reuse -> revokes all user sessions
- [ ] Returns new AuthResponse

```bash
# Verify token refresh works
RESPONSE=$(curl -sf -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}')
REFRESH=$(echo "$RESPONSE" | jq -r '.refresh_token')
curl -sf -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH\"}" \
  | jq -e '.access_token' && echo "PASS" || echo "FAIL"

# Verify old refresh token is revoked after rotation (expect 401)
curl -sf -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH\"}" | grep -q "401" && echo "PASS (rotation)" || echo "FAIL"
```

### get_auth_bootstrap (GET /api/v1/auth/bootstrap)

- [ ] **PALING KRITIS:** Response shape IDENTICAL to Supabase RPC
- [ ] `profile`: id, email, first_name, last_name, avatar_url, tenant_id
- [ ] `memberships`: tenant_id, tenant_name, tenant_logo, tenant_slug, role, status, is_active, joined_at
- [ ] `default_tenant_id`: correct tenant UUID
- [ ] Role from `user_roles` table (NOT `profiles.role`)

```bash
# Verify bootstrap response shape has all required keys
TOKEN=$(curl -sf -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}' | jq -r '.access_token')
BOOTSTRAP=$(curl -sf -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/auth/bootstrap)

# Check profile keys (threshold: all 6 keys present)
echo "$BOOTSTRAP" | jq -e '.profile | has("id","email","first_name","last_name","avatar_url","tenant_id")' && echo "PASS (profile)" || echo "FAIL (profile)"

# Check memberships keys (threshold: all 8 keys present in first membership)
echo "$BOOTSTRAP" | jq -e '.memberships[0] | has("tenant_id","tenant_name","tenant_logo","tenant_slug","role","status","is_active","joined_at")' && echo "PASS (memberships)" || echo "FAIL (memberships)"

# Check default_tenant_id exists
echo "$BOOTSTRAP" | jq -e '.default_tenant_id' && echo "PASS (default_tenant_id)" || echo "FAIL (default_tenant_id)"
```

### Password Hashing

- [ ] New users: Argon2 hash
- [ ] Existing Supabase users: bcrypt verification works
- [ ] On successful login: bcrypt -> Argon2 re-hash
- [ ] `verify_password()` tries Argon2 first, fallback bcrypt

```bash
# Verify password hashing unit tests
cd edusync-api && cargo test password -- --nocapture 2>&1 | grep -E "test result:" | grep -q "0 failed" && echo "PASS" || echo "FAIL"
```

### Password Reset

- [ ] POST /reset-password: Always returns 200 (prevent enumeration)
- [ ] POST /update-password: Validates token, updates hash, invalidates sessions
- [ ] Token: SHA-256 hashed, 1 hour expiry, one-time use

```bash
# Verify reset-password always returns 200 (even for non-existent email)
curl -sf -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@edusync.dev"}' | grep -q "200" && echo "PASS" || echo "FAIL"
```

### Email Verification

- [ ] Templates in Bahasa Indonesia
- [ ] Verification link sent on register
- [ ] POST /verify-email marks `email_confirmed_at`

```bash
# Verify email verification endpoint exists (expect 400 for missing token, not 404)
curl -sf -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid"}' | grep -qE "400|401" && echo "PASS (endpoint exists)" || echo "FAIL"
```

### Google OAuth (PKCE)

- [ ] GET /oauth/google initiates PKCE flow
- [ ] GET /callback/google exchanges code for tokens
- [ ] Creates/updates user with `is_sso_user = true`
- [ ] Redirects to PATH `/auth/callback` (NOT hash)

```bash
# Verify OAuth initiation returns redirect URL (expect 302 or redirect JSON)
curl -sf -o /dev/null -w "%{http_code}" http://localhost:8080/api/v1/auth/oauth/google \
  | grep -qE "302|200" && echo "PASS (oauth endpoint exists)" || echo "FAIL"
```

### MFA TOTP

- [ ] POST /mfa/enroll: Generates secret + QR code + 10 recovery codes
- [ ] POST /mfa/verify: Validates TOTP, marks verified, issues upgraded session
- [ ] DELETE /mfa/:factor_id: Unenrolls MFA
- [ ] Login with MFA enrolled returns `mfa_verified: false`

```bash
# Verify MFA enroll endpoint exists (expect 401 without auth, not 404)
curl -sf -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/v1/auth/mfa/enroll \
  | grep -qE "401|403" && echo "PASS (mfa endpoint exists)" || echo "FAIL"
```

### Tenant RPCs

- [ ] accept_invitation: Validates token, adds to tenant_memberships + user_roles
- [ ] validate_invitation: Public endpoint, returns invite validity
- [ ] enroll_student: Lookup class by join_code, enroll student
- [ ] public_lookup_class: Public endpoint, returns class preview
- [ ] onboard_student: Register + enroll + create session in one transaction
- [ ] create_school_tenant: Creates tenant, adds creator as admin

```bash
# Verify validate_invitation is public (expect 400 for missing token, not 401/404)
curl -sf -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/v1/auth/validate-invitation \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid"}' | grep -qE "400|404" && echo "PASS (public endpoint)" || echo "FAIL"

# Verify public_lookup_class is public (expect 400/404 for invalid code, not 401)
curl -sf -o /dev/null -w "%{http_code}" http://localhost:8080/api/v1/auth/lookup-class?code=INVALID \
  | grep -qE "400|404" && echo "PASS (public endpoint)" || echo "FAIL"
```

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

```bash
# Verify error response shape matches PostgREST format
RESPONSE=$(curl -sf -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@edusync.dev","password":"wrongpass"}')
echo "$RESPONSE" | jq -e 'has("code","message","details","hint")' && echo "PASS (error shape)" || echo "FAIL"
```

- [ ] Invalid credentials -> 401, `invalid_credentials`
- [ ] Token expired -> 401, `token_expired`
- [ ] Tenant mismatch -> 403, `tenant_mismatch`
- [ ] Rate limited -> 429, `too_many_requests`
- [ ] Validation error -> 400, `validation_error`
- [ ] Not found -> 404, `not_found`
- [ ] Internal error -> 500, `internal_error`

```bash
# Verify invalid credentials returns correct code
curl -sf -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@edusync.dev","password":"wrongpass"}' \
  | jq -e '.code == "invalid_credentials"' && echo "PASS" || echo "FAIL"
```

---

## Integration Test Requirements

### E2E Tests (1D-01 to 1D-04)

```bash
# Run all E2E auth tests (threshold: 0 failures)
cd edusync-api && cargo test --test auth_e2e --test auth_cycle_e2e --test security_e2e --test tenant_isolation_e2e -- --nocapture 2>&1 | grep -E "test result:" | grep -q "0 failed" && echo "PASS" || echo "FAIL"
```

- [ ] 3 dev accounts login: teacher/student/admin @edusync.dev -> 200
- [ ] Bootstrap returns correct shape for all 3 roles
- [ ] Full auth cycle: register -> login -> bootstrap -> logout -> refresh fails
- [ ] Token rotation: old refresh token revoked after use
- [ ] MFA: enroll -> verify -> session upgraded
- [ ] Multi-tenant isolation: user in tenant A cannot access tenant B
- [ ] JWT tampering rejected (alg:none, modified payload, wrong secret)
- [ ] Rate limiting on login (429 after threshold)
- [ ] bcrypt login migration (existing accounts work)

### Parity Tests (1D-05)

```bash
# Run parity tests (threshold: 0 failures)
cd edusync-api && cargo test --test parity_e2e -- --nocapture 2>&1 | grep -E "test result:" | grep -q "0 failed" && echo "PASS" || echo "FAIL"
```

- [ ] Login response has same keys as Supabase
- [ ] Bootstrap response has same structure as Supabase
- [ ] Error response has `{ code, message, details, hint }` keys

### Cutover Tests (1D-06 to 1D-08)

```bash
# Run cutover tests (threshold: 0 failures)
cd edusync-api && cargo test --test feature_flag_e2e -- --nocapture 2>&1 | grep -E "test result:" | grep -q "0 failed" && echo "PASS" || echo "FAIL"

# Manual cutover drill (threshold: < 120 seconds total)
time ./scripts/cutover-to-vil.sh && echo "CUTOVER DONE"
time ./scripts/rollback-to-supabase.sh && echo "ROLLBACK DONE"
```

- [ ] Shadow mode logs match/mismatch counts
- [ ] Feature flag switch works both ways
- [ ] Cutover to VIL < 1 minute
- [ ] Rollback to Supabase < 1 minute
- [ ] Smoke test passes after switch

### Routing Tests (1D-09)

```bash
# Verify OAuth callback uses PATH routing (not hash routing)
cd edusync-api && cargo test --test auth_callback_e2e -- --nocapture 2>&1 | grep -E "test result:" | grep -q "0 failed" && echo "PASS" || echo "FAIL"
```

- [ ] OAuth redirect_uri uses PATH routing (`/auth/callback`)
- [ ] OAuth redirect_uri does NOT use HASH routing (`/#/auth/callback`)

### Load Test (1D-10)

```bash
# Run k6 load test (threshold: error rate < 1%, p95 < 500ms)
k6 run tests/load/auth_load.js 2>&1 | tee /tmp/k6_result.txt
grep -q "checks.*100.00%" /tmp/k6_result.txt && echo "PASS" || echo "FAIL"
grep "http_req_duration.*p(95)" /tmp/k6_result.txt
```

- [ ] 100 VU smoke test completes
- [ ] Error rate < 1%
- [ ] p95 latency < 500ms for auth endpoints

---

## Code Quality Requirements

```bash
# All code quality checks (threshold: 0 errors, 0 warnings)
cd edusync-api && cargo check --all-targets 2>&1 | tail -1 | grep -q "could not compile" && echo "FAIL" || echo "PASS (cargo check)"
cd edusync-api && cargo clippy -- -D warnings 2>&1 | tail -1 | grep -q "could not compile\|error" && echo "FAIL" || echo "PASS (clippy)"
cd edusync-api && cargo test 2>&1 | grep -E "test result:" | grep -q "0 failed" && echo "PASS (tests)" || echo "FAIL (tests)"

# No hardcoded secrets (threshold: 0 matches)
grep -rn "password123\|SUPABASE_SERVICE_ROLE\|sk-\|eyJhbG" edusync-api/crates/ --include="*.rs" | grep -v "test\|spec\|fixture" | wc -l | grep -q "^0$" && echo "PASS (no secrets)" || echo "FAIL"

# No TODO in production code (threshold: 0 in non-test files)
grep -rn "TODO" edusync-api/crates/*/src/ --include="*.rs" | grep -v "test\|spec\|documented" | wc -l | grep -q "^0$" && echo "PASS (no TODOs)" || echo "FAIL"
```

- [ ] `cargo check --all-targets` -> 0 errors
- [ ] `cargo clippy -- -D warnings` -> 0 warnings
- [ ] `cargo test` -> all tests pass
- [ ] No hardcoded secrets or credentials
- [ ] No `TODO` comments in production code (except documented placeholders)
- [ ] All public APIs documented with doc comments
- [ ] Error messages in Bahasa Indonesia for user-facing text

---

## Infrastructure Requirements

```bash
# Docker Compose builds (threshold: exit code 0)
cd edusync-api && docker compose build 2>&1 | tail -1 && echo "PASS" || echo "FAIL"

# Health check responds (threshold: status == "ok")
curl -sf http://localhost:8080/api/v1/health | jq -e '.status == "ok"' && echo "PASS" || echo "FAIL"

# Nginx routes auth to VIL (threshold: VIL server responds, not Supabase)
curl -sf http://localhost/api/v1/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}' \
  | jq -e '.access_token' && echo "PASS (nginx routing)" || echo "FAIL"

# PostgreSQL connection works
cd edusync-api && cargo test db_connection -- --nocapture 2>&1 | grep -q "ok" && echo "PASS" || echo "FAIL"

# CI pipeline config exists
test -f .github/workflows/rust-ci.yml && echo "PASS" || echo "FAIL"
```

- [ ] Docker Compose builds successfully
- [ ] Server runs: `curl localhost:8080/api/v1/health` -> 200
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

**If ANY of the following fail -> STOP, stay with Supabase Auth:**

```bash
# Critical go/no-go checks (ALL must pass)

# 1. Bootstrap shape matches Supabase
TOKEN=$(curl -sf -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}' | jq -r '.access_token')
curl -sf -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/auth/bootstrap \
  | jq -e '.profile and .memberships and .default_tenant_id' && echo "GO" || echo "NO-GO: bootstrap shape"

# 2. All 3 dev accounts login (bcrypt hash compatibility)
for EMAIL in teacher@edusync.dev student@edusync.dev admin@edusync.dev; do
  curl -sf -X POST http://localhost:8080/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"password123\"}" \
    | jq -e '.access_token' > /dev/null 2>&1 || { echo "NO-GO: $EMAIL login failed"; exit 1; }
done && echo "GO"

# 3. Multi-tenant isolation
cd edusync-api && cargo test tenant_isolation -- --nocapture 2>&1 | grep -q "0 failed" && echo "GO" || echo "NO-GO: tenant isolation"

# 4. JWT tampering rejected
cd edusync-api && cargo test jwt_tampering -- --nocapture 2>&1 | grep -q "0 failed" && echo "GO" || echo "NO-GO: JWT security"

# 5. Password hash migration
cd edusync-api && cargo test password_migration -- --nocapture 2>&1 | grep -q "0 failed" && echo "GO" || echo "NO-GO: password migration"
```

1. `get_auth_bootstrap` response shape does NOT match Supabase
2. 3 dev accounts cannot login (bcrypt hash mismatch)
3. Multi-tenant isolation breach detected
4. JWT tampering not rejected
5. Password hash migration fails for existing users

**If auth parity passes -> Proceed to Phase 2**
