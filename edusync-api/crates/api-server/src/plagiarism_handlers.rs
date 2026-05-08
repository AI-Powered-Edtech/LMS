//! Plagiarism-check HTTP handler — VIL-style migration v2 (post-audit §11, 2026-05-08).
//!
//! v2 corrects v1 (commit fe6a44472) which used a local CheckPlagiarismRequest
//! and assumed wrong return type. Real service signature:
//!   - check_plagiarism -> Result<VilResponse<PlagiarismReport>, VilError>
//!
//! Handler is now a thin wrapper that just deserializes body and propagates.
//!
//! Endpoint:
//! - POST /api/v1/plagiarism/check → check_plagiarism_handler

use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};

use edusync_services::plagiarism::{CheckPlagiarismRequest, PlagiarismReport, check_plagiarism};

use crate::{extractors::AuthedRequest, state::AppState};

/// POST /api/v1/plagiarism/check
///
/// Cek similarity teks submisi siswa terhadap referensi internal.
pub async fn check_plagiarism_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<PlagiarismReport>> {
    let req: CheckPlagiarismRequest = body
        .json()
        .map_err(|e| VilError::bad_request(format!("invalid request: {e}")))?;

    let state = svc.state::<AppState>()?.clone();

    check_plagiarism(&state.db, ctx.user_id, ctx.tenant_id, req).await
}
