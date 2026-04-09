# TASK QUEUE — Phase 3C: Notifications + 3D: Processing + 3E: Cron Jobs

**Week 46-52 | ~90 jam**

## Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** buat custom DLQ table baru — gunakan domain-specific DLQ atau VIL built-in
3. **Semua teks UI/email** harus Bahasa Indonesia
4. Jalankan `cargo check && cargo clippy -- -D warnings && cargo test` setelah setiap task
5. **JANGAN** ubah `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`
6. Cron schedule dalam **UTC** — WIB = UTC+7
7. Semua handlers pakai **Pattern A (Axum-style)**
8. SQL: **JANGAN** `SELECT *` — selalu explicit columns

---

# Wave 3C — Notification & Communication

## Task 3C-1: Email Foundation — Types, Templates & SMTP Client

```
TASK ID:       3C-1
OWNER TYPE:    Rust backend agent
GOAL:          Buat email types, HTML template engine, dan SMTP client wrapper
DEPENDENCY:    Phase 1A scaffold selesai
EDIT ONLY:     - crates/services/src/email/mod.rs
               - crates/services/src/email/templates.rs
               - crates/services/src/email/types.rs
               - crates/services/Cargo.toml (tambah lettre)
```

**Creates:**

- `email/types.rs` — EmailRecipient, DigestItem, EmailDigestData, ParentDigestData
- `email/templates.rs` — HTML templates dalam Bahasa Indonesia
- `email/mod.rs` — SMTP client wrapper dengan lettre

**Verify:** `cargo check -p edusync-services`

---

## Task 3C-2: Email Digest Service (send-email-digest)

```
TASK ID:       3C-2
OWNER TYPE:    Rust backend agent
GOAL:          Port send-email-digest Edge Function ke Rust handler
DEPENDENCY:    Task 3C-1
READ FIRST:    - supabase/functions/send-email-digest/index.ts
EDIT ONLY:     - crates/services/src/email/digest.rs
```

**Implements:**

- Query activities untuk last 24h per tenant
- Build digest data dengan items
- Send via EmailClient
- Per-tenant iteration

**Schedule:** Daily 17:00 WIB (10:00 UTC)

**Verify:** `cargo check -p edusync-services`

---

## Task 3C-3: Parent Digest Service (send-parent-digest)

```
TASK ID:       3C-3
OWNER TYPE:    Rust backend agent
GOAL:          Port send-parent-digest Edge Function ke Rust handler
DEPENDENCY:    Task 3C-1
READ FIRST:    - supabase/functions/send-parent-digest/index.ts
EDIT ONLY:     - crates/services/src/email/parent_digest.rs
```

**Implements:**

- Query parent-child links
- Child activities, attendance, grades
- Parent email dengan aggregate data

**Schedule:** Daily 17:00 WIB (10:30 UTC)

**Verify:** `cargo check -p edusync-services`

---

## Task 3C-4: Push Notification Service (send-push)

```
TASK ID:       3C-4
OWNER TYPE:    Rust backend agent
GOAL:          Port send-push Edge Function ke Rust handler via web-push
DEPENDENCY:    Phase 1A scaffold selesai
READ FIRST:    - supabase/functions/send-push/index.ts
EDIT ONLY:     - crates/services/src/push/mod.rs
               - crates/services/src/push/types.rs
               - crates/services/Cargo.toml (tambah web-push)
```

**Implements:**

- Push subscription storage
- VAPID signature building
- WebPush message sending
- Fanout ke multiple users

**Verify:** `cargo check -p edusync-services`

---

## Task 3C-5: WhatsApp Webhook Handler (whatsapp-webhook)

```
TASK ID:       3C-5
OWNER TYPE:    Rust backend agent
GOAL:          Port whatsapp-webhook Edge Function ke Rust endpoint
DEPENDENCY:    Phase 1A scaffold selesai
READ FIRST:    - supabase/functions/whatsapp-webhook/index.ts
EDIT ONLY:     - crates/services/src/whatsapp/mod.rs
               - crates/services/src/whatsapp/types.rs
               - crates/services/src/whatsapp/webhook.rs
```

**Implements:**

- GET webhook verification (hub.mode, hub.challenge)
- POST incoming message handling
- Message storage di DB

