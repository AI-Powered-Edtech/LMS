#![allow(dead_code)]
/// Progress event types — Phase 3D
///
/// Ports the type definitions from `supabase/functions/progress-events/index.ts`.
// DEPENDENCY: serde = "1"
// DEPENDENCY: uuid = "1"
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ─── Valid event types ────────────────────────────────────────────────────────

/// All recognised event type strings.
pub const VALID_EVENT_TYPES: &[&str] = &[
    "video_started",
    "video_progress",
    "video_paused",
    "video_seek",
    "video_ended",
    "lesson_started",
    "lesson_completed",
    "lesson_abandoned",
    "quiz_started",
    "quiz_submitted",
];

/// Maximum events per batch request (mirrors Deno constant).
pub const MAX_EVENTS_PER_REQUEST: usize = 100;

/// Maximum pending queue depth before backpressure kicks in.
pub const QUEUE_BACKPRESSURE_LIMIT: i64 = 50_000;

/// Maximum length for optional string fields such as session_id / device_type.
pub const MAX_STRING_FIELD_LEN: usize = 255;

// ─── Core event type ─────────────────────────────────────────────────────────

/// A single telemetry event emitted by the frontend.
///
/// Schema version 1 (event_version must equal 1).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryEvent {
    /// Client-generated idempotency key (UUID v4).
    pub event_id: Uuid,
    /// Must be 1. Other versions are rejected.
    pub event_version: u32,
    /// Tenant the event belongs to.
    pub tenant_id: Uuid,
    /// Authenticated user who produced the event.
    pub user_id: Uuid,
    /// Optional — the course context (may be null for standalone lessons).
    pub course_id: Option<Uuid>,
    /// The lesson being interacted with.
    pub lesson_id: Uuid,
    /// Discriminator string; see `VALID_EVENT_TYPES`.
    pub event_type: String,
    /// Video playback position in seconds (for video_* events).
    pub position: Option<f64>,
    /// Client-side Unix timestamp in milliseconds.
    pub timestamp: i64,
    /// Optional client session identifier (max 255 chars).
    pub session_id: Option<String>,
    /// Optional device class: "desktop" | "mobile" | "tablet" (max 255 chars).
    pub device_type: Option<String>,
}

// ─── Batch request / response ─────────────────────────────────────────────────

/// Inbound payload for `POST /api/v1/progress-events`.
#[derive(Debug, Deserialize)]
pub struct ProgressBatchRequest {
    pub events: Vec<TelemetryEvent>,
}

/// Response returned after enqueueing a batch.
#[derive(Debug, Serialize)]
pub struct ProgressBatchResponse {
    /// Total events received in the request.
    pub received: usize,
    /// Events successfully enqueued.
    pub enqueued: usize,
    /// Events skipped due to validation errors.
    pub skipped: usize,
    /// Per-event validation errors (empty slice when all events were valid).
    pub errors: Vec<ValidationError>,
}

/// Describes a validation failure for a single event in the batch.
#[derive(Debug, Serialize)]
pub struct ValidationError {
    /// Zero-based index into the original events array.
    pub index: usize,
    /// Human-readable error description (Bahasa Indonesia).
    pub error: String,
}
