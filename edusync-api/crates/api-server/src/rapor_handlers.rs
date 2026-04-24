use axum::{
    extract::Path,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use sqlx::Row;
use crate::state::AppState;
use crate::extractors::AuthedRequest;
use uuid::Uuid;
use vil_server::prelude::{HandlerResult, ServiceCtx, VilError, VilResponse};

pub async fn generate_rapor(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    Path(student_id): Path<Uuid>,
) -> HandlerResult<impl IntoResponse> {
    let state = svc.state::<AppState>()?;
    let tenant_id = ctx.tenant_id;
    
    let rapor_res: Result<sqlx::postgres::PgRow, sqlx::Error> = sqlx::query(
        "INSERT INTO public.rapor_documents (tenant_id, student_id, status)
         VALUES ($1, $2, 'DRAFT')
         RETURNING id"
    )
    .bind(tenant_id)
    .bind(student_id)
    .fetch_one(&state.db)
    .await;

    match rapor_res {
        Ok(row) => {
            let rapor_id: Uuid = row.get("id");
            Ok(VilResponse::ok(json!({"rapor_id": rapor_id, "status": "DRAFT"})))
        },
        Err(e) => {
            tracing::error!("Failed to create rapor");
            Err(VilError::internal("Failed to create rapor"))
        }
    }
}

pub async fn sign_rapor(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    Path(rapor_id): Path<Uuid>,
) -> HandlerResult<impl IntoResponse> {
    let state = svc.state::<AppState>()?;
    let tenant_id = ctx.tenant_id;
    
    let update_res: Result<Option<sqlx::postgres::PgRow>, sqlx::Error> = sqlx::query(
        "UPDATE public.rapor_documents SET status = 'SIGNED_WALI' WHERE id = $1 AND tenant_id = $2 RETURNING status"
    )
    .bind(rapor_id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match update_res {
        Ok(Some(row)) => {
            let status: String = row.get("status");
            Ok(VilResponse::ok(json!({"status": status})))
        },
        Ok(None) => Err(VilError::not_found("Rapor not found")),
        Err(e) => {
            tracing::error!("Failed to sign rapor");
            Err(VilError::internal("Failed to sign rapor"))
        }
    }
}
