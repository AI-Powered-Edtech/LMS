use crate::state::AppState;
use edusync_auth::{jwt::RefreshClaims, verify_refresh_token, AuthError};

pub fn verify_refresh_token_with_session_secret(
    _state: &AppState,
    token: &str,
) -> Result<RefreshClaims, AuthError> {
    verify_refresh_token(token)
}

#[cfg(test)]
mod tests {
    use sqlx::postgres::PgPoolOptions;
    use uuid::Uuid;

    use crate::state::{AppState, ShadowRuntimeConfig, SmtpConfig};
    use edusync_auth::jwt::{init_rsa_keys, issue_refresh_token};
    use edusync_middleware::brute_force::BruteForceTracker;

    use super::verify_refresh_token_with_session_secret;

    const TEST_PRIVATE_KEY: &[u8] = r#"-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAx2v7c+1RrVZo4a8GtvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7
G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5u
G9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPH
L8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G
+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7
-----END RSA PRIVATE KEY-----"#
        .as_bytes();

    const TEST_PUBLIC_KEY: &[u8] = r#"-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAx2v7c+1RrVZo4a8GtvhtPHL8
c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtP
HL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tv
htPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tv
htPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tv
htPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7G+tvhtPHL8c8F5uG9lM/3qK7A QAB
-----END PUBLIC KEY-----"#
        .as_bytes();

    #[test]
    fn refresh_token_verified_with_rsa_keys() {
        init_rsa_keys(TEST_PRIVATE_KEY, TEST_PUBLIC_KEY).expect("should init keys");

        let db = PgPoolOptions::new()
            .connect_lazy("postgres://localhost/edusync_test")
            .expect("should create lazy pool");

        let state = AppState {
            db,
            brute_force: BruteForceTracker::new(),
            shadow: ShadowRuntimeConfig {
                enabled: false,
                divergence_sample_rate: 0.0,
            },
            groq_api_key: None,
            vapid_private_key: None,
            vapid_public_key: None,
            smtp: SmtpConfig {
                from_email: "noreply@edusync.dev".to_string(),
                ..Default::default()
            },
            whatsapp_access_token: None,
            whatsapp_phone_number_id: None,
            s3_endpoint: None,
            s3_bucket: "test-bucket".to_string(),
            s3_public_url: None,
            cache: None,
        };

        let user_id = Uuid::new_v4();
        let (token, _) = issue_refresh_token(user_id).expect("should issue refresh token");

        verify_refresh_token_with_session_secret(&state, &token)
            .expect("refresh token should verify");
    }
}
