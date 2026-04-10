# Phase 3: Edge Functions → VIL Services — Week 39-52 Detail

<aside>
🎯

**Goal:** Port 22 Edge Functions (~7,900 lines Deno TypeScript) ke Rust handlers + migrasi background jobs dari pg_cron ke vil_trigger_cron.

**Duration:** 14 minggu | **Effort:** ~200 jam | **Deliverable:** Zero Edge Functions remaining

</aside>

---

## Week 39-43: AI Functions

### Week 39-40: ai-grade-essay (187 lines)

<aside>
🦀

**VIL built-in yang digunakan:** `SseCollect` + `SseDialect::openai()` untuk proxy ke Groq, `CircuitBreaker` untuk fault tolerance. Tidak perlu implement dari scratch.

</aside>

```rust
// crates/services/src/ai/grading.rs
use vil_server::ai::sse_collect::SseCollect;
use vil_server::ai::SseDialect;
use vil_server::auth::circuit_breaker::{CircuitBreaker, CircuitBreakerConfig};
use std::time::Duration;

// VIL built-in circuit breaker
static GROQ_CB: once_cell::sync::Lazy<CircuitBreaker> = once_cell::sync::Lazy::new(|| {
    CircuitBreaker::new("groq-api", CircuitBreakerConfig {
        failure_threshold: 5,
        cooldown: Duration::from_secs(30),
        ..Default::default()
    })
});

pub async fn grade_essay(
    essay: &str,
    rubric: &Rubric,
    groq_api_key: &str,
) -> Result<GradeResult, VilError> {
    // VIL built-in circuit breaker check
    GROQ_CB.check().map_err(|_| VilError::service_unavailable("AI service temporarily unavailable"))?;

    let prompt = build_grading_prompt(essay, rubric);

    // VIL SseCollect — proxy ke Groq with correct done-signal handling
    let content = SseCollect::post_to("https://api.groq.com/openai/v1/chat/completions")
        .dialect(SseDialect::openai())     // Handles data: [DONE] signal
        .bearer_token(groq_api_key)
        .body(serde_json::json!({
            "model": "llama-3.3-70b",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "stream": true
        }))
        .collect_text().await;

    match content {
        Ok(text) => {
            GROQ_CB.record_success();
            parse_grade_response(&text)
        }
        Err(e) => {
            GROQ_CB.record_failure();
            Err(VilError::internal(format!("AI grading failed: {}", e)))
        }
    }
}
```

### Week 40-42: ai-tutor (674 lines — paling kompleks)

<aside>
🦀

**VIL `SseCollect`** handles streaming proxy ke Groq API secara otomatis — termasuk done-signal detection per dialect. Agent cukup fokus pada conversation state management.

</aside>

```rust
// crates/services/src/ai/tutor.rs
use vil_server::prelude::*;
use vil_server::ai::sse_collect::SseCollect;
use vil_server::ai::SseDialect;

/// AI Tutor session state (persisted di DB)
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct TutorSession {
    pub id: Uuid,
    pub student_id: Uuid,
    pub course_id: Uuid,
    pub lesson_id: Option<Uuid>,
    pub messages_json: serde_json::Value,  // Conversation history
    pub created_at: DateTime<Utc>,
}

/// Context injection: lesson content + student progress
pub struct TutorContext {
    pub lesson_content: String,
    pub student_progress: StudentProgress,
    pub struggle_score: f64,
    pub recent_quiz_scores: Vec<f64>,
}

async fn tutor_chat(
    State(state): State<AppState>,
    Json(body): Json<TutorChatRequest>,
) -> Result<Json<TutorChatResponse>, VilError> {
    // 1. Load or create session from DB via sqlx
    let session = load_or_create_session(&state.db, &body).await?;

    // 2. Inject context (lesson content, student progress)
    let context = build_context(&state.db, &session).await?;

    // 3. Build prompt with conversation history + context
    let messages = build_messages(&session, &context, &body.message);

    // 4. VIL built-in circuit breaker check
    GROQ_CB.check().map_err(|_| VilError::service_unavailable("AI tutor sementara tidak tersedia"))?;

    // 5. VIL SseCollect — streaming proxy ke Groq
    let content = SseCollect::post_to("https://api.groq.com/openai/v1/chat/completions")
        .dialect(SseDialect::openai())
        .bearer_token(&state.groq_api_key.as_deref().unwrap_or_default())
        .body(serde_json::json!({
            "model": "llama-3.3-70b",
            "messages": messages,
            "stream": true,
            "temperature": 0.7
        }))
        .collect_text().await
        .map_err(|e| { GROQ_CB.record_failure(); VilError::internal(e.to_string()) })?;

    GROQ_CB.record_success();

    // 6. Save message to DB
    save_message(&state.db, &session.id, &body.message, &content).await?;

    // 7. Increment AI quota
    sqlx::query("SELECT increment_ai_usage($1)")
        .bind(&body.tenant_id)
        .execute(&state.db).await.ok();

    // 8. Return response
    Ok(Json(TutorChatResponse { content, session_id: session.id }))
}
```

