# Agent Task Queue — Phase 1B

<aside>
🔐

**Untuk AI Coding Agents — Phase 1B: Auth Implementation (Week 14-20).** Setiap task adalah **self-contained** — agent tinggal copas kode dan execute. Task dikerjakan **berurutan** kecuali ditandai parallelizable.

</aside>

<aside>
📚

**Source of Truth (LOCKED — jangan override):**

1. Spec 1: Auth & Session Parity Contract
2. Phase 1 Detail (Week 11-22)
3. Spec 4: Infrastructure Gaps (#2 password reset, #3 auth.\* SQL, #6 email templates)
4. Agent Bootstrap Context — VIL framework reference
5. Gap Analysis — 10 codebase findings
6. Multi-Agent Execution Model — task format & rules

</aside>

---

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
10. **JANGAN** ubah `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`
11. **🛠️ Rollback rule (Gap #9):** Commit SEBELUM mulai task: `git add -A && git commit -m "checkpoint: before task 1B-XX"`. Jika verify gagal di tengah: `git stash` atau `git checkout -- <files>`. JANGAN lanjut dengan state setengah jadi.
12. **🛠️ Transaction wrapping (Gap #3):** Setiap handler yang INSERT ke >1 table WAJIB wrapped dalam `BEGIN/COMMIT` (Rust: `pool.begin()` → `tx.commit()`). Ini berlaku untuk: register (1B-06), accept_invitation (1B-17), enroll_student (1B-19), onboard_student (1B-21), create_school_tenant (1B-22).
13. **🛠️ Nginx route update (Gap #5):** Semua auth endpoints (`/api/v1/auth/*`) HARUS ditambahkan ke `nginx.conf`. Task 1B-24 sudah ada untuk ini — pastikan mencakup SEMUA routes dari 1B-06 sampai 1B-22.

<aside>
📝

**Source of Truth:** **6 Execution Contracts** di [Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](../Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20%20ace54d0159584b0c8330eaad52e6e05b.md). **Contract 2 (Auth State Side-Effects Matrix)** adalah Gate 2 deliverable. SEMUA side-effects di matrix itu harus lulus sebelum auth cutover. Contract 6 (Cutover Rehearsal) = full auth cycle test wajib sebelum Gate 2.

</aside>

---

## Dependency Graph

```
1B-00 (schema audit — PRE-FLIGHT BLOCKER) ← 🛠️ FIX Gap #2, #3
  │
  └─ 1B-01 (auth.users migration SQL) ← 🛠️ FIX Gap #5 (backup/rollback)
       │
       ├─ 1B-02 (error types) ← 🛠️ FIX Gap #6 (no catch-all)
       │    │
       │    ├─ 1B-03 (password hashing)
       │    │    │
       │    │    ├─ 1B-04 (JWT issuance)
       │    │    │    │
       │    │    │    ├─ 1B-05 (session management)
       │    │    │    │    │
       │    │    │    │    ├─ 1B-06 (register) ← 🛠️ FIX Gap #1 (transaction)
       │    │    │    │    ├─ 1B-07 (login) ← 🛠️ FIX Gap #7 (email_confirmed check)
       │    │    │    │    ├─ 1B-08 (signout)
       │    │    │    │    └─ 1B-09 (refresh)
       │    │    │    │
       │    │    │    ├─ 1B-10 (get_auth_bootstrap) ← PALING KRITIS
       │    │    │    ├─ 1B-11 (ensure_profile_exists)
       │    │    │    └─ 1B-12 (rate limit + brute force) ← 🛠️ FIX Gap #4
       │    │    │
       │    │    └─ 1B-13 (forgot/reset password)
       │    │
       │    ├─ 1B-14 (email verification)
       │    └─ 1B-15 (OAuth Google PKCE) ← 🛠️ FIX Gap #10 (PKCE store)
       │
       ├─ 1B-16 (MFA TOTP + recovery codes) ← 🛠️ FIX Gap #13
       │
       ├─ 1B-17 (accept_invitation) ← 🛠️ FIX Gap #1 (transaction)
       ├─ 1B-18 (validate_invitation)
       ├─ 1B-19 (enroll_student) ← 🛠️ FIX Gap #1 (transaction)
       ├─ 1B-20 (public_lookup_class)
       ├─ 1B-21 (onboard_student) ← 🛠️ FIX Gap #1 (transaction)
       ├─ 1B-22 (create_school_tenant) ← 🛠️ FIX Gap #1 (transaction)
       │
       ├─ 1B-24 (Nginx route update) ← 🛠️ FIX Gap #8 (NEW)
       ├─ 1B-25 (email wiring) ← 🛠️ FIX Gap #12 (NEW)
       │
       └─ 1B-23 (integration tests) ← 🛠️ FIX Gap #14 (full coverage)
```

---

<aside>
⚠️

**GAP FIXES APPLIED (15 items dari review):** Semua gap di bawah sudah di-address langsung di task yang relevan. Lihat tag `🛠️ FIX` di setiap task yang diubah.

</aside>

## Effort Estimate & Parallelism Map

<aside>
⏱️

**Total effort: ~95-115 jam** (~6-7 minggu part-time 15-20 jam/minggu)
**Serial critical path:** 1B-00 → 1B-01 → 1B-02 → 1B-03 → 1B-04 → 1B-05 (~25 jam)
**Parallel wave 1 (after 1B-05):** 1B-06 / 1B-07 / 1B-08 / 1B-09 (~15 jam, 4 agents)

</aside>

| **Wave**        | **Tasks**                                  | **Effort** | **Parallelizable?**      |
| --------------- | ------------------------------------------ | ---------- | ------------------------ |
| Pre-flight      | 1B-00 (schema audit)                       | ~2 jam     | ❌ Serial (blocker)      |
| Foundation      | 1B-01 → 1B-02 → 1B-03 → 1B-04 → 1B-05      | ~25 jam    | ❌ Serial (chained deps) |
| Core Auth       | 1B-06, 1B-07, 1B-08, 1B-09                 | ~15 jam    | ✅ 4 agents parallel     |
| RPCs + Security | 1B-10, 1B-11, 1B-12                        | ~12 jam    | ✅ 3 agents parallel     |
| Advanced Auth   | 1B-13, 1B-14, 1B-15, 1B-16                 | ~20 jam    | ✅ 4 agents parallel     |
| Tenant RPCs     | 1B-17, 1B-18, 1B-19, 1B-20, 1B-21, 1B-22   | ~12 jam    | ✅ 6 agents parallel     |
| Infra           | 1B-24 (Nginx routes), 1B-25 (email wiring) | ~4 jam     | ✅ 2 agents parallel     |
| Verification    | 1B-23 (integration tests)                  | ~8 jam     | ❌ Serial (gate)         |

---

## Task 1B-00: Schema Audit & Bootstrap Shape Verification (PRE-FLIGHT)

<aside>
🛠️

**🛠️ FIX Gap #2, #3:** Task baru — verifikasi schema tables + bootstrap RPC shape SEBELUM menulis kode apapun.

</aside>

**TASK ID:** `1B-00`

**OWNER TYPE:** Database / SQL Agent

**GOAL:** Audit actual DB schema untuk semua tables yang diasumsikan oleh Phase 1B tasks + capture exact output shape dari `get_auth_bootstrap` Supabase RPC.

**READ FIRST:**

- Spec 1 §2 (`get_auth_bootstrap` RPC Contract)
- Gap Analysis (all 10 findings)

**EDIT ONLY:**

- `edusync-api/docs/schema-audit.md` (buat baru)

**DO NOT TOUCH:**

- Database schema (read-only audit)
- Any Rust code

**IMPLEMENTATION STEPS:**

1. Verify `tenant_memberships` table exists: `\d tenant_memberships`
   - Jika TIDAK ada: cari alternatif (`\dt *tenant*`, `\dt *member*`)
   - Document actual table name dan columns
2. Verify `user_roles` table: `\d user_roles`
   - Document: apakah punya `tenant_id` column? (beberapa tasks assume per-tenant roles)
3. Verify `profiles` table: `\d profiles`
   - Document: `first_name` vs `full_name`? `avatar_url`? `tenant_id`?
4. Verify `tenants` table: `\d tenants`
   - Document: `logo`? `slug`? `name`?
5. Verify `invitations` table: `\d invitations`
6. Verify `classes` table: `\d classes`
   - Document: `join_code`? `teacher_id`? `is_active`?
7. Verify `enrollments` table: `\d enrollments`
   - Document: `user_id` or `student_id`?
8. **CRITICAL:** Capture exact `get_auth_bootstrap` output:

```sql
-- Run as authenticated user (teacher@edusync.dev)
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"<teacher_uuid>","email":"teacher@edusync.dev"}';
SELECT * FROM get_auth_bootstrap();
```

1. Document the exact JSON shape returned
2. Compare with Spec 1 §2 — note ANY field differences

**VERIFY:**

```
cat edusync-api/docs/schema-audit.md
# Must contain: table schemas for all 7 tables + bootstrap RPC output
```

**STOP IF:**

- `get_auth_bootstrap` function doesn't exist (BLOCKED — need to find actual RPC name)
- `tenant_memberships` table doesn't exist AND no alternative found (BLOCKED — rewrite all queries)
- Cannot connect to Supabase DB

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-01: `auth.users` Schema Migration SQL

**TASK ID:** `1B-01`

**OWNER TYPE:** Database / SQL Agent

**GOAL:** Buat migration SQL: copy Supabase `auth.users` → `public.users`, sync trigger dual-running, replacement functions untuk `auth.uid()`/`auth.jwt()`, tabel pendukung auth.

**READ FIRST:**

- Phase 1 Detail §Week 14 Day 5 (`auth.users` migration plan)
- Spec 4 §3 (`auth.*` SQL functions migration)
- Spec 1 §2 (`get_auth_bootstrap` response shape)

**EDIT ONLY:**

- `edusync-api/migrations/001_create_users_table.sql`
- `edusync-api/migrations/002_auth_replacement_functions.sql`

**DO NOT TOUCH:**

- Supabase `auth.users` table structure
- `public.profiles` table structure
- Existing Supabase migration files under `supabase/migrations/`

**IMPLEMENTATION STEPS:**

1. Buat `public.users` table dengan kolom dari `auth.users` yang dibutuhkan
2. Buat INSERT…SELECT copy data dari `auth.users`
3. Buat sync trigger `trg_sync_auth_users` untuk dual-running period
4. Buat `public.refresh_tokens` table (token_hash, user_id, expires_at, revoked_at)
5. Buat `public.password_reset_tokens` table (token_hash, user_id, expires_at, used_at)
6. Buat `public.mfa_factors` table (user_id, factor_type, secret_encrypted, recovery_codes, verified_at)
7. Buat replacement functions: `current_user_id()`, `current_user_jwt()`, `current_user_role()`, `current_tenant_id()`

**COPY-PASTE STARTER:**

```sql
-- 001_create_users_table.sql
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    email_confirmed_at TIMESTAMPTZ,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sign_in_at TIMESTAMPTZ,
    raw_app_meta_data JSONB DEFAULT '{}',
    raw_user_meta_data JSONB DEFAULT '{}',
    is_sso_user BOOLEAN DEFAULT FALSE,
    banned_until TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

INSERT INTO public.users (
    id, email, password_hash, email_confirmed_at, phone,
    created_at, updated_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, is_sso_user
) SELECT
    id, email, encrypted_password, email_confirmed_at, phone,
    created_at, updated_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, is_sso_user
FROM auth.users ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_auth_to_public_users()
RETURNS TRIGGER AS $$ BEGIN
    INSERT INTO public.users (id, email, password_hash, email_confirmed_at,
        phone, created_at, updated_at, last_sign_in_at,
        raw_app_meta_data, raw_user_meta_data, is_sso_user)
    VALUES (NEW.id, NEW.email, NEW.encrypted_password,
        NEW.email_confirmed_at, NEW.phone, NEW.created_at,
        NEW.updated_at, NEW.last_sign_in_at,
        NEW.raw_app_meta_data, NEW.raw_user_meta_data, NEW.is_sso_user)
    ON CONFLICT (id) DO UPDATE SET
        email=EXCLUDED.email, password_hash=EXCLUDED.password_hash,
        email_confirmed_at=EXCLUDED.email_confirmed_at,
        updated_at=EXCLUDED.updated_at;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_auth_users
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_auth_to_public_users();

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    replaced_by UUID REFERENCES public.refresh_tokens(id)
);
CREATE INDEX idx_rt_user ON public.refresh_tokens(user_id);
CREATE INDEX idx_rt_hash ON public.refresh_tokens(token_hash);

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mfa_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    factor_type TEXT NOT NULL DEFAULT 'totp',
    friendly_name TEXT,
    secret_encrypted TEXT NOT NULL,
    recovery_codes JSONB,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_mfa_user ON public.mfa_factors(user_id);
```

```sql
-- 002_auth_replacement_functions.sql
-- VIL sets these per-request via SET LOCAL in middleware
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
    SELECT current_setting('app.current_user_id', true)::UUID;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.current_user_jwt()
RETURNS JSONB AS $$
    SELECT current_setting('app.current_user_jwt', true)::JSONB;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
    SELECT current_setting('app.current_user_role', true);
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
    SELECT current_setting('app.current_tenant_id', true)::UUID;
$$ LANGUAGE SQL STABLE;
```

<aside>
🛠️

**🛠️ FIX Gap #5:** Tambah backup + dry-run + rollback steps sebelum migration.

</aside>

**VERIFY:**

```
# Step 1: BACKUP (wajib sebelum migration)
pg_dump -t auth.users -f backup_auth_users.sql

# Step 2: DRY-RUN (verify tanpa commit)
psql -c "BEGIN; \i edusync-api/migrations/001_create_users_table.sql; ROLLBACK;"

# Step 3: EXECUTE (jika dry-run OK)
psql -f edusync-api/migrations/001_create_users_table.sql
psql -f edusync-api/migrations/002_auth_replacement_functions.sql

# Step 4: VERIFY
SELECT COUNT(*) FROM public.users;  -- Should match auth.users
SELECT current_user_id();           -- NULL (no SET LOCAL yet)
```

**ROLLBACK SCRIPT** (jika migration gagal):

```sql
DROP TRIGGER IF EXISTS trg_sync_auth_users ON auth.users;
DROP FUNCTION IF EXISTS public.sync_auth_to_public_users();
DROP TABLE IF EXISTS public.mfa_factors CASCADE;
DROP TABLE IF EXISTS public.password_reset_tokens CASCADE;
DROP TABLE IF EXISTS public.refresh_tokens CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
```

**STOP IF:**

- `auth.users` schema tidak bisa di-access (permission denied)
- `profiles.id` FK constraint conflict
- Ada extension dependency yang belum di-audit (Spec 4 §5)

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-02: VIL Auth Error Types & Response Format

**TASK ID:** `1B-02`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** Buat error types Rust yang serialize ke PostgREST-compatible JSON `{ code, message, details, hint }`. Frontend `handleSupabaseError()` depends on shape ini.

**READ FIRST:**

- Spec 1 §8 (Error Response Shape Contract)
- Agent Bootstrap Context §2 (VIL Handler Pattern)

**EDIT ONLY:**

- `edusync-api/crates/auth/src/error.rs`
- `edusync-api/crates/auth/src/lib.rs` (tambah `pub mod error;`)

**DO NOT TOUCH:**

- Frontend `supabaseUtils.ts`
- Crate lain selain `auth`

**IMPLEMENTATION STEPS:**

1. Define `AuthError` enum dengan semua auth error variants
2. Implement `IntoResponse` untuk serialize ke PostgREST JSON
3. Map HTTP status codes per variant
4. Semua `message` field dalam Bahasa Indonesia

**COPY-PASTE STARTER:**

```rust
// crates/auth/src/error.rs
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub code: String,
    pub message: String,
    pub details: Option<String>,
    pub hint: Option<String>,
}

#[derive(Debug)]
pub enum AuthError {
    EmailAlreadyExists,
    InvalidEmail,
    WeakPassword,
    InvalidCredentials,
    UserNotFound,
    EmailNotConfirmed,
    UserBanned,
    InvalidToken,
    TokenExpired,
    RefreshTokenNotFound,
    RefreshTokenRevoked,
    MfaRequired,
    MfaInvalidCode,
    MfaFactorNotFound,
    MfaAlreadyEnrolled,
    OAuthCallbackError(String),
    OAuthStateInvalid,
    ResetTokenInvalid,
    ResetTokenExpired,
    ResetTokenUsed,
    TooManyRequests(String),
    TenantNotFound,
    TenantAccessDenied,
    InsufficientPermissions,
    InternalError(String),
    DatabaseError(String),
    ValidationError(String),
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let status = match &self {
            Self::EmailAlreadyExists | Self::MfaAlreadyEnrolled => StatusCode::CONFLICT,
            Self::InvalidEmail | Self::WeakPassword
            | Self::ValidationError(_) | Self::OAuthCallbackError(_) => StatusCode::BAD_REQUEST,
            Self::InvalidCredentials | Self::UserNotFound | Self::EmailNotConfirmed
            | Self::InvalidToken | Self::TokenExpired | Self::RefreshTokenRevoked
            | Self::MfaInvalidCode | Self::OAuthStateInvalid
            | Self::ResetTokenInvalid | Self::ResetTokenExpired
            | Self::ResetTokenUsed => StatusCode::UNAUTHORIZED,
            Self::UserBanned | Self::MfaRequired
            | Self::InsufficientPermissions | Self::TenantAccessDenied => StatusCode::FORBIDDEN,
            Self::RefreshTokenNotFound | Self::MfaFactorNotFound
            | Self::TenantNotFound => StatusCode::NOT_FOUND,
            Self::TooManyRequests(_) => StatusCode::TOO_MANY_REQUESTS,
            Self::InternalError(_) | Self::DatabaseError(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };
        let body = match &self {
            Self::InvalidCredentials => ErrorResponse {
                code: "invalid_credentials".into(),
                message: "Email atau password salah".into(),
                details: None, hint: None,
            },
            Self::EmailAlreadyExists => ErrorResponse {
                code: "email_exists".into(),
                message: "Email sudah terdaftar".into(),
                details: None,
                hint: Some("Gunakan email lain atau login".into()),
            },
            Self::TokenExpired | Self::InvalidToken => ErrorResponse {
                code: "token_expired".into(),
                message: "Sesi telah berakhir".into(),
                details: None,
                hint: Some("Silakan login kembali".into()),
            },
            Self::MfaRequired => ErrorResponse {
                code: "mfa_required".into(),
                message: "Verifikasi MFA diperlukan".into(),
                details: None,
                hint: Some("Masukkan kode dari authenticator app".into()),
            },
            Self::TooManyRequests(msg) => ErrorResponse {
                code: "too_many_requests".into(),
                message: msg.clone(),
                details: None, hint: None,
            },
            // ... implement ALL remaining variants
            _ => ErrorResponse {
                code: "internal_error".into(),
                message: "Terjadi kesalahan internal".into(),
                details: None, hint: None,
            },
        };
        (status, Json(body)).into_response()
    }
}

impl From<sqlx::Error> for AuthError {
    fn from(e: sqlx::Error) -> Self {
        AuthError::DatabaseError(e.to_string())
    }
}
```

**VERIFY:**

```
cd edusync-api && cargo check -p auth
cargo test -p auth
```

**STOP IF:**

- `axum` atau `serde` version conflict dengan VIL dependencies
- VIL sudah punya built-in error type yang conflict

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-03: Password Hashing — Dual Format (Argon2 + bcrypt)

**TASK ID:** `1B-03`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** Implement dual-format password verification (try Argon2 → fallback bcrypt) + re-hash on success. Existing Supabase users pakai bcrypt, VIL baru pakai Argon2.

**READ FIRST:**

- Phase 1 Detail §Week 14 Day 3-4 (Password Hashing Dual-Format)
- Risk Register: "Password hash mismatch" = CRITICAL

**EDIT ONLY:**

- `edusync-api/crates/auth/src/password.rs`
- `edusync-api/crates/auth/src/lib.rs` (tambah `pub mod password;`)

**DO NOT TOUCH:**

- `public.users` table schema (sudah dari 1B-01)
- Frontend auth files

**IMPLEMENTATION STEPS:**

1. `hash_password(plain)` → Argon2 hash (VIL standard untuk user baru)
2. `verify_password(plain, hash)` → try Argon2 first, fallback bcrypt
3. `maybe_rehash(pool, user_id, plain, current_hash)` → jika bcrypt detected, re-hash ke Argon2 dan UPDATE DB
4. Unit tests dengan sample bcrypt + argon2 hashes

**COPY-PASTE STARTER:**

```rust
// crates/auth/src/password.rs
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::SaltString;
use rand::rngs::OsRng;
use sqlx::PgPool;

use crate::error::AuthError;

/// Hash password dengan Argon2id (VIL standard)
pub fn hash_password(password: &str) -> Result<String, AuthError> {
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AuthError::InternalError(format!("hash error: {e}")))?;
    Ok(hash.to_string())
}

/// Verify password — dual format: Argon2 first, bcrypt fallback
pub fn verify_password(password: &str, hash: &str) -> Result<bool, AuthError> {
    // Try Argon2 first (new VIL format: starts with $argon2)
    if hash.starts_with("$argon2") {
        let parsed = PasswordHash::new(hash)
            .map_err(|e| AuthError::InternalError(format!("parse hash: {e}")))?;
        return Ok(Argon2::default()
            .verify_password(password.as_bytes(), &parsed)
            .is_ok());
    }
    // Fallback: bcrypt (Supabase GoTrue format: starts with $2)
    if hash.starts_with("$2") {
        return bcrypt::verify(password, hash)
            .map_err(|e| AuthError::InternalError(format!("bcrypt verify: {e}")));
    }
    Ok(false)
}

/// Re-hash bcrypt → Argon2 on successful login (transparent migration)
pub async fn maybe_rehash(
    pool: &PgPool,
    user_id: &uuid::Uuid,
    password: &str,
    current_hash: &str,
) -> Result<(), AuthError> {
    if current_hash.starts_with("$2") {
        let new_hash = hash_password(password)?;
        sqlx::query!(
            "UPDATE public.users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
            new_hash,
            user_id
        )
        .execute(pool)
        .await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_argon2_hash_and_verify() {
        let hash = hash_password("password123").unwrap();
        assert!(hash.starts_with("$argon2"));
        assert!(verify_password("password123", &hash).unwrap());
        assert!(!verify_password("wrong", &hash).unwrap());
    }

    #[test]
    fn test_bcrypt_fallback() {
        // Simulate Supabase bcrypt hash
        let hash = bcrypt::hash("password123", 10).unwrap();
        assert!(hash.starts_with("$2"));
        assert!(verify_password("password123", &hash).unwrap());
        assert!(!verify_password("wrong", &hash).unwrap());
    }

    #[test]
    fn test_unknown_hash_returns_false() {
        assert!(!verify_password("pass", "unknown_hash_format").unwrap());
    }
}
```

**VERIFY:**

```
cd edusync-api && cargo test -p auth -- password
```

**STOP IF:**

- `argon2` atau `bcrypt` crate version conflict dengan VIL
- Existing Supabase hash format bukan bcrypt (check `SELECT LEFT(encrypted_password, 4) FROM auth.users LIMIT 5`)

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-04: JWT Issuance via VIL JwtAuth

**TASK ID:** `1B-04`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** Implement JWT encode/decode dengan custom claims: `sub`, `email`, `roles[]`, `tenant_id`, `exp`, `iat`. Compatible dengan frontend `useAuth()` hook.

**READ FIRST:**

- Phase 1 Detail §Week 14 Day 1-2 (JWT Module)
- Spec 1 §1.1 (Core Identity fields)
- Spec 1 §4 (Token Refresh Semantics — Session shape)
- Agent Bootstrap Context §4 (VIL JwtAuth)

**EDIT ONLY:**

- `edusync-api/crates/auth/src/jwt.rs`
- `edusync-api/crates/auth/src/lib.rs` (tambah `pub mod jwt;`)

**DO NOT TOUCH:**

- Frontend `useSessionManagement.ts`
- VIL built-in `JwtAuth` internals

**IMPLEMENTATION STEPS:**

1. Define `Claims` struct matching Spec 1 §1.1
2. `create_access_token(claims, secret)` → JWT string, 1 hour expiry
3. `create_refresh_token(user_id, secret)` → JWT string, 30 day expiry
4. `verify_token(token, secret)` → Claims
5. `Claims` extractor dari Axum request headers

**COPY-PASTE STARTER:**

```rust
// crates/auth/src/jwt.rs
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use serde::{Serialize, Deserialize};
use chrono::Utc;
use crate::error::AuthError;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,           // user_id (UUID)
    pub email: String,
    pub roles: Vec<String>,    // ["teacher"], ["student"], etc.
    pub tenant_id: String,     // tenant UUID
    pub exp: usize,            // expiry (Unix timestamp)
    pub iat: usize,            // issued at
    #[serde(default)]
    pub mfa_verified: bool,    // true after MFA verification
}

const ACCESS_TOKEN_DURATION_SECS: i64 = 3600;      // 1 hour
const REFRESH_TOKEN_DURATION_SECS: i64 = 2_592_000; // 30 days

pub fn create_access_token(claims: &Claims, secret: &str) -> Result<String, AuthError> {
    let mut c = claims.clone();
    let now = Utc::now().timestamp() as usize;
    c.iat = now;
    c.exp = now + ACCESS_TOKEN_DURATION_SECS as usize;
    encode(&Header::default(), &c, &EncodingKey::from_secret(secret.as_bytes()))
        .map_err(|e| AuthError::InternalError(format!("jwt encode: {e}")))
}

pub fn create_refresh_token(user_id: &str, secret: &str) -> Result<String, AuthError> {
    let now = Utc::now().timestamp() as usize;
    let claims = RefreshClaims {
        sub: user_id.to_string(),
        exp: now + REFRESH_TOKEN_DURATION_SECS as usize,
        iat: now,
        token_type: "refresh".to_string(),
    };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes()))
        .map_err(|e| AuthError::InternalError(format!("jwt encode refresh: {e}")))
}

pub fn verify_access_token(token: &str, secret: &str) -> Result<Claims, AuthError> {
    decode::<Claims>(token, &DecodingKey::from_secret(secret.as_bytes()), &Validation::default())
        .map(|data| data.claims)
        .map_err(|e| match e.kind() {
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => AuthError::TokenExpired,
            _ => AuthError::InvalidToken,
        })
}

pub fn verify_refresh_token(token: &str, secret: &str) -> Result<RefreshClaims, AuthError> {
    decode::<RefreshClaims>(token, &DecodingKey::from_secret(secret.as_bytes()), &Validation::default())
        .map(|data| data.claims)
        .map_err(|e| match e.kind() {
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => AuthError::TokenExpired,
            _ => AuthError::InvalidToken,
        })
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RefreshClaims {
    pub sub: String,
    pub exp: usize,
    pub iat: usize,
    pub token_type: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_access_token_roundtrip() {
        let claims = Claims {
            sub: "user-123".into(),
            email: "test@edusync.dev".into(),
            roles: vec!["teacher".into()],
            tenant_id: "tenant-1".into(),
            exp: 0, iat: 0,
            mfa_verified: false,
        };
        let token = create_access_token(&claims, "test-secret").unwrap();
        let decoded = verify_access_token(&token, "test-secret").unwrap();
        assert_eq!(decoded.sub, "user-123");
        assert_eq!(decoded.email, "test@edusync.dev");
        assert_eq!(decoded.roles, vec!["teacher"]);
    }

    #[test]
    fn test_refresh_token_roundtrip() {
        let token = create_refresh_token("user-123", "test-secret").unwrap();
        let decoded = verify_refresh_token(&token, "test-secret").unwrap();
        assert_eq!(decoded.sub, "user-123");
        assert_eq!(decoded.token_type, "refresh");
    }
}
```

**VERIFY:**

```
cd edusync-api && cargo test -p auth -- jwt
```

**STOP IF:**

- `jsonwebtoken` crate conflict dengan VIL built-in `JwtAuth`
- JWT claims shape tidak compatible dengan frontend `useAuth()` expectations

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-05: Session Management (Refresh Token Store)

**TASK ID:** `1B-05`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** Implement session/refresh-token persistence layer: create, verify, rotate, revoke. Frontend expects access token 1hr + refresh token 30d, proactive refresh 5min before expiry.

**READ FIRST:**

- Spec 1 §4 (Token Refresh Semantics)
- Spec 1 §1.3 (`sessionExpired` field behavior)
- Phase 1 Detail §Week 15 Day 5 (SignOut + Session Cleanup)

**EDIT ONLY:**

- `edusync-api/crates/auth/src/session.rs`
- `edusync-api/crates/auth/src/lib.rs` (tambah `pub mod session;`)

**DO NOT TOUCH:**

- `public.refresh_tokens` table (sudah dari 1B-01)
- Frontend `useSessionManagement.ts`

**IMPLEMENTATION STEPS:**

1. `create_session(pool, user_id, secret)` → (access_token, refresh_token, expires_in)
2. `refresh_session(pool, refresh_token, secret)` → rotated tokens (old revoked, new created)
3. `revoke_session(pool, refresh_token_hash)` → mark revoked_at
4. `revoke_all_user_sessions(pool, user_id)` → revoke semua refresh tokens user
5. Token hash pakai SHA-256 (jangan simpan raw token di DB)

**COPY-PASTE STARTER:**

```rust
// crates/auth/src/session.rs
use chrono::{Utc, Duration};
use sha2::{Sha256, Digest};
use sqlx::PgPool;
use uuid::Uuid;
use crate::jwt::{self, Claims};
use crate::error::AuthError;

fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub struct SessionTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64,
}

pub async fn create_session(
    pool: &PgPool,
    user_id: &Uuid,
    email: &str,
    roles: Vec<String>,
    tenant_id: &str,
    mfa_verified: bool,
    secret: &str,
) -> Result<SessionTokens, AuthError> {
    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        roles,
        tenant_id: tenant_id.to_string(),
        exp: 0, iat: 0,
        mfa_verified,
    };
    let access_token = jwt::create_access_token(&claims, secret)?;
    let refresh_token = jwt::create_refresh_token(&user_id.to_string(), secret)?;
    let token_hash = hash_token(&refresh_token);
    let expires_at = Utc::now() + Duration::days(30);

    sqlx::query!(
        r#"INSERT INTO public.refresh_tokens (user_id, token_hash, expires_at)
           VALUES ($1, $2, $3)"#,
        user_id, token_hash, expires_at
    ).execute(pool).await?;

    Ok(SessionTokens { access_token, refresh_token, expires_in: 3600 })
}

pub async fn refresh_session(
    pool: &PgPool,
    old_refresh_token: &str,
    email: &str,
    roles: Vec<String>,
    tenant_id: &str,
    mfa_verified: bool,
    secret: &str,
) -> Result<SessionTokens, AuthError> {
    let old_hash = hash_token(old_refresh_token);
    let old = jwt::verify_refresh_token(old_refresh_token, secret)?;
    let user_id: Uuid = old.sub.parse()
        .map_err(|_| AuthError::InvalidToken)?;

    // Find and validate stored token
    let stored = sqlx::query!(
        r#"SELECT id, revoked_at FROM public.refresh_tokens
           WHERE token_hash = $1 AND user_id = $2"#,
        old_hash, user_id
    ).fetch_optional(pool).await?
     .ok_or(AuthError::RefreshTokenNotFound)?;

    if stored.revoked_at.is_some() {
        // Token reuse detected — revoke ALL user sessions (security)
        revoke_all_user_sessions(pool, &user_id).await?;
        return Err(AuthError::RefreshTokenRevoked);
    }

    // Create new session
    let new_session = create_session(
        pool, &user_id, email, roles, tenant_id, mfa_verified, secret
    ).await?;

    // Revoke old token, link to new
    let new_hash = hash_token(&new_session.refresh_token);
    let new_id = sqlx::query_scalar!(
        "SELECT id FROM public.refresh_tokens WHERE token_hash = $1",
        new_hash
    ).fetch_one(pool).await?;

    sqlx::query!(
        r#"UPDATE public.refresh_tokens
           SET revoked_at = NOW(), replaced_by = $1
           WHERE id = $2"#,
        new_id, stored.id
    ).execute(pool).await?;

    Ok(new_session)
}

pub async fn revoke_session(pool: &PgPool, refresh_token: &str) -> Result<(), AuthError> {
    let token_hash = hash_token(refresh_token);
    sqlx::query!(
        "UPDATE public.refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1",
        token_hash
    ).execute(pool).await?;
    Ok(())
}

pub async fn revoke_all_user_sessions(pool: &PgPool, user_id: &Uuid) -> Result<(), AuthError> {
    sqlx::query!(
        "UPDATE public.refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
        user_id
    ).execute(pool).await?;
    Ok(())
}
```

**VERIFY:**

```
cd edusync-api && cargo check -p auth
cargo test -p auth -- session
```

**STOP IF:**

- `sha2` crate version conflict
- `refresh_tokens` table schema mismatch dengan 1B-01

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-06: Register Endpoint

**TASK ID:** `1B-06`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** `POST /api/v1/auth/register` — create user, hash password Argon2, ensure profile, generate JWT, return `AuthResponse`.

**READ FIRST:**

- Phase 1 Detail §Week 15 Day 1-2 (Register Endpoint)
- Spec 1 §1.4 (`signUp` method contract)
- Spec 1 §8 (Error Response Shape)

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/auth/register.rs`
- `edusync-api/crates/api-server/src/auth/mod.rs`
- `edusync-api/crates/api-server/src/auth/types.rs` (shared response types)

**DO NOT TOUCH:**

- `crates/auth/` (sudah dari 1B-02–1B-05)
- Frontend files

**IMPLEMENTATION STEPS:**

1. Define `RegisterRequest` (email, password, metadata?)
2. Define `AuthResponse` struct (access_token, refresh_token, expires_in, token_type, user) — shape MUST match Spec 1 §4
3. Define `UserResponse` struct (id, email, email_confirmed_at, created_at, updated_at)
4. Validate email format, password strength (min 8 chars)
5. Check email uniqueness (`SELECT FROM public.users WHERE email = $1`)
6. Hash password via `password::hash_password()`
7. Insert into `public.users`
8. Ensure profile exists (inline SQL — mirrors `ensure_profile_exists` RPC)
9. Get roles from `user_roles` table (BUKAN `profiles.role`)
10. Get default tenant from `tenant_memberships`
11. Create session via `session::create_session()`
12. Return `AuthResponse`

**COPY-PASTE STARTER:**

```rust
// crates/api-server/src/auth/types.rs
use serde::Serialize;

/// AuthResponse — MUST match Spec 1 §4 Session Shape
#[derive(Serialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64,
    pub token_type: String,
    pub user: UserResponse,
}

#[derive(Serialize)]
pub struct UserResponse {
    pub id: String,
    pub email: String,
    pub email_confirmed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
```

```rust
// crates/api-server/src/auth/register.rs
use axum::{Json, extract::State};
use serde::Deserialize;
use uuid::Uuid;
use crate::AppState;
use auth::{password, session, error::AuthError};
use super::types::{AuthResponse, UserResponse};

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub metadata: Option<serde_json::Value>,
}

pub async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, AuthError> {
    let email = body.email.trim().to_lowercase();
    if !email.contains('@') || email.len() < 5 {
        return Err(AuthError::InvalidEmail);
    }
    if body.password.len() < 8 {
        return Err(AuthError::WeakPassword);
    }
    let exists = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM public.users WHERE email = $1)",
        &email
    ).fetch_one(&state.db).await?;
    if exists.unwrap_or(false) {
        return Err(AuthError::EmailAlreadyExists);
    }
    let user_id = Uuid::new_v4();
    let hash = password::hash_password(&body.password)?;
    let now = chrono::Utc::now();
    sqlx::query!(
        r#"INSERT INTO public.users (id, email, password_hash, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $4)"#,
        user_id, &email, &hash, now
    ).execute(&state.db).await?;
    // Ensure profile
    sqlx::query!(
        r#"INSERT INTO public.profiles (id, email, created_at, updated_at)
           VALUES ($1, $2, $3, $3) ON CONFLICT (id) DO NOTHING"#,
        user_id, &email, now
    ).execute(&state.db).await?;
    let roles: Vec<String> = sqlx::query_scalar!(
        "SELECT role FROM user_roles WHERE user_id = $1", user_id
    ).fetch_all(&state.db).await?;
    let tenant_id = sqlx::query_scalar!(
        "SELECT tenant_id FROM tenant_memberships WHERE user_id = $1 AND is_active = true LIMIT 1",
        user_id
    ).fetch_optional(&state.db).await?
     .map(|t| t.to_string()).unwrap_or_default();
    let tokens = session::create_session(
        &state.db, &user_id, &email, roles, &tenant_id, false, &state.jwt_secret
    ).await?;
    Ok(Json(AuthResponse {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        token_type: "bearer".into(),
        user: UserResponse {
            id: user_id.to_string(), email,
            email_confirmed_at: None,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
        },
    }))
}
```

**VERIFY:**

```
cd edusync-api && cargo check
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"newuser@test.com","password":"password123"}'
```

**STOP IF:**

- `profiles` table schema unknown (need to inspect actual columns)
- `user_roles` atau `tenant_memberships` table tidak ada

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-07: Login Endpoint

**TASK ID:** `1B-07`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** `POST /api/v1/auth/login` — verify credentials (dual-format hash), re-hash if bcrypt, check MFA enrollment, return session.

**READ FIRST:**

- Phase 1 Detail §Week 15 Day 3-4 (Login)
- Spec 1 §1.4 (`signIn` method contract)
- Spec 1 §7 (MFA Contract — Login with MFA flow)

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/auth/login.rs`
- `edusync-api/crates/api-server/src/auth/mod.rs`

