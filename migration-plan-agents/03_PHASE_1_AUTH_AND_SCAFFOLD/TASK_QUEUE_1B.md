# TASK QUEUE — Phase 1B: Auth Implementation

**Week 14-20 | ~95-115 jam**

## Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** buat keputusan arsitektur baru — semua sudah locked di Spec 1
3. **Semua error response** harus match PostgREST format: `{ code, message, details, hint }`
4. **Role** datang dari `user_roles` table, **BUKAN** `profiles.role`
5. **Password hash**: dual-format wajib (Argon2 + bcrypt fallback)
6. **`get_auth_bootstrap`** harus return shape **IDENTIK** dengan Supabase version
7. Jalankan `cargo check && cargo test` setelah setiap task
8. **JANGAN** ubah frontend files — Phase 1B hanya backend Rust
9. Jika ketemu gap yang belum di-spec → **BLOCKED**, bukan improvisasi
10. **🛠️ Rollback rule:** Commit SEBELUM mulai task: `git add -A && git commit -m "checkpoint: before task 1B-XX"`
11. **🛠️ Transaction wrapping:** Setiap handler yang INSERT ke >1 table WAJIB wrapped dalam transaction
12. **🛠️ Nginx route update:** Semua auth endpoints (`/api/v1/auth/*`) HARUS ditambahkan ke `nginx.conf` (Task 1B-24)

## Effort Estimate & Parallelism

| Wave            | Tasks                                    | Effort  | Parallelizable?      |
| --------------- | ---------------------------------------- | ------- | -------------------- |
| Pre-flight      | 1B-00 (schema audit)                     | ~2 jam  | ❌ Serial            |
| Foundation      | 1B-01 → 1B-05                            | ~25 jam | ❌ Serial (chained)  |
| Core Auth       | 1B-06, 1B-07, 1B-08, 1B-09               | ~15 jam | ✅ 4 agents parallel |
| RPCs + Security | 1B-10, 1B-11, 1B-12                      | ~12 jam | ✅ 3 agents parallel |
| Advanced Auth   | 1B-13, 1B-14, 1B-15, 1B-16               | ~20 jam | ✅ 4 agents parallel |
| Tenant RPCs     | 1B-17, 1B-18, 1B-19, 1B-20, 1B-21, 1B-22 | ~12 jam | ✅ 6 agents parallel |
| Infra           | 1B-24, 1B-25                             | ~4 jam  | ✅ 2 agents parallel |
| Verification    | 1B-23 (integration tests)                | ~8 jam  | ❌ Serial (gate)     |

## Dependency Graph

```
1B-00 (schema audit — PRE-FLIGHT BLOCKER)
  │
  └─ 1B-01 (auth.users migration SQL)
       │
       ├─ 1B-02 (error types)
       │    │
       │    ├─ 1B-03 (password hashing)
       │    │    │
       │    │    ├─ 1B-04 (JWT issuance)
       │    │    │    │
       │    │    │    ├─ 1B-05 (session management)
       │    │    │    │    │
       │    │    │    │    ├─ 1B-06 (register)
       │    │    │    │    ├─ 1B-07 (login)
       │    │    │    │    ├─ 1B-08 (signout)
       │    │    │    │    └─ 1B-09 (refresh)
       │    │    │    │
       │    │    │    ├─ 1B-10 (get_auth_bootstrap) ← PALING KRITIS
       │    │    │    ├─ 1B-11 (ensure_profile_exists)
       │    │    │    └─ 1B-12 (rate limit + brute force)
       │    │    │
       │    │    └─ 1B-13 (forgot/reset password)
       │    │
       │    ├─ 1B-14 (email verification)
       │    └─ 1B-15 (OAuth Google PKCE)
       │
       ├─ 1B-16 (MFA TOTP + recovery codes)
       │
       ├─ 1B-17 (accept_invitation)
       ├─ 1B-18 (validate_invitation)
       ├─ 1B-19 (enroll_student)
       ├─ 1B-20 (public_lookup_class)
       ├─ 1B-21 (onboard_student)
       ├─ 1B-22 (create_school_tenant)
       │
       ├─ 1B-24 (Nginx route update)
       ├─ 1B-25 (email wiring)
       │
       └─ 1B-23 (integration tests)
```

## Tasks

### Task 1B-00: Schema Audit & Bootstrap Verification

```
TASK ID:       1B-00
OWNER TYPE:    Database / SQL Agent
GOAL:          Audit actual DB schema + capture get_auth_bootstrap output
EDIT ONLY:     edusync-api/docs/schema-audit.md (new)
DEPENDENCY:    None (PRE-FLIGHT)
```

