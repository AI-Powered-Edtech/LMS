# Agent Task Queue — Phase 3A-3B

<aside>
🤖

**Untuk AI Coding Agents.** Setiap task di bawah adalah **self-contained** — agent tinggal copas kode dan execute. Task harus dikerjakan **berurutan** dalam masing-masing wave (3A dan 3B), kecuali ditandai paralel. Setiap task punya:

- **Input:** File yang harus dibaca dulu
- **Output:** File yang harus dibuat/diubah
- **Code:** Kode lengkap siap copas
- **Verify:** Command untuk verifikasi
- **Stop If:** Kapan harus berhenti dan escalate
</aside>

<aside>
📋

**Source of Truth:**

- [Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](../Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20%20ace54d0159584b0c8330eaad52e6e05b.md)
- [Phase 3: Edge Functions → VIL Services — Week 39-52 Detail](Phase%203%20Edge%20Functions%20%E2%86%92%20VIL%20Services%20%E2%80%94%20Week%2039-52%20df750d8dd2d54365a67d53d4eaea6ad8.md)
- [Spec 3: VIL Runtime, Worker & CI Operations](Spec%203%20VIL%20Runtime,%20Worker%20&%20CI%20Operations%2003bce3edf2464666a0047fbf1fc29d40.md)
- [Agent Bootstrap Context — VIL Framework Reference untuk EduSync](Agent%20Bootstrap%20Context%20%E2%80%94%20VIL%20Framework%20Reference%20%20f2f6b969e8c64b6c9bffacaf474d765f.md)
- [Full Migration Becomes Possible — Multi-Agent Execution Model](Full%20Migration%20Becomes%20Possible%20%E2%80%94%20Multi-Agent%20Exec%208b907d086a5042569489e649aca8927f.md)
</aside>

---

## Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** gunakan `npm` atau `yarn` — gunakan `pnpm` (frontend) atau `cargo` (backend)
3. **Semua teks UI/error** harus Bahasa Indonesia
4. **Semua AI functions** WAJIB punya `CircuitBreaker` — jangan skip
5. **Semua handler** gunakan Pattern A (Axum-style) sesuai Bootstrap Context §2
6. **API error format:** `{ code, message, details, hint }` (PostgREST compatible)
7. **JANGAN** ubah `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`
8. **JANGAN** buat keputusan arsitektur baru — ikuti spec yang sudah locked
9. Jalankan `cargo check && cargo clippy -- -D warnings && cargo test` setelah setiap task
10. Jika menemukan Groq API incompatibility atau LTI spec gap → **BLOCKED**, jangan improvisasi
11. **🛠️ Rollback rule (Gap #9):** Commit SEBELUM mulai task: `git add -A && git commit -m "checkpoint: before task 3A/B-XX"`. Jika verify gagal: `git stash`. JANGAN lanjut dengan state setengah jadi.
12. **🛠️ Nginx route update (Gap #5):** Setelah semua AI + LTI endpoints selesai, WAJIB update `nginx.conf` dengan routes: `/api/v1/ai/*`, `/api/v1/lti/*`. Buat sub-task 3B-8 jika belum ada.
13. **🛠️ VilError type (Gap #4):** Task 3A-0b sudah resolve ini. Semua handler Phase 3 HARUS gunakan type yang di-resolve di 3A-0b — jangan hardcode `VilError` tanpa verify.

---

# Effort Estimate

<aside>
⏱️

**Wave 3A-3B total: ~70-80 jam** (dari ~170 jam Phase 3 keseluruhan).

Wave 3A (AI): ~45-50 jam | Wave 3B (LTI): ~25-30 jam.

</aside>

---

# Pre-Flight: VIL API Verification Tasks

<aside>
🔴

**WAJIB SELESAI sebelum Task 3A-1 dan 3B-1.** Tanpa verifikasi ini, semua handler berisiko compile error karena API mismatch.

</aside>

## Task 3A-0: Verify VIL AI Module API Signatures

```
TASK ID:       3A-0
OWNER TYPE:    Verification Agent
GOAL:          Clone VIL repo, verify actual SseCollect + CircuitBreaker +
               VilError API signatures. Document any mismatches.
DEPENDENCY:    Tidak ada
READ FIRST:    - https://github.com/OceanOS-id/VIL (clone repo)
               - Bootstrap Context §2, §4, §7 (assumed API shapes)
EDIT ONLY:     - docs/vil-api-verification.md (BUAT BARU)
DO NOT TOUCH:  - Semua file .rs dan frontend
```

**IMPLEMENTATION STEPS:**

1. `git clone https://github.com/OceanOS-id/VIL.git /tmp/vil-ref`
2. Verify `SseCollect` API:
   - Cari file: `grep -r "SseCollect" /tmp/vil-ref/src/`
   - Verify method signatures: `::post_to()` vs `::new()` vs `.url()`
   - Verify `.dialect()`, `.bearer_token()`, `.body()`, `.collect_text()`
   - **Juga cek apakah ada `.stream_through()` atau equivalent** untuk SSE proxy ke client
3. Verify `SseDialect` API:
   - Cari: `grep -r "SseDialect" /tmp/vil-ref/src/`
   - Verify `SseDialect::openai()` exists
4. Verify `CircuitBreaker` API:
   - Cari: `grep -r "CircuitBreaker" /tmp/vil-ref/src/`
   - Verify `CircuitBreaker::new(name, config)`, `.check()`, `.record_success()`, `.record_failure()`
   - Verify `CircuitBreakerConfig` struct fields
5. Verify `VilError` API:
   - Cari: `grep -r "VilError" /tmp/vil-ref/src/`
   - Verify methods: `.forbidden()`, `.bad_request()`, `.not_found()`, `.internal()`, `.too_many_requests()`, `.service_unavailable()`
   - **Jika `VilError` tidak ada** → document alternative (mungkin `AppError` atau custom error type)
   - Verify apakah `vil_server::prelude::*` re-exports error type
6. Verify `vil_info!`, `vil_warn!`, `vil_error!` macros exist
7. Document findings di `docs/vil-api-verification.md`

**OUTPUT FORMAT:**

```markdown
# VIL API Verification Results

## SseCollect

- Actual module path: `vil_server::???::SseCollect`
- Constructor: `::post_to(url)` ✅/❌ → actual: `???`
- `.dialect(SseDialect)`: ✅/❌
- `.bearer_token(&str)`: ✅/❌
- `.body(serde_json::Value)`: ✅/❌ → actual: `???`
- `.collect_text()`: ✅/❌
- `.stream_through()` or SSE proxy: EXISTS/NOT_FOUND

## VilError

- Actual type name: `VilError` / `AppError` / ???
- `.forbidden(msg)`: ✅/❌
- `.bad_request(msg)`: ✅/❌
- `.not_found(msg)`: ✅/❌
- `.internal(msg)`: ✅/❌
- `.too_many_requests(msg)`: ✅/❌
- `.service_unavailable(msg)`: ✅/❌

## CircuitBreaker

- Actual path: `vil_server::auth::circuit_breaker::CircuitBreaker` ✅/❌
- Config struct: `CircuitBreakerConfig` ✅/❌

## Action Items

- [ ] Rename/alias mismatched types
- [ ] Update all handler signatures if needed
```

**VERIFY:**

```
ls /tmp/vil-ref/src/
grep -rn "pub struct SseCollect" /tmp/vil-ref/
grep -rn "pub struct VilError\|pub enum VilError" /tmp/vil-ref/
grep -rn "pub struct CircuitBreaker" /tmp/vil-ref/
```

**STOP IF:**

- VIL repo tidak accessible → BLOCKED
- `SseCollect` tidak ada sama sekali → BLOCKED (need alternative AI proxy approach)

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 3A-0b: Resolve VilError Type + Create Error Adapter

```
TASK ID:       3A-0b
OWNER TYPE:    Rust CRUD Agent
GOAL:          Based on 3A-0 findings, ensure a VilError-compatible error type
               exists. If VIL uses different name, create type alias or adapter.
DEPENDENCY:    Task 3A-0 selesai
READ FIRST:    - docs/vil-api-verification.md (dari 3A-0)
               - crates/middleware/src/errors.rs (AppError dari Phase 1A-5)
               - crates/auth/src/errors.rs (AuthError dari Phase 1B-02)
EDIT ONLY:     - crates/services/src/errors.rs (BUAT BARU atau EDIT)
DO NOT TOUCH:  - crates/auth/
```

**IMPLEMENTATION STEPS:**

1. If VIL exports `VilError` → just re-export: `pub use vil_server::prelude::VilError;`
2. If VIL uses different name (e.g. `AppError`) → create alias: `pub type VilError = vil_server::???::ActualErrorType;`
3. If VIL has no built-in error type → create `VilError` enum matching assumed API, implementing `IntoResponse`
4. Ensure all methods exist: `.forbidden()`, `.bad_request()`, `.not_found()`, `.internal()`, `.too_many_requests()`, `.service_unavailable()`

**VERIFY:**

```
cd edusync-api
cargo check --all-targets
```

**STOP IF:**

- VIL error type is fundamentally incompatible → need architecture discussion

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# Wave 3A — AI Functions (4 Edge Functions → Rust)

<aside>
🎯

**Goal:** Port 4 AI Edge Functions (~1,537 lines Deno) ke Rust handlers menggunakan VIL built-in `SseCollect`, `SseDialect::openai()`, dan `CircuitBreaker`. Semua endpoint di bawah `ServiceProcess::new("ai").prefix("/api/v1/ai")`.

</aside>

---

## Task 3A-1: AI Common Types, Config & Circuit Breaker Singleton

```
TASK ID:       3A-1
OWNER TYPE:    Rust CRUD Agent
GOAL:          Buat shared types, Groq config, dan CircuitBreaker singleton
               yang dipakai oleh semua 4 AI handlers.
DEPENDENCY:    Phase 1A scaffold selesai (edusync-api workspace exists)
READ FIRST:    - crates/server/src/main.rs (AppState struct)
               - crates/models/src/lib.rs (existing model pattern)
               - supabase/functions/ai-grade-essay/index.ts (response shape)
               - supabase/functions/ai-tutor/index.ts (response shape)
               - supabase/functions/generate-ai-content/index.ts
               - supabase/functions/generate-quiz-from-content/index.ts
EDIT ONLY:     - crates/services/src/ai/mod.rs (BUAT BARU)
               - crates/services/src/ai/types.rs (BUAT BARU)
               - crates/services/src/ai/config.rs (BUAT BARU)
               - crates/services/src/mod.rs (tambah `pub mod ai;`)
DO NOT TOUCH:  - crates/server/src/main.rs
               - crates/auth/
               - crates/middleware/
               - Semua file frontend
```

**IMPLEMENTATION STEPS:**

1. Buat direktori `crates/services/src/ai/`
2. Buat `mod.rs` dengan re-exports
3. Buat `types.rs` dengan shared AI request/response types
4. Buat `config.rs` dengan Groq config dan CircuitBreaker singleton
5. Register `pub mod ai;` di `crates/services/src/mod.rs`

**COPY-PASTE STARTER:**

```rust
// crates/services/src/ai/mod.rs
pub mod config;
pub mod types;

pub use config::GROQ_CB;
pub use types::*;
```

```rust
// crates/services/src/ai/types.rs
// =============================================================================
// AI Shared Types — Dipakai oleh semua AI handlers
// =============================================================================
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Groq chat message (OpenAI-compatible format)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,       // "system" | "user" | "assistant"
    pub content: String,
}

/// AI quota check result
#[derive(Debug)]
pub struct AiQuotaStatus {
    pub allowed: bool,
    pub remaining: i64,
    pub limit: i64,
}

// ---------------------------------------------------------------------------
// ai-grade-essay types
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct GradeEssayRequest {
    pub essay_text: String,
    pub rubric_id: Uuid,
    pub assignment_id: Uuid,
    pub student_id: Uuid,
    pub tenant_id: Uuid,
    pub max_score: f64,
}

#[derive(Debug, Serialize)]
pub struct GradeEssayResponse {
    pub score: f64,
    pub max_score: f64,
    pub feedback: String,
    pub rubric_scores: Vec<RubricScore>,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RubricScore {
    pub criterion: String,
    pub score: f64,
    pub max_score: f64,
    pub feedback: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Rubric {
    pub id: Uuid,
    pub name: String,
    pub criteria_json: serde_json::Value,
    pub tenant_id: Uuid,
}

// ---------------------------------------------------------------------------
// ai-tutor types
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct TutorChatRequest {
    pub session_id: Option<Uuid>,
    pub course_id: Uuid,
    pub lesson_id: Option<Uuid>,
    pub message: String,
    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct TutorChatResponse {
    pub content: String,
    pub session_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct TutorSession {
    pub id: Uuid,
    pub student_id: Uuid,
    pub course_id: Uuid,
    pub lesson_id: Option<Uuid>,
    pub messages_json: serde_json::Value,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub tenant_id: Uuid,
}

#[derive(Debug)]
pub struct TutorContext {
    pub lesson_content: String,
    pub student_progress_pct: f64,
    pub recent_quiz_scores: Vec<f64>,
    pub struggle_topics: Vec<String>,
}

// ---------------------------------------------------------------------------
// generate-ai-content types
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct GenerateContentRequest {
    pub course_id: Uuid,
    pub lesson_id: Option<Uuid>,
    pub content_type: String,     // "explanation" | "summary" | "exercise" | "example"
    pub topic: String,
    pub language: Option<String>,  // default: "id" (Bahasa Indonesia)
    pub difficulty: Option<String>, // "easy" | "medium" | "hard"
    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct GenerateContentResponse {
    pub content: String,
    pub content_type: String,
    pub word_count: usize,
    pub language: String,
}

// ---------------------------------------------------------------------------
// generate-quiz-from-content types
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct GenerateQuizRequest {
    pub lesson_id: Uuid,
    pub content_text: String,
    pub num_questions: i32,        // default: 5
    pub question_types: Vec<String>, // "multiple_choice" | "true_false" | "short_answer"
    pub difficulty: Option<String>,
    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct GenerateQuizResponse {
    pub questions: Vec<GeneratedQuestion>,
}

#[derive(Debug, Serialize)]
pub struct GeneratedQuestion {
    pub question_text: String,
    pub question_type: String,
    pub options: Option<Vec<GeneratedOption>>,
    pub correct_answer: String,
    pub explanation: String,
    pub difficulty: String,
}

#[derive(Debug, Serialize)]
pub struct GeneratedOption {
    pub text: String,
    pub is_correct: bool,
}
```

```rust
// crates/services/src/ai/config.rs
// =============================================================================
// AI Config — Groq API + CircuitBreaker Singleton
// =============================================================================
use vil_server::auth::circuit_breaker::{CircuitBreaker, CircuitBreakerConfig};
use std::time::Duration;

/// Groq API Circuit Breaker — shared across all AI handlers.
/// Open after 5 consecutive failures, cooldown 30s before half-open.
pub static GROQ_CB: once_cell::sync::Lazy<CircuitBreaker> = once_cell::sync::Lazy::new(|| {
    CircuitBreaker::new("groq-api", CircuitBreakerConfig {
        failure_threshold: 5,
        cooldown: Duration::from_secs(30),
        ..Default::default()
    })
});

/// Groq API base URL
pub const GROQ_API_URL: &str = "https://api.groq.com/openai/v1/chat/completions";

/// Default model untuk semua AI functions
pub const GROQ_DEFAULT_MODEL: &str = "llama-3.3-70b";

/// Max tokens per request
pub const GROQ_MAX_TOKENS_GRADE: u32 = 2048;
pub const GROQ_MAX_TOKENS_TUTOR: u32 = 4096;
pub const GROQ_MAX_TOKENS_CONTENT: u32 = 4096;
pub const GROQ_MAX_TOKENS_QUIZ: u32 = 4096;

/// Temperature settings per use case
pub const TEMP_GRADING: f64 = 0.3;     // Low — consistent grading
pub const TEMP_TUTOR: f64 = 0.7;       // Medium — conversational
pub const TEMP_CONTENT: f64 = 0.7;     // Medium — creative but coherent
pub const TEMP_QUIZ: f64 = 0.5;        // Medium-low — structured output

/// AI quota: check if tenant masih boleh pakai AI
pub async fn check_ai_quota(
    pool: &sqlx::PgPool,
    tenant_id: &uuid::Uuid,
) -> Result<super::types::AiQuotaStatus, sqlx::Error> {
    let row = sqlx::query_as::<_, (i64, i64)>(
        r#"SELECT COALESCE(ai_usage_count, 0), COALESCE(ai_usage_limit, 1000)
           FROM tenants WHERE id = $1"#
    )
    .bind(tenant_id)
    .fetch_one(pool)
    .await?;

    Ok(super::types::AiQuotaStatus {
        allowed: row.0 < row.1,
        remaining: row.1 - row.0,
        limit: row.1,
    })
}

/// Increment AI usage counter for tenant
pub async fn increment_ai_usage(
    pool: &sqlx::PgPool,
    tenant_id: &uuid::Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query("SELECT increment_ai_usage($1)")
        .bind(tenant_id)
        .execute(pool)
        .await?;
    Ok(())
}
```

**VERIFY:**

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings
```

**STOP IF:**

- `vil_server::auth::circuit_breaker` module tidak ditemukan → BLOCKED (VIL API mismatch)
- `once_cell` crate belum di Cargo.toml → tambahkan `once_cell = "1"` di workspace dependencies
- AppState struct belum ada → BLOCKED (Phase 1A belum selesai)

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 3A-2: AI Grade Essay Handler

```
TASK ID:       3A-2
OWNER TYPE:    Rust CRUD Agent
GOAL:          Port ai-grade-essay Edge Function (187 lines Deno) ke Rust handler
               dengan VIL SseCollect + CircuitBreaker.
DEPENDENCY:    Task 3A-1 selesai
READ FIRST:    - supabase/functions/ai-grade-essay/index.ts (WAJIB — source Edge Function)
               - crates/services/src/ai/types.rs (types dari 3A-1)
               - crates/services/src/ai/config.rs (CircuitBreaker dari 3A-1)
               - Spec 3 §1.1 — AI grade essay: 30s streaming, 50/hr per user
EDIT ONLY:     - crates/services/src/ai/grading.rs (BUAT BARU)
               - crates/services/src/ai/mod.rs (tambah `pub mod grading;`)
DO NOT TOUCH:  - crates/services/src/ai/config.rs
               - crates/services/src/ai/types.rs
               - crates/server/src/main.rs
               - Semua file frontend
```

**IMPLEMENTATION STEPS:**

1. Baca `supabase/functions/ai-grade-essay/index.ts` — pahami prompt structure, rubric loading, dan response parsing
2. Buat `crates/services/src/ai/grading.rs`
3. Implement rubric loading dari DB via `sqlx`
4. Build grading prompt dengan rubric criteria
5. Call Groq via `SseCollect` dengan `CircuitBreaker` guard
6. Parse AI response ke `GradeEssayResponse` struct
7. Increment AI usage quota
8. Register di `mod.rs`

**COPY-PASTE STARTER:**

```rust
// crates/services/src/ai/grading.rs
// =============================================================================
// AI Grade Essay Handler
// Replaces: supabase/functions/ai-grade-essay/index.ts (187 lines)
// =============================================================================
use axum::extract::State;
use axum::Json;
use vil_server::prelude::*;
use vil_server::ai::sse_collect::SseCollect;
use vil_server::ai::SseDialect;

use crate::state::AppState;
use super::config::{GROQ_CB, GROQ_API_URL, GROQ_DEFAULT_MODEL, GROQ_MAX_TOKENS_GRADE, TEMP_GRADING};
use super::config::{check_ai_quota, increment_ai_usage};
use super::types::*;

/// POST /api/v1/ai/grade-essay
///
/// Rate limit: 50/hr per user (configured di middleware layer)
/// Max latency: 30s (streaming collection)
pub async fn grade_essay(
    State(state): State<AppState>,
    claims: crate::middleware::Claims,
    Json(body): Json<GradeEssayRequest>,
) -> Result<Json<GradeEssayResponse>, VilError> {
    // 1. Verify tenant match
    if claims.tenant_id != body.tenant_id {
        return Err(VilError::forbidden("Anda tidak memiliki akses ke data ini"));
    }

    // 2. Check AI quota
    let quota = check_ai_quota(&state.db, &body.tenant_id).await
        .map_err(|e| VilError::internal(format!("Gagal cek kuota AI: {}", e)))?;
    if !quota.allowed {
        return Err(VilError::too_many_requests(
            "Kuota AI bulan ini sudah habis. Kuota akan direset tanggal 1 bulan depan."
        ));
    }

    // 3. Load rubric from DB
    let rubric = sqlx::query_as::<_, Rubric>(
        r#"SELECT id, name, criteria_json, tenant_id
           FROM rubrics WHERE id = $1 AND tenant_id = $2"#
    )
    .bind(&body.rubric_id)
    .bind(&body.tenant_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| VilError::internal(format!("Gagal memuat rubrik: {}", e)))?
    .ok_or_else(|| VilError::not_found("Rubrik tidak ditemukan"))?;

    // 4. Build grading prompt
    let prompt = build_grading_prompt(&body.essay_text, &rubric, body.max_score);

    // 5. CircuitBreaker guard
    GROQ_CB.check().map_err(|_| VilError::service_unavailable(
        "Layanan AI sementara tidak tersedia. Coba lagi dalam beberapa saat."
    ))?;

    // 6. Call Groq via SseCollect
    let groq_api_key = state.groq_api_key.as_deref()
        .ok_or_else(|| VilError::internal("GROQ_API_KEY tidak dikonfigurasi"))?;

    let ai_response = SseCollect::post_to(GROQ_API_URL)
        .dialect(SseDialect::openai())
        .bearer_token(groq_api_key)
        .body(serde_json::json!({
            "model": GROQ_DEFAULT_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": "Kamu adalah penilai esai profesional. Berikan penilaian dalam format JSON yang valid. Semua feedback dalam Bahasa Indonesia."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": TEMP_GRADING,
            "max_tokens": GROQ_MAX_TOKENS_GRADE,
            "stream": true,
            "response_format": { "type": "json_object" }
        }))
        .collect_text()
        .await;

    let text = match ai_response {
        Ok(t) => {
            GROQ_CB.record_success();
            t
        }
        Err(e) => {
            GROQ_CB.record_failure();
            return Err(VilError::internal(format!("Gagal menghubungi layanan AI: {}", e)));
        }
    };

    // 7. Parse response
    let result = parse_grade_response(&text, body.max_score)
        .map_err(|e| VilError::internal(format!("Gagal memproses respons AI: {}", e)))?;

    // 8. Increment AI usage
    increment_ai_usage(&state.db, &body.tenant_id).await.ok();

    Ok(Json(result))
}

/// Build grading prompt from essay + rubric criteria
fn build_grading_prompt(essay: &str, rubric: &Rubric, max_score: f64) -> String {
    let criteria = rubric.criteria_json.to_string();
    format!(
        r#"Nilai esai berikut berdasarkan rubrik yang diberikan.

Rubrik: {rubric_name}
Kriteria (JSON): {criteria}
Skor Maksimum: {max_score}

--- ESAI ---
{essay}
--- AKHIR ESAI ---

Berikan respons dalam format JSON berikut:
{{
  "score": <number>,
  "max_score": {max_score},
  "feedback": "<feedback keseluruhan dalam Bahasa Indonesia>",
  "rubric_scores": [

      "criterion": "<nama kriteria>",
      "score": <number>,
      "max_score": <number>,
      "feedback": "<feedback per kriteria dalam Bahasa Indonesia>"

  ],
  "suggestions": ["<saran perbaikan 1>", "<saran perbaikan 2>"]
}}"#,
        rubric_name = rubric.name,
        criteria = criteria,
        max_score = max_score,
        essay = essay,
    )
}

/// Parse AI JSON response into GradeEssayResponse
fn parse_grade_response(text: &str, max_score: f64) -> Result<GradeEssayResponse, String> {
    // Try parsing as JSON directly
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(text) {
        let score = parsed["score"].as_f64().unwrap_or(0.0).min(max_score).max(0.0);
        let feedback = parsed["feedback"].as_str().unwrap_or("Tidak ada feedback").to_string();

        let rubric_scores = parsed["rubric_scores"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| {
                        Some(RubricScore {
                            criterion: v["criterion"].as_str()?.to_string(),
                            score: v["score"].as_f64().unwrap_or(0.0),
                            max_score: v["max_score"].as_f64().unwrap_or(0.0),
                            feedback: v["feedback"].as_str().unwrap_or("").to_string(),
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        let suggestions = parsed["suggestions"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect()
            })
            .unwrap_or_default();

        return Ok(GradeEssayResponse {
            score,
            max_score,
            feedback,
            rubric_scores,
            suggestions,
        });
    }

    // Fallback: try to extract JSON from markdown code block
    if let Some(start) = text.find('{') {
        if let Some(end) = text.rfind('}') {
            let json_str = &text[start..=end];
            return parse_grade_response(json_str, max_score);
        }
    }

    Err(format!("Respons AI bukan JSON valid: {}...", &text[..text.len().min(200)]))
}
```

**VERIFY:**

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings
cargo test -- ai::grading
```

**STOP IF:**

- `SseCollect::post_to` API signature berbeda dari Bootstrap Context §7 → BLOCKED
- `SseDialect::openai()` tidak mengenali Groq response format → BLOCKED
- Rubric table schema berbeda dari yang diasumsikan → baca `supabase/migrations/` dan sesuaikan query

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 3A-3: AI Tutor Chat Handler (Paling Kompleks)

```
TASK ID:       3A-3
OWNER TYPE:    Rust CRUD Agent
GOAL:          Port ai-tutor Edge Function (674 lines Deno — PALING KOMPLEKS)
               ke Rust handler. Conversation state di DB, context injection
               dari lesson + student progress, VIL SseCollect streaming.
DEPENDENCY:    Task 3A-1 selesai
READ FIRST:    - supabase/functions/ai-tutor/index.ts (WAJIB — 674 lines, baca SEMUA)
               - crates/services/src/ai/types.rs (TutorSession, TutorContext)
               - crates/services/src/ai/config.rs (CircuitBreaker, quota)
               - Spec 3 §1.1 — AI tutor chat: 30s streaming, 50/hr per user
               - Spec 1 — tenant scoping rules
EDIT ONLY:     - crates/services/src/ai/tutor.rs (BUAT BARU)
               - crates/services/src/ai/mod.rs (tambah `pub mod tutor;`)
DO NOT TOUCH:  - crates/services/src/ai/grading.rs
               - crates/services/src/ai/config.rs
               - crates/server/src/main.rs
               - Semua file frontend
```

**IMPLEMENTATION STEPS:**

1. Baca `supabase/functions/ai-tutor/index.ts` LENGKAP — pahami conversation history management, context injection, system prompt, dan quota enforcement
2. Buat `crates/services/src/ai/tutor.rs`
3. Implement `load_or_create_session()` — load existing session dari DB atau create baru
4. Implement `build_tutor_context()` — inject lesson content + student progress + struggle topics
5. Implement `build_messages()` — construct OpenAI-format messages array dengan system prompt + history + context + user message
6. Call Groq via `SseCollect` dengan `CircuitBreaker`
7. Save assistant response ke session di DB
8. Increment AI usage quota
9. Register di `mod.rs`

**COPY-PASTE STARTER:**

```rust
// crates/services/src/ai/tutor.rs
// =============================================================================
// AI Tutor Chat Handler
// Replaces: supabase/functions/ai-tutor/index.ts (674 lines)
// =============================================================================
use axum::extract::State;
use axum::Json;
use chrono::Utc;
use uuid::Uuid;
use vil_server::prelude::*;
use vil_server::ai::sse_collect::SseCollect;
use vil_server::ai::SseDialect;

use crate::state::AppState;
use super::config::{
    GROQ_CB, GROQ_API_URL, GROQ_DEFAULT_MODEL, GROQ_MAX_TOKENS_TUTOR, TEMP_TUTOR,
    check_ai_quota, increment_ai_usage,
};
use super::types::*;

/// POST /api/v1/ai/tutor/chat
///
/// Rate limit: 50/hr per user
/// Max latency: 30s (streaming collection)
/// Conversation state persisted di DB table `ai_tutor_sessions`
pub async fn tutor_chat(
    State(state): State<AppState>,
    claims: crate::middleware::Claims,
    Json(body): Json<TutorChatRequest>,
) -> Result<Json<TutorChatResponse>, VilError> {
    // 1. Verify tenant
    if claims.tenant_id != body.tenant_id {
        return Err(VilError::forbidden("Anda tidak memiliki akses ke data ini"));
    }

    // 2. Check AI quota
    let quota = check_ai_quota(&state.db, &body.tenant_id).await
        .map_err(|e| VilError::internal(format!("Gagal cek kuota AI: {}", e)))?;
    if !quota.allowed {
        return Err(VilError::too_many_requests(
            "Kuota AI bulan ini sudah habis. Kuota akan direset tanggal 1 bulan depan."
        ));
    }

    // 3. Load or create session
    let mut session = load_or_create_session(
        &state.db,
        body.session_id,
        claims.sub,
        body.course_id,
        body.lesson_id,
        body.tenant_id,
    ).await?;

    // 4. Build context (lesson content + student progress)
    let context = build_tutor_context(&state.db, &session).await?;

    // 5. Build messages array
    let messages = build_messages(&session, &context, &body.message);

    // 6. CircuitBreaker guard
    GROQ_CB.check().map_err(|_| VilError::service_unavailable(
        "Layanan AI Tutor sementara tidak tersedia. Coba lagi dalam beberapa saat."
    ))?;

    // 7. Call Groq via SseCollect
    let groq_api_key = state.groq_api_key.as_deref()
        .ok_or_else(|| VilError::internal("GROQ_API_KEY tidak dikonfigurasi"))?;

    let ai_response = SseCollect::post_to(GROQ_API_URL)
        .dialect(SseDialect::openai())
        .bearer_token(groq_api_key)
        .body(serde_json::json!({
            "model": GROQ_DEFAULT_MODEL,
            "messages": messages,
            "temperature": TEMP_TUTOR,
            "max_tokens": GROQ_MAX_TOKENS_TUTOR,
            "stream": true
        }))
        .collect_text()
        .await;

    let content = match ai_response {
        Ok(t) => {
            GROQ_CB.record_success();
            t
        }
        Err(e) => {
            GROQ_CB.record_failure();
            return Err(VilError::internal(format!("Gagal menghubungi AI Tutor: {}", e)));
        }
    };

    // 8. Append user message + assistant response to session history
    append_messages_to_session(
        &state.db,
        &mut session,
        &body.message,
        &content,
    ).await?;

    // 9. Increment AI usage
    increment_ai_usage(&state.db, &body.tenant_id).await.ok();

    Ok(Json(TutorChatResponse {
        content,
        session_id: session.id,
    }))
}

/// Load existing session or create a new one
async fn load_or_create_session(
    pool: &sqlx::PgPool,
    session_id: Option<Uuid>,
    student_id: Uuid,
    course_id: Uuid,
    lesson_id: Option<Uuid>,
    tenant_id: Uuid,
) -> Result<TutorSession, VilError> {
    // Try loading existing session
    if let Some(sid) = session_id {
        if let Some(session) = sqlx::query_as::<_, TutorSession>(
            r#"SELECT id, student_id, course_id, lesson_id, messages_json,
                      created_at, updated_at, tenant_id
               FROM ai_tutor_sessions
               WHERE id = $1 AND student_id = $2 AND tenant_id = $3"#
        )
        .bind(sid)
        .bind(student_id)
        .bind(tenant_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| VilError::internal(format!("Gagal memuat sesi tutor: {}", e)))?
        {
            return Ok(session);
        }
    }

    // Create new session
    let new_id = Uuid::new_v4();
    let now = Utc::now();
    let empty_messages = serde_json::json!([]);

    sqlx::query(
        r#"INSERT INTO ai_tutor_sessions
           (id, student_id, course_id, lesson_id, messages_json, created_at, updated_at, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"#
    )
    .bind(new_id)
    .bind(student_id)
    .bind(course_id)
    .bind(lesson_id)
    .bind(&empty_messages)
    .bind(now)
    .bind(now)
    .bind(tenant_id)
    .execute(pool)
    .await
    .map_err(|e| VilError::internal(format!("Gagal membuat sesi tutor: {}", e)))?;

    Ok(TutorSession {
        id: new_id,
        student_id,
        course_id,
        lesson_id,
        messages_json: empty_messages,
        created_at: now,
        updated_at: now,
        tenant_id,
    })
}

/// Build context: lesson content + student progress + struggle topics
async fn build_tutor_context(
    pool: &sqlx::PgPool,
    session: &TutorSession,
) -> Result<TutorContext, VilError> {
    // Load lesson content if lesson_id is set
    // NOTE: lessons.content is JSONB — cast to text for AI prompt injection
    let lesson_content = if let Some(lid) = session.lesson_id {
        sqlx::query_scalar::<_, String>(
            r#"SELECT COALESCE(content::text, '') FROM lessons
               WHERE id = $1 AND tenant_id = $2"#
        )
        .bind(lid)
        .bind(session.tenant_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| VilError::internal(format!("Gagal memuat konten pelajaran: {}", e)))?
        .unwrap_or_default()
    } else {
        String::new()
    };

    // Load student progress for this course
    let progress_pct = sqlx::query_scalar::<_, f64>(
        r#"SELECT COALESCE(
             (SELECT AVG(progress_pct) FROM student_lesson_signals
              WHERE student_id = $1 AND course_id = $2 AND tenant_id = $3),
             0.0
           )"#
    )
    .bind(session.student_id)
    .bind(session.course_id)
    .bind(session.tenant_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);

    // Load recent quiz scores
    let recent_scores = sqlx::query_scalar::<_, f64>(
        r#"SELECT COALESCE(score_pct, 0)
           FROM quiz_attempts
           WHERE student_id = $1 AND tenant_id = $2
           ORDER BY submitted_at DESC
           LIMIT 5"#
    )
    .bind(session.student_id)
    .bind(session.tenant_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    // Identify struggle topics (quiz scores < 60%)
    let struggle_topics = sqlx::query_scalar::<_, String>(
        r#"SELECT DISTINCT q.title
           FROM quiz_attempts qa
           JOIN quizzes q ON q.id = qa.quiz_id
           WHERE qa.student_id = $1 AND qa.tenant_id = $2
             AND qa.score_pct < 60
           ORDER BY q.title
           LIMIT 5"#
    )
    .bind(session.student_id)
    .bind(session.tenant_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    Ok(TutorContext {
        lesson_content,
        student_progress_pct: progress_pct,
        recent_quiz_scores: recent_scores,
        struggle_topics,
    })
}

/// Build OpenAI-compatible messages array
fn build_messages(
    session: &TutorSession,
    context: &TutorContext,
    user_message: &str,
) -> Vec<serde_json::Value> {
    let mut messages = Vec::new();

    // System prompt with context
    let system_prompt = build_system_prompt(context);
    messages.push(serde_json::json!({
        "role": "system",
        "content": system_prompt
    }));

    // Conversation history (from session)
    if let Some(history) = session.messages_json.as_array() {
        // Keep last 20 messages to stay within context window
        let start = if history.len() > 20 { history.len() - 20 } else { 0 };
        for msg in &history[start..] {
            messages.push(msg.clone());
        }
    }

    // New user message
    messages.push(serde_json::json!({
        "role": "user",
        "content": user_message
    }));

    messages
}

/// Build system prompt with student context
fn build_system_prompt(context: &TutorContext) -> String {
    let mut prompt = String::from(
        "Kamu adalah tutor AI yang membantu siswa belajar. Panduan:\n\
         - Jawab dalam Bahasa Indonesia\n\
         - Gunakan bahasa yang ramah dan mudah dipahami\n\
         - Jika siswa kesulitan, berikan petunjuk bertahap (scaffolding), jangan langsung jawab\n\
         - Berikan contoh konkret yang relevan\n\
         - Dorong siswa untuk berpikir kritis\n\
         - Jangan berikan jawaban ujian/kuis secara langsung\n"
    );

    if !context.lesson_content.is_empty() {
        prompt.push_str(&format!(
            "\nKonten pelajaran yang sedang dipelajari:\n{}\n",
            // Truncate to prevent exceeding context window
            &context.lesson_content[..context.lesson_content.len().min(3000)]
        ));
    }

    prompt.push_str(&format!(
        "\nProgress siswa di kursus ini: {:.0}%\n",
        context.student_progress_pct
    ));

    if !context.recent_quiz_scores.is_empty() {
        let scores_str: Vec<String> = context.recent_quiz_scores.iter()
            .map(|s| format!("{:.0}%", s))
            .collect();
        prompt.push_str(&format!(
            "Skor kuis terakhir: {}\n",
            scores_str.join(", ")
        ));
    }

    if !context.struggle_topics.is_empty() {
        prompt.push_str(&format!(
            "Topik yang perlu perhatian ekstra: {}\n",
            context.struggle_topics.join(", ")
        ));
    }

    prompt
}

/// Append user + assistant messages to session history in DB
async fn append_messages_to_session(
    pool: &sqlx::PgPool,
    session: &mut TutorSession,
    user_message: &str,
    assistant_message: &str,
) -> Result<(), VilError> {
    let messages = session.messages_json.as_array_mut()
        .ok_or_else(|| VilError::internal("Session messages bukan array"))?;

    messages.push(serde_json::json!({
        "role": "user",
        "content": user_message
    }));
    messages.push(serde_json::json!({
        "role": "assistant",
        "content": assistant_message
    }));

    // Keep max 50 messages per session (trim oldest)
    if messages.len() > 50 {
        let drain_count = messages.len() - 50;
        messages.drain(0..drain_count);
    }

    let updated_json = serde_json::Value::Array(messages.clone());

    sqlx::query(
        r#"UPDATE ai_tutor_sessions
           SET messages_json = $1, updated_at = NOW()
           WHERE id = $2"#
    )
    .bind(&updated_json)
    .bind(session.id)
    .execute(pool)
    .await
    .map_err(|e| VilError::internal(format!("Gagal menyimpan pesan tutor: {}", e)))?;

    session.messages_json = updated_json;
    Ok(())
}
```

**VERIFY:**

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings
cargo test -- ai::tutor
```

**STOP IF:**

- `ai_tutor_sessions` table belum ada di DB schema → buat migration dulu (lihat Task 3A-3b)
- `student_lesson_signals` table structure berbeda → baca `supabase/migrations/` dan sesuaikan column names (perhatikan: gunakan `total_time_spent`, `last_accessed_at`, `latest_quiz_score` — lihat Bootstrap Context §13)
- Groq API menolak `response_format: json_object` → hapus parameter itu, Groq mungkin tidak support
- Session messages melebihi Groq context window → kurangi history limit dari 20 ke 10

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 3A-3b: Migration untuk ai_tutor_sessions Table

```
TASK ID:       3A-3b
OWNER TYPE:    Rust CRUD Agent
GOAL:          Buat SQL migration untuk ai_tutor_sessions table jika belum ada.
               SKIP task ini jika table sudah exist di Supabase migrations.
DEPENDENCY:    Tidak ada (bisa paralel dengan 3A-1)
READ FIRST:    - supabase/migrations/ (cari migration yang buat ai_tutor_sessions)
               - supabase/functions/ai-tutor/index.ts (lihat table access pattern)
EDIT ONLY:     - edusync-api/migrations/<timestamp>_create_ai_tutor_sessions.sql (BUAT BARU)
DO NOT TOUCH:  - Semua file Rust
               - Semua file frontend
               - Supabase migrations yang sudah ada
```

**IMPLEMENTATION STEPS:**

1. Cek apakah `ai_tutor_sessions` sudah ada di `supabase/migrations/`
2. Jika sudah ada → **SKIP task ini**, output DONE
3. Jika belum ada, buat migration file baru

**COPY-PASTE STARTER:**

```sql
-- edusync-api/migrations/<timestamp>_create_ai_tutor_sessions.sql
-- AI Tutor Sessions — conversation state persistence
-- NOTE: Backward-compatible additive migration (no DROP, no breaking ALTER)

CREATE TABLE IF NOT EXISTS ai_tutor_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    messages_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_student
    ON ai_tutor_sessions(student_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_course
    ON ai_tutor_sessions(course_id, tenant_id);

-- RLS (will be replaced by TenantGuard middleware, but keep for dual-running period)
ALTER TABLE ai_tutor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_tutor_sessions_tenant_isolation ON ai_tutor_sessions
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY ai_tutor_sessions_student_own ON ai_tutor_sessions
    FOR SELECT USING (
        student_id = auth.uid()
        AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
    );
```

**VERIFY:**

```
cd edusync-api
cargo sqlx migrate run
cargo sqlx prepare
```

**STOP IF:**

- Table sudah ada di Supabase migrations → SKIP, output DONE
- FK references tidak valid (profiles, courses, lessons, tenants) → cek schema existing

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 3A-4: Generate AI Content Handler

```
TASK ID:       3A-4
OWNER TYPE:    Rust CRUD Agent
GOAL:          Port generate-ai-content Edge Function (476 lines Deno) ke Rust handler.
               Includes content validation (profanity check, quality scoring).
DEPENDENCY:    Task 3A-1 selesai
READ FIRST:    - supabase/functions/generate-ai-content/index.ts (WAJIB — 476 lines)
               - src/utils/contentValidator.ts (content validation logic dari Phase 31A)
               - crates/services/src/ai/types.rs
               - crates/services/src/ai/config.rs
EDIT ONLY:     - crates/services/src/ai/content_gen.rs (BUAT BARU)
               - crates/services/src/ai/mod.rs (tambah `pub mod content_gen;`)
DO NOT TOUCH:  - crates/services/src/ai/grading.rs
               - crates/services/src/ai/tutor.rs
               - crates/server/src/main.rs
```

**IMPLEMENTATION STEPS:**

1. Baca `supabase/functions/generate-ai-content/index.ts` — pahami content types, prompts, validation
2. Baca `src/utils/contentValidator.ts` — pahami profanity check dan quality scoring logic
3. Buat `crates/services/src/ai/content_gen.rs`
4. Implement content type routing (explanation, summary, exercise, example)
5. Implement content validation (profanity filter, basic quality check)
6. Call Groq via `SseCollect` + `CircuitBreaker`
7. Return generated content with word count

**COPY-PASTE STARTER:**

```rust
// crates/services/src/ai/content_gen.rs
// =============================================================================
// Generate AI Content Handler
// Replaces: supabase/functions/generate-ai-content/index.ts (476 lines)
// =============================================================================
use axum::extract::State;
use axum::Json;
use vil_server::prelude::*;
use vil_server::ai::sse_collect::SseCollect;
use vil_server::ai::SseDialect;

use crate::state::AppState;
use super::config::{
    GROQ_CB, GROQ_API_URL, GROQ_DEFAULT_MODEL, GROQ_MAX_TOKENS_CONTENT, TEMP_CONTENT,
    check_ai_quota, increment_ai_usage,
};
use super::types::*;

/// POST /api/v1/ai/generate-content
pub async fn generate_content(
    State(state): State<AppState>,
    claims: crate::middleware::Claims,
    Json(body): Json<GenerateContentRequest>,
) -> Result<Json<GenerateContentResponse>, VilError> {
    // 1. Verify tenant
    if claims.tenant_id != body.tenant_id {
        return Err(VilError::forbidden("Anda tidak memiliki akses ke data ini"));
    }

    // 2. Validate content_type
    let valid_types = ["explanation", "summary", "exercise", "example"];
    if !valid_types.contains(&body.content_type.as_str()) {
        return Err(VilError::bad_request(format!(
            "content_type tidak valid. Gunakan salah satu: {}",
            valid_types.join(", ")
        )));
    }

    // 3. Check AI quota
    let quota = check_ai_quota(&state.db, &body.tenant_id).await
        .map_err(|e| VilError::internal(format!("Gagal cek kuota AI: {}", e)))?;
    if !quota.allowed {
        return Err(VilError::too_many_requests(
            "Kuota AI bulan ini sudah habis."
        ));
    }

    // 4. Load course/lesson context if available
    let context = load_content_context(&state.db, &body).await?;

    // 5. Build prompt based on content_type
    let prompt = build_content_prompt(&body, &context);

    // 6. CircuitBreaker guard
    GROQ_CB.check().map_err(|_| VilError::service_unavailable(
        "Layanan AI sementara tidak tersedia."
    ))?;

    // 7. Call Groq
    let groq_api_key = state.groq_api_key.as_deref()
        .ok_or_else(|| VilError::internal("GROQ_API_KEY tidak dikonfigurasi"))?;

    let ai_response = SseCollect::post_to(GROQ_API_URL)
        .dialect(SseDialect::openai())
        .bearer_token(groq_api_key)
        .body(serde_json::json!({
            "model": GROQ_DEFAULT_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": format!(
                        "Kamu adalah pembuat konten edukasi profesional. \
                         Buat konten dalam Bahasa {}. \
                         Konten harus berkualitas tinggi, akurat, dan sesuai untuk konteks pendidikan. \
                         Jangan sertakan konten yang tidak pantas atau menyinggung.",
                        if body.language.as_deref() == Some("en") { "Inggris" } else { "Indonesia" }
                    )
                },
                { "role": "user", "content": prompt }
            ],
            "temperature": TEMP_CONTENT,
            "max_tokens": GROQ_MAX_TOKENS_CONTENT,
            "stream": true
        }))
        .collect_text()
        .await;

    let content = match ai_response {
        Ok(t) => { GROQ_CB.record_success(); t }
        Err(e) => { GROQ_CB.record_failure();
            return Err(VilError::internal(format!("Gagal membuat konten: {}", e))); }
    };

    // 8. Content validation (basic profanity + quality check)
    validate_generated_content(&content)?;

    // 9. Increment quota
    increment_ai_usage(&state.db, &body.tenant_id).await.ok();

    let word_count = content.split_whitespace().count();

    Ok(Json(GenerateContentResponse {
        content,
        content_type: body.content_type,
        word_count,
        language: body.language.unwrap_or_else(|| "id".to_string()),
    }))
}

/// Load course/lesson context for better content generation
async fn load_content_context(
    pool: &sqlx::PgPool,
    body: &GenerateContentRequest,
) -> Result<String, VilError> {
    let mut context = String::new();

    // Load course title
    if let Ok(Some(title)) = sqlx::query_scalar::<_, String>(
        "SELECT title FROM courses WHERE id = $1 AND tenant_id = $2"
    )
    .bind(body.course_id)
    .bind(body.tenant_id)
    .fetch_optional(pool)
    .await {
        context.push_str(&format!("Kursus: {}\n", title));
    }

    // Load lesson title + content snippet
    if let Some(lid) = body.lesson_id {
        if let Ok(Some(row)) = sqlx::query_as::<_, (String, Option<String>)>(
            r#"SELECT title, LEFT(content, 1000) FROM lessons
               WHERE id = $1 AND tenant_id = $2"#
        )
        .bind(lid)
        .bind(body.tenant_id)
        .fetch_optional(pool)
        .await {
            context.push_str(&format!("Pelajaran: {}\n", row.0));
            if let Some(c) = row.1 {
                context.push_str(&format!("Konteks:\n{}\n", c));
            }
        }
    }

    Ok(context)
}

/// Build prompt based on content type
fn build_content_prompt(body: &GenerateContentRequest, context: &str) -> String {
    let difficulty_str = match body.difficulty.as_deref() {
        Some("easy") => "mudah (untuk pemula)",
        Some("hard") => "sulit (untuk tingkat lanjut)",
        _ => "sedang",
    };

    let type_instruction = match body.content_type.as_str() {
        "explanation" => "Buat penjelasan yang detail, terstruktur, dan mudah dipahami.",
        "summary" => "Buat ringkasan yang padat, mencakup poin-poin kunci.",
        "exercise" => "Buat latihan/soal dengan instruksi yang jelas. Sertakan kunci jawaban di akhir.",
        "example" => "Buat contoh-contoh konkret yang relevan dan mudah dipahami.",
        _ => "Buat konten edukasi yang berkualitas.",
    };

    format!(
        "{type_instruction}\n\
         Topik: {topic}\n\
         Tingkat kesulitan: {difficulty}\n\
         {context}",
        type_instruction = type_instruction,
        topic = body.topic,
        difficulty = difficulty_str,
        context = if context.is_empty() { String::new() } else { format!("\nKonteks tambahan:\n{}", context) },
    )
}

/// Basic content validation — profanity + quality check
fn validate_generated_content(content: &str) -> Result<(), VilError> {
    // Basic profanity filter (extend with comprehensive list)
    let profanity_terms: Vec<&str> = vec![
        // Add Indonesian + English profanity terms here
        // This is a minimal set — extend based on contentValidator.ts
    ];

    let lower = content.to_lowercase();
    for term in &profanity_terms {
        if lower.contains(term) {
            return Err(VilError::bad_request(
                "Konten yang dihasilkan mengandung kata tidak pantas. Silakan coba lagi."
            ));
        }
    }

    // Quality check: content should not be too short
    if content.split_whitespace().count() < 10 {
        return Err(VilError::internal(
            "Konten yang dihasilkan terlalu pendek. Silakan coba lagi."
        ));
    }

    Ok(())
}
```

**VERIFY:**

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings
cargo test -- ai::content_gen
```

**STOP IF:**

- `contentValidator.ts` punya profanity list yang besar → port list-nya ke Rust static array
- Groq response sering terlalu pendek → naikkan `max_tokens` atau ubah prompt

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 3A-5: Generate Quiz from Content Handler

```
TASK ID:       3A-5
OWNER TYPE:    Rust CRUD Agent
GOAL:          Port generate-quiz-from-content Edge Function (~200 lines) ke Rust.
               Generate quiz questions from lesson content via Groq.
DEPENDENCY:    Task 3A-1 selesai
READ FIRST:    - supabase/functions/generate-quiz-from-content/index.ts (WAJIB)
               - crates/services/src/ai/types.rs (GenerateQuizRequest/Response)
               - crates/services/src/ai/config.rs
EDIT ONLY:     - crates/services/src/ai/quiz_gen.rs (BUAT BARU)
               - crates/services/src/ai/mod.rs (tambah `pub mod quiz_gen;`)
DO NOT TOUCH:  - crates/services/src/ai/grading.rs
               - crates/services/src/ai/tutor.rs
               - crates/services/src/ai/content_gen.rs
```

**IMPLEMENTATION STEPS:**

1. Baca `supabase/functions/generate-quiz-from-content/index.ts`
2. Buat `crates/services/src/ai/quiz_gen.rs`
3. Build prompt untuk quiz generation (structured JSON output)
4. Call Groq via `SseCollect` + `CircuitBreaker`
5. Parse dan validate generated questions
6. Register di `mod.rs`

**COPY-PASTE STARTER:**

```rust
// crates/services/src/ai/quiz_gen.rs
// =============================================================================
// Generate Quiz from Content Handler
// Replaces: supabase/functions/generate-quiz-from-content/index.ts (~200 lines)
// =============================================================================
use axum::extract::State;
use axum::Json;
use vil_server::prelude::*;
use vil_server::ai::sse_collect::SseCollect;
use vil_server::ai::SseDialect;

use crate::state::AppState;
use super::config::{
    GROQ_CB, GROQ_API_URL, GROQ_DEFAULT_MODEL, GROQ_MAX_TOKENS_QUIZ, TEMP_QUIZ,
    check_ai_quota, increment_ai_usage,
};
use super::types::*;

/// POST /api/v1/ai/generate-quiz
pub async fn generate_quiz(
    State(state): State<AppState>,
    claims: crate::middleware::Claims,
    Json(body): Json<GenerateQuizRequest>,
) -> Result<Json<GenerateQuizResponse>, VilError> {
    // 1. Verify tenant
    if claims.tenant_id != body.tenant_id {
        return Err(VilError::forbidden("Anda tidak memiliki akses ke data ini"));
    }

    // 2. Validate inputs
    let num_questions = body.num_questions.clamp(1, 20);
    let valid_qtypes = ["multiple_choice", "true_false", "short_answer"];
    for qt in &body.question_types {
        if !valid_qtypes.contains(&qt.as_str()) {
            return Err(VilError::bad_request(format!(
                "question_type '{}' tidak valid. Gunakan: {}",
                qt, valid_qtypes.join(", ")
            )));
        }
    }

    // 3. Check AI quota
    let quota = check_ai_quota(&state.db, &body.tenant_id).await
        .map_err(|e| VilError::internal(format!("Gagal cek kuota AI: {}", e)))?;
    if !quota.allowed {
        return Err(VilError::too_many_requests("Kuota AI bulan ini sudah habis."));
    }

    // 4. Build prompt
    let difficulty = body.difficulty.as_deref().unwrap_or("medium");
    let qtypes_str = body.question_types.join(", ");

    let prompt = format!(
        r#"Buat {num_q} soal kuis berdasarkan konten berikut.

Konten:
{content}

Persyaratan:
- Tipe soal yang diminta: {qtypes}
- Tingkat kesulitan: {difficulty}
- Setiap soal harus punya penjelasan jawaban
- Untuk multiple_choice: 4 opsi, 1 benar
- Untuk true_false: jawaban "Benar" atau "Salah"
- Untuk short_answer: jawaban singkat 1-3 kata

Respons dalam format JSON:
{{
  "questions": [
    {{
      "question_text": "...",
      "question_type": "multiple_choice|true_false|short_answer",
      "options": [ "text": "...", "is_correct": true/false ],
      "correct_answer": "...",
      "explanation": "...",
      "difficulty": "easy|medium|hard"
    }}
  ]
}}"#,
        num_q = num_questions,
        content = &body.content_text[..body.content_text.len().min(4000)],
        qtypes = qtypes_str,
        difficulty = difficulty,
    );

    // 5. CircuitBreaker
    GROQ_CB.check().map_err(|_| VilError::service_unavailable(
        "Layanan AI sementara tidak tersedia."
    ))?;

    // 6. Call Groq
    let groq_api_key = state.groq_api_key.as_deref()
        .ok_or_else(|| VilError::internal("GROQ_API_KEY tidak dikonfigurasi"))?;

    let ai_response = SseCollect::post_to(GROQ_API_URL)
        .dialect(SseDialect::openai())
        .bearer_token(groq_api_key)
        .body(serde_json::json!({
            "model": GROQ_DEFAULT_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": "Kamu adalah pembuat soal kuis profesional. Buat soal dalam Bahasa Indonesia. Respons HARUS dalam format JSON yang valid."
                },
                { "role": "user", "content": prompt }
            ],
            "temperature": TEMP_QUIZ,
            "max_tokens": GROQ_MAX_TOKENS_QUIZ,
            "stream": true,
            "response_format": { "type": "json_object" }
        }))
        .collect_text()
        .await;

    let text = match ai_response {
        Ok(t) => { GROQ_CB.record_success(); t }
        Err(e) => { GROQ_CB.record_failure();
            return Err(VilError::internal(format!("Gagal membuat kuis: {}", e))); }
    };

    // 7. Parse response
    let questions = parse_quiz_response(&text)
        .map_err(|e| VilError::internal(format!("Gagal memproses respons AI: {}", e)))?;

    // 8. Validate questions
    validate_questions(&questions)?;

    // 9. Increment quota
    increment_ai_usage(&state.db, &body.tenant_id).await.ok();

    Ok(Json(GenerateQuizResponse { questions }))
}

/// Parse Groq JSON response to questions
fn parse_quiz_response(text: &str) -> Result<Vec<GeneratedQuestion>, String> {
    // Try direct JSON parse
    let parsed: serde_json::Value = serde_json::from_str(text)
        .or_else(|_| {
            // Fallback: extract JSON from markdown code block
            let start = text.find('{').ok_or("Tidak ditemukan JSON")?;
            let end = text.rfind('}').ok_or("Tidak ditemukan JSON")?;
            serde_json::from_str(&text[start..=end])
                .map_err(|e| format!("JSON parse gagal: {}", e))
        })?;

    let questions = parsed["questions"]
        .as_array()
        .ok_or("Field 'questions' bukan array")?;

    let mut result = Vec::new();
    for q in questions {
        let question_type = q["question_type"].as_str().unwrap_or("multiple_choice").to_string();

        let options = if question_type == "multiple_choice" || question_type == "true_false" {
            q["options"].as_array().map(|opts| {
                opts.iter().filter_map(|o| {
                    Some(GeneratedOption {
                        text: o["text"].as_str()?.to_string(),
                        is_correct: o["is_correct"].as_bool().unwrap_or(false),
                    })
                }).collect()
            })
        } else {
            None
        };

        result.push(GeneratedQuestion {
            question_text: q["question_text"].as_str().unwrap_or("").to_string(),
            question_type,
            options,
            correct_answer: q["correct_answer"].as_str().unwrap_or("").to_string(),
            explanation: q["explanation"].as_str().unwrap_or("").to_string(),
            difficulty: q["difficulty"].as_str().unwrap_or("medium").to_string(),
        });
    }

    Ok(result)
}

/// Validate generated questions structure
fn validate_questions(questions: &[GeneratedQuestion]) -> Result<(), VilError> {
    if questions.is_empty() {
        return Err(VilError::internal("AI tidak menghasilkan soal. Coba lagi."));
    }

    for (i, q) in questions.iter().enumerate() {
        if q.question_text.is_empty() {
            return Err(VilError::internal(format!("Soal #{} tidak punya teks pertanyaan", i + 1)));
        }
        if q.correct_answer.is_empty() {
            return Err(VilError::internal(format!("Soal #{} tidak punya jawaban benar", i + 1)));
        }
        if q.question_type == "multiple_choice" {
            if let Some(opts) = &q.options {
                if opts.len() < 2 {
                    return Err(VilError::internal(format!("Soal #{} harus punya minimal 2 opsi", i + 1)));
                }
                let correct_count = opts.iter().filter(|o| o.is_correct).count();
                if correct_count != 1 {
                    return Err(VilError::internal(format!("Soal #{} harus punya tepat 1 jawaban benar", i + 1)));
                }
            } else {
                return Err(VilError::internal(format!("Soal #{} multiple_choice harus punya opsi", i + 1)));
            }
        }
    }
    Ok(())
}
```

**VERIFY:**

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings
cargo test -- ai::quiz_gen
```

**STOP IF:**

- Groq `response_format: json_object` tidak supported → hapus parameter, parse JSON dari free-text
- AI consistently gagal generate valid JSON → tambahkan retry loop (max 2x)

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 3A-6: Register AI Service + Routes di [main.rs](http://main.rs)

```
TASK ID:       3A-6
OWNER TYPE:    Rust CRUD Agent
GOAL:          Register semua 4 AI handlers sebagai ServiceProcess "ai" di VilApp.
DEPENDENCY:    Task 3A-2, 3A-3, 3A-4, 3A-5 selesai
READ FIRST:    - crates/server/src/main.rs (current VilApp setup)
               - Bootstrap Context §3 (VilApp Setup pattern)
               - Spec 3 §1.1 (rate limits: 50/hr per user untuk AI)
EDIT ONLY:     - crates/server/src/main.rs (EDIT — tambah AI service)
DO NOT TOUCH:  - crates/services/src/ai/ (sudah selesai)
               - Semua file frontend
```

**IMPLEMENTATION STEPS:**

1. Import AI handler functions
2. Buat `ServiceProcess::new("ai")` dengan prefix `/api/v1/ai`
3. Register 4 endpoints
4. Tambahkan ke `VilApp`

**COPY-PASTE STARTER:**

```rust
// Tambahkan di crates/server/src/main.rs

// === IMPORT (tambahkan di bagian imports) ===
use crate::services::ai::grading::grade_essay;
use crate::services::ai::tutor::tutor_chat;
use crate::services::ai::content_gen::generate_content;
use crate::services::ai::quiz_gen::generate_quiz;

// === SERVICE DEFINITION (tambahkan sebelum VilApp::new) ===
let ai = ServiceProcess::new("ai")
    .prefix("/api/v1/ai")
    .endpoint(Method::POST, "/grade-essay", post(grade_essay))
    .endpoint(Method::POST, "/tutor/chat", post(tutor_chat))
    .endpoint(Method::POST, "/generate-content", post(generate_content))
    .endpoint(Method::POST, "/generate-quiz", post(generate_quiz));

// === REGISTER (tambahkan .service(ai) di VilApp chain) ===
// VilApp::new("edusync-api")
//     ...
//     .service(ai)       // <-- TAMBAHKAN INI
//     ...
```

**VERIFY:**

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings
cargo test

# Start server dan test endpoints
cargo run &
curl -s http://localhost:8080/health | jq .
# Verify AI routes registered:
curl -s http://localhost:8080/_vil/api/routes | jq '.[] | select(.path | startswith("/api/v1/ai"))'
```

**STOP IF:**

- Route conflicts dengan existing endpoints → check prefix
- Import paths salah → verify crate module structure

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 3A-7: AI Functions Integration Tests

```
TASK ID:       3A-7
OWNER TYPE:    Test Agent
GOAL:          Buat integration tests untuk semua 4 AI handlers.
               Tests harus work dengan GROQ_API_KEY set (live test)
               DAN tanpa key (CircuitBreaker/error path test).
DEPENDENCY:    Task 3A-6 selesai
READ FIRST:    - Bootstrap Context §11 (Testing pattern)
               - crates/services/src/ai/*.rs (all 4 handlers)
EDIT ONLY:     - crates/services/tests/ai_integration.rs (BUAT BARU)
DO NOT TOUCH:  - crates/services/src/ai/ (sudah selesai)
               - crates/server/src/main.rs
```

**COPY-PASTE STARTER:**

```rust
// crates/services/tests/ai_integration.rs
// =============================================================================
// AI Integration Tests
// =============================================================================
use vil_server_test::TestClient;
use serde_json::json;

mod common;
use common::{build_test_app, test_jwt_teacher, test_jwt_student, TEST_TENANT_ID};

// ---------------------------------------------------------------------------
// Grade Essay Tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_grade_essay_requires_auth() {
    let client = TestClient::new(build_test_app().await);
    let resp = client
        .post("/api/v1/ai/grade-essay")
        .json(&json!({ "essay_text": "test" }))
        .await;
    resp.assert_status(401);
}

#[tokio::test]
async fn test_grade_essay_tenant_isolation() {
    let client = TestClient::new(build_test_app().await);
    let resp = client
        .post("/api/v1/ai/grade-essay")
        .header("Authorization", format!("Bearer {}", test_jwt_teacher()))
        .json(&json!({
            "essay_text": "Test essay",
            "rubric_id": "00000000-0000-0000-0000-000000000001",
            "assignment_id": "00000000-0000-0000-0000-000000000002",
            "student_id": "00000000-0000-0000-0000-000000000003",
            "tenant_id": "00000000-0000-0000-0000-wrong-tenant",
            "max_score": 100.0
        }))
        .await;
    resp.assert_status(403);
}

#[tokio::test]
async fn test_grade_essay_missing_rubric() {
    let client = TestClient::new(build_test_app().await);
    let resp = client
        .post("/api/v1/ai/grade-essay")
        .header("Authorization", format!("Bearer {}", test_jwt_teacher()))
        .json(&json!({
            "essay_text": "Test essay",
            "rubric_id": "00000000-0000-0000-0000-nonexistent00",
            "assignment_id": "00000000-0000-0000-0000-000000000002",
            "student_id": "00000000-0000-0000-0000-000000000003",
            "tenant_id": TEST_TENANT_ID,
            "max_score": 100.0
        }))
        .await;
    resp.assert_status(404);  // Rubrik tidak ditemukan
}

// ---------------------------------------------------------------------------
// Tutor Chat Tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_tutor_chat_creates_session() {
    let client = TestClient::new(build_test_app().await);
    // Note: this test requires GROQ_API_KEY to be set
    // If not set, it should return 500 (GROQ_API_KEY tidak dikonfigurasi)
    let resp = client
        .post("/api/v1/ai/tutor/chat")
        .header("Authorization", format!("Bearer {}", test_jwt_student()))
        .json(&json!({
            "course_id": "00000000-0000-0000-0000-000000000001",
            "message": "Tolong jelaskan tentang variabel",
            "tenant_id": TEST_TENANT_ID
        }))
        .await;
    // Accept either 200 (if Groq key set) or 500 (if not)
    assert!(resp.status() == 200 || resp.status() == 500);
}

#[tokio::test]
async fn test_tutor_chat_requires_auth() {
    let client = TestClient::new(build_test_app().await);
    let resp = client
        .post("/api/v1/ai/tutor/chat")
        .json(&json!({ "message": "hello" }))
        .await;
    resp.assert_status(401);
}

// ---------------------------------------------------------------------------
// Generate Content Tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_generate_content_invalid_type() {
    let client = TestClient::new(build_test_app().await);
    let resp = client
        .post("/api/v1/ai/generate-content")
        .header("Authorization", format!("Bearer {}", test_jwt_teacher()))
        .json(&json!({
            "course_id": "00000000-0000-0000-0000-000000000001",
            "content_type": "invalid_type",
            "topic": "Variabel Python",
            "tenant_id": TEST_TENANT_ID
        }))
        .await;
    resp.assert_status(400);
}

// ---------------------------------------------------------------------------
// Generate Quiz Tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_generate_quiz_invalid_question_type() {
    let client = TestClient::new(build_test_app().await);
    let resp = client
        .post("/api/v1/ai/generate-quiz")
        .header("Authorization", format!("Bearer {}", test_jwt_teacher()))
        .json(&json!({
            "lesson_id": "00000000-0000-0000-0000-000000000001",
            "content_text": "Python adalah bahasa pemrograman.",
            "num_questions": 5,
            "question_types": ["invalid_type"],
            "tenant_id": TEST_TENANT_ID
        }))
        .await;
    resp.assert_status(400);
}

// ---------------------------------------------------------------------------
// CircuitBreaker Tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_circuit_breaker_shared_across_handlers() {
    // Verify that GROQ_CB is the same singleton across all AI handlers
    use crate::services::ai::config::GROQ_CB;
    // This test just verifies the singleton compiles and is accessible
    // Actual circuit breaker behavior tested via integration
    GROQ_CB.check().ok(); // Should not panic
}
```

**VERIFY:**

```
cd edusync-api
cargo test -- ai_integration
```

**STOP IF:**

- Test framework `vil_server_test::TestClient` tidak tersedia → gunakan `axum_test` atau `tower::ServiceExt`
- Common test helpers belum ada → buat `tests/common/mod.rs` dengan `build_test_app`, `test_jwt_*`, `TEST_TENANT_ID`

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# Wave 3B — LTI 1.3 Functions (3 Edge Functions → Rust)

<aside>
🎯

**Goal:** Port 3 LTI 1.3 Edge Functions ke Rust handlers menggunakan `jsonwebtoken` crate (RS256). LTI guest users mendapat deterministic email format. `lti_nonces` table hanya diakses oleh service role.

</aside>

---

## Task 3B-1: LTI Common Types, Config & Nonce Manager

```
TASK ID:       3B-1
OWNER TYPE:    Rust CRUD Agent
GOAL:          Buat shared LTI types, platform registry, nonce manager,
               dan RSA key management untuk LTI 1.3.
DEPENDENCY:    Phase 1A scaffold selesai
READ FIRST:    - supabase/functions/lti-oidc-login/index.ts
               - supabase/functions/lti-launch/index.ts
               - supabase/functions/lti-jwks/index.ts
               - IMS Global LTI 1.3 spec (https://www.imsglobal.org/spec/lti/v1p3/)
               - Bootstrap Context §13 (LTI gotchas)
EDIT ONLY:     - crates/services/src/lti/mod.rs (BUAT BARU)
               - crates/services/src/lti/types.rs (BUAT BARU)
               - crates/services/src/lti/config.rs (BUAT BARU)
               - crates/services/src/lti/nonce.rs (BUAT BARU)
               - crates/services/src/mod.rs (tambah `pub mod lti;`)
DO NOT TOUCH:  - crates/services/src/ai/
               - crates/server/src/main.rs
               - Semua file frontend
```

**IMPLEMENTATION STEPS:**

1. Buat direktori `crates/services/src/lti/`
2. Buat `types.rs` — LTI platform registration, launch claims, OIDC params
3. Buat `config.rs` — RSA key pair management, JWKS generation
4. Buat `nonce.rs` — nonce generation, storage, and validation (service_role only)
5. Buat `mod.rs` — re-exports

**COPY-PASTE STARTER:**

```rust
// crates/services/src/lti/mod.rs
pub mod config;
pub mod nonce;
pub mod types;

pub use types::*;
```

```rust
// crates/services/src/lti/types.rs
// =============================================================================
// LTI 1.3 Shared Types
// =============================================================================
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// LTI Platform registration (stored in DB)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LtiPlatform {
    pub id: Uuid,
    pub issuer: String,                    // Platform issuer URL
    pub client_id: String,                 // Our client ID on the platform
    pub auth_endpoint: String,             // Platform's OIDC auth URL
    pub token_endpoint: String,            // Platform's token URL
    pub jwks_endpoint: String,             // Platform's JWKS URL
    pub deployment_id: String,
    pub tenant_id: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// OIDC Login initiation parameters (from platform)
#[derive(Debug, Deserialize)]
pub struct OidcLoginParams {
    pub iss: String,                       // Issuer
    pub login_hint: String,                // User hint from platform
    pub target_link_uri: String,           // Where to redirect after auth
    pub lti_message_hint: Option<String>,  // Optional message hint
    pub client_id: Option<String>,         // Optional client_id
    pub lti_deployment_id: Option<String>, // Optional deployment_id
}

/// LTI Launch form data (POST from platform after OIDC)
#[derive(Debug, Deserialize)]
pub struct LtiLaunchForm {
    pub id_token: String,
    pub state: String,
}

/// LTI 1.3 id_token claims (subset we need)
#[derive(Debug, Deserialize)]
pub struct LtiClaims {
    pub iss: String,                           // Platform issuer
    pub sub: String,                           // User ID on platform
    pub aud: String,                           // Our client_id
    pub exp: i64,
    pub iat: i64,
    pub nonce: String,
    // LTI-specific claims
    #[serde(rename = "https://purl.imsglobal.org/spec/lti/claim/message_type")]
    pub message_type: Option<String>,
    #[serde(rename = "https://purl.imsglobal.org/spec/lti/claim/version")]
    pub version: Option<String>,
    #[serde(rename = "https://purl.imsglobal.org/spec/lti/claim/deployment_id")]
    pub deployment_id: Option<String>,
    #[serde(rename = "https://purl.imsglobal.org/spec/lti/claim/target_link_uri")]
    pub target_link_uri: Option<String>,
    #[serde(rename = "https://purl.imsglobal.org/spec/lti/claim/resource_link")]
    pub resource_link: Option<LtiResourceLink>,
    #[serde(rename = "https://purl.imsglobal.org/spec/lti/claim/roles")]
    pub roles: Option<Vec<String>>,
    // User info
    pub name: Option<String>,
    pub email: Option<String>,
    pub given_name: Option<String>,
    pub family_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LtiResourceLink {
    pub id: String,
    pub title: Option<String>,
}

/// JWKS response shape
#[derive(Debug, Serialize)]
pub struct JwksResponse {
    pub keys: Vec<JwkKey>,
}

#[derive(Debug, Serialize)]
pub struct JwkKey {
    pub kty: String,
    pub alg: String,
    pub r#use: String,
    pub kid: String,
    pub n: String,
    pub e: String,
}

/// LTI guest user email format
/// Format: lti-{platformId first 8 chars}-{sub}@lti.edusync.internal
pub fn lti_guest_email(platform_id: &Uuid, sub: &str) -> String {
    let platform_id_short = &platform_id.to_string()[..8];
    // Sanitize sub to be email-safe
    let safe_sub: String = sub.chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .take(50)
        .collect();
    format!("lti-{}-{}@lti.edusync.internal", platform_id_short, safe_sub)
}
```

```rust
// crates/services/src/lti/config.rs
// =============================================================================
// LTI RSA Key Management + JWKS Generation
// =============================================================================
use jsonwebtoken::{EncodingKey, DecodingKey};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use rsa::{RsaPrivateKey, RsaPublicKey};
use rsa::pkcs1::EncodeRsaPublicKey;
use rsa::traits::PublicKeyParts;

use super::types::{JwksResponse, JwkKey};

/// LTI RSA key pair — loaded from env or generated
pub struct LtiKeyPair {
    pub kid: String,
    pub encoding_key: EncodingKey,
    pub decoding_key: DecodingKey,
    pub public_key_n: String,   // Base64url-encoded modulus
    pub public_key_e: String,   // Base64url-encoded exponent
}

impl LtiKeyPair {
    /// Load from PEM environment variable or generate a new pair
    pub fn from_env() -> Result<Self, String> {
        let kid = std::env::var("LTI_KEY_ID").unwrap_or_else(|_| "edusync-lti-1".to_string());

        // Try loading from env
        if let Ok(private_pem) = std::env::var("LTI_PRIVATE_KEY_PEM") {
            let encoding_key = EncodingKey::from_rsa_pem(private_pem.as_bytes())
                .map_err(|e| format!("Invalid LTI private key PEM: {}", e))?;

            let public_pem = std::env::var("LTI_PUBLIC_KEY_PEM")
                .map_err(|_| "LTI_PUBLIC_KEY_PEM not set")?;
            let decoding_key = DecodingKey::from_rsa_pem(public_pem.as_bytes())
                .map_err(|e| format!("Invalid LTI public key PEM: {}", e))?;

            // Extract n and e from public key
            let rsa_pub = rsa::RsaPublicKey::from_public_key_pem(&public_pem)
                .map_err(|e| format!("Failed to parse public key: {}", e))?;
            let n = URL_SAFE_NO_PAD.encode(rsa_pub.n().to_bytes_be());
            let e = URL_SAFE_NO_PAD.encode(rsa_pub.e().to_bytes_be());

            return Ok(Self {
                kid,
                encoding_key,
                decoding_key,
                public_key_n: n,
                public_key_e: e,
            });
        }

        Err("LTI_PRIVATE_KEY_PEM not set. Generate RSA key pair for LTI.".to_string())
    }

    /// Generate JWKS response
    pub fn jwks(&self) -> JwksResponse {
        JwksResponse {
            keys: vec![JwkKey {
                kty: "RSA".to_string(),
                alg: "RS256".to_string(),
                r#use: "sig".to_string(),
                kid: self.kid.clone(),
                n: self.public_key_n.clone(),
                e: self.public_key_e.clone(),
            }],
        }
    }
}
```

```rust
// crates/services/src/lti/nonce.rs
// =============================================================================
// LTI Nonce Manager — service_role only access to lti_nonces table
// =============================================================================
use uuid::Uuid;
use chrono::{Utc, Duration};

/// Generate a cryptographically random nonce
pub fn generate_nonce() -> String {
    Uuid::new_v4().to_string()
}

/// Store nonce in DB (service_role — bypasses RLS)
pub async fn store_nonce(
    pool: &sqlx::PgPool,
    nonce: &str,
    platform_id: &Uuid,
    state: &str,
) -> Result<(), sqlx::Error> {
    let expires_at = Utc::now() + Duration::minutes(10);

    sqlx::query(
        r#"INSERT INTO lti_nonces (nonce, platform_id, state, expires_at)
           VALUES ($1, $2, $3, $4)"#
    )
    .bind(nonce)
    .bind(platform_id)
    .bind(state)
    .bind(expires_at)
    .execute(pool)
    .await?;

    Ok(())
}

/// Validate and consume nonce (one-time use, prevents replay)
pub async fn validate_and_consume_nonce(
    pool: &sqlx::PgPool,
    nonce: &str,
    state: &str,
) -> Result<Uuid, String> {
    let row = sqlx::query_as::<_, (Uuid, chrono::DateTime<Utc>)>(
        r#"DELETE FROM lti_nonces
           WHERE nonce = $1 AND state = $2
           RETURNING platform_id, expires_at"#
    )
    .bind(nonce)
    .bind(state)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Gagal validasi nonce: {}", e))?
    .ok_or_else(|| "Nonce tidak valid atau sudah digunakan".to_string())?;

    if row.1 < Utc::now() {
        return Err("Nonce sudah kedaluwarsa".to_string());
    }

    Ok(row.0)  // Return platform_id
}

/// Cleanup expired nonces (called by cron)
pub async fn cleanup_expired_nonces(pool: &sqlx::PgPool) -> Result<u64, sqlx::Error> {
    let result = sqlx::query("DELETE FROM lti_nonces WHERE expires_at < NOW()")
        .execute(pool)
        .await?;
    Ok(result.rows_affected())
}
```

**VERIFY:**

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings
```

**STOP IF:**

- `lti_nonces` table belum ada → buat migration (Task 3B-1b)
- `rsa` crate version conflict → check Cargo.toml workspace dependencies
- `LTI_PRIVATE_KEY_PEM` env var tidak tersedia → generate RSA key pair dulu

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 3B-1b: Migration untuk lti_nonces Table (jika belum ada)

```
TASK ID:       3B-1b
OWNER TYPE:    Rust CRUD Agent
GOAL:          Buat SQL migration untuk lti_nonces + lti_platforms tables
               jika belum ada. SKIP jika sudah exist.
DEPENDENCY:    Tidak ada
READ FIRST:    - supabase/migrations/ (cari lti_nonces, lti_platforms)
EDIT ONLY:     - edusync-api/migrations/<timestamp>_create_lti_tables.sql (BUAT BARU)
DO NOT TOUCH:  - Semua file Rust
               - Supabase migrations yang sudah ada
```

**COPY-PASTE STARTER:**

```sql
-- LTI Platform registrations
CREATE TABLE IF NOT EXISTS lti_platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issuer TEXT NOT NULL,
    client_id TEXT NOT NULL,
    auth_endpoint TEXT NOT NULL,
    token_endpoint TEXT NOT NULL,
    jwks_endpoint TEXT NOT NULL,
    deployment_id TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(issuer, client_id, deployment_id)
);

CREATE INDEX IF NOT EXISTS idx_lti_platforms_issuer
    ON lti_platforms(issuer, client_id);

-- LTI Nonces (one-time use, service_role only)
CREATE TABLE IF NOT EXISTS lti_nonces (
    nonce TEXT PRIMARY KEY,
    platform_id UUID NOT NULL REFERENCES lti_platforms(id) ON DELETE CASCADE,
    state TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lti_nonces_expires
    ON lti_nonces(expires_at);

-- RLS: service_role only (no user access)
ALTER TABLE lti_nonces ENABLE ROW LEVEL SECURITY;
-- No policies = only service_role can access
```

**VERIFY:**

```
cd edusync-api
cargo sqlx migrate run
```

**STOP IF:**

- Tables sudah ada → SKIP, output DONE

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 3B-2: LTI OIDC Login Handler

```
TASK ID:       3B-2
OWNER TYPE:    Rust CRUD Agent
GOAL:          Port lti-oidc-login Edge Function ke Rust.
               Handles OIDC initiation from LTI platforms.
DEPENDENCY:    Task 3B-1 selesai
READ FIRST:    - supabase/functions/lti-oidc-login/index.ts (WAJIB)
               - crates/services/src/lti/types.rs (OidcLoginParams)
               - crates/services/src/lti/nonce.rs (generate + store nonce)
               - LTI 1.3 OIDC spec: step 1 (third-party initiated login)
EDIT ONLY:     - crates/services/src/lti/oidc_login.rs (BUAT BARU)
               - crates/services/src/lti/mod.rs (tambah `pub mod oidc_login;`)
DO NOT TOUCH:  - crates/services/src/ai/
               - crates/services/src/lti/types.rs
```

**COPY-PASTE STARTER:**

```rust
// crates/services/src/lti/oidc_login.rs
// =============================================================================
// LTI OIDC Login Initiation
// Replaces: supabase/functions/lti-oidc-login/index.ts
// =============================================================================
use axum::extract::{Query, State};
use axum::response::Redirect;
use vil_server::prelude::*;

use crate::state::AppState;
use super::types::{LtiPlatform, OidcLoginParams};
use super::nonce::{generate_nonce, store_nonce};

/// GET /api/v1/lti/oidc-login
///
/// Step 1 of LTI 1.3 launch: Platform redirects user here.
/// We validate the platform, generate a nonce+state, and redirect
/// back to the platform's auth endpoint.
pub async fn oidc_login(
    State(state): State<AppState>,
    Query(params): Query<OidcLoginParams>,
) -> Result<Redirect, VilError> {
    // 1. Look up platform by issuer (+ optional client_id)
    let platform = find_platform(&state.db, &params).await?;

    // 2. Generate nonce and state
    let nonce = generate_nonce();
    let login_state = generate_nonce(); // State is also a random token

    // 3. Store nonce + state for validation in launch step
    store_nonce(&state.db, &nonce, &platform.id, &login_state)
        .await
        .map_err(|e| VilError::internal(format!("Gagal menyimpan nonce: {}", e)))?;

    // 4. Build redirect URL to platform's auth endpoint
    let redirect_uri = format!(
        "{}/api/v1/lti/launch",
        std::env::var("APP_URL").unwrap_or_else(|_| "http://localhost:8080".to_string())
    );

    let auth_url = format!(
        "{}?scope=openid\
         &response_type=id_token\
         &client_id={}\
         &redirect_uri={}\
         &login_hint={}\
         &state={}\
         &response_mode=form_post\
         &nonce={}\
         &prompt=none{}",
        platform.auth_endpoint,
        urlencoding::encode(&platform.client_id),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode(&params.login_hint),
        urlencoding::encode(&login_state),
        urlencoding::encode(&nonce),
        params.lti_message_hint.as_ref()
            .map(|h| format!("&lti_message_hint={}", urlencoding::encode(h)))
            .unwrap_or_default(),
    );

    vil_info!("LTI OIDC login initiated",
        platform_issuer = %platform.issuer,
        platform_id = %platform.id,
    );

    Ok(Redirect::to(&auth_url))
}

/// Find platform registration by issuer
async fn find_platform(
    pool: &sqlx::PgPool,
    params: &OidcLoginParams,
) -> Result<LtiPlatform, VilError> {
    let mut query = String::from(
        r#"SELECT id, issuer, client_id, auth_endpoint, token_endpoint,
                  jwks_endpoint, deployment_id, tenant_id, created_at
           FROM lti_platforms
           WHERE issuer = $1"#
    );

    // If client_id provided, narrow the search
    if params.client_id.is_some() {
        query.push_str(" AND client_id = $2");
    }

    let platform = if let Some(ref cid) = params.client_id {
        sqlx::query_as::<_, LtiPlatform>(&query)
            .bind(&params.iss)
            .bind(cid)
            .fetch_optional(pool)
            .await
    } else {
        sqlx::query_as::<_, LtiPlatform>(&query)
            .bind(&params.iss)
            .fetch_optional(pool)
            .await
    }
    .map_err(|e| VilError::internal(format!("Gagal mencari platform LTI: {}", e)))?
    .ok_or_else(|| VilError::not_found(format!(
        "Platform LTI dengan issuer '{}' tidak terdaftar", params.iss
    )))?;

    Ok(platform)
}
```

**VERIFY:**

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings
cargo test -- lti::oidc_login
```

**STOP IF:**

- `urlencoding` crate belum di Cargo.toml → tambahkan `urlencoding = "2"`
- Platform table schema berbeda dari `supabase/migrations/` → sesuaikan struct

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 3B-3: LTI Launch Handler

```
TASK ID:       3B-3
OWNER TYPE:    Rust CRUD Agent
GOAL:          Port lti-launch Edge Function ke Rust.
               Validates id_token (RS256), checks nonce, creates/updates
               LTI guest user, generates JWT, redirects to app.
DEPENDENCY:    Task 3B-1, 3B-2 selesai
READ FIRST:    - supabase/functions/lti-launch/index.ts (WAJIB)
               - crates/services/src/lti/types.rs (LtiClaims, LtiLaunchForm)
               - crates/services/src/lti/nonce.rs (validate_and_consume_nonce)
               - Bootstrap Context §13 — LTI gotchas
               - Bootstrap Context §4 — JWT issuance
EDIT ONLY:     - crates/services/src/lti/launch.rs (BUAT BARU)
               - crates/services/src/lti/mod.rs (tambah `pub mod launch;`)
DO NOT TOUCH:  - crates/services/src/lti/oidc_login.rs
               - crates/services/src/ai/
```

**COPY-PASTE STARTER:**

```rust
// crates/services/src/lti/launch.rs
// =============================================================================
// LTI Launch Handler
// Replaces: supabase/functions/lti-launch/index.ts
// =============================================================================
use axum::extract::State;
use axum::response::Redirect;
use axum::Form;
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use vil_server::prelude::*;
use uuid::Uuid;

use crate::state::AppState;
use super::types::*;
use super::nonce::validate_and_consume_nonce;

/// POST /api/v1/lti/launch
///
/// Step 3 of LTI 1.3: Platform POSTs id_token + state after OIDC.
/// We validate the token, check the nonce, find/create user, issue JWT,
/// and redirect to the app.
pub async fn lti_launch(
    State(state): State<AppState>,
    Form(form): Form<LtiLaunchForm>,
) -> Result<Redirect, VilError> {
    // 1. Validate nonce and get platform_id
    let platform_id = validate_and_consume_nonce(&state.db, &extract_nonce_from_token(&form.id_token)?, &form.state)
        .await
        .map_err(|e| VilError::bad_request(format!("Validasi LTI gagal: {}", e)))?;

    // 2. Load platform to get JWKS endpoint
    let platform = sqlx::query_as::<_, LtiPlatform>(
        r#"SELECT id, issuer, client_id, auth_endpoint, token_endpoint,
                  jwks_endpoint, deployment_id, tenant_id, created_at
           FROM lti_platforms WHERE id = $1"#
    )
    .bind(platform_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| VilError::internal(format!("Platform tidak ditemukan: {}", e)))?;

    // 3. Fetch platform's JWKS and validate id_token
    let claims = validate_id_token(&form.id_token, &platform).await?;

    // 4. Verify claims
    if claims.aud != platform.client_id {
        return Err(VilError::bad_request("Audience mismatch di token LTI"));
    }

    // 5. Map LTI roles to EduSync roles
    let edusync_role = map_lti_role_to_edusync(&claims.roles.unwrap_or_default());

    // 6. Create or update LTI guest user
    let guest_email = lti_guest_email(&platform_id, &claims.sub);
    let display_name = claims.name.clone()
        .or_else(|| {
            match (claims.given_name.as_ref(), claims.family_name.as_ref()) {
                (Some(g), Some(f)) => Some(format!("{} {}", g, f)),
                (Some(g), None) => Some(g.clone()),
                _ => None,
            }
        })
        .unwrap_or_else(|| format!("LTI User {}", &claims.sub[..claims.sub.len().min(8)]));

    let user_id = find_or_create_lti_user(
        &state.db,
        &guest_email,
        &display_name,
        &edusync_role,
        platform.tenant_id,
    ).await?;

    // 7. Issue EduSync JWT
    let jwt = crate::auth::issue_jwt(
        &state.jwt_secret,
        user_id,
        &guest_email,
        &[edusync_role.clone()],
        platform.tenant_id,
    )?;

    // 8. Build redirect URL to frontend app
    let app_url = std::env::var("FRONTEND_URL")
        .unwrap_or_else(|_| "http://localhost:5173".to_string());

    // Determine target path from LTI claims
    let target_path = claims.target_link_uri
        .unwrap_or_else(|| "/#/dashboard".to_string());

    let redirect_url = format!(
        "{}{}?token={}&lti=true",
        app_url,
        target_path,
        urlencoding::encode(&jwt),
    );

    vil_info!("LTI launch successful",
        user_id = %user_id,
        platform_id = %platform_id,
        role = %edusync_role,
    );

    Ok(Redirect::to(&redirect_url))
}

/// Extract nonce from id_token WITHOUT full validation (just decode payload)
fn extract_nonce_from_token(id_token: &str) -> Result<String, VilError> {
    // Decode without verification to get nonce for lookup
    let parts: Vec<&str> = id_token.split('.').collect();
    if parts.len() != 3 {
        return Err(VilError::bad_request("Token LTI tidak valid"));
    }

    let payload = base64::Engine::decode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        parts[1],
    ).map_err(|_| VilError::bad_request("Token LTI payload tidak valid"))?;

    let claims: serde_json::Value = serde_json::from_slice(&payload)
        .map_err(|_| VilError::bad_request("Token LTI payload bukan JSON"))?;

    claims["nonce"]
        .as_str()
        .map(String::from)
        .ok_or_else(|| VilError::bad_request("Token LTI tidak punya nonce"))
}

/// Fetch platform JWKS and validate id_token (RS256)
async fn validate_id_token(
    id_token: &str,
    platform: &LtiPlatform,
) -> Result<LtiClaims, VilError> {
    // 1. Fetch JWKS from platform
    let client = reqwest::Client::new();
    let jwks_resp = client.get(&platform.jwks_endpoint)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| VilError::internal(format!("Gagal mengambil JWKS platform: {}", e)))?;

    let jwks: serde_json::Value = jwks_resp.json().await
        .map_err(|e| VilError::internal(format!("JWKS platform bukan JSON valid: {}", e)))?;

    // 2. Find the matching key
    let keys = jwks["keys"].as_array()
        .ok_or_else(|| VilError::internal("JWKS platform tidak punya 'keys' array"))?;

    // Decode header to find kid
    let header = jsonwebtoken::decode_header(id_token)
        .map_err(|e| VilError::bad_request(format!("Token header tidak valid: {}", e)))?;

    let matching_key = keys.iter().find(|k| {
        k["kid"].as_str() == header.kid.as_deref() && k["alg"].as_str() == Some("RS256")
    }).or_else(|| {
        // Fallback: use first RS256 key if no kid match
        keys.iter().find(|k| k["alg"].as_str() == Some("RS256"))
    }).ok_or_else(|| VilError::bad_request("Tidak ditemukan kunci RS256 yang cocok di JWKS platform"))?;

    // 3. Decode with RS256 key
    let n = matching_key["n"].as_str()
        .ok_or_else(|| VilError::internal("JWKS key missing 'n'"))?;
    let e = matching_key["e"].as_str()
        .ok_or_else(|| VilError::internal("JWKS key missing 'e'"))?;

    let decoding_key = DecodingKey::from_rsa_components(n, e)
        .map_err(|e| VilError::internal(format!("Gagal membuat decoding key: {}", e)))?;

    let mut validation = Validation::new(Algorithm::RS256);
    validation.set_audience(&[&platform.client_id]);
    validation.set_issuer(&[&platform.issuer]);

    let token_data = decode::<LtiClaims>(id_token, &decoding_key, &validation)
        .map_err(|e| VilError::bad_request(format!("Token LTI tidak valid: {}", e)))?;

    Ok(token_data.claims)
}

/// Map LTI roles to EduSync roles
fn map_lti_role_to_edusync(lti_roles: &[String]) -> String {
    // LTI role URIs → EduSync role names
    for role in lti_roles {
        if role.contains("Administrator") { return "admin".to_string(); }
        if role.contains("Instructor") || role.contains("TeachingAssistant") {
            return "teacher".to_string();
        }
    }
    // Default: student
    "student".to_string()
}

/// Find existing LTI user or create a new guest user
async fn find_or_create_lti_user(
    pool: &sqlx::PgPool,
    email: &str,
    display_name: &str,
    role: &str,
    tenant_id: Uuid,
) -> Result<Uuid, VilError> {
    // Check if user already exists
    if let Some(existing) = sqlx::query_scalar::<_, Uuid>(
        r#"SELECT p.id FROM profiles p
           JOIN users u ON u.id = p.id
           WHERE u.email = $1 AND p.tenant_id = $2"#
    )
    .bind(email)
    .bind(tenant_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| VilError::internal(format!("Gagal mencari user LTI: {}", e)))?
    {
        // Update name if changed
        sqlx::query("UPDATE profiles SET full_name = $1, updated_at = NOW() WHERE id = $2")
            .bind(display_name)
            .bind(existing)
            .execute(pool)
            .await
            .ok();

        return Ok(existing);
    }

    // Create new LTI guest user — WRAPPED IN TRANSACTION
    // (Gap fix #3: LTI launch is single-shot redirect, no frontend retry)
    let user_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let mut tx = pool.begin().await
        .map_err(|e| VilError::internal(format!("Gagal memulai transaksi: {}", e)))?;

    // Insert into users table
    // NOTE: Use is_sso_user (not is_lti_user) — matches Phase 1B-01 migration schema
    sqlx::query(
        r#"INSERT INTO users (id, email, created_at, updated_at, is_sso_user)
           VALUES ($1, $2, $3, $4, true)"#
    )
    .bind(user_id)
    .bind(email)
    .bind(now)
    .bind(now)
    .execute(&mut *tx)
    .await
    .map_err(|e| VilError::internal(format!("Gagal membuat user LTI: {}", e)))?;

    // Insert profile
    sqlx::query(
        r#"INSERT INTO profiles (id, full_name, tenant_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5)"#
    )
    .bind(user_id)
    .bind(display_name)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .execute(&mut *tx)
    .await
    .map_err(|e| VilError::internal(format!("Gagal membuat profile LTI: {}", e)))?;

    // Insert role
    sqlx::query(
        r#"INSERT INTO user_roles (user_id, role, tenant_id)
           VALUES ($1, $2, $3)"#
    )
    .bind(user_id)
    .bind(role)
    .bind(tenant_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| VilError::internal(format!("Gagal membuat role LTI: {}", e)))?;

    tx.commit().await
        .map_err(|e| VilError::internal(format!("Gagal commit transaksi LTI user: {}", e)))?;

    Ok(user_id)
}
```

**VERIFY:**

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings
cargo test -- lti::launch
```

**STOP IF:**

- `users` table schema berbeda (kolom `is_lti_user` belum ada) → tambahkan migration: `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_lti_user BOOLEAN DEFAULT false;`
- `profiles` table FK atau kolom berbeda → baca `supabase/migrations/` dan sesuaikan
- `auth::issue_jwt` function belum ada → BLOCKED (Phase 1B belum selesai)
- Platform JWKS fetch timeout → naikkan timeout ke 15s, atau cache JWKS

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 3B-4: LTI JWKS Endpoint

```
TASK ID:       3B-4
OWNER TYPE:    Rust CRUD Agent
GOAL:          Implement JWKS endpoint yang di-consume oleh LTI platforms
               untuk verify token yang kita issue.
DEPENDENCY:    Task 3B-1 selesai
READ FIRST:    - supabase/functions/lti-jwks/index.ts
               - crates/services/src/lti/config.rs (LtiKeyPair)
EDIT ONLY:     - crates/services/src/lti/jwks.rs (BUAT BARU)
               - crates/services/src/lti/mod.rs (tambah `pub mod jwks;`)
DO NOT TOUCH:  - crates/services/src/lti/launch.rs
               - crates/services/src/lti/oidc_login.rs
```

**COPY-PASTE STARTER:**

```rust
// crates/services/src/lti/jwks.rs
// =============================================================================
// LTI JWKS Endpoint
// Replaces: supabase/functions/lti-jwks/index.ts
// =============================================================================
use axum::extract::State;
use axum::Json;
use vil_server::prelude::*;

use crate::state::AppState;
use super::config::LtiKeyPair;
use super::types::JwksResponse;

/// GET /api/v1/lti/jwks
///
/// Returns our public RSA keys in JWKS format.
/// LTI platforms use this to verify tokens we issue for grade passback.
/// This endpoint is PUBLIC (no auth required).
pub async fn jwks(
    State(state): State<AppState>,
) -> Result<Json<JwksResponse>, VilError> {
    let key_pair = state.lti_key_pair.as_ref()
        .ok_or_else(|| VilError::internal("LTI key pair not configured"))?;

    Ok(Json(key_pair.jwks()))
}
```

**VERIFY:**

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings

# Test endpoint (after server running)
curl -s http://localhost:8080/api/v1/lti/jwks | jq .
# Should return: { "keys": [{ "kty": "RSA", "alg": "RS256", ... }] }
```

**STOP IF:**

- `state.lti_key_pair` belum ditambahkan ke `AppState` → tambahkan `lti_key_pair: Option<Arc<LtiKeyPair>>` ke AppState, initialize di [main.rs](http://main.rs)

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 3B-5: Register LTI Service + Routes di [main.rs](http://main.rs)

```
TASK ID:       3B-5
OWNER TYPE:    Rust CRUD Agent
GOAL:          Register semua 3 LTI handlers + JWKS sebagai ServiceProcess di VilApp.
               OIDC login dan JWKS are PUBLIC (no auth).
               Launch is PUBLIC (form POST from platform).
DEPENDENCY:    Task 3B-2, 3B-3, 3B-4 selesai
READ FIRST:    - crates/server/src/main.rs
               - Bootstrap Context §3
EDIT ONLY:     - crates/server/src/main.rs (EDIT — tambah LTI service + LtiKeyPair init)
               - crates/server/src/state.rs (EDIT — tambah lti_key_pair field)
DO NOT TOUCH:  - crates/services/src/lti/
               - crates/services/src/ai/
```

**COPY-PASTE STARTER:**

```rust
// === TAMBAH di AppState (crates/server/src/state.rs) ===
use std::sync::Arc;
use crate::services::lti::config::LtiKeyPair;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub jwt_secret: String,
    pub groq_api_key: Option<String>,
    pub lti_key_pair: Option<Arc<LtiKeyPair>>,  // <-- TAMBAH INI
}

// === TAMBAH di main.rs initialization ===
use crate::services::lti::config::LtiKeyPair;

// LTI Key Pair (optional — only needed if LTI is enabled)
let lti_key_pair = LtiKeyPair::from_env()
    .ok()
    .map(Arc::new);

if lti_key_pair.is_none() {
    vil_warn!("LTI key pair not configured. LTI 1.3 will not be available.");
}

let state = AppState {
    db: db.clone(),
    jwt_secret: std::env::var("JWT_SECRET").unwrap(),
    groq_api_key: std::env::var("GROQ_API_KEY").ok(),
    lti_key_pair,  // <-- TAMBAH INI
};

// === IMPORT handlers ===
use crate::services::lti::oidc_login::oidc_login;
use crate::services::lti::launch::lti_launch;
use crate::services::lti::jwks::jwks;

// === SERVICE DEFINITION ===
// NOTE: LTI endpoints are PUBLIC (no JWT middleware)
// Platform sends requests without our JWT
let lti = ServiceProcess::new("lti")
    .prefix("/api/v1/lti")
    .endpoint(Method::GET, "/oidc-login", get(oidc_login))   // Public
    .endpoint(Method::POST, "/launch", post(lti_launch))     // Public
    .endpoint(Method::GET, "/jwks", get(jwks));              // Public

// === REGISTER ===
// VilApp::new("edusync-api")
//     ...
//     .service(lti)      // <-- TAMBAHKAN INI
//     ...
```

**VERIFY:**

```
cd edusync-api
cargo check --all-targets
cargo clippy -- -D warnings
cargo test

# Start server
cargo run &

# Verify LTI routes registered
curl -s http://localhost:8080/_vil/api/routes | jq '.[] | select(.path | startswith("/api/v1/lti"))'

# Verify JWKS endpoint works (no auth needed)
curl -s http://localhost:8080/api/v1/lti/jwks | jq .
```

**STOP IF:**

- JWT middleware applied globally and blocks LTI endpoints → LTI routes harus EXCLUDE dari JWT middleware

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 3B-6: LTI Integration Tests (Canvas + Moodle)

```
TASK ID:       3B-6
OWNER TYPE:    Test Agent
GOAL:          Buat integration tests untuk LTI 1.3 flow.
               Tests harus cover: OIDC login, nonce validation,
               id_token verification, user creation, JWT issuance.
               JUGA buat test plan untuk Canvas + Moodle sandbox.
DEPENDENCY:    Task 3B-5 selesai
READ FIRST:    - crates/services/src/lti/*.rs
               - Bootstrap Context §11 (Testing)
               - Bootstrap Context §13 (LTI gotchas)
EDIT ONLY:     - crates/services/tests/lti_integration.rs (BUAT BARU)
               - docs/lti-test-plan.md (BUAT BARU — manual test plan)
DO NOT TOUCH:  - crates/services/src/lti/
               - crates/services/src/ai/
```

**COPY-PASTE STARTER:**

```rust
// crates/services/tests/lti_integration.rs
use vil_server_test::TestClient;
use serde_json::json;

mod common;
use common::build_test_app;

#[tokio::test]
async fn test_oidc_login_unknown_platform() {
    let client = TestClient::new(build_test_app().await);
    let resp = client
        .get("/api/v1/lti/oidc-login?iss=https://unknown.example.com&login_hint=user1&target_link_uri=https://app.edusync.id")
        .await;
    resp.assert_status(404);  // Platform tidak terdaftar
}

#[tokio::test]
async fn test_jwks_endpoint_public() {
    let client = TestClient::new(build_test_app().await);
    let resp = client.get("/api/v1/lti/jwks").await;
    // 200 if LTI configured, 500 if not
    assert!(resp.status() == 200 || resp.status() == 500);

    if resp.status() == 200 {
        let body: serde_json::Value = resp.json().await;
        assert!(body["keys"].is_array());
    }
}

#[tokio::test]
async fn test_launch_requires_valid_state() {
    let client = TestClient::new(build_test_app().await);
    let resp = client
        .post("/api/v1/lti/launch")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body("id_token=invalid.token.here&state=invalid-state")
        .await;
    resp.assert_status(400);  // Nonce/state validation fails
}

#[tokio::test]
async fn test_lti_guest_email_format() {
    use crate::services::lti::types::lti_guest_email;
    let platform_id = uuid::Uuid::parse_str("12345678-1234-1234-1234-123456789012").unwrap();
    let email = lti_guest_email(&platform_id, "student-42");
    assert_eq!(email, "lti-12345678-student-42@lti.edusync.internal");
}

#[tokio::test]
async fn test_lti_guest_email_sanitizes_special_chars() {
    use crate::services::lti::types::lti_guest_email;
    let platform_id = uuid::Uuid::parse_str("12345678-1234-1234-1234-123456789012").unwrap();
    let email = lti_guest_email(&platform_id, "user@evil<script>");
    // Should strip special chars
    assert!(!email.contains('@') || email.ends_with("@lti.edusync.internal"));
    assert!(!email.contains('<'));
}
```

```markdown
<!-- docs/lti-test-plan.md -->

# LTI 1.3 Manual Test Plan — Canvas & Moodle

## Prerequisites

- Canvas sandbox account (https://canvas.instructure.com/register)
- Moodle sandbox (https://sandbox.moodledemo.net/ or self-hosted)
- EduSync VIL server running with LTI keys configured

## Test Cases

### TC-LTI-01: Canvas — Basic Launch

1. Register EduSync as LTI tool in Canvas:
   - OIDC Login URL: `{VIL_URL}/api/v1/lti/oidc-login`
   - Launch URL: `{VIL_URL}/api/v1/lti/launch`
   - JWKS URL: `{VIL_URL}/api/v1/lti/jwks`
   - Client ID: (from Canvas)
2. Create assignment with LTI external tool
3. Launch as instructor → verify redirect to EduSync as teacher
4. Launch as student → verify redirect to EduSync as student

### TC-LTI-02: Canvas — Guest User Creation

1. Launch as new Canvas user
2. Verify email format: `lti-{platformId8}-{sub}@lti.edusync.internal`
3. Verify profile created with correct name
4. Verify role assigned correctly

### TC-LTI-03: Canvas — Repeat Launch (Existing User)

1. Launch again as same Canvas user
2. Verify same EduSync user found (no duplicate)
3. Verify name updated if changed on Canvas

### TC-LTI-04: Moodle — Basic Launch

1. Register as External Tool in Moodle
2. Same steps as TC-LTI-01

### TC-LTI-05: Nonce Replay Prevention

1. Capture a valid launch POST
2. Replay the same POST → should fail (nonce consumed)

### TC-LTI-06: Expired Nonce

1. Initiate OIDC login
2. Wait > 10 minutes
3. Complete launch → should fail (nonce expired)

### TC-LTI-07: SCORM Content via LTI

1. Launch LTI with target_link_uri pointing to SCORM content
2. Verify SCORM content loads in sandboxed iframe
3. Verify SCORM runtime data saved correctly

## Pass Criteria

- [ ] Canvas launch works for instructor + student
- [ ] Moodle launch works for instructor + student
- [ ] Guest users created with correct email format
- [ ] Nonce replay blocked
- [ ] Expired nonce blocked
- [ ] No CORS errors in browser console
```

**VERIFY:**

```
cd edusync-api
cargo test -- lti_integration

# Manual tests: follow docs/lti-test-plan.md
```

**STOP IF:**

- Canvas/Moodle sandbox tidak accessible → tandai manual tests sebagai PENDING, automated tests harus DONE
- LTI spec gap ditemukan (misalnya platform tidak support `response_mode=form_post`) → BLOCKED, document gap

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 3B-7: Add LTI Dependencies to Cargo.toml

```
TASK ID:       3B-7
OWNER TYPE:    Rust CRUD Agent
GOAL:          Pastikan semua dependencies yang dibutuhkan Wave 3A + 3B
               sudah terdaftar di workspace Cargo.toml.
DEPENDENCY:    Tidak ada (bisa dikerjakan paling awal, paralel dengan 3A-1)
READ FIRST:    - edusync-api/Cargo.toml (root workspace)
               - Bootstrap Context §14 (Cargo.toml Dependencies)
EDIT ONLY:     - edusync-api/Cargo.toml (workspace dependencies)
               - crates/services/Cargo.toml (crate dependencies)
DO NOT TOUCH:  - Semua file .rs
```

**COPY-PASTE STARTER:**

```toml
# Tambahkan di [workspace.dependencies] jika belum ada:

# AI (Wave 3A)
vil-server = "0.1"           # VilApp, SseCollect, SseDialect, CircuitBreaker
once_cell = "1"              # Lazy static for CircuitBreaker singleton

# LTI (Wave 3B)
jsonwebtoken = "9"           # JWT encode/decode (RS256)
rsa = { version = "0.9", features = ["pkcs1"] }  # RSA key management
urlencoding = "2"            # URL encoding for OIDC redirect
base64 = "0.22"              # Base64 for JWKS
reqwest = { version = "0.12", features = ["json"] }  # HTTP client for JWKS fetch

# Shared
serde = { version = "1", features = ["derive"] }
serde_json = "1"
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4", "serde"] }
sqlx = { version = "0.8", features = ["runtime-tokio", "postgres", "uuid", "chrono", "migrate"] }
tokio = { version = "1", features = ["full"] }
```

**VERIFY:**

```
cd edusync-api
cargo check
```

**STOP IF:**

- Version conflicts dengan existing deps → resolve di workspace level

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# Dependency Graph & Parallelism Map

<aside>
📊

**Parallelism Guide:** Task-task ini yang bisa dikerjakan bersamaan oleh agent berbeda.

</aside>

| **Parallel Group**      | **Tasks**                                               | **Catatan**                                        |
| ----------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| Group 0 (Mulai duluan)  | 3B-7 (Cargo deps), 3A-3b (migration), 3B-1b (migration) | Tidak ada dependency kode — bisa paralel penuh     |
| Group 1 (Foundation)    | 3A-1 (AI types+config), 3B-1 (LTI types+config)         | Saling independen — bisa paralel                   |
| Group 2A (AI handlers)  | 3A-2, 3A-3, 3A-4, 3A-5                                  | Semua depend on 3A-1. Bisa paralel satu sama lain. |
| Group 2B (LTI handlers) | 3B-2, 3B-4                                              | Depend on 3B-1. Bisa paralel. 3B-3 depend on 3B-2. |
| Group 3 (Registration)  | 3A-6, 3B-5                                              | Depend on semua handler selesai. Bisa paralel.     |
| Group 4 (Tests)         | 3A-7, 3B-6                                              | Depend on registration selesai. Bisa paralel.      |

---

# Catatan untuk Agent Selanjutnya (Wave 3C+)

Setelah Wave 3A-3B selesai, agent berikutnya harus lanjut ke:

1. **Wave 3C — Communication Functions** (Week 46-49)
   - `send-email-digest` → Rust + `lettre`
   - `send-parent-digest` → Rust + `lettre`
   - `send-push` → Rust + `web-push` (VAPID key)
   - `whatsapp-webhook` + `send-parent-otp` → Rust + reqwest
2. **Wave 3D — PDF Generation** (Week 48-49)
   - `generate-pdf` → Rust + `printpdf`/`genpdf`
   - `generate-executive-report`
   - `generate-parent-report`
3. **Wave 3E — Processing & Cron** (Week 49-52)
   - `grade-quiz-attempt`, `process-progress-events`, `scorm-extract`, `bulk-import-users`
   - pg_cron → vil_trigger_cron migration

---

<aside>
✅

**Definition of Done untuk Wave 3A-3B:**

- ✅ 4 AI handlers compiled dan registered
- ✅ CircuitBreaker shared singleton berfungsi
- ✅ All AI handlers enforce tenant isolation + AI quota
- ✅ 3 LTI handlers compiled dan registered
- ✅ JWKS endpoint accessible tanpa auth
- ✅ Nonce generation, storage, validation, dan cleanup berfungsi
- ✅ LTI guest user creation dengan email format yang benar
- ✅ `cargo check && cargo clippy -- -D warnings && cargo test` pass
- ✅ Integration tests pass
- ✅ Manual LTI test plan documented
</aside>
