use std::sync::Arc;

use axum::{extract::Extension, Json};
use serde_json::{json, Value};

use crate::state::AppState;

pub async fn health_handler(Extension(state): Extension<Arc<AppState>>) -> Json<Value> {
    let _ = &state.jwt_secret;
    let db_ok = sqlx::query("SELECT 1").fetch_one(&state.db).await.is_ok();

    Json(json!({
        "status": if db_ok { "ok" } else { "degraded" },
        "database": if db_ok { "connected" } else { "error" },
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

pub async fn ready_handler() -> Json<Value> {
    Json(json!({ "status": "ready" }))
}
