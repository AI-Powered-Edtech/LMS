# VIL_FOR_EDUSYNC — Panduan Framework VIL untuk EduSync

Dokumen ini berisi panduan lengkap penggunaan framework VIL untuk membangun backend EduSync LMS dalam bahasa Rust. Seluruh konten ditulis dalam Bahasa Indonesia.

---

## 1. Arsitektur VIL Overview

VIL (Village Internet Language) adalah process-oriented framework yang dibangun di atas Rust dan Axum. Berbeda dengan framework web konvensional yang berbasis request-response, VIL mengadopsi model process-oriented yang memungkinkan penanganan request dengan lebih efisien melalui shared memory dan SIMD serialization.

### 1.1 Komponen Utama

VIL terdiri dari beberapa komponen inti yang membentuk fondasi framework:

**VilApp** merupakan entry point utama untuk membangun aplikasi. Ia berfungsi sebagai process topology builder yang memungkinkan pendaftaran services, konfigurasi mesh, dan menjalankan server. VilApp menyediakan method seperti `.port()`, `.profile()`, `.state()`, `.service()`, `.mesh()`, dan `.run()` untuk mengkonfigurasi dan menjalankan aplikasi.

**ServiceProcess** merepresentasikan service sebagai process terpisah dengan endpoint registration, prefix, dan visibility. Visibility dapat berupa `Public` (exposed ke internet) atau `Internal` (hanya accessible via Tri-Lane). ServiceProcess memungkinkan grouping logical endpoints menjadi satu unit service.

**ServiceCtx** adalah process-aware context yang menyediakan akses ke shared state melalui method `.state::<T>()` dan kemampuan Tri-Lane messaging melalui method `.send()`. ServiceCtx memungkinkan service berkomunikasi satu sama lain dalam mesh.

**ShmSlice** adalah zero-copy request body handler yang menggunakan shared memory. Request body dapat langsung diakses sebagai JSON dengan method `.json::<T>()`. Pendekatan ini menghindari overhead copying data dari request ke memory.

**VilResponse** adalah response type yang menggunakan SIMD serialization untuk performa tinggi. VilResponse menyediakan method factory seperti `.ok(data)`, `.created(data)`, dan `.no_content()` untuk membangun response dengan cepat.

**VilError** adalah error type yang menyediakan method untuk berbagai HTTP error states: `.bad_request()`, `.unauthorized()`, `.internal()`, `.not_found()`, dan lain sebagainya.

**VxMeshConfig** adalah konfigurasi Tri-Lane routing yang memungkinkan inter-service messaging melalui tiga lane: Trigger (async fire-and-forget), Data (request-response), dan Control (high-priority control signals).

### 1.2 VIL Dibangun di Atas Axum

Penting untuk dipahami bahwa VIL dibangun di atas Axum. Semua Axum handler dan extractor tetap berfungsi dan dapat digunakan dalam project VIL. VIL menambahkan ShmSlice, ServiceCtx, dan VilResponse sebagai layer di atas Axum, sehingga developer dapat mix-and-match antara pendekatan Axum-native dan VIL-way sesuai kebutuhan.

---

## 2. VIL Handler Patterns

VIL menyediakan dua pattern untuk menulis handler: Pattern A (Axum-style) dan Pattern B (VIL Way). Keduanya dapat digunakan, namun untuk project EduSync yang baru melakukan migrasi dari Supabase/TypeScript, Pattern A lebih disarankan karena lebih mudah di-port.

### 2.1 Pattern A: Axum-Style (Disarankan untuk Migrasi Awal)

Pattern ini menggunakan extractor Axum standar yang familiar bagi developer yang berasal dari TypeScript/Deno. Tidak menggunakan zero-copy SHM, sehingga lebih mudah dipahami dan di-maintain.

```rust
use vil_server::prelude::*;

// State type yang di-share ke semua handlers
#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub jwt_secret: String,
    pub groq_api_key: Option<String>,
}

// Handler dengan Axum-style extractors
async fn handler(
    State(ctx): State<AppState>,       // Shared state dari VilApp
    Path(id): Path<String>,            // URL path parameters
    Query(params): Query<Params>,      // Query string parameters
    Json(body): Json<RequestBody>,     // JSON request body
) -> Result<Json<ResponseBody>, VilError> {
    // Business logic here
    // Akses database via ctx.db
    // Validasi input
    // Return Json response
    Ok(Json(data))
}
```

Pattern A sangat disarankan untuk fase awal migrasi karena beberapa keuntungan: lebih mudah di-port dari TypeScript karena hampir identik dengan pattern Deno/Axum, tidak memerlukan understanding mendalam tentang zero-copy, dan lebih familiar bagi developer baru di Rust.