**Verify:** `cargo check -p edusync-services`

---

## Task 3C-6: WhatsApp OTP Sender (send-parent-otp)

```
TASK ID:       3C-6
OWNER TYPE:    Rust backend agent
GOAL:          Port send-parent-otp Edge Function ke Rust handler
DEPENDENCY:    Task 3C-5
READ FIRST:    - supabase/functions/send-parent-otp/index.ts
EDIT ONLY:     - crates/services/src/whatsapp/otp.rs
```

**Implements:**

- 6-digit OTP generation
- OTP storage dengan expiry
- WhatsApp message sending
- OTP verification

**Verify:** `cargo check -p edusync-services`

---

## Task 3C-7: PDF Certificate Generation (generate-pdf)

```
TASK ID:       3C-7
OWNER TYPE:    Rust backend agent
GOAL:          Port generate-pdf Edge Function ke Rust handler
DEPENDENCY:    Phase 1A scaffold selesai
READ FIRST:    - supabase/functions/generate-pdf/index.ts
EDIT ONLY:     - crates/services/src/pdf/mod.rs
               - crates/services/src/pdf/certificate.rs
               - crates/services/Cargo.toml (tambah printpdf)
```

**Implements:**

- Certificate PDF generation dengan printpdf
- Indonesian font support (Noto Sans)
- Student name, course, date, certificate number

**Verify:** `cargo check -p edusync-services`

---

# Wave 3D — Processing & Misc Functions

## Task 3D-1: Quiz Grading Background Service

```
TASK ID:       3D-1
OWNER TYPE:    Rust backend agent
GOAL:          Port grade-quiz-attempt Edge Function ke background worker
DEPENDENCY:    Task 3C-7
READ FIRST:    - supabase/functions/grade-quiz-attempt/index.ts
EDIT ONLY:     - crates/services/src/grading/mod.rs
```

**Implements:**

- Queue polling untuk pending submissions
- Answer grading logic
- Score calculation
- Submission update with status + score

**Worker:** Runs on schedule or as trigger

**Verify:** `cargo check -p edusync-services`

---

## Task 3D-2: Progress Events Processor

```
TASK ID:       3D-2
OWNER TYPE:    Rust backend agent
GOAL:          Port process-progress-events Edge Function ke batch processor
DEPENDENCY:    Task 3D-1
READ FIRST:    - supabase/functions/process-progress-events/index.ts
EDIT ONLY:     - crates/services/src/progress/mod.rs
```

**Implements:**

- Batch processing dari progress_events table
- Update student_lesson_signals
- xAPI statement generation (optional)

**Schedule:** Every 30 seconds via tokio::interval

**Verify:** `cargo check -p edusync-services`

---

## Task 3D-3: Progress Events API

```
TASK ID:       3D-3
OWNER TYPE:    Rust backend agent
GOAL:          Port progress-events Edge Function ke API endpoint
DEPENDENCY:    Task 3D-2
READ FIRST:    - supabase/functions/progress-events/index.ts
EDIT ONLY:     - crates/services/src/progress/api.rs
```

**Implements:**

- Event enqueue endpoint
- Validation
- Queue insertion

**Verify:** `cargo check -p edusync-services`

---

## Task 3D-4: Quiz Data Loader

```
TASK ID:       3D-4
OWNER TYPE:    Rust backend agent
GOAL:          Port load-quiz-data Edge Function ke Rust handler
DEPENDENCY:    Task 3D-3
READ FIRST:    - supabase/functions/load-quiz-data/index.ts
EDIT ONLY:     - crates/services/src/quiz/loader.rs
```

**Implements:**

- Quiz questions retrieval
- Options retrieval
- Tenant-scoped queries

**Verify:** `cargo check -p edusync-services`

---

## Task 3D-5: SCORM Extract Handler

```
TASK ID:       3D-5
OWNER TYPE:    Rust backend agent
GOAL:          Port scorm-extract Edge Function ke Rust handler
DEPENDENCY:    Task 3D-4
READ FIRST:    - supabase/functions/scorm-extract/index.ts
EDIT ONLY:     - crates/services/src/scorm/mod.rs
```

**Implements:**

- ZIP upload extraction
- SCORM manifest parsing (imsmanifest.xml)
- Content validation
- Storage in bucket

