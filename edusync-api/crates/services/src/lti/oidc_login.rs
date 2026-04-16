#![allow(dead_code)]
/// LTI 1.3 OIDC Third-Party Login Initiation (Step 1).
///
/// Ports `supabase/functions/lti-oidc-login/index.ts`.
///
/// Flow:
///   1. Parse `iss`, `login_hint`, `target_link_uri`, `lti_message_hint`, `client_id`
///      from GET query params or POST form body.
///   2. Look up platform in `lti_platform_registrations` by `issuer` (+ optional `client_id`).
///   3. Generate a random `nonce` + `state` (UUID-based).
///   4. Store the nonce in `lti_nonces` with a 10-minute expiry.
///   5. Build the OIDC authorization redirect URL.
///   6. Return 302 redirect.
///
/// No EduSync auth required — this endpoint is called by external LTI platforms.
use axum::{
    extract::{Form, Query},
    http::{header, StatusCode},
    response::IntoResponse,
};
use chrono::Utc;
use serde::Serialize;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;
use vil_server::prelude::VilError;

use crate::lti::types::LtiOidcLoginRequest;

// ─── HTML error helper ────────────────────────────────────────────────────────

fn error_html_response(
    title: &str,
    detail: &str,
    status: axum::http::StatusCode,
) -> axum::response::Response {
    let body = format!(
        r#"<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><title>EduSync LTI Error</title>
<style>body{{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}}
.card{{background:white;padding:2rem;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.1);max-width:480px;text-align:center}}
h1{{color:#dc2626;font-size:1.25rem}}p{{color:#6b7280}}</style></head>
<body><div class="card"><h1>{title}</h1><p>{detail}</p></div></body></html>"#,
        title = html_escape(title),
        detail = html_escape(detail),
    );
    (
        status,
        [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
        body,
    )
        .into_response()
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
struct PlatformRow {
    id: Uuid,
    tenant_id: Uuid,
    client_id: String,
    auth_endpoint: String,
}

async fn lookup_platform(
    db: &PgPool,
    iss: &str,
    client_id: Option<&str>,
) -> Result<PlatformRow, VilError> {
    let row = if let Some(cid) = client_id {
        sqlx::query_as::<_, PlatformRow>(
            r#"SELECT id, tenant_id, client_id, auth_endpoint
               FROM public.lti_platform_registrations
               WHERE issuer = $1 AND client_id = $2 AND is_active = true
               LIMIT 1"#,
        )
        .bind(iss)
        .bind(cid)
        .fetch_optional(db)
        .await
        .map_err(|e| VilError::internal(e.to_string()))?
    } else {
        sqlx::query_as::<_, PlatformRow>(
            r#"SELECT id, tenant_id, client_id, auth_endpoint
               FROM public.lti_platform_registrations
               WHERE issuer = $1 AND is_active = true
               LIMIT 1"#,
        )
        .bind(iss)
        .fetch_optional(db)
        .await
        .map_err(|e| VilError::internal(e.to_string()))?
    };

    row.ok_or_else(|| {
        VilError::not_found(format!(
            "Platform dengan issuer \"{iss}\" belum terdaftar di EduSync"
        ))
    })
}

async fn store_nonce(
    db: &PgPool,
    nonce: &str,
    state: &str,
    platform_id: Uuid,
    tenant_id: Uuid,
    redirect_uri: Option<&str>,
) -> Result<(), VilError> {
    sqlx::query(
        r#"INSERT INTO public.lti_nonces
              (nonce, state, platform_id, tenant_id, redirect_uri, expires_at, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '10 minutes', NOW())"#,
    )
    .bind(nonce)
    .bind(state)
    .bind(platform_id)
    .bind(tenant_id)
    .bind(redirect_uri)
    .execute(db)
    .await
    .map_err(|e| VilError::internal(format!("Failed to store nonce: {e}")))?;
    Ok(())
}

// ─── Public context + handler ─────────────────────────────────────────────────

pub struct OidcLoginContext {
    pub db: Arc<PgPool>,
}

/// Core OIDC login initiation logic.
///
/// Accepts the parsed `LtiOidcLoginRequest` (from either query string or form body)
/// and returns a 302 redirect Response on success.
pub async fn handle_oidc_login(
    ctx: OidcLoginContext,
    req: LtiOidcLoginRequest,
) -> Result<impl IntoResponse, VilError> {
    // 1. Validate required params
    if req.iss.trim().is_empty() {
        return Err(VilError::bad_request("Parameter \"iss\" wajib diisi"));
    }
    if req.login_hint.trim().is_empty() {
        return Err(VilError::bad_request(
            "Parameter \"login_hint\" wajib diisi",
        ));
    }

    // 2. Look up platform
    let platform = lookup_platform(&ctx.db, &req.iss, req.client_id.as_deref()).await?;

    // 3. Generate state + nonce (UUID-based, cryptographically random)
    let state = Uuid::new_v4().to_string();
    let nonce = Uuid::new_v4().to_string();

    // 4. Determine launch callback URL
    let launch_url = std::env::var("LTI_LAUNCH_URL").unwrap_or_else(|_| {
        format!(
            "{}/lti/launch",
            std::env::var("APP_URL").unwrap_or_else(|_| "https://api.edusync.dev".to_string())
        )
    });

    // 5. Persist nonce
    store_nonce(
        &ctx.db,
        &nonce,
        &state,
        platform.id,
        platform.tenant_id,
        req.target_link_uri.as_deref(),
    )
    .await?;

    // 6. Build OIDC authorization URL
    let mut auth_url = url::Url::parse(&platform.auth_endpoint)
        .map_err(|e| VilError::internal(format!("Invalid auth_endpoint: {e}")))?;

    {
        let mut q = auth_url.query_pairs_mut();
        q.append_pair("response_type", "id_token");
        q.append_pair("response_mode", "form_post");
        q.append_pair("scope", "openid");
        q.append_pair("client_id", &platform.client_id);
        q.append_pair("redirect_uri", &launch_url);
        q.append_pair("login_hint", &req.login_hint);
        q.append_pair("state", &state);
        q.append_pair("nonce", &nonce);
        q.append_pair("prompt", "none");

        if let Some(hint) = &req.lti_message_hint {
            q.append_pair("lti_message_hint", hint);
        }
    }

    tracing::info!(
        component = "lti-oidc-login",
        stage = "redirect",
        iss = %req.iss,
        platform_id = %platform.id,
        tenant_id = %platform.tenant_id,
        "LTI OIDC login initiated"
    );

    Ok((
        StatusCode::FOUND,
        [(header::LOCATION, auth_url.to_string())],
    ))
}
