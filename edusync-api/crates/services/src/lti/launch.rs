/// LTI 1.3 Launch handler (Step 2).
///
/// Ports `supabase/functions/lti-launch/index.ts`.
///
/// Flow:
///   1. Receive POST with form-encoded `id_token` + `state`.
///   2. Validate `state` against `lti_nonces` (replay protection, check expiry).
///   3. Decode JWT header (without verification) to get `kid`.
///   4. Fetch platform's JWKS and find matching key.
///   5. Verify RS256 JWT signature using `jsonwebtoken` crate.
///   6. Validate LTI-specific claims (iss, aud, nonce, deployment_id).
///   7. Look up or provision EduSync user in `profiles`.
///   8. Create/update `lti_user_links`.
///   9. Issue EduSync JWT (access token).
///  10. Redirect to `APP_URL/#/lti-launch?token=<jwt>`.
///
/// No EduSync auth — this endpoint validates the LTI id_token itself.
///
/// # Dependencies (add to services/Cargo.toml when wiring):
///   jsonwebtoken = { workspace = true }
///   reqwest      = { version = "0.12", features = ["json"] }
///   url          = "2"
use axum::{
    extract::Form,
    http::{header, StatusCode},
    response::{IntoResponse, Response},
};
use chrono::Utc;
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;
use vil_server::prelude::VilError;

use crate::lti::types::LtiLaunchClaims;

// ─── LTI claim URIs ───────────────────────────────────────────────────────────

const LTI_CLAIM_DEPLOYMENT_ID: &str = "https://purl.imsglobal.org/spec/lti/claim/deployment_id";

// ─── HTML error helper ────────────────────────────────────────────────────────