**DO NOT TOUCH:**

- `crates/auth/src/password.rs` (sudah 1B-03)
- Frontend files

**IMPLEMENTATION STEPS:**

1. Find user by email from `public.users`
2. Check `banned_until`
3. Verify password via `password::verify_password()` (dual-format)
4. If bcrypt, call `password::maybe_rehash()` — transparent migration
5. Get roles from `user_roles` (BUKAN `profiles.role`)
6. Get default tenant + memberships
7. Check MFA enrollment: `SELECT FROM mfa_factors WHERE user_id AND verified_at IS NOT NULL`
8. If MFA enrolled → session with `mfa_verified: false`
9. If no MFA → full session with `mfa_verified: true`
10. Update `last_sign_in_at`

**COPY-PASTE STARTER:**

```rust
// crates/api-server/src/auth/login.rs
use axum::{Json, extract::State};
use serde::Deserialize;
use crate::AppState;
use auth::{password, session, error::AuthError};
use super::types::{AuthResponse, UserResponse};

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AuthError> {
    let email = body.email.trim().to_lowercase();
    let user = sqlx::query!(
        r#"SELECT id, email, password_hash, email_confirmed_at,
                  banned_until, created_at, updated_at
           FROM public.users WHERE email = $1"#, &email
    ).fetch_optional(&state.db).await?
     .ok_or(AuthError::InvalidCredentials)?;
    if let Some(banned) = user.banned_until {
        if banned > chrono::Utc::now() { return Err(AuthError::UserBanned); }
    }
    let hash = user.password_hash.as_deref()
        .ok_or(AuthError::InvalidCredentials)?;
    if !password::verify_password(&body.password, hash)? {
        return Err(AuthError::InvalidCredentials);
    }
    password::maybe_rehash(&state.db, &user.id, &body.password, hash).await?;
    let roles: Vec<String> = sqlx::query_scalar!(
        "SELECT role FROM user_roles WHERE user_id = $1", user.id
    ).fetch_all(&state.db).await?;
    let tenant_id = sqlx::query_scalar!(
        "SELECT tenant_id FROM tenant_memberships WHERE user_id = $1 AND is_active = true LIMIT 1",
        user.id
    ).fetch_optional(&state.db).await?
     .map(|t| t.to_string()).unwrap_or_default();
    let has_mfa = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM mfa_factors WHERE user_id = $1 AND verified_at IS NOT NULL)",
        user.id
    ).fetch_one(&state.db).await?.unwrap_or(false);
    let mfa_verified = !has_mfa;
    let tokens = session::create_session(
        &state.db, &user.id, &email, roles, &tenant_id, mfa_verified, &state.jwt_secret
    ).await?;
    sqlx::query!(
        "UPDATE public.users SET last_sign_in_at = NOW() WHERE id = $1", user.id
    ).execute(&state.db).await?;
    Ok(Json(AuthResponse {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        token_type: "bearer".into(),
        user: UserResponse {
            id: user.id.to_string(), email: user.email,
            email_confirmed_at: user.email_confirmed_at.map(|t| t.to_rfc3339()),
            created_at: user.created_at.to_rfc3339(),
            updated_at: user.updated_at.to_rfc3339(),
        },
    }))
}
```

