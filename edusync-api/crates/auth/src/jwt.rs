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
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDhVQg6kMMBcINM
9W+0MrB8TJYPuNsK+BibiqDrscaaC5ddtIFY/iTJ8gKADQ7QwXVDhNnz8WAqBlpB
ViR+6naldtW7KtiRn1zImkYLfo/EIhtbiMevrmiMQZciyzV9irk1skh92HlwW7Zf
asqMTmw0L/CLuI+s1SGDAELcvog+zyPbMC4swdERKdu5t17wrVF6S53Dno78J3qf
w0EfQ9+306o86m9uqZyHP8sxLkSGzdBRkTP4wNtzgX7hARvBCVXLE8iWqCyKufUX
2uclZGQX/MQAqwq8hhFffaJB5ushegq1lIDIJX+ExhjRqXvW9kRY0S5MaSOzs/dd
ikMV2LGRAgMBAAECggEADFuM+CVF7zdxQ/sL4BPi65Y0U/K9NI9MTi9z9Ckg7Vl9
uM+0Q6IAeNYdvqcOAnMxpVJ3tNyue5ozQJ+4SwDnITDwt3M57avnO0CBXz0Be8NW
a8Exw61AIj0F9wxc8nXKrYAJtg51WSz2cKowfIcKgRwwnYEG2XbWKn3iV4KC11WL
fwgNjrL4E2dECJj7nctA1M1jIvG0NpgyVKMQZvt12D3VFkyGnSJrQCke6Q7F+e4z
Lw8EzH2LQ1Mf31XlQn3YeMvc9wEssZBGT4ArTOQz3xabKwHb0eDc3E7YM+JcXmcn
6mDZcB3JU1/6cDUAQe8sKJ4W5/WCv4ahThVhCG1lJwKBgQD3zvlHxUqqpk+n29Vu
C7F9qJwz3O5nmUmzR1x5MrGwdHie3Dtmmw7BlHyf76TaGuxErH0OCRFAdizCnKJx
ZqOlDUkRZofDeK5lItR/IV30oKJbyjcyjbdz144DSOfBJI3v3AHFQgQsfzDBw7DA
13XESUHJYrxMadeXxHvH4CxZowKBgQDox9tzYQ2bv5l2UaXz+R1OjOBvCpwIc99E
ldR6l7DP/sB7tFTL87zTnj/Yj6jAwdbCJnudZ/+ufcKr4D3oBQNLJn6mmgTFtRW+
rIqnDACWhm5YGHbZKcLAQO6rqI3A3NI0BqoYlXaoZiggotz0YzNIuIoM7sYWf9v1
Ru5fopJjOwKBgG4bySfawhKRU1OCmpMLHxJ2mPFyeXwO4HCIhM5VeB6voej0cnBk
9WmOUNG/6b//tnvNKMPTw5ag68KNVqCMuqnb/Vt981UnilXl5AWZDeZkeb/PWjdc
QOd4H+HVwyRO2cJ6P08mxjP/T+rIyQDmu607379b388UOHd3Foj5UruBAoGBAKe3
j8ryy25DPxu7ujktbMsyv2XiHAgPDHeLCHuHnbJO13qJtGr6YzuJknDDGRBA2S4r
sfb4foTHQaK6v3/TVMspoikBYZzdWxx1jrTK9gV+ODSq876F0zbX0d7GY9Pohl9L
yfRKhCLS7+iLz20ZqFKl+3lT9E8zslRn1cn8BUMPAoGADW62iuaIIxtg3NQ9E3kb
8CK8i1JyLyrrTGrgheb8v4gGNF0tFBpyarxTMhCWKI0CL5mp3xG8n5s+7xk6wsRZ
OQEp0TZ43fp+K0rRnvGVSxHB+md7nw8AejaF0oblCEFV0EeRym/ZIlOV0yraeiCT
/TbeI/xxi9X9Fmfb0+cwY/w=
-----END PRIVATE KEY-----"#;

    const TEST_PUBLIC_KEY: &str = r#"-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4VUIOpDDAXCDTPVvtDKw
fEyWD7jbCvgYm4qg67HGmguXXbSBWP4kyfICgA0O0MF1Q4TZ8/FgKgZaQVYkfup2
pXbVuyrYkZ9cyJpGC36PxCIbW4jHr65ojEGXIss1fYq5NbJIfdh5cFu2X2rKjE5s
NC/wi7iPrNUhgwBC3L6IPs8j2zAuLMHRESnbubde8K1Rekudw56O/Cd6n8NBH0Pf
t9OqPOpvbqmchz/LMS5Ehs3QUZEz+MDbc4F+4QEbwQlVyxPIlqgsirn1F9rnJWRk
F/zEAKsKvIYRX32iQebrIXoKtZSAyCV/hMYY0al71vZEWNEuTGkjs7P3XYpDFdix
kQIDAQAB
-----END PUBLIC KEY-----"#;

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