fn error_html(title: &str, detail: &str, status: StatusCode) -> Response {
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

// ─── Form body ────────────────────────────────────────────────────────────────

/// Form-encoded body sent by the LTI platform.
#[derive(Debug, Deserialize)]
pub struct LtiLaunchForm {
    pub id_token: Option<String>,
    pub state: Option<String>,
}

// ─── JWT / JWKS helpers ───────────────────────────────────────────────────────

/// Decode a JWT without signature verification to read the header.
fn decode_jwt_header(token: &str) -> Result<jsonwebtoken::Header, VilError> {
    jsonwebtoken::decode_header(token)
        .map_err(|e| VilError::bad_request(format!("Header decode: {e}")))
}

/// Represents one JWK from the platform's JWKS response.
#[derive(Debug, Deserialize)]
struct RawJwk {
    kty: String,
    #[serde(rename = "use")]
    use_: Option<String>,
    kid: Option<String>,
    n: Option<String>,
    e: Option<String>,
    alg: Option<String>,
}

#[derive(Debug, Deserialize)]
struct JwksBody {
    keys: Vec<RawJwk>,
}

/// Fetch the platform's JWKS and return the DecodingKey matching `kid`.
async fn fetch_platform_decoding_key(
    jwks_url: &str,
    kid: Option<&str>,
) -> Result<DecodingKey, VilError> {
    let resp = reqwest::get(jwks_url)
        .await
        .map_err(|e| VilError::service_unavailable(format!("Gagal memuat kunci platform: {e}")))?;

    if !resp.status().is_success() {
        return Err(VilError::service_unavailable(format!(
            "JWKS HTTP {}: {}",
            resp.status().as_u16(),
            jwks_url
        )));
    }

    let jwks: JwksBody = resp
        .json()
        .await
        .map_err(|e| VilError::internal(format!("JWKS parse: {e}")))?;

    if jwks.keys.is_empty() {
        return Err(VilError::internal("JWKS is empty".to_string()));
    }

    // Find matching key: prefer kid match, fall back to first RSA key
    let key = if let Some(k) = kid {
        jwks.keys
            .iter()
            .find(|key| key.kid.as_deref() == Some(k) && key.kty == "RSA")
    } else {
        jwks.keys.iter().find(|key| key.kty == "RSA")
    }
    .ok_or_else(|| VilError::internal(format!("No RSA key found for kid={:?}", kid)))?;

    let n = key
        .n
        .as_deref()
        .ok_or_else(|| VilError::internal("JWK missing 'n'".to_string()))?;
    let e = key
        .e
        .as_deref()
        .ok_or_else(|| VilError::internal("JWK missing 'e'".to_string()))?;

    DecodingKey::from_rsa_components(n, e)
        .map_err(|e| VilError::internal(format!("DecodingKey build: {e}")))
}

// ─── Nonce validation ─────────────────────────────────────────────────────────

struct NonceRow {
    platform_id: Uuid,
    tenant_id: Uuid,
    redirect_uri: Option<String>,
}

/// Atomically consume (delete) the nonce and return its data.
/// Returns bad_request if not found or expired.
async fn consume_nonce(db: &PgPool, nonce: &str, state: &str) -> Result<NonceRow, VilError> {
    // Delete and return atomically
    let row = sqlx::query!(
        r#"DELETE FROM public.lti_nonces
           WHERE nonce = $1 AND state = $2 AND expires_at > NOW()
           RETURNING platform_id, tenant_id, redirect_uri"#,
        nonce,
        state
    )
    .fetch_optional(db)
    .await
    .map_err(|e| VilError::internal(e.to_string()))?
    .ok_or_else(|| VilError::bad_request("Nonce LTI sudah kadaluwarsa atau tidak ditemukan"))?;

    Ok(NonceRow {
        platform_id: row.platform_id,
        tenant_id: row.tenant_id,
        redirect_uri: row.redirect_uri,
    })
}

// ─── Platform lookup ──────────────────────────────────────────────────────────

struct PlatformData {
    id: Uuid,
    tenant_id: Uuid,
    client_id: String,
    deployment_id: String,
    jwks_url: String,
}

async fn load_platform(db: &PgPool, platform_id: Uuid) -> Result<PlatformData, VilError> {
    sqlx::query!(
        r#"SELECT id, tenant_id, client_id, deployment_id, key_set_url
           FROM public.lti_platform_registrations
           WHERE id = $1 AND is_active = true
           LIMIT 1"#,
        platform_id
    )
    .fetch_optional(db)
    .await
    .map_err(|e| VilError::internal(e.to_string()))?
    .map(|r| PlatformData {
        id: r.id,
        tenant_id: r.tenant_id,
        client_id: r.client_id,
        deployment_id: r.deployment_id,
        jwks_url: r.key_set_url,
    })
    .ok_or_else(|| VilError::bad_request("State tidak valid"))
}

// ─── User provisioning ────────────────────────────────────────────────────────

/// Determine EduSync role from LTI roles array.
fn lti_roles_to_edusync_role(roles: &[String]) -> &'static str {
    for role in roles {
        if role.contains("Instructor") || role.contains("TeachingAssistant") {
            return "teacher";
        }
        if role.contains("Administrator") {
            return "admin";
        }
    }
    "student"
}

/// Build the guest email for an LTI user.
/// Format: `lti-{platformId[..8]}-{sub}@lti.edusync.internal`
fn guest_email(platform_id: Uuid, sub: &str) -> String {
    let short_id = platform_id.to_string().replace('-', "");
    let short_id = &short_id[..8.min(short_id.len())];
    // Sanitize sub to be email-safe (keep only alphanumeric + safe chars)
    let safe_sub: String = sub
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '-'
            }
        })
        .take(40)
        .collect();
    format!("lti-{short_id}-{safe_sub}@lti.edusync.internal")
}

struct ProvisionedUser {
    user_id: Uuid,
    tenant_id: Uuid,
    email: String,
    role: String,
}