**VERIFY:**

```
cd edusync-api && cargo check
# CRITICAL: Test with existing dev accounts (bcrypt hashes)
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"teacher@edusync.dev","password":"password123"}'
# Must return 200 + AuthResponse
```

**STOP IF:**

- Existing dev accounts cannot login (password hash mismatch)
- `user_roles` table schema berbeda dari expected

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-08: SignOut Endpoint

**TASK ID:** `1B-08`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** `POST /api/v1/auth/signout` — invalidate refresh token, return 204. Per Spec 1 §3: frontend clears state BEFORE calling this — best-effort.

**READ FIRST:**

- Spec 1 §3 (SignOut Side Effects Contract)

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/auth/signout.rs`
- `edusync-api/crates/api-server/src/auth/mod.rs`

**DO NOT TOUCH:**

- Frontend localStorage clearing logic

**IMPLEMENTATION STEPS:**

1. Extract `refresh_token` from body (optional)
2. If provided, revoke via `session::revoke_session()`
3. Return 204 No Content ALWAYS (even if token invalid)

**COPY-PASTE STARTER:**

```rust
// crates/api-server/src/auth/signout.rs
use axum::{Json, extract::State, http::StatusCode};
use serde::Deserialize;
use crate::AppState;
use auth::session;

#[derive(Deserialize)]
pub struct SignOutRequest {
    pub refresh_token: Option<String>,
}

