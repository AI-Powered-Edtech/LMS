//! Prometheus metrics module (Issue #322 A3).
//!
//! Exposes a `/metrics` endpoint in Prometheus text exposition format and
//! defines counters used across the API server. The first counter set covers
//! AI tutor SSE streaming, which is gated behind a per-user hourly quota; the
//! metrics are a precondition for enabling streaming globally.
//!
//! Counters:
//!   - `ai_tutor_stream_requests_total{status}` — terminal status of each
//!     SSE stream request: `start`, `done`, or `failed`.
//!   - `ai_tutor_tokens_emitted_total` — total tokens forwarded to clients.
//!
//! Registration uses a private `Registry` (not the global default registry)
//! so we control exactly which metrics this binary exposes.

use axum::{
    http::{header, StatusCode},
    response::{IntoResponse, Response},
};
use once_cell::sync::Lazy;
use prometheus::{Encoder, IntCounter, IntCounterVec, Opts, Registry, TextEncoder};

/// Private registry for this binary's metrics.
pub static REGISTRY: Lazy<Registry> = Lazy::new(Registry::new);

/// Per-status counter for AI tutor SSE stream requests.
///
/// Status labels:
///   - `start`  — stream opened (incremented before the first SSE event).
///   - `done`   — stream completed successfully.
///   - `failed` — stream errored mid-flight.
pub static AI_TUTOR_STREAM_REQUESTS_TOTAL: Lazy<IntCounterVec> = Lazy::new(|| {
    let m = IntCounterVec::new(
        Opts::new(
            "ai_tutor_stream_requests_total",
            "AI tutor SSE stream requests by terminal status (start|done|failed)",
        ),
        &["status"],
    )
    .expect("define ai_tutor_stream_requests_total");
    REGISTRY
        .register(Box::new(m.clone()))
        .expect("register ai_tutor_stream_requests_total");
    m
});

/// Total AI tutor tokens emitted to SSE clients (sum across all sessions).
pub static AI_TUTOR_TOKENS_EMITTED_TOTAL: Lazy<IntCounter> = Lazy::new(|| {
    let m = IntCounter::new(
        "ai_tutor_tokens_emitted_total",
        "Total AI tutor tokens emitted to SSE clients",
    )
    .expect("define ai_tutor_tokens_emitted_total");
    REGISTRY
        .register(Box::new(m.clone()))
        .expect("register ai_tutor_tokens_emitted_total");
    m
});

/// Eagerly initialize all metric statics so they appear in `/metrics` even
/// before the first increment. Called once from `main()` at startup.
pub fn init() {
    Lazy::force(&REGISTRY);
    Lazy::force(&AI_TUTOR_STREAM_REQUESTS_TOTAL);
    Lazy::force(&AI_TUTOR_TOKENS_EMITTED_TOTAL);
}

/// `GET /api/v1/metrics` — Prometheus text exposition format.
pub async fn metrics_handler() -> Response {
    let metric_families = REGISTRY.gather();
    let encoder = TextEncoder::new();
    let mut buffer = Vec::new();
    if let Err(err) = encoder.encode(&metric_families, &mut buffer) {
        tracing::error!(error = %err, "failed to encode prometheus metrics");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            "metrics encode failure",
        )
            .into_response();
    }
    let body = String::from_utf8(buffer).unwrap_or_default();
    (
        [(
            header::CONTENT_TYPE,
            "text/plain; version=0.0.4; charset=utf-8",
        )],
        body,
    )
        .into_response()
}
