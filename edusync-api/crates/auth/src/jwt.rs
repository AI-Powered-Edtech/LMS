use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AuthError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessClaims {
    pub sub: String,
    pub email: String,
    pub role: String,
    pub tenant_id: Option<String>,
    pub exp: i64,
    pub iat: i64,
    pub mfa_verified: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefreshClaims {
    pub sub: String,
    pub jti: String,
    pub exp: i64,
    pub iat: i64,
}

pub fn issue_access_token(
    user_id: Uuid,
    email: &str,
    role: &str,
    tenant_id: Option<Uuid>,
    mfa_verified: bool,
    secret: &str,
) -> Result<String, AuthError> {
    let now = chrono::Utc::now().timestamp();

    encode(
        &Header::default(),
        &AccessClaims {
            sub: user_id.to_string(),
            email: email.to_string(),
            role: role.to_string(),
            tenant_id: tenant_id.map(|tenant| tenant.to_string()),
            exp: now + 3600,
            iat: now,
            mfa_verified,
        },
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|error| AuthError::Internal(error.to_string()))
}

pub fn issue_refresh_token(user_id: Uuid, secret: &str) -> Result<(String, String), AuthError> {
    let now = chrono::Utc::now().timestamp();
    let jti = Uuid::new_v4().to_string();

    let token = encode(
        &Header::default(),
        &RefreshClaims {
            sub: user_id.to_string(),
            jti: jti.clone(),
            exp: now + 30 * 24 * 3600,
            iat: now,
        },
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|error| AuthError::Internal(error.to_string()))?;

    Ok((token, jti))
}

pub fn verify_access_token(token: &str, secret: &str) -> Result<AccessClaims, AuthError> {
    decode::<AccessClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map(|decoded| decoded.claims)
    .map_err(|_| AuthError::InvalidToken)
}

pub fn verify_refresh_token(token: &str, secret: &str) -> Result<RefreshClaims, AuthError> {
    decode::<RefreshClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map(|decoded| decoded.claims)
    .map_err(|_| AuthError::TokenExpired)
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::{issue_access_token, issue_refresh_token, verify_access_token, verify_refresh_token};

    #[test]
    fn jwt_access_round_trip() {
        let secret = "test-secret";
        let user_id = Uuid::new_v4();
        let tenant_id = Uuid::new_v4();
        let tenant_id_string = tenant_id.to_string();
        let token = issue_access_token(
            user_id,
            "teacher@edusync.dev",
            "teacher",
            Some(tenant_id),
            false,
            secret,
        )
        .expect("token should be generated");

        let claims = verify_access_token(&token, secret).expect("token should verify");
        assert_eq!(claims.sub, user_id.to_string());
        assert_eq!(claims.email, "teacher@edusync.dev");
        assert_eq!(claims.role, "teacher");
        assert_eq!(claims.tenant_id.as_deref(), Some(tenant_id_string.as_str()));
        assert!(!claims.mfa_verified);
    }

    #[test]
    fn jwt_refresh_round_trip() {
        let secret = "test-secret";
        let user_id = Uuid::new_v4();
        let (token, jti) = issue_refresh_token(user_id, secret).expect("token should be generated");

        let claims = verify_refresh_token(&token, secret).expect("token should verify");
        assert_eq!(claims.sub, user_id.to_string());
        assert_eq!(claims.jti, jti);
    }
}