### Week 42-43: generate-ai-content + generate-quiz-from-content

```rust
#[post("/api/v1/ai/generate-content")]
async fn generate_content(
    State(ctx): State<AppContext>,
    claims: Claims,
    Json(body): Json<GenerateContentRequest>,
) -> Result<Json<GeneratedContent>, AppError> {
    // Content validation (Phase 31A contentValidator)
    // Profanity check, quality scoring, moderation flagging
}

#[post("/api/v1/ai/generate-quiz")]
async fn generate_quiz(
    State(ctx): State<AppContext>,
    claims: Claims,
    Json(body): Json<GenerateQuizRequest>,
) -> Result<Json<GeneratedQuiz>, AppError> {
    // Generate quiz questions from lesson content
    // Validate question structure
}
```

---

## Week 43-46: LTI 1.3 Functions

### Week 43-44: OIDC Login + Launch

```rust
// crates/services/src/lti/mod.rs
use jsonwebtoken::{encode, decode, Algorithm, EncodingKey};

/// LTI OIDC initiation (replaces lti-oidc-login Edge Function)
#[get("/api/v1/lti/oidc-login")]
async fn oidc_login(
    State(ctx): State<AppContext>,
    Query(params): Query<OidcLoginParams>,
) -> Result<Redirect, AppError> {
    // 1. Validate platform registration
    // 2. Generate nonce (store in lti_nonces table — service_role only)
    // 3. Build auth redirect URL
    // 4. Redirect to platform
}

/// LTI launch (replaces lti-launch Edge Function)
#[post("/api/v1/lti/launch")]
async fn lti_launch(
    State(ctx): State<AppContext>,
    Form(body): Form<LtiLaunchForm>,
) -> Result<Redirect, AppError> {
    // 1. Validate id_token (RS256)
    // 2. Check nonce (prevent replay)
    // 3. Extract claims (sub, email, roles)
    // 4. Guest user email: lti-{platformId8}-{sub}@lti.edusync.internal
    // 5. Create/update user
    // 6. Generate JWT
    // 7. Redirect to app with token
    // LTI error handler from Phase 31B available
}
```

### Week 45: JWKS Endpoint

```rust
/// Public JWKS (replaces lti-jwks Edge Function)
#[get("/api/v1/lti/jwks")]
async fn jwks(State(ctx): State<AppContext>) -> Json<JwksResponse> {
    // Return RSA public key in JWKS format
    // Used by LTI platforms to verify our tokens
}
```

### Week 46: LTI Testing

- Test against Canvas sandbox
- Test against Moodle sandbox
- Verify grade passback works
- SCORM content still runs in sandboxed iframe

---

## Week 46-49: Communication Functions

### Week 46-47: Email

```rust
// crates/services/src/email.rs
use lettre::{SmtpTransport, Transport, Message};

/// Send email digest (replaces send-email-digest Edge Function)
pub async fn send_digest(
    smtp: &SmtpTransport,
    to: &str,
    subject: &str,
    html_body: &str,
) -> Result<(), Error> {
    let email = Message::builder()
        .from("EduSync <noreply@edusync.id>".parse()?)
        .to(to.parse()?)
        .subject(subject)
        .header(lettre::message::header::ContentType::TEXT_HTML)
        .body(html_body.to_string())?;

    smtp.send(&email)?;
    Ok(())
}

/// Send parent digest (replaces send-parent-digest Edge Function)
/// Scheduled daily at 17:00 WIB via vil_trigger_cron
pub async fn send_parent_digest(
    pool: &PgPool,
    smtp: &SmtpTransport,
    tenant_id: Uuid,
) -> Result<u32, Error> {
    // 1. Fetch all parents with linked children
    // 2. For each parent, generate digest (activities, grades, attendance)
    // 3. Send email
    // 4. Return count sent
}
```

### Week 47-48: Push + WhatsApp

```rust
// Push notifications (replaces send-push Edge Function)
// VAPID key from VITE_VAPID_PUBLIC_KEY
use web_push::{WebPushClient, WebPushMessage, SubscriptionInfo};

pub async fn send_push(
    client: &WebPushClient,
    subscription: &SubscriptionInfo,
    title: &str,
    body: &str,
) -> Result<(), Error> { /* ... */ }

// WhatsApp (replaces whatsapp-webhook + send-parent-otp)
pub async fn send_whatsapp_otp(
    client: &reqwest::Client,
    phone: &str,
    otp_code: &str,
    provider_api_key: &str,
) -> Result<(), Error> { /* ... */ }
```

