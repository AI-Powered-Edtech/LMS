use axum::{
    extract::Path,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::Row;
use crate::state::AppState;
use crate::extractors::AuthedRequest;
use uuid::Uuid;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};

#[derive(Deserialize, Serialize)]
pub struct MidtransWebhookPayload {
    pub order_id: String,
    pub transaction_status: String,
    pub fraud_status: Option<String>,
    pub payment_type: Option<String>,
    pub gross_amount: String,
}

pub async fn midtrans_webhook(
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<impl IntoResponse> {
    let state = svc.state::<AppState>()?;
    let payload: MidtransWebhookPayload = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    let order_id = &payload.order_id;
    let status = match payload.transaction_status.as_str() {
        "capture" | "settlement" => "SUCCESS",
        "deny" | "cancel" | "expire" => "FAILED",
        "pending" => "PENDING",
        _ => "PENDING"
    };

    let update_result: Result<Option<sqlx::postgres::PgRow>, sqlx::Error> = sqlx::query(
        "UPDATE public.payment_transactions 
         SET status = $1, webhook_payload = $2, updated_at = now()
         WHERE gateway_order_id = $3
         RETURNING invoice_id, tenant_id"
    )
    .bind(status)
    .bind(json!(&payload))
    .bind(order_id)
    .fetch_optional(&state.db)
    .await;

    match update_result {
        Ok(Some(row)) => {
            let invoice_id: Uuid = row.get("invoice_id");
            if status == "SUCCESS" {
                let _ = sqlx::query(
                    "UPDATE public.spp_invoices SET status = 'PAID', updated_at = now() WHERE id = $1"
                )
                .bind(invoice_id)
                .execute(&state.db)
                .await;
            }
            Ok(VilResponse::ok(json!({"status": "ok"})))
        },
        Ok(None) => Err(VilError::not_found("order not found")),
        Err(_) => {
            tracing::error!("DB error handling webhook");
            Err(VilError::internal("db error"))
        }
    }
}

#[derive(Deserialize)]
pub struct CreatePaymentReq {
    pub invoice_id: Uuid,
}

pub async fn create_payment(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<impl IntoResponse> {
    let state = svc.state::<AppState>()?;
    let req: CreatePaymentReq = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    let tenant_id = ctx.tenant_id;
    
    let invoice: Result<Option<sqlx::postgres::PgRow>, sqlx::Error> = sqlx::query(
        "SELECT amount::text as amount FROM public.spp_invoices WHERE id = $1 AND tenant_id = $2"
    )
    .bind(req.invoice_id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let invoice = match invoice {
        Ok(Some(i)) => i,
        Ok(None) => return Err(VilError::not_found("Invoice not found")),
        Err(_) => return Err(VilError::internal("DB Error")),
    };

    let amount: String = invoice.get("amount");
    let order_id = format!("INV-{}-{}", req.invoice_id, Uuid::new_v4().simple().to_string().chars().take(8).collect::<String>());

    let insert_res: Result<sqlx::postgres::PgRow, sqlx::Error> = sqlx::query(
        "INSERT INTO public.payment_transactions (tenant_id, invoice_id, gateway, gateway_order_id, amount, status)
         VALUES ($1, $2, 'MIDTRANS', $3, $4::numeric, 'PENDING')
         RETURNING id"
    )
    .bind(tenant_id)
    .bind(req.invoice_id)
    .bind(&order_id)
    .bind(&amount)
    .fetch_one(&state.db)
    .await;

    if insert_res.is_err() {
        return Err(VilError::internal("Failed to create transaction"));
    }

    let snap_token = format!("snap-{}", Uuid::new_v4());
    
    let _ = sqlx::query("UPDATE public.payment_transactions SET snap_token = $1 WHERE gateway_order_id = $2")
        .bind(&snap_token)
        .bind(&order_id)
        .execute(&state.db)
        .await;

    Ok(VilResponse::ok(json!({
        "snap_token": snap_token,
        "order_id": order_id
    })))
}
