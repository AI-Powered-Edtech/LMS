//! Phase 3C — Notification & Communication Axum handlers.
//!
//! Covers: push notifications, WhatsApp webhook + OTP, PDF certificate generation.

use axum::{
    body::Bytes,
    extract::Query,
    http::{header, StatusCode},
    response::IntoResponse,
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use crate::extractors::AuthedRequest;
use crate::state::AppState;
use edusync_services::{
    pdf::{generate_pdf_for_enrollment, GenerateCertificateRequest},
    push::{
        send_push_to_user,
        types::{PushPayload, SendPushRequest, SendPushResponse},
    },
    whatsapp::{
        otp::{send_otp, verify_otp},
        webhook::{handle_incoming, verify_webhook, VerifyResult, WebhookProvider},
    },
};

// ─── Push Notification ────────────────────────────────────────────────────────

pub async fn send_push_handler(
    AuthedRequest(ctx): AuthedRequest,
    Extension(state): Extension<Arc<AppState>>,
    Json(req): Json<SendPushRequest>,
) -> impl IntoResponse {
    let payload = PushPayload {
        title: req.title,
        body: req.body,
        icon: None,
        url: req.url,
        notification_id: None,
    };

    match send_push_to_user(&state.db, req.user_id, payload).await {
        Ok(sent) => Json(edusync_services::push::types::SendPushResponse {
            success: sent > 0,
            sent,
            message: if sent > 0 {
                format!("Push berhasil dikirim ke {sent} perangkat")
            } else {
                "Tidak ada perangkat yang menerima push notification".into()
            },
        })
        .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
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

pub async fn whatsapp_webhook_post_handler(
    Extension(state): Extension<Arc<AppState>>,
    Query(q): Query<WebhookPostQuery>,
    body: Bytes,
) -> impl IntoResponse {
    let provider = q
        .provider
        .as_deref()
        .and_then(WebhookProvider::from_str)
        .unwrap_or(WebhookProvider::WaBusiness);

    let _ = handle_incoming(&state.db, provider, &body).await;
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

pub async fn send_otp_handler(
    AuthedRequest(ctx): AuthedRequest,
    Extension(state): Extension<Arc<AppState>>,
) -> impl IntoResponse {
    match send_otp(&state.db, ctx.user_id).await {
        Ok(otp) => Json(SendOtpResponse {
            success: true,
            message: "Kode OTP telah dikirim ke nomor WhatsApp Anda".to_string(),
            expires_at: otp.expires_at,
        })
        .into_response(),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
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
    Extension(state): Extension<Arc<AppState>>,
    Json(req): Json<VerifyOtpRequest>,
) -> impl IntoResponse {
    match verify_otp(&state.db, ctx.user_id, &req.code).await {
        Ok(valid) => Json(VerifyOtpResponse {
            valid,
            message: if valid {
                "OTP valid — verifikasi berhasil".to_string()
            } else {
                "OTP tidak valid atau sudah kadaluarsa".to_string()
            },
        })
        .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

// ─── PDF Certificate ──────────────────────────────────────────────────────────

pub async fn generate_pdf_handler(
    AuthedRequest(ctx): AuthedRequest,
    Extension(state): Extension<Arc<AppState>>,
    Json(req): Json<GenerateCertificateRequest>,
) -> impl IntoResponse {
    match generate_pdf_for_enrollment(&state.db, ctx.user_id, ctx.tenant_id, req).await {
        Ok((pdf_bytes, filename)) => (
            StatusCode::OK,
            [
                (
                    header::CONTENT_TYPE,
                    "application/pdf".to_string(),
                ),
                (
                    header::CONTENT_DISPOSITION,
                    format!("attachment; filename=\"{filename}\""),
                ),
            ],
            pdf_bytes,
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}
