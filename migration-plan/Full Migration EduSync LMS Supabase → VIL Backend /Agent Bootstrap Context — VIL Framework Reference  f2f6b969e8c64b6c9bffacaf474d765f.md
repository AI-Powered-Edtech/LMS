# Agent Bootstrap Context — VIL Framework Reference untuk EduSync

<aside>
🦀

**WAJIB BACA sebelum mengerjakan Phase 1+.** Dokumen ini berisi semua konteks VIL framework yang dibutuhkan agent untuk menulis kode Rust EduSync backend. Sumber: `github.com/OceanOS-id/VIL` repo + `docs/vil-server/vil-server-guide.md`.

</aside>

---

## 1. VIL Architecture Overview

VIL adalah **process-oriented framework** di atas Rust + Axum. Komponen utama:

| Type             | Role                     | Penjelasan                                                         |
| ---------------- | ------------------------ | ------------------------------------------------------------------ |
| `VilApp`         | Process topology builder | Entry point app, register services, configure mesh, run            |
| `ServiceProcess` | Service-as-Process       | Endpoint registration, prefix, visibility (Public/Internal)        |
| `ServiceCtx`     | Process-aware context    | `.state::<T>()` untuk akses shared state, `.send()` untuk Tri-Lane |
| `ShmSlice`       | Zero-copy request body   | Request body via shared memory, `.json::<T>()` untuk deserialize   |
| `VilResponse`    | SIMD-serialized response | `.ok(data)`, `.created(data)`, `.no_content()`                     |
| `VilError`       | Error type               | `.bad_request()`, `.unauthorized()`, `.internal()`, `.not_found()` |
| `VxMeshConfig`   | Tri-Lane routing         | Inter-service messaging via Trigger/Data/Control lanes             |

**VIL dibangun di atas Axum** — semua Axum handler dan extractor (Json, Path, Query, State) tetap work. VIL menambahkan ShmSlice, ServiceCtx, dan VilResponse di atasnya.

---

## 2. VIL Handler Pattern (WAJIB DIIKUTI)

Semua endpoint di EduSync VIL **HARUS** ikuti pattern ini:

```rust
use vil_server::prelude::*;

// Pattern A: Simple handler (tanpa zero-copy)
async fn handler(
    State(ctx): State<AppState>,    // Shared state (DB pool, config)
    Path(id): Path<String>,         // URL path params
    Query(params): Query<Params>,   // Query string params
    Json(body): Json<RequestBody>,  // JSON request body
) -> Result<Json<ResponseBody>, VilError> {
    // Business logic here
    Ok(Json(data))
}

// Pattern B: VIL Way (dengan zero-copy SHM + VilResponse)
async fn handler(
    ctx: ServiceCtx,                // VIL context (state + Tri-Lane)
    body: ShmSlice,                 // Zero-copy request body
) -> Result<VilResponse<ResponseBody>, VilError> {
    let store = ctx.state::<Arc<Store>>()?;   // Get typed state
    let input: RequestBody = body.json()      // SIMD JSON parse
        .map_err(|_| VilError::bad_request("invalid JSON"))?;
    Ok(VilResponse::ok(data))                 // SIMD serialize response
}
```

<aside>
💡

**Untuk EduSync, gunakan Pattern A (Axum-style)** di awal migrasi. Ini lebih mudah di-port dari Deno/TypeScript. Upgrade ke Pattern B (VIL Way) nanti sebagai optimization.

</aside>

---

## 3. VilApp Setup (EduSync Architecture)