pub async fn sign_out(
    State(state): State<AppState>,
    Json(body): Json<SignOutRequest>,
) -> StatusCode {
    if let Some(token) = body.refresh_token {
        let _ = session::revoke_session(&state.db, &token).await;
    }
    StatusCode::NO_CONTENT
}
```

**VERIFY:**

```
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/v1/auth/signout \
  -H 'Content-Type: application/json' -d '{"refresh_token":"any"}'
# Expected: 204
```

**STOP IF:** Tidak ada — task ini sangat simple.

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-09: Token Refresh Endpoint

**TASK ID:** `1B-09`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** `POST /api/v1/auth/refresh` — rotate refresh token, issue new access token. Frontend calls setiap 60s jika expires dalam 5 menit.

**READ FIRST:**

- Spec 1 §4 (Token Refresh Semantics — EXACT response shape)

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/auth/refresh.rs`
- `edusync-api/crates/api-server/src/auth/mod.rs`

**DO NOT TOUCH:**

- `crates/auth/src/session.rs` (sudah 1B-05)
- Frontend `useSessionManagement.ts`

**IMPLEMENTATION STEPS:**

1. Parse `{ refresh_token }` from body
2. Verify refresh token JWT
3. Load user data for new claims (email, roles, tenant)
4. Call `session::refresh_session()` (handles rotation + reuse detection)
5. Return `AuthResponse` with new tokens

**COPY-PASTE STARTER:**

```rust
// crates/api-server/src/auth/refresh.rs
use axum::{Json, extract::State};
use serde::Deserialize;
use crate::AppState;
use auth::{jwt, session, error::AuthError};
use super::types::{AuthResponse, UserResponse};

#[derive(Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

pub async fn refresh_token(
    State(state): State<AppState>,
    Json(body): Json<RefreshRequest>,
) -> Result<Json<AuthResponse>, AuthError> {
    let rc = jwt::verify_refresh_token(&body.refresh_token, &state.jwt_secret)?;
    let user_id: uuid::Uuid = rc.sub.parse().map_err(|_| AuthError::InvalidToken)?;
    let user = sqlx::query!(
        "SELECT email, email_confirmed_at, created_at, updated_at FROM public.users WHERE id = $1",
        user_id
    ).fetch_optional(&state.db).await?.ok_or(AuthError::UserNotFound)?;
    let roles: Vec<String> = sqlx::query_scalar!(
        "SELECT role FROM user_roles WHERE user_id = $1", user_id
    ).fetch_all(&state.db).await?;
    let tenant_id = sqlx::query_scalar!(
        "SELECT tenant_id FROM tenant_memberships WHERE user_id = $1 AND is_active = true LIMIT 1",
        user_id
    ).fetch_optional(&state.db).await?.map(|t| t.to_string()).unwrap_or_default();
    let has_mfa = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM mfa_factors WHERE user_id = $1 AND verified_at IS NOT NULL)",
        user_id
    ).fetch_one(&state.db).await?.unwrap_or(false);
    let tokens = session::refresh_session(
        &state.db, &body.refresh_token, &user.email, roles,
        &tenant_id, !has_mfa, &state.jwt_secret
    ).await?;
    Ok(Json(AuthResponse {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        token_type: "bearer".into(),
        user: UserResponse {
            id: user_id.to_string(), email: user.email,
            email_confirmed_at: user.email_confirmed_at.map(|t| t.to_rfc3339()),
            created_at: user.created_at.to_rfc3339(),
            updated_at: user.updated_at.to_rfc3339(),
        },
    }))
}
```

**VERIFY:**

```
# Login to get refresh_token, then:
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refresh_token":"<from_login>"}'
# Expected: 200 + new AuthResponse, old token revoked in DB
```

**STOP IF:**

- Token rotation race condition (concurrent refresh calls)
- Reuse detection incorrectly revokes active sessions

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-10: `get_auth_bootstrap` RPC — PALING KRITIS

**TASK ID:** `1B-10`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** `GET /api/v1/auth/bootstrap` — return profile + memberships + default_tenant_id. Shape harus **IDENTIK** dengan Supabase RPC. Ini RPC paling kritis karena dipanggil setiap login/refresh.

**READ FIRST:**

- Spec 1 §2 (`get_auth_bootstrap` RPC Contract — EXACT response shape)
- Gap Analysis §1 (Gap paling kritis)

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/auth/bootstrap.rs`
- `edusync-api/crates/api-server/src/auth/mod.rs`

**DO NOT TOUCH:**

- Existing `get_auth_bootstrap` stored procedure di PostgreSQL
- Frontend `useRoleResolution.ts`

**IMPLEMENTATION STEPS:**

1. Define `AuthBootstrap` response struct matching Spec 1 §2 EXACTLY
2. Extract user_id dari JWT claims (Authorization header)
3. Load profile from `public.profiles WHERE id = claims.sub`
4. Load memberships from `tenant_memberships JOIN tenants WHERE user_id = claims.sub`
5. Role from `user_roles` table, NOT `profiles.role`
6. Get `default_tenant_id` from profile or first active membership
7. Return IDENTICAL shape to Supabase `get_auth_bootstrap` RPC

**COPY-PASTE STARTER:**

```rust
// crates/api-server/src/auth/bootstrap.rs
use axum::{Json, extract::State};
use serde::Serialize;
use crate::AppState;
use auth::{jwt::Claims, error::AuthError};

/// MUST match Spec 1 §2 EXACTLY — frontend destructures this directly
#[derive(Serialize)]
pub struct AuthBootstrap {
    pub profile: BootstrapProfile,
    pub memberships: Vec<BootstrapMembership>,
    pub default_tenant_id: Option<String>,
}

#[derive(Serialize)]
pub struct BootstrapProfile {
    pub id: String,
    pub email: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub avatar_url: Option<String>,
    pub tenant_id: Option<String>,
}

#[derive(Serialize)]
pub struct BootstrapMembership {
    pub tenant_id: String,
    pub tenant_name: String,
    pub tenant_logo: Option<String>,
    pub tenant_slug: String,
    pub role: String,  // 'student'|'teacher'|'admin'|'parent'|'principal'
    pub status: String,
    pub is_active: bool,
    pub joined_at: String,  // ISO-8601
}

pub async fn get_auth_bootstrap(
    State(state): State<AppState>,
    claims: Claims,  // Extracted from JWT via middleware
) -> Result<Json<AuthBootstrap>, AuthError> {
    let user_id: uuid::Uuid = claims.sub.parse()
        .map_err(|_| AuthError::InvalidToken)?;

    // 1. Load profile
    let profile = sqlx::query!(
        r#"SELECT id, email, first_name, last_name, avatar_url, tenant_id
           FROM public.profiles WHERE id = $1"#,
        user_id
    ).fetch_optional(&state.db).await?
     .ok_or(AuthError::UserNotFound)?;

    // 2. Load memberships (role from user_roles, NOT profiles.role)
    let memberships = sqlx::query!(
        r#"SELECT
             tm.tenant_id, t.name as tenant_name, t.logo as tenant_logo,
             t.slug as tenant_slug, ur.role, tm.status,
             tm.is_active, tm.joined_at
           FROM tenant_memberships tm
           JOIN tenants t ON t.id = tm.tenant_id
           JOIN user_roles ur ON ur.user_id = tm.user_id AND ur.tenant_id = tm.tenant_id
           WHERE tm.user_id = $1
           ORDER BY tm.joined_at ASC"#,
        user_id
    ).fetch_all(&state.db).await?;

    let membership_list: Vec<BootstrapMembership> = memberships.iter().map(|m| {
        BootstrapMembership {
            tenant_id: m.tenant_id.to_string(),
            tenant_name: m.tenant_name.clone(),
            tenant_logo: m.tenant_logo.clone(),
            tenant_slug: m.tenant_slug.clone(),
            role: m.role.clone(),
            status: m.status.clone(),
            is_active: m.is_active,
            joined_at: m.joined_at.to_rfc3339(),
        }
    }).collect();

    let default_tenant_id = profile.tenant_id
        .map(|t| t.to_string())
        .or_else(|| membership_list.first()
            .filter(|m| m.is_active)
            .map(|m| m.tenant_id.clone()));

    Ok(Json(AuthBootstrap {
        profile: BootstrapProfile {
            id: profile.id.to_string(),
            email: profile.email.clone(),
            first_name: profile.first_name.clone(),
            last_name: profile.last_name.clone(),
            avatar_url: profile.avatar_url.clone(),
            tenant_id: profile.tenant_id.map(|t| t.to_string()),
        },
        memberships: membership_list,
        default_tenant_id,
    }))
}
```

**VERIFY:**

```
cd edusync-api && cargo check
# Parity test: compare Supabase vs VIL output
curl -H "Authorization: Bearer <jwt>" http://localhost:8080/api/v1/auth/bootstrap
# Compare with: SELECT * FROM get_auth_bootstrap() -- via Supabase
# Fields MUST be identical
```

**STOP IF:**

- `profiles` table columns don't match expected (first_name, last_name, avatar_url, tenant_id)
- `tenant_memberships` JOIN with `user_roles` produces different results than Supabase RPC
- Response shape differs from Supabase `get_auth_bootstrap` in ANY field

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-11: `ensure_profile_exists` RPC

**TASK ID:** `1B-11`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** `POST /api/v1/auth/ensure-profile` — create/update profile on login. Called internally after successful auth.

**READ FIRST:**

- Phase 1 Detail §Week 19-20 (Port 8 Auth RPCs)

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/auth/ensure_profile.rs`
- `edusync-api/crates/api-server/src/auth/mod.rs`

