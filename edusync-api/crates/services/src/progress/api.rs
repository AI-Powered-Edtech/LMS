/// Progress Events API — Phase 3D
///
/// Ports `supabase/functions/progress-events/index.ts`.
///
/// Endpoint: POST /api/v1/progress-events
///
/// Pipeline:
///   1. Validate event count (≤ 100)
///   2. Validate each event against schema v1
///   3. Enforce user_id == authenticated user (anti-spoofing)
///   4. Check queue backpressure (reject if pending > 50 000)
///   5. Bulk-insert valid events into `progress_events` table
///   6. Return ProgressBatchResponse
// DEPENDENCY: sqlx = "0.8"
// DEPENDENCY: uuid = "1"
// DEPENDENCY: serde = "1"
// DEPENDENCY: tracing = "0.1"

use sqlx::PgPool;
use uuid::Uuid;

use super::types::{
    MAX_EVENTS_PER_REQUEST, MAX_STRING_FIELD_LEN, QUEUE_BACKPRESSURE_LIMIT, VALID_EVENT_TYPES,
    ProgressBatchResponse, TelemetryEvent, ValidationError,
};

// ─── Module-local error type ──────────────────────────────────────────────────

/// Errors from the progress events API.
#[derive(Debug)]
pub enum ProgressApiError {
    /// More events than MAX_EVENTS_PER_REQUEST.
    TooManyEvents(usize),
    /// Queue is over the backpressure limit.
    QueueFull,
    /// Database failure.
    Database(String),
}

impl std::fmt::Display for ProgressApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProgressApiError::TooManyEvents(n) => {
                write!(
                    f,
                    "Terlalu banyak event: {n}. Maksimum {} per permintaan.",
                    MAX_EVENTS_PER_REQUEST
                )
            }
            ProgressApiError::QueueFull => {
                write!(f, "Server sibuk — antrian penuh, coba lagi nanti")
            }
            ProgressApiError::Database(msg) => {
                write!(f, "Kesalahan basis data: {msg}")
            }
        }
    }
}

impl std::error::Error for ProgressApiError {}

// ─── Validation ───────────────────────────────────────────────────────────────

/// Validate a single `TelemetryEvent`.
///
/// Rules (mirroring the Deno version):
///   - event_version must be 1
///   - event_type must be in VALID_EVENT_TYPES
///   - timestamp must be > 0 (unix ms)
///   - optional string fields must not exceed MAX_STRING_FIELD_LEN
///   - position must be ≥ 0 if provided
///
/// Note: UUID format is guaranteed by the Rust type system.
fn validate_event(event: &TelemetryEvent) -> Option<String> {
    if event.event_version != 1 {
        return Some(format!(
            "Versi event tidak didukung: {}",
            event.event_version
        ));
    }

    if !VALID_EVENT_TYPES.contains(&event.event_type.as_str()) {
        return Some(format!("Jenis event tidak dikenal: {}", event.event_type));
    }

    if event.timestamp <= 0 {
        return Some("timestamp harus berupa angka unix ms yang valid (> 0)".to_string());
    }

    if let Some(ref sid) = event.session_id {
        if sid.len() > MAX_STRING_FIELD_LEN {
            return Some(format!(
                "session_id melebihi batas {} karakter",
                MAX_STRING_FIELD_LEN
            ));
        }
    }

    if let Some(ref dt) = event.device_type {
        if dt.len() > MAX_STRING_FIELD_LEN {
            return Some(format!(
                "device_type melebihi batas {} karakter",
                MAX_STRING_FIELD_LEN
            ));
        }
    }

    if let Some(pos) = event.position {
        if pos < 0.0 {
            return Some("position harus berupa angka non-negatif".to_string());
        }
    }

    None
}

// ─── Backpressure check ───────────────────────────────────────────────────────

