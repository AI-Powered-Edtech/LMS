//! Rapor PDF endpoint — Workstream E3 (skeleton).
//!
//! `POST /api/v1/pdf/rapor/:rapor_id`
//!
//! Pulls rapor data from `rapor_kurmer` + joins (rombel, profiles, subjects),
//! shells out to `services/pdf-renderer/render.mjs` with a JSON payload, and
//! returns the binary PDF in the response body.
//!
//! ### RBAC posture (shadow-mode aligned)
//! `rbac_policy.yaml` already has `POST /pdf/rapor/{id} → wali_kelas, principal,
//! admin, kepsek`. The shadow evaluator will log "would_deny" for other roles
//! while we collect data. After A3 hard-enforce flips the rapor module, the
//! middleware will 403 outright — this handler stays unchanged.
//!
//! ### Why shell out instead of an HTTP sidecar
//! POC. The sidecar / pool is v1 (ADR-003 §"Memory / deployment plan").
//! A child-process per request is fine for dev school volumes; production
//! switches to a long-lived Node service that exposes `POST /render`.

use axum::extract::Path;
use axum::http::{header, StatusCode};
use axum::response::IntoResponse;
use serde_json::json;
use std::io::Write;
use std::process::{Command, Stdio};
use uuid::Uuid;
use vil_server::prelude::{HandlerResult, ServiceCtx, VilError};

use crate::extractors::AuthedRequest;
use crate::state::AppState;

fn renderer_path() -> String {
    std::env::var("PDF_RENDERER_PATH")
        .unwrap_or_else(|_| "services/pdf-renderer/render.mjs".to_string())
}

/// POST /api/v1/pdf/rapor/:rapor_id
pub async fn render_rapor_pdf_handler(
    svc: ServiceCtx,
    AuthedRequest(ctx): AuthedRequest,
    Path(rapor_id): Path<Uuid>,
) -> HandlerResult<impl IntoResponse> {
    let state = svc.state::<AppState>()?.clone();
    let pool = &state.db;

    // Single-shot data load. The query joins the minimum tables to populate
    // the renderer fixture shape; deeper joins (per-CP descriptions, sikap)
    // come once F1 lands and the published-rapor view is finalised.
    let row: Option<(serde_json::Value,)> = sqlx::query_as(
        r#"
        SELECT jsonb_build_object(
            'school',  jsonb_build_object(
                'nama',   t.name,
                'alamat', COALESCE(t.address, ''),
                'npsn',   COALESCE(t.npsn, '')
            ),
            'student', jsonb_build_object(
                'nama', p.full_name,
                'nis',  COALESCE(p.nis, ''),
                'nisn', COALESCE(p.nisn, '')
            ),
            'rombel',  jsonb_build_object(
                'nama',       r.name,
                'wali_kelas', COALESCE(wk.full_name, '-'),
                'fase',       COALESCE(rk.fase, '-')
            ),
            'semester', jsonb_build_object(
                'nama',  COALESCE(s.name, '-'),
                'tahun', COALESCE(ay.label, '-')
            ),
            'subjects',   COALESCE(rk.subjects_jsonb,   '[]'::jsonb),
            'attendance', COALESCE(rk.attendance_jsonb, '{}'::jsonb),
            'signatures', jsonb_build_object(
                'wali_kelas', COALESCE(wk.full_name, ''),
                'kepsek',     COALESCE(kp.full_name, ''),
                'published',  COALESCE(rk.status, '') = 'published'
            )
        ) AS payload
        FROM public.rapor_kurmer rk
        JOIN public.profiles  p  ON p.id  = rk.student_id
        JOIN public.rombel    r  ON r.id  = rk.rombel_id
        LEFT JOIN public.profiles wk ON wk.id = r.wali_kelas_id
        LEFT JOIN public.profiles kp ON kp.id = rk.kepsek_id
        LEFT JOIN public.semesters s ON s.id = rk.semester_id
        LEFT JOIN public.academic_years ay ON ay.id = s.academic_year_id
        JOIN public.tenants   t  ON t.id  = rk.tenant_id
        WHERE rk.id = $1 AND rk.tenant_id = $2
        "#,
    )
    .bind(rapor_id)
    .bind(ctx.tenant_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| VilError::internal(e.to_string()))?;

    let payload = row
        .ok_or_else(|| VilError::not_found("Rapor tidak ditemukan"))?
        .0;

    let input = json!({ "template": "rapor-kurmer-v1", "data": payload });
    let pdf = render_via_node(&input)?;

    let response = (
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "application/pdf".to_string()),
            (
                header::CONTENT_DISPOSITION,
                format!("inline; filename=\"rapor-{rapor_id}.pdf\""),
            ),
        ],
        pdf,
    )
        .into_response();
    Ok(response)
}

fn render_via_node(input: &serde_json::Value) -> Result<Vec<u8>, VilError> {
    let mut child = Command::new("node")
        .arg(renderer_path())
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| VilError::internal(format!("spawn pdf-renderer: {e}")))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(input.to_string().as_bytes())
            .map_err(|e| VilError::internal(format!("write to renderer: {e}")))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| VilError::internal(format!("renderer wait: {e}")))?;

    if !output.status.success() {
        return Err(VilError::internal(format!(
            "renderer failed: {}",
            String::from_utf8_lossy(&output.stderr)
        )));
    }
    Ok(output.stdout)
}
