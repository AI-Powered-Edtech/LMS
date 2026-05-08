
use serde_json::json;
use vil_server::prelude::*;

use crate::state::AppState;

pub async fn health_handler(ctx: ServiceCtx) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = ctx.state::<AppState>().map(|s| std::sync::Arc::new(s.clone()))?;
    let db_ok = sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(&state.db)
        .await
        .is_ok();

    Ok(VilResponse::ok(json!({
        "status": if db_ok { "ok" } else { "degraded" },
        "database": if db_ok { "connected" } else { "error" },
        "version": env!("CARGO_PKG_VERSION"),
    })))
}

pub async fn ready_handler() -> VilResponse<serde_json::Value> {
    VilResponse::ok(json!({ "status": "ready" }))
}