/// Look up or create the EduSync user, and upsert `lti_user_links`.
async fn provision_user(
    db: &PgPool,
    platform_id: Uuid,
    tenant_id: Uuid,
    sub: &str,
    email: Option<&str>,
    display_name: Option<&str>,
    lti_role: &str,
) -> Result<ProvisionedUser, VilError> {
    // 1. Check existing link
    let existing_link = sqlx::query!(
        r#"SELECT user_id FROM public.lti_user_links
           WHERE platform_id = $1 AND platform_sub = $2 AND tenant_id = $3
           LIMIT 1"#,
        platform_id,
        sub,
        tenant_id
    )
    .fetch_optional(db)
    .await
    .map_err(|e| VilError::internal(e.to_string()))?;

    let (user_id, user_email) = if let Some(link) = existing_link {
        // Existing user — get their email
        let user = sqlx::query!(
            r#"SELECT id, email FROM public.profiles WHERE id = $1 LIMIT 1"#,
            link.user_id
        )
        .fetch_optional(db)
        .await
        .map_err(|e| VilError::internal(e.to_string()))?
        .ok_or_else(|| VilError::internal("Profil pengguna LTI tidak ditemukan".to_string()))?;

        // Update last_seen
        let _ = sqlx::query(
            r#"UPDATE public.lti_user_links SET last_seen_at = NOW()
               WHERE platform_id = $1 AND platform_sub = $2 AND tenant_id = $3"#,
        )
        .bind(platform_id)
        .bind(sub)
        .bind(tenant_id)
        .execute(db)
        .await;

        (user.id, user.email)
    } else {
        // New user — provision
        let resolved_email = email
            .filter(|e| !e.is_empty())
            .map(|e| e.to_string())
            .unwrap_or_else(|| guest_email(platform_id, sub));

        let full_name = display_name.unwrap_or("Pengguna LTI").to_string();

        // Upsert profile (insert or update if email already exists)
        let new_user_id = Uuid::new_v4();
        sqlx::query(
            r#"INSERT INTO public.profiles (id, email, full_name, tenant_id, created_at, updated_at)
               VALUES ($1, $2, $3, $4, NOW(), NOW())
               ON CONFLICT (email, tenant_id) DO UPDATE
                 SET full_name = EXCLUDED.full_name,
                     updated_at = NOW()
               RETURNING id"#,
        )
        .bind(new_user_id)
        .bind(&resolved_email)
        .bind(&full_name)
        .bind(tenant_id)
        .execute(db)
        .await
        .map_err(|e| VilError::internal(format!("Profile upsert: {e}")))?;

        // Fetch the actual ID (may differ on conflict)
        let profile_row = sqlx::query!(
            r#"SELECT id FROM public.profiles
               WHERE email = $1 AND tenant_id = $2 LIMIT 1"#,
            resolved_email,
            tenant_id
        )
        .fetch_optional(db)
        .await
        .map_err(|e| VilError::internal(e.to_string()))?
        .ok_or_else(|| VilError::internal("Profil tidak ditemukan setelah upsert".to_string()))?;

        let actual_user_id = profile_row.id;

        // Upsert user_roles
        sqlx::query(
            r#"INSERT INTO public.user_roles (user_id, tenant_id, role)
               VALUES ($1, $2, $3)
               ON CONFLICT (user_id, tenant_id) DO NOTHING"#,
        )
        .bind(actual_user_id)
        .bind(tenant_id)
        .bind(lti_role)
        .execute(db)
        .await
        .map_err(|e| VilError::internal(format!("Role insert: {e}")))?;

        // Insert lti_user_links
        sqlx::query(
            r#"INSERT INTO public.lti_user_links
                  (id, user_id, platform_id, platform_sub, tenant_id, created_at, last_seen_at)
               VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
               ON CONFLICT (platform_id, platform_sub, tenant_id) DO UPDATE
                 SET last_seen_at = NOW()"#,
        )
        .bind(Uuid::new_v4())
        .bind(actual_user_id)
        .bind(platform_id)
        .bind(sub)
        .bind(tenant_id)
        .execute(db)
        .await
        .map_err(|e| VilError::internal(format!("LTI link insert: {e}")))?;

        (actual_user_id, resolved_email)
    };

    Ok(ProvisionedUser {
        user_id,
        tenant_id,
        email: user_email,
        role: lti_role.to_string(),
    })
}

// ─── Public context + handler ─────────────────────────────────────────────────

