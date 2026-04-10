# Wave 3 — P2 Operational & Optimization (9 Items)

> **Instruksi:** Apply items ini setelah Wave 2 selesai. Ini adalah optimizations yang bisa di-apply incrementally selama Phase 1-3. Estimasi total hemat: **~70 jam**.

---

## Status Tracker

| #   | Gap | VIL Built-in / Topic             | Hemat           | Target Phase      | Status            |
| --- | --- | -------------------------------- | --------------- | ----------------- | ----------------- |
| 1   | #11 | `VilEntity` DB Semantic Layer    | ~0 jam (eval)   | Phase 2           | ⬜                |
| 2   | #12 | `MultiPoolManager`               | ~4 jam          | Phase 2           | ⬜                |
| 3   | #17 | Rust CI/CD Strategy              | ~0 jam (ops)    | Phase 1           | ⬜                |
| 4   | #18 | Binary Size & Deployment         | ~0 jam (ops)    | Phase 6           | ⬜                |
| 5   | #19 | Graceful Shutdown                | ~4 jam          | Phase 1           | ⬜                |
| 6   | #20 | VIL Profiles (dev/staging/prod)  | ~0 jam (doc)    | Bootstrap Context | ⬜                |
| 7   | #21 | `OpenApiBuilder` API Docs        | ~6 jam          | Phase 2           | ⬜                |
| 8   | #22 | `/admin/playground` API Explorer | ~0 jam (config) | Phase 1           | ⬜                |
| 9   | #24 | Revised Timeline Numbers         | ~0 jam          | Main Plan         | ✅ Done in Wave 1 |

---

## Item 1: `VilEntity` DB Semantic Layer (#11)

**Hemat:** Evaluate — bisa signifikan jika boilerplate terlalu banyak

**Target:** Phase 2 Detail — evaluate saat Batch 1

**When:** Setelah 10+ models ditulis dengan raw `sqlx::FromRow`

**Action:** Evaluate apakah `VilEntity` derive macro mengurangi boilerplate:

```rust
// Raw sqlx approach (current plan):
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Course {
    pub id: Uuid,
    pub title: String,
    // ... manual CRUD functions
}

// VilEntity approach (evaluate):
#[derive(VilEntity)]
#[entity(table = "courses", provider = "postgres")]
pub struct Course {
    #[entity(primary_key)]
    pub id: Uuid,
    pub title: String,
    // Auto-generates: find_by_id, insert, update, delete
}
```

**Decision point:** Jika >50% CRUD handlers punya pattern identik → switch ke VilEntity. Jika banyak custom queries → tetap raw sqlx.

---

## Item 2: `MultiPoolManager` untuk Per-Service DB Pools (#12)

**Hemat:** ~4 jam

**Target:** Phase 2 Detail — optimization section

**When:** Saat Phase 2 Batch 2 (quizzes + gradebook heavy queries)

**Action:** Tambahkan pool isolation:

```rust
use vil_server::db::MultiPoolManager;

let pools = MultiPoolManager::new()
    .pool("default", PgPoolOptions::new().max_connections(50))   // General CRUD
    .pool("analytics", PgPoolOptions::new().max_connections(20)) // Heavy reads
    .pool("grading", PgPoolOptions::new().max_connections(10));  // Quiz grading writes

// Usage:
let courses = sqlx::query_as::<_, Course>("SELECT ...")
    .fetch_all(pools.get("default"))
    .await?;

let analytics = sqlx::query_as::<_, Overview>("SELECT * FROM get_executive_overview(...)")
    .fetch_one(pools.get("analytics"))
    .await?;
```

**Benefit:** Analytics heavy queries tidak starve CRUD connections.

---

## Item 3: Rust CI/CD Strategy (#17)

**Hemat:** Operational — prevents 15-30 min build times blocking deploys

**Target:** Phase 1 Detail — new "CC9: CI/CD" section

**When:** Phase 1A scaffold

**Action:** Add CI/CD section:

- **Multi-stage Docker builds** — separate dependency + build stages
- **`cargo-chef`** — dependency caching (build deps once, cache until Cargo.lock changes)
- **`sccache`** — shared compilation cache across CI runs
- **Incremental builds** for dev (only recompile changed crates)
- **Build matrix:** test on PR, release on merge to main

```docker
# Dockerfile (multi-stage with cargo-chef)
FROM rust:1.78 AS chef
RUN cargo install cargo-chef
WORKDIR /app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json  # Cache deps
COPY . .
RUN cargo build --release

FROM gcr.io/distroless/cc-debian12
COPY --from=builder /app/target/release/edusync-api /
CMD ["/edusync-api"]
```

