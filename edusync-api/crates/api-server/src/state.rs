use sqlx::PgPool;
use edusync_middleware::brute_force::BruteForceTracker;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub jwt_secret: String,
    pub jwt_refresh_secret: String,
    pub brute_force: BruteForceTracker,
}
