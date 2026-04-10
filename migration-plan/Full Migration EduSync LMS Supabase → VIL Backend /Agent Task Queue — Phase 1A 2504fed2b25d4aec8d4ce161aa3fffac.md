# Agent Task Queue — Phase 1A

<aside>
🦀

**Untuk AI Coding Agents — Phase 1A: VIL Server Scaffold.**

Setiap task di bawah adalah **self-contained** — agent tinggal copas kode dan execute.

Task harus dikerjakan **berurutan** kecuali ditandai PARALLEL.

**Source of truth:** Main Plan, Spec 3, Spec 4, Agent Bootstrap Context, Phase 1 Detail.

**Target:** VIL Rust server running, health/ready/metrics endpoints, reverse proxy ke Supabase, Docker Compose, CI/CD, observability baseline.

</aside>

---

## Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** gunakan `npm` atau `yarn` — Rust workspace pakai `cargo`, frontend pakai `pnpm`
3. Jalankan verify commands setelah setiap task
4. **JANGAN** ubah `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`
5. **JANGAN** buat keputusan arsitektur baru — semua sudah locked di spec
6. Jika ketemu coupling tak terduga → **BLOCKED**, bukan improvisasi
7. VIL version: **pin ke specific git tag** di `Cargo.toml` (Spec 4 §11)
8. Multi-tenancy adalah **100% custom** `TenantGuard` middleware (Spec 4 §4 — VIL multi-tenancy NOT open-source)
9. **🛠️ Rollback rule (Gap #9):** Commit SEBELUM mulai task: `git add -A && git commit -m "checkpoint: before task 1A-XX"`. Jika verify gagal: `git stash` atau `git checkout -- <files>`. JANGAN lanjut dengan state setengah jadi.
10. **🛠️ Nginx route update (Gap #5):** Setiap task yang menambah endpoint baru HARUS dicatat. Task 1A-9 (Nginx config) harus mencakup SEMUA routes yang dibuat di Phase 1A. Jika ada endpoint baru setelah 1A-9, buat sub-task update.

<aside>
📝

**Source of Truth:** **6 Execution Contracts** di [Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](../Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20%20ace54d0159584b0c8330eaad52e6e05b.md). Contract 1 (Routing) = path-based. Nginx HARUS fallback semua `/app/*`, `/auth/*`, `/login`, `/register` ke `index.html`. Contract 6 (Cutover Rehearsal) = VIL health check + load comparison wajib di akhir Phase 1A.

</aside>

---

## Effort Estimate

**Total: ~25-35 jam** (tergantung VIL API compatibility)

| Wave   | Tasks                              | Jam | Parallelism                 |
| ------ | ---------------------------------- | --- | --------------------------- |
| Wave 0 | 1A-0 (VIL verify)                  | 2-3 | Serial (blocking)           |
| Wave 1 | 1A-1                               | 2-3 | Serial                      |
| Wave 2 | 1A-2 + 1A-8 + 1A-10                | 5-7 | **Parallel** (3 agents)     |
| Wave 3 | 1A-3 + 1A-4 + 1A-9                 | 5-7 | **Parallel** (setelah deps) |
| Wave 4 | 1A-5 + 1A-6 + 1A-7 + 1A-11 + 1A-12 | 6-8 | **Parallel** (setelah 1A-4) |
| Wave 5 | 1A-13                              | 2-3 | Serial (integration)        |

---

## Git Branch Strategy

<aside>
🔀

**Branch naming:** `phase1a/<task-id>` (e.g. `phase1a/1a-2-appstate`)

**Merge order:** 1A-0 → 1A-1 → {1A-2, 1A-8, 1A-10 parallel} → merge ke `phase1a/main` → {1A-3, 1A-4, 1A-9} → dst.

**Conflict hotspot:** `main.rs` diedit oleh 1A-2, 1A-4, 1A-6, 1A-11. Merge 1A-2 dulu, lalu 1A-4 rebase, lalu 1A-6/1A-11.

**Rollback per task:** `git stash` atau `git checkout -- <files>` jika verify gagal. Setiap task hanya edit file di EDIT ONLY scope.

</aside>

---

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
  ├── 1A-8  Docker Compose (VIL + PgBouncer + Nginx)  [PARALLEL with 1A-2]
  │     │
  │     └── 1A-9  Nginx reverse proxy config
  │
  ├── 1A-10 CI/CD pipeline (.github/workflows)  [PARALLEL with 1A-2]
  │
  ├── 1A-11 Observability (vil_log + vil_otel)  [after 1A-4]
  │
  ├── 1A-12 CSP header update (frontend)  [PARALLEL, BLOCKED if Phase 0 incomplete]
  │
  └── 1A-13 Integration verify (end-to-end)
```

---

## Task 1A-0: VIL API Verification

<aside>
🔴

**BLOCKING TASK.** Semua task setelahnya bergantung pada output ini. Jika VIL API berbeda dari Bootstrap Context, semua copy-paste starter harus di-adapt.

</aside>

```
TASK ID:       1A-0
OWNER TYPE:    Rust CLI Agent / Human
GOAL:          Verify actual VIL crate names, module paths, function signatures vs Bootstrap Context
READ FIRST:    Agent Bootstrap Context (seluruh dokumen)
               https://github.com/OceanOS-id/VIL
EDIT ONLY:     edusync-api/VIL_API_AUDIT.md (new)
DO NOT TOUCH:  Everything else
DEPENDENCY:    None
```

### IMPLEMENTATION STEPS

1. Clone VIL repo: `git clone https://github.com/OceanOS-id/VIL.git /tmp/vil-audit`
2. List available crates: `ls /tmp/vil-audit/*/Cargo.toml` or check workspace members
3. Verify each assumed API path exists:

```
# Crate names — do these exist?
grep -r 'name = "vil-server"' /tmp/vil-audit/*/Cargo.toml
grep -r 'name = "vil-log"' /tmp/vil-audit/*/Cargo.toml
grep -r 'name = "vil-storage-s3"' /tmp/vil-audit/*/Cargo.toml
grep -r 'name = "vil-trigger-cron"' /tmp/vil-audit/*/Cargo.toml

# Module paths — do these exist?
find /tmp/vil-audit -path '*/prelude.rs' -o -path '*/prelude/mod.rs'
grep -r 'pub struct VilApp' /tmp/vil-audit/
grep -r 'pub struct ServiceProcess' /tmp/vil-audit/
grep -r 'pub fn observer' /tmp/vil-audit/
grep -r 'pub struct JwtAuth' /tmp/vil-audit/
grep -r 'pub struct RateLimit' /tmp/vil-audit/
grep -r 'pub fn init' /tmp/vil-audit/vil-log/
grep -r 'macro_rules! info' /tmp/vil-audit/vil-log/ || grep -r 'pub macro info' /tmp/vil-audit/vil-log/

# Git tags — does v0.1.0 exist?
cd /tmp/vil-audit && git tag -l
```

1. Document findings in `VIL_API_AUDIT.md`

### COPY-PASTE STARTER

```markdown
# VIL API Audit — Phase 1A

## Date: YYYY-MM-DD

## VIL Repo: https://github.com/OceanOS-id/VIL

## Commit: (git rev-parse HEAD)

## Tag used: (v0.1.0 or main)

## Crate Availability

| Expected Crate   | Exists? | Actual Name (if different) |
| ---------------- | ------- | -------------------------- |
| vil-server       | ✅/❌   |                            |
| vil-log          | ✅/❌   |                            |
| vil-storage-s3   | ✅/❌   |                            |
| vil-trigger-cron | ✅/❌   |                            |

## API Path Verification

| Bootstrap Context Path                    | Exists? | Actual Path (if different) |
| ----------------------------------------- | ------- | -------------------------- |
| `vil_server::prelude::*`                  | ✅/❌   |                            |
| `VilApp::new(name)`                       | ✅/❌   |                            |
| `.observer(true)`                         | ✅/❌   |                            |
| `.profile("prod")`                        | ✅/❌   |                            |
| `ServiceProcess::new(name)`               | ✅/❌   |                            |
| `.prefix(path)`                           | ✅/❌   |                            |
| `.endpoint(Method, path, handler)`        | ✅/❌   |                            |
| `vil_server::auth::jwt::JwtAuth`          | ✅/❌   |                            |
| `vil_server::auth::rate_limit::RateLimit` | ✅/❌   |                            |
| `vil_log::init()`                         | ✅/❌   |                            |
| `vil_log::info!()`                        | ✅/❌   |                            |
| `IntoResponse` (re-exported?)             | ✅/❌   |                            |
| `StatusCode` (re-exported?)               | ✅/❌   |                            |
| `Json`, `State`, `Path`, `Query`          | ✅/❌   |                            |

## Decision

- [ ] All APIs match → proceed with tasks as-is
- [ ] Some APIs differ → adapt affected tasks (list below)
- [ ] Major mismatch → use Axum directly as fallback (per Gate 4)

## Adaptations Required

(list task IDs and what to change)
```

### VERIFY

```
# VIL_API_AUDIT.md exists and all rows filled
wc -l edusync-api/VIL_API_AUDIT.md
# Expected: >30 lines, no empty ✅/❌ cells
```

### STOP IF

- VIL repo is private or inaccessible → BLOCKED, escalate to human
- No git tags exist → use `main` branch, document commit hash
-

> 50% of APIs don't match → consider Axum fallback (Gate 4 early trigger)

### OUTPUT FORMAT

```
DONE / BLOCKED
FILES: edusync-api/VIL_API_AUDIT.md
VERIFY: all API paths verified ✅
ADAPTATIONS: (list of tasks that need changes, or "none")
```

---

## Task 1A-1: Cargo Workspace Init

```
TASK ID:       1A-1
OWNER TYPE:    Rust CLI Agent
GOAL:          Initialize Rust workspace edusync-api/ with 5 crates
READ FIRST:    Agent Bootstrap Context §14 (Cargo.toml Dependencies)
               Spec 4 §11 (VIL Version Pinning)
               Phase 1 Detail Week 11 (Project Structure)
EDIT ONLY:     edusync-api/ (new directory, all files new)
DO NOT TOUCH:  src/ (frontend), supabase/, package.json, any existing file
```

### IMPLEMENTATION STEPS

1. Create `edusync-api/` directory at project root
2. Create workspace `Cargo.toml` with 5 member crates
3. Create each crate with `cargo init`
4. Add all workspace dependencies (pinned versions)
5. Verify `cargo check` passes

### COPY-PASTE STARTER

```toml
# edusync-api/Cargo.toml
[workspace]
members = ["crates/*"]
resolver = "2"

[workspace.dependencies]
# VIL Framework — PIN to specific tag (Spec 4 §11)
vil-server = { git = "https://github.com/OceanOS-id/VIL.git", tag = "v0.1.0" }
vil-log = { git = "https://github.com/OceanOS-id/VIL.git", tag = "v0.1.0" }
vil-storage-s3 = { git = "https://github.com/OceanOS-id/VIL.git", tag = "v0.1.0" }
vil-trigger-cron = { git = "https://github.com/OceanOS-id/VIL.git", tag = "v0.1.0" }

# Async runtime
tokio = { version = "1", features = ["full"] }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# Database
sqlx = { version = "0.8", features = ["runtime-tokio", "postgres", "uuid", "chrono", "migrate"] }

# Auth
jsonwebtoken = "9"
argon2 = "0.5"
bcrypt = "0.15"
totp-rs = { version = "5", features = ["qr"] }
qrcode = "0.14"
oauth2 = "4"

# HTTP client
reqwest = { version = "0.12", features = ["json", "stream"] }

# Email
lettre = "0.11"

# PDF
printpdf = "0.7"

# Utilities
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
rand = "0.8"
base64 = "0.22"
thiserror = "1"
dotenv = "0.15"

# Observability
sentry = "0.34"

# HTTP middleware
tower-http = { version = "0.6", features = ["cors", "trace"] }

[profile.release]
lto = true
strip = true
codegen-units = 1
panic = "abort"
```

```toml
# edusync-api/crates/api-server/Cargo.toml
[package]
name = "edusync-api-server"
version = "0.1.0"
edition = "2021"

[dependencies]
vil-server.workspace = true
vil-log.workspace = true
tokio.workspace = true
serde.workspace = true
serde_json.workspace = true
sqlx.workspace = true
uuid.workspace = true
chrono.workspace = true
reqwest.workspace = true
dotenv.workspace = true
tower-http.workspace = true

edusync-models = { path = "../models" }
edusync-auth = { path = "../auth" }
edusync-middleware = { path = "../middleware" }
edusync-services = { path = "../services" }
```

```toml
# edusync-api/crates/models/Cargo.toml
[package]
name = "edusync-models"
version = "0.1.0"
edition = "2021"

[dependencies]
serde.workspace = true
serde_json.workspace = true
sqlx.workspace = true
uuid.workspace = true
chrono.workspace = true
```

```toml
# edusync-api/crates/auth/Cargo.toml
[package]
name = "edusync-auth"
version = "0.1.0"
edition = "2021"

[dependencies]
vil-server.workspace = true
serde.workspace = true
serde_json.workspace = true
sqlx.workspace = true
jsonwebtoken.workspace = true
argon2.workspace = true
bcrypt.workspace = true
totp-rs.workspace = true
qrcode.workspace = true
oauth2.workspace = true
uuid.workspace = true
chrono.workspace = true
rand.workspace = true
thiserror.workspace = true

edusync-models = { path = "../models" }
```

```toml
# edusync-api/crates/middleware/Cargo.toml
[package]
name = "edusync-middleware"
version = "0.1.0"
edition = "2021"

[dependencies]
vil-server.workspace = true
serde.workspace = true
serde_json.workspace = true
sqlx.workspace = true
uuid.workspace = true
thiserror.workspace = true
tower-http.workspace = true

edusync-auth = { path = "../auth" }
edusync-models = { path = "../models" }
```

```toml
# edusync-api/crates/services/Cargo.toml
[package]
name = "edusync-services"
version = "0.1.0"
edition = "2021"

[dependencies]
vil-server.workspace = true
serde.workspace = true
serde_json.workspace = true
sqlx.workspace = true
uuid.workspace = true
chrono.workspace = true
reqwest.workspace = true
thiserror.workspace = true

edusync-models = { path = "../models" }
edusync-auth = { path = "../auth" }
```

```rust
// edusync-api/crates/api-server/src/main.rs
fn main() {
    println!("edusync-api server placeholder");
}
```

```rust
// edusync-api/crates/models/src/lib.rs
pub fn placeholder() {}
```

```rust
// edusync-api/crates/auth/src/lib.rs
pub fn placeholder() {}
```

```rust
// edusync-api/crates/middleware/src/lib.rs
pub fn placeholder() {}
```

```rust
// edusync-api/crates/services/src/lib.rs
pub fn placeholder() {}
```

### VERIFY

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings
# Expected: compiles with 0 errors, 0 warnings
# Crate count: 5 (api-server, models, auth, middleware, services)
```

### STOP IF

- `cargo check` fails on VIL dependency resolution → check VIL git tag exists, try `main` branch
- Network error fetching VIL → ensure git access to `github.com/OceanOS-id/VIL`
- If VIL crate names differ from spec → read VIL repo `Cargo.toml` for actual crate names, update accordingly

### OUTPUT FORMAT

```
DONE / BLOCKED
FILES: edusync-api/Cargo.toml, edusync-api/crates/*/Cargo.toml, edusync-api/crates/*/src/{main,lib}.rs
VERIFY: cargo check ✅ | cargo clippy ✅
```

---

## Task 1A-2: AppState + PostgreSQL Connection

```
TASK ID:       1A-2
OWNER TYPE:    Rust CLI Agent
GOAL:          Connect to SAME PostgreSQL as Supabase, define AppState
READ FIRST:    Agent Bootstrap Context §5 (Database)
               Spec 3 §3 (DB Pool Isolation)
               Spec 4 §7 (PgBouncer)
               Phase 1 Detail Week 11 Day 3-4
EDIT ONLY:     edusync-api/crates/api-server/src/main.rs
               edusync-api/crates/api-server/src/state.rs (new)
DO NOT TOUCH:  Other crates, frontend, supabase/
DEPENDENCY:    1A-1
```

### IMPLEMENTATION STEPS

1. Create `state.rs` with `AppState` struct containing DB pool + config
2. Update `main.rs` to connect to PostgreSQL via `DATABASE_URL` env var
3. Verify connection by counting `profiles` table rows
4. Use pool settings from Spec 3 §3 (default: 50 connections)

### COPY-PASTE STARTER

```rust
// edusync-api/crates/api-server/src/state.rs
use sqlx::PgPool;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub jwt_secret: String,
    pub supabase_url: String,
    pub google_client_id: Option<String>,
    pub google_client_secret: Option<String>,
    pub groq_api_key: Option<String>,
    pub sentry_dsn: Option<String>,
}

impl AppState {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let database_url = std::env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set");

        // Pool config from Spec 3 §3: default pool = 50 connections
        let db = sqlx::postgres::PgPoolOptions::new()
            .max_connections(50)
            .connect(&database_url)
            .await?;

        // Verify connection — count profiles to confirm same DB as Supabase
        let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM profiles")
            .fetch_one(&db)
            .await?;
        println!("✅ Connected to PostgreSQL. {} profiles found.", row.0);

        Ok(Self {
            db,
            jwt_secret: std::env::var("JWT_SECRET")
                .expect("JWT_SECRET must be set"),
            supabase_url: std::env::var("SUPABASE_URL")
                .unwrap_or_else(|_| "http://localhost:54321".to_string()),
            google_client_id: std::env::var("GOOGLE_CLIENT_ID").ok(),
            google_client_secret: std::env::var("GOOGLE_CLIENT_SECRET").ok(),
            groq_api_key: std::env::var("GROQ_API_KEY").ok(),
            sentry_dsn: std::env::var("SENTRY_DSN").ok(),
        })
    }
}
```

```rust
// edusync-api/crates/api-server/src/main.rs
mod state;

