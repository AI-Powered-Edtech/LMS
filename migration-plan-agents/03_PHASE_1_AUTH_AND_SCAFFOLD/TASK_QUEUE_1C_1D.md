# TASK QUEUE — Phase 1C-1D: Tenant & RBAC Middleware + Verification

**Week 18-22 | ~63-80 jam**

## Phase 1C: Tenant & RBAC Middleware

### Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** buat keputusan arsitektur baru
3. Commit SEBELUM mulai setiap task: `git add -A && git commit -m "checkpoint: before task 1C-XX"`
4. Jika verify gagal: `git stash` atau `git checkout -- <files>`
5. Gap fixes applied: Gap #2, #5, #8, #9, Gap #13 (see source docs)

---

### Task 1C-01: TenantGuard Middleware

```
TASK ID:       1C-01
OWNER TYPE:    Rust backend agent
GOAL:          Extract tenant_id from JWT, inject into request, reject invalid
EDIT ONLY:     edusync-api/crates/middleware/src/tenant.rs (CREATE)
               edusync-api/crates/middleware/src/mod.rs (ADD)
               edusync-api/crates/api-server/src/main.rs (APPLY)
DEPENDENCY:    Phase 1B JWT claims
```

**Replaces:** Supabase `get_my_tenant_id()` + `auto_set_tenant_id()` trigger

**Flow:**

1. Extract `tenant_id` from JWT claims
2. Validate tenant exists in DB (`SELECT 1 FROM tenants WHERE id = $1 AND is_active = true`)
3. Inject `TenantId` into request extensions
4. Return 403 if invalid/missing

**Newtype:** `pub struct TenantId(pub Uuid);`

**Extractor:** `impl<S> FromRequestParts<S> for TenantId`

**Unit test:** valid tenant → passes, missing → 403, inactive → 403

**Verify:** `cargo test -p middleware -- tenant`

---

### Task 1C-02: RbacGuard Middleware + 5 Roles

```
TASK ID:       1C-02
OWNER TYPE:    Rust backend agent
GOAL:          Configure RBAC with 5 EduSync roles + wildcard permissions
EDIT ONLY:     edusync-api/crates/middleware/src/rbac.rs (CREATE)
               edusync-api/crates/middleware/src/mod.rs (ADD)
DEPENDENCY:    Phase 1B JWT claims
```

**Roles with permissions:**

| Role      | Permissions                                                                                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| admin     | courses:_, users:_, analytics:_, settings:_, quizzes:_, gradebook:_, attendance:_, reports:_, surveys:_, assignments:_, lessons:_, discussions:_, notifications:_, question-bank:_, gamification:_, certificates:_, finance:_, onboarding:_ |
| principal | analytics:_, reports:_, surveys:\*, courses:read, users:read, attendance:read, gradebook:read, notifications:read                                                                                                                           |
| teacher   | courses:_, quizzes:_, gradebook:_, attendance:_, analytics:read, assignments:_, lessons:_, discussions:_, notifications:_, question-bank:\*, certificates:read                                                                              |
| student   | courses:read, quizzes:submit, quizzes:read, progress:read, assignments:submit, assignments:read, lessons:read, discussions:read, discussions:write, notifications:read, gamification:read, certificates:read                                |
| parent    | progress:read, messages:\*, attendance:read, grades:read, notifications:read                                                                                                                                                                |

**Middleware factories:**

- `require_permission(permission: &str)` → checks RBAC policy
- `require_any_role(roles: &[&str])` → simple role gate

**Verify:** `cargo test -p middleware -- rbac` (all 5 role tests pass)

---

### Task 1C-03: SET LOCAL Injection

```
TASK ID:       1C-03
OWNER TYPE:    Rust backend agent
GOAL:          SET LOCAL app.current_user_id + app.current_tenant_id per request
EDIT ONLY:     edusync-api/crates/middleware/src/db_context.rs (CREATE)
               edusync-api/crates/middleware/src/mod.rs (ADD)
               edusync-api/migrations/ (SQL replacement functions)
DEPENDENCY:    1C-01 (TenantGuard)
```

**Replaces:** Supabase `auth.uid()` and `get_my_tenant_id()`

**Functions:**

- `set_request_context(tx, user_id, tenant_id)` → SET LOCAL
- `begin_with_context(pool, user_id, tenant_id)` → transaction with context

**SQL migrations:**

```sql
CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
  SELECT current_setting('app.current_user_id')::UUID;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT current_setting('app.current_tenant_id')::UUID;
$$ LANGUAGE SQL STABLE;
```

**Verify:** `cargo test -p middleware -- db_context`

