# Phase 3: Edge Functions → VIL Services

**EduSync LMS — Migrasi Supabase → VIL Backend**

## Gambaran

Phase 3 mengimplementasikan dan memigrasikan Edge Functions ke Rust handlers menggunakan VIL Framework. Semua logika bisnis yang sebelumnya berjalan di Supabase Edge Functions (Deno) dipindahkan ke backend VIL yang berjalan di Rust.

## Timeline

**Weeks 39-52 | ~200 jam total**

| Sub-phase         | Weeks | Jam Est. | Deskripsi                                                    |
| ----------------- | ----- | -------- | ------------------------------------------------------------ |
| 3A: AI Functions  | 39-43 | ~45-50   | ai-grade-essay, ai-tutor, generate-ai-content, generate-quiz |
| 3B: LTI 1.3       | 43-46 | ~25-30   | lti-oidc-login, lti-launch, lti-jwks                         |
| 3C: Notifications | 46-48 | ~40-45   | Email (digest, parent digest), Push, WhatsApp, PDF           |
| 3D: Processing    | 49-50 | ~30-35   | Quiz grading, progress events, SCORM, bulk import            |
| 3E: Cron Jobs     | 50-52 | ~20-25   | Background jobs migration dari pg_cron ke vil_trigger_cron   |

## Sub-Phase Structure

### 3A: AI Functions (Weeks 39-43)

Menggunakan **VIL SseCollect** untuk streaming proxy ke Groq API dan **CircuitBreaker** untuk fault tolerance.

**Edge Functions yang di-port:**

- `ai-grade-essay` (187 lines) → AI grading dengan rubric-based scoring
- `ai-tutor` (674 lines) — paling kompleks, conversation state management
- `generate-ai-content` (476 lines) — content generation dengan validasi
- `generate-quiz-from-content` (~200 lines) — quiz generation dari lesson content

**VIL built-in yang digunakan:**

- `SseCollect::post_to()` — streaming proxy ke Groq
- `SseDialect::openai()` — handles done-signal detection
- `CircuitBreaker` — fault tolerance untuk AI service

### 3B: LTI 1.3 (Weeks 43-46)

Integrasi Learning Tools Interoperability untuk platform pembelajaran eksternal (Canvas, Moodle).

**Edge Functions yang di-port:**

- `lti-oidc-login` — OIDC login initiation
- `lti-launch` — LTI launch dengan validasi dan user provisioning
- `lti-jwks` — Public JWKS untuk platform

### 3C: Notifications & Communication (Weeks 46-48)

**Edge Functions yang di-port:**

- `send-email-digest` — Daily email digest
- `send-parent-digest` — Parent report digest
- `send-push` — Push notifications via VAPID
- `whatsapp-webhook` — WhatsApp incoming handler
- `send-parent-otp` — WhatsApp OTP verification
- `generate-pdf` — Certificate generation
- `generate-executive-report` — Principal dashboard PDF
- `generate-parent-report` — Parent progress report

### 3D: Processing & Background Jobs (Weeks 49-50)

**Edge Functions yang di-port:**

- `grade-quiz-attempt` — Background quiz grading
- `process-progress-events` — Batch progress event processor
- `progress-events` — Event enqueue endpoint
- `load-quiz-data` — Quiz data loader untuk student
- `scorm-extract` — SCORM ZIP extraction
- `bulk-import-users` — Bulk user import (hardened from Phase 31)
- `health-check` — System health (sudah ada dari Phase 1)

### 3E: Cron Jobs Migration (Weeks 50-52)

Migrasi dari `pg_cron` ke `vil_trigger_cron`:

| Job                   | Jadwal (UTC)    | Jadwal (WIB)      |
| --------------------- | --------------- | ----------------- |
| Email digest          | 0 10 \* \* \*   | Daily 17:00       |
| Parent digest         | 30 10 \* \* \*  | Daily 17:30       |
| Analytics aggregation | _/15 _ \* \* \* | Every 15 min      |
| Cleanup expired data  | 0 19 \* \* \*   | Daily 02:00 (+1)  |
| AI quota reset        | 0 17 1 \* \*    | Monthly 1st 00:00 |
| XAPI queue flush      | _/30 _ \* \* \* | Every 30 sec      |

## Key Constraints

1. **Bahasa Indonesia** — semua user-facing text dalam Bahasa Indonesia
2. **CircuitBreaker** — WAJIB untuk semua AI functions
3. **Tri-Lane Architecture**: API → queue → worker (grade-quiz-attempt, process-progress-events)
4. **VIL SseCollect** — untuk streaming response ke client
5. **VilError** — gunakan dari Phase 1A definition
6. **No SELECT \*** — selalu explicit columns
7. **Rollback rule** — commit sebelum setiap task

## VIL Built-in Components

| Component      | Usage                                   |
| -------------- | --------------------------------------- |
| SseCollect     | Streaming proxy ke Groq/OpenAI API      |
| CircuitBreaker | Fault tolerance untuk external services |
| VilApp         | Main application bootstrap              |
| VilError       | Error response type                     |
| CronScheduler  | Background job scheduling               |

## Test Accounts

| Email                 | Password      | Role    |
| --------------------- | ------------- | ------- |
| `teacher@edusync.dev` | `password123` | TEACHER |
| `student@edusync.dev` | `password123` | STUDENT |
| `admin@edusync.dev`   | `password123` | ADMIN   |

## Dependencies

- Rust 1.78+
- VIL Framework (OceanOS-id/VIL)
- Groq API key
- PostgreSQL 15+
- SMTP server
- VAPID keys untuk push notifications
- WhatsApp Business API credentials
