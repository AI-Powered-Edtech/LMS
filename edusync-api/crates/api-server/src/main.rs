mod health;
mod observability;
mod state;

use dotenvy::dotenv;
use health::{health_handler, ready_handler};
use sqlx::postgres::PgPoolOptions;
use state::AppState;
use vil_server::prelude::{get, Method, ServiceProcess, VilApp};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "dev-secret-change-in-prod".to_string());
    let port = std::env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(8080);

    let db = PgPoolOptions::new()
        .max_connections(50)
        .connect(&database_url)
        .await?;

    let _sentry = observability::init_sentry();

    let app_state = AppState { db, jwt_secret };

    let health_service = ServiceProcess::new("system")
        .prefix("/api/v1")
        .endpoint(Method::GET, "/health", get(health_handler))
        .endpoint(Method::GET, "/ready", get(ready_handler))
        .state(app_state.clone());

    VilApp::new("edusync-api")
        .port(port)
        .profile("development")
        .observer(true)
        .state(app_state)
        .service(health_service)
        .run()
        .await;

    Ok(())
}