---

### Task 1C-04: Role Resolution from user_roles

```
TASK ID:       1C-04
OWNER TYPE:    Rust backend agent
GOAL:          Read roles from user_roles table (NOT profiles.role)
EDIT ONLY:     edusync-api/crates/auth/src/roles.rs (CREATE)
               edusync-api/crates/auth/src/mod.rs (ADD)
               edusync-api/crates/models/src/user_role.rs (CREATE)
DEPENDENCY:    1C-02 (RBAC_POLICY defined)
```

**Functions:**

- `resolve_user_roles(pool, user_id, tenant_id)` → Vec<String>
- `resolve_all_memberships(pool, user_id)` → Vec<Membership>
- `get_primary_role(roles)` → String (priority: admin > principal > teacher > parent > student)

**CRITICAL:** Query `user_roles` table, NOT `profiles.role`

**Verify:** `cargo test -p auth -- roles`

---

### Tasks 1C-05 to 1C-08: RLS Guards

| Task  | Table                      | Description                                                              |
| ----- | -------------------------- | ------------------------------------------------------------------------ |
| 1C-05 | profiles                   | User can read/update own profile; admin can read all in tenant           |
| 1C-06 | user_roles                 | Users can read own roles; only admin can modify; prevent role escalation |
| 1C-07 | tenant_memberships/tenants | Users see only their tenants; only admin can modify tenant               |
| 1C-08 | sessions/refresh_tokens    | Users see/revoke only own sessions                                       |

**Guard structure:**

- `can_read_<table>()` → bool
- `can_write_<table>()` → bool
- Validation logic per table's RLS policy

**Verify:** `cargo test -p middleware -- guards`

---

### Task 1C-09: Sentry Integration

```
TASK ID:       1C-09
OWNER TYPE:    Rust backend agent
GOAL:          Integrate sentry-rust for error capture
EDIT ONLY:     edusync-api/Cargo.toml
               edusync-api/crates/api-server/src/main.rs
               edusync-api/crates/api-server/src/errors.rs
DEPENDENCY:    1A-4 (VilApp bootstrap)
```

**Setup:**

1. Init Sentry with DSN from env
2. Capture 5xx errors + panics
3. Add SentryLayer to VilApp

**Verify:** `cargo check && cargo test -p api-server`

---

### Task 1C-10: CSRF Protection

```
TASK ID:       1C-10
OWNER TYPE:    Rust backend agent
GOAL:          Configure CSRF with double-submit cookie pattern
EDIT ONLY:     edusync-api/crates/middleware/src/csrf.rs (CREATE)
               edusync-api/crates/middleware/src/mod.rs (ADD)
               edusync-api/crates/api-server/src/main.rs (APPLY)
DEPENDENCY:    1C-02
```

**Exempt paths:**

- `/api/v1/auth/login`
- `/api/v1/auth/register`
- `/api/v1/auth/refresh`
- `/api/v1/auth/callback/google`
- `/api/v1/auth/reset-password`
- `/api/v1/auth/update-password`
- `/api/v1/lti/*`
- `/api/v1/health`

**Verify:** POST to non-exempt without CSRF → 403; exempt → allowed

---

### Task 1C-11: Brute Force Protection

```
TASK ID:       1C-11
OWNER TYPE:    Rust backend agent
GOAL:          5 failed login → 15 min lockout per IP+email
EDIT ONLY:     edusync-api/crates/middleware/src/brute_force.rs (CREATE)
               edusync-api/crates/middleware/src/mod.rs (ADD)
               edusync-api/crates/api-server/src/auth/login.rs (INTEGRATE)
DEPENDENCY:    1C-02
```

**Config:**

- max_attempts: 5
- lockout_duration: 900s (15 min)
- tracking_window: 600s (10 min)
- key_format: `login:{client_ip}:{email}`

**Verify:** 5 wrong passwords → 6th returns 429; wait 15 min → login works

---

## Phase 1D: Auth Verification & Testing

### Task 1D-00: Seed Test Data

```
TASK ID:       1D-00
OWNER TYPE:    DB / setup agent
GOAL:          Create idempotent seed script with test data
EDIT ONLY:     edusync-api/tests/fixtures/seed_test_data.sql (CREATE)
               edusync-api/tests/fixtures/mod.rs (CREATE)
               edusync-api/scripts/seed-test-data.sh (CREATE)
DEPENDENCY:    All 1C tasks complete
```

**Creates:**

- 2 tenants: test-school-1, test-school-2
- 3 users: teacher/student/admin @edusync.dev (password: bcrypt 'password123')
- profiles linked to users
- user_roles: teacher→tenant1, student→tenant1, admin→tenant1+tenant2
- At least 1 enrollment for guard tests