use state::AppState;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();

    println!("🦀 EduSync API — Initializing...");

    let state = AppState::new().await?;

    println!("🦀 EduSync API — State initialized. Ready for VilApp bootstrap (Task 1A-4).");

    // VilApp bootstrap will be added in Task 1A-4
    // For now, just verify DB connection works
    let row: (String,) = sqlx::query_as("SELECT version()")
        .fetch_one(&state.db)
        .await?;
    println!("📦 PostgreSQL version: {}", row.0);

    Ok(())
}
```

### VERIFY

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings

# Run with real Supabase PostgreSQL:
DATABASE_URL="postgres://postgres:password@localhost:54322/postgres" \
JWT_SECRET="test-secret" \
cargo run -p edusync-api-server
# Expected: "✅ Connected to PostgreSQL. N profiles found."
# Expected: "📦 PostgreSQL version: PostgreSQL 15.x ..."
```

### STOP IF

- Cannot connect to PostgreSQL → verify `DATABASE_URL`, check if Supabase is running (`supabase status`)
- `profiles` table not found → verify Supabase migrations are applied
- Connection pool exhausted → reduce `max_connections` to 10 for dev

### OUTPUT FORMAT

```
DONE / BLOCKED
FILES: edusync-api/crates/api-server/src/state.rs, edusync-api/crates/api-server/src/main.rs
VERIFY: cargo check ✅ | cargo run ✅ (DB connected)
```