**Note:** SCORM content runs in sandboxed iframe — limitation acknowledged

**Verify:** `cargo check -p edusync-services`

---

## Task 3D-6: Bulk User Import

```
TASK ID:       3D-6
OWNER TYPE:    Rust backend agent
GOAL:          Port bulk-import-users Edge Function ke Rust handler
DEPENDENCY:    Task 3D-5
READ FIRST:    - supabase/functions/bulk-import-users/index.ts
EDIT ONLY:     - crates/services/src/import/mod.rs
```

**Implements:**

- CSV parsing
- User creation with tenant
- Duplicate detection
- Rollback on error

**Security:** Hardened from Phase 31

**Verify:** `cargo check -p edusync-services`

---

# Wave 3E — Cron Jobs & Background Jobs

## Task 3E-1: Cron Job Registration

```
TASK ID:       3E-1
OWNER TYPE:    Rust backend agent
GOAL:          Register semua cron jobs using vil_trigger_cron
DEPENDENCY:    3C + 3D tasks selesai
READ FIRST:    - Supabase pg_cron jobs
EDIT ONLY:     - crates/api-server/src/cron.rs
```

**Schedule (UTC):**

| Job               | UTC Schedule    | WIB Schedule      |
| ----------------- | --------------- | ----------------- |
| Email digest      | 0 10 \* \* \*   | Daily 17:00       |
| Parent digest     | 30 10 \* \* \*  | Daily 17:30       |
| Analytics refresh | _/15 _ \* \* \* | Every 15 min      |
| Cleanup expired   | 0 19 \* \* \*   | Daily 02:00 (+1)  |
| AI quota reset    | 0 17 1 \* \* \* | Monthly 1st 00:00 |
| XAPI flush        | _/30 _ \* \* \* | Every 30 sec      |

**STOP IF:** pg_cron conflict → disable pg_cron first

**Verify:** `cargo check -p edusync-api-server`

---

## Task 3E-2: Nginx Route Update

```
TASK ID:       3E-2
OWNER TYPE:    DevOps / Agent
GOAL:          Update nginx.conf dengan semua Phase 3 routes
DEPENDENCY:    Task 3E-1
READ FIRST:    - nginx.conf existing
EDIT ONLY:     - nginx.conf
```

**Routes to add:**

- `/api/v1/ai/*` → VIL
- `/api/v1/lti/*` → VIL
- `/api/v1/email/*` → VIL
- `/api/v1/push/*` → VIL
- `/api/v1/whatsapp/*` → VIL
- `/api/v1/pdf/*` → VIL
- `/api/v1/webhooks/*` → VIL

**Verify:** `nginx -t && curl http://localhost/api/v1/health`

---

# Output Deliverables

After Phase 3C-3E:

| Deliverable                    | Status |
| ------------------------------ | ------ |
| Email types + templates + SMTP | ⬜     |
| send-email-digest handler      | ⬜     |
| send-parent-digest handler     | ⬜     |
| send-push handler              | ⬜     |
| whatsapp-webhook handler       | ⬜     |
| send-parent-otp handler        | ⬜     |
| generate-pdf handler           | ⬜     |
| grade-quiz-attempt worker      | ⬜     |
| progress-events processor      | ⬜     |
| load-quiz-data handler         | ⬜     |
| scorm-extract handler          | ⬜     |
| bulk-import-users handler      | ⬜     |
| Cron jobs registered           | ⬜     |
| Nginx routes updated           | ⬜     |

---

## Effort Estimate

| Wave   | Tasks                     | Jam  | Parallelism |
| ------ | ------------------------- | ---- | ----------- |
| Wave 1 | 3C-1 + 3C-4 + 3C-7        | 8-10 | Parallel    |
| Wave 2 | 3C-2 + 3C-3 + 3C-5 + 3C-6 | 8-10 | Parallel    |
| Wave 3 | 3D-1 + 3D-2 + 3D-3        | 8-10 | Parallel    |
| Wave 4 | 3D-4 + 3D-5 + 3D-6        | 6-8  | Parallel    |
| Wave 5 | 3E-1 + 3E-2               | 4-6  | Serial      |
| Total  |                           | ~90  |             |