```rust
use vil_server::prelude::*;
use sqlx::postgres::PgPoolOptions;

#[tokio::main]
async fn main() {
    // 1. Database connection (SAME PostgreSQL as Supabase)
    let db = PgPoolOptions::new()
        .max_connections(50)
        .connect(&std::env::var("DATABASE_URL").unwrap())
        .await
        .unwrap();

    // 2. Shared app state
    let state = AppState {
        db: db.clone(),
        jwt_secret: std::env::var("JWT_SECRET").unwrap(),
        groq_api_key: std::env::var("GROQ_API_KEY").ok(),
    };

    // 3. Service definitions
    let auth = ServiceProcess::new("auth")
        .prefix("/api/v1/auth")
        .endpoint(Method::POST, "/register", post(register))
        .endpoint(Method::POST, "/login", post(login))
        .endpoint(Method::POST, "/refresh", post(refresh_token))
        .endpoint(Method::POST, "/signout", post(sign_out))
        .endpoint(Method::GET, "/oauth/google", get(google_oauth_init))
        .endpoint(Method::GET, "/callback/google", get(google_oauth_callback))
        .endpoint(Method::POST, "/mfa/enroll", post(mfa_enroll))
        .endpoint(Method::POST, "/mfa/verify", post(mfa_verify));

    let courses = ServiceProcess::new("courses")
        .prefix("/api/v1")
        .endpoint(Method::GET, "/courses", get(list_courses))
        .endpoint(Method::GET, "/courses/:id", get(get_course))
        .endpoint(Method::POST, "/courses", post(create_course))
        .endpoint(Method::PUT, "/courses/:id", put(update_course))
        .endpoint(Method::DELETE, "/courses/:id", delete(delete_course));

    let quizzes = ServiceProcess::new("quizzes")
        .prefix("/api/v1")
        .endpoint(Method::GET, "/quizzes/:id", get(get_quiz))
        .endpoint(Method::POST, "/quizzes/:id/submit", post(submit_quiz));

    let ai = ServiceProcess::new("ai")
        .prefix("/api/v1/ai")
        .endpoint(Method::POST, "/grade-essay", post(grade_essay))
        .endpoint(Method::POST, "/tutor/chat", post(tutor_chat))
        .endpoint(Method::POST, "/generate-content", post(generate_content));

    let grader = ServiceProcess::new("grader")
        .visibility(Visibility::Internal);  // Only via Tri-Lane

    // 4. Tri-Lane mesh (auto-grader separated from API)
    let mesh = VxMeshConfig::new()
        .route("quizzes", "grader", VxLane::Trigger)   // Quiz submit triggers grading
        .route("grader", "quizzes", VxLane::Data);     // Grading results back

    // 5. Run
    VilApp::new("edusync-api")
        .port(8080)
        .profile("prod")       // prod profile: 50 DB conn, warn logging, 256MB SHM
        .state(state)          // Shared state for all services
        .observer(true)        // Enable /_vil/dashboard/ for monitoring
        .service(auth)
        .service(courses)
        .service(quizzes)
        .service(ai)
        .service(grader)
        .mesh(mesh)
        .run()
        .await;
}

#[derive(Clone)]
struct AppState {
    db: sqlx::PgPool,
    jwt_secret: String,
    groq_api_key: Option<String>,
}
```

---

## 4. VIL Built-in Security Features

VIL sudah punya semua security primitives yang EduSync butuhkan:

### JWT Authentication

```rust
use vil_server::auth::jwt::JwtAuth;

let auth = JwtAuth::new(&jwt_secret);
// Apply as middleware to service:
let courses = ServiceProcess::new("courses")
    .layer(auth.layer())   // All endpoints require valid JWT
    .endpoint(...);
```

### Rate Limiting

```rust
use vil_server::auth::rate_limit::RateLimit;

// 100 requests per minute per client
let limiter = RateLimit::new(100, Duration::from_secs(60));
if limiter.check("client-ip-or-user-id").is_err() {
    return Err(VilError::too_many_requests("Rate limit exceeded"));
}
```

### RBAC (Role-Based Access Control)

```rust
use vil_server::auth::rbac::{RbacPolicy, Role};

let policy = RbacPolicy::new();
policy.add_role(Role::new("admin")
    .permission("courses:*")
    .permission("users:*")
    .permission("analytics:*"));
policy.add_role(Role::new("teacher")
    .permission("courses:read").permission("courses:write")
    .permission("quizzes:*").permission("gradebook:*"));
policy.add_role(Role::new("student")
    .permission("courses:read")
    .permission("quizzes:submit").permission("progress:read"));
policy.add_role(Role::new("parent")
    .permission("progress:read").permission("messages:*"));
policy.add_role(Role::new("principal")
    .permission("analytics:*").permission("reports:*"));

// Check: policy.check_permission(&["teacher"], "courses:write") → true
```

