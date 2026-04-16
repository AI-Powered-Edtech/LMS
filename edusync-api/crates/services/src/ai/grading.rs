/// AI Essay Grading handler.
///
/// Ports `supabase/functions/ai-grade-essay/index.ts`.
///
/// Auth: teacher / principal / admin only (students cannot grade).
/// Rate limit: 50 calls per user per hour (checked via `ai_quota_usage` table).
/// CircuitBreaker: checked before every Groq call.
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use vil_server::prelude::{HandlerResult, VilError, VilResponse};

use crate::ai::config::{
    groq_circuit_breaker, AI_RATE_LIMIT_PER_HOUR, GROQ_API_URL, GROQ_MODEL, MAX_ESSAY_CHARS,
};
use crate::ai::types::{GradeEssayRequest, GradeEssayResponse};
use vil_server::prelude::{SseCollect, SseDialect};

// ─── Rate-limit check ─────────────────────────────────────────────────────────

/// Verify the user has not exceeded AI_RATE_LIMIT_PER_HOUR calls in the last hour.
/// Queries `ai_quota_usage` table by (user_id, created_at > now() - 1h).
///
/// Fails open (allows the call) if the table query itself errors, to prevent
/// a bad rate-limit table from blocking all AI usage.
async fn check_rate_limit(db: &PgPool, user_id: Uuid, tenant_id: Uuid) -> Result<(), VilError> {
    let count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*)
           FROM public.ai_quota_usage
           WHERE user_id = $1
             AND tenant_id = $2
             AND created_at > NOW() - INTERVAL '1 hour'"#,
    )
    .bind(user_id)
    .bind(tenant_id)
    .fetch_one(db)
    .await
    .unwrap_or(0); // fail open

    if count >= AI_RATE_LIMIT_PER_HOUR {
        return Err(VilError::rate_limited());
    }
    Ok(())
}

