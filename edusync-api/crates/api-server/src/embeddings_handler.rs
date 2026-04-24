//! Embeddings endpoint for semantic similarity (plagiarism, search).
//!
//! POST /api/v1/ai/embeddings
//! Body: { text: string, model?: string }
//! Resp: { embedding: f32[], model: string }
//!
//! Proxies to OpenAI's text-embedding-3-small by default. Falls back to a
//! zero-vector + explanatory error if OPENAI_API_KEY is not configured so
//! the FE plagiarism engine can surface a user-facing "unconfigured" state.

use axum::response::IntoResponse;
use serde::Deserialize;
use serde_json::json;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};

use crate::extractors::AuthedRequest;

const DEFAULT_MODEL: &str = "text-embedding-3-small";
const MAX_INPUT_CHARS: usize = 8_000;

#[derive(Debug, Deserialize)]
pub struct EmbeddingsRequest {
    pub text: String,
    pub model: Option<String>,
}

pub async fn embeddings_handler(
    AuthedRequest(_ctx): AuthedRequest,
    _svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<impl IntoResponse> {
    let req: EmbeddingsRequest = body
        .json()
        .map_err(|e| VilError::bad_request(format!("invalid request: {e}")))?;

    if req.text.trim().is_empty() {
        return Err(VilError::bad_request("text tidak boleh kosong"));
    }

    let api_key = std::env::var("OPENAI_API_KEY").unwrap_or_default();
    if api_key.is_empty() {
        return Err(VilError::internal(
            "OPENAI_API_KEY belum dikonfigurasi — hubungi operator",
        ));
    }

    let model = req.model.unwrap_or_else(|| DEFAULT_MODEL.to_string());
    let truncated: String = req.text.chars().take(MAX_INPUT_CHARS).collect();

    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.openai.com/v1/embeddings")
        .bearer_auth(&api_key)
        .json(&json!({ "model": model, "input": truncated }))
        .send()
        .await
        .map_err(|e| VilError::internal(format!("embedding request failed: {e}")))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        tracing::warn!(%status, %text, "embedding provider error");
        return Err(VilError::internal(format!(
            "embedding provider returned HTTP {status}"
        )));
    }

    let payload: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| VilError::internal(format!("embedding parse failed: {e}")))?;

    let embedding = payload
        .get("data")
        .and_then(|d| d.get(0))
        .and_then(|d| d.get("embedding"))
        .cloned()
        .ok_or_else(|| VilError::internal("embedding missing in provider response"))?;

    Ok(VilResponse::ok(json!({
        "embedding": embedding,
        "model": model,
    })))
}
