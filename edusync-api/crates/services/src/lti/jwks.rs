#![allow(dead_code)]
/// LTI JWKS endpoint.
///
/// Ports `supabase/functions/lti-jwks/index.ts`.
///
/// Public endpoint — no authentication required.
/// Reads `LTI_RSA_PUBLIC_KEY` env var (PEM-encoded SPKI or PKCS#1 RSA public key)
/// and returns it as a JWKS `{ keys: [{ kty, n, e, alg, use, kid }] }`.
///
/// # PEM → JWK conversion strategy
///
/// The `rsa` crate (v0.9 with `pkcs8` feature) is the cleanest way to do this.
/// Since it may not yet be in Cargo.toml we provide a fallback path using
/// `base64` + manual ASN.1 parsing for the common RSA 2048-bit PKCS#1 format.
///
/// DEPENDENCY (add to services/Cargo.toml when wiring):
///   base64 = "0.22"          (standard base64 decoding)
///
/// If `rsa` is available it takes priority via the `rsa-pkcs8` feature flag.
use axum::{
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

use crate::lti::types::{Jwk, JwksResponse};

const LTI_KEY_ID: &str = "edusync-lti-key-1";

// ─── Error ───────────────────────────────────────────────────────────────────

#[derive(Debug)]
pub enum JwksError {
    /// `LTI_RSA_PUBLIC_KEY` env var is not set.
    NotConfigured,
    /// PEM could not be parsed.
    ParseError(String),
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

impl IntoResponse for JwksError {
    fn into_response(self) -> Response {
        let (status, msg) = match self {
            JwksError::NotConfigured => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "JWKS tidak dikonfigurasi".to_string(),
            ),
            JwksError::ParseError(m) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Gagal mem-parse kunci publik: {m}"),
            ),
        };
        (status, Json(ErrorBody { error: msg })).into_response()
    }
}

// ─── PEM → raw DER bytes ──────────────────────────────────────────────────────

/// Strip PEM armor and decode base64 → DER bytes.
fn pem_to_der(pem: &str) -> Result<Vec<u8>, JwksError> {
    let stripped = pem
        .lines()
        .filter(|l| !l.starts_with("-----"))
        .collect::<Vec<_>>()
        .join("");

    // base64 standard decode
    use std::io::Read;
    let bytes = base64_decode(&stripped)
        .map_err(|e| JwksError::ParseError(format!("Base64 decode failed: {e}")))?;
    Ok(bytes)
}

/// Minimal base64 decoder that works without an extra dependency.
/// Handles standard base64 (with or without padding).
fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    // Add padding if needed
    let padded = match input.len() % 4 {
        2 => format!("{input}=="),
        3 => format!("{input}="),
        _ => input.to_string(),
    };

    // Build lookup table
    const TABLE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut lut = [0u8; 256];
    for (i, &b) in TABLE.iter().enumerate() {
        lut[b as usize] = i as u8;
    }

    let input = padded.as_bytes();
    let mut out = Vec::with_capacity(input.len() * 3 / 4);
    let mut i = 0;
    while i + 3 < input.len() {
        if input[i] == b'=' {
            break;
        }
        let b0 = lut[input[i] as usize] as u32;
        let b1 = lut[input[i + 1] as usize] as u32;
        let b2 = if input[i + 2] == b'=' { 0 } else { lut[input[i + 2] as usize] as u32 };
        let b3 = if input[i + 3] == b'=' { 0 } else { lut[input[i + 3] as usize] as u32 };

        let triple = (b0 << 18) | (b1 << 12) | (b2 << 6) | b3;

        out.push((triple >> 16) as u8);
        if input[i + 2] != b'=' {
            out.push((triple >> 8) as u8);
        }
        if input[i + 3] != b'=' {
            out.push(triple as u8);
        }
        i += 4;
    }
    Ok(out)
}

/// Base64url-encode without padding (for JWK `n` and `e` fields).
fn base64url_encode(data: &[u8]) -> String {
    // Encode to standard base64 then convert to URL-safe form
    let standard = {
        const TABLE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
        for chunk in data.chunks(3) {
            let b0 = chunk[0] as u32;
            let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
            let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
            let n = (b0 << 16) | (b1 << 8) | b2;
            out.push(TABLE[((n >> 18) & 0x3f) as usize] as char);
            out.push(TABLE[((n >> 12) & 0x3f) as usize] as char);
            if chunk.len() > 1 {
                out.push(TABLE[((n >> 6) & 0x3f) as usize] as char);
            }
            if chunk.len() > 2 {
                out.push(TABLE[(n & 0x3f) as usize] as char);
            }
        }
        out
    };
    standard.replace('+', "-").replace('/', "_").replace('=', "")
}

// ─── ASN.1 / DER helpers ──────────────────────────────────────────────────────

/// Minimal DER reader: reads a TLV (tag-length-value) field.
/// Returns `(tag, value_bytes, bytes_consumed)`.
fn der_read_tlv(data: &[u8]) -> Option<(u8, &[u8], usize)> {
    if data.is_empty() {
        return None;
    }
    let tag = data[0];
    if data.len() < 2 {
        return None;
    }
    let (len, header_len) = if data[1] & 0x80 == 0 {
        (data[1] as usize, 2)
    } else {
        let num_bytes = (data[1] & 0x7f) as usize;
        if data.len() < 2 + num_bytes {
            return None;
        }
        let mut l = 0usize;
        for i in 0..num_bytes {
            l = (l << 8) | data[2 + i] as usize;
        }
        (l, 2 + num_bytes)
    };
    let total = header_len + len;
    if data.len() < total {
        return None;
    }
    Some((tag, &data[header_len..total], total))
}