/// Record one AI usage event.
async fn record_usage(db: &PgPool, user_id: Uuid, tenant_id: Uuid, endpoint: &str) {
    let _ = sqlx::query(
        r#"INSERT INTO public.ai_quota_usage (id, user_id, tenant_id, endpoint, created_at)
           VALUES ($1, $2, $3, $4, NOW())"#,
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(tenant_id)
    .bind(endpoint)
    .execute(db)
    .await;
}

// ─── Tenant access validation ─────────────────────────────────────────────────

/// Confirm the assignment referenced by `submission_id` belongs to `tenant_id`.
/// `submission_id` format: `<assignmentId>-<studentId>` (first segment is the UUID).
async fn validate_tenant_access(
    db: &PgPool,
    submission_id: &str,
    tenant_id: Uuid,
) -> Result<(), VilError> {
    // Extract assignment UUID — first UUID-shaped segment before '-'
    let assignment_id_str = submission_id
        .split('-')
        .take(5) // UUID has 5 dash-separated groups
        .collect::<Vec<_>>()
        .join("-");

    let assignment_id = assignment_id_str
        .parse::<Uuid>()
        .map_err(|_| VilError::bad_request("Format submissionId tidak valid"))?;

    let row = sqlx::query_scalar::<_, Uuid>(
        r#"SELECT tenant_id FROM public.assignments WHERE id = $1 LIMIT 1"#,
    )
    .bind(assignment_id)
    .fetch_optional(db)
    .await
    .map_err(|e| VilError::internal(e.to_string()))?
    .ok_or_else(|| VilError::not_found("Pengiriman tidak ditemukan"))?;

    if row != tenant_id {
        tracing::warn!(
            assignment_id = %assignment_id,
            expected_tenant = %tenant_id,
            found_tenant = %row,
            "grade_essay: tenant mismatch"
        );
        return Err(VilError::not_found("Pengiriman tidak ditemukan")); // Don't leak cross-tenant info
    }
    Ok(())
}

// ─── Groq call ────────────────────────────────────────────────────────────────

async fn call_groq_grader(
    essay_text: &str,
    rubric_text: &str,
) -> Result<GradeEssayResponse, VilError> {
    let system_prompt = r#"Kamu adalah guru ahli yang menilai esai secara ketat dan adil.
Nilai esai berdasarkan rubrik yang diberikan.
Untuk setiap kriteria, berikan skor sampai skor maksimum yang ditentukan dan tulis umpan balik singkat yang konstruktif.
Terakhir, berikan ringkasan umpan balik keseluruhan.
Selalu kembalikan objek JSON dengan tepat tiga kunci berikut:
- "scores": objek yang memetakan nama kriteria ke nilai numeriknya.
- "feedback": objek yang memetakan nama kriteria ke string umpan balik spesifiknya.
- "overallFeedback": string yang merangkum umpan balik keseluruhan."#;

    let user_prompt = format!("Rubrik:\n{rubric_text}\n\nEsai:\n{essay_text}");

    let api_key = std::env::var("GROQ_API_KEY")
        .map_err(|_| VilError::internal("GROQ_API_KEY tidak dikonfigurasi"))?;

    let cb = groq_circuit_breaker();
    if !cb.is_closed() {
        return Err(VilError::service_unavailable(
            "Layanan AI sedang tidak tersedia, coba lagi nanti",
        ));
    }

    let messages = serde_json::json!([
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": user_prompt}
    ]);

    let result = SseCollect::post_to(GROQ_API_URL)
        .dialect(SseDialect::openai())
        .bearer_token(&api_key)
        .body(serde_json::json!({
            "model": GROQ_MODEL,
            "messages": messages,
            "temperature": 0.1,
            "max_tokens": 1024,
            "response_format": {"type": "json_object"},
            "stream": true
        }))
        .collect_text()
        .await;

    let content = match result {
        Ok(text) => {
            cb.record_success();
            text
        }
        Err(e) => {
            cb.record_failure();
            return Err(VilError::internal(format!("AI grading gagal: {e}")));
        }
    };

    if content.trim().is_empty() {
        cb.record_failure();
        return Err(VilError::internal("Groq returned empty response"));
    }

    let parsed: GradeEssayResponse = serde_json::from_str(&content).map_err(|e| {
        tracing::error!("groq_parse_error: {e}, raw: {content}");
        VilError::internal("Format respons AI tidak valid")
    })?;

    if parsed.scores.is_empty() || parsed.feedback.is_empty() || parsed.overall_feedback.is_empty()
    {
        cb.record_failure();
        return Err(VilError::internal(
            "Respons AI tidak memiliki semua field yang dibutuhkan",
        ));
    }

    Ok(parsed)
}

// ─── Public handler ───────────────────────────────────────────────────────────

/// Handler context: the caller must supply these (extracted from AppState + extractors).
pub struct GradeEssayContext {
    pub db: Arc<PgPool>,
    pub user_id: Uuid,
    pub tenant_id: Uuid,
    /// Role of the calling user ("student", "teacher", "admin", …).
    pub role: String,
}

/// Core grading logic — called by the API server handler.
///
/// # Example (api-server side)
/// ```no_run
/// use edusync_services::ai::grading::{grade_essay, GradeEssayContext};
///
/// async fn grade_essay_handler(
///     Extension(state): Extension<Arc<AppState>>,
///     AuthedRequest(ctx): AuthedRequest,
///     Json(body): Json<GradeEssayRequest>,
/// ) -> HandlerResult<VilResponse<GradeEssayResponse>> {
///     let context = GradeEssayContext {
///         db: Arc::new(state.db.clone()),
///         user_id: ctx.user_id,
///         tenant_id: ctx.tenant_id,
///         role: ctx.role.clone(),
///     };
///     grade_essay(context, body).await
/// }
/// ```
pub async fn grade_essay(
    ctx: GradeEssayContext,
    req: GradeEssayRequest,
) -> HandlerResult<VilResponse<GradeEssayResponse>> {
    // 1. Role check — students cannot grade
    if ctx.role == "student" {
        return Err(VilError::forbidden(
            "Akses ditolak: siswa tidak dapat menilai esai",
        ));
    }

    // 2. Input validation
    if req.submission_id.trim().is_empty() {
        return Err(VilError::bad_request("submissionId wajib diisi"));
    }
    if req.essay_text.trim().is_empty() || req.rubric.is_empty() {
        return Err(VilError::bad_request(
            "essayText dan rubrik wajib diisi",
        ));
    }
    if req.essay_text.len() > MAX_ESSAY_CHARS {
        return Err(VilError::bad_request(format!(
            "Teks esai melebihi batas maksimum {} karakter",
            MAX_ESSAY_CHARS
        )));
    }
    if req.rubric.len() > 20 {
        return Err(VilError::bad_request(
            "Jumlah kriteria rubrik terlalu banyak (maksimum 20)",
        ));
    }

    // 3. Tenant access check
    validate_tenant_access(&ctx.db, &req.submission_id, ctx.tenant_id).await?;

    // 4. Rate limit
    check_rate_limit(&ctx.db, ctx.user_id, ctx.tenant_id).await?;

    // 5. Build rubric text for prompt
    let rubric_text: String = req
        .rubric
        .iter()
        .map(|r| {
            format!(
                "- {} (Skor Maksimum: {}): {}",
                r.criterion, r.max_points, r.description
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    // 6. Call Groq
    let result = call_groq_grader(&req.essay_text, &rubric_text).await?;

    // 7. Record usage (best-effort — do not fail the response if this errors)
    record_usage(&ctx.db, ctx.user_id, ctx.tenant_id, "grade_essay").await;

    Ok(VilResponse::ok(result))
}