### 2.2 Pattern B: VIL Way (Untuk Optimisasi Kemudian)

Pattern ini menggunakan zero-copy SHM dan VilResponse untuk performa maksimal. Disarankan untuk diterapkan setelah codebase stabil dan sudah familiar dengan VIL.

```rust
use vil_server::prelude::*;

async fn handler(
    ctx: ServiceCtx,                // VIL context dengan state + Tri-Lane
    body: ShmSlice,                 // Zero-copy request body
) -> Result<VilResponse<ResponseBody>, VilError> {
    // Get typed state dari context
    let store = ctx.state::<Arc<Store>>()?;

    // SIMD JSON parse dari shared memory
    let input: RequestBody = body.json()
        .map_err(|_| VilError::bad_request("invalid JSON"))?;

    // Business logic

    // SIMD serialize response
    Ok(VilResponse::ok(data))
}
```

Keuntungan Pattern B adalah zero-copy yang menghindari memory allocation untuk request body dan response serialization yang lebih cepat karena menggunakan SIMD. Namun, kompleksitasnya lebih tinggi dan memerlukan pemahaman yang lebih dalam tentang shared memory management di Rust.

### 2.3 Kapan Menggunakan Masing-Masing

Untuk fase migrasi awal dari Supabase ke VIL, gunakan Pattern A pada semua handler. Ini memungkinkan tim untuk fokus pada business logic dan porting dari TypeScript tanpa terkendala kompleksitas Rust-specific. Setelah semua endpoints ter-port dan funcionando, baru pertimbangkan untuk upgrade ke Pattern B untuk endpoint-endpoint yang high-traffic seperti quiz submission dan AI chat.

---

## 3. EduSync-Specific VilApp Setup

Bagian ini menjelaskan bagaimana mengkonfigurasi VilApp untuk EduSync LMS dengan services yang sesuai dengan arsitektur yang diperlukan.

### 3.1 Setup Dasar dan AppState

Langkah pertama adalah mendefinisikan AppState yang akan dishare ke semua services. AppState berisi resource yang diperlukan oleh semua handlers seperti database pool dan konfigurasi.

```rust
use vil_server::prelude::*;
use sqlx::postgres::PgPoolOptions;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub jwt_secret: String,
    pub groq_api_key: Option<String>,
    pub s3_config: Option<S3Config>,
}

#[tokio::main]
async fn main() {
    // 1. Database connection (Sama PostgreSQL seperti Supabase)
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
        s3_config: std::env::var("S3_ENDPOINT").ok().map(|_| S3Config {
            endpoint: std::env::var("S3_ENDPOINT").unwrap(),
            access_key: std::env::var("S3_ACCESS_KEY").unwrap(),
            secret_key: std::env::var("S3_SECRET_KEY").unwrap(),
            bucket: std::env::var("S3_BUCKET").unwrap(),
            region: "us-east-1".to_string(),
        }),
    };

    // ... service definitions dan run app
}
```

### 3.2 Service Definitions

Setiap domain dalam EduSync didaftarkan sebagai ServiceProcess terpisah dengan prefix endpoint yang sesuai.

**Auth Service** menangani semua endpoint authentication termasuk register, login, token refresh, signout, OAuth, dan MFA.

```rust
let auth = ServiceProcess::new("auth")
    .prefix("/api/v1/auth")
    .visibility(Visibility::Public)
    .endpoint(Method::POST, "/register", post(register_handler))
    .endpoint(Method::POST, "/login", post(login_handler))
    .endpoint(Method::POST, "/refresh", post(refresh_token_handler))
    .endpoint(Method::POST, "/signout", post(sign_out_handler))
    .endpoint(Method::GET, "/oauth/google", get(google_oauth_init_handler))
    .endpoint(Method::GET, "/callback/google", get(google_oauth_callback_handler))
    .endpoint(Method::POST, "/mfa/enroll", post(mfa_enroll_handler))
    .endpoint(Method::POST, "/mfa/verify", post(mfa_verify_handler));
```

**Courses Service** menangani CRUD untuk courses, modules, dan lessons.

```rust
let courses = ServiceProcess::new("courses")
    .prefix("/api/v1")
    .visibility(Visibility::Public)
    .endpoint(Method::GET, "/courses", get(list_courses_handler))
    .endpoint(Method::GET, "/courses/:id", get(get_course_handler))
    .endpoint(Method::POST, "/courses", post(create_course_handler))
    .endpoint(Method::PUT, "/courses/:id", put(update_course_handler))
    .endpoint(Method::DELETE, "/courses/:id", delete(delete_course_handler))
    .endpoint(Method::GET, "/courses/:id/modules", get(list_modules_handler))
    .endpoint(Method::POST, "/courses/:id/modules", post(create_module_handler));
```

**Quizzes Service** menangani quiz operations termasuk submission yang trigger grading.

```rust
let quizzes = ServiceProcess::new("quizzes")
    .prefix("/api/v1")
    .visibility(Visibility::Public)
    .endpoint(Method::GET, "/quizzes/:id", get(get_quiz_handler))
    .endpoint(Method::GET, "/quizzes/:id/questions", get(get_quiz_questions_handler))
    .endpoint(Method::POST, "/quizzes/:id/submit", post(submit_quiz_handler))
    .endpoint(Method::GET, "/quizzes/:id/attempts", get(list_attempts_handler))
    .endpoint(Method::GET, "/quizzes/:id/attempts/:attempt_id", get(get_attempt_handler));
```

**AI Service** menangani semua fitur AI termasuk essay grading, AI tutor chat, dan content generation.

```rust
let ai = ServiceProcess::new("ai")
    .prefix("/api/v1/ai")
    .visibility(Visibility::Public)
    .endpoint(Method::POST, "/grade-essay", post(grade_essay_handler))
    .endpoint(Method::POST, "/tutor/chat", post(tutor_chat_handler))
    .endpoint(Method::POST, "/generate-content", post(generate_content_handler));
```

**Grader Service** adalah internal service yang hanya accessible melalui Tri-Lane mesh, bukan melalui HTTP direct.

```rust
let grader = ServiceProcess::new("grader")
    .visibility(Visibility::Internal);  // Only accessible via Tri-Lane
```

### 3.3 Tri-Lane Mesh Configuration

Tri-Lane mesh memungkinkan asynchronous communication antar services. Ini sangat berguna untuk operations yang memerlukan processing waktu lama seperti quiz grading.

```rust
let mesh = VxMeshConfig::new()
    // Quiz submit triggers grading async
    .route("quizzes", "grader", VxLane::Trigger)
    // Grading results sent back to quizzes service
    .route("grader", "quizzes", VxLane::Data)
    // Optional: AI service trigger untuk essay grading
    .route("ai", "grader", VxLane::Trigger);
```

### 3.4 Menjalankan VilApp

Setelah mendefinisikan semua services dan mesh, aplikasi dapat dijalankan dengan konfigurasi yang sesuai.

```rust
VilApp::new("edusync-api")
    .port(8080)
    .profile("prod")        // prod profile: 50 DB conn, warn logging, 256MB SHM
    .state(state)           // Shared state untuk semua services
    .observer(true)         // Enable /_vil/dashboard/ untuk monitoring
    .service(auth)
    .service(courses)
    .service(quizzes)
    .service(ai)
    .service(grader)
    .mesh(mesh)
    .run()
    .await;
```

### 3.5 Profile Konfigurasi

VIL mendukung berbagai profile yang mengatur resource allocation dan logging level. Untuk production, gunakan profile "prod".

| Profile | Database Connections | Logging Level | SHM Pool |
| ------- | -------------------- | ------------- | -------- |
| dev     | 5                    | debug         | 64MB     |
| staging | 20                   | debug         | 128MB    |
| prod    | 50                   | warn          | 256MB    |

---

## 4. Referensi Tambahan

Dokumen ini merupakan ringkasan dari Agent Bootstrap Context yang lebih lengkap. Untuk referensi detail, lihat:

- **VIL Server Guide**: `docs/vil-server/vil-server-guide.md`
- **API Reference**: `docs/vil-server/API-REFERENCE-SERVER.md`
- **VIL Developer Guide**: `docs/vil/001-VIL-Developer_Guide-Overview.md`

Untuk contoh implementasi spesifik, lihat folder examples:

- `examples/001-basic-hello-server/` — Minimal VilApp
- `examples/009-basic-usage-websocket-chat/` — WebSocket implementation
- `examples/201-llm-simple-chat/` — AI LLM integration
- `examples/801-trigger-cron-basic/` — Cron jobs

---

## 5. Catatan Penting

Beberapa hal yang harus selalu diperhatikan saat menulis kode VIL untuk EduSync:

Selalu gunakan explicit columns dalam query SQL, tidak pernah SELECT star. Perhatikan reserved words SQL seperti "order" yang memerlukan quoted identifier. Untuk error response, gunakan format yang compatible dengan PostgrokREST yaitu code, message, details, hint. Dan yang paling penting, semua teks user-facing harus dalam Bahasa Indonesia.
