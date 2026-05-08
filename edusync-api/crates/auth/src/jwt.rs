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

    const TEST_PRIVATE_KEY: &str = r#"-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAx2v7c+1RrVZo4a8GtvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7
G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5u
G9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPH
L8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G
+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7
-----END RSA PRIVATE KEY-----"#;

    const TEST_PUBLIC_KEY: &str = r#"-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAx2v7c+1RrVZo4a8GtvhtPHL8
c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtP
HL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tv
htPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tv
htPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tv
htPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tv
htPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7DQID
A QAB
-----END PUBLIC KEY-----"#;


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