/// Returns true if the `progress_events` queue is over the backpressure limit.
///
/// Fails open: if the count query errors, we allow the request through
/// (availability > strict backpressure on infrastructure failure).
async fn is_queue_over_limit(db: &PgPool) -> bool {
    let result = sqlx::query_scalar!(
        r#"
        SELECT COUNT(*)
        FROM public.progress_events
        WHERE processed = false
        "#
    )
    .fetch_one(db)
    .await;

    match result {
        Ok(Some(count)) => count >= QUEUE_BACKPRESSURE_LIMIT,
        _ => false,
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/// Validate and enqueue a batch of telemetry events.
///
/// `auth_user_id` — the UUID from the verified JWT. Events whose `user_id`
/// does not match this value are rejected to prevent cross-user spoofing.
///
/// Returns `ProgressBatchResponse` on success. Returns `Err` only for hard
/// infrastructure failures (queue full, DB errors), not per-event validation.
pub async fn enqueue_progress_events(
    db: &PgPool,
    auth_user_id: Uuid,
    events: Vec<TelemetryEvent>,
) -> Result<ProgressBatchResponse, ProgressApiError> {
    let received = events.len();

    // ── 1. Event count guard ─────────────────────────────────────────────────
    if received > MAX_EVENTS_PER_REQUEST {
        return Err(ProgressApiError::TooManyEvents(received));
    }

    if received == 0 {
        return Ok(ProgressBatchResponse {
            received: 0,
            enqueued: 0,
            skipped: 0,
            errors: vec![],
        });
    }

    // ── 2. Validate each event ───────────────────────────────────────────────
    let mut valid_events: Vec<TelemetryEvent> = Vec::with_capacity(received);
    let mut validation_errors: Vec<ValidationError> = vec![];

    for (i, event) in events.into_iter().enumerate() {
        if let Some(err_msg) = validate_event(&event) {
            validation_errors.push(ValidationError { index: i, error: err_msg });
            continue;
        }

        // Anti-spoofing: user_id must match authenticated user
        if event.user_id != auth_user_id {
            validation_errors.push(ValidationError {
                index: i,
                error: "user_id tidak sesuai dengan pengguna yang terautentikasi".to_string(),
            });
            continue;
        }

        valid_events.push(event);
    }

    let skipped = validation_errors.len();
    let enqueued_count = valid_events.len();

    if enqueued_count == 0 {
        return Ok(ProgressBatchResponse {
            received,
            enqueued: 0,
            skipped,
            errors: validation_errors,
        });
    }

    // ── 3. Backpressure check ────────────────────────────────────────────────
    if is_queue_over_limit(db).await {
        tracing::warn!(
            queue_limit  = QUEUE_BACKPRESSURE_LIMIT,
            auth_user_id = %auth_user_id,
            "progress_events: backpressure aktif — antrian penuh, tolak permintaan"
        );
        return Err(ProgressApiError::QueueFull);
    }

    // ── 4. Bulk-insert valid events into progress_events table ───────────────
    // Insert in a transaction with ON CONFLICT DO NOTHING for idempotency
    // (event_id is the idempotency key).
    let mut tx = db
        .begin()
        .await
        .map_err(|e| ProgressApiError::Database(e.to_string()))?;

    for ev in &valid_events {
        sqlx::query!(
            r#"
            INSERT INTO public.progress_events (
                event_id,
                event_version,
                tenant_id,
                user_id,
                course_id,
                lesson_id,
                event_type,
                position,
                client_timestamp_ms,
                session_id,
                device_type,
                processed,
                created_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11, false, NOW()
            )
            ON CONFLICT (event_id) DO NOTHING
            "#,
            ev.event_id,
            ev.event_version as i32,
            ev.tenant_id,
            ev.user_id,
            ev.course_id,
            ev.lesson_id,
            ev.event_type,
            ev.position,
            ev.timestamp,
            ev.session_id,
            ev.device_type
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| ProgressApiError::Database(e.to_string()))?;
    }

    tx.commit()
        .await
        .map_err(|e| ProgressApiError::Database(e.to_string()))?;

    tracing::info!(
        auth_user_id = %auth_user_id,
        received     = received,
        enqueued     = enqueued_count,
        skipped      = skipped,
        "progress_events: batch berhasil diantrikan"
    );

    Ok(ProgressBatchResponse {
        received,
        enqueued: enqueued_count,
        skipped,
        errors: validation_errors,
    })
}