### Week 48-49: PDF Generation

```rust
// Replaces generate-pdf, generate-executive-report, generate-parent-report
use printpdf::*;

pub fn generate_certificate(
    student_name: &str,
    course_name: &str,
    date: &str,
    school_logo: Option<&[u8]>,
) -> Result<Vec<u8>, Error> {
    let (doc, page1, layer1) = PdfDocument::new(
        "Certificate", Mm(297.0), Mm(210.0), "Layer 1",  // A4 landscape
    );
    // Build certificate PDF with school branding
    Ok(doc.save_to_bytes()?)
}

pub fn generate_executive_report(
    data: &ExecutiveReportData,
) -> Result<Vec<u8>, Error> {
    // Principal report: adoption metrics, academic performance, ROI
}

pub fn generate_parent_report(
    child: &ChildData,
    grades: &[Grade],
    attendance: &AttendanceRecord,
) -> Result<Vec<u8>, Error> {
    // Monthly progress report per child
}
```

---

## Week 49-52: Processing, SCORM & Background Jobs

### Week 49-50: Processing Functions

| **Edge Function** | **VIL Replacement** | **Complexity** |
| --- | --- | --- |
| `grade-quiz-attempt` | Background quiz grading service | Medium |
| `process-progress-events` | Batch progress processor | Medium |
| `progress-events` | Event enqueue endpoint | Low |
| `load-quiz-data` | Quiz data loader | Low |
| `scorm-extract` | SCORM ZIP extraction — `zip`  • `quick-xml` crates | Medium |
| `bulk-import-users` | Bulk import (Phase 31 hardened) | Medium |
| `health-check` | Already done in Phase 1 | Done ✅ |
| `check-rate-limit` | Already done in Phase 1 | Done ✅ |

**SCORM gotchas:**

- SCORM content runs in sandboxed `<iframe>`
- SCORM API bridge attached to parent `window`
- `scorm_runtime_data.lesson_status` has sticky terminal states: once `completed`/`passed`, cannot revert
- `lesson_resources.type` CHECK constraint includes `'scorm'`

### 🆕 Week 50-52: Background Jobs / Cron Migration

<aside>
⚠️

**Gap yang sering terlewat!** Supabase pakai `pg_cron` untuk scheduled tasks. Harus audit dan port semua ke `vil_trigger_cron`.

</aside>

```rust
// crates/api-server/src/cron.rs
use vil_server::cron::CronScheduler;

pub fn register_cron_jobs(scheduler: &CronScheduler, pool: PgPool) {
    // 1. Email digest — daily 17:00 WIB
    scheduler.add("0 10 * * *", move || {  // 10:00 UTC = 17:00 WIB
        let pool = pool.clone();
        async move {
            send_email_digests(&pool).await;
        }
    });

    // 2. Parent digest — daily 17:00 WIB
    scheduler.add("0 10 * * *", move || {
        async move { send_parent_digests(&pool).await; }
    });

    // 3. Analytics materialized view refresh — every 15 min
    scheduler.add("*/15 * * * *", move || {
        async move {
            sqlx::query("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_teacher_analytics")
                .execute(&pool).await.ok();
        }
    });

    // 4. Cleanup expired data — daily 02:00 WIB
    scheduler.add("0 19 * * *", move || {  // 19:00 UTC = 02:00 WIB+1
        async move {
            sqlx::query("SELECT cleanup_expired_notification_data()")
                .execute(&pool).await.ok();
        }
    });

    // 5. AI quota reset — monthly 1st 00:00 WIB
    scheduler.add("0 17 1 * *", move || {  // 17:00 UTC = 00:00 WIB+1
        async move { reset_ai_quotas(&pool).await; }
    });

    // 6. XAPI queue flush — every 30 seconds
    scheduler.add("*/30 * * * * *", move || {
        async move { flush_xapi_queue(&pool).await; }
    });
}
```

---

## Week 52: Phase 3 Gate Review

| **Criteria** | **Target** | **Status** |
| --- | --- | --- |
| All 22 Edge Functions ported | Zero Deno functions remaining | ⬜ |
| AI functions work with Groq | Grade essay, tutor, content gen, quiz gen | ⬜ |
| LTI works with Canvas/Moodle | OIDC login + launch + grade passback | ⬜ |
| Email/push/WhatsApp work | Digests sent, OTP delivered | ⬜ |
| PDF generation works | Certificate, executive report, parent report | ⬜ |
| Background jobs running | All pg_cron jobs ported to vil_trigger_cron | ⬜ |
| SCORM extraction works | ZIP upload → content available | ⬜ |

<aside>
🚪

**Gate 4:** Jika VIL stability bermasalah (crashes, memory leaks) → fork VIL atau switch ke **Axum** langsung.

</aside>