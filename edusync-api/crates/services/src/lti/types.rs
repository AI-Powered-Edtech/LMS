/// LTI 1.3 types used by jwks, oidc_login, and launch handlers.
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ─── Platform registration ────────────────────────────────────────────────────

/// A registered LTI 1.3 platform (Canvas, Moodle, …).
/// Maps to the `lti_platform_registrations` table.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LtiPlatform {
    pub id: Uuid,
    /// The platform's OIDC issuer URL (e.g. "https://canvas.instructure.com").
    pub issuer: String,
    /// OAuth2 client ID assigned to EduSync by the platform.
    pub client_id: String,
    /// LTI deployment ID for this registration.
    pub deployment_id: String,
    /// URL of the platform's JWKS endpoint (used to verify id_token signatures).
    pub key_set_url: String,
    /// Platform's OAuth2 token endpoint.
    pub token_url: String,
    /// Platform's JWKS URL (same as key_set_url for most platforms).
    pub jwks_url: String,
    /// Human-readable platform name.
    pub platform_name: Option<String>,
    /// Tenant this platform is registered under.
    pub tenant_id: Uuid,
    /// Platform's OIDC authorization endpoint.
    pub auth_endpoint: String,
    pub is_active: bool,
}

// ─── Nonce storage ────────────────────────────────────────────────────────────

/// An LTI OIDC nonce stored during Step 1 (oidc-login) for replay protection.
/// Maps to the `lti_nonces` table.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LtiNonce {
    pub nonce: String,
    pub state: String,
    pub platform_id: Uuid,
    pub tenant_id: Uuid,
    pub redirect_uri: Option<String>,
    pub expires_at: DateTime<Utc>,
}

// ─── User link ────────────────────────────────────────────────────────────────

/// Link between an EduSync user and their LTI platform identity.
/// Maps to the `lti_user_links` table.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LtiUserLink {
    pub id: Uuid,
    pub user_id: Uuid,
    pub platform_id: Uuid,
    /// The `sub` claim from the LTI id_token.
    pub platform_sub: String,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub last_seen_at: DateTime<Utc>,
}

// ─── OIDC Login request ───────────────────────────────────────────────────────

/// Query parameters / form fields from the LTI OIDC Third-Party Login Initiation.
/// The platform sends these as either GET query params or POST form body.
#[derive(Debug, Deserialize)]
pub struct LtiOidcLoginRequest {
    /// Platform issuer URL.
    pub iss: String,
    /// Platform user identifier (opaque).
    pub login_hint: String,
    /// Where the user wants to end up after launch.
    pub target_link_uri: Option<String>,
    /// Optional opaque hint for the platform.
    pub lti_message_hint: Option<String>,
    /// OAuth2 client_id (some platforms include this for disambiguation).
    pub client_id: Option<String>,
    /// LTI deployment_id.
    pub lti_deployment_id: Option<String>,
}

// ─── LTI Launch claims (id_token payload) ────────────────────────────────────

/// Relevant claims extracted from the LTI 1.3 id_token JWT.
#[derive(Debug, Deserialize)]
pub struct LtiLaunchClaims {
    /// Subject — the platform's opaque user identifier.
    pub sub: String,
    /// User's email address (may be absent for privacy-sensitive deployments).
    pub email: Option<String>,
    /// User's display name.
    pub name: Option<String>,
    /// LTI roles array (IMS URNs).
    #[serde(rename = "https://purl.imsglobal.org/spec/lti/claim/roles", default)]
    pub roles: Vec<String>,
    /// LTI deployment ID.
    #[serde(rename = "https://purl.imsglobal.org/spec/lti/claim/deployment_id")]
    pub deployment_id: Option<String>,
    /// Token issuer (platform URL).
    pub iss: String,
    /// Audience (client_id of EduSync).
    pub aud: serde_json::Value,
    /// Issued-at timestamp.
    pub iat: Option<i64>,
    /// Expiry timestamp.
    pub exp: Option<i64>,
    /// Nonce from Step 1.
    pub nonce: Option<String>,
    /// Target link URI.
    #[serde(
        rename = "https://purl.imsglobal.org/spec/lti/claim/target_link_uri",
        default
    )]
    pub target_link_uri: Option<String>,
}

/// JWK representation returned by `/lti/jwks`.
#[derive(Debug, Serialize)]
pub struct Jwk {
    pub kty: String,
    pub n: String,
    pub e: String,
    pub alg: String,
    #[serde(rename = "use")]
    pub use_: String,
    pub kid: String,
}

#[derive(Debug, Serialize)]
pub struct JwksResponse {
    pub keys: Vec<Jwk>,
}
