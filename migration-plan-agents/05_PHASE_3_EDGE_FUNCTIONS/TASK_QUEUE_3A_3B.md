# TASK QUEUE — Phase 3A: AI Functions + 3B: LTI 1.3

**Week 39-46 | ~70-80 jam**

## Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** gunakan `npm` atau `yarn` — gunakan `pnpm` (frontend) atau `cargo` (backend)
3. **Semua teks UI/error** harus Bahasa Indonesia
4. **Semua AI functions** WAJIB punya `CircuitBreaker` — jangan skip
5. **Semua handler** gunakan Pattern A (Axum-style)
6. **API error format:** `{ code, message, details, hint }` (PostgREST compatible)
7. **JANGAN** ubah `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`
8. **JANGAN** buat keputusan arsitektur baru — ikuti spec yang sudah locked
9. Jalankan `cargo check && cargo clippy -- -D warnings && cargo test` setelah setiap task
10. Jika menemukan Groq API incompatibility atau LTI spec gap → **BLOCKED**, jangan improvisasi

---

## Task 3A-0: Verify VIL AI Module API Signatures

```
TASK ID:       3A-0
OWNER TYPE:    Verification Agent
GOAL:          Clone VIL repo, verify actual SseCollect + CircuitBreaker +
               VilError API signatures. Document any mismatches.
DEPENDENCY:    Tidak ada
READ FIRST:    - https://github.com/OceanOS-id/VIL (clone repo)
EDIT ONLY:     - docs/vil-api-verification.md (BUAT BARU)
```

**Steps:**

1. Clone VIL repo: `git clone https://github.com/OceanOS-id/VIL.git /tmp/vil-ref`
2. Verify `SseCollect` API: constructor, methods, dialect support
3. Verify `SseDialect` API: `SseDialect::openai()` exists
4. Verify `CircuitBreaker` API: constructor, `.check()`, `.record_success()`, `.record_failure()`
5. Verify `VilError` API: error factory methods

**Verify:** `grep -rn "pub struct SseCollect" /tmp/vil-ref/`

**STOP IF:** VIL repo tidak accessible → BLOCKED

---

## Task 3A-0b: Resolve VilError Type + Create Error Adapter

```
TASK ID:       3A-0b
OWNER TYPE:    Rust CRUD Agent
GOAL:          Based on 3A-0 findings, ensure a VilError-compatible error type
               exists. Use AppError from Phase 1A if VilError unavailable.
DEPENDENCY:    Task 3A-0 selesai
READ FIRST:    - crates/middleware/src/errors.rs (AppError dari Phase 1A-5)
EDIT ONLY:     - crates/services/src/errors.rs
```

**Steps:**

1. If VIL exports `VilError` → re-export: `pub use vil_server::prelude::VilError;`
2. If different name → create type alias
3. If none exists → create `VilError` enum matching assumed API

**Verify:** `cargo check --all-targets`

---

## Task 3A-1: AI Common Types, Config & Circuit Breaker Singleton

```
TASK ID:       3A-1
OWNER TYPE:    Rust CRUD Agent
GOAL:          Buat shared types, Groq config, dan CircuitBreaker singleton
               yang dipakai oleh semua 4 AI handlers.
DEPENDENCY:    Phase 1A scaffold selesai
EDIT ONLY:     - crates/services/src/ai/mod.rs
               - crates/services/src/ai/types.rs
               - crates/services/src/ai/config.rs
```

**Creates:**

- `ai/types.rs` — GradeEssayRequest/Response, TutorChatRequest/Response, GenerateContentRequest/Response, GenerateQuizRequest/Response
- `ai/config.rs` — GROQ_CB singleton, API URL, model, temperature settings
- `ai/mod.rs` — re-exports

**Verify:** `cargo check -p edusync-services`

---

## Task 3A-2: AI Grade Essay Handler

