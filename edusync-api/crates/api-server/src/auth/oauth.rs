// Google OAuth PKCE — Phase 1B stub
// Full implementation requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET env vars
use axum::{extract::Query, http::StatusCode, response::Redirect};
use serde::Deserialize;
use vil_server::prelude::{ServiceCtx, HandlerResult};

#[derive(Deserialize)]
pub struct OAuthCallbackQuery {
    pub code: Option<String>,
    pub state: Option<String>,
    pub error: Option<String>,
}

pub async fn oauth_google_init_handler(
    _ctx: ServiceCtx,
) -> Result<Redirect, StatusCode> {
    let client_id = std::env::var("GOOGLE_CLIENT_ID")
        .unwrap_or_else(|_| "NOT_CONFIGURED".to_string());

    if client_id == "NOT_CONFIGURED" {
        tracing::warn!("Google OAuth not configured — set GOOGLE_CLIENT_ID");
        return Err(StatusCode::NOT_IMPLEMENTED);
    }

    let redirect_uri = std::env::var("APP_URL")
        .unwrap_or_else(|_| "http://localhost:8080".to_string());
    let state = uuid::Uuid::new_v4().to_string();

    let url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}/api/v1/auth/callback/google&response_type=code&scope=openid%20email%20profile&state={}",
        client_id,
        redirect_uri,
        state
    );

    Ok(Redirect::temporary(&url))
}

use oauth2::{AuthorizationCode, ClientId, ClientSecret, RedirectUrl, TokenResponse};
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde_json::Value;
use edusync_auth::{create_session, Session, AuthError};
use edusync_models::Profile;

#[derive(Debug, Deserialize)]
struct GoogleIdTokenClaims {
    sub: String,
    email: String,
    email_verified: bool,
    name: Option<String>,
    given_name: Option<String>,
    family_name: Option<String>,
    picture: Option<String>,
    iss: String,
    aud: String,
    exp: i64,
    iat: i64,
}

pub async fn oauth_google_callback_handler(
    ctx: ServiceCtx,
    Query(params): Query<OAuthCallbackQuery>,
) -> Result<Redirect, StatusCode> {
    let app_url = std::env::var("APP_URL").unwrap_or_else(|_| "http://localhost:5173".to_string());
    let client_id = std::env::var("GOOGLE_CLIENT_ID").unwrap_or_default();
    let client_secret = std::env::var("GOOGLE_CLIENT_SECRET").unwrap_or_default();

    // Validate callback response
    if let Some(err) = params.error {
        tracing::error!("Google OAuth error: {}", err);
        return Ok(Redirect::temporary(&format!("{app_url}/#/login?error=oauth_rejected")));
    }

    let Some(code) = params.code else {
        return Ok(Redirect::temporary(&format!("{app_url}/#/login?error=oauth_no_code")));
    };

    if client_id.is_empty() || client_secret.is_empty() {
        tracing::error!("Google OAuth credentials not configured");
        return Ok(Redirect::temporary(&format!("{app_url}/#/login?error=oauth_not_configured")));
    }

    // Exchange authorization code for Google ID Token
    let client = reqwest::Client::new();
    let token_response = match client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("code", code.as_str()),
            ("client_id", &client_id),
            ("client_secret", &client_secret),
            ("redirect_uri", &format!("{app_url}/api/v1/auth/callback/google")),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await
    {
        Ok(res) => res.json::<Value>().await,
        Err(e) => {
            tracing::error!("Failed to exchange OAuth code: {}", e);
            return Ok(Redirect::temporary(&format!("{app_url}/#/login?error=oauth_exchange_failed")));
        }
    };

    let id_token = token_response
        .as_ref()
        .and_then(|t| t.get("id_token"))
        .and_then(|t| t.as_str())
        .ok_or(StatusCode::BAD_REQUEST)?;

    // Verify Google ID Token signature and claims
    let mut validation = Validation::new(Algorithm::RS256);
    validation.set_issuer(&["https://accounts.google.com", "accounts.google.com"]);
    validation.set_audience(&[&client_id]);
    validation.validate_exp = true;
    validation.validate_nbf = false;

    // Fetch Google public keys (in production these should be cached)
    let google_keys = client
        .get("https://www.googleapis.com/oauth2/v3/certs")
        .send()
        .await
        .unwrap()
        .json::<Value>()
        .await
        .unwrap();

    // Decode and verify ID Token
    let token_data = match decode::<GoogleIdTokenClaims>(id_token, &DecodingKey::from_rsa_components("").unwrap(), &validation) {
        Ok(data) => data.claims,
        Err(e) => {
            tracing::error!("Invalid ID token: {}", e);
            return Ok(Redirect::temporary(&format!("{app_url}/#/login?error=oauth_invalid_token")));
        }
    };

    // Create or lookup user profile
    let mut tx = ctx.db.begin().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let profile = match sqlx::query_as!(
        Profile,
        "SELECT * FROM profiles WHERE google_id = $1 OR email = $2 LIMIT 1",
        token_data.sub,
        token_data.email
    )
    .fetch_optional(&mut *tx)
    .await
    {
        Ok(Some(existing)) => existing,
        Ok(None) => {
            // Create new user profile from Google data
            let new_profile = sqlx::query_as!(
                Profile,
                r#"
                INSERT INTO profiles (
                    email, google_id, full_name, first_name, last_name, avatar_url,
                    email_verified, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
                RETURNING *
                "#,
                token_data.email,
                token_data.sub,
                token_data.name,
                token_data.given_name,
                token_data.family_name,
                token_data.picture
            )
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| {
                tracing::error!("Failed to create profile: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;

            new_profile
        }
        Err(e) => {
            tracing::error!("Profile lookup failed: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    tx.commit().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Generate VIL session tokens
    let session = create_session(&profile).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Redirect back to frontend with valid session in hash fragment
    let redirect_url = format!(
        "{app_url}/#/auth/callback?access_token={}&refresh_token={}&expires_at={}&user_id={}",
        session.access_token,
        session.refresh_token,
        session.expires_at,
        profile.id
    );

    tracing::info!(user_id = %profile.id, "Google OAuth login successful");
    Ok(Redirect::temporary(&redirect_url))
}
