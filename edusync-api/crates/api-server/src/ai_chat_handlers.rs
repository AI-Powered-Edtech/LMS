//! Generic AI chat proxy handlers for frontend helpers.
//!
//! Keeps provider API keys server-side for `/api/v1/ai/chat` and
//! `/api/v1/ai/chat/stream` while preserving the simple FE contract.

use axum::response::{
    sse::{Event, KeepAlive, Sse},
    IntoResponse,
};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::{convert::Infallible, time::Duration};
use tokio_stream::wrappers::ReceiverStream;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};

use crate::extractors::AuthedRequest;

const GROQ_URL: &str = "https://api.groq.com/openai/v1/chat/completions";
const ANTHROPIC_URL: &str = "https://api.anthropic.com/v1/messages";
const DEFAULT_GROQ_MODEL: &str = "llama-3.3-70b-versatile";
const DEFAULT_ANTHROPIC_MODEL: &str = "claude-sonnet-4-6";

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum AiProvider {
    Groq,
    Anthropic,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AiMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AiChatRequest {
    pub provider: AiProvider,
    pub model: Option<String>,
    pub messages: Vec<AiMessage>,
    #[serde(default, alias = "maxTokens")]
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
    #[allow(dead_code)]
    pub stream: Option<bool>,
    #[allow(dead_code)]
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct AiChatResponse {
    pub content: String,
    pub tokens_input: u32,
    pub tokens_output: u32,
    #[serde(rename = "tokensInput")]
    pub tokens_input_camel: u32,
    #[serde(rename = "tokensOutput")]
    pub tokens_output_camel: u32,
    pub provider: AiProvider,
    pub model: String,
}

pub async fn ai_chat_handler(
    AuthedRequest(_ctx): AuthedRequest,
    _svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<AiChatResponse>> {
    let req: AiChatRequest = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;
    validate_request(&req)?;
    let response = complete_chat(req).await?;
    Ok(VilResponse::ok(response))
}

pub async fn ai_chat_stream_handler(
    AuthedRequest(_ctx): AuthedRequest,
    _svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<impl IntoResponse> {
    let req: AiChatRequest = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;
    let (tx, rx) = tokio::sync::mpsc::channel::<Result<Event, Infallible>>(100);

    tokio::spawn(async move {
        let _ = tx
            .send(Ok(Event::default()
                .event("start")
                .data("{\"status\":\"processing\"}")))
            .await;

        let result = match validate_request(&req) {
            Ok(()) => stream_chat(req, &tx).await,
            Err(e) => Err(e),
        };

        match result {
            Ok(()) => {
                let _ = tx
                    .send(Ok(Event::default().event("done").data("[DONE]")))
                    .await;
            }
            Err(e) => {
                let error_data = serde_json::json!({
                    "error": e.to_string(),
                    "status": "failed"
                });
                let _ = tx
                    .send(Ok(Event::default()
                        .event("error")
                        .data(&error_data.to_string())))
                    .await;
            }
        }
    });

    Ok(Sse::new(ReceiverStream::new(rx)).keep_alive(
        KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("keep-alive"),
    ))
}

fn validate_request(req: &AiChatRequest) -> Result<(), VilError> {
    if req.messages.is_empty() {
        return Err(VilError::bad_request("messages wajib diisi"));
    }
    if req.messages.iter().any(|m| {
        m.content.trim().is_empty() || !matches!(m.role.as_str(), "system" | "user" | "assistant")
    }) {
        return Err(VilError::bad_request(
            "messages berisi role/konten tidak valid",
        ));
    }
    Ok(())
}

async fn complete_chat(req: AiChatRequest) -> Result<AiChatResponse, VilError> {
    match req.provider {
        AiProvider::Groq => complete_groq(req).await,
        AiProvider::Anthropic => complete_anthropic(req).await,
    }
}

async fn complete_groq(req: AiChatRequest) -> Result<AiChatResponse, VilError> {
    let api_key = std::env::var("GROQ_API_KEY")
        .map_err(|_| VilError::internal("GROQ_API_KEY tidak dikonfigurasi"))?;
    let model = req.model.unwrap_or_else(|| DEFAULT_GROQ_MODEL.to_string());
    let client = reqwest::Client::new();
    let res = client
        .post(GROQ_URL)
        .bearer_auth(api_key)
        .json(&serde_json::json!({
            "model": model,
            "messages": req.messages,
            "temperature": req.temperature.unwrap_or(0.7),
            "max_tokens": req.max_tokens.unwrap_or(1024),
            "stream": false
        }))
        .send()
        .await
        .map_err(|e| VilError::internal(format!("AI request gagal: {e}")))?;

    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        return Err(VilError::internal(format!(
            "Groq API error {status}: {text}"
        )));
    }

    let value: serde_json::Value = res
        .json()
        .await
        .map_err(|e| VilError::internal(format!("AI response tidak valid: {e}")))?;
    let content = value["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or_default()
        .to_string();
    let tokens_input = value["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as u32;
    let tokens_output = value["usage"]["completion_tokens"].as_u64().unwrap_or(0) as u32;

    Ok(AiChatResponse {
        content,
        tokens_input,
        tokens_output,
        tokens_input_camel: tokens_input,
        tokens_output_camel: tokens_output,
        provider: AiProvider::Groq,
        model,
    })
}

async fn complete_anthropic(req: AiChatRequest) -> Result<AiChatResponse, VilError> {
    let api_key = std::env::var("ANTHROPIC_API_KEY")
        .map_err(|_| VilError::internal("ANTHROPIC_API_KEY tidak dikonfigurasi"))?;
    let model = req
        .model
        .unwrap_or_else(|| DEFAULT_ANTHROPIC_MODEL.to_string());
    let (system, messages) = split_anthropic_messages(req.messages);
    let mut body = serde_json::json!({
        "model": model,
        "messages": messages,
        "temperature": req.temperature.unwrap_or(0.7),
        "max_tokens": req.max_tokens.unwrap_or(1024)
    });
    if let Some(system) = system {
        body["system"] = serde_json::Value::String(system);
    }

    let client = reqwest::Client::new();
    let res = client
        .post(ANTHROPIC_URL)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .json(&body)
        .send()
        .await
        .map_err(|e| VilError::internal(format!("AI request gagal: {e}")))?;

    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        return Err(VilError::internal(format!(
            "Anthropic API error {status}: {text}"
        )));
    }

    let value: serde_json::Value = res
        .json()
        .await
        .map_err(|e| VilError::internal(format!("AI response tidak valid: {e}")))?;
    let content = value["content"]
        .as_array()
        .map(|parts| {
            parts
                .iter()
                .filter_map(|part| part["text"].as_str())
                .collect::<Vec<_>>()
                .join("")
        })
        .unwrap_or_default();
    let tokens_input = value["usage"]["input_tokens"].as_u64().unwrap_or(0) as u32;
    let tokens_output = value["usage"]["output_tokens"].as_u64().unwrap_or(0) as u32;

    Ok(AiChatResponse {
        content,
        tokens_input,
        tokens_output,
        tokens_input_camel: tokens_input,
        tokens_output_camel: tokens_output,
        provider: AiProvider::Anthropic,
        model,
    })
}

async fn stream_chat(
    req: AiChatRequest,
    tx: &tokio::sync::mpsc::Sender<Result<Event, Infallible>>,
) -> Result<(), VilError> {
    match req.provider {
        AiProvider::Groq => stream_groq(req, tx).await,
        AiProvider::Anthropic => {
            // Keep one SSE contract for the FE: emit the collected response as one chunk.
            let response = complete_anthropic(req).await?;
            send_chunk(tx, &response.content).await;
            Ok(())
        }
    }
}

async fn stream_groq(
    req: AiChatRequest,
    tx: &tokio::sync::mpsc::Sender<Result<Event, Infallible>>,
) -> Result<(), VilError> {
    let api_key = std::env::var("GROQ_API_KEY")
        .map_err(|_| VilError::internal("GROQ_API_KEY tidak dikonfigurasi"))?;
    let model = req.model.unwrap_or_else(|| DEFAULT_GROQ_MODEL.to_string());
    let client = reqwest::Client::new();
    let res = client
        .post(GROQ_URL)
        .bearer_auth(api_key)
        .json(&serde_json::json!({
            "model": model,
            "messages": req.messages,
            "temperature": req.temperature.unwrap_or(0.7),
            "max_tokens": req.max_tokens.unwrap_or(1024),
            "stream": true
        }))
        .send()
        .await
        .map_err(|e| VilError::internal(format!("AI stream gagal: {e}")))?;

    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        return Err(VilError::internal(format!(
            "Groq API error {status}: {text}"
        )));
    }

    let mut stream = res.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| VilError::internal(format!("Stream error: {e}")))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buffer.find("\n\n") {
            let event = buffer[..pos].to_string();
            buffer = buffer[pos + 2..].to_string();
            for line in event.lines().filter(|line| line.starts_with("data:")) {
                let data = line.trim_start_matches("data:").trim();
                if data == "[DONE]" {
                    return Ok(());
                }
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(token) = json["choices"][0]["delta"]["content"].as_str() {
                        if !token.is_empty() {
                            send_chunk(tx, token).await;
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

async fn send_chunk(tx: &tokio::sync::mpsc::Sender<Result<Event, Infallible>>, chunk: &str) {
    let data = serde_json::json!({
        "delta": chunk,
        "content": chunk,
    });
    let _ = tx
        .send(Ok(Event::default().event("token").data(&data.to_string())))
        .await;
}

fn split_anthropic_messages(messages: Vec<AiMessage>) -> (Option<String>, Vec<AiMessage>) {
    let mut system_parts = Vec::new();
    let mut chat_messages = Vec::new();
    for message in messages {
        if message.role == "system" {
            system_parts.push(message.content);
        } else {
            chat_messages.push(message);
        }
    }
    let system = if system_parts.is_empty() {
        None
    } else {
        Some(system_parts.join("\n\n"))
    };
    (system, chat_messages)
}