---

## Task 1A-3: Core Model Structs

<aside>
⚠️

**PENTING:** `public.users` table BELUM ADA di database. Tabel ini akan dibuat di Phase 1B (Week 14 Day 5 migration). Task ini hanya model tabel yang **sudah ada**: `profiles`, `tenants`, `courses`, `classes`, `user_roles`. `User` struct ditunda ke Phase 1B.

</aside>

```
TASK ID:       1A-3
OWNER TYPE:    Rust CLI Agent
GOAL:          Generate Rust structs for 5 EXISTING tables: profiles, tenants, courses, classes, user_roles
READ FIRST:    Agent Bootstrap Context §5 (Database) + §13 (SQL Gotchas)
EDIT ONLY:     edusync-api/crates/models/src/lib.rs
               edusync-api/crates/models/src/*.rs (new files)
DO NOT TOUCH:  Other crates, frontend, supabase/, database schema
DEPENDENCY:    1A-2 (needs DB connection to introspect schema)
```

### IMPLEMENTATION STEPS

1. **FIRST: Introspect actual DB schema** (jangan skip!):

```
# Run against Supabase PostgreSQL:
psql $DATABASE_URL -c "\d profiles"
psql $DATABASE_URL -c "\d tenants"
psql $DATABASE_URL -c "\d courses"
psql $DATABASE_URL -c "\d classes"
psql $DATABASE_URL -c "\d user_roles"

# Save output for reference:
psql $DATABASE_URL -c "\d profiles" > /tmp/schema_profiles.txt
psql $DATABASE_URL -c "\d tenants" > /tmp/schema_tenants.txt
psql $DATABASE_URL -c "\d courses" > /tmp/schema_courses.txt
psql $DATABASE_URL -c "\d classes" > /tmp/schema_classes.txt
psql $DATABASE_URL -c "\d user_roles" > /tmp/schema_user_roles.txt
```

1. Generate struct fields from ACTUAL `\d` output, NOT from assumptions
2. Each struct must derive `Debug, Clone, Serialize, Deserialize, sqlx::FromRow`
3. Follow SQL gotchas from Bootstrap Context §13
4. Re-export all models from `lib.rs`
5. **DO NOT** create `user.rs` — `public.users` table doesn't exist yet (Phase 1B migration)

### COPY-PASTE STARTER

```rust
// edusync-api/crates/models/src/lib.rs
// NOTE: public.users table does NOT exist yet.
// User model will be added in Phase 1B after migration.
pub mod profile;
pub mod tenant;
pub mod course;
pub mod class;
pub mod user_role;

pub use profile::Profile;
pub use tenant::Tenant;
pub use course::Course;
pub use class::Class;
pub use user_role::UserRole;
```

```rust
// edusync-api/crates/models/src/profile.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Profile {
    pub id: Uuid,
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub role: Option<String>,           // Legacy — real role from user_roles table!
    pub tenant_id: Option<Uuid>,
    pub onboarding_completed: Option<bool>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}
```

```rust
// edusync-api/crates/models/src/tenant.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Tenant {
    pub id: Uuid,
    pub name: String,
    pub slug: Option<String>,
    pub logo_url: Option<String>,
    pub settings: Option<serde_json::Value>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}
```

