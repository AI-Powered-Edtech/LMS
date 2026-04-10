# 10_VIL_BOOTSTRAP_CONTEXT

Folder ini berisi dokumentasi referensi framework VIL untuk migrasi EduSync dari Supabase ke backend Rust berbasis VIL.

## Isi Folder

| File                       | Deskripsi                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `VIL_FOR_EDUSYNC.md`       | Dokumentasi komprehensif arsitektur VIL, handler patterns, dan setup EduSync                               |
| `RECOMMENDED_PATTERNS.md`  | Pola-pola yang direkomendasikan: security, database, WebSocket, SSE, storage, cron, observability, testing |
| `AVOID_OVERENGINEERING.md` | Anti-patterns dan gotchas yang harus dihindari: SQL, Auth, Multi-Tenant, Frontend                          |

## Tujuan

Folder ini menyediakan konteks teknis bagi agent AI untuk menulis backend EduSync menggunakan framework VIL dengan benar dan konsisten.

## Sumber

- Repositori: `github.com/OceanOS-id/VIL`
- Dokumentasi: `docs/vil-server/vil-server-guide.md`

## Komponen Utama VIL

VIL (Village Internet Language) adalah process-oriented framework di atas Rust + Axum yang menyediakan:

- **VilApp**: Process topology builder - entry point untuk mendaftarkan services dan mengkonfigurasi mesh
- **ServiceProcess**: Service-as-Process untuk registrasi endpoint dengan prefix dan visibility
- **ServiceCtx**: Process-aware context untuk akses state dan Tri-Lane messaging
- **ShmSlice**: Zero-copy request body via shared memory
- **VilResponse**: SIMD-serialized response dengan method seperti `.ok()`, `.created()`, `.no_content()`
- **VilError**: Error type dengan method `.bad_request()`, `.unauthorized()`, `.internal()`, `.not_found()`
- **VxMeshConfig**: Tri-Lane routing untuk inter-service messaging

## VIL Quick-Reference Cheat Sheet

VIL uses Axum under the hood. **Pattern A (Axum-style) is recommended** for EduSync migration. See [VIL_FOR_EDUSYNC.md](./VIL_FOR_EDUSYNC.md) for detailed patterns and examples.

### How to Create a New Handler

```rust
// File: src/handlers/courses.rs
use vil_core::{ServiceCtx, ShmSlice, VilResponse, VilError};
use axum::extract::{Path, Query};

// GET handler — no request body
pub async fn list_courses(
    ctx: ServiceCtx,
    Query(params): Query<PaginationParams>,
) -> Result<VilResponse, VilError> {
    let pool = ctx.db_pool();
    let courses = sqlx::query_as!(Course,
        "SELECT id, title, status FROM courses WHERE tenant_id = $1 LIMIT $2 OFFSET $3",
        ctx.tenant_id(), params.limit, params.offset
    )
    .fetch_all(pool)
    .await
    .map_err(|e| VilError::internal(format!("DB error: {e}")))?;

    VilResponse::ok(courses)
}

// POST handler — with request body
pub async fn create_course(
    ctx: ServiceCtx,
    body: ShmSlice<CreateCourseRequest>,
) -> Result<VilResponse, VilError> {
    let req = body.deserialize()?;
    let pool = ctx.db_pool();
    // ... insert logic
    VilResponse::created(new_course)
}
```

### How to Register a Handler (Add Routes)

```rust
// File: src/services/courses_service.rs
use vil_core::ServiceProcess;

pub fn register(svc: &mut ServiceProcess) {
    svc.prefix("/api/v1/courses")
        .get("/", list_courses)
        .get("/:id", get_course)
        .post("/", create_course)
        .put("/:id", update_course)
        .delete("/:id", delete_course);
}
```

### How to Add Middleware

```rust
// File: src/middleware/auth.rs
use vil_core::middleware::VilMiddleware;

// Option A: Per-service middleware (applied to all routes in a service)
pub fn register_with_global_auth(svc: &mut ServiceProcess) {
    svc.middleware(auth_middleware);  // runs before every handler in this service
}

// Option B: Per-route middleware
pub fn register_with_route_auth(svc: &mut ServiceProcess) {
    svc.prefix("/api/v1/admin")
        .get("/users", list_users).with(require_role("admin"));
}
```

### How to Connect to PostgreSQL

```rust
// In VilApp setup (main.rs or app.rs)
use vil_core::VilApp;
use sqlx::PgPool;

let pool = PgPool::connect(&std::env::var("DATABASE_URL")?)
    .await?;

let app = VilApp::new()
    .state(pool)  // shared across all services
    .build();

// In handlers, access via ServiceCtx
pub async fn my_handler(ctx: ServiceCtx) -> Result<VilResponse, VilError> {
    let pool = ctx.db_pool();  // retrieves the PgPool from state
    // use pool with sqlx queries
}
```

### How to Run Tests

```bash
# Run all tests
cargo test

# Run tests for a specific service
cargo test --test courses

# Run integration tests (requires DATABASE_URL)
DATABASE_URL="postgresql://..." cargo test --test integration

# Run with logging visible
RUST_LOG=debug cargo test -- --nocapture

# Run a specific test by name
cargo test test_create_course -- --exact
```

## Cara Menggunakan

1. Baca `VIL_FOR_EDUSYNC.md` untuk memahami arsitektur dasar dan setup
2. Lihat `RECOMMENDED_PATTERNS.md` untuk pola-pola yang sudah terbukti
3. Selalu referensikan `AVOID_OVERENGINEERING.md` agar tidak melakukan kesalahan umum
4. Gunakan cheat sheet di atas sebagai quick-start, lalu lihat `VIL_FOR_EDUSYNC.md` untuk detail lengkap
