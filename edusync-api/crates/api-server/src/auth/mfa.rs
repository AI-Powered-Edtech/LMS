use std::sync::Arc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use edusync_auth::{AuthError, verify_access_token};
use vil_server::prelude::{ServiceCtx, ShmSlice, VilResponse, VilError, HandlerResult};
use crate::state::AppState;
use axum::http::HeaderMap;

#[derive(Deserialize)]
pub struct MfaEnrollRequest {
    pub friendly_name: Option<String>,
}

#[derive(Deserialize)]
pub struct MfaVerifyRequest {
    pub factor_id: Uuid,
    pub code: String,
}

#[derive(Serialize)]
pub struct MfaEnrollResponse {
    pub id: Uuid,
    pub totp: TotpInfo,
    pub recovery_codes: Vec<String>,
}

#[derive(Serialize)]
pub struct TotpInfo {
    pub secret: String,
    pub qr_code: String,
    pub uri: String,
}

pub async fn mfa_enroll_handler(
    svc: ServiceCtx,
    headers: HeaderMap,
    body: ShmSlice,
) -> HandlerResult<VilResponse<MfaEnrollResponse>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let body: MfaEnrollRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    let token = extract_bearer(&headers)?;
    let claims = verify_access_token(token, &state.jwt_secret)
        .map_err(VilError::from)?;
    let user_id: Uuid = claims.sub.parse().map_err(|_| VilError::from(AuthError::InvalidToken))?;

    let secret = totp_rs::Secret::generate_secret();
    let secret_encoded = secret.to_encoded();
    let secret_base32 = secret_encoded.to_string();
    let secret_bytes: Vec<u8> = secret.to_bytes()
        .map_err(|e: totp_rs::SecretParseError| VilError::from(AuthError::Internal(e.to_string())))?;
    let factor_id = Uuid::new_v4();

    sqlx::query!(
        r#"INSERT INTO public.mfa_factors (id, user_id, friendly_name, factor_type, status, secret)
           VALUES ($1, $2, $3, 'totp', 'unverified', $4)"#,
        factor_id,
        user_id,
        body.friendly_name.unwrap_or_else(|| "Authenticator".to_string()),
        secret_base32,
    )
    .execute(&state.db)
    .await
    .map_err(|e| VilError::from(AuthError::Database(e.to_string())))?;

    let totp = totp_rs::TOTP::new(
        totp_rs::Algorithm::SHA1, 6, 1, 30,
        secret_bytes,
        Some("EduSync".to_string()),
        claims.email.clone(),
    )
    .map_err(|e| VilError::from(AuthError::Internal(e.to_string())))?;

    let qr_code = totp.get_qr_base64()
        .map_err(|e| VilError::from(AuthError::Internal(e.to_string())))?;
    let uri = totp.get_url();

    // Generate 10 recovery codes
    let recovery_codes: Vec<String> = (0..10)
        .map(|_| format!("{}-{}", &Uuid::new_v4().to_string()[..8], &Uuid::new_v4().to_string()[..8]))
        .collect();

    Ok(VilResponse::ok(MfaEnrollResponse {
        id: factor_id,
        totp: TotpInfo { secret: secret_base32, qr_code, uri },
        recovery_codes,
    }))
}

pub async fn mfa_verify_handler(
    svc: ServiceCtx,
    headers: HeaderMap,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let body: MfaVerifyRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    let token = extract_bearer(&headers)?;
    let claims = verify_access_token(token, &state.jwt_secret)
        .map_err(VilError::from)?;
    let user_id: Uuid = claims.sub.parse().map_err(|_| VilError::from(AuthError::InvalidToken))?;

    let factor = sqlx::query!(
        "SELECT secret FROM public.mfa_factors WHERE id = $1 AND user_id = $2",
        body.factor_id, user_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| VilError::from(AuthError::Database(e.to_string())))?
    .ok_or_else(|| VilError::from(AuthError::InvalidToken))?;

    let secret_bytes = totp_rs::Secret::Encoded(factor.secret.unwrap_or_default())
        .to_bytes()
        .map_err(|e: totp_rs::SecretParseError| VilError::from(AuthError::Internal(e.to_string())))?;

    let totp = totp_rs::TOTP::new(
        totp_rs::Algorithm::SHA1, 6, 1, 30, secret_bytes, None, "".to_string()
    )
    .map_err(|e| VilError::from(AuthError::Internal(e.to_string())))?;

    if !totp.check_current(&body.code).map_err(|e| VilError::from(AuthError::Internal(e.to_string())))? {
        return Err(VilError::from(AuthError::InvalidCredentials));
    }

    sqlx::query!(
        "UPDATE public.mfa_factors SET status = 'verified', updated_at = now() WHERE id = $1",
        body.factor_id
    )
    .execute(&state.db)
    .await
    .map_err(|e| VilError::from(AuthError::Database(e.to_string())))?;

    Ok(VilResponse::ok(serde_json::json!({ "success": true })))
}

pub async fn mfa_unenroll_handler(
    svc: ServiceCtx,
    headers: HeaderMap,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<Arc<AppState>>()?.clone();

    let token = extract_bearer(&headers)?;
    let claims = verify_access_token(token, &state.jwt_secret)
        .map_err(VilError::from)?;
    let user_id: Uuid = claims.sub.parse().map_err(|_| VilError::from(AuthError::InvalidToken))?;

    sqlx::query!(
        "DELETE FROM public.mfa_factors WHERE user_id = $1",
        user_id
    )
    .execute(&state.db)
    .await
    .map_err(|e| VilError::from(AuthError::Database(e.to_string())))?;

    Ok(VilResponse::ok(serde_json::json!({ "success": true })))
}

fn extract_bearer(headers: &HeaderMap) -> Result<&str, VilError> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or_else(|| VilError::from(AuthError::InvalidToken))
}