**DO NOT TOUCH:**

- Existing `ensure_profile_exists` stored procedure

**IMPLEMENTATION STEPS:**

1. Extract user_id + email from JWT claims
2. UPSERT into `profiles` (INSERT ON CONFLICT DO UPDATE email, updated_at)
3. Return profile data

**COPY-PASTE STARTER:**

```rust
// crates/api-server/src/auth/ensure_profile.rs
use axum::{Json, extract::State};
use serde::Serialize;
use crate::AppState;
use auth::{jwt::Claims, error::AuthError};

#[derive(Serialize)]
pub struct ProfileResult {
    pub id: String,
    pub email: String,
    pub created: bool,
}

pub async fn ensure_profile_exists(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<Json<ProfileResult>, AuthError> {
    let user_id: uuid::Uuid = claims.sub.parse()
        .map_err(|_| AuthError::InvalidToken)?;
    let now = chrono::Utc::now();

    let result = sqlx::query!(
        r#"INSERT INTO public.profiles (id, email, created_at, updated_at)
           VALUES ($1, $2, $3, $3)
           ON CONFLICT (id) DO UPDATE SET email = $2, updated_at = $3
           RETURNING (xmax = 0) as "created!""#,
        user_id, &claims.email, now
    ).fetch_one(&state.db).await?;

    Ok(Json(ProfileResult {
        id: user_id.to_string(),
        email: claims.email,
        created: result.created,
    }))
}
```

**VERIFY:**

```
cd edusync-api && cargo check
```

**STOP IF:**

- `profiles` table has required columns not provided (e.g. `tenant_id NOT NULL`)

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-12: Rate Limiting (VIL Built-in)

**TASK ID:** `1B-12`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** Configure VIL built-in `RateLimit` per auth endpoint. Auth: 10/min, AI: 50/hr, quiz: 5/min, general: 100/min.

**READ FIRST:**

- Phase 1 Detail §Week 20 (Rate Limiting + Brute Force)
- Agent Bootstrap Context §4 (VIL RateLimit)

**EDIT ONLY:**

- `edusync-api/crates/middleware/src/rate_limit.rs`
- `edusync-api/crates/middleware/src/lib.rs`

**DO NOT TOUCH:**

- Auth handler files
- VIL built-in `RateLimit` internals

**IMPLEMENTATION STEPS:**

1. Create `AuthRateLimiter` struct wrapping VIL `RateLimit`
2. Configure: login 10/min per IP, register 5/min per IP, refresh 30/min per user
3. Create Axum middleware layer that checks rate limit before handler
4. Return `AuthError::TooManyRequests` with Bahasa Indonesia message

**COPY-PASTE STARTER:**

```rust
// crates/middleware/src/rate_limit.rs
use std::time::Duration;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use chrono::Utc;

pub struct RateLimiter {
    limits: HashMap<String, (u32, Duration)>,
    counters: Arc<Mutex<HashMap<String, Vec<i64>>>>,
}

impl RateLimiter {
    pub fn new() -> Self {
        let mut limits = HashMap::new();
        limits.insert("auth:login".into(), (10, Duration::from_secs(60)));
        limits.insert("auth:register".into(), (5, Duration::from_secs(60)));
        limits.insert("auth:refresh".into(), (30, Duration::from_secs(60)));
        limits.insert("auth:reset".into(), (3, Duration::from_secs(300)));
        limits.insert("auth:mfa".into(), (10, Duration::from_secs(60)));
        Self {
            limits,
            counters: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn check(&self, endpoint: &str, key: &str) -> Result<(), String> {
        let (max, window) = self.limits.get(endpoint)
            .ok_or_else(|| "unknown endpoint".to_string())?;
        let full_key = format!("{}:{}", endpoint, key);
        let now = Utc::now().timestamp();
        let cutoff = now - window.as_secs() as i64;

        let mut counters = self.counters.lock().unwrap();
        let entries = counters.entry(full_key).or_default();
        entries.retain(|&t| t > cutoff);

        if entries.len() >= *max as usize {
            return Err("Terlalu banyak percobaan. Coba lagi nanti.".into());
        }
        entries.push(now);
        Ok(())
    }
}
```

**VERIFY:**

```
cd edusync-api && cargo check -p middleware
cargo test -p middleware -- rate_limit
```

**STOP IF:**

- VIL built-in `RateLimit` API different from documented (check VIL repo)

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-13: Forgot / Reset Password Flow

**TASK ID:** `1B-13`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** `POST /api/v1/auth/reset-password` (request) + `POST /api/v1/auth/update-password` (execute). Gap dari Spec 4 §2.

**READ FIRST:**

- Spec 4 §2 (Password Reset / Forgot Password Flow)
- Phase 1 Detail §Week 15 (implied but missing from original plan)

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/auth/reset_password.rs`
- `edusync-api/crates/api-server/src/auth/mod.rs`

**DO NOT TOUCH:**

- `password_reset_tokens` table (sudah dari 1B-01)
- Email sending (stub for now — actual email in 1B-14)

**IMPLEMENTATION STEPS:**

1. `POST /api/v1/auth/reset-password` { email }
   - Find user by email
   - Generate random token (32 bytes, hex encoded)
   - Hash token with SHA-256, store in `password_reset_tokens` (1h expiry, one-time-use)
   - **ALWAYS return 200** (prevent email enumeration)
   - TODO: Send email (stub — log token to console for now)
2. `POST /api/v1/auth/update-password` { token, new_password }
   - Hash incoming token, lookup in `password_reset_tokens`
   - Verify: not expired, not used
   - Hash new password with Argon2
   - Update `public.users.password_hash`
   - Mark token as used (`used_at = NOW()`)
   - Invalidate ALL refresh tokens for user
   - Return new session

**COPY-PASTE STARTER:**

```rust
// crates/api-server/src/auth/reset_password.rs
use axum::{Json, extract::State};
use serde::Deserialize;
use sha2::{Sha256, Digest};
use rand::Rng;
use crate::AppState;
use auth::{password, session, error::AuthError};
use super::types::AuthResponse;

#[derive(Deserialize)]
pub struct ResetRequest { pub email: String }

#[derive(Deserialize)]
pub struct UpdatePasswordRequest {
    pub token: String,
    pub new_password: String,
}

fn hash_reset_token(token: &str) -> String {
    format!("{:x}", Sha256::digest(token.as_bytes()))
}

/// Always returns 200 to prevent email enumeration
pub async fn request_reset(
    State(state): State<AppState>,
    Json(body): Json<ResetRequest>,
) -> Json<serde_json::Value> {
    let email = body.email.trim().to_lowercase();
    if let Ok(Some(user)) = sqlx::query!(
        "SELECT id FROM public.users WHERE email = $1", &email
    ).fetch_optional(&state.db).await {
        let raw_token: String = (0..32).map(|_| format!("{:02x}", rand::thread_rng().gen::<u8>())).collect();
        let token_hash = hash_reset_token(&raw_token);
        let expires = chrono::Utc::now() + chrono::Duration::hours(1);
        let _ = sqlx::query!(
            r#"INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
               VALUES ($1, $2, $3)"#,
            user.id, token_hash, expires
        ).execute(&state.db).await;
        // TODO: Send email with raw_token (1B-14 will implement)
        tracing::info!("Password reset token for {}: {}", email, raw_token);
    }
    Json(serde_json::json!({ "message": "Jika email terdaftar, link reset telah dikirim" }))
}

pub async fn update_password(
    State(state): State<AppState>,
    Json(body): Json<UpdatePasswordRequest>,
) -> Result<Json<AuthResponse>, AuthError> {
    if body.new_password.len() < 8 { return Err(AuthError::WeakPassword); }
    let token_hash = hash_reset_token(&body.token);
    let record = sqlx::query!(
        r#"SELECT id, user_id, expires_at, used_at FROM password_reset_tokens
           WHERE token_hash = $1"#, token_hash
    ).fetch_optional(&state.db).await?
     .ok_or(AuthError::ResetTokenInvalid)?;
    if record.used_at.is_some() { return Err(AuthError::ResetTokenUsed); }
    if record.expires_at < chrono::Utc::now() { return Err(AuthError::ResetTokenExpired); }

    // Update password
    let new_hash = password::hash_password(&body.new_password)?;
    sqlx::query!(
        "UPDATE public.users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
        new_hash, record.user_id
    ).execute(&state.db).await?;

    // Mark token used
    sqlx::query!(
        "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1",
        record.id
    ).execute(&state.db).await?;

    // Invalidate all sessions
    session::revoke_all_user_sessions(&state.db, &record.user_id).await?;

    // Create new session
    let user = sqlx::query!(
        "SELECT email, created_at, updated_at, email_confirmed_at FROM public.users WHERE id = $1",
        record.user_id
    ).fetch_one(&state.db).await?;
    let roles: Vec<String> = sqlx::query_scalar!(
        "SELECT role FROM user_roles WHERE user_id = $1", record.user_id
    ).fetch_all(&state.db).await?;
    let tenant_id = sqlx::query_scalar!(
        "SELECT tenant_id FROM tenant_memberships WHERE user_id = $1 AND is_active = true LIMIT 1",
        record.user_id
    ).fetch_optional(&state.db).await?.map(|t| t.to_string()).unwrap_or_default();
    let tokens = session::create_session(
        &state.db, &record.user_id, &user.email, roles, &tenant_id, false, &state.jwt_secret
    ).await?;
    Ok(Json(AuthResponse {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        token_type: "bearer".into(),
        user: super::types::UserResponse {
            id: record.user_id.to_string(), email: user.email,
            email_confirmed_at: user.email_confirmed_at.map(|t| t.to_rfc3339()),
            created_at: user.created_at.to_rfc3339(),
            updated_at: user.updated_at.to_rfc3339(),
        },
    }))
}
```

**VERIFY:**

```
cd edusync-api && cargo check
# Request reset (always 200):
curl -X POST http://localhost:8080/api/v1/auth/reset-password \
  -H 'Content-Type: application/json' -d '{"email":"teacher@edusync.dev"}'
# Check logs for token, then:
curl -X POST http://localhost:8080/api/v1/auth/update-password \
  -H 'Content-Type: application/json' \
  -d '{"token":"<from_logs>","new_password":"newpass123"}'
```

**STOP IF:**

- `password_reset_tokens` table not created (dependency on 1B-01)
- Email sending required for testing (use console log stub)

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-14: Email Verification

**TASK ID:** `1B-14`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** `POST /api/v1/auth/verify-email` + email sending via `lettre` (Resend/SMTP). Covers signup verification + password reset emails.

**READ FIRST:**

- Phase 1 Detail §Week 16 Day 4-5 (Email Verification)
- Spec 4 §6 (Email Template Migration)

**EDIT ONLY:**

- `edusync-api/crates/services/src/email.rs`
- `edusync-api/crates/api-server/src/auth/verify_email.rs`
- `edusync-api/crates/api-server/src/auth/mod.rs`

**DO NOT TOUCH:**

- Reset password handler (1B-13) — hanya update TODO comment to call email service

**IMPLEMENTATION STEPS:**

1. Create `EmailService` struct with `lettre` SMTP transport
2. Define email templates (Bahasa Indonesia): verification, password reset
3. `send_verification_email(to, token, school_name)` → sends HTML email
4. `POST /api/v1/auth/verify-email` { token } → marks `email_confirmed_at`
5. Wire email sending into register (1B-06) and reset (1B-13) flows

**COPY-PASTE STARTER:**

```rust
// crates/services/src/email.rs
use lettre::{Message, SmtpTransport, Transport};
use lettre::message::header::ContentType;
use lettre::transport::smtp::authentication::Credentials;

pub struct EmailService {
    transport: SmtpTransport,
    from_email: String,
}

impl EmailService {
    pub fn new(smtp_host: &str, smtp_user: &str, smtp_pass: &str, from: &str) -> Self {
        let creds = Credentials::new(smtp_user.into(), smtp_pass.into());
        let transport = SmtpTransport::relay(smtp_host).unwrap()
            .credentials(creds).build();
        Self { transport, from_email: from.into() }
    }

    pub fn send_verification(&self, to: &str, token: &str, school: &str) -> Result<(), String> {
        let url = format!("https://app.edusync.id/auth/verify?token={}", token);
        let body = format!(
            "<h2>Verifikasi Email Anda</h2>\
             <p>Halo! Terima kasih telah mendaftar di {}.</p>\
             <p><a href='{}'>Klik di sini untuk verifikasi email</a></p>\
             <p>Link berlaku 24 jam.</p>",
            school, url
        );
        let email = Message::builder()
            .from(self.from_email.parse().unwrap())
            .to(to.parse().unwrap())
            .subject("Verifikasi Email - EduSync")
            .header(ContentType::TEXT_HTML)
            .body(body).map_err(|e| e.to_string())?;
        self.transport.send(&email).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn send_password_reset(&self, to: &str, token: &str) -> Result<(), String> {
        let url = format!("https://app.edusync.id/auth/reset?token={}", token);
        let body = format!(
            "<h2>Reset Password</h2>\
             <p>Anda meminta reset password. <a href='{}'>Klik di sini</a>.</p>\
             <p>Link berlaku 1 jam. Abaikan jika bukan Anda.</p>",
            url
        );
        let email = Message::builder()
            .from(self.from_email.parse().unwrap())
            .to(to.parse().unwrap())
            .subject("Reset Password - EduSync")
            .header(ContentType::TEXT_HTML)
            .body(body).map_err(|e| e.to_string())?;
        self.transport.send(&email).map_err(|e| e.to_string())?;
        Ok(())
    }
}
```

**VERIFY:**

```
cd edusync-api && cargo check
# Test with Mailtrap or local SMTP
```

**STOP IF:**

- SMTP credentials not available (use env vars, stub with console log)
- `lettre` crate conflicts

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-15: Google OAuth PKCE Flow

**TASK ID:** `1B-15`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** `GET /api/v1/auth/oauth/google` (initiate) + `GET /api/v1/auth/callback/google` (callback). PKCE flow. Callback uses PATH routing `/auth/callback` (NOT hash routing — Gap Analysis §2).

**READ FIRST:**

- Phase 1 Detail §Week 16 Day 1-3 (Google OAuth PKCE)
- Gap Analysis §2 (OAuth Callback BUKAN Hash Routing)
- Spec 1 §5 (Routing Source-of-Truth Audit — MUST resolve before implementing)

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/auth/oauth.rs`
- `edusync-api/crates/api-server/src/auth/mod.rs`

**DO NOT TOUCH:**

- Frontend OAuth redirect handling
- Google OAuth credentials (use env vars)

**IMPLEMENTATION STEPS:**

1. `GET /api/v1/auth/oauth/google` → generate PKCE code_verifier + code_challenge, redirect to Google
2. Store PKCE verifier in short-lived DB or in-memory cache (keyed by `state` param)
3. `GET /api/v1/auth/callback/google?code=&state=` → exchange code for tokens
4. Get user info from Google (`userinfo` endpoint)
5. Create or update user in `public.users` (set `is_sso_user = true`)
6. Ensure profile exists
7. Create session (JWT)
8. Redirect to frontend with tokens: `{origin}/auth/callback?access_token=&refresh_token=` (PATH routing per Gap §2)

**COPY-PASTE STARTER:**

```rust
// crates/api-server/src/auth/oauth.rs
use axum::{extract::{State, Query}, response::Redirect};
use oauth2::{AuthorizationCode, CsrfToken, PkceCodeChallenge, PkceCodeVerifier, Scope};
use oauth2::basic::BasicClient;
use serde::Deserialize;
use crate::AppState;
use auth::error::AuthError;

#[derive(Deserialize)]
pub struct OAuthCallbackParams {
    pub code: String,
    pub state: String,
}

pub async fn initiate_google_oauth(
    State(state): State<AppState>,
) -> Result<Redirect, AuthError> {
    let client = build_oauth_client(&state)?;
    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();
    let (auth_url, csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new("email".into()))
        .add_scope(Scope::new("profile".into()))
        .set_pkce_challenge(pkce_challenge)
        .url();
    // Store verifier keyed by csrf_token (in-memory or Redis)
    // state.oauth_store.insert(csrf_token.secret().clone(), pkce_verifier);
    Ok(Redirect::temporary(auth_url.as_str()))
}

pub async fn google_callback(
    State(state): State<AppState>,
    Query(params): Query<OAuthCallbackParams>,
) -> Result<Redirect, AuthError> {
    // 1. Retrieve PKCE verifier by state param
    // 2. Exchange code for tokens
    // 3. Get user info from Google
    // 4. Create/update user + profile
    // 5. Create session
    // 6. Redirect to frontend (PATH routing, NOT hash!)
    let redirect_url = format!(
        "{}/auth/callback?access_token={}&refresh_token={}",
        state.frontend_url, "<access_token>", "<refresh_token>"
    );
    Ok(Redirect::temporary(&redirect_url))
}

fn build_oauth_client(state: &AppState) -> Result<BasicClient, AuthError> {
    // Build from GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET env vars
    todo!("Build OAuth2 BasicClient")
}
```

**VERIFY:**

```
cd edusync-api && cargo check
# Manual test: open browser to http://localhost:8080/api/v1/auth/oauth/google
# Should redirect to Google consent screen
```

**STOP IF:**

- Spec 1 §5 routing audit NOT resolved (hash vs path — MUST be confirmed first)
- Google OAuth credentials not available
- `oauth2` crate incompatible with VIL dependencies

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-16: MFA — TOTP Enrollment, Verify, Unenroll

**TASK ID:** `1B-16`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** `POST /api/v1/auth/mfa/enroll` + `POST /api/v1/auth/mfa/verify` + `DELETE /api/v1/auth/mfa/:factor_id`. Per Spec 1 §7.

**READ FIRST:**

- Phase 1 Detail §Week 17 (MFA Implementation)
- Spec 1 §7 (MFA Contract)

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/auth/mfa.rs`
- `edusync-api/crates/api-server/src/auth/mod.rs`

**DO NOT TOUCH:**

- `mfa_factors` table (sudah dari 1B-01)
- Frontend `mfaService.ts`

**IMPLEMENTATION STEPS:**

1. **Enroll:** Generate TOTP secret, QR code base64, 10 recovery codes. Store factor in DB (unverified).
2. **Verify:** Validate TOTP code against stored secret. If valid, mark `verified_at`. Return upgraded session with `mfa_verified: true`.
3. **Unenroll:** Delete factor by ID. Only owner can delete.
4. **Login with MFA:** Already handled in 1B-07 (returns `mfa_verified: false`). After verify, frontend gets new session.

**COPY-PASTE STARTER:**

```rust
// crates/api-server/src/auth/mfa.rs
use axum::{Json, extract::{State, Path}};
use axum::http::StatusCode;
use serde::{Serialize, Deserialize};
use totp_rs::{TOTP, Algorithm, Secret};
use crate::AppState;
use auth::{jwt::Claims, session, error::AuthError};

#[derive(Serialize)]
pub struct MfaEnrollResponse {
    pub factor_id: String,
    pub qr_code: String,       // base64 PNG
    pub secret_uri: String,    // otpauth:// URI
    pub recovery_codes: Vec<String>,
}

#[derive(Deserialize)]
pub struct MfaVerifyRequest {
    pub factor_id: String,
    pub code: String,
}

pub async fn enroll_mfa(
    State(state): State<AppState>,
    claims: Claims,
) -> Result<Json<MfaEnrollResponse>, AuthError> {
    let user_id: uuid::Uuid = claims.sub.parse().map_err(|_| AuthError::InvalidToken)?;
    // Check not already enrolled
    let existing = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM mfa_factors WHERE user_id = $1 AND verified_at IS NOT NULL)",
        user_id
    ).fetch_one(&state.db).await?.unwrap_or(false);
    if existing { return Err(AuthError::MfaAlreadyEnrolled); }

    let secret = Secret::generate_secret();
    let totp = TOTP::new(Algorithm::SHA1, 6, 1, 30,
        secret.to_bytes().unwrap()).unwrap();
    let qr = totp.get_qr_base64().unwrap();
    let uri = totp.get_url(&claims.email, "EduSync");
    // Generate 10 recovery codes
    let recovery: Vec<String> = (0..10).map(|_| {
        format!("{:08x}", rand::random::<u32>())
    }).collect();
    let factor_id = uuid::Uuid::new_v4();
    sqlx::query!(
        r#"INSERT INTO mfa_factors (id, user_id, secret_encrypted, recovery_codes)
           VALUES ($1, $2, $3, $4)"#,
        factor_id, user_id,
        &secret.to_encoded().to_string(),
        serde_json::to_value(&recovery).unwrap()
    ).execute(&state.db).await?;

    Ok(Json(MfaEnrollResponse {
        factor_id: factor_id.to_string(),
        qr_code: qr, secret_uri: uri,
        recovery_codes: recovery,
    }))
}

pub async fn verify_mfa(
    State(state): State<AppState>,
    claims: Claims,
    Json(body): Json<MfaVerifyRequest>,
) -> Result<Json<super::types::AuthResponse>, AuthError> {
    let user_id: uuid::Uuid = claims.sub.parse().map_err(|_| AuthError::InvalidToken)?;
    let factor_id: uuid::Uuid = body.factor_id.parse()
        .map_err(|_| AuthError::MfaFactorNotFound)?;
    let factor = sqlx::query!(
        "SELECT secret_encrypted FROM mfa_factors WHERE id = $1 AND user_id = $2",
        factor_id, user_id
    ).fetch_optional(&state.db).await?.ok_or(AuthError::MfaFactorNotFound)?;

    let secret = Secret::Encoded(factor.secret_encrypted);
    let totp = TOTP::new(Algorithm::SHA1, 6, 1, 30,
        secret.to_bytes().unwrap()).unwrap();
    if !totp.check_current(&body.code).unwrap_or(false) {
        return Err(AuthError::MfaInvalidCode);
    }
    // Mark verified
    sqlx::query!(
        "UPDATE mfa_factors SET verified_at = NOW() WHERE id = $1", factor_id
    ).execute(&state.db).await?;

    // Issue upgraded session with mfa_verified = true
    let roles: Vec<String> = sqlx::query_scalar!(
        "SELECT role FROM user_roles WHERE user_id = $1", user_id
    ).fetch_all(&state.db).await?;
    let tenant_id = sqlx::query_scalar!(
        "SELECT tenant_id FROM tenant_memberships WHERE user_id = $1 AND is_active = true LIMIT 1",
        user_id
    ).fetch_optional(&state.db).await?.map(|t| t.to_string()).unwrap_or_default();
    let tokens = session::create_session(
        &state.db, &user_id, &claims.email, roles, &tenant_id, true, &state.jwt_secret
    ).await?;
    let user = sqlx::query!(
        "SELECT email_confirmed_at, created_at, updated_at FROM public.users WHERE id = $1", user_id
    ).fetch_one(&state.db).await?;
    Ok(Json(super::types::AuthResponse {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        token_type: "bearer".into(),
        user: super::types::UserResponse {
            id: user_id.to_string(), email: claims.email,
            email_confirmed_at: user.email_confirmed_at.map(|t| t.to_rfc3339()),
            created_at: user.created_at.to_rfc3339(),
            updated_at: user.updated_at.to_rfc3339(),
        },
    }))
}

pub async fn unenroll_mfa(
    State(state): State<AppState>,
    claims: Claims,
    Path(factor_id): Path<String>,
) -> Result<StatusCode, AuthError> {
    let user_id: uuid::Uuid = claims.sub.parse().map_err(|_| AuthError::InvalidToken)?;
    let fid: uuid::Uuid = factor_id.parse().map_err(|_| AuthError::MfaFactorNotFound)?;
    let result = sqlx::query!(
        "DELETE FROM mfa_factors WHERE id = $1 AND user_id = $2", fid, user_id
    ).execute(&state.db).await?;
    if result.rows_affected() == 0 { return Err(AuthError::MfaFactorNotFound); }
    Ok(StatusCode::NO_CONTENT)
}
```

**VERIFY:**

```
cd edusync-api && cargo check
# Enroll:
curl -X POST http://localhost:8080/api/v1/auth/mfa/enroll \
  -H "Authorization: Bearer <jwt>"
# Scan QR, get code from authenticator, then verify:
curl -X POST http://localhost:8080/api/v1/auth/mfa/verify \
  -H "Authorization: Bearer <jwt>" \
  -H 'Content-Type: application/json' \
  -d '{"factor_id":"<id>","code":"123456"}'
```

**STOP IF:**

- `totp-rs` crate incompatible
- `mfa_factors` table schema mismatch dengan 1B-01
- `Secret::Encoded` API changed in newer `totp-rs` versions

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-17: `accept_invitation` RPC

**TASK ID:** `1B-17`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** `POST /api/v1/auth/accept-invitation` — accept teacher/admin invite to tenant. Validates invite token, adds user to tenant_memberships + user_roles.

**READ FIRST:**

- Phase 1 Detail §Week 19-20 (Port 8 Auth RPCs)
- Existing stored procedure `accept_invitation` di PostgreSQL

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/auth/invitations.rs`
- `edusync-api/crates/api-server/src/auth/mod.rs`

**DO NOT TOUCH:**

- Existing `accept_invitation` stored procedure
- `invitations` table schema

**IMPLEMENTATION STEPS:**

1. Parse `{ token }` from body
2. Lookup invitation by token in `invitations` table
3. Validate: not expired, not already accepted, email matches JWT
4. Insert into `tenant_memberships` (user_id, tenant_id, is_active, joined_at)
5. Insert into `user_roles` (user_id, tenant_id, role from invitation)
6. Mark invitation as accepted
7. Return updated bootstrap data