```rust
// edusync-api/crates/models/src/course.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// GOTCHA dari Bootstrap Context §13:
/// - courses.status = 'published', BUKAN is_published
/// - courses.status enum: 'draft' | 'published' | 'in_review' | 'approved'
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Course {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub tenant_id: Uuid,
    pub created_by: Uuid,
    pub cover_image_url: Option<String>,
    pub settings: Option<serde_json::Value>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}
```

```rust
// edusync-api/crates/models/src/class.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Class {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub join_code: Option<String>,
    pub tenant_id: Uuid,
    pub created_by: Uuid,
    pub academic_year: Option<String>,
    pub is_active: Option<bool>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}
```

```rust
// edusync-api/crates/models/src/user_role.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// GOTCHA dari Bootstrap Context §13:
/// Role datang dari user_roles table, BUKAN profiles.role!
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserRole {
    pub id: Uuid,
    pub user_id: Uuid,
    pub tenant_id: Uuid,
    pub role: String,           // 'student' | 'teacher' | 'admin' | 'parent' | 'principal'
    pub created_at: Option<DateTime<Utc>>,
}
```

### VERIFY

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings
# Expected: 0 errors, 0 warnings
# 5 structs: Profile, Tenant, Course, Class, UserRole

# Runtime verification (IMPORTANT — catches field mismatches):
DATABASE_URL="postgres://postgres:password@localhost:54322/postgres" \
cargo test -p edusync-models -- --nocapture
# Or quick manual check:
# psql $DATABASE_URL -c "SELECT id, full_name, tenant_id FROM profiles LIMIT 1"
```

### STOP IF

- `\d profiles` output differs from struct fields → **adapt struct to match actual schema**, not the other way around
- `sqlx::FromRow` derive errors → ensure all field types are sqlx-compatible
- `public.users` table referenced → WRONG, remove User model (Phase 1B)

### OUTPUT FORMAT

```
DONE / BLOCKED
FILES: edusync-api/crates/models/src/{lib,profile,tenant,course,class,user_role}.rs
VERIFY: cargo check ✅ | cargo clippy ✅ | schema introspected ✅
```

---

## Task 1A-4: VilApp Bootstrap + Health/Ready Endpoints

```
TASK ID:       1A-4
OWNER TYPE:    Rust CLI Agent
GOAL:          Bootstrap VilApp with .observer(true), health/ready endpoints, ServiceProcess
READ FIRST:    Agent Bootstrap Context §2 (Handler Pattern) + §3 (VilApp Setup)
               Spec 3 §1.1 (Synchronous HTTP Handlers)
               Phase 1 Detail Week 12-13
EDIT ONLY:     edusync-api/crates/api-server/src/main.rs
               edusync-api/crates/api-server/src/health.rs (new)
DO NOT TOUCH:  Other crates (except importing), frontend
DEPENDENCY:    1A-2
```

### IMPLEMENTATION STEPS

1. Create `health.rs` with custom health + ready handlers
2. Update `main.rs` to use `VilApp::new()` with `.observer(true)` and `.profile("prod")`
3. Register health `ServiceProcess` with endpoints
4. `.observer(true)` auto-generates: `/health`, `/ready`, `/metrics`, `/_vil/dashboard/`
5. Custom health endpoint at `/api/v1/health` returns detailed status

### COPY-PASTE STARTER

```rust
// edusync-api/crates/api-server/src/health.rs
use serde::Serialize;
use vil_server::prelude::*;

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    service: String,
    version: String,
    database: String,
    timestamp: String,
}

