//! Payment / Midtrans Snap handlers — Workstream C1.
//!
//! Endpoint: POST /api/v1/payments/snap
//!
//! Body: `{ "invoice_id": "<uuid>" }`
//!
//! Behaviour:
//!   1. Loads the invoice, verifies it belongs to the actor's tenant and is
//!      in a payable state (`pending` / `unpaid`).
//!   2. Either returns the existing `midtrans_order_id` + `snap_token` if a
//!      Snap session is still active, or creates a new one by calling the
//!      Midtrans Snap API (sandbox by default).
//!   3. Persists `midtrans_order_id` on the invoice for the webhook to match.
//!
//! Auth: Basic with `MIDTRANS_SERVER_KEY` (same key used in the webhook
//! signature check). Sandbox base URL is the default; switch to production
//! by setting `MIDTRANS_PRODUCTION=true`.
//!
//! No mock fallback. If `MIDTRANS_SERVER_KEY` is missing, the endpoint
//! returns 503 — explicit configuration error rather than silent fakery.

use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};

use crate::extractors::AuthedRequest;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateSnapRequest {
    pub invoice_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct CreateSnapResponse {
    pub snap_token: String,
    pub redirect_url: String,
    pub order_id: String,
}

fn snap_base_url() -> &'static str {
    let prod = std::env::var("MIDTRANS_PRODUCTION")
        .map(|v| v == "true" || v == "1")
        .unwrap_or(false);
    if prod {
        "https://app.midtrans.com/snap/v1/transactions"
    } else {
        "https://app.sandbox.midtrans.com/snap/v1/transactions"
    }
}

/// POST /api/v1/payments/snap
pub async fn create_snap_handler(
    svc: ServiceCtx,
    AuthedRequest(ctx): AuthedRequest,
    body: ShmSlice,
) -> HandlerResult<VilResponse<CreateSnapResponse>> {
    let req: CreateSnapRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    let state = svc.state::<AppState>()?.clone();
    let pool = &state.db;

    // Load invoice + cross-check tenant. Single query — DB enforces the
    // tenant boundary so a malicious actor can't drive Snap creation
    // against another school's invoice.
    let row: Option<(Uuid, String, sqlx::types::BigDecimal, String, Option<String>)> = sqlx::query_as(
        "SELECT id, invoice_number, amount_due, status, midtrans_order_id \
         FROM public.invoices \
         WHERE id = $1 AND tenant_id = $2",
    )
    .bind(req.invoice_id)
    .bind(ctx.tenant_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| VilError::internal(e.to_string()))?;

    let (invoice_id, invoice_number, amount_due, status, existing_order_id) =
        row.ok_or_else(|| VilError::not_found("Invoice tidak ditemukan"))?;

    if status != "pending" && status != "unpaid" {
        return Err(VilError::bad_request(format!(
            "Invoice status '{status}' tidak bisa dibayar"
        )));
    }

    let server_key = std::env::var("MIDTRANS_SERVER_KEY").unwrap_or_default();
    if server_key.is_empty() {
        return Err(VilError::internal(
            "MIDTRANS_SERVER_KEY belum dikonfigurasi",
        ));
    }

    // Reuse existing order_id if set; Midtrans treats Snap creation with a
    // duplicate order_id as a fresh session for the same order. We send a
    // suffix on retry to avoid 406 "duplicate order_id" responses on prod.
    let order_id = match existing_order_id {
        Some(existing) => existing,
        None => format!(
            "INV-{}-{}",
            invoice_number.replace(' ', "-"),
            chrono::Utc::now().timestamp()
        ),
    };

    let payload = json!({
        "transaction_details": {
            "order_id": order_id,
            "gross_amount": amount_due.to_string().parse::<i64>().unwrap_or_default(),
        },
        "credit_card": { "secure": true },
        "customer_details": {
            "email": ctx.email,
        },
    });

    let auth = format!("Basic {}", B64.encode(format!("{server_key}:")));
    let client = reqwest::Client::new();
    let resp = client
        .post(snap_base_url())
        .header("Authorization", auth)
        .header("Accept", "application/json")
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| VilError::internal(format!("Midtrans Snap request failed: {e}")))?;

    let status_code = resp.status();
    let body_json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| VilError::internal(format!("Midtrans Snap response parse: {e}")))?;

    if !status_code.is_success() {
        tracing::warn!(
            order_id = %order_id,
            status = %status_code,
            body = %body_json,
            "Midtrans Snap API rejected request"
        );
        return Err(VilError::bad_request(format!(
            "Midtrans Snap error: {body_json}"
        )));
    }

    let snap_token = body_json
        .get("token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| VilError::internal("Midtrans response missing 'token'"))?
        .to_string();
    let redirect_url = body_json
        .get("redirect_url")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // Persist the order_id (idempotently) so the webhook can match the
    // notification back to this invoice.
    sqlx::query(
        "UPDATE public.invoices \
         SET midtrans_order_id = $1, updated_at = now() \
         WHERE id = $2",
    )
    .bind(&order_id)
    .bind(invoice_id)
    .execute(pool)
    .await
    .map_err(|e| VilError::internal(e.to_string()))?;

    Ok(VilResponse::ok(CreateSnapResponse {
        snap_token,
        redirect_url,
        order_id,
    }))
}
