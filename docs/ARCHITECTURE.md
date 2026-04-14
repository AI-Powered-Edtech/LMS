# EduSync LMS — System Architecture

## Overview

EduSync is a multi-tenant SaaS LMS built on a VIL (Vastar Intermediate Language) Rust backend with a React 19 frontend. All data lives in Docker-hosted PostgreSQL 16. There is no Supabase, no GoTrue, no PostgREST, and no Edge Functions.

VIL (`vil_server = "0.2"`) is a process-oriented framework built on Axum 0.7. It provides ShmSlice zero-copy body extraction, ServiceCtx typed state, VilResponse SIMD JSON, SseCollect AI streaming, WsHub WebSocket broadcast, and the VIL Scheduler for background jobs. See https://github.com/OceanOS-id/VIL.

## ASCII Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser / PWA)                         │
│                                                                         │
│  React 19 + Vite 6 + TypeScript                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │ Features │  │  Pages   │  │  Hooks    │  │ Services (abstracted) │  │
│  │ courses  │  │ (thin)   │  │ useAuth() │  │ db / auth / storage  │  │
│  │ gradebook│  │          │  │ useQuery()│  │ realtime             │  │
│  │ analytics│  │          │  │           │  │                      │  │
│  └──────────┘  └──────────┘  └───────────┘  └──────────────────────┘  │
└──────────────────────────┬──────────────────────┬───────────────────────┘
                           │ HTTP/REST            │ WebSocket
                           │ /api/v1/...          │ /ws?token=JWT
┌──────────────────────────▼──────────────────────▼───────────────────────┐
│                         nginx (reverse proxy)                           │
│  Port 80 → api:8080  |  /ws → WebSocket upgrade  |  /storage → 550MB  │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────────┐
│              VIL API Server (vil_server = "0.2" / Axum 0.7)              │
│                         Port 8080                                       │
│                                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │   auth   │ │  courses │ │   data   │ │  storage │ │  realtime   │  │
│  │ crate    │ │ handlers │ │  plane   │ │ handlers │ │  WebSocket  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └─────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │    ai    │ │   lti    │ │ notifs   │ │ processing│ │   cron     │  │
│  │ handlers │ │ handlers │ │ handlers │ │ handlers  │ │   jobs     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └─────────────┘  │
│                                                                         │
│  middleware: RBAC guard │ tenant injection │ brute-force limiter       │
└──────────┬──────────────────────────────────┬────────────────────────────┘
           │ sqlx (direct TCP)                │ vil_conn_s3::S3Connector
┌──────────▼──────────────┐       ┌───────────▼──────────────────────────┐
│     pgBouncer :5433     │       │   S3-compatible Object Storage       │
│  (transaction pool)     │       │   MinIO (dev) / Cloudflare R2 (prod) │
└──────────┬──────────────┘       └──────────────────────────────────────┘
           │ PostgreSQL protocol
┌──────────▼──────────────┐
│  PostgreSQL 16 :5432    │
│  (pgvector image)       │
│  Extensions:            │
│   uuid-ossp, pgcrypto   │
│   citext, pg_trgm       │
│   pgvector, unaccent    │
│   pg_stat_statements    │
└─────────────────────────┘
```

## Frontend Layer

### Framework & Libraries

| Library                  | Version | Purpose                        |
| ------------------------ | ------- | ------------------------------ |
| React                    | 19      | UI framework                   |
| Vite                     | 6       | Build tool                     |
| TypeScript               | 5.8     | Type safety                    |
| Tailwind CSS             | v4      | Styling                        |
| React Router             | v7      | Hash-based routing             |
| React Query              | v5      | Server state, caching          |
| Zustand                  | v5      | Local state (quiz player only) |
| Lucide React             | latest  | Icon set                       |
| Framer Motion (`motion`) | 12      | Animations                     |
| Recharts                 | 3       | Data charts                    |
| Valibot                  | 1       | Schema validation              |
| hls.js                   | 1.5     | HLS video streaming            |
| jsPDF                    | 4       | PDF generation                 |

### Service Abstraction Layer

All backend interaction goes through four abstracted service providers in `src/services/`:

```
src/services/
├── db/
│   └── index.ts          # Unified db facade — delegates to:
│                         #   .from()  → VIL data plane API
│                         #   .rpc()   → VIL RPC proxy API
│                         #   .auth    → vilAuthProvider
│                         #   .storage → vilStorageProvider
│                         #   .channel() → vilRealtimeProvider
├── auth/
│   ├── index.ts          # getAuthProvider() factory
│   └── vilAuthProvider.ts # JWT auth: login, register, refresh, MFA
├── storage/
│   ├── index.ts          # getStorageProvider() factory
│   └── vilStorageProvider.ts # S3 via VIL API; presigned PUT for >10MB
├── realtime/
│   ├── index.ts          # getRealtimeProvider() factory
│   └── vilRealtimeProvider.ts # WebSocket multiplexed channels
└── api/
    └── runtime.ts        # Active API client + shadow mode config
```

Feature code imports `db` from `@/services/db` and uses the familiar `.from(table)`, `.rpc(fn)` pattern, making the underlying transport invisible.

### Routing

- Hash routing (`/#/path`) via React Router v7
- Route protection via `<RoleRoute role="teacher" />` or `<RoleRoute role={["student", "teacher"]} />`
- Student routes: `/#/app/student/...`
- Teacher routes: `/#/app/teacher/...` or `/#/teaching/...`
- Admin routes: `/#/app/admin/...` or `/#/admin/...`

### Feature Module Structure

New features live in `src/features/{domain}/` with the following internal layout:

```
src/features/{domain}/
├── api/         # API call functions
├── queries/     # React Query query/mutation definitions
├── hooks/       # Custom React hooks
├── store/       # Zustand store (if needed)
├── types/       # TypeScript types
├── components/  # UI components
└── utils/       # Pure utility functions
```

## Backend Layer

### VIL Framework

The backend uses `vil_server` (v0.2.2), a Rust framework built on Axum 0.7. Services are registered as `ServiceProcess` instances and composed into a `VilApp`.

### Crate Structure

```
edusync-api/crates/
├── api-server/     # Main binary: main.rs registers all service routes
│   ├── ai_handlers.rs
│   ├── auth/       # login, register, refresh, signout, MFA, OAuth, tenant RPCs
│   ├── courses.rs
│   ├── cron.rs     # Scheduled background jobs
│   ├── data_plane.rs  # PostgREST-compatible /data/:table + /rpc/:name
│   ├── lti_handlers.rs
│   ├── notification_handlers.rs
│   ├── observability.rs  # Shadow mode, divergence events
│   ├── processing_handlers.rs  # Events, quiz load, SCORM, CSV import
│   ├── realtime/   # WebSocket handler + pg_notify listener + RoomManager
│   ├── state.rs    # AppState, SmtpConfig, ShadowRuntimeConfig
│   └── storage/    # S3 upload, download, sign, presign, list, delete
├── auth/           # JWT encode/decode, Argon2/bcrypt hashing
├── middleware/     # RBAC extractor (AuthedRequest), brute force, AppError
├── models/         # SQLx row types
├── services/       # Business logic (reusable service functions)
└── integration-tests/  # Gate 3 integration test suite
```

### AppState

Shared across all handlers via Arc:

```rust
struct AppState {
    db: PgPool,                           // sqlx connection pool (max 50)
    jwt_secret: String,                   // HS256 access token secret
    jwt_refresh_secret: String,           // HS256 refresh token secret
    brute_force: BruteForceTracker,       // IP-based rate limiter
    shadow: ShadowRuntimeConfig,          // Shadow mode config
    groq_api_key: Option<String>,         // Groq LLM API key
    vapid_private_key: Option<String>,    // Web Push VAPID key
    vapid_public_key: Option<String>,
    smtp: SmtpConfig,                     // Email (lettre)
    whatsapp_access_token: Option<String>,
    whatsapp_phone_number_id: Option<String>,
    storage: Option<Arc<S3StorageClient>>, // S3/MinIO/R2 client
}
```

