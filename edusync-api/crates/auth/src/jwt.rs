use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::sync::RwLock;
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

static RSA_KEYS: RwLock<Option<RsaKeys>> = RwLock::new(None);

pub struct RsaKeys {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
}

impl RsaKeys {
    pub fn from_pem(private_key_pem: &[u8], public_key_pem: &[u8]) -> Result<Self, AuthError> {
        let encoding_key = EncodingKey::from_rsa_pem(private_key_pem)
            .map_err(|e| AuthError::Internal(format!("Invalid private key: {}", e)))?;
        let decoding_key = DecodingKey::from_rsa_pem(public_key_pem)
            .map_err(|e| AuthError::Internal(format!("Invalid public key: {}", e)))?;

        Ok(Self {
            encoding_key,
            decoding_key,
        })
    }
}

pub fn init_rsa_keys(private_key_pem: &[u8], public_key_pem: &[u8]) -> Result<(), AuthError> {
    let keys = RsaKeys::from_pem(private_key_pem, public_key_pem)?;
    let mut guard = RSA_KEYS.write().unwrap();
    *guard = Some(keys);
    tracing::info!("RSA keys initialized for JWT RS256");
    Ok(())
}

fn get_keys() -> Result<RsaKeys, AuthError> {
    let guard = RSA_KEYS.read().unwrap();
    guard
        .as_ref()
        .ok_or_else(|| AuthError::Internal("RSA keys not initialized".to_string()))
        .map(|keys| RsaKeys {
            encoding_key: keys.encoding_key.clone(),
            decoding_key: keys.decoding_key.clone(),
        })
}

fn create_header() -> Header {
    Header::new(Algorithm::RS256)
}

pub fn issue_access_token(
    user_id: Uuid,
    email: &str,
    role: &str,
    tenant_id: Option<Uuid>,
    mfa_verified: bool,
) -> Result<String, AuthError> {
    let keys = get_keys()?;
    let now = chrono::Utc::now().timestamp();

    let header = create_header();

    encode(
        &header,
        &AccessClaims {
            sub: user_id.to_string(),
            email: email.to_string(),
            role: role.to_string(),
            tenant_id: tenant_id.map(|tenant| tenant.to_string()),
            exp: now + 3600,
            iat: now,
            mfa_verified,
        },
        &keys.encoding_key,
    )
    .map_err(|error| AuthError::Internal(error.to_string()))
}

pub fn issue_refresh_token(user_id: Uuid) -> Result<(String, String), AuthError> {
    let keys = get_keys()?;
    let now = chrono::Utc::now().timestamp();
    let jti = Uuid::new_v4().to_string();

    let header = create_header();

    let token = encode(
        &header,
        &RefreshClaims {
            sub: user_id.to_string(),
            jti: jti.clone(),
            exp: now + 30 * 24 * 3600,
            iat: now,
        },
        &keys.encoding_key,
    )
    .map_err(|error| AuthError::Internal(error.to_string()))?;

    Ok((token, jti))
}

pub fn verify_access_token(token: &str) -> Result<AccessClaims, AuthError> {
    let keys = get_keys()?;
    let mut validation = Validation::new(Algorithm::RS256);
    validation.validate_exp = true;
    validation.required_spec_claims.clear();

    decode::<AccessClaims>(token, &keys.decoding_key, &validation)
        .map(|decoded| decoded.claims)
        .map_err(|_| AuthError::InvalidToken)
}

pub fn verify_refresh_token(token: &str) -> Result<RefreshClaims, AuthError> {
    let keys = get_keys()?;
    let mut validation = Validation::new(Algorithm::RS256);
    validation.validate_exp = true;
    validation.required_spec_claims.clear();

    decode::<RefreshClaims>(token, &keys.decoding_key, &validation)
        .map(|decoded| decoded.claims)
        .map_err(|_| AuthError::TokenExpired)
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::{
        issue_access_token, issue_refresh_token, verify_access_token, verify_refresh_token,
    };

    const TEST_PRIVATE_KEY: &str = r#"-----BEGIN PRIVATE KEY-----
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
5CfBwyBd+CBZTk/Q9QgLeL//xkQe
-----END PRIVATE KEY-----
"#;

    const TEST_PUBLIC_KEY: &str = r#"-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA69VjJ8tf+LblcBZSCuEq
paGexAcHM+X/29H68D2w8EeYLY66sNNMP1JQgWo2GaYAWY6GP4LyOI9qdpX1LAg6
W45MmqmIhVAv9bkHdZVBvN8Zh2muZzUvlesk6tupirzE3rtplBE8vQw5HRYWKkWy
JEirCwYFjDe+p6W2xKUUFHJvtiihxKHa2wt06FGUABkEM0WthmEAQs4aiGxJynae
TmQp9UY/vljrc66Mnc9QXhkWgjTOGteqnkTTz3EvzEMfM/cJpjtg45YhF2WBaIKO
qDAUQnzxyhkpS47wX/nQZpxxkG/VYDNvzMra0HbZFnK1rT7By29/Yl9WjKvNBsNO
hYBekaudBYda2ZDqSK9gXlesuYFSxN8mZkH642GIsFqqIlysxO27m7h5WW2FAE20
6CkjbTbgsR3G3EIso9aIas/LI4fjeBVz+2/XIAbh2hiGt8RYAMruUkeid6iS/Djk
8PxK+qTd/0NnweFG+Q7NQq+twsqzYOg5vIbnGHRj9yJRaCmSX+zjVEukaqIs5Kcw
+8tFl6HTj8Tv88qA0jfyx2IUpIGDpa6D58sizhQKH4zufkMfMbI18VV7B0xu0UKy
J4lAzCzJXeMDALmrI4xA07EMIfusF7knw4UKw+aGbgBNt2+4GJBcWMLHXNAMaFri
hHKV+xm3XhLS+WzWahrfcgUCAwEAAQ==
-----END PUBLIC KEY-----
"#;

    #[test]
    fn jwt_access_round_trip() {
        let keys =
            super::RsaKeys::from_pem(TEST_PRIVATE_KEY.as_bytes(), TEST_PUBLIC_KEY.as_bytes())
                .unwrap();
        let mut guard = super::RSA_KEYS.write().unwrap();
        *guard = Some(keys);

        let user_id = Uuid::new_v4();
        let tenant_id = Uuid::new_v4();
        let tenant_id_string = tenant_id.to_string();
        let token = issue_access_token(
            user_id,
            "teacher@edusync.dev",
            "teacher",
            Some(tenant_id),
            false,
        )
        .expect("token should be generated");

        let claims = verify_access_token(&token).expect("token should verify");
        assert_eq!(claims.sub, user_id.to_string());
        assert_eq!(claims.email, "teacher@edusync.dev");
        assert_eq!(claims.role, "teacher");
        assert_eq!(claims.tenant_id.as_deref(), Some(tenant_id_string.as_str()));
        assert!(!claims.mfa_verified);
    }

    #[test]
    fn jwt_refresh_round_trip() {
        let keys =
            super::RsaKeys::from_pem(TEST_PRIVATE_KEY.as_bytes(), TEST_PUBLIC_KEY.as_bytes())
                .unwrap();
        let mut guard = super::RSA_KEYS.write().unwrap();
        *guard = Some(keys);

        let user_id = Uuid::new_v4();
        let (token, jti) = issue_refresh_token(user_id).expect("token should be generated");

        let claims = verify_refresh_token(&token).expect("token should verify");
        assert_eq!(claims.sub, user_id.to_string());
        assert_eq!(claims.jti, jti);
    }
}