**Verify:** `bash scripts/seed-test-data.sh` → all 3 accounts queryable

---

### Task 1D-01: Auth E2E Test Suite Foundation

```
TASK ID:       1D-01
OWNER TYPE:    Test agent
GOAL:          Create E2E test suite for auth endpoints
EDIT ONLY:     edusync-api/tests/auth_e2e.rs (CREATE)
               edusync-api/tests/common/mod.rs (CREATE)
DEPENDENCY:    1D-00
```

**Tests:**

- 3 dev accounts login → 200 + tokens
- Bootstrap returns correct shape
- Role resolution: teacher→teacher, student→student, admin→admin
- Invalid credentials → 401
- Expired token → 401

**Verify:** `cargo test --test auth_e2e -- --test-threads=1`

---

### Task 1D-02: Full Auth Cycle Test

```
TASK ID:       1D-02
OWNER TYPE:    Test agent
GOAL:          Test register → login → token refresh → MFA → logout
EDIT ONLY:     edusync-api/tests/auth_cycle_e2e.rs (CREATE)
DEPENDENCY:    1D-01
```

**Tests:**

- Register → login → bootstrap → signout → refresh token invalid
- Token refresh → rotation works
- MFA enroll → verify → session upgraded
- OAuth initiate → redirect URL to Google

**Verify:** `cargo test --test auth_cycle_e2e`

---

### Task 1D-03: Multi-Tenant Isolation Test

```
TASK ID:       1D-03
OWNER TYPE:    Security test agent
GOAL:          Verify user A cannot access tenant B data
EDIT ONLY:     edusync-api/tests/tenant_isolation_e2e.rs (CREATE)
DEPENDENCY:    1D-01, 1C-01
```

**Tests:**

- Bootstrap shows only own tenants
- User in tenant A cannot see courses from tenant B
- Forged tenant_id JWT → rejected (403)
- Admin in tenant A cannot read profiles from tenant B

**Verify:** `cargo test --test tenant_isolation_e2e`

---

### Task 1D-04: JWT Tampering & Security Tests

```
TASK ID:       1D-04
OWNER TYPE:    Security test agent
GOAL:          Verify JWT security: tampering, algorithm confusion, role escalation
EDIT ONLY:     edusync-api/tests/security_e2e.rs (CREATE)
DEPENDENCY:    1D-01
```

**Tests:**

- JWT with modified payload → 401
- JWT with "alg": "none" → 401
- JWT signed with wrong secret → 401
- Role escalation (student → admin) → 403
- Replay old refresh token → 401
- Rate limit on login → 429

**Verify:** `cargo test --test security_e2e`

---

### Task 1D-05: Parity Tests

```
TASK ID:       1D-05
OWNER TYPE:    Test agent
GOAL:          Compare Supabase vs VIL response shapes field-by-field
EDIT ONLY:     edusync-api/tests/parity_e2e.rs (CREATE)
DEPENDENCY:    1D-01, 1D-02
```

**Comparisons:**

- Login response keys
- Bootstrap profile + memberships shape
- Error response shape

**Verify:** Both endpoints return same structure (values differ, keys match)

---

### Task 1D-06: Shadow Mode Dry-Run

```
TASK ID:       1D-06
OWNER TYPE:    Rust backend agent
GOAL:          Duplicate auth requests to both Supabase + VIL, log diffs
EDIT ONLY:     edusync-api/crates/middleware/src/shadow.rs (CREATE)
               edusync-api/crates/middleware/src/mod.rs (ADD)
DEPENDENCY:    1D-05
```

**Config:** Enabled via `SHADOW_MODE=true` env var

**Behavior:** Fire-and-forget comparison, no user-facing impact

**Verify:** Shadow mode logs show match/mismatch counts

---

### Task 1D-07: Feature Flag Switch Test

```
TASK ID:       1D-07
OWNER TYPE:    Integration test agent
GOAL:          Verify `VITE_API_BACKEND=supabase` and `=vil` both work
EDIT ONLY:     edusync-api/tests/feature_flag_e2e.rs (CREATE)
DEPENDENCY:    1D-05, 1D-06
```

**Verify:** Switch between backends < 1 minute

---

### Task 1D-08: Cutover Drill

```
TASK ID:       1D-08
OWNER TYPE:    DevOps
GOAL:          Execute full cutover: switch to VIL → verify → rollback
EDIT ONLY:     edusync-api/docs/cutover-drill-results.md (CREATE)
               edusync-api/scripts/cutover-to-vil.sh (CREATE)
               edusync-api/scripts/rollback-to-supabase.sh (CREATE)
DEPENDENCY:    1D-07
```

