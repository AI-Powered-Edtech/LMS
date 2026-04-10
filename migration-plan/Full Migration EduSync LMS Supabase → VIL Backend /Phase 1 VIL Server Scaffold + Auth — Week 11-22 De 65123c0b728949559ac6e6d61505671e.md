# Phase 1: VIL Server Scaffold + Auth — Week 11-22 Detail

<aside>
🎯

**Goal:** VIL Rust server running, auth 100% parity dengan Supabase, reverse proxy ke Supabase untuk endpoint yang belum di-migrate.

**Duration:** 12 minggu | **Effort:** ~180 jam | **Deliverable:** Login/signup/OAuth/MFA berjalan via VIL

</aside>

---

## Week 11-12: VIL Project Setup & Basic Server

**Goal:** Initialize Rust project + basic HTTP server running

### Week 11: Project Structure

```
edusync-api/
├── Cargo.toml (workspace)
├── crates/
│   ├── api-server/      # Main HTTP server (VilApp)
│   ├── models/          # Database models (sqlx::FromRow)
│   ├── auth/            # Authentication (JWT, password, MFA)
│   ├── middleware/      # TenantGuard, RbacGuard, CORS
│   └── services/        # Business logic (RPCs)
├── migrations/          # sqlx migrations (parallel with Supabase for now)
└── docker-compose.yml
```

**Day 1-2: Init + Dependencies**

```toml
# Cargo.toml
[workspace]
members = ["crates/*"]

[workspace.dependencies]
vil-server = "0.1"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
sqlx = { version = "0.8", features = ["runtime-tokio", "postgres", "uuid", "chrono"] }
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
jsonwebtoken = "9"
argon2 = "0.5"
bcrypt = "0.15"
reqwest = { version = "0.12", features = ["json"] }
```

**Day 3-4: Database Connection**

```rust
// crates/api-server/src/main.rs
use sqlx::postgres::PgPoolOptions;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect ke PostgreSQL YANG SAMA dengan Supabase
    let database_url = env::var("DATABASE_URL")?;
    let pool = PgPoolOptions::new()
        .max_connections(25)
        .connect(&database_url)
        .await?;

    // Verify connection
    let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM profiles")
        .fetch_one(&pool)
        .await?;
    println!("Connected! {} profiles found", row.0);
    Ok(())
}
```

