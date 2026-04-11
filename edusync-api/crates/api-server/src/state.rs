use edusync_middleware::brute_force::BruteForceTracker;
use sqlx::PgPool;

#[derive(Clone)]
pub struct ShadowRuntimeConfig {
    pub enabled: bool,
    pub divergence_sample_rate: f64,
}

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub jwt_secret: String,
    pub jwt_refresh_secret: String,
    pub brute_force: BruteForceTracker,
    pub shadow: ShadowRuntimeConfig,
}