**COPY-PASTE STARTER:**

```rust
// crates/api-server/src/auth/invitations.rs
use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};
use crate::AppState;
use auth::{jwt::Claims, error::AuthError};

#[derive(Deserialize)]
pub struct AcceptInvitationRequest {
    pub token: String,
}

#[derive(Serialize)]
pub struct InvitationResult {
    pub tenant_id: String,
    pub role: String,
    pub status: String,
}

pub async fn accept_invitation(
    State(state): State<AppState>,
    claims: Claims,
    Json(body): Json<AcceptInvitationRequest>,
) -> Result<Json<InvitationResult>, AuthError> {
    let user_id: uuid::Uuid = claims.sub.parse()
        .map_err(|_| AuthError::InvalidToken)?;

    // 1. Lookup invitation
    let invite = sqlx::query!(
        r#"SELECT id, tenant_id, email, role, expires_at, accepted_at
           FROM invitations WHERE token = $1"#,
        body.token
    ).fetch_optional(&state.db).await?
     .ok_or(AuthError::ValidationError("Undangan tidak ditemukan".into()))?;

    // 2. Validate
    if invite.accepted_at.is_some() {
        return Err(AuthError::ValidationError("Undangan sudah digunakan".into()));
    }
    if invite.expires_at < chrono::Utc::now() {
        return Err(AuthError::ValidationError("Undangan sudah kedaluwarsa".into()));
    }
    if invite.email.to_lowercase() != claims.email.to_lowercase() {
        return Err(AuthError::ValidationError("Email tidak cocok dengan undangan".into()));
    }

    // 3. Add to tenant
    let now = chrono::Utc::now();
    sqlx::query!(
        r#"INSERT INTO tenant_memberships (user_id, tenant_id, is_active, status, joined_at)
           VALUES ($1, $2, true, 'active', $3)
           ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_active = true, status = 'active'"#,
        user_id, invite.tenant_id, now
    ).execute(&state.db).await?;

    // 4. Add role
    sqlx::query!(
        r#"INSERT INTO user_roles (user_id, tenant_id, role)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = $3"#,
        user_id, invite.tenant_id, invite.role
    ).execute(&state.db).await?;

    // 5. Mark accepted
    sqlx::query!(
        "UPDATE invitations SET accepted_at = $1 WHERE id = $2",
        now, invite.id
    ).execute(&state.db).await?;

    Ok(Json(InvitationResult {
        tenant_id: invite.tenant_id.to_string(),
        role: invite.role,
        status: "accepted".into(),
    }))
}
```

**VERIFY:**

```
cd edusync-api && cargo check
```

**STOP IF:**

- `invitations` table schema unknown (need to inspect columns: token, email, role, tenant_id, expires_at, accepted_at)
- `tenant_memberships` unique constraint different from expected

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-18: `validate_invitation` RPC

**TASK ID:** `1B-18`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** `GET /api/v1/auth/validate-invitation?token=` — check invite token validity. Public endpoint (no JWT required).

**READ FIRST:**

- Phase 1 Detail §Week 19-20 (Port 8 Auth RPCs)

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/auth/invitations.rs` (tambah function)
- `edusync-api/crates/api-server/src/auth/mod.rs`

**DO NOT TOUCH:**

- Existing `validate_invitation` stored procedure

**IMPLEMENTATION STEPS:**

1. Parse `token` from query params
2. Lookup invitation
3. Return: valid/invalid, email, role, tenant_name, expires_at

**COPY-PASTE STARTER:**

```rust
// Tambah ke invitations.rs
#[derive(Deserialize)]
pub struct ValidateQuery { pub token: String }

#[derive(Serialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub email: Option<String>,
    pub role: Option<String>,
    pub tenant_name: Option<String>,
    pub expires_at: Option<String>,
    pub reason: Option<String>,
}

pub async fn validate_invitation(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<ValidateQuery>,
) -> Json<ValidationResult> {
    let result = sqlx::query!(
        r#"SELECT i.email, i.role, i.expires_at, i.accepted_at, t.name as tenant_name
           FROM invitations i JOIN tenants t ON t.id = i.tenant_id
           WHERE i.token = $1"#,
        params.token
    ).fetch_optional(&state.db).await;

    match result {
        Ok(Some(inv)) => {
            if inv.accepted_at.is_some() {
                Json(ValidationResult {
                    valid: false, email: Some(inv.email), role: Some(inv.role),
                    tenant_name: Some(inv.tenant_name), expires_at: None,
                    reason: Some("Undangan sudah digunakan".into()),
                })
            } else if inv.expires_at < chrono::Utc::now() {
                Json(ValidationResult {
                    valid: false, email: Some(inv.email), role: Some(inv.role),
                    tenant_name: Some(inv.tenant_name), expires_at: Some(inv.expires_at.to_rfc3339()),
                    reason: Some("Undangan sudah kedaluwarsa".into()),
                })
            } else {
                Json(ValidationResult {
                    valid: true, email: Some(inv.email), role: Some(inv.role),
                    tenant_name: Some(inv.tenant_name), expires_at: Some(inv.expires_at.to_rfc3339()),
                    reason: None,
                })
            }
        }
        _ => Json(ValidationResult {
            valid: false, email: None, role: None, tenant_name: None,
            expires_at: None, reason: Some("Undangan tidak ditemukan".into()),
        }),
    }
}
```

**VERIFY:**

```
cd edusync-api && cargo check
curl "http://localhost:8080/api/v1/auth/validate-invitation?token=test"
```

**STOP IF:**

- `invitations` table schema unknown

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-19: `enroll_student` RPC

**TASK ID:** `1B-19`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** `POST /api/v1/auth/enroll-student` — student joins class via join code. Requires JWT.

**READ FIRST:**

- Phase 1 Detail §Week 19-20 (Port 8 Auth RPCs)

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/auth/enrollment.rs`
- `edusync-api/crates/api-server/src/auth/mod.rs`

**DO NOT TOUCH:**

- Existing `enroll_student` stored procedure
- `enrollments` table (note: uses `user_id`, NOT `student_id`)

**IMPLEMENTATION STEPS:**

1. Parse `{ join_code }` from body
2. Lookup class by join code
3. Validate class accepts new enrollments
4. Add student to `enrollments` table (`user_id`, NOT `student_id`)
5. Add to `tenant_memberships` + `user_roles` as 'student' if not already
6. Return enrollment confirmation

**COPY-PASTE STARTER:**

```rust
// crates/api-server/src/auth/enrollment.rs
use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};
use crate::AppState;
use auth::{jwt::Claims, error::AuthError};

#[derive(Deserialize)]
pub struct EnrollRequest { pub join_code: String }

#[derive(Serialize)]
pub struct EnrollResult {
    pub class_id: String,
    pub class_name: String,
    pub tenant_id: String,
    pub enrolled: bool,
}

pub async fn enroll_student(
    State(state): State<AppState>,
    claims: Claims,
    Json(body): Json<EnrollRequest>,
) -> Result<Json<EnrollResult>, AuthError> {
    let user_id: uuid::Uuid = claims.sub.parse()
        .map_err(|_| AuthError::InvalidToken)?;
    let class = sqlx::query!(
        r#"SELECT id, name, tenant_id, is_active
           FROM classes WHERE join_code = $1"#,
        body.join_code
    ).fetch_optional(&state.db).await?
     .ok_or(AuthError::ValidationError("Kode kelas tidak ditemukan".into()))?;
    if !class.is_active {
        return Err(AuthError::ValidationError("Kelas tidak menerima pendaftaran baru".into()));
    }
    // Enroll (user_id, NOT student_id)
    sqlx::query!(
        r#"INSERT INTO enrollments (user_id, class_id, tenant_id, status, enrolled_at)
           VALUES ($1, $2, $3, 'active', NOW())
           ON CONFLICT (user_id, class_id) DO NOTHING"#,
        user_id, class.id, class.tenant_id
    ).execute(&state.db).await?;
    // Ensure tenant membership as student
    sqlx::query!(
        r#"INSERT INTO tenant_memberships (user_id, tenant_id, is_active, status, joined_at)
           VALUES ($1, $2, true, 'active', NOW())
           ON CONFLICT (user_id, tenant_id) DO NOTHING"#,
        user_id, class.tenant_id
    ).execute(&state.db).await?;
    sqlx::query!(
        r#"INSERT INTO user_roles (user_id, tenant_id, role)
           VALUES ($1, $2, 'student')
           ON CONFLICT (user_id, tenant_id) DO NOTHING"#,
        user_id, class.tenant_id
    ).execute(&state.db).await?;
    Ok(Json(EnrollResult {
        class_id: class.id.to_string(),
        class_name: class.name,
        tenant_id: class.tenant_id.to_string(),
        enrolled: true,
    }))
}
```

**VERIFY:**

```
cd edusync-api && cargo check
```

**STOP IF:**

- `classes` or `enrollments` table schema unknown
- `enrollments` uses `student_id` instead of `user_id` (check actual DB)

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-20: `public_lookup_class` RPC

**TASK ID:** `1B-20`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** `GET /api/v1/auth/lookup-class?code=` — lookup class by join code. Public endpoint (no JWT).

**READ FIRST:**

- Phase 1 Detail §Week 19-20 (Port 8 Auth RPCs)

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/auth/enrollment.rs` (tambah function)
- `edusync-api/crates/api-server/src/auth/mod.rs`

**DO NOT TOUCH:**

- Existing `public_lookup_class` stored procedure

**IMPLEMENTATION STEPS:**

1. Parse `code` from query params
2. Lookup class + tenant name
3. Return limited public info (class name, teacher name, school name)

**COPY-PASTE STARTER:**

```rust
// Tambah ke enrollment.rs
#[derive(Deserialize)]
pub struct LookupQuery { pub code: String }

#[derive(Serialize)]
pub struct ClassLookup {
    pub found: bool,
    pub class_name: Option<String>,
    pub teacher_name: Option<String>,
    pub school_name: Option<String>,
}

pub async fn public_lookup_class(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<LookupQuery>,
) -> Json<ClassLookup> {
    let result = sqlx::query!(
        r#"SELECT c.name as class_name, t.name as school_name,
                  p.first_name || ' ' || COALESCE(p.last_name, '') as teacher_name
           FROM classes c
           JOIN tenants t ON t.id = c.tenant_id
           LEFT JOIN profiles p ON p.id = c.teacher_id
           WHERE c.join_code = $1 AND c.is_active = true"#,
        params.code
    ).fetch_optional(&state.db).await;
    match result {
        Ok(Some(r)) => Json(ClassLookup {
            found: true,
            class_name: Some(r.class_name),
            teacher_name: r.teacher_name,
            school_name: Some(r.school_name),
        }),
        _ => Json(ClassLookup {
            found: false, class_name: None, teacher_name: None, school_name: None,
        }),
    }
}
```

**VERIFY:**

```
cd edusync-api && cargo check
curl "http://localhost:8080/api/v1/auth/lookup-class?code=ABC123"
```

**STOP IF:**

- `classes` table schema unknown (need `join_code`, `teacher_id`, `is_active`)

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-21: `onboard_student_join_class` RPC

**TASK ID:** `1B-21`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** `POST /api/v1/auth/onboard-student` — complete student onboarding: register + enroll in one step. High complexity.

**READ FIRST:**

- Phase 1 Detail §Week 19-20 (Port 8 Auth RPCs — complexity: High)
- Existing `onboard_student_join_class` stored procedure

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/auth/enrollment.rs` (tambah function)
- `edusync-api/crates/api-server/src/auth/mod.rs`

**DO NOT TOUCH:**

- Existing stored procedure (keep as reference for parity)

**IMPLEMENTATION STEPS:**

1. Parse `{ email, password, join_code, first_name, last_name }` from body
2. Register user (reuse logic from 1B-06)
3. Lookup class by join code
4. Add to tenant_memberships + user_roles as 'student'
5. Enroll in class
6. Update profile with first_name, last_name
7. Create session
8. Return AuthResponse + enrollment info

**COPY-PASTE STARTER:**

