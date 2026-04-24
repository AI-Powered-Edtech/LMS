//! Onboarding resumable (P2.4).
//!
//! Menyimpan progress onboarding per user di `profiles.onboarding_step` +
//! `onboarding_data` (jsonb) + `onboarding_done`. Tidak ada validasi enum —
//! FE yang menentukan nama step. Data jsonb dipakai untuk menyimpan form yang
//! belum sempat di-submit.

use edusync_middleware::errors::from_sqlx_error;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};

use crate::{extractors::AuthedRequest, state::AppState};

#[derive(Serialize)]
pub struct OnboardingState {
    pub onboarding_step: Option<String>,
    pub onboarding_done: bool,
    pub onboarding_data: serde_json::Value,
}

#[derive(Deserialize)]
pub struct UpdateOnboardingRequest {
    pub step: Option<String>,
    pub done: Option<bool>,
    pub data: Option<serde_json::Value>,
}

pub async fn get_onboarding_handler(
    svc: ServiceCtx,
    AuthedRequest(ctx): AuthedRequest,
) -> HandlerResult<VilResponse<OnboardingState>> {
    let state = svc.state::<AppState>()?.clone();
    let row = sqlx::query(
        r#"SELECT onboarding_step, onboarding_done, onboarding_data
             FROM public.profiles WHERE id=$1"#,
    )
    .bind(ctx.user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(from_sqlx_error)?
    .ok_or_else(|| VilError::not_found("Profile tidak ditemukan"))?;

    Ok(VilResponse::ok(OnboardingState {
        onboarding_step: row.try_get("onboarding_step").ok(),
        onboarding_done: row.try_get("onboarding_done").unwrap_or(false),
        onboarding_data: row
            .try_get::<serde_json::Value, _>("onboarding_data")
            .unwrap_or_else(|_| serde_json::json!({})),
    }))
}

pub async fn update_onboarding_handler(
    svc: ServiceCtx,
    AuthedRequest(ctx): AuthedRequest,
    body: ShmSlice,
) -> HandlerResult<VilResponse<OnboardingState>> {
    let state = svc.state::<AppState>()?.clone();
    let body: UpdateOnboardingRequest = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    let row = sqlx::query(
        r#"UPDATE public.profiles
              SET onboarding_step = COALESCE($2, onboarding_step),
                  onboarding_done = COALESCE($3, onboarding_done),
                  onboarding_data = COALESCE($4, onboarding_data),
                  updated_at = now()
            WHERE id = $1
         RETURNING onboarding_step, onboarding_done, onboarding_data"#,
    )
    .bind(ctx.user_id)
    .bind(body.step.as_deref())
    .bind(body.done)
    .bind(body.data)
    .fetch_optional(&state.db)
    .await
    .map_err(from_sqlx_error)?
    .ok_or_else(|| VilError::not_found("Profile tidak ditemukan"))?;

    Ok(VilResponse::ok(OnboardingState {
        onboarding_step: row.try_get("onboarding_step").ok(),
        onboarding_done: row.try_get("onboarding_done").unwrap_or(false),
        onboarding_data: row
            .try_get::<serde_json::Value, _>("onboarding_data")
            .unwrap_or_else(|_| serde_json::json!({})),
    }))
}