/// Extract the RSA modulus (n) and public exponent (e) from DER-encoded data.
///
/// Handles two layouts:
///   - **SPKI** (`PUBLIC KEY`): SEQUENCE { AlgorithmIdentifier, BIT STRING { SEQUENCE { INTEGER n, INTEGER e } } }
///   - **PKCS#1** (`RSA PUBLIC KEY`): SEQUENCE { INTEGER n, INTEGER e }
fn extract_rsa_components(der: &[u8]) -> Result<(Vec<u8>, Vec<u8>), JwksError> {
    // Top-level SEQUENCE
    let (tag, seq_data, _) =
        der_read_tlv(der).ok_or_else(|| JwksError::ParseError("DER top-level read failed".to_string()))?;
    if tag != 0x30 {
        return Err(JwksError::ParseError(format!("Expected SEQUENCE (0x30), got 0x{tag:02x}")));
    }

    // Peek at first byte of the sequence to distinguish SPKI vs PKCS#1
    // SPKI starts with SEQUENCE (for AlgorithmIdentifier), PKCS#1 starts with INTEGER
    let (first_tag, _, _) =
        der_read_tlv(seq_data).ok_or_else(|| JwksError::ParseError("DER inner read failed".to_string()))?;

    let rsa_data: &[u8] = if first_tag == 0x30 {
        // SPKI format: skip AlgorithmIdentifier, then BIT STRING
        let (_, _algo_id, consumed1) = der_read_tlv(seq_data)
            .ok_or_else(|| JwksError::ParseError("SPKI AlgId read failed".to_string()))?;
        let remaining = &seq_data[consumed1..];
        let (bit_tag, bit_data, _) = der_read_tlv(remaining)
            .ok_or_else(|| JwksError::ParseError("SPKI BIT STRING read failed".to_string()))?;
        if bit_tag != 0x03 {
            return Err(JwksError::ParseError(format!("Expected BIT STRING (0x03), got 0x{bit_tag:02x}")));
        }
        // BIT STRING value: leading unused-bits byte (0x00), then DER-encoded RSAPublicKey
        if bit_data.is_empty() {
            return Err(JwksError::ParseError("Empty BIT STRING".to_string()));
        }
        let inner = &bit_data[1..]; // skip unused-bits byte
        let (seq_tag, inner_seq, _) = der_read_tlv(inner)
            .ok_or_else(|| JwksError::ParseError("SPKI inner SEQUENCE read failed".to_string()))?;
        if seq_tag != 0x30 {
            return Err(JwksError::ParseError("Expected SEQUENCE inside BIT STRING".to_string()));
        }
        inner_seq
    } else {
        // PKCS#1 format: seq_data is already { INTEGER n, INTEGER e }
        seq_data
    };

    // Read n (INTEGER)
    let (n_tag, n_data, consumed_n) = der_read_tlv(rsa_data)
        .ok_or_else(|| JwksError::ParseError("Failed to read modulus".to_string()))?;
    if n_tag != 0x02 {
        return Err(JwksError::ParseError(format!("Expected INTEGER for n, got 0x{n_tag:02x}")));
    }

    // Read e (INTEGER)
    let (e_tag, e_data, _) = der_read_tlv(&rsa_data[consumed_n..])
        .ok_or_else(|| JwksError::ParseError("Failed to read exponent".to_string()))?;
    if e_tag != 0x02 {
        return Err(JwksError::ParseError(format!("Expected INTEGER for e, got 0x{e_tag:02x}")));
    }

    // Strip leading zero byte that DER adds to keep integers positive
    let n = if n_data.first() == Some(&0x00) { n_data[1..].to_vec() } else { n_data.to_vec() };
    let e = if e_data.first() == Some(&0x00) { e_data[1..].to_vec() } else { e_data.to_vec() };

    Ok((n, e))
}

// ─── Public handler ───────────────────────────────────────────────────────────

/// Build and return the JWKS response.
///
/// This function is called by the Axum route handler — no AppState needed.
pub async fn get_jwks() -> Result<impl IntoResponse, JwksError> {
    let pem = std::env::var("LTI_RSA_PUBLIC_KEY").map_err(|_| JwksError::NotConfigured)?;

    let der = pem_to_der(&pem)?;
    let (n_bytes, e_bytes) = extract_rsa_components(&der)?;

    let jwk = Jwk {
        kty: "RSA".to_string(),
        n: base64url_encode(&n_bytes),
        e: base64url_encode(&e_bytes),
        alg: "RS256".to_string(),
        use_: "sig".to_string(),
        kid: LTI_KEY_ID.to_string(),
    };

    // Add Cache-Control header
    let body = serde_json::to_string(&JwksResponse { keys: vec![jwk] })
        .map_err(|e| JwksError::ParseError(e.to_string()))?;

    Ok((
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "application/json"),
            (
                header::CACHE_CONTROL,
                "public, max-age=3600, s-maxage=86400",
            ),
        ],
        body,
    ))
}