```
TASK ID:       3A-2
OWNER TYPE:    Rust CRUD Agent
GOAL:          Port ai-grade-essay Edge Function (187 lines Deno) ke Rust handler
               dengan VIL SseCollect + CircuitBreaker.
DEPENDENCY:    Task 3A-1 selesai
READ FIRST:    - supabase/functions/ai-grade-essay/index.ts
EDIT ONLY:     - crates/services/src/ai/grading.rs
```

**Implements:**

- Rubric loading dari DB
- Grading prompt construction
- Groq API call via SseCollect
- Response parsing ke GradeEssayResponse struct
- AI quota increment

**Rate limit:** 50/hr per user

**Verify:** `cargo check -p edusync-services && cargo test -- ai::grading`

---

## Task 3A-3: AI Tutor Chat Handler (PALING KOMPLEKS)

```
TASK ID:       3A-3
OWNER TYPE:    Rust CRUD Agent
GOAL:          Port ai-tutor Edge Function (674 lines Deno) ke Rust handler.
               Conversation state di DB, context injection dari lesson + student progress.
DEPENDENCY:    Task 3A-1 selesai
READ FIRST:    - supabase/functions/ai-tutor/index.ts (LENGKAP - 674 lines)
EDIT ONLY:     - crates/services/src/ai/tutor.rs
```

**Implements:**

- Session loading/creation dari `ai_tutor_sessions` table
- Context injection: lesson content + student progress + struggle topics
- Messages array construction dengan system prompt + history
- Groq API call via SseCollect
- Assistant response saved ke session di DB
- AI quota increment

**Rate limit:** 50/hr per user

**Verify:** `cargo check -p edusync-services && cargo test -- ai::tutor`

---

## Task 3A-3b: Migration untuk ai_tutor_sessions Table

```
TASK ID:       3A-3b
OWNER TYPE:    Rust CRUD Agent
GOAL:          Buat SQL migration untuk ai_tutor_sessions table jika belum ada.
DEPENDENCY:    Tidak ada (bisa paralel dengan 3A-1)
READ FIRST:    - supabase/migrations/
EDIT ONLY:     - edusync-api/migrations/<timestamp>_create_ai_tutor_sessions.sql
```

**Creates:**

- `ai_tutor_sessions` table (id, student_id, course_id, lesson_id, messages_json, timestamps, tenant_id)
- Indexes untuk student_id + tenant_id
- RLS policy

**Verify:** `cargo sqlx migrate run`

---

## Task 3A-4: Generate AI Content Handler

```
TASK ID:       3A-4
OWNER TYPE:    Rust CRUD Agent
GOAL:          Port generate-ai-content Edge Function (476 lines Deno) ke Rust handler.
DEPENDENCY:    Task 3A-1 selesai
READ FIRST:    - supabase/functions/generate-ai-content/index.ts
EDIT ONLY:     - crates/services/src/ai/content_gen.rs
```

**Implements:**

- Content type routing (explanation, summary, exercise, example)
- Context loading (course, lesson)
- Content validation (profanity filter, quality check)
- Groq API call via SseCollect

**Verify:** `cargo check -p edusync-services && cargo test -- ai::content_gen`

---

## Task 3A-5: Generate Quiz from Content Handler

```
TASK ID:       3A-5
OWNER TYPE:    Rust CRUD Agent
GOAL:          Port generate-quiz-from-content Edge Function (~200 lines) ke Rust.
DEPENDENCY:    Task 3A-1 selesai
READ FIRST:    - supabase/functions/generate-quiz-from-content/index.ts
EDIT ONLY:     - crates/services/src/ai/quiz_gen.rs
```

**Implements:**

- Quiz question generation dari lesson content
- Multiple choice, true/false, short answer support
- Question validation
- Groq API call via SseCollect

**Verify:** `cargo check -p edusync-services && cargo test -- ai::quiz_gen`

---

## Task 3B-1: LTI OIDC Login Handler

```
TASK ID:       3B-1
OWNER TYPE:    Rust CRUD Agent
GOAL:          Port lti-oidc-login Edge Function ke Rust handler.
DEPENDENCY:    Task 3A-5 selesai
READ FIRST:    - supabase/functions/lti-oidc-login/index.ts
EDIT ONLY:     - crates/services/src/lti/mod.rs
               - crates/services/src/lti/oidc_login.rs
```

