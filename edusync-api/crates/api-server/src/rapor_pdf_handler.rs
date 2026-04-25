//! Rapor PDF endpoint — Workstream E3 (skeleton).
//!
//! `POST /api/v1/pdf/rapor/:rapor_id`
//!
//! Pulls rapor data from `rapor_documents` + joins (rombel, profiles,
//! semesters, academic_years, subject_grades aggregate, signatures), shells
//! out to `services/pdf-renderer/render.mjs` with a JSON payload, and returns
//! the binary PDF in the response body.
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

    // Single-shot data load against the actual rapor_documents schema
    // (migration 053). subject grades come from rapor_subject_grades; the
    // kepsek signature is looked up in rapor_signatures. Tenant-level
    // address / NPSN and per-student NIS are placeholders — those columns
    // do not exist in the current schema and will be filled in once the
    // school-profile / dossiers join lands.
    let row: Option<(serde_json::Value,)> = sqlx::query_as(
        r#"
        SELECT jsonb_build_object(
            'school',  jsonb_build_object(
                'nama',   t.name,
                'alamat', '',
                'npsn',   ''
            ),
            'student', jsonb_build_object(
                'nama', COALESCE(p.full_name, rd.student_name),
                'nis',  '',
                'nisn', COALESCE(rd.nisn, '')
            ),
            'rombel',  jsonb_build_object(
                'nama',       COALESCE(r.name, rd.rombel_name, '-'),
                'wali_kelas', COALESCE(wk.full_name, '-'),
                'fase',       '-'
            ),
            'semester', jsonb_build_object(
                'nama',  COALESCE(s.name, '-'),
                'tahun', COALESCE(ay.label, s.academic_year, '-')
            ),
            'subjects', COALESCE(
                (SELECT jsonb_agg(jsonb_build_object(
                    'nama',       sg.subject_name,
                    'nilai',      sg.nilai_akhir,
                    'descriptor', sg.descriptor::text,
                    'deskripsi',  sg.deskripsi_capaian
                ) ORDER BY sg.subject_name)
                   FROM public.rapor_subject_grades sg
                  WHERE sg.rapor_id = rd.id),
                '[]'::jsonb
            ),
            'attendance', '{}'::jsonb,
            'signatures', jsonb_build_object(
                'wali_kelas', COALESCE(wk.full_name, ''),
                'kepsek', COALESCE(
                    (SELECT pk.full_name
                       FROM public.rapor_signatures rs
                       JOIN public.profiles pk ON pk.id = rs.signer_id
                      WHERE rs.rapor_id = rd.id
                        AND rs.signer_role = 'kepsek'
                      LIMIT 1),
                    ''
                ),
                'published', rd.status = 'published'
            )
        ) AS payload
        FROM public.rapor_documents rd
        LEFT JOIN public.profiles p ON p.id = rd.student_id
        LEFT JOIN public.rombel r ON r.id = rd.rombel_id
        LEFT JOIN public.profiles wk ON wk.id = r.wali_kelas_id
        LEFT JOIN public.semesters s ON s.id = rd.semester_id
        LEFT JOIN public.academic_years ay ON ay.id = rd.academic_year_id
        JOIN public.tenants t ON t.id = rd.tenant_id
        WHERE rd.id = $1 AND rd.tenant_id = $2
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
