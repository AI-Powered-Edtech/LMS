//! Rapor signature flow — Workstream F1.
//!
//! The DB-side state machine + RPC `public.sign_rapor()` already lives in
//! migration 053. This module is the thin HTTP layer:
//!
//! - `POST /api/v1/rapor/:id/sign` — body `{ "role": "guru" | "wali_kelas" | "kepsek", "notes"?: "..." }`
//! - `POST /api/v1/rapor/:id/publish` — only kepsek/admin; flips status from
//!   `kepsek_signed` to `published`.
//!
//! RBAC is enforced through the role match in `sign_rapor` (DB-level guard)
//! plus the policy entry. Wrong role at wrong stage → DB raises P0003 → 400.

use axum::extract::Path;
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};

use crate::extractors::AuthedRequest;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct SignBody {
    pub role: String,
    pub notes: Option<String>,
}

fn role_allowed(roles: &[String], expected: &str) -> bool {
    let want = match expected {
        "guru" => "teacher",
        other => other,
    };
    roles
        .iter()
        .any(|r| r.eq_ignore_ascii_case(want) || r.eq_ignore_ascii_case(expected))
}

/// POST /api/v1/rapor/:id/sign
pub async fn sign_rapor_handler(
    svc: ServiceCtx,
    AuthedRequest(ctx): AuthedRequest,
    Path(rapor_id): Path<Uuid>,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let req: SignBody = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;
    if !role_allowed(&ctx.roles, &req.role) {
        return Err(VilError::forbidden(format!(
            "User tidak punya peran {} untuk tanda tangan rapor",
            req.role
        )));
    }

    let state = svc.state::<AppState>()?.clone();
    let pool = &state.db;

    let row: (Uuid, String) = sqlx::query_as(
        "SELECT id, status FROM public.sign_rapor($1, $2, $3, $4, NULL)",
    )
    .bind(rapor_id)
    .bind(ctx.user_id)
    .bind(&req.role)
    .bind(req.notes.as_deref())
    .fetch_one(pool)
    .await
    .map_err(|e| {
        // P0003 → invalid step (e.g. wali_kelas signing before guru). Surface
        // as 400 so the FE can show a readable message instead of the
        // generic 500.
        let msg = e.to_string();
        if msg.contains("invalid signature step") {
            VilError::bad_request(msg)
        } else {
            VilError::internal(msg)
        }
    })?;

    Ok(VilResponse::ok(json!({
        "rapor_id": row.0,
        "status": row.1,
    })))
}

/// POST /api/v1/rapor/:id/publish
pub async fn publish_rapor_handler(
    svc: ServiceCtx,
    AuthedRequest(ctx): AuthedRequest,
    Path(rapor_id): Path<Uuid>,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let allowed = ["admin", "principal", "kepsek"];
    if !ctx
        .roles
        .iter()
        .any(|r| allowed.iter().any(|a| r.eq_ignore_ascii_case(a)))
    {
        return Err(VilError::forbidden(
            "Hanya kepala sekolah / admin yang dapat menerbitkan rapor",
        ));
    }

    let state = svc.state::<AppState>()?.clone();
    let pool = &state.db;

    let updated: Option<(String,)> = sqlx::query_as(
        "UPDATE public.rapor_documents \
            SET status = 'published', updated_at = now() \
          WHERE id = $1 AND tenant_id = $2 AND status = 'kepsek_signed' \
        RETURNING status",
    )
    .bind(rapor_id)
    .bind(ctx.tenant_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| VilError::internal(e.to_string()))?;

    match updated {
        Some((status,)) => Ok(VilResponse::ok(json!({
            "rapor_id": rapor_id,
            "status": status,
        }))),
        None => Err(VilError::bad_request(
            "Rapor belum siap dipublish (butuh tanda tangan kepsek terlebih dahulu)",
        )),
    }
}