pub struct LaunchContext {
    pub db: Arc<PgPool>,
    /// Secret used to sign EduSync JWTs.
    pub jwt_secret: String,
}

pub async fn handle_launch(
    ctx: LaunchContext,
    form: LtiLaunchForm,
) -> Result<impl IntoResponse, VilError> {
    // 1. Extract id_token + state
    let id_token = form
        .id_token
        .as_deref()
        .filter(|t| !t.is_empty())
        .ok_or_else(|| {
            VilError::bad_request(
                "Token tidak ditemukan: permintaan launch tidak menyertakan id_token yang valid",
            )
        })?;

    let state = form
        .state
        .as_deref()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| {
            VilError::bad_request("Parameter state tidak ditemukan atau sudah kadaluwarsa")
        })?;

    // 2. Decode JWT header (no verification yet) to get `kid`
    let jwt_header = decode_jwt_header(id_token)?;

    // 3. Quick decode of payload (unverified) to get nonce + iss for DB lookup
    //    We verify the signature in step 5 — this is just to find the right key.
    let unverified: serde_json::Value = {
        let parts: Vec<&str> = id_token.split('.').collect();
        if parts.len() != 3 {
            return Err(VilError::bad_request("Token tidak valid: format JWT salah"));
        }
        let payload_b64 = parts[1];
        // Add padding
        let padded = match payload_b64.len() % 4 {
            2 => format!("{payload_b64}=="),
            3 => format!("{payload_b64}="),
            _ => payload_b64.to_string(),
        };
        let url_safe = padded.replace('-', "+").replace('_', "/");
        let bytes = base64_decode_std(&url_safe)
            .map_err(|e| VilError::bad_request(format!("Payload decode: {e}")))?;
        serde_json::from_slice(&bytes)
            .map_err(|e| VilError::bad_request(format!("Payload JSON: {e}")))?
    };

    let nonce_in_token = unverified
        .get("nonce")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    // 4. Validate and consume nonce from DB
    let nonce_row = consume_nonce(&ctx.db, nonce_in_token, state).await?;

    // 5. Load platform registration
    let platform = load_platform(&ctx.db, nonce_row.platform_id).await?;

    // 6. Fetch JWKS and build DecodingKey
    let decoding_key =
        fetch_platform_decoding_key(&platform.jwks_url, jwt_header.kid.as_deref()).await?;

    // 7. Verify JWT signature + standard claims via jsonwebtoken.
    //
    // We validate:
    //   - RS256 signature using the platform's public key
    //   - exp claim (token must not be expired)
    //   - aud claim (must equal our client_id)
    //
    // iss is validated manually in step 8 because we need to compare it against
    // the registered platform issuer URL, not a hard-coded value.
    let mut sig_validation = Validation::new(Algorithm::RS256);
    sig_validation.validate_exp = true;
    sig_validation.set_audience(&[&platform.client_id]);
    // Do not validate iss here — done manually below against the DB record.

    let token_data =
        decode::<LtiLaunchClaims>(id_token, &decoding_key, &sig_validation).map_err(|e| {
            tracing::warn!("lti_jwt_verify_failed: {e}");
            VilError::unauthorized(format!(
                "Tanda tangan id_token tidak dapat diverifikasi: {e}"
            ))
        })?;

    let claims = token_data.claims;

    // 8. Validate LTI-specific claims
    // iss must match the platform's registered issuer URL
    let platform_issuer = sqlx::query_scalar::<_, String>(
        "SELECT issuer FROM public.lti_platform_registrations WHERE id = $1 LIMIT 1",
    )
    .bind(platform.id)
    .fetch_optional(&*ctx.db)
    .await
    .map_err(|e| VilError::internal(e.to_string()))?
    .ok_or_else(|| VilError::bad_request("State tidak valid"))?;

    if claims.iss != platform_issuer {
        tracing::warn!(
            token_iss = %claims.iss,
            platform_iss = %platform_issuer,
            "lti_launch: iss mismatch"
        );
        return Err(VilError::bad_request(format!(
            "Klaim token tidak valid: iss mismatch: token={}, platform={}",
            claims.iss, platform_issuer
        )));
    }
    // nonce must match
    if claims.nonce.as_deref() != Some(nonce_in_token) {
        return Err(VilError::bad_request(
            "Klaim token tidak valid: nonce mismatch",
        ));
    }
    // deployment_id must match
    if let Some(token_dep_id) = &claims.deployment_id {
        if *token_dep_id != platform.deployment_id {
            return Err(VilError::bad_request(format!(
                "Klaim token tidak valid: deployment_id mismatch: {} vs {}",
                token_dep_id, platform.deployment_id
            )));
        }
    }

    // 9. Map LTI roles to EduSync role
    let edusync_role = lti_roles_to_edusync_role(&claims.roles);

    // 10. Provision user
    let user = provision_user(
        &ctx.db,
        platform.id,
        platform.tenant_id,
        &claims.sub,
        claims.email.as_deref(),
        claims.name.as_deref(),
        edusync_role,
    )
    .await?;

    // 11. Issue EduSync JWT
    let token = edusync_auth::issue_access_token(
        user.user_id,
        &user.email,
        &user.role,
        Some(user.tenant_id),
        false, // MFA not applicable for LTI guest
        &ctx.jwt_secret,
    )
    .map_err(|e| VilError::internal(format!("Gagal membuat sesi: {e}")))?;

    // 12. Determine redirect target
    let app_url =
        std::env::var("APP_URL").unwrap_or_else(|_| "https://app.edusync.dev".to_string());

    let redirect_path = nonce_row.redirect_uri.as_deref().unwrap_or("/#/dashboard");

    // Build final redirect: APP_URL/#/lti-launch?token=<jwt>&redirect=<path>
    let redirect_url = format!(
        "{app_url}/#/lti-launch?token={token}&redirect={redirect_path}",
        app_url = app_url,
        token = urlencoding::encode(&token),
        redirect_path = urlencoding::encode(redirect_path),
    );

    tracing::info!(
        component = "lti-launch",
        user_id = %user.user_id,
        tenant_id = %user.tenant_id,
        role = %user.role,
        "LTI launch successful"
    );

    Ok((StatusCode::FOUND, [(header::LOCATION, redirect_url)]))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/// Minimal standard base64 decoder (for decoding the JWT payload).
