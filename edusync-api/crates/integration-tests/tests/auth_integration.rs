// Integration tests for Phase 1B auth endpoints
// Run with: TEST_DATABASE_URL=... cargo test --test auth_integration
//
// These tests verify the auth handler logic compiles and basic JWT round-trips work.
// Full end-to-end DB tests require TEST_DATABASE_URL pointing at the remote dev DB.

use edusync_auth::jwt::{issue_access_token, issue_refresh_token, verify_access_token, verify_refresh_token};
use uuid::Uuid;

const TEST_SECRET: &str = "test-integration-secret-32-bytes!";

#[test]
fn access_token_round_trip() {
    let user_id = Uuid::new_v4();
    let tenant_id = Uuid::new_v4();

    let token = issue_access_token(
        user_id,
        "teacher@edusync.dev",
        "teacher",
        Some(tenant_id),
        true,
        TEST_SECRET,
    )
    .expect("should issue access token");

    let claims = verify_access_token(&token, TEST_SECRET)
        .expect("should verify access token");

    assert_eq!(claims.sub, user_id.to_string());
    assert_eq!(claims.email, "teacher@edusync.dev");
    assert_eq!(claims.role, "teacher");
    assert_eq!(claims.tenant_id.as_deref(), Some(tenant_id.to_string().as_str()));
    assert!(claims.mfa_verified);
}

#[test]
fn refresh_token_round_trip() {
    let user_id = Uuid::new_v4();

    let (token, jti) = issue_refresh_token(user_id, TEST_SECRET)
        .expect("should issue refresh token");

    let claims = verify_refresh_token(&token, TEST_SECRET)
        .expect("should verify refresh token");

    assert_eq!(claims.sub, user_id.to_string());
    assert_eq!(claims.jti, jti);
}

#[test]
fn invalid_token_rejected() {
    let result = verify_access_token("not.a.valid.token", TEST_SECRET);
    assert!(result.is_err());
}

#[test]
fn wrong_secret_rejected() {
    let user_id = Uuid::new_v4();
    let token = issue_access_token(user_id, "x@x.dev", "student", None, false, TEST_SECRET)
        .expect("should issue token");

    let result = verify_access_token(&token, "wrong-secret");
    assert!(result.is_err());
}

#[cfg(feature = "integration")]
mod db_tests {
    // DB integration tests — only run when TEST_DATABASE_URL is set
    // and feature "integration" is enabled.
    //
    // Example:
    //   TEST_DATABASE_URL=postgresql://... cargo test --test auth_integration --features integration

    use sqlx::PgPool;

    async fn get_test_pool() -> PgPool {
        let url = std::env::var("TEST_DATABASE_URL")
            .expect("TEST_DATABASE_URL must be set for db integration tests");
        PgPool::connect(&url).await.expect("should connect to test DB")
    }

    #[tokio::test]
    async fn users_table_accessible() {
        let pool = get_test_pool().await;
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM public.users")
            .fetch_one(&pool)
            .await
            .expect("should query users table");
        // Just verify the table exists and is accessible
        assert!(count >= 0);
    }

    #[tokio::test]
    async fn profiles_table_accessible() {
        let pool = get_test_pool().await;
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM public.profiles")
            .fetch_one(&pool)
            .await
            .expect("should query profiles table");
        assert!(count >= 0);
    }
}