**Implements:**

- Platform registration validation
- Nonce generation + storage di `lti_nonces` table
- Auth redirect URL construction
- Redirect to platform

**Verify:** `cargo check -p edusync-services`

---

## Task 3B-2: LTI Launch Handler

```
TASK ID:       3B-2
OWNER TYPE:    Rust CRUD Agent
GOAL:          Port lti-launch Edge Function ke Rust handler.
DEPENDENCY:    Task 3B-1 selesai
READ FIRST:    - supabase/functions/lti-launch/index.ts
EDIT ONLY:     - crates/services/src/lti/launch.rs
```

**Implements:**

- id_token validation (RS256)
- Nonce validation (prevent replay)
- Claims extraction (sub, email, roles)
- Guest user creation: `lti-{platformId8}-{sub}@lti.edusync.internal`
- JWT generation
- Redirect ke app dengan token

**Verify:** `cargo check -p edusync-services && cargo test -- lti::launch`

---

## Task 3B-3: LTI JWKS Endpoint

```
TASK ID:       3B-3
OWNER TYPE:    Rust CRUD Agent
GOAL:          Port lti-jwks Edge Function ke Rust handler.
DEPENDENCY:    Task 3B-2 selesai
READ FIRST:    - supabase/functions/lti-jwks/index.ts
EDIT ONLY:     - crates/services/src/lti/jwks.rs
```

**Implements:**

- RSA public key retrieval
- JWKS response construction
- Public endpoint (no auth required)

**Verify:** `cargo check -p edusync-services`

---

## Task 3B-4: LTI Tables Migration

```
TASK ID:       3B-4
OWNER TYPE:    Rust CRUD Agent
GOAL:          Buat SQL migration untuk LTI tables jika belum ada.
DEPENDENCY:    Tidak ada
READ FIRST:    - supabase/migrations/
EDIT ONLY:     - edusync-api/migrations/<timestamp>_create_lti_tables.sql
```

**Creates:**

- `lti_platforms` table (id, issuer, client_id, deployment_id, key_set_url, token_url, jwks_url, platform_name)
- `lti_nonces` table (nonce, platform_id, expires_at) — service_role only
- `lti_user_links` table (user_id, platform_id, platform_sub, tenant_id)

**Verify:** `cargo sqlx migrate run`

**STOP IF:** Tables sudah ada → SKIP

---

## Output Deliverables

After Phase 3A-3B:

| Deliverable                                  | Status |
| -------------------------------------------- | ------ |
| AI Common Types + Config + CB                | ⬜     |
| ai-grade-essay handler                       | ⬜     |
| ai-tutor handler (paling kompleks)           | ⬜     |
| ai_tutor_sessions table                      | ⬜     |
| generate-ai-content handler                  | ⬜     |
| generate-quiz-from-content handler           | ⬜     |
| lti-oidc-login handler                       | ⬜     |
| lti-launch handler                           | ⬜     |
| lti-jwks endpoint                            | ⬜     |
| LTI tables                                   | ⬜     |
| Nginx routes `/api/v1/ai/*`, `/api/v1/lti/*` | ⬜     |

---

## Effort Estimate

| Wave   | Tasks              | Jam    | Parallelism |
| ------ | ------------------ | ------ | ----------- |
| Pre    | 3A-0 + 3A-0b       | 3-4    | Serial      |
| Wave 1 | 3A-1               | 3-4    | Serial      |
| Wave 2 | 3A-2 + 3A-3b       | 8-10   | Parallel    |
| Wave 3 | 3A-3               | 8-10   | Serial      |
| Wave 4 | 3A-4 + 3A-5        | 6-8    | Parallel    |
| Wave 5 | 3B-1 + 3B-3 + 3B-4 | 6-8    | Parallel    |
| Wave 6 | 3B-2               | 4-6    | Serial      |
| Total  |                    | ~70-80 |             |
