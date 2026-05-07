# G2 BE — AI Tutor Token-Streaming Refactor (PLAN)

**Status**: PLAN, BUKAN CODE EDIT. Refactor butuh `cargo check` round-trip yang tidak tersedia di sandbox audit ini.

## State sekarang

- Endpoint: `POST /api/v1/ai/tutor/stream` di `crates/api-server/src/ai_tutor_real.rs`
- Handler memanggil `edusync_services::ai::tutor::tutor_chat()` (non-streaming) lalu emit single SSE chunk dengan seluruh balasan.
- `tutor_chat()` di `crates/services/src/ai/tutor.rs:170-260` pakai `SseCollect::post_to(GROQ_API_URL).dialect(SseDialect::openai()).collect_text().await` — buffer penuh, bukan stream.
- FE komponen `AITutorPanel` sudah konsumsi async generator (handoff confirms G2 FE done).

## Target

FE menerima token incremental melalui SSE `event: chunk` dengan latency first-token < 500 ms.

## Refactor plan (estimasi 1 hari)

### Step 1 — Tambah varian streaming di `tutor.rs`

Buat fungsi paralel `tutor_chat_stream()` yang return `impl Stream<Item = Result<String, VilError>>`. Logic identik dengan `tutor_chat` SAMPAI step 9 (call_groq_tutor), lalu:

```rust
// (current) reply = call_groq_tutor(messages).await?
// (new) stream = call_groq_tutor_stream(messages).await?
```

`call_groq_tutor_stream` pakai `reqwest::Client::post(GROQ_API_URL).bearer_auth(api_key).json(&body).send().await?.bytes_stream()` lalu parse SSE `data:` lines per chunk → emit `String` token.

Persist message + audit log dilakukan SETELAH stream selesai (accumulate full reply di handler).

### Step 2 — Update `ai_tutor_real.rs`

Ganti single-chunk emit dengan loop `while let Some(token) = stream.next().await`:

```rust
let (tx, rx) = mpsc::channel(32);
tokio::spawn(async move {
    while let Some(token) = stream.next().await {
        let chunk = format!("event: chunk\ndata: {{\"type\":\"chunk\",\"content\":{}}}\n\n", 
            serde_json::to_string(&token?).unwrap());
        tx.send(Ok::<_, Infallible>(Bytes::from(chunk))).await?;
    }
    tx.send(Ok(Bytes::from("event: done\ndata: {}\n\n"))).await?;
});
let body = axum::body::Body::from_stream(ReceiverStream::new(rx));
```

### Step 3 — Backpressure test

```bash
curl -N -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"jelaskan fotosintesis"}],"lesson_id":"..."}' \
     http://localhost:8080/api/v1/ai/tutor/stream | head -c 200
```

Expect: token-by-token output, bukan satu blob.

### Step 4 — Persist + audit

Di akhir stream, accumulate full reply, lalu panggil `persist_session_messages` + `record_usage`. Jangan lakukan di tiap token (DB hammering).

### Step 5 — Rate limit interaction

`check_rate_limit` tetap di awal (sebelum stream dimulai). Tidak ada perubahan.

### Step 6 — Error handling mid-stream

Kalau Groq disconnect mid-stream, kirim `event: error` SSE + close. FE harus handle ini. Update FE `useAiStream` kalau perlu.

## Risk

- vil_server `SseCollect` mungkin tidak punya `.collect_stream()` / streaming primitive. Kalau tidak ada, drop down ke `reqwest` langsung (bypass vil_server SSE helper). Ada precedent di `grading.rs`/`quiz_gen.rs` yang juga pakai `SseCollect::collect_text()` — kalau switch ke streaming, perlu unify approach.
- Groq circuit breaker (`groq_circuit_breaker()`) perlu update path: `cb.record_success()` setelah stream selesai sukses, `cb.record_failure()` kalau stream error mid-way.

## DoD

1. `curl -N` test menunjukkan token incremental
2. `AITutorPanel` di FE menampilkan typing effect smooth
3. cargo build clean, no clippy regression
4. integration test baru: assert >5 distinct chunks per response