**Day 5: Docker Compose**

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://postgres:password@db:5432/edusync
      JWT_SECRET: ${JWT_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
    depends_on:
      - db
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

### Week 12-13: Basic VIL Server + Reverse Proxy

**Day 1-2: Health Check Endpoint**

```rust
use vil_server::prelude::*;
use sqlx::postgres::PgPoolOptions;

#[derive(Clone)]
struct AppState {
    db: sqlx::PgPool,
    jwt_secret: String,
}

async fn health_check() -> impl IntoResponse {
    Json(serde_json::json!({ "status": "ok", "service": "edusync-api", "version": "0.1.0" }))
}

#[tokio::main]
async fn main() {
    // Connect ke PostgreSQL YANG SAMA dengan Supabase
    let db = PgPoolOptions::new()
        .max_connections(50)
        .connect(&std::env::var("DATABASE_URL").unwrap())
        .await
        .unwrap();

    let state = AppState {
        db,
        jwt_secret: std::env::var("JWT_SECRET").unwrap(),
    };

    // VIL: ServiceProcess = Service-as-Process
    let health = ServiceProcess::new("health")
        .endpoint(Method::GET, "/api/v1/health", get(health_check));

    // VIL: VilApp = Process topology builder
    // .observer(true) enables /_vil/dashboard/ with live metrics, SLO budget
    // .profile("prod") applies: 50 DB conn, warn logging, 256MB SHM
    VilApp::new("edusync-api")
        .port(8080)
        .profile("prod")
        .state(state)
        .observer(true)    // Auto: /health, /ready, /metrics, /_vil/dashboard/
        .service(health)
        .run()
        .await;
}
```

**Day 3-4: Reverse Proxy Setup**

```
# nginx.conf — strangler fig pattern
server {
    listen 80;

    # Phase 1: Auth endpoints → VIL
    location /api/v1/auth {
        proxy_pass http://vil-server:8080;
        # 🆕 CORS headers
        add_header Access-Control-Allow-Origin "http://localhost:5173" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Client-Info";
    }

    # Everything else → Supabase (gradual cutover)
    location /api/v1/ {
        proxy_pass http://supabase-kong:8000;
    }

    # Frontend (dev)
    location / {
        proxy_pass http://frontend:5173;
    }
}
```

**Day 5: 🆕 CORS Middleware**

```rust
// crates/middleware/src/cors.rs
use vil_server::middleware::Middleware;

pub struct CorsMiddleware {
    allowed_origins: Vec<String>,
}

impl CorsMiddleware {
    pub fn new(origins: Vec<String>) -> Self {
        Self { allowed_origins: origins }
    }
}

// Allow localhost:5173 (dev) and production domain
// Must handle preflight OPTIONS requests
```

**Deliverable:** VIL server running, health check works, reverse proxy routes to Supabase.

---

## Week 14-16: Auth Implementation (Critical Path)

<aside>
⚠️

**Ini area paling kritis.** Supabase menyimpan users di `auth.users` schema yang terpisah dari `public.profiles`. Password hashes, OAuth tokens, MFA enrollment semua di `auth` schema.

</aside>

### Week 14: JWT + Password Foundation

**Day 1-2: JWT Module**

```rust
// crates/auth/src/jwt.rs
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,           // user_id (UUID)
    pub email: String,
    pub roles: Vec<String>,    // ["teacher"], ["student"], etc.
    pub tenant_id: String,     // tenant UUID
    pub exp: usize,            // expiry
    pub iat: usize,            // issued at
}

pub fn create_access_token(claims: &Claims, secret: &str) -> Result<String, Error> {
    // Access token: 1 hour expiry
    // Must be compatible with frontend useAuth() hook
    encode(
        &Header::default(),
        claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

pub fn create_refresh_token(user_id: &str, secret: &str) -> Result<String, Error> {
    // Refresh token: 30 days expiry
    // Frontend refreshes 5 min before expiry (useSessionManagement.ts)
}

pub fn verify_token(token: &str, secret: &str) -> Result<Claims, Error> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )?;
    Ok(token_data.claims)
}
```

**Day 3-4: Password Hashing (Dual-Format)**

```rust
// crates/auth/src/password.rs
use argon2::{Argon2, PasswordHasher, PasswordVerifier, password_hash::SaltString};
use bcrypt;

/// Verify password against hash — supports both Argon2 (VIL) and bcrypt (Supabase legacy)
pub fn verify_password(password: &str, hash: &str) -> Result<bool, Error> {
    // Try Argon2 first (new VIL format)
    if let Ok(parsed) = argon2::PasswordHash::new(hash) {
        return Ok(Argon2::default().verify_password(password.as_bytes(), &parsed).is_ok());
    }

    // Fallback: try bcrypt (Supabase GoTrue format)
    if let Ok(valid) = bcrypt::verify(password, hash) {
        return Ok(valid);
    }

    Ok(false)
}

/// Hash new password with Argon2 (VIL standard)
pub fn hash_password(password: &str) -> Result<String, Error> {
    let salt = SaltString::generate(&mut rand::thread_rng());
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)?
        .to_string();
    Ok(hash)
}

/// Re-hash on successful login (migrate bcrypt → argon2)
pub async fn maybe_rehash(pool: &PgPool, user_id: &str, password: &str, current_hash: &str) -> Result<(), Error> {
    if current_hash.starts_with("$2") {
        // bcrypt hash detected — re-hash with argon2
        let new_hash = hash_password(password)?;
        sqlx::query!("UPDATE users SET password_hash = $1 WHERE id = $2", new_hash, user_id)
            .execute(pool)
            .await?;
    }
    Ok(())
}
```

**Day 5: 🆕 `auth.users` Migration Plan**

```sql
-- Migration: Create public.users from auth.users
-- KRITIS: Supabase stores users di schema 'auth' yang terpisah

-- Step 1: Create users table in public schema
CREATE TABLE public.users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    email_confirmed_at TIMESTAMPTZ,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_sign_in_at TIMESTAMPTZ,
    raw_app_meta_data JSONB DEFAULT '{}',
    raw_user_meta_data JSONB DEFAULT '{}'
);

-- Step 2: Copy data from auth.users (run once)
INSERT INTO public.users (id, email, password_hash, email_confirmed_at, phone, created_at, updated_at)
SELECT id, email, encrypted_password, email_confirmed_at, phone, created_at, updated_at
FROM auth.users;

-- Step 3: profiles.id already FK to auth.users.id — update to public.users.id
-- (Same UUIDs, just different schema)

-- Step 4: Create trigger to sync during dual-running period
CREATE OR REPLACE FUNCTION sync_auth_to_public_users() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, password_hash, email_confirmed_at)
    VALUES (NEW.id, NEW.email, NEW.encrypted_password, NEW.email_confirmed_at)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        email_confirmed_at = EXCLUDED.email_confirmed_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Week 15: Session + Register/Login Endpoints

**Day 1-2: Register Endpoint**

```rust
// crates/api-server/src/auth/register.rs
#[post("/api/v1/auth/register")]
async fn register(
    State(ctx): State<AppContext>,
    Json(body): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    // 1. Validate email format (GOTCHA: .test TLD fails, .dev works)
    // 2. Check email not already taken
    // 3. Hash password with Argon2
    // 4. Insert into public.users
    // 5. Call ensure_profile_exists RPC
    // 6. Generate JWT with roles from user_roles table
    // 7. Return { access_token, refresh_token, user }
}

#[derive(Deserialize)]
struct RegisterRequest {
    email: String,
    password: String,
    metadata: Option<UserMetadata>,
}

// 🆕 API response format must match Supabase pattern
// Frontend handleSupabaseError() in supabaseUtils.ts depends on this
#[derive(Serialize)]
struct AuthResponse {
    access_token: String,
    refresh_token: String,
    expires_in: u64,
    user: UserResponse,
}

#[derive(Serialize)]
struct AppError {
    code: String,
    message: String,
    details: Option<String>,
    hint: Option<String>,
}
```

**Day 3-4: Login + Token Refresh**

```rust
#[post("/api/v1/auth/login")]
async fn login(
    State(ctx): State<AppContext>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    // 1. Find user by email
    // 2. Verify password (dual-format: argon2 or bcrypt)
    // 3. Re-hash if bcrypt (migrate to argon2)
    // 4. Get roles from user_roles table (NOT profiles.role!)
    // 5. Get tenant_id from tenant_memberships
    // 6. Generate JWT claims { sub, email, roles, tenant_id }
    // 7. Create access_token (1hr) + refresh_token (30d)
}

#[post("/api/v1/auth/refresh")]
async fn refresh_token(
    State(ctx): State<AppContext>,
    Json(body): Json<RefreshRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    // Frontend refreshes 5 min before expiry
    // Verify refresh token → issue new access + refresh tokens
}
```

**Day 5: SignOut + Session Cleanup**

```rust
#[post("/api/v1/auth/signout")]
async fn sign_out(
    State(ctx): State<AppContext>,
    headers: HeaderMap,
) -> Result<StatusCode, AppError> {
    // Invalidate refresh token in DB
    // GOTCHA: Frontend clears React state BEFORE calling this
    Ok(StatusCode::NO_CONTENT)
}
```

### Week 16: OAuth (Google) + Email Verification

**Day 1-3: Google OAuth PKCE Flow**

```rust
// crates/auth/src/oauth.rs

#[get("/api/v1/auth/oauth/google")]
async fn initiate_google_oauth(
    State(ctx): State<AppContext>,
    Query(params): Query<OAuthParams>,
) -> Result<Redirect, AppError> {
    // Generate PKCE code_verifier + code_challenge
    // Redirect to Google authorization URL
    // 🆕 redirect_uri must handle hash routing /#/
}

#[get("/api/v1/auth/callback/google")]
async fn google_callback(
    State(ctx): State<AppContext>,
    Query(params): Query<CallbackParams>,
) -> Result<Redirect, AppError> {
    // 1. Exchange code for tokens via Google API
    // 2. Get user info from Google
    // 3. Create or update user in DB
    // 4. Generate JWT
    // 5. 🆕 Redirect to /#/auth/callback?token=... (hash routing)
}
```

**Day 4-5: Email Verification**

```rust
// Email verification via Resend/SendGrid
// GOTCHA: .test TLD emails fail — use .dev for dev accounts
#[post("/api/v1/auth/verify-email")]
async fn verify_email(
    State(ctx): State<AppContext>,
    Json(body): Json<VerifyEmailRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    // Verify token → mark email_confirmed_at
}
```

---

## Week 17: 🆕 MFA Implementation

<aside>
⚠️

**Gap yang sering terlewat!** Supabase punya built-in TOTP MFA. `mfaService.ts` sudah ada di frontend. Harus di-port ke VIL.

</aside>

```rust
// crates/auth/src/mfa.rs
use totp_rs::{TOTP, Algorithm, Secret};

/// Enroll MFA — generate TOTP secret + QR code
#[post("/api/v1/auth/mfa/enroll")]
async fn enroll_mfa(
    State(ctx): State<AppContext>,
    claims: Claims,
) -> Result<Json<MFAEnrollResponse>, AppError> {
    let secret = Secret::generate_secret();
    let totp = TOTP::new(Algorithm::SHA1, 6, 1, 30, secret.to_bytes().unwrap())?;
    let qr_code = totp.get_qr_base64()?;

    // Store factor in DB (encrypted)
    // Return { factor_id, qr_code, secret_uri, recovery_codes }
}

/// Verify MFA code
#[post("/api/v1/auth/mfa/verify")]
async fn verify_mfa(
    State(ctx): State<AppContext>,
    Json(body): Json<MFAVerifyRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    // Load TOTP secret from DB
    // Verify code matches current time window
    // If valid → upgrade JWT to include mfa_verified claim
}

/// Unenroll MFA
#[delete("/api/v1/auth/mfa/:factor_id")]
async fn unenroll_mfa(
    State(ctx): State<AppContext>,
    Path(factor_id): Path<String>,
    claims: Claims,
) -> Result<StatusCode, AppError> {
    // Remove factor from DB
}
```

---

## Week 18-20: Tenant & RBAC Middleware + Auth RPCs

### Week 18: TenantGuard Middleware

```rust
// crates/middleware/src/tenant.rs
/// Replaces get_my_tenant_id() SQL function + auto_set_tenant_id() trigger
pub struct TenantGuard;

impl<S> Middleware<S> for TenantGuard {
    async fn handle(&self, req: Request, next: Next<S>) -> Response {
        let claims = req.extensions().get::<Claims>()
            .ok_or(StatusCode::UNAUTHORIZED)?;

        let tenant_id = &claims.tenant_id;
        // Inject tenant context into all downstream handlers
        req.extensions_mut().insert(TenantId(tenant_id.clone()));
        next.run(req).await
    }
}
```

### Week 18: RbacGuard Middleware (VIL Built-in)

<aside>
🦀

**VIL sudah punya `RbacPolicy` built-in** dengan wildcard permissions. Tidak perlu implement RBAC dari scratch.

</aside>

```rust
use vil_server::auth::rbac::{RbacPolicy, Role};

// VIL built-in RBAC — configure 5 EduSync roles
let policy = RbacPolicy::new();
policy.add_role(Role::new("admin")
    .permission("courses:*").permission("users:*")
    .permission("analytics:*").permission("settings:*"));
policy.add_role(Role::new("principal")
    .permission("analytics:*").permission("reports:*")
    .permission("surveys:*"));
policy.add_role(Role::new("teacher")
    .permission("courses:*").permission("quizzes:*")
    .permission("gradebook:*").permission("attendance:*")
    .permission("analytics:read"));
policy.add_role(Role::new("student")
    .permission("courses:read").permission("quizzes:submit")
    .permission("progress:read").permission("assignments:submit"));
policy.add_role(Role::new("parent")
    .permission("progress:read").permission("messages:*")
    .permission("attendance:read").permission("grades:read"));

// IMPORTANT: Role comes from user_roles table, NOT profiles.role!
// Check in handler:
policy.check_permission(&["teacher"], "courses:write"); // → true
policy.check_permission(&["student"], "courses:write"); // → false
// Wildcard: "courses:*" matches "courses:read", "courses:write", etc.
```

### Week 19-20: Port 8 Auth RPCs

| **RPC** | **Purpose** | **Complexity** |
| --- | --- | --- |
| `ensure_profile_exists` | Create/update profile on login | Medium |
| `get_auth_bootstrap` | Load user + roles + tenant on app start | Medium |
| `accept_invitation` | Accept teacher/admin invite to tenant | Medium |
| `enroll_student` | Student joins class via code | Medium |
| `validate_invitation` | Check invite token validity | Simple |
| `public_lookup_class` | Lookup class by join code (public) | Simple |
| `onboard_student_join_class` | Complete student onboarding flow | High |
| `create_school_tenant` | Create new school tenant | High |

### Week 20: Rate Limiting + Brute Force + CSRF (VIL Built-in)

<aside>
🦀

**VIL sudah punya `RateLimit`, `BruteForceProtection`, dan `CsrfProtection` built-in** — tidak perlu implement dari scratch. Cukup configure.

</aside>

**Rate Limiting:**

```rust
use vil_server::auth::rate_limit::RateLimit;
use std::time::Duration;

// VIL built-in rate limiter — token bucket per key
let auth_limiter = RateLimit::new(10, Duration::from_secs(60));    // Auth: 10/min per IP
let ai_limiter = RateLimit::new(50, Duration::from_secs(3600));    // AI: 50/hr per user
let quiz_limiter = RateLimit::new(5, Duration::from_secs(60));     // Quiz submit: 5/min (anti-cheat)
let general_limiter = RateLimit::new(100, Duration::from_secs(60)); // General: 100/min per user

// Usage in handler:
async fn submit_quiz(
    State(ctx): State<AppState>,
    claims: Claims,
    Json(body): Json<QuizSubmission>,
) -> Result<Json<QuizResult>, VilError> {
    // Check rate limit using user_id as key
    if quiz_limiter.check(&claims.sub).is_err() {
        return Err(VilError::too_many_requests("Terlalu banyak percobaan. Coba lagi nanti."));
    }
    // ... business logic
}
```

**🆕 Brute Force Protection (Gap #4):**

```rust
use vil_server::auth::security::BruteForceProtection;
use std::time::Duration;

// VIL built-in brute force protection — track failed attempts per-IP/per-account
let brute_force = BruteForceProtection::new()
    .max_attempts(5)                              // Lock after 5 failed attempts
    .lockout_duration(Duration::from_secs(900))   // 15 min lockout
    .tracking_window(Duration::from_secs(600));   // Count attempts in 10 min window

// Usage in login handler:
async fn login(
    State(ctx): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, VilError> {
    let key = format!("login:{}:{}", client_ip, body.email);
    brute_force.check(&key)
        .map_err(|_| VilError::too_many_requests(
            "Terlalu banyak percobaan login. Akun terkunci 15 menit."
        ))?;

    match verify_password(&body.password, &user.password_hash) {
        Ok(true) => {
            brute_force.record_success(&key);  // Reset counter
            // ... issue JWT
        }
        _ => {
            brute_force.record_failure(&key);  // Increment counter
            Err(VilError::unauthorized("Email atau password salah"))
        }
    }
}
```

**🆕 CSRF Protection (Gap #7):**

```rust
use vil_server::auth::csrf::{CsrfConfig, CsrfProtection};

// VIL built-in CSRF — double-submit cookie pattern
let csrf = CsrfProtection::new(
    CsrfConfig::new()
        .exempt_path("/api/v1/auth/login")      // Public auth endpoints
        .exempt_path("/api/v1/auth/register")
        .exempt_path("/api/v1/auth/refresh")
        .exempt_path("/api/v1/auth/callback/google")  // OAuth callback
        .exempt_path("/api/v1/lti/launch")       // LTI uses form POST
        .exempt_path("/api/v1/lti/oidc-login")
        .exempt_path("/api/v1/health")
);

// Apply as middleware layer to VilApp
// All non-exempt state-changing requests (POST/PUT/DELETE) require CSRF token
```

---

## Week 21-22: Auth Testing + Phase 1 Gate Review

### Week 21: Integration Tests

```rust
#[cfg(test)]
mod auth_tests {
    #[tokio::test]
    async fn test_register_login_cycle() {
        // Register → login → get profile → logout
    }

    #[tokio::test]
    async fn test_google_oauth_flow() {
        // Mock Google → callback → JWT issued
    }

    #[tokio::test]
    async fn test_token_refresh() {
        // Login → wait → refresh → new token valid
    }

    #[tokio::test]
    async fn test_bcrypt_password_migration() {
        // Login with bcrypt hash → verify re-hashed to argon2
    }

    #[tokio::test]
    async fn test_mfa_enrollment_and_verify() {
        // Enroll → get QR → verify TOTP code → MFA active
    }

    #[tokio::test]
    async fn test_tenant_isolation() {
        // User A (tenant 1) cannot access tenant 2 data
    }

    #[tokio::test]
    async fn test_rbac_enforcement() {
        // Student cannot access teacher endpoints
    }

    #[tokio::test]
    async fn test_existing_dev_accounts() {
        // teacher@edusync.dev, student@edusync.dev, admin@edusync.dev
        // Must login with password123
    }
}
```

### Week 22: Phase 1 Gate Review

| **Criteria** | **Target** | **Status** |
| --- | --- | --- |
| Register/login works | Email + password flow complete | ⬜ |
| Google OAuth works | PKCE flow + hash routing redirect | ⬜ |
| MFA works | TOTP enroll/verify/unenroll | ⬜ |
| Token refresh works | 5 min before expiry auto-refresh | ⬜ |
| Password hash compat | bcrypt (Supabase) + argon2 (VIL) | ⬜ |
| 3 dev accounts login | teacher/student/admin @[edusync.dev](http://edusync.dev) | ⬜ |
| Multi-tenant isolation | TenantGuard verified | ⬜ |
| 5 roles RBAC | RbacGuard verified | ⬜ |
| Rate limiting | Per-tenant, per-user | ⬜ |
| 🆕 Brute force protection | 5 attempts → 15 min lockout | ⬜ |
| 🆕 CSRF protection | Double-submit cookie on state-changing endpoints | ⬜ |
| Feature flag switch | `VITE_API_BACKEND=vil` works for auth | ⬜ |
| E2E auth tests pass | Against VIL server | ⬜ |

<aside>
🚪

**Gate 2 Decision (EXIT POINT TERAKHIR):** Jika VIL auth tidak bisa full parity (PKCE, MFA, email verification, password hash compat) → **STOP**. Tetap pakai Supabase Auth, migrasi hanya Edge Functions. Jika pass → proceed ke Phase 2.

</aside>