### Cron Jobs

Background jobs started at server boot (`cron::start_cron_jobs`). Tasks include digest notifications, session cleanup, and similar periodic work.

## Database Layer

- **Engine**: PostgreSQL 16 (`pgvector/pgvector:pg16` Docker image)
- **Connection pooling**: pgBouncer in transaction mode (port 5433); backend API connects to pgBouncer, not directly to Postgres
- **Direct access**: PostgreSQL port 5432 (for migrations, admin)
- **Schema initialization**: `schema/init-db.sql` + `schema/baseline.sql` auto-loaded at Docker first-run
- **Migrations**: `migrations/001` through `migrations/009` (applied by the API server at startup via sqlx)
- **Extensions**: `uuid-ossp`, `pgcrypto`, `citext`, `pg_trgm`, `pgvector`, `unaccent`, `pg_stat_statements`

See [DATABASE.md](DATABASE.md) for full table and column reference.

## Storage Layer

- **Local dev**: MinIO at `http://localhost:9000` (S3-compatible)
- **Production**: Cloudflare R2
- **SDK**: `vil_conn_s3::S3Connector` (VIL-native S3 client)
- **Upload strategy**: files < 10 MB proxy through VIL API; files ≥ 10 MB use presigned PUT direct to S3
- **Bucket layout**: single S3 bucket, paths prefixed by logical bucket name and tenant_id

See [STORAGE.md](STORAGE.md) for bucket definitions and URL types.

## Realtime Layer

- **Transport**: native WebSocket (`/ws?token=JWT`)
- **Architecture**: single WebSocket connection per client, multiplexed channels
- **Server push**: `pg_notify` on 5 PostgreSQL channels → routed to WebSocket rooms by `RoomManager`
- **Reconnection**: exponential backoff 1 s → 30 s (max 10 retries)
- **Presence**: track/untrack per channel, state diff events

See [REALTIME.md](REALTIME.md) for channel patterns and message protocol.

## Auth Flow

See [AUTH.md](AUTH.md) for the complete auth architecture.

Summary:

1. `POST /api/v1/auth/register` → creates user + profile + user_roles row
2. `POST /api/v1/auth/login` → validates password (Argon2), issues access token (15 min HS256) + refresh token (7 days)
3. `GET /api/v1/auth/bootstrap` → frontend calls on load to restore session and fetch profile
4. `POST /api/v1/auth/refresh` → exchanges refresh token for a new token pair
5. `POST /api/v1/auth/signout` → invalidates refresh token in DB

## Multi-Tenancy

- Every data table has a `tenant_id UUID` column
- All query handlers inject the caller's `tenant_id` (from JWT claims) into every WHERE clause
- No cross-tenant data leakage is possible at the query level
- The `auto_set_tenant_id()` trigger automatically fills `tenant_id` on INSERT for tables that use it

## Security Model

- No Row-Level Security (RLS) at the database layer — removed in Phase 6
- Tenant isolation enforced entirely by VIL middleware (JWT → tenant_id injection)
- RBAC via `AuthedRequest` extractor and `RbacGuard` in Rust
- Brute force protection: 5 failed login attempts per IP per 15 minutes
- All secrets validated at startup (JWT secrets must be ≥ 32 characters)

See [SECURITY.md](SECURITY.md) for the complete security model.

## VIL Way — Handler Pattern

All handlers use VIL primitives from `vil_server::prelude`. The migration from
Axum-only idioms to VIL Way was completed in Wave 1 (courses, auth, data plane,
storage, realtime) and Wave 2 (ai, lti, notification, processing handlers).