### Circuit Breaker (untuk AI services)

```rust
use vil_server::auth::circuit_breaker::{CircuitBreaker, CircuitBreakerConfig};

let cb = CircuitBreaker::new("groq-api", CircuitBreakerConfig {
    failure_threshold: 5,        // Open after 5 failures
    cooldown: Duration::from_secs(30),  // Wait 30s before half-open
    ..Default::default()
});

// Before calling Groq:
cb.check()?;                    // Returns Err if circuit is Open
let result = call_groq().await;
match result {
    Ok(_) => cb.record_success(),
    Err(_) => cb.record_failure(),
}
```

---

## 5. Database (vil_db_sqlx)

```rust
// Model definition
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Course {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub status: String,           // 'draft'|'published'|'in_review'|'approved'
    pub tenant_id: Uuid,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Query with explicit columns (JANGAN SELECT *)
let courses = sqlx::query_as::<_, Course>(
    r#"SELECT id, title, description, status, tenant_id, created_by, created_at, updated_at
       FROM courses
       WHERE tenant_id = $1 AND status = 'published'
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3"#
)
.bind(tenant_id)
.bind(limit)
.bind(offset)
.fetch_all(&state.db)
.await?;

// Call existing stored procedure (KEEP RPCs in PostgreSQL)
let bootstrap = sqlx::query_as::<_, AuthBootstrap>(
    "SELECT * FROM get_auth_bootstrap()"
)
.fetch_one(&state.db)
.await?;
```

---

## 6. WebSocket (vil_ws)

```rust
use vil_server::core::websocket::*;

// Basic WebSocket handler
async fn ws_handler(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(|mut socket| async move {
        while let Some(Ok(Message::Text(text))) = socket.recv().await {
            socket.send(Message::Text(format!("echo: {}", text))).await.ok();
        }
    })
}

// Typed WebSocket Events (untuk builder presence, notifications)
#[derive(Clone, Debug, Serialize, Deserialize, VilWsEvent)]
#[ws_event(topic = "builder.presence")]
struct BuilderPresence {
    user_id: String,
    cursor_position: Option<CursorPos>,
    action: String,  // "joined", "left", "moved"
}

// WsHub for topic-based broadcast
let hub = WsHub::new();
let mut rx = hub.subscribe("builder.presence");
hub.broadcast("builder.presence", serde_json::to_string(&presence)?);
```

---

## 7. SSE Streaming (untuk AI Tutor)

```rust
use vil_server::core::sse::*;

// Simple SSE stream
async fn ai_chat_stream() -> impl IntoResponse {
    let stream = async_stream::stream! {
        for chunk in response_chunks {
            yield SseEvent::json(&json!({ "content": chunk }));
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
    };
    sse_stream(stream)
}

// SseCollect for proxying to Groq API
use vil_server::ai::sse_collect::SseCollect;

async fn tutor_chat(Json(req): Json<TutorRequest>) -> HandlerResult<VilResponse<TutorResponse>> {
    let content = SseCollect::post_to("https://api.groq.com/openai/v1/chat/completions")
        .dialect(SseDialect::openai())   // Handles [DONE] signal
        .bearer_token(groq_api_key)
        .body(json!({
            "model": "llama-3.3-70b",
            "messages": req.messages,
            "stream": true
        }))
        .collect_text().await
        .map_err(|e| VilError::internal(e.to_string()))?;
    Ok(VilResponse::ok(TutorResponse { content }))
}
```

---

## 8. Storage (vil_storage_s3)

```rust
// S3/MinIO storage
use vil_storage_s3::S3Client;

let s3 = S3Client::new(S3Config {
    endpoint: "http://minio:9000",
    access_key: "minioadmin",
    secret_key: "minioadmin",
    bucket: "edusync-files",
    region: "us-east-1",
});

// Upload
let url = s3.put_object("videos/lesson-1.mp4", data, "video/mp4").await?;

// Download
let data = s3.get_object("videos/lesson-1.mp4").await?;

// Presigned URL (for direct browser upload)
let url = s3.presigned_put("uploads/file.pdf", Duration::from_secs(3600)).await?;
```