**Verify tables exist and document columns:**

- `tenant_memberships`
- `user_roles`
- `profiles`
- `tenants`
- `invitations`
- `classes`
- `enrollments`

**CRITICAL:** Capture exact `get_auth_bootstrap` output shape

**Verify:** All table schemas documented, bootstrap RPC output captured

---

### Task 1B-01: `auth.users` Schema Migration SQL

```
TASK ID:       1B-01
OWNER TYPE:    Database / SQL Agent
GOAL:          Create public.users table, sync trigger, replacement functions
EDIT ONLY:     edusync-api/migrations/001_create_users_table.sql
               edusync-api/migrations/002_auth_replacement_functions.sql
DEPENDENCY:    1B-00
```

**Creates:**

- `public.users` table
- `public.refresh_tokens` table
- `public.password_reset_tokens` table
- `public.mfa_factors` table
- `public.sync_auth_to_public_users()` trigger
- `public.current_user_id()`, `current_user_jwt()`, `current_user_role()`, `current_tenant_id()` functions

**Verify:** Backup → dry-run → execute → verify counts match

---

### Task 1B-02: Auth Error Types

```
TASK ID:       1B-02
OWNER TYPE:    Rust Coding Agent
GOAL:          Create error types matching PostgREST format
EDIT ONLY:     edusync-api/crates/auth/src/error.rs (new)
               edusync-api/crates/auth/src/lib.rs
DEPENDENCY:    1B-01
```

**Error variants:** EmailAlreadyExists, InvalidEmail, WeakPassword, InvalidCredentials, UserNotFound, EmailNotConfirmed, UserBanned, TokenExpired, MfaRequired, TenantMismatch, TooManyRequests, etc.

**Format:** `{ code, message, details, hint }`

**Verify:** `cargo check -p auth && cargo test -p auth`

---

### Task 1B-03: Password Hashing — Dual Format

```
TASK ID:       1B-03
OWNER TYPE:    Rust Coding Agent
GOAL:          Implement Argon2 + bcrypt dual-format verification
EDIT ONLY:     edusync-api/crates/auth/src/password.rs (new)
               edusync-api/crates/auth/src/lib.rs
DEPENDENCY:    1B-02
```

**Functions:**

- `hash_password(plain)` → Argon2 (VIL standard)
- `verify_password(plain, hash)` → try Argon2 first, fallback bcrypt
- `maybe_rehash(pool, user_id, plain, current_hash)` → re-hash bcrypt → Argon2 on login

**Verify:** `cargo test -p auth -- password`

---

### Task 1B-04: JWT Issuance

```
TASK ID:       1B-04
OWNER TYPE:    Rust Coding Agent
GOAL:          Implement JWT encode/decode with custom claims
EDIT ONLY:     edusync-api/crates/auth/src/jwt.rs
               edusync-api/crates/auth/src/lib.rs
DEPENDENCY:    1B-03
```

**Claims:** `sub` (user_id), `email`, `roles[]`, `tenant_id`, `exp`, `iat`, `mfa_verified`

**Tokens:**

- Access token: 1 hour expiry
- Refresh token: 30 day expiry

**Verify:** `cargo test -p auth -- jwt`

---

### Task 1B-05: Session Management

```
TASK ID:       1B-05
OWNER TYPE:    Rust Coding Agent
GOAL:          Implement refresh token persistence layer
EDIT ONLY:     edusync-api/crates/auth/src/session.rs (new)
               edusync-api/crates/auth/src/lib.rs
DEPENDENCY:    1B-04
```

**Functions:**

- `create_session()` → tokens + store hash in DB
- `refresh_session()` → rotation + reuse detection
- `revoke_session()` → mark revoked
- `revoke_all_user_sessions()` → for password reset

**Token hash:** SHA-256 (not stored raw)

**Verify:** `cargo check -p auth && cargo test -p auth -- session`

---

### Task 1B-06: Register Endpoint

```
TASK ID:       1B-06
OWNER TYPE:    Rust Coding Agent
GOAL:          POST /api/v1/auth/register
EDIT ONLY:     edusync-api/crates/api-server/src/auth/register.rs (new)
               edusync-api/crates/api-server/src/auth/mod.rs
               edusync-api/crates/api-server/src/auth/types.rs (new)
DEPENDENCY:    1B-05
```

**Flow:**

1. Validate email format + password strength
2. Check email uniqueness
3. Hash password (Argon2)
4. Insert into `public.users`
5. Ensure profile exists
6. Get roles from `user_roles` table
7. Get default tenant
8. Create session
9. Return AuthResponse