/// Does NOT do base64url — the caller must convert `-`→`+` and `_`→`/` first.
fn base64_decode_std(input: &str) -> Result<Vec<u8>, String> {
    const TABLE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut lut = [0u8; 256];
    for (i, &b) in TABLE.iter().enumerate() {
        lut[b as usize] = i as u8;
    }

    let input = input.as_bytes();
    let mut out = Vec::with_capacity(input.len() * 3 / 4);
    let mut i = 0;
    while i + 3 < input.len() {
        if input[i] == b'=' {
            break;
        }
        let b0 = lut[input[i] as usize] as u32;
        let b1 = lut[input[i + 1] as usize] as u32;
        let b2 = if input[i + 2] == b'=' {
            0
        } else {
            lut[input[i + 2] as usize] as u32
        };
        let b3 = if input[i + 3] == b'=' {
            0
        } else {
            lut[input[i + 3] as usize] as u32
        };
        let triple = (b0 << 18) | (b1 << 12) | (b2 << 6) | b3;
        out.push((triple >> 16) as u8);
        if input[i + 2] != b'=' {
            out.push((triple >> 8) as u8);
        }
        if input[i + 3] != b'=' {
            out.push(triple as u8);
        }
        i += 4;
    }
    Ok(out)
}

// ─── urlencoding helper ───────────────────────────────────────────────────────

/// Minimal percent-encoder for the redirect URL query params.
/// Encodes characters that would break a URL query string.
mod urlencoding {
    pub fn encode(s: &str) -> String {
        let mut out = String::with_capacity(s.len());
        for b in s.bytes() {
            match b {
                b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                    out.push(b as char)
                }
                _ => out.push_str(&format!("%{:02X}", b)),
            }
        }
        out
    }
}