---

## 9. Cron Jobs (vil_trigger_cron)

```rust
use vil_trigger_cron::CronScheduler;

let mut scheduler = CronScheduler::new();

// Email digest — daily 17:00 WIB (10:00 UTC)
scheduler.add("0 10 * * *", || async {
    send_email_digests(&db).await;
});

// Analytics refresh — every 15 min
scheduler.add("*/15 * * * *", || async {
    sqlx::query("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_teacher_analytics")
        .execute(&db).await.ok();
});

// Start scheduler
scheduler.start().await;
```

---

## 10. Observability (vil_log + vil_otel)

```rust
use vil_log::prelude::*;

// Semantic logging (4.5-6.2x faster than tracing)
vil_info!("User logged in", user_id = %user.id, tenant_id = %tenant_id);
vil_warn!("Rate limit approached", endpoint = "/api/v1/courses", remaining = 5);
vil_error!("Database query failed", error = %err, query = "get_auth_bootstrap");

// Auto-registered endpoints (no code needed):
// GET /health      — Kubernetes liveness probe
// GET /ready       — Kubernetes readiness probe
// GET /metrics     — Prometheus metrics (auto-instrumented per handler)
// GET /info        — Server info, SHM stats, handler count

// VIL Observer Dashboard (enable with .observer(true)):
// GET /_vil/dashboard/  — Live metrics, routes, SLO budget, topology
```

---

## 11. Testing

```rust
use vil_server_test::TestClient;

#[tokio::test]
async fn test_list_courses() {
    let app = build_test_app().await;
    let client = TestClient::new(app);

    let resp = client
        .get("/api/v1/courses")
        .header("Authorization", format!("Bearer {}", test_jwt))
        .await;

    resp.assert_ok();
    let courses: Vec<Course> = resp.json().await;
    assert!(!courses.is_empty());
}

#[tokio::test]
async fn test_tenant_isolation() {
    let client = TestClient::new(build_test_app().await);

    // Tenant A user cannot see Tenant B courses
    let resp = client
        .get("/api/v1/courses")
        .header("Authorization", format!("Bearer {}", tenant_a_jwt))
        .await;
    let courses: Vec<Course> = resp.json().await;
    assert!(courses.iter().all(|c| c.tenant_id == tenant_a_id));
}
```

---

## 12. Configuration Profiles

```yaml
# vil-server.yaml untuk EduSync
profile: prod # VIL_PROFILE=prod

server:
  name: edusync-api
  port: 8080 # VIL_SERVER_PORT
  host: '0.0.0.0'

database:
  postgres:
    url: 'postgres://edusync:pass@db:5432/edusync' # VIL_DATABASE_URL
    max_connections: 50

shm:
  pool_size: '256MB' # Production SHM pool

services:
  - name: auth
    visibility: public
    prefix: /api/v1/auth
  - name: courses
    visibility: public
    prefix: /api/v1
  - name: quizzes
    visibility: public
    prefix: /api/v1
  - name: ai
    visibility: public
    prefix: /api/v1/ai
  - name: grader
    visibility: internal # Only via Tri-Lane

mesh:
  routes:
    - from: quizzes
      to: grader
      lane: trigger
```

---

## 13. EduSync-Specific Gotchas (WAJIB BACA)

### SQL Gotchas

- `course_modules."order"` — WAJIB dikutip (SQL reserved word)
- `lessons."order"` — sama, WAJIB dikutip
- `quiz_questions.text` — kolom adalah `text`, BUKAN `question_text`
- `quiz_options.text` — kolom adalah `text`, BUKAN `option_text`
- `courses.status` = `'published'`, BUKAN `is_published` (kolom tidak ada)
- `courses.status` enum includes `'in_review'` dan `'approved'`
- `enrollments.user_id` — BUKAN `student_id`
- `student_lesson_signals`: gunakan `total_time_spent`, `last_accessed_at`, `latest_quiz_score`
- JANGAN `SELECT *` — selalu explicit columns