**Transaction:** Required for multi-table inserts

**Verify:** `cargo check && curl POST /api/v1/auth/register`

---

### Task 1B-07: Login Endpoint

```
TASK ID:       1B-07
OWNER TYPE:    Rust Coding Agent
GOAL:          POST /api/v1/auth/login
EDIT ONLY:     edusync-api/crates/api-server/src/auth/login.rs (new)
               edusync-api/crates/api-server/src/auth/mod.rs
DEPENDENCY:    1B-05
```

**Flow:**

1. Find user by email
2. Check `banned_until`
3. Verify password (dual-format, triggers rehash if bcrypt)
4. Get roles from `user_roles`
5. Get default tenant
6. Check MFA enrollment
7. Create session (with/without mfa_verified)
8. Update `last_sign_in_at`

**Verify:** Login with 3 dev accounts (bcrypt hashes)

---

### Task 1B-08: SignOut Endpoint

```
TASK ID:       1B-08
OWNER TYPE:    Rust Coding Agent
GOAL:          POST /api/v1/auth/signout
EDIT ONLY:     edusync-api/crates/api-server/src/auth/signout.rs (new)
               edusync-api/crates/api-server/src/auth/mod.rs
DEPENDENCY:    1B-05
```

**Behavior:** Always returns 204 (even if token invalid)

**Verify:** `curl -X POST /api/v1/auth/signout` → 204

---

### Task 1B-09: Token Refresh Endpoint

```
TASK ID:       1B-09
OWNER TYPE:    Rust Coding Agent
GOAL:          POST /api/v1/auth/refresh
EDIT ONLY:     edusync-api/crates/api-server/src/auth/refresh.rs (new)
               edusync-api/crates/api-server/src/auth/mod.rs
DEPENDENCY:    1B-05
```

**Flow:**

1. Verify refresh token JWT
2. Check token not revoked
3. Load user data
4. Rotate tokens (old revoked, new created)
5. Return AuthResponse

**Verify:** Login → get refresh token → refresh → old token revoked

---

### Task 1B-10: `get_auth_bootstrap` RPC — PALING KRITIS

```
TASK ID:       1B-10
OWNER TYPE:    Rust Coding Agent
GOAL:          GET /api/v1/auth/bootstrap — PALING KRITIS
EDIT ONLY:     edusync-api/crates/api-server/src/auth/bootstrap.rs (new)
               edusync-api/crates/api-server/src/auth/mod.rs
DEPENDENCY:    1B-04
```

**Response shape MUST match Supabase exactly:**

```json
{
  "profile": {
    "id": "uuid",
    "email": "string",
    "first_name": "string|null",
    "last_name": "string|null",
    "avatar_url": "string|null",
    "tenant_id": "uuid|null"
  },
  "memberships": [
    {
      "tenant_id": "uuid",
      "tenant_name": "string",
      "tenant_logo": "string|null",
      "tenant_slug": "string",
      "role": "student|teacher|admin|parent|principal",
      "status": "string",
      "is_active": "boolean",
      "joined_at": "ISO-8601"
    }
  ],
  "default_tenant_id": "uuid|null"
}
```

**CRITICAL:** Role from `user_roles` table, NOT `profiles.role`

**Verify:** Compare output with Supabase `get_auth_bootstrap()` RPC

---

### Task 1B-11: `ensure_profile_exists` RPC

```
TASK ID:       1B-11
OWNER TYPE:    Rust Coding Agent
GOAL:          POST /api/v1/auth/ensure-profile
EDIT ONLY:     edusync-api/crates/api-server/src/auth/ensure_profile.rs (new)
               edusync-api/crates/api-server/src/auth/mod.rs
DEPENDENCY:    1B-10
```

**Flow:** UPSERT into `profiles` on login

---

### Task 1B-12: Rate Limiting

```
TASK ID:       1B-12
OWNER TYPE:    Rust Coding Agent
GOAL:          Configure VIL RateLimit per auth endpoint
EDIT ONLY:     edusync-api/crates/middleware/src/rate_limit.rs
               edusync-api/crates/middleware/src/lib.rs
DEPENDENCY:    1B-07
```

**Limits:**

- login: 10/min per IP
- register: 5/min per IP
- refresh: 30/min per user
- reset: 3/5min per IP
- mfa: 10/min per user

---

### Task 1B-13: Forgot/Reset Password

```
TASK ID:       1B-13
OWNER TYPE:    Rust Coding Agent
GOAL:          POST /api/v1/auth/reset-password + POST /api/v1/auth/update-password
EDIT ONLY:     edusync-api/crates/api-server/src/auth/reset_password.rs (new)
               edusync-api/crates/api-server/src/auth/mod.rs
DEPENDENCY:    1B-01
```