```rust
// Tambah ke enrollment.rs
#[derive(Deserialize)]
pub struct OnboardStudentRequest {
    pub email: String,
    pub password: String,
    pub join_code: String,
    pub first_name: String,
    pub last_name: Option<String>,
}

pub async fn onboard_student_join_class(
    State(state): State<AppState>,
    Json(body): Json<OnboardStudentRequest>,
) -> Result<Json<serde_json::Value>, AuthError> {
    // 1. Validate
    let email = body.email.trim().to_lowercase();
    if body.password.len() < 8 { return Err(AuthError::WeakPassword); }

    // 2. Lookup class
    let class = sqlx::query!(
        "SELECT id, tenant_id, is_active FROM classes WHERE join_code = $1",
        body.join_code
    ).fetch_optional(&state.db).await?
     .ok_or(AuthError::ValidationError("Kode kelas tidak ditemukan".into()))?;
    if !class.is_active {
        return Err(AuthError::ValidationError("Kelas tidak menerima pendaftaran".into()));
    }

    // 3. Register user
    let user_id = uuid::Uuid::new_v4();
    let hash = auth::password::hash_password(&body.password)?;
    let now = chrono::Utc::now();
    sqlx::query!(
        r#"INSERT INTO public.users (id, email, password_hash, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $4)"#,
        user_id, &email, &hash, now
    ).execute(&state.db).await
     .map_err(|_| AuthError::EmailAlreadyExists)?;

    // 4. Create profile with name
    sqlx::query!(
        r#"INSERT INTO profiles (id, email, first_name, last_name, tenant_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $6)
           ON CONFLICT (id) DO UPDATE SET first_name=$3, last_name=$4"#,
        user_id, &email, &body.first_name, &body.last_name, class.tenant_id, now
    ).execute(&state.db).await?;

    // 5. Add tenant membership + role
    sqlx::query!(
        r#"INSERT INTO tenant_memberships (user_id, tenant_id, is_active, status, joined_at)
           VALUES ($1, $2, true, 'active', $3)"#,
        user_id, class.tenant_id, now
    ).execute(&state.db).await?;
    sqlx::query!(
        r#"INSERT INTO user_roles (user_id, tenant_id, role) VALUES ($1, $2, 'student')"#,
        user_id, class.tenant_id
    ).execute(&state.db).await?;

    // 6. Enroll in class
    sqlx::query!(
        r#"INSERT INTO enrollments (user_id, class_id, tenant_id, status, enrolled_at)
           VALUES ($1, $2, $3, 'active', $4)"#,
        user_id, class.id, class.tenant_id, now
    ).execute(&state.db).await?;

    // 7. Create session
    let tokens = auth::session::create_session(
        &state.db, &user_id, &email, vec!["student".into()],
        &class.tenant_id.to_string(), false, &state.jwt_secret
    ).await?;

    Ok(Json(serde_json::json!({
        "access_token": tokens.access_token,
        "refresh_token": tokens.refresh_token,
        "expires_in": tokens.expires_in,
        "token_type": "bearer",
        "enrolled": { "class_id": class.id.to_string(), "tenant_id": class.tenant_id.to_string() }
    })))
}
```

**VERIFY:**

```
cd edusync-api && cargo check
```

**STOP IF:**

- Transaction isolation needed (multi-table inserts should be atomic)
- `enrollments` schema mismatch

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-22: `create_school_tenant` RPC

**TASK ID:** `1B-22`

**OWNER TYPE:** Rust Coding Agent

**GOAL:** `POST /api/v1/auth/create-tenant` — create new school tenant. JWT required. High complexity.

**READ FIRST:**

- Phase 1 Detail §Week 19-20 (Port 8 Auth RPCs — complexity: High)
- Existing `create_school_tenant` stored procedure

**EDIT ONLY:**

- `edusync-api/crates/api-server/src/auth/tenant.rs`
- `edusync-api/crates/api-server/src/auth/mod.rs`

**DO NOT TOUCH:**

- Existing stored procedure
- `tenants` table schema

**IMPLEMENTATION STEPS:**

1. Parse `{ name, slug, logo? }` from body
2. Validate slug uniqueness
3. Create tenant in `tenants` table
4. Add creator as admin: `tenant_memberships` + `user_roles` with role 'admin'
5. Update profile `tenant_id` to new tenant
6. Return tenant info

**COPY-PASTE STARTER:**

```rust
// crates/api-server/src/auth/tenant.rs
use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};
use crate::AppState;
use auth::{jwt::Claims, error::AuthError};

#[derive(Deserialize)]
pub struct CreateTenantRequest {
    pub name: String,
    pub slug: String,
    pub logo: Option<String>,
}

#[derive(Serialize)]
pub struct TenantResult {
    pub tenant_id: String,
    pub name: String,
    pub slug: String,
}

pub async fn create_school_tenant(
    State(state): State<AppState>,
    claims: Claims,
    Json(body): Json<CreateTenantRequest>,
) -> Result<Json<TenantResult>, AuthError> {
    let user_id: uuid::Uuid = claims.sub.parse()
        .map_err(|_| AuthError::InvalidToken)?;
    let slug = body.slug.trim().to_lowercase();

    // Check slug uniqueness
    let exists = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM tenants WHERE slug = $1)", &slug
    ).fetch_one(&state.db).await?.unwrap_or(false);
    if exists {
        return Err(AuthError::ValidationError("Slug sudah digunakan".into()));
    }

    let tenant_id = uuid::Uuid::new_v4();
    let now = chrono::Utc::now();

    // Create tenant
    sqlx::query!(
        r#"INSERT INTO tenants (id, name, slug, logo, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $5)"#,
        tenant_id, &body.name, &slug, &body.logo, now
    ).execute(&state.db).await?;

    // Add creator as admin
    sqlx::query!(
        r#"INSERT INTO tenant_memberships (user_id, tenant_id, is_active, status, joined_at)
           VALUES ($1, $2, true, 'active', $3)"#,
        user_id, tenant_id, now
    ).execute(&state.db).await?;
    sqlx::query!(
        r#"INSERT INTO user_roles (user_id, tenant_id, role) VALUES ($1, $2, 'admin')"#,
        user_id, tenant_id
    ).execute(&state.db).await?;

    // Update profile default tenant
    sqlx::query!(
        "UPDATE profiles SET tenant_id = $1 WHERE id = $2 AND tenant_id IS NULL",
        tenant_id, user_id
    ).execute(&state.db).await?;

    Ok(Json(TenantResult {
        tenant_id: tenant_id.to_string(),
        name: body.name,
        slug,
    }))
}
```

**VERIFY:**

```
cd edusync-api && cargo check
```

**STOP IF:**

- `tenants` table schema unknown
- Transaction isolation needed

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 1B-23: Auth Integration Tests

**TASK ID:** `1B-23`

**OWNER TYPE:** Rust Test Agent

**GOAL:** Comprehensive integration tests untuk SEMUA auth endpoints. Ini adalah Gate 2 verification — semua tests HARUS pass sebelum proceed ke Phase 2.

**READ FIRST:**

- Spec 1 §9 (Auth Parity Test Suite — FULL checklist)
- Phase 1 Detail §Week 21-22 (Integration Tests + Gate Review)

**EDIT ONLY:**

- `edusync-api/tests/auth_integration.rs`

**DO NOT TOUCH:**

- Semua auth handler files (sudah dari 1B-02–1B-22)
- Frontend files

**IMPLEMENTATION STEPS:**

1. Setup test harness: in-memory or test DB, seed 3 dev accounts
2. Test register → login → bootstrap → profile cycle
3. Test bcrypt password migration (login with Supabase bcrypt hash)
4. Test token refresh (5-min-before-expiry simulation)
5. Test session expired → correct error response
6. Test signout → refresh token revoked
7. Test Google OAuth mock flow
8. Test MFA enroll → verify → login with MFA
9. Test tenant switching (client-side, verify JWT tenant_id)
10. Test role resolution (user_roles, NOT profiles.role)
11. Test `get_auth_bootstrap` response shape IDENTICAL to Supabase
12. Test error response shape IDENTICAL to PostgREST format
13. Test 3 dev accounts: teacher/student/admin @[edusync.dev](http://edusync.dev) login with password123
14. Test multi-tenant isolation
15. Test rate limiting
16. Test forgot/reset password flow
17. Test invitation accept flow
18. Test student enrollment via join code

**COPY-PASTE STARTER:**

```rust
// edusync-api/tests/auth_integration.rs
use reqwest::Client;
use serde_json::Value;

const BASE: &str = "http://localhost:8080/api/v1";

#[tokio::test]
async fn test_register_login_cycle() {
    let client = Client::new();
    // Register
    let resp = client.post(format!("{BASE}/auth/register"))
        .json(&serde_json::json!({"email":"test@test.com","password":"password123"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert!(body["access_token"].is_string());
    assert!(body["refresh_token"].is_string());
    assert_eq!(body["token_type"], "bearer");
    assert_eq!(body["expires_in"], 3600);

    // Login
    let resp = client.post(format!("{BASE}/auth/login"))
        .json(&serde_json::json!({"email":"test@test.com","password":"password123"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    let access_token = body["access_token"].as_str().unwrap();

    // Bootstrap
    let resp = client.get(format!("{BASE}/auth/bootstrap"))
        .header("Authorization", format!("Bearer {access_token}"))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let boot: Value = resp.json().await.unwrap();
    assert!(boot["profile"]["id"].is_string());
    assert!(boot["profile"]["email"].is_string());
    assert!(boot["memberships"].is_array());
}

#[tokio::test]
async fn test_existing_dev_accounts() {
    let client = Client::new();
    for email in ["teacher@edusync.dev", "student@edusync.dev", "admin@edusync.dev"] {
        let resp = client.post(format!("{BASE}/auth/login"))
            .json(&serde_json::json!({"email": email, "password": "password123"}))
            .send().await.unwrap();
        assert_eq!(resp.status(), 200, "Failed login for {email}");
    }
}

#[tokio::test]
async fn test_error_response_shape() {
    let client = Client::new();
    let resp = client.post(format!("{BASE}/auth/login"))
        .json(&serde_json::json!({"email":"nobody@test.com","password":"wrong"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 401);
    let body: Value = resp.json().await.unwrap();
    // Must match PostgREST shape
    assert!(body["code"].is_string());
    assert!(body["message"].is_string());
    assert!(body.get("details").is_some()); // can be null
    assert!(body.get("hint").is_some());    // can be null
}

#[tokio::test]
async fn test_token_refresh_and_rotation() {
    let client = Client::new();
    let resp = client.post(format!("{BASE}/auth/login"))
        .json(&serde_json::json!({"email":"teacher@edusync.dev","password":"password123"}))
        .send().await.unwrap();
    let body: Value = resp.json().await.unwrap();
    let refresh = body["refresh_token"].as_str().unwrap();

    // Refresh
    let resp = client.post(format!("{BASE}/auth/refresh"))
        .json(&serde_json::json!({"refresh_token": refresh}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let new_body: Value = resp.json().await.unwrap();
    assert_ne!(new_body["access_token"], body["access_token"]);
    assert_ne!(new_body["refresh_token"], body["refresh_token"]);

    // Old refresh token should be revoked
    let resp = client.post(format!("{BASE}/auth/refresh"))
        .json(&serde_json::json!({"refresh_token": refresh}))
        .send().await.unwrap();
    assert_ne!(resp.status(), 200); // Should fail
}

#[tokio::test]
async fn test_signout_returns_204() {
    let client = Client::new();
    let resp = client.post(format!("{BASE}/auth/signout"))
        .json(&serde_json::json!({"refresh_token": "any"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 204);
}

#[tokio::test]
async fn test_password_reset_flow() {
    let client = Client::new();
    // Request always 200
    let resp = client.post(format!("{BASE}/auth/reset-password"))
        .json(&serde_json::json!({"email":"teacher@edusync.dev"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);

    // Non-existent email also 200 (prevent enumeration)
    let resp = client.post(format!("{BASE}/auth/reset-password"))
        .json(&serde_json::json!({"email":"nobody@nobody.com"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
}

#[tokio::test]
async fn test_bootstrap_parity_with_supabase() {
    // TODO: Call both Supabase RPC and VIL endpoint
    // Compare response shapes field-by-field
    // This is the MOST CRITICAL parity test
}
```

**VERIFY:**

```
cd edusync-api && cargo test --test auth_integration
# ALL tests must pass for Gate 2
```

**STOP IF:**

- ANY test fails — fix the underlying handler first
- Test DB not seeded with 3 dev accounts
- `get_auth_bootstrap` parity test shows field mismatch

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Gate 2 Checklist (EXIT POINT TERAKHIR)

<aside>
🚪

**Semua criteria di bawah HARUS pass sebelum proceed ke Phase 2.** Jika VIL auth tidak bisa full parity → **STOP**. Tetap pakai Supabase Auth, migrasi hanya Edge Functions.

</aside>

- [ ] Register/login works (email + password)
- [ ] Google OAuth works (PKCE flow + path routing redirect)
- [ ] MFA works (TOTP enroll/verify/unenroll)
- [ ] Token refresh works (5 min before expiry auto-refresh)
- [ ] Password hash compat (bcrypt Supabase + Argon2 VIL)
- [ ] 3 dev accounts login (teacher/student/admin @[edusync.dev](http://edusync.dev))
- [ ] Multi-tenant isolation (TenantGuard verified)
- [ ] 5 roles RBAC (RbacGuard verified)
- [ ] Rate limiting (per-tenant, per-user)
- [ ] Brute force protection (5 attempts → 15 min lockout)
- [ ] Feature flag switch (`VITE_API_BACKEND=vil` works for auth)
- [ ] `get_auth_bootstrap` response IDENTICAL to Supabase
- [ ] Error response shape IDENTICAL to PostgREST format
- [ ] Forgot/reset password flow complete
- [ ] E2E auth tests pass against VIL server
- [ ] `cargo test` — all auth tests pass
- [ ] `cargo clippy` — no warnings in auth crates
