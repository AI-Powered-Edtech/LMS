//! Midtrans webhook receiver (Fase 4 Unit 32).
//!
//! Endpoint: POST /api/v1/webhooks/midtrans
//!
//! AUTHORITATIVE: Midtrans is the chosen payment gateway. Their webhook posts
//! a JSON body documenting transaction state changes. We:
//!   1. Insert the raw payload into payment_transactions for audit
//!   2. Update the matching invoice's status if order_id is known
//!   3. Verify the signature_key per Midtrans docs (sha512(order_id + status_code + gross_amount + server_key))
//!
//! Server key is read from MIDTRANS_SERVER_KEY env var per tenant config (or
//! a tenant-scoped key from integration_configs in a future iteration).
//!
//! This is the public-facing webhook — NO EduSync auth required, but signature
//! verification is mandatory.

use serde::Deserialize;
use serde_json::json;
use sha2::{Digest, Sha512};
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};

#[derive(Debug, Deserialize)]
pub struct MidtransNotification {
    pub order_id: String,
    pub transaction_id: Option<String>,
    pub transaction_status: String,
    pub fraud_status: Option<String>,
    pub status_code: String,
    pub gross_amount: String,
    pub signature_key: String,
    pub payment_type: Option<String>,
    pub transaction_time: Option<String>,
    pub settlement_time: Option<String>,
}

fn verify_signature(notification: &MidtransNotification, server_key: &str) -> bool {
    let payload = format!(
        "{}{}{}{}",
        notification.order_id, notification.status_code, notification.gross_amount, server_key
    );
    let mut hasher = Sha512::new();
    hasher.update(payload.as_bytes());
    let computed = hex::encode(hasher.finalize());
    // Constant-time-ish comparison
    computed == notification.signature_key
}

/// POST /api/v1/webhooks/midtrans
pub async fn midtrans_webhook_handler(
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let raw_payload: serde_json::Value = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    let notification: MidtransNotification = serde_json::from_value(raw_payload.clone())
        .map_err(|e| VilError::bad_request(format!("invalid Midtrans notification: {e}")))?;

    // Fail-closed: an unset key means we cannot verify the signature, and
    // accepting unsigned notifications would let anyone forge a "paid" event.
    // Match the Snap-creation handler's posture: explicit 503 on missing key
    // rather than silent acceptance.
    let server_key = std::env::var("MIDTRANS_SERVER_KEY").unwrap_or_default();
    if server_key.is_empty() {
        tracing::error!(
            order_id = %notification.order_id,
            "MIDTRANS_SERVER_KEY not set — refusing to accept unsigned Midtrans webhook"
        );
        return Err(VilError::internal(
            "MIDTRANS_SERVER_KEY belum dikonfigurasi",
        ));
    }
    if !verify_signature(&notification, &server_key) {
        tracing::warn!(
            order_id = %notification.order_id,
            "Midtrans webhook signature mismatch — rejecting"
        );
        return Err(VilError::forbidden("invalid signature"));
    }

    let state = svc.state::<crate::state::AppState>()?.clone();
    let pool = &state.db;

    // Look up tenant + invoice from order_id.
    let invoice_row: Option<(uuid::Uuid, uuid::Uuid)> = sqlx::query_as(
        "SELECT id, tenant_id FROM public.invoices WHERE midtrans_order_id = $1 LIMIT 1",
    )
    .bind(&notification.order_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| VilError::internal(e.to_string()))?;

    let (invoice_id, tenant_id) = match invoice_row {
        Some(row) => (Some(row.0), row.1),
        None => {
            tracing::warn!(
                order_id = %notification.order_id,
                "Midtrans webhook: no invoice match — recording as orphan transaction"
            );
            (None, uuid::Uuid::nil())
        }
    };

    // Insert raw transaction record (idempotent on midtrans_transaction_id).
    sqlx::query(
        r#"
        INSERT INTO public.payment_transactions
          (invoice_id, tenant_id, midtrans_transaction_id, midtrans_order_id,
           payment_type, transaction_status, fraud_status, gross_amount,
           transaction_time, settlement_time, raw_response)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::numeric,
                $9::timestamptz, $10::timestamptz, $11::jsonb)
        ON CONFLICT (midtrans_transaction_id) DO UPDATE SET
          transaction_status = EXCLUDED.transaction_status,
          fraud_status       = EXCLUDED.fraud_status,
          settlement_time    = EXCLUDED.settlement_time,
          raw_response       = EXCLUDED.raw_response
        "#,
    )
    .bind(invoice_id)
    .bind(tenant_id)
    .bind(notification.transaction_id.as_deref())
    .bind(&notification.order_id)
    .bind(notification.payment_type.as_deref())
    .bind(&notification.transaction_status)
    .bind(notification.fraud_status.as_deref())
    .bind(&notification.gross_amount)
    .bind(notification.transaction_time.as_deref())
    .bind(notification.settlement_time.as_deref())
    .bind(&raw_payload)
    .execute(pool)
    .await
    .map_err(|e| VilError::internal(e.to_string()))?;

    // Map Midtrans status to invoice status:
    //   settlement / capture (with fraud_status=accept) → paid
    //   pending                                          → pending (no-op)
    //   deny / cancel / expire / failure                 → cancelled
    //
    // C2: emit `invoice.paid` to domain_events outbox EXACTLY ONCE per
    // invoice transition. Idempotency comes from the conditional UPDATE
    // (`WHERE status <> 'paid'`): if the row already moved to paid we get
    // 0 rows affected and skip event emission. This handles webhook
    // retries without producing duplicate notifications downstream.
    if let Some(inv_id) = invoice_id {
        let new_status = match notification.transaction_status.as_str() {
            "settlement" => Some("paid"),
            "capture" if notification.fraud_status.as_deref() == Some("accept") => Some("paid"),
            "deny" | "cancel" | "expire" | "failure" => Some("cancelled"),
            _ => None,
        };

        if let Some(status) = new_status {
            let rows_updated = if status == "paid" {
                sqlx::query(
                    "UPDATE public.invoices \
                     SET status = $1, amount_paid = amount_due, updated_at = now() \
                     WHERE id = $2 AND status <> 'paid'",
                )
                .bind(status)
                .bind(inv_id)
                .execute(pool)
                .await
                .map_err(|e| VilError::internal(e.to_string()))?
                .rows_affected()
            } else {
                sqlx::query(
                    "UPDATE public.invoices \
                     SET status = $1, updated_at = now() \
                     WHERE id = $2 AND status <> $1",
                )
                .bind(status)
                .bind(inv_id)
                .execute(pool)
                .await
                .map_err(|e| VilError::internal(e.to_string()))?
                .rows_affected()
            };

            tracing::info!(
                order_id = %notification.order_id,
                new_status = status,
                rows_updated,
                "Invoice status updated from Midtrans webhook"
            );

            if status == "paid" && rows_updated > 0 {
                // Outbox emission. Failure here MUST NOT roll back the
                // invoice update — the webhook is at-least-once; downstream
                // can be reconciled from the invoice state. Log + continue.
                let payload = json!({
                    "invoice_id": inv_id,
                    "tenant_id": tenant_id,
                    "order_id": notification.order_id,
                    "midtrans_transaction_id": notification.transaction_id,
                    "gross_amount": notification.gross_amount,
                    "settlement_time": notification.settlement_time,
                });
                if let Err(e) = sqlx::query(
                    "SELECT public.emit_domain_event($1, $2, $3, $4, $5)",
                )
                .bind(tenant_id)
                .bind("invoice.paid")
                .bind("invoice")
                .bind(inv_id)
                .bind(&payload)
                .execute(pool)
                .await
                {
                    tracing::error!(
                        order_id = %notification.order_id,
                        error = %e,
                        "Failed to emit invoice.paid domain event — manual reconcile may be required"
                    );
                }
            }
        }
    }

    Ok(VilResponse::ok(json!({ "received": true })))
}
