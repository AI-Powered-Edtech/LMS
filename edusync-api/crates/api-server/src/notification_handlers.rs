//! Phase 3C — Notification & Communication handlers (VIL Way).
//!
//! Covers: push notifications, WhatsApp webhook + OTP, PDF certificate generation.
//!
//! Migration notes:
//! - All JSON-body handlers: `Json<T>` → `ShmSlice` + `body.json::<T>()?`
//! - All `Extension<Arc<AppState>>` → `ServiceCtx` + `svc.state::<AppState>()?`
//! - All `impl IntoResponse` returns → `HandlerResult<VilResponse<T>>`
//! - Ad-hoc `(StatusCode, Json)` error tuples → `VilError::*` methods
//! - `whatsapp_webhook_get_handler` / `whatsapp_webhook_post_handler`:
//!   No JSON body — keep `Query<T>` / raw `Bytes` extractors.
//! - `send_otp_handler`: no request body — no `ShmSlice` needed.
//! - `generate_pdf_handler`: returns raw PDF bytes, not JSON — uses
//!   `VilResponse::raw(...)` to forward the binary response as-is.

use axum::{
    body::Bytes,
    extract::Query,
    http::{header, StatusCode},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};

use crate::extractors::AuthedRequest;
use crate::state::AppState;
use edusync_services::{
    pdf::{generate_pdf_for_enrollment, GenerateCertificateRequest},
    push::{
        send_push_to_user,
        types::{PushPayload, SendPushRequest},
    },
    whatsapp::{
        otp::{send_otp, verify_otp},
        webhook::{handle_incoming, verify_webhook, VerifyResult, WebhookProvider},
    },
};

// ─── Push Notification ────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct SendPushResponse {
    pub success: bool,
    pub sent: usize,
    pub message: String,
}

pub async fn send_push_handler(
    AuthedRequest(_ctx): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<SendPushResponse>> {
    let state = svc.state::<AppState>()?;
    let req: SendPushRequest = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    let payload = PushPayload {
        title: req.title,
        body: req.body,
        icon: None,
        url: req.url,
        notification_id: None,
    };

    let sent = send_push_to_user(&state.db, req.user_id, payload)
        .await
        .map_err(|e| VilError::internal(e.to_string()))?;

    Ok(VilResponse::ok(SendPushResponse {
        success: sent > 0,
        sent,
        message: if sent > 0 {
            format!("Push berhasil dikirim ke {sent} perangkat")
        } else {
            "Tidak ada perangkat yang menerima push notification".into()
        },
    }))
}

// ─── WhatsApp Webhook GET (verify) ────────────────────────────────────────────

#[derive(Deserialize)]
pub struct WebhookVerifyQuery {
    #[serde(rename = "hub.mode")]
    pub hub_mode: Option<String>,
    #[serde(rename = "hub.verify_token")]
    pub hub_verify_token: Option<String>,
    #[serde(rename = "hub.challenge")]
    pub hub_challenge: Option<String>,
}

/// Webhook verification is a plain GET with query params and a plain-text
/// challenge response — does not fit `HandlerResult<VilResponse<T>>` cleanly,
/// so we keep `impl IntoResponse` here (the handler produces non-JSON output).
pub async fn whatsapp_webhook_get_handler(
    Query(q): Query<WebhookVerifyQuery>,
) -> impl IntoResponse {
    match verify_webhook(
        q.hub_mode.as_deref(),
        q.hub_verify_token.as_deref(),
        q.hub_challenge.as_deref(),
    ) {
        VerifyResult::Accepted(challenge) => (StatusCode::OK, challenge).into_response(),
        VerifyResult::Rejected => (StatusCode::FORBIDDEN, "Forbidden").into_response(),
        VerifyResult::NotAVerification => (StatusCode::OK, "OK").into_response(),
    }
}

// ─── WhatsApp Webhook POST (incoming) ────────────────────────────────────────

#[derive(Deserialize)]
pub struct WebhookPostQuery {
    pub provider: Option<String>,
}

/// Incoming webhook messages are raw bytes (not JSON destined for our API
/// contract) — keep `Bytes` extractor and always return 200 to the provider.
pub async fn whatsapp_webhook_post_handler(
    svc: ServiceCtx,
    Query(q): Query<WebhookPostQuery>,
    body: Bytes,
) -> impl IntoResponse {
    let state = svc.state::<AppState>().ok();
    let provider = q
        .provider
        .as_deref()
        .and_then(WebhookProvider::from_str)
        .unwrap_or(WebhookProvider::WaBusiness);

    if let Some(state) = state {
        let _ = handle_incoming(&state.db, provider, &body).await;
    }
    // Always return 200 to the provider (even on parse failures)
    StatusCode::OK
}

// ─── WhatsApp OTP — Send ──────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct SendOtpResponse {
    pub success: bool,
    pub message: String,
    pub expires_at: chrono::DateTime<chrono::Utc>,
}

/// No request body — `ShmSlice` not needed.
pub async fn send_otp_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
) -> HandlerResult<VilResponse<SendOtpResponse>> {
    let state = svc.state::<AppState>()?;

    let otp = send_otp(&state.db, ctx.user_id)
        .await
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    Ok(VilResponse::ok(SendOtpResponse {
        success: true,
        message: "Kode OTP telah dikirim ke nomor WhatsApp Anda".to_string(),
        expires_at: otp.expires_at,
    }))
}

// ─── WhatsApp OTP — Verify ────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct VerifyOtpRequest {
    pub code: String,
}

#[derive(Serialize)]
pub struct VerifyOtpResponse {
    pub valid: bool,
    pub message: String,
}

pub async fn verify_otp_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<VerifyOtpResponse>> {
    let state = svc.state::<AppState>()?;
    let req: VerifyOtpRequest = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    let valid = verify_otp(&state.db, ctx.user_id, &req.code)
        .await
        .map_err(|e| VilError::internal(e.to_string()))?;

    Ok(VilResponse::ok(VerifyOtpResponse {
        valid,
        message: if valid {
            "OTP valid — verifikasi berhasil".to_string()
        } else {
            "OTP tidak valid atau sudah kadaluarsa".to_string()
        },
    }))
}

// ─── PDF Certificate ──────────────────────────────────────────────────────────

/// PDF generation returns raw binary bytes with a custom Content-Disposition
/// header — not a JSON payload.  We use `VilResponse::raw` to forward the
/// binary response produced by the service layer without re-encoding.
pub async fn generate_pdf_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<impl IntoResponse> {
    let state = svc.state::<AppState>()?;
    let req: GenerateCertificateRequest = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    let (pdf_bytes, filename) =
        generate_pdf_for_enrollment(&state.db, ctx.user_id, ctx.tenant_id, req)
            .await
            .map_err(|e| VilError::internal(e.to_string()))?;

    let response = (
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "application/pdf".to_string()),
            (
                header::CONTENT_DISPOSITION,
                format!("attachment; filename=\"{filename}\""),
            ),
        ],
        pdf_bytes,
    )
        .into_response();

    Ok(response)
}
