use crate::state::AppState;
use edusync_auth::{jwt::RefreshClaims, verify_refresh_token, AuthError};

pub fn verify_refresh_token_with_session_secret(
    state: &AppState,
    token: &str,
) -> Result<RefreshClaims, AuthError> {
    verify_refresh_token(token, &state.jwt_secret)
}

#[cfg(test)]
mod tests {
    use sqlx::postgres::PgPoolOptions;
    use uuid::Uuid;

    use crate::state::{AppState, ShadowRuntimeConfig, SmtpConfig};
    use edusync_auth::jwt::issue_refresh_token;
    use edusync_middleware::brute_force::BruteForceTracker;

    use super::verify_refresh_token_with_session_secret;

    #[test]
    fn refresh_token_verified_with_same_secret_as_session_issuance() {
        let db = PgPoolOptions::new()
            .connect_lazy("postgres://localhost/edusync_test")
            .expect("should create lazy pool");

        let state = AppState {
            db,
            jwt_secret: "session-secret-32-bytes-minimum-123456".to_string(),
            jwt_refresh_secret: "refresh-secret-32-bytes-minimum-abcdef".to_string(),
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
        };

        let user_id = Uuid::new_v4();
        let (token, _) = issue_refresh_token(user_id, &state.jwt_secret)
            .expect("should issue refresh token with session secret");

        verify_refresh_token_with_session_secret(&state, &token)
            .expect("refresh token should verify with session secret");

        assert!(edusync_auth::verify_refresh_token(&token, &state.jwt_refresh_secret).is_err());
    }
}