### Auth Gotchas

- Role datang dari `user_roles` table, BUKAN `profiles.role`
- `signOut()` harus clear localStorage keys: `activeTenantId`, `pendingInviteToken`, `pendingJoinCode`, `pendingInviteRetryCount`, `ai_tutor_session_*`
- OAuth callback di `/auth/callback` (PATH routing), BUKAN `/#/auth/callback` (hash routing)
- Frontend token refresh: setiap 60 detik check if expires dalam 5 menit
- `get_auth_bootstrap` RPC return: profile + memberships + default_tenant_id — ini paling kritis

### Multi-Tenant Gotchas

- Semua tabel WAJIB punya `tenant_id UUID NOT NULL`
- Supabase pakai `get_my_tenant_id()` SQL function — VIL pakai middleware `TenantGuard`
- Trigger `auto_set_tenant_id()` di Supabase — di VIL, set di application layer
- `course_collaborators` pakai `auto_set_tenant_id()` trigger, BUKAN `set_tenant_id_from_user()`

### Frontend Expectations

- API response error format: `{ code, message, details, hint }` (PostgREST compatible)
- `useAuth()` returns 25+ fields — VIL auth harus return format identik
- 5 roles: `student | teacher | admin | parent | principal`
- Semua teks UI dalam Bahasa Indonesia
- Hash routing: semua app URLs pakai `/#/` prefix

---

## 14. Cargo.toml Dependencies untuk EduSync

```toml
[workspace]
members = ["crates/*"]

[workspace.dependencies]
# VIL Framework
vil-server = "0.1"           # VilApp, ServiceProcess, VilResponse, VilError
vil-log = "0.1"              # Semantic logging
vil-storage-s3 = "0.1"      # S3/MinIO storage
vil-trigger-cron = "0.1"    # Cron scheduler

# Async runtime
tokio = { version = "1", features = ["full"] }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# Database
sqlx = { version = "0.8", features = ["runtime-tokio", "postgres", "uuid", "chrono", "migrate"] }

# Auth
jsonwebtoken = "9"           # JWT encode/decode
argon2 = "0.5"               # Password hashing (VIL standard)
bcrypt = "0.15"              # Supabase legacy password verification
totp-rs = "5"                # TOTP MFA
qrcode = "0.14"              # QR code generation for MFA
oauth2 = "4"                 # Google OAuth PKCE

# HTTP client (for Groq AI, WhatsApp, etc.)
reqwest = { version = "0.12", features = ["json", "stream"] }

# Email
lettre = "0.11"              # SMTP email sending

# PDF generation
printpdf = "0.7"             # Certificate PDF

# Utilities
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
rand = "0.8"
base64 = "0.22"
```

---

## 15. Referensi Docs VIL (untuk Agent yang Perlu Detail)

| Guide                             | URL                                               |
| --------------------------------- | ------------------------------------------------- |
| Server Framework Guide            | `docs/vil-server/vil-server-guide.md`             |
| API Reference                     | `docs/vil-server/API-REFERENCE-SERVER.md`         |
| Architecture Overview             | `docs/ARCHITECTURE_OVERVIEW.md`                   |
| Developer Guide (11 parts)        | `docs/vil/001-VIL-Developer_Guide-Overview.md`    |
| Custom Code (Native/WASM/Sidecar) | `docs/vil/011-VIL-Developer_Guide-Custom-Code.md` |
| LLM Knowledge Base                | `llm_knowledge/` folder                           |
| Config Reference                  | `vil-server.reference.yaml`                       |
| 112 Examples                      | `examples/` folder (8 tiers)                      |

**Untuk agent yang butuh contoh spesifik**, lihat:

- `examples/001-basic-hello-server/` — Minimal VilApp
- `examples/009-basic-usage-websocket-chat/` — WebSocket
- `examples/201-llm-simple-chat/` — AI LLM integration
- `examples/301-rag-vector-search/` — RAG
- `examples/401-agent-calculator/` — AI Agent with tools
- `examples/801-trigger-cron-basic/` — Cron jobs