/// GET /api/v1/health — detailed health check
pub async fn health_check(
    State(db): State<sqlx::PgPool>,
) -> Json<serde_json::Value> {
    let db_status = sqlx::query("SELECT 1")
        .execute(&db)
        .await
        .map(|_| "connected".to_string())
        .unwrap_or_else(|e| format!("error: {}", e));

    Json(serde_json::json!({
        "status": "ok",
        "service": "edusync-api",
        "version": env!("CARGO_PKG_VERSION"),
        "database": db_status,
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

/// GET /api/v1/ready — readiness probe
pub async fn readiness_check(
    State(db): State<sqlx::PgPool>,
) -> Json<serde_json::Value> {
    let db_ok = sqlx::query("SELECT 1")
        .execute(&db)
        .await
        .is_ok();

    Json(serde_json::json!({
        "ready": db_ok,
        "checks": {
            "database": db_ok
        }
    }))
}
```

```rust
// edusync-api/crates/api-server/src/main.rs
mod state;
mod health;

use state::AppState;
use vil_server::prelude::*;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();

    println!("🦀 EduSync API — Initializing...");

    let app_state = AppState::new().await?;
    let db = app_state.db.clone();

    // ServiceProcess: health (public)
    let health_service = ServiceProcess::new("health")
        .prefix("/api/v1")
        .endpoint(Method::GET, "/health", get(health::health_check))
        .endpoint(Method::GET, "/ready", get(health::readiness_check));

    // VilApp bootstrap
    // .observer(true) auto-generates:
    //   GET /health       — liveness probe
    //   GET /ready        — readiness probe
    //   GET /metrics      — Prometheus metrics
    //   GET /_vil/dashboard/ — live metrics UI
    VilApp::new("edusync-api")
        .port(8080)
        .profile("prod")
        .state(db)
        .observer(true)
        .service(health_service)
        .run()
        .await;

    Ok(())
}
```

### VERIFY

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings

# Run server:
DATABASE_URL="postgres://postgres:password@localhost:54322/postgres" \
JWT_SECRET="test-secret" \
cargo run -p edusync-api-server &

# Test endpoints:
curl http://localhost:8080/api/v1/health
# Expected: {"status":"ok","service":"edusync-api",...}

curl http://localhost:8080/api/v1/ready
# Expected: {"ready":true,"checks":{"database":true}}

curl http://localhost:8080/health
# Expected: VIL auto-generated health

curl http://localhost:8080/metrics
# Expected: Prometheus metrics output

kill %1
```

### STOP IF

- VIL `ServiceProcess` API differs from Bootstrap Context → read VIL repo `examples/001-basic-hello-server/` for actual API
- `.observer(true)` doesn't auto-register endpoints → manually register `/health`, `/metrics`
- Port 8080 in use → change to 8081 or kill existing process

### OUTPUT FORMAT

```
DONE / BLOCKED
FILES: edusync-api/crates/api-server/src/main.rs, edusync-api/crates/api-server/src/health.rs
VERIFY: cargo check ✅ | curl /health ✅ | curl /ready ✅ | curl /metrics ✅
```

---

## Task 1A-5: Error Response Adapter (PostgREST Format)

```
TASK ID:       1A-5
OWNER TYPE:    Rust CLI Agent
GOAL:          Create error types that match Supabase PostgREST error format
READ FIRST:    Agent Bootstrap Context §13 (Frontend Expectations)
               Spec 3 §7.2 (Error Code Catalog)
               Phase 1 Detail Week 15 (AppError struct)
EDIT ONLY:     edusync-api/crates/middleware/src/errors.rs (new)
               edusync-api/crates/middleware/src/lib.rs
DO NOT TOUCH:  Frontend supabaseUtils.ts, other crates
DEPENDENCY:    1A-4
```

### IMPLEMENTATION STEPS

1. Create `errors.rs` with `AppError` enum implementing `IntoResponse`
2. Error JSON shape MUST match: `{ code, message, details, hint }` — PostgREST format
3. Frontend `handleSupabaseError()` in `supabaseUtils.ts` depends on this exact shape
4. Map to correct HTTP status codes per Spec 3 §7.2

### COPY-PASTE STARTER

```rust
// edusync-api/crates/middleware/src/errors.rs
use serde::Serialize;
use vil_server::prelude::*;

/// Error response — MUST match Supabase PostgREST format.
/// Frontend handleSupabaseError() depends on:
/// { code: string, message: string, details: string | null, hint: string | null }
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub code: String,
    pub message: String,
    pub details: Option<String>,
    pub hint: Option<String>,
}

/// Application error enum — Spec 3 §7.2 Error Code Catalog.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Account locked")]
    AccountLocked,

    #[error("Token expired")]
    TokenExpired,

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Tenant mismatch")]
    TenantMismatch,

    #[error("Rate limited: {0}")]
    RateLimited(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
}

impl AppError {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::InvalidCredentials | Self::TokenExpired | Self::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            Self::AccountLocked | Self::RateLimited(_) => StatusCode::TOO_MANY_REQUESTS,
            Self::TenantMismatch => StatusCode::FORBIDDEN,
            Self::Validation(_) => StatusCode::BAD_REQUEST,
            Self::NotFound(_) => StatusCode::NOT_FOUND,
            Self::Conflict(_) => StatusCode::CONFLICT,
            Self::Internal(_) | Self::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_code(&self) -> &str {
        match self {
            Self::InvalidCredentials => "invalid_credentials",
            Self::AccountLocked => "account_locked",
            Self::TokenExpired => "token_expired",
            Self::Unauthorized(_) => "unauthorized",
            Self::TenantMismatch => "tenant_mismatch",
            Self::RateLimited(_) => "rate_limited",
            Self::Validation(_) => "validation_error",
            Self::NotFound(_) => "not_found",
            Self::Conflict(_) => "conflict",
            Self::Internal(_) | Self::Database(_) => "internal_error",
        }
    }

    fn hint(&self) -> Option<String> {
        match self {
            Self::InvalidCredentials => Some("Email atau password salah".to_string()),
            Self::AccountLocked => Some("Akun terkunci. Coba lagi dalam 15 menit.".to_string()),
            Self::TokenExpired => Some("Sesi Anda telah berakhir".to_string()),
            Self::TenantMismatch => Some("Anda tidak memiliki akses ke data ini".to_string()),
            Self::RateLimited(msg) => Some(msg.clone()),
            Self::NotFound(_) => Some("Data tidak ditemukan".to_string()),
            Self::Conflict(_) => Some("Data sudah ada".to_string()),
            Self::Internal(_) | Self::Database(_) => Some("Terjadi kesalahan. Coba lagi nanti.".to_string()),
            _ => None,
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let body = ErrorResponse {
            code: self.error_code().to_string(),
            message: self.to_string(),
            details: match &self {
                Self::Database(e) => Some(e.to_string()),
                _ => None,
            },
            hint: self.hint(),
        };
        (status, Json(body)).into_response()
    }
}
```

```rust
// edusync-api/crates/middleware/src/lib.rs
pub mod errors;

pub use errors::{AppError, ErrorResponse};
```

### VERIFY

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings
```

### STOP IF

- `IntoResponse` trait not found → check VIL re-exports, or import from `axum::response`
- `StatusCode` not found → import from `axum::http::StatusCode` or `vil_server::prelude::*`

### OUTPUT FORMAT

```
DONE / BLOCKED
FILES: edusync-api/crates/middleware/src/errors.rs, edusync-api/crates/middleware/src/lib.rs
VERIFY: cargo check ✅ | cargo clippy ✅
```

---

## Task 1A-6: CORS Middleware

```
TASK ID:       1A-6
OWNER TYPE:    Rust CLI Agent
GOAL:          CORS configuration for localhost:5173 (dev) + production domain
READ FIRST:    Phase 1 Detail Week 12-13 Day 5 (CORS)
               Spec 4 §9 (Deployment Architecture)
EDIT ONLY:     edusync-api/crates/middleware/src/cors.rs (new)
               edusync-api/crates/middleware/src/lib.rs
               edusync-api/crates/api-server/src/main.rs
DO NOT TOUCH:  Frontend, Nginx config
DEPENDENCY:    1A-4
```

### IMPLEMENTATION STEPS

1. Create `cors.rs` with CORS layer using `tower-http`
2. Allow origins: `http://localhost:5173`, `http://127.0.0.1:5173`, production from env
3. Allow credentials, methods GET/POST/PUT/DELETE/OPTIONS
4. Allow headers: Authorization, Content-Type, X-Client-Info, X-Request-ID
5. Apply as tower layer to VilApp in `main.rs`

### COPY-PASTE STARTER

```rust
// edusync-api/crates/middleware/src/cors.rs
use tower_http::cors::{CorsLayer, AllowOrigin};
use axum::http::{HeaderName, Method, HeaderValue};
use std::env;

pub fn cors_layer() -> CorsLayer {
    let mut origins: Vec<HeaderValue> = vec![
        "http://localhost:5173".parse().unwrap(),
        "http://127.0.0.1:5173".parse().unwrap(),
    ];

    if let Ok(extra) = env::var("CORS_ORIGINS") {
        for origin in extra.split(',') {
            if let Ok(val) = origin.trim().parse() {
                origins.push(val);
            }
        }
    }

    CorsLayer::new()
        .allow_origin(AllowOrigin::list(origins))
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
            Method::PATCH,
        ])
        .allow_headers([
            HeaderName::from_static("authorization"),
            HeaderName::from_static("content-type"),
            HeaderName::from_static("x-client-info"),
            HeaderName::from_static("x-request-id"),
            HeaderName::from_static("apikey"),
        ])
        .allow_credentials(true)
        .max_age(std::time::Duration::from_secs(3600))
}
```

```rust
// edusync-api/crates/middleware/src/lib.rs — update:
pub mod errors;
pub mod cors;

pub use errors::{AppError, ErrorResponse};
pub use cors::cors_layer;
```

Then update `main.rs` — add `.layer(edusync_middleware::cors_layer())` to VilApp or Router.

### VERIFY

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings

# Test CORS preflight:
curl -X OPTIONS http://localhost:8080/api/v1/health \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -v 2>&1 | grep -i "access-control"
# Expected: Access-Control-Allow-Origin: http://localhost:5173
# Expected: Access-Control-Allow-Credentials: true
```

### STOP IF

- `tower_http` not found → add `tower-http` to workspace dependencies with `cors` feature
- CORS headers not appearing → ensure layer is applied BEFORE route matching

### OUTPUT FORMAT

```
DONE / BLOCKED
FILES: edusync-api/crates/middleware/src/cors.rs, edusync-api/crates/middleware/src/lib.rs, main.rs
VERIFY: cargo check ✅ | CORS preflight ✅
```

---

## Task 1A-7: JwtAuth Placeholder + RateLimit

```
TASK ID:       1A-7
OWNER TYPE:    Rust CLI Agent
GOAL:          Wire VIL built-in JwtAuth + RateLimit as middleware placeholders
READ FIRST:    Agent Bootstrap Context §4 (Security Features)
               Phase 1 Detail Week 20 (Rate Limiting)
               Spec 3 §1.1 (Rate Limit per endpoint group)
EDIT ONLY:     edusync-api/crates/auth/src/jwt.rs (new)
               edusync-api/crates/auth/src/rate_limit.rs (new)
               edusync-api/crates/auth/src/lib.rs
DO NOT TOUCH:  Frontend, other crates (except imports)
DEPENDENCY:    1A-4
```

### IMPLEMENTATION STEPS

1. Create `jwt.rs` with VIL `JwtAuth` setup — placeholder for Phase 1B full implementation
2. Create `rate_limit.rs` with VIL `RateLimit` — 4 limiters per Spec 3 §1.1
3. These are **scaffolds only** — full auth logic comes in Phase 1B tasks

### COPY-PASTE STARTER

```rust
// edusync-api/crates/auth/src/jwt.rs
use vil_server::auth::jwt::JwtAuth;

/// Create JWT auth middleware.
/// Full implementation in Phase 1B — this is scaffold only.
pub fn create_jwt_auth(secret: &str) -> JwtAuth {
    JwtAuth::new(secret)
}

/// JWT Claims for EduSync — will be expanded in Phase 1B.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Claims {
    pub sub: String,           // user_id (UUID)
    pub email: String,
    pub roles: Vec<String>,    // ["teacher"], ["student"], etc.
    pub tenant_id: String,     // tenant UUID
    pub exp: usize,
    pub iat: usize,
}
```

```rust
// edusync-api/crates/auth/src/rate_limit.rs
use vil_server::auth::rate_limit::RateLimit;
use std::time::Duration;

/// Rate limiters per Spec 3 §1.1
pub struct RateLimiters {
    pub auth: RateLimit,       // 10/min per IP
    pub ai: RateLimit,         // 50/hr per user
    pub quiz: RateLimit,       // 5/min per user (anti-cheat)
    pub general: RateLimit,    // 100/min per user
}

impl RateLimiters {
    pub fn new() -> Self {
        Self {
            auth: RateLimit::new(10, Duration::from_secs(60)),
            ai: RateLimit::new(50, Duration::from_secs(3600)),
            quiz: RateLimit::new(5, Duration::from_secs(60)),
            general: RateLimit::new(100, Duration::from_secs(60)),
        }
    }
}

impl Default for RateLimiters {
    fn default() -> Self {
        Self::new()
    }
}
```

```rust
// edusync-api/crates/auth/src/lib.rs
pub mod jwt;
pub mod rate_limit;

pub use jwt::{Claims, create_jwt_auth};
pub use rate_limit::RateLimiters;
```

### VERIFY

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings
```

### STOP IF

- `vil_server::auth::jwt::JwtAuth` not found → read VIL repo for actual auth module path
- `vil_server::auth::rate_limit::RateLimit` not found → read VIL repo, may be different path
- If VIL auth APIs differ, adapt to actual API and document changes

### OUTPUT FORMAT

```
DONE / BLOCKED
FILES: edusync-api/crates/auth/src/{jwt,rate_limit,lib}.rs
VERIFY: cargo check ✅ | cargo clippy ✅
```

---

## Task 1A-8: Docker Compose (VIL + PgBouncer + Nginx)

```
TASK ID:       1A-8
OWNER TYPE:    DevOps / CLI Agent
GOAL:          Docker Compose setup for local dev and staging
READ FIRST:    Spec 3 §6.2 (Multi-stage Dockerfile)
               Spec 4 §7 (PgBouncer) + §9 (Deployment Architecture)
               Phase 1 Detail Week 11 Day 5 (Docker Compose)
EDIT ONLY:     edusync-api/Dockerfile (new)
               edusync-api/docker-compose.yml (new)
               edusync-api/.env.example (new)
DO NOT TOUCH:  Frontend, supabase/, existing docker configs
DEPENDENCY:    1A-1 (PARALLEL with 1A-2)
```

### IMPLEMENTATION STEPS

1. Create multi-stage Dockerfile per Spec 3 §6.2 (chef → planner → builder → runtime)
2. Create `docker-compose.yml` with: VIL server, PgBouncer, Nginx
3. Create `.env.example` with all required env vars
4. PgBouncer connects to Supabase PostgreSQL, VIL connects to PgBouncer

### COPY-PASTE STARTER

```docker
# edusync-api/Dockerfile
# Stage 1: Chef (dependency planning)
FROM rust:1.78-slim AS chef
RUN cargo install cargo-chef
WORKDIR /app

# Stage 2: Planner
FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# Stage 3: Builder
FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY . .
RUN cargo build --release

# Stage 4: Runtime (minimal image)
FROM gcr.io/distroless/cc-debian12
COPY --from=builder /app/target/release/edusync-api-server /
EXPOSE 8080
CMD ["/edusync-api-server"]
```

```yaml
# edusync-api/docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - '8080:8080'
    # Linux compatibility: host.docker.internal resolves via extra_hosts
    extra_hosts:
      - 'host.docker.internal:host-gateway'
    environment:
      DATABASE_URL: postgres://edusync:${DB_PASSWORD}@pgbouncer:6432/postgres
      JWT_SECRET: ${JWT_SECRET}
      SUPABASE_URL: ${SUPABASE_URL:-http://host.docker.internal:54321}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}
      GROQ_API_KEY: ${GROQ_API_KEY:-}
      SENTRY_DSN: ${SENTRY_DSN:-}
      CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost:5173}
      RUST_LOG: info
    depends_on:
      pgbouncer:
        condition: service_started
    restart: unless-stopped

  pgbouncer:
    image: edoburu/pgbouncer:latest
    # Linux compatibility: host.docker.internal resolves via extra_hosts
    extra_hosts:
      - 'host.docker.internal:host-gateway'
    environment:
      DATABASE_URL: postgres://postgres:${DB_PASSWORD}@${DB_HOST:-host.docker.internal}:${DB_PORT:-54322}/postgres
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 200
      DEFAULT_POOL_SIZE: 40
      MIN_POOL_SIZE: 5
      RESERVE_POOL_SIZE: 5
    ports:
      - '6432:6432'
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
    # Linux compatibility: host.docker.internal resolves via extra_hosts
    extra_hosts:
      - 'host.docker.internal:host-gateway'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
    restart: unless-stopped
```

```
# edusync-api/.env.example
# === REQUIRED ===
DATABASE_URL=postgres://postgres:your-password@localhost:54322/postgres
JWT_SECRET=your-jwt-secret-min-32-chars
DB_PASSWORD=your-password
DB_HOST=host.docker.internal
DB_PORT=54322

# === OPTIONAL ===
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-anon-key
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GROQ_API_KEY=
SENTRY_DSN=
CORS_ORIGINS=http://localhost:5173
RUST_LOG=info
```

**⚠️ PENTING: Tambahkan ke `.gitignore`:**

```
# Tambahkan baris ini ke .gitignore (root atau edusync-api/.gitignore):
edusync-api/.env
edusync-api/target/
```

### VERIFY

```
cd edusync-api
docker compose config
# Expected: valid YAML, no errors

docker compose build api
# Expected: multi-stage build succeeds

# Optional full test:
cp .env.example .env
# Edit .env with real credentials
docker compose up -d
curl http://localhost:8080/api/v1/health
docker compose down
```

### STOP IF

- `cargo-chef` install fails → use **Simple Dockerfile** (see below)
- PgBouncer cannot connect to Supabase → verify `DB_HOST` and `DB_PORT` in `.env`
- Docker build takes >30 min → add cargo registry cache volume
- `host.docker.internal` not resolving → already fixed with `extra_hosts: ["host.docker.internal:host-gateway"]`

### FALLBACK: Simple Dockerfile (tanpa cargo-chef)

```docker
# edusync-api/Dockerfile.simple
FROM rust:1.78-slim AS builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM gcr.io/distroless/cc-debian12
COPY --from=builder /app/target/release/edusync-api-server /
EXPOSE 8080
CMD ["/edusync-api-server"]
```

### OUTPUT FORMAT

```
DONE / BLOCKED
FILES: edusync-api/Dockerfile, edusync-api/docker-compose.yml, edusync-api/.env.example
VERIFY: docker compose config ✅ | docker compose build ✅
```

---

## Task 1A-9: Nginx Reverse Proxy Config

```
TASK ID:       1A-9
OWNER TYPE:    DevOps / CLI Agent
GOAL:          Nginx config for strangler fig pattern: VIL vs Supabase split
READ FIRST:    Phase 1 Detail Week 12-13 Day 3-4 (Reverse Proxy)
               Main Plan Architecture (Before vs After)
EDIT ONLY:     edusync-api/nginx.conf (new)
DO NOT TOUCH:  Everything else
DEPENDENCY:    1A-8
```

### IMPLEMENTATION STEPS

1. Create `nginx.conf` with upstream definitions
2. Phase 1A: only `/api/v1/health` and `/api/v1/ready` route to VIL
3. Everything else → forward to Supabase
4. Include CORS headers for preflight

### COPY-PASTE STARTER

```
# edusync-api/nginx.conf
# Strangler Fig Pattern — Phase 1A
# VIL handles: health, ready, metrics
# Everything else → Supabase

upstream vil-server {
    server api:8080;
}

upstream supabase-kong {
    server host.docker.internal:54321;
}

server {
    listen 80;
    server_name _;

    # === VIL endpoints (Phase 1A: health only) ===
    location /api/v1/health {
        proxy_pass http://vil-server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Request-ID $request_id;
    }

    location /api/v1/ready {
        proxy_pass http://vil-server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # VIL Observer dashboard
    location /_vil/ {
        proxy_pass http://vil-server;
        proxy_set_header Host $host;
    }

    # VIL metrics (Prometheus)
    location /metrics {
        proxy_pass http://vil-server;
    }

    # === Supabase (everything else) ===
    location /rest/v1/ {
        proxy_pass http://supabase-kong;
        proxy_set_header Host $host;
        proxy_set_header apikey $http_apikey;
        proxy_set_header Authorization $http_authorization;
    }

    location /auth/v1/ {
        proxy_pass http://supabase-kong;
        proxy_set_header Host $host;
        proxy_set_header apikey $http_apikey;
        proxy_set_header Authorization $http_authorization;
    }

    location /realtime/v1/ {
        proxy_pass http://supabase-kong;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location /storage/v1/ {
        proxy_pass http://supabase-kong;
        proxy_set_header Host $host;
        proxy_set_header apikey $http_apikey;
        proxy_set_header Authorization $http_authorization;
        client_max_body_size 50M;
    }

    location /functions/v1/ {
        proxy_pass http://supabase-kong;
        proxy_set_header Host $host;
        proxy_set_header apikey $http_apikey;
        proxy_set_header Authorization $http_authorization;
    }

    # === Phase 4: VIL WebSocket (placeholder — uncomment saat Phase 4) ===
    # location /ws/ {
    #     proxy_pass http://vil-server;
    #     proxy_http_version 1.1;
    #     proxy_set_header Upgrade $http_upgrade;
    #     proxy_set_header Connection "upgrade";
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Real-IP $remote_addr;
    # }

    # Default: Supabase
    location / {
        proxy_pass http://supabase-kong;
        proxy_set_header Host $host;
    }
}
```

### VERIFY

```
nginx -t -c $(pwd)/edusync-api/nginx.conf
# Or: docker compose up nginx -d && curl http://localhost/api/v1/health
```

### STOP IF

- Supabase not accessible from Docker → use `host.docker.internal` or `172.17.0.1`
- WebSocket upgrade not working → verify `proxy_http_version 1.1` and Connection upgrade

### OUTPUT FORMAT

```
DONE / BLOCKED
FILES: edusync-api/nginx.conf
VERIFY: nginx -t ✅ | curl /api/v1/health via Nginx ✅
```

---

## Task 1A-10: CI/CD Pipeline

```
TASK ID:       1A-10
OWNER TYPE:    DevOps / CLI Agent
GOAL:          GitHub Actions CI for Rust: check, clippy, test, build, Docker
READ FIRST:    Spec 3 §6.1 (Build Pipeline)
               Spec 3 §6.3 (Release Profile)
EDIT ONLY:     .github/workflows/rust-ci.yml (new)
DO NOT TOUCH:  Existing workflows, frontend CI
DEPENDENCY:    1A-1 (PARALLEL with 1A-2)
```

### IMPLEMENTATION STEPS

1. Create workflow file for push/PR
2. Steps: checkout → Rust cache → cargo check → clippy → test → build
3. Docker build + push only on `main` branch

### COPY-PASTE STARTER

```yaml
# .github/workflows/rust-ci.yml
name: Rust CI

on:
  push:
    branches: [main]
    paths:
      - 'edusync-api/**'
      - '.github/workflows/rust-ci.yml'
  pull_request:
    paths:
      - 'edusync-api/**'

defaults:
  run:
    working-directory: edusync-api

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy

      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: edusync-api -> target
          shared-key: edusync-api

      - name: Cargo check
        run: cargo check --all-targets

      - name: Clippy
        run: cargo clippy -- -D warnings

      - name: Tests
        run: cargo test
        env:
          # Note: tests requiring PostgreSQL must use #[ignore] attribute
          # or #[cfg(feature = "integration")] gate.
          # No DB service in CI for now — only unit tests run.
          SQLX_OFFLINE: 'true'

  build:
    runs-on: ubuntu-latest
    needs: check
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - uses: dtolnay/rust-toolchain@stable

      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: edusync-api -> target
          shared-key: edusync-api

      - name: Build release
        run: cargo build --release

      - name: Build Docker image
        run: docker build -t edusync-api:$ github.sha  .
```

### VERIFY

```
# Validate YAML syntax:
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/rust-ci.yml'))"
# Expected: no errors

# Test locally (optional, requires act):
act -j check -W .github/workflows/rust-ci.yml
```

### STOP IF

- VIL git dependency requires SSH key → add deploy key to GitHub Actions secrets
- Build time >30 min → add `cargo-chef` layer to CI

### OUTPUT FORMAT

```
DONE / BLOCKED
FILES: .github/workflows/rust-ci.yml
VERIFY: YAML valid ✅ | act local test ✅ (optional)
```

---

## Task 1A-11: Observability Baseline (vil_log + vil_otel)

```
TASK ID:       1A-11
OWNER TYPE:    Rust CLI Agent
GOAL:          Setup structured logging + OpenTelemetry tracing + Sentry
READ FIRST:    Agent Bootstrap Context §10 (Observability)
               Spec 3 §7 (Observability Correlation)
               Spec 4 §14 (Server-Side Logging)
EDIT ONLY:     edusync-api/crates/api-server/src/observability.rs (new)
               edusync-api/crates/api-server/src/main.rs
DO NOT TOUCH:  Other crates, frontend
DEPENDENCY:    1A-4
```

### IMPLEMENTATION STEPS

1. Create `observability.rs` to initialize `vil_log`, Sentry
2. Add X-Request-ID propagation per Spec 3 §7.1
3. VIL `.observer(true)` already provides `/metrics` and `/_vil/dashboard/`
4. Add `sentry-rust` initialization for error tracking

### COPY-PASTE STARTER

```rust
// edusync-api/crates/api-server/src/observability.rs

/// Initialize observability stack.
/// - vil_log: semantic structured logging
/// - Sentry: error tracking (if SENTRY_DSN set)
/// - VIL Observer: auto-enabled via .observer(true) in main.rs
pub fn init(sentry_dsn: Option<&str>) -> Option<sentry::ClientInitGuard> {
    // Initialize vil_log
    // vil_log is 4.5-6.2x faster than tracing — see Bootstrap Context §10
    vil_log::init();

    // Initialize Sentry (if DSN provided)
    let guard = sentry_dsn.map(|dsn| {
        sentry::init((
            dsn,
            sentry::ClientOptions {
                release: Some(env!("CARGO_PKG_VERSION").into()),
                environment: Some(
                    std::env::var("RUST_ENV")
                        .unwrap_or_else(|_| "development".to_string())
                        .into(),
                ),
                traces_sample_rate: 0.1,  // 10% of transactions
                ..Default::default()
            },
        ))
    });

    vil_log::info!("Observability initialized",
        sentry = sentry_dsn.is_some(),
        vil_observer = true,
    );

    guard
}
```

Then in `main.rs`, call `observability::init()` before VilApp:

```rust
mod observability;

// In main():
let _sentry_guard = observability::init(app_state.sentry_dsn.as_deref());
```

### VERIFY

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings

# Run and check logs:
DATABASE_URL="..." JWT_SECRET="..." RUST_LOG=info cargo run -p edusync-api-server
# Expected: structured log output with timestamps
# Expected: "Observability initialized" log line
```

### STOP IF

- `vil_log::init()` doesn't exist → use `tracing_subscriber::fmt::init()` as fallback
- `vil_log::info!` macro differs → adapt to actual VIL logging API
- Sentry crate version conflict → check VIL compatibility

### OUTPUT FORMAT

```
DONE / BLOCKED
FILES: edusync-api/crates/api-server/src/observability.rs, main.rs (updated)
VERIFY: cargo check ✅ | structured logs visible ✅
```

---

## Task 1A-12: CSP Header Update (Frontend)

```
TASK ID:       1A-12
OWNER TYPE:    Frontend CLI Agent
GOAL:          Update index.html CSP connect-src to include VIL server domain
READ FIRST:    Phase 1 Detail Week 11 (CSP header update)
EDIT ONLY:     index.html (CSP meta tag only)
DO NOT TOUCH:  src/, Rust code, anything else in index.html
DEPENDENCY:    PARALLEL — BLOCKED if Phase 0 not complete
```

### IMPLEMENTATION STEPS

1. **FIRST: Check if CSP meta tag exists:**

```
grep -n "Content-Security-Policy" index.html
# If 0 results → CSP may be set via Nginx/Vercel headers. Mark DONE (skip).
# If 1+ results → proceed to step 2.
```

1. Find `<meta http-equiv="Content-Security-Policy"` in `index.html`
2. Add VIL server URL to `connect-src` directive
3. Keep all existing CSP directives unchanged

### COPY-PASTE STARTER

```html
<!-- In index.html, find the CSP meta tag and ADD to connect-src: -->
<!-- BEFORE (example): -->
<!-- connect-src 'self' https://*.supabase.co wss://*.supabase.co -->

<!-- AFTER: -->
<!-- connect-src 'self' https://*.supabase.co wss://*.supabase.co http://localhost:8080 -->

<!-- For production, also add your VIL domain:
     connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.edusync.id -->
```

### VERIFY

```
# Check CSP includes VIL URL:
grep -o "connect-src[^;]*" index.html
# Expected: includes localhost:8080

pnpm build
# Expected: build succeeds
```

### STOP IF

- No CSP meta tag exists → skip, CSP may be set via Nginx headers instead
- Phase 0 abstraction layer not complete → mark BLOCKED, CSP update can wait

### OUTPUT FORMAT

```
DONE / BLOCKED
FILES: index.html
VERIFY: grep connect-src ✅ | pnpm build ✅
BLOCKED_REASON: (if applicable) Phase 0 not complete
```

---

## Task 1A-13: Integration Verify (End-to-End)

```
TASK ID:       1A-13
OWNER TYPE:    QA / Human Orchestrator
GOAL:          Verify all 1A tasks work together end-to-end
READ FIRST:    All previous task outputs
EDIT ONLY:     Nothing — verification only
DO NOT TOUCH:  Everything
DEPENDENCY:    ALL previous tasks (1A-1 through 1A-12)
```

### VERIFICATION CHECKLIST

```
# === Rust Compilation ===
cd edusync-api
cargo check --all-targets          # ✅ 0 errors
cargo clippy -- -D warnings        # ✅ 0 warnings
cargo test                         # ✅ all pass

# === Docker ===
docker compose build               # ✅ image builds
docker compose up -d               # ✅ services start

# === VIL Server Health ===
curl http://localhost:8080/api/v1/health    # ✅ {"status":"ok"}
curl http://localhost:8080/api/v1/ready     # ✅ {"ready":true}
curl http://localhost:8080/health           # ✅ VIL auto-health
curl http://localhost:8080/metrics          # ✅ Prometheus metrics

# === Nginx Reverse Proxy ===
curl http://localhost/api/v1/health         # ✅ proxied to VIL
# ⚠️ Supabase requires apikey header:
curl http://localhost/rest/v1/ -H "apikey: $SUPABASE_ANON_KEY"
# Expected: 200 OK (empty array or Supabase response)

# === CORS ===
curl -X OPTIONS http://localhost:8080/api/v1/health \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -v 2>&1 | grep "Access-Control"           # ✅ CORS headers present

# === Observability ===
curl http://localhost:8080/_vil/dashboard/  # ✅ VIL dashboard loads

# === Error Format ===
# Hit a non-existent endpoint via VIL:
curl http://localhost:8080/api/v1/nonexistent
# ✅ Returns PostgREST-compatible: { code, message, details, hint }

# === CI ===
# Push to branch, verify GitHub Actions runs

# === Cleanup ===
docker compose down
```

### SUCCESS CRITERIA

| **Criteria**             | **Expected**                                                   | **Status** |
| ------------------------ | -------------------------------------------------------------- | ---------- |
| Rust workspace compiles  | 5 crates, 0 errors                                             | ⬜         |
| DB connection works      | Same PostgreSQL as Supabase                                    | ⬜         |
| 5 model structs compile  | Profile, Tenant, Course, Class, UserRole (User deferred to 1B) | ⬜         |
| VIL API audit complete   | VIL*API*[AUDIT.md](http://AUDIT.md) — all paths verified       | ⬜         |
| .gitignore includes .env | edusync-api/.env not committed                                 | ⬜         |
| VIL health endpoint      | 200 OK with JSON                                               | ⬜         |
| VIL ready endpoint       | 200 OK, database: true                                         | ⬜         |
| VIL Observer dashboard   | /\_vil/dashboard/ accessible                                   | ⬜         |
| Prometheus metrics       | /metrics returns text                                          | ⬜         |
| Error format PostgREST   | { code, message, details, hint }                               | ⬜         |
| CORS works               | [localhost:5173](http://localhost:5173) allowed                | ⬜         |
| JwtAuth scaffold         | Compiles, Claims struct ready                                  | ⬜         |
| RateLimit scaffold       | 4 limiters configured                                          | ⬜         |
| Docker Compose           | VIL + PgBouncer + Nginx start                                  | ⬜         |
| Nginx proxies correctly  | VIL ↔ Supabase split works                                     | ⬜         |
| CI pipeline              | GitHub Actions green                                           | ⬜         |
| Structured logging       | vil_log output visible                                         | ⬜         |
| CSP updated              | connect-src includes VIL URL                                   | ⬜         |

### OUTPUT FORMAT

```
DONE / BLOCKED
FILES: none (verification only)
VERIFY: 16/16 criteria ✅
BLOCKED_ITEMS: (list any blocked tasks)
NEXT: Proceed to Phase 1B (Auth Implementation) tasks
```

---

## Catatan untuk Orchestrator

<aside>
🧭

**Setelah semua Task 1A selesai:**

1. Semua 16 criteria di Task 1A-13 harus ✅
2. VIL server berjalan dan menerima request
3. Reverse proxy ke Supabase berfungsi (zero behavior change)
4. Rollback: `docker compose down` → Supabase tetap jalan normal
5. **Next:** Buat `Agent Task Queue — Phase 1B` untuk auth implementation (JWT, password, session, OAuth, MFA)
</aside>