---

## Item 4: Binary Size & Deployment (#18)

**Hemat:** Operational

**Target:** Phase 6 Detail — deployment section

**When:** Phase 6 decommission

**Action:** Add to Phase 6:

- `--profile release-lto` untuk production binary (link-time optimization)
- Docker: `distroless` base image (smallest, no shell)
- Binary size target: <50MB
- Strip debug symbols: `strip = true` in Cargo.toml release profile

```toml
# Cargo.toml
[profile.release]
lto = true
strip = true
codegen-units = 1
panic = "abort"
```

---

## Item 5: Graceful Shutdown (#19)

**Hemat:** ~4 jam — kritis untuk in-flight quiz submissions

**Target:** Phase 1 Detail — Phase 1A scaffold

**When:** Phase 1A (must be from day 1)

**Action:** Add ke Phase 1A VilApp setup:

```rust
use vil_server::lifecycle::RestartCoordinator;

// VIL built-in graceful shutdown
let coordinator = RestartCoordinator::new();

// On SIGTERM:
coordinator.start_drain();     // Stop accepting new connections
coordinator.wait_for_drain(    // Wait for in-flight requests
    Duration::from_secs(30)    // Max 30s drain period
).await;
// Then shutdown
```

**Critical for:** In-flight quiz submissions, file uploads, grading jobs. Tanpa ini, SIGTERM = data loss.

---

## Item 6: VIL Profiles (dev/staging/prod) (#20)

**Hemat:** Documentation improvement

**Target:** Bootstrap Context — Section 12 Configuration

**When:** Phase 1A

**Action:** Expand Bootstrap Context Section 12 dengan profile details:

| Setting        | `dev`   | `staging` | `prod`   |
| -------------- | ------- | --------- | -------- |
| DB connections | 10      | 25        | 50       |
| Log level      | debug   | info      | warn     |
| SHM pool       | 64MB    | 128MB     | 256MB    |
| Observer       | enabled | enabled   | enabled  |
| Playground     | enabled | enabled   | disabled |

```rust
// Set via VIL_PROFILE env var or .profile() call:
VilApp::new("edusync-api")
    .profile("prod")  // or env VIL_PROFILE=prod
```

---

## Item 7: `OpenApiBuilder` API Documentation (#21)

**Hemat:** ~6 jam — auto-generate instead of manual docs

**Target:** Phase 2 Detail — new section

**When:** Phase 2 Batch 1 (setelah courses endpoints done)

**Action:** Add OpenAPI auto-generation:

```rust
use vil_server::openapi::OpenApiBuilder;

let openapi = OpenApiBuilder::new()
    .title("EduSync API")
    .version("1.0.0")
    .description("EduSync LMS REST API")
    .server("https://api.edusync.id")
    .build();

// Auto-exposed at /api/docs (Swagger UI)
// Auto-exposed at /api/openapi.json
```

**Benefit:** Frontend team dapat generated API docs. Juga berguna untuk LTI platform integrators.

---

## Item 8: `/admin/playground` API Explorer (#22)

**Hemat:** Configuration only — zero code

**Target:** Phase 1 Detail — Phase 1A scaffold

**When:** Phase 1A (enable during development)

**Action:** VIL built-in API explorer. Tambahkan note ke Phase 1A:

```rust
// Enabled by default in dev/staging profiles
// Access: http://localhost:8080/admin/playground
// Disable in prod: profile("prod") auto-disables
```

**Benefit:** Sangat berguna untuk testing migrated endpoints tanpa Postman/curl. Bisa test auth flows, CRUD, RPCs langsung di browser.

---

## Item 9: Revised Timeline Numbers (#24)

**Status:** ✅ **Already done in Wave 1**

- Header: ~60 minggu (~15 bulan)
- Total effort: ~853 jam
- Effort Summary table: ~167 jam saved

---

## Apply Order Recommendation

Wave 3 items bisa di-apply **non-sequentially** karena mereka independen. Recommended grouping:

1. **Saat Phase 1A scaffold:** #3 CI/CD, #5 Graceful Shutdown, #6 Profiles, #8 Playground
2. **Saat Phase 2 Batch 1:** #1 VilEntity eval, #2 MultiPoolManager, #7 OpenAPI, #9 (done)
3. **Saat Phase 6:** #4 Binary Size