**Script behavior:**

1. Update Nginx upstream
2. Reload Nginx
3. Smoke test (login + bootstrap)
4. Log timestamps

**Verify:** Cutover + rollback < 2 minutes total

---

### Task 1D-09: Auth Callback Redirect Verification

```
TASK ID:       1D-09
OWNER TYPE:    Integration test agent
GOAL:          Verify OAuth callback uses PATH routing (not hash)
EDIT ONLY:     edusync-api/tests/auth_callback_e2e.rs (CREATE)
               edusync-api/docs/routing-audit-results.md (CREATE)
DEPENDENCY:    1D-02
```

**Audit:**

- Router type (BrowserRouter vs HashRouter)
- OAuth callback path
- Post-login redirect

**Verify:** redirect_uri contains `/auth/callback`, NOT `/#/auth/callback`

---

### Task 1D-10: Auth Load Test

```
TASK ID:       1D-10
OWNER TYPE:    Test agent
GOAL:          k6 load test: 100 VU smoke test for auth endpoints
EDIT ONLY:     edusync-api/tests/load/auth_load_test.js (CREATE)
DEPENDENCY:    1D-08
```

**Scenario:**

- 100 virtual users
- Login → bootstrap → logout loop
- Measure p95 latency, error rate

**Verify:** Error rate < 1%, p95 < 500ms

---

## Gate 2 Decision Checklist

| #   | Criteria                                     | Task  | Status |
| --- | -------------------------------------------- | ----- | ------ |
| 1   | TenantGuard middleware deployed              | 1C-01 | ⬜     |
| 2   | RbacGuard with 5 roles configured            | 1C-02 | ⬜     |
| 3   | SET LOCAL replaces auth.uid()                | 1C-03 | ⬜     |
| 4   | Role resolution from user_roles table        | 1C-04 | ⬜     |
| 5   | RLS guards for profiles                      | 1C-05 | ⬜     |
| 6   | RLS guards for user_roles                    | 1C-06 | ⬜     |
| 7   | RLS guards for tenants                       | 1C-07 | ⬜     |
| 8   | RLS guards for sessions                      | 1C-08 | ⬜     |
| 9   | Sentry error capture working                 | 1C-09 | ⬜     |
| 10  | CSRF protection configured                   | 1C-10 | ⬜     |
| 11  | Brute force protection (5 attempts → 15 min) | 1C-11 | ⬜     |
| 12  | Test data seeded (3 accounts, 2 tenants)     | 1D-00 | ⬜     |
| 13  | 3 dev accounts login via VIL                 | 1D-01 | ⬜     |
| 14  | Full auth cycle (register→login→MFA→logout)  | 1D-02 | ⬜     |
| 15  | Password hash migration (bcrypt→argon2)      | 1D-02 | ⬜     |
| 16  | Multi-tenant isolation verified              | 1D-03 | ⬜     |
| 17  | JWT tampering rejected                       | 1D-04 | ⬜     |
| 18  | Parity tests pass                            | 1D-05 | ⬜     |
| 19  | Shadow mode logs no critical mismatches      | 1D-06 | ⬜     |
| 20  | Feature flag switch works both ways          | 1D-07 | ⬜     |
| 21  | Cutover drill: switch + rollback < 2 min     | 1D-08 | ⬜     |
| 22  | Auth callback routing verified               | 1D-09 | ⬜     |
| 23  | Auth load test baseline (100 VU)             | 1D-10 | ⬜     |

## Parallelism Map

| Wave      | Tasks                          | Est. Hours    |
| --------- | ------------------------------ | ------------- |
| 1C-α      | 1C-01 + 1C-02 + 1C-09          | 8-10          |
| 1C-β      | 1C-03 + 1C-04 + 1C-10 + 1C-11  | 8-10          |
| 1C-γ      | 1C-05 + 1C-06 + 1C-07 + 1C-08  | 10-14         |
| 1D-α      | 1D-00 (must complete first)    | 3-4           |
| 1D-β      | 1D-01 + 1D-04                  | 8-10          |
| 1D-γ      | 1D-02 + 1D-03                  | 8-10          |
| 1D-δ      | 1D-05 + 1D-09                  | 6-8           |
| 1D-ε      | 1D-06 → 1D-07 → 1D-08 (serial) | 8-10          |
| 1D-ζ      | 1D-10                          | 3-4           |
| **Total** | **24 tasks**                   | **63-80 jam** |
