use axum::http::HeaderMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::sync::Arc;
use uuid::Uuid;
use vil_server::prelude::*;

use crate::extractors::AuthedRequest;
use crate::state::AppState;

pub fn init_tracing() {
    let filter =
        std::env::var("RUST_LOG").unwrap_or_else(|_| "edusync_api_server=debug,info".to_string());

    let _ = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(true)
        .with_thread_ids(false)
        .json()
        .try_init();
}

pub fn init_sentry() -> Option<sentry::ClientInitGuard> {
    let dsn = std::env::var("SENTRY_DSN").ok()?;
    Some(sentry::init((
        dsn,
        sentry::ClientOptions {
            release: sentry::release_name!(),
            ..Default::default()
        },
    )))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DivergenceEvent {
    pub request_id: String,
    pub timestamp: Option<String>,
    pub tenant_id: Option<String>,
    pub user_id: Option<String>,
    pub role: Option<String>,
    pub flow_name: String,
    pub endpoint: String,
    pub method: String,
    pub primary_backend: String,
    pub shadow_backend: String,
    pub normalized_request_signature: String,
    pub result_hash_primary: Option<String>,
    pub result_hash_shadow: Option<String>,
    pub diff_summary: String,
    pub severity: String,
    #[serde(default)]
    pub primary_status: Option<u16>,
    #[serde(default)]
    pub shadow_status: Option<u16>,
    #[serde(default)]
    pub sampled_primary_payload: Option<Value>,
    #[serde(default)]
    pub sampled_shadow_payload: Option<Value>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ShadowConfigResponse {
    pub enabled: bool,
    pub divergence_sample_rate: f64,
}

pub fn request_id_from_headers(headers: &HeaderMap) -> String {
    headers
        .get("x-request-id")
        .and_then(|value| value.to_str().ok())
        .filter(|value| !value.trim().is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| Uuid::new_v4().to_string())
}

fn should_sample(request_id: &str, sample_rate: f64) -> bool {
    if sample_rate <= 0.0 {
        return false;
    }

    if sample_rate >= 1.0 {
        return true;
    }

    let mut hasher = Sha256::new();
    hasher.update(request_id.as_bytes());
    let digest = hasher.finalize();
    let bucket = u16::from_be_bytes([digest[0], digest[1]]) as f64 / u16::MAX as f64;
    bucket <= sample_rate
}

pub async fn shadow_config_handler(
    ctx: ServiceCtx,
) -> VilResponse<ShadowConfigResponse> {
    let state = ctx.state::<Arc<AppState>>();
    VilResponse::ok(ShadowConfigResponse {
        enabled: state.shadow.enabled,
        divergence_sample_rate: state.shadow.divergence_sample_rate,
    })
}

pub async fn divergence_event_handler(
    AuthedRequest(req_ctx): AuthedRequest,
    ctx: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<Value>> {
    let state = ctx.state::<Arc<AppState>>();
    let mut event: DivergenceEvent = body.json()?;

    if !state.shadow.enabled {
        return Ok(VilResponse::ok(Value::Null));
    }

    if event.request_id.trim().is_empty() {
        event.request_id = Uuid::new_v4().to_string();
    }

    if !should_sample(&event.request_id, state.shadow.divergence_sample_rate) {
        return Ok(VilResponse::ok(Value::Null));
    }

    if event.timestamp.is_none() {
        event.timestamp = Some(chrono::Utc::now().to_rfc3339());
    }

    // Never trust actor identity supplied by the caller for audit events.
    event.tenant_id = Some(req_ctx.tenant_id.to_string());
    event.user_id = Some(req_ctx.user_id.to_string());
    event.role = Some(req_ctx.role.clone());

    match event.severity.as_str() {
        "error" => tracing::error!(
            target: "edusync_api_server::divergence",
            request_id = %event.request_id,
            timestamp = %event.timestamp.clone().unwrap_or_default(),
            tenant_id = %event.tenant_id.clone().unwrap_or_default(),
            user_id = %event.user_id.clone().unwrap_or_default(),
            role = %event.role.clone().unwrap_or_default(),
            flow_name = %event.flow_name,
            endpoint = %event.endpoint,
            method = %event.method,
            primary_backend = %event.primary_backend,
            shadow_backend = %event.shadow_backend,
            request_signature = %event.normalized_request_signature,
            result_hash_primary = %event.result_hash_primary.clone().unwrap_or_default(),
            result_hash_shadow = %event.result_hash_shadow.clone().unwrap_or_default(),
            diff_summary = %event.diff_summary,
            primary_status = event.primary_status.unwrap_or_default(),
            shadow_status = event.shadow_status.unwrap_or_default(),
            "divergence_event"
        ),
        "warn" => tracing::warn!(
            target: "edusync_api_server::divergence",
            request_id = %event.request_id,
            timestamp = %event.timestamp.clone().unwrap_or_default(),
            tenant_id = %event.tenant_id.clone().unwrap_or_default(),
            user_id = %event.user_id.clone().unwrap_or_default(),
            role = %event.role.clone().unwrap_or_default(),
            flow_name = %event.flow_name,
            endpoint = %event.endpoint,
            method = %event.method,
            primary_backend = %event.primary_backend,
            shadow_backend = %event.shadow_backend,
            request_signature = %event.normalized_request_signature,
            result_hash_primary = %event.result_hash_primary.clone().unwrap_or_default(),
            result_hash_shadow = %event.result_hash_shadow.clone().unwrap_or_default(),
            diff_summary = %event.diff_summary,
            primary_status = event.primary_status.unwrap_or_default(),
            shadow_status = event.shadow_status.unwrap_or_default(),
            "divergence_event"
        ),
        _ => tracing::info!(
            target: "edusync_api_server::divergence",
            request_id = %event.request_id,
            timestamp = %event.timestamp.clone().unwrap_or_default(),
            tenant_id = %event.tenant_id.clone().unwrap_or_default(),
            user_id = %event.user_id.clone().unwrap_or_default(),
            role = %event.role.clone().unwrap_or_default(),
            flow_name = %event.flow_name,
            endpoint = %event.endpoint,
            method = %event.method,
            primary_backend = %event.primary_backend,
            shadow_backend = %event.shadow_backend,
            request_signature = %event.normalized_request_signature,
            result_hash_primary = %event.result_hash_primary.clone().unwrap_or_default(),
            result_hash_shadow = %event.result_hash_shadow.clone().unwrap_or_default(),
            diff_summary = %event.diff_summary,
            primary_status = event.primary_status.unwrap_or_default(),
            shadow_status = event.shadow_status.unwrap_or_default(),
            "divergence_event"
        ),
    }

    Ok(VilResponse::ok(Value::Null))
}