**reset-password:** Always returns 200 (prevent email enumeration)

**update-password:** Validate token → update hash → invalidate sessions → return new session

---

### Task 1B-14: Email Verification

```
TASK ID:       1B-14
OWNER TYPE:    Rust Coding Agent
GOAL:          POST /api/v1/auth/verify-email + email sending
EDIT ONLY:     edusync-api/crates/services/src/email.rs (new)
               edusync-api/crates/api-server/src/auth/verify_email.rs (new)
               edusync-api/crates/api-server/src/auth/mod.rs
DEPENDENCY:    1B-13
```

**Email templates (Bahasa Indonesia):**

- Verification email
- Password reset email

**Verify:** Email sent (or console log in dev)

---

### Task 1B-15: Google OAuth PKCE

```
TASK ID:       1B-15
OWNER TYPE:    Rust Coding Agent
GOAL:          GET /api/v1/auth/oauth/google + GET /api/v1/auth/callback/google
EDIT ONLY:     edusync-api/crates/api-server/src/auth/oauth.rs (new)
               edusync-api/crates/api-server/src/auth/mod.rs
DEPENDENCY:    1B-14
```

**Callback routing:** Uses PATH `/auth/callback` (NOT hash)

---

### Task 1B-16: MFA TOTP

```
TASK ID:       1B-16
OWNER TYPE:    Rust Coding Agent
GOAL:          POST /api/v1/auth/mfa/enroll + /verify + DELETE
EDIT ONLY:     edusync-api/crates/api-server/src/auth/mfa.rs (new)
               edusync-api/crates/api-server/src/auth/mod.rs
DEPENDENCY:    1B-07
```

**Features:**

- Generate TOTP secret + QR code
- 10 recovery codes
- Enroll → verify → upgrade session
- Unenroll

---

### Tasks 1B-17 to 1B-22: Tenant RPCs

| Task  | Endpoint                             | Description                    |
| ----- | ------------------------------------ | ------------------------------ |
| 1B-17 | POST /api/v1/auth/accept-invitation  | Accept teacher/admin invite    |
| 1B-18 | GET /api/v1/auth/validate-invitation | Check invite validity (public) |
| 1B-19 | POST /api/v1/auth/enroll-student     | Join class via join code       |
| 1B-20 | GET /api/v1/auth/lookup-class        | Lookup class by code (public)  |
| 1B-21 | POST /api/v1/auth/onboard-student    | Register + enroll in one step  |
| 1B-22 | POST /api/v1/auth/create-tenant      | Create new school tenant       |

**All require transaction wrapping for multi-table inserts**

---

### Task 1B-23: Integration Tests

```
TASK ID:       1B-23
OWNER TYPE:    Rust Test Agent
GOAL:          Comprehensive integration tests — GATE 2 verification
EDIT ONLY:     edusync-api/tests/auth_integration.rs (new)
DEPENDENCY:    All above
```

**Must test:**

- Register → login → bootstrap → profile cycle
- bcrypt password migration
- Token refresh + rotation
- Signout + token revocation
- 3 dev accounts login
- Error response shape
- Role resolution (user_roles)
- `get_auth_bootstrap` parity

**Verify:** `cargo test --test auth_integration` — ALL tests must pass

---

### Task 1B-24: Nginx Route Update

```
TASK ID:       1B-24
OWNER TYPE:    DevOps
GOAL:          Add all /api/v1/auth/* routes to nginx.conf
EDIT ONLY:     edusync-api/nginx.conf
DEPENDENCY:    All auth endpoints implemented
```

---

### Task 1B-25: Email Wiring

```
TASK ID:       1B-25
OWNER TYPE:    Rust Agent
GOAL:          Wire email sending into register + reset flows
EDIT ONLY:     Auth handlers
DEPENDENCY:    1B-14
```

## Gate 2 Checklist

- [ ] Register/login works (email + password)
- [ ] Google OAuth works (PKCE + path routing redirect)
- [ ] MFA works (TOTP enroll/verify/unenroll)
- [ ] Token refresh works
- [ ] Password hash compat (bcrypt + Argon2)
- [ ] 3 dev accounts login (teacher/student/admin @edusync.dev)
- [ ] `get_auth_bootstrap` response IDENTICAL to Supabase
- [ ] Error response shape IDENTICAL to PostgREST format
- [ ] Forgot/reset password flow complete
- [ ] `cargo test` — all auth tests pass
- [ ] `cargo clippy` — no warnings in auth crates