```rust
// ✅ VIL Way
pub async fn handler(
    AuthedRequest(auth): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<Response>> {
    let state = svc.state::<Arc<AppState>>()?;
    let req: Request = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;
    // ... business logic ...
    Ok(VilResponse::ok(result))
}
```

| VIL Primitive              | Replaces                                             | Benefit                                         |
| -------------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| `ShmSlice`                 | `Json<T>`                                            | Zero-copy body deserialization via ExchangeHeap |
| `ServiceCtx`               | `Extension<Arc<T>>`                                  | Tri-Lane context + typed state lookup           |
| `VilResponse::ok(data)`    | `(StatusCode::OK, Json(data))`                       | SIMD JSON serialization                         |
| `VilResponse::raw(resp)`   | `impl IntoResponse` passthrough                      | Binary / SSE responses                          |
| `VilError`                 | Custom `AppError` enum + `(StatusCode, Json)` tuples | Standard RFC 7807 error format                  |
| `HandlerResult<T>`         | `Result<T, AppError>`                                | Unified `?` propagation                         |
| `SseCollect`               | Manual `reqwest` SSE loop                            | Built-in SSE dialect handling                   |
| `WsHub`                    | Manual `RoomManager`                                 | Topic-based broadcast hub                       |
| `Scheduler`                | Manual `tokio::time::interval`                       | Named job scheduling                            |
| `vil_conn_s3::S3Connector` | `aws-sdk-s3`                                         | VIL-native S3 client                            |
| `#[vil_handler(shm)]`      | —                                                    | Enables SHM ExchangeHeap body                   |

### Special-case extractors (kept as-is)

Some handlers retain non-VIL extractors by design:

| Handler                         | Kept Extractor                   | Reason                                                    |
| ------------------------------- | -------------------------------- | --------------------------------------------------------- |
| `lti_oidc_login_handler`        | `Query<T>`                       | Platform sends GET query params, not JSON                 |
| `lti_launch_handler`            | `Form<T>`                        | LTI 1.3 spec mandates `application/x-www-form-urlencoded` |
| `extract_scorm_handler`         | `Bytes`                          | Raw ZIP binary upload                                     |
| `import_users_handler`          | `Bytes`                          | Raw CSV binary upload                                     |
| `whatsapp_webhook_post_handler` | `Bytes`                          | Raw webhook payload from provider                         |
| `whatsapp_webhook_get_handler`  | `Query<T>` + plain text response | Hub challenge is plain text, not JSON                     |

### VilApp Registration

```rust
VilApp::new("edusync-lms")
    .port(8080)
    .profile(&vil_profile)         // env-driven profile: dev / staging / prod (VIL_PROFILE)
    .observer(true)                // /_vil/dashboard/ live metrics UI + /_vil/api/*
    .service(auth_service)
    .service(courses_service)
    .service(data_plane_service)
    .service(storage_service)
    .service(ai_service)
    .service(lti_service)
    .service(notification_service)
    .service(processing_service)
    .service(realtime_service)
    // All services attach state via:
    //   .extension(Arc::clone(&state_arc))
    .run()
    .await;
```

## Observer Dashboard

Available at `/_vil/dashboard/` when `.observer(true)` is set (enabled in dev/staging; disabled in prod profile by default):

- Live RPS, latency P50/P95/P99
- Per-route metrics table
- SHM pool utilization
- Service topology graph
- SLO budget tracking

Auto-registered endpoints (free from VilApp):

| Path                   | Description                       |
| ---------------------- | --------------------------------- |
| `GET /health`          | Liveness probe                    |
| `GET /ready`           | Readiness probe                   |
| `GET /metrics`         | Prometheus metrics                |
| `GET /_vil/dashboard/` | VIL Observer UI                   |
| `GET /_vil/api/routes` | Registered routes JSON            |
| `GET /_vil/api/system` | OS metrics (cpu, memory, threads) |
