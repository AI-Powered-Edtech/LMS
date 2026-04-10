# Parallel Session Prompts — Sesi 6-10 (Copy-Paste untuk Notion AI)

<aside>
🎯

**5 prompt siap pakai untuk Sesi 6-10.**

Sesi 6-8 (Phase 2 Batch 1-4) bisa paralel karena batch berbeda.

Sesi 9-10 (Phase 3) bisa paralel karena area berbeda.

Copy-paste setiap blok ke thread baru Notion AI.

</aside>

<aside>
📊

**Total Session Map — 12 Sesi untuk Full Migration:**

- ✅ Sesi 1-5: Phase 0A(cont), 0B-0D, 1A, 1B, 1C-1D — [lihat halaman Sesi 1-5](Parallel%20Session%20Prompts%20%E2%80%94%20Sesi%201-5%20(Copy-Paste%20un%20c3bea8a0374b42d9b2620b86fbb367d5.md)
- 🔵 **Sesi 6-10: Phase 2 Batch 1-4, Phase 3A-3E** ← halaman ini
- ✅ Sesi 11-12: Phase 4, Phase 5-6 — [lihat halaman Sesi 11-12](Parallel%20Session%20Prompts%20%E2%80%94%20Sesi%2011-12%20(Copy-Paste%20%2040001ec230ff40fb9e6e7f2479791d44.md)
</aside>

---

## Sesi 6 — Phase 2 Batch 1 (Courses, Classes, Lessons, Course Builder)

```
Baca dan jadikan source of truth halaman-halaman ini terlebih dahulu:

- [EduSync](https://www.notion.so/32f9453fab5580f3a5e5d87d6c46b200)
- [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b)
- [Full Migration Becomes Possible — Multi-Agent Execution Model](https://www.notion.so/8b907d086a5042569489e649aca8927f)
- [Phase 2: Core CRUD Endpoints — Week 23-38 Detail](https://www.notion.so/f0151809ff8944fd870ba84bb0512a09)
- [Spec 2: Frontend Runtime Compatibility Contract](https://www.notion.so/662f7d41ec7f4607a825f104dba69e33)
- [Spec 4: Infrastructure, Data Layer & Operational Gaps — 15 Temuan Baru](https://www.notion.so/24943c65b9ae46a899bec8829b02f5de)
- [Agent Bootstrap Context — VIL Framework Reference untuk EduSync](https://www.notion.so/f2f6b969e8c64b6c9bffacaf474d765f)
- [Agent Task Queue — Phase 0A Week 1 (Kode Siap Copas)](https://www.notion.so/73757d6162304c67b9452ba0088cf01a)

Referensi VIL:
- https://github.com/OceanOS-id/VIL

Tugas:
Buat halaman baru di bawah [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b) dengan judul:

`Agent Task Queue — Phase 2 Batch 1`

Fokus:
- courses: courseService.ts, templateService.ts, versionService.ts — core LMS experience (8 methods)
- lessons: lessonService.ts — lesson CRUD + block-based content
- classroom: classroomService.ts — class management
- course-builder: courseBuilderApi.ts — drag-drop builder, collaborative editing API surfaces yang paling aman
- typed per-resource REST endpoints menggunakan `vil_resource!` macro
- VilQueryBuilder compatibility work yang diperlukan untuk batch ini
- Port relevant RLS policies ke Rust guard functions
- Shadow mode testing: request ke Supabase DAN VIL, compare responses
- Parity tests per endpoint
- Per-flow cutover units (lihat Spec 2 §3 Flow Cutover Matrix)

Per-batch workflow wajib diikuti:
1. Write Rust model structs (Serialize, Deserialize, sqlx::FromRow)
2. Write CRUD handlers
3. Port RLS policies ke Rust guards
4. Shadow mode testing
5. Write integration tests
6. Update frontend RestApiClient
7. Run E2E tests dengan VITE_API_BACKEND=vil
8. Enable via per-flow cutover (feature flags)

Aturan kerja:
1. Anggap halaman-halaman di atas sebagai source of truth final.
2. Jangan buat keputusan arsitektur baru yang bertentangan dengan spec.
3. Jangan turunkan scope menjadi partial migration — targetnya full migration via multi-agent execution.
4. Setiap task harus: self-contained, punya dependency jelas, punya Input / Output / Edit only / Do not touch, punya code siap copas, punya verify commands, punya stop/block criteria.
5. Semua task harus cocok untuk model AI kecil / coding CLI agents.
6. Semua teks UI harus Bahasa Indonesia jika ada string UI.
7. Jika ada ambiguity, ikuti spec yang sudah locked, jangan improvisasi.
8. Jika menemukan coupling besar atau RLS policy yang terlalu complex, tandai BLOCKED.

Format output task wajib:
- TASK ID
- OWNER TYPE
- GOAL
- READ FIRST
- EDIT ONLY
- DO NOT TOUCH
- IMPLEMENTATION STEPS
- COPY-PASTE STARTER
- VERIFY
- STOP IF
- OUTPUT FORMAT: DONE / BLOCKED / FILES / VERIFY
```

---

## Sesi 7 — Phase 2 Batch 2 (Quizzes, Assignments, Gradebook)

```
Baca dan jadikan source of truth halaman-halaman ini terlebih dahulu:

- [EduSync](https://www.notion.so/32f9453fab5580f3a5e5d87d6c46b200)
- [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b)
- [Full Migration Becomes Possible — Multi-Agent Execution Model](https://www.notion.so/8b907d086a5042569489e649aca8927f)
- [Phase 2: Core CRUD Endpoints — Week 23-38 Detail](https://www.notion.so/f0151809ff8944fd870ba84bb0512a09)
- [Spec 2: Frontend Runtime Compatibility Contract](https://www.notion.so/662f7d41ec7f4607a825f104dba69e33)
- [Spec 3: VIL Runtime, Worker & CI Operations](https://www.notion.so/03bce3edf2464666a0047fbf1fc29d40)
- [Spec 4: Infrastructure, Data Layer & Operational Gaps — 15 Temuan Baru](https://www.notion.so/24943c65b9ae46a899bec8829b02f5de)
- [Agent Bootstrap Context — VIL Framework Reference untuk EduSync](https://www.notion.so/f2f6b969e8c64b6c9bffacaf474d765f)
- [Agent Task Queue — Phase 0A Week 1 (Kode Siap Copas)](https://www.notion.so/73757d6162304c67b9452ba0088cf01a)

Referensi VIL:
- https://github.com/OceanOS-id/VIL

Tugas:
Buat halaman baru di bawah [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b) dengan judul:

`Agent Task Queue — Phase 2 Batch 2`

Fokus:
- quizzes: PALING KOMPLEKS — 13 service files, timer, autosave, auto-grade
  - Pecah per-flow: quiz.read, quiz.autosave, quiz.submit, quiz.grade, quiz.timer
  - Setiap flow = 1 cutover unit terpisah
- assignments: submissions, group assignments, file upload integration
- gradebook: complex aggregation queries, SpeedGrader
  - 21+ RPC calls di analyticsQueries.ts — KEEP sebagai stored procedures, panggil via sqlx::query!
- question-bank: question bank integration
- RPC bridge pattern: untuk RPCs yang terlalu complex untuk port, buat thin Rust handler yang call stored procedure via sqlx
- Per-flow cutover units — quiz flows harus bisa rollback independen
- Autosave dan submit flow split — autosave bisa tetap di Supabase sementara submit pindah ke VIL
- Test packs untuk area paling kompleks (quiz timer race conditions, concurrent autosave)

INI ADALAH BATCH PALING KOMPLEKS. Pecah task sekecil mungkin.
Quiz timer dan autosave adalah area paling rawan race condition.

Aturan kerja:
1. Anggap halaman-halaman di atas sebagai source of truth final.
2. Jangan buat keputusan arsitektur baru yang bertentangan dengan spec.
3. Jangan turunkan scope menjadi partial migration — targetnya full migration via multi-agent execution.
4. Setiap task harus: self-contained, punya dependency jelas, punya Input / Output / Edit only / Do not touch, punya code siap copas, punya verify commands, punya stop/block criteria.
5. Semua task harus cocok untuk model AI kecil / coding CLI agents.
6. Semua teks UI harus Bahasa Indonesia jika ada string UI.
7. Jika ada ambiguity, ikuti spec yang sudah locked, jangan improvisasi.
8. Jika menemukan race condition atau timing-sensitive flow, tandai BLOCKED.
9. Quiz grading worker harus pakai domain-specific DLQ di DB (bukan VIL general DLQ).

Format output task wajib:
- TASK ID
- OWNER TYPE
- GOAL
- READ FIRST
- EDIT ONLY
- DO NOT TOUCH
- IMPLEMENTATION STEPS
- COPY-PASTE STARTER
- VERIFY
- STOP IF
- OUTPUT FORMAT: DONE / BLOCKED / FILES / VERIFY
```

---

## Sesi 8 — Phase 2 Batch 3-4 (Users, Analytics, Progress + Remaining)

```
Baca dan jadikan source of truth halaman-halaman ini terlebih dahulu:

- [EduSync](https://www.notion.so/32f9453fab5580f3a5e5d87d6c46b200)
- [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b)
- [Full Migration Becomes Possible — Multi-Agent Execution Model](https://www.notion.so/8b907d086a5042569489e649aca8927f)
- [Phase 2: Core CRUD Endpoints — Week 23-38 Detail](https://www.notion.so/f0151809ff8944fd870ba84bb0512a09)
- [Spec 2: Frontend Runtime Compatibility Contract](https://www.notion.so/662f7d41ec7f4607a825f104dba69e33)
- [Spec 4: Infrastructure, Data Layer & Operational Gaps — 15 Temuan Baru](https://www.notion.so/24943c65b9ae46a899bec8829b02f5de)
- [Agent Bootstrap Context — VIL Framework Reference untuk EduSync](https://www.notion.so/f2f6b969e8c64b6c9bffacaf474d765f)
- [Agent Task Queue — Phase 0A Week 1 (Kode Siap Copas)](https://www.notion.so/73757d6162304c67b9452ba0088cf01a)

Referensi VIL:
- https://github.com/OceanOS-id/VIL

Tugas:
Buat halaman baru di bawah [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b) dengan judul:

`Agent Task Queue — Phase 2 Batch 3-4`

Fokus Batch 3 (Users, Analytics, Progress):
- analytics: 21+ RPC calls di analyticsQueries.ts — KEEP sebagai stored procedures, panggil via sqlx::query!
- progress: progress tracking + xAPI statements (sudah punya offline queue)
- xapi: xAPI statements — idempotency keys wajib, at-least-once delivery
- administration: bulk import, user management

Fokus Batch 4 (Remaining ~12 modules):
- discussions: forum
- notifications: notification batching
- calendar: calendar events
- attendance: QR attendance
- certificates: certificate generation
- gamification: XP, badges, streaks, leaderboard
- parent: parent portal
- principal: principal dashboard
- onboarding: teacher onboarding wizard
- surveys, finance

Strategi:
- Analytics RPCs: thin Rust handler → sqlx::query! ke stored procedure, JANGAN port logic ke Rust
- xAPI: pastikan idempotency keys format sama dengan offlineQueue.ts
- Batch 4 modules kebanyakan simple CRUD — bisa paralel antar module
- Cluster berdasarkan dependency: notifications → discussions → parent (notif depends on discussions)
- Setiap module = 1-3 tasks maximum

Aturan kerja:
1. Anggap halaman-halaman di atas sebagai source of truth final.
2. Jangan buat keputusan arsitektur baru yang bertentangan dengan spec.
3. Jangan turunkan scope menjadi partial migration — targetnya full migration via multi-agent execution.
4. Setiap task harus: self-contained, punya dependency jelas, punya Input / Output / Edit only / Do not touch, punya code siap copas, punya verify commands, punya stop/block criteria.
5. Semua task harus cocok untuk model AI kecil / coding CLI agents.
6. Semua teks UI harus Bahasa Indonesia jika ada string UI.
7. Jika ada ambiguity, ikuti spec yang sudah locked, jangan improvisasi.
8. xAPI dan progress harus respect offline queue delivery semantics (lihat CC6 di Main Plan).
9. Jika menemukan coupling besar antar module, tandai BLOCKED.

Format output task wajib:
- TASK ID
- OWNER TYPE
- GOAL
- READ FIRST
- EDIT ONLY
- DO NOT TOUCH
- IMPLEMENTATION STEPS
- COPY-PASTE STARTER
- VERIFY
- STOP IF
- OUTPUT FORMAT: DONE / BLOCKED / FILES / VERIFY
```

---

## Sesi 9 — Phase 3A-3B (AI Functions + LTI 1.3)

```
Baca dan jadikan source of truth halaman-halaman ini terlebih dahulu:

- [EduSync](https://www.notion.so/32f9453fab5580f3a5e5d87d6c46b200)
- [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b)
- [Full Migration Becomes Possible — Multi-Agent Execution Model](https://www.notion.so/8b907d086a5042569489e649aca8927f)
- [Phase 3: Edge Functions → VIL Services — Week 39-52 Detail](https://www.notion.so/df750d8dd2d54365a67d53d4eaea6ad8)
- [Spec 3: VIL Runtime, Worker & CI Operations](https://www.notion.so/03bce3edf2464666a0047fbf1fc29d40)
- [Agent Bootstrap Context — VIL Framework Reference untuk EduSync](https://www.notion.so/f2f6b969e8c64b6c9bffacaf474d765f)
- [Agent Task Queue — Phase 0A Week 1 (Kode Siap Copas)](https://www.notion.so/73757d6162304c67b9452ba0088cf01a)

Referensi VIL:
- https://github.com/OceanOS-id/VIL

Tugas:
Buat halaman baru di bawah [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b) dengan judul:

`Agent Task Queue — Phase 3A-3B`

Fokus 3A — AI Functions (4 Edge Functions → Rust):
- ai-grade-essay (187 lines, Medium) → VIL SseCollect + SseDialect::openai() + CircuitBreaker
- ai-tutor (674 lines, HIGH — paling kompleks) → VIL SseCollect streaming proxy ke Groq, conversation state di DB, context injection
- generate-ai-content (476 lines, Medium) → content validation dari contentValidator.ts
- generate-quiz-from-content (~200 lines, Medium) → generate quiz questions from lesson content

Fokus 3B — LTI 1.3 Functions (3 Edge Functions → Rust):
- lti-oidc-login → jsonwebtoken crate (RS256)
- lti-launch → LTI guest users: lti-{platformId8}-{sub}@lti.edusync.internal
- lti-jwks → JWKS endpoint
- lti_nonces table uses service_role only
- Test terhadap real LTI platforms (Canvas, Moodle)

VIL built-ins yang WAJIB digunakan:
- SseCollect untuk streaming AI responses
- SseDialect::openai() untuk Groq API compatibility
- CircuitBreaker untuk fault tolerance saat Groq down
- Visibility::Internal untuk service-to-service calls

Aturan kerja:
1. Anggap halaman-halaman di atas sebagai source of truth final.
2. Jangan buat keputusan arsitektur baru yang bertentangan dengan spec.
3. Jangan turunkan scope menjadi partial migration — targetnya full migration via multi-agent execution.
4. Setiap task harus: self-contained, punya dependency jelas, punya Input / Output / Edit only / Do not touch, punya code siap copas, punya verify commands, punya stop/block criteria.
5. Semua task harus cocok untuk model AI kecil / coding CLI agents.
6. Jika ada ambiguity, ikuti spec yang sudah locked, jangan improvisasi.
7. AI functions harus punya circuit breaker — jangan skip.
8. LTI harus test dengan real platforms, bukan mock saja.
9. Jika menemukan Groq API incompatibility atau LTI spec gap, tandai BLOCKED.

Format output task wajib:
- TASK ID
- OWNER TYPE
- GOAL
- READ FIRST
- EDIT ONLY
- DO NOT TOUCH
- IMPLEMENTATION STEPS
- COPY-PASTE STARTER
- VERIFY
- STOP IF
- OUTPUT FORMAT: DONE / BLOCKED / FILES / VERIFY
```

---

## Sesi 10 — Phase 3C-3E (Notifications, Processing, Cron, Workers)

```
Baca dan jadikan source of truth halaman-halaman ini terlebih dahulu:

- [EduSync](https://www.notion.so/32f9453fab5580f3a5e5d87d6c46b200)
- [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b)
- [Full Migration Becomes Possible — Multi-Agent Execution Model](https://www.notion.so/8b907d086a5042569489e649aca8927f)
- [Phase 3: Edge Functions → VIL Services — Week 39-52 Detail](https://www.notion.so/df750d8dd2d54365a67d53d4eaea6ad8)
- [Spec 3: VIL Runtime, Worker & CI Operations](https://www.notion.so/03bce3edf2464666a0047fbf1fc29d40)
- [Spec 4: Infrastructure, Data Layer & Operational Gaps — 15 Temuan Baru](https://www.notion.so/24943c65b9ae46a899bec8829b02f5de)
- [Agent Bootstrap Context — VIL Framework Reference untuk EduSync](https://www.notion.so/f2f6b969e8c64b6c9bffacaf474d765f)
- [Agent Task Queue — Phase 0A Week 1 (Kode Siap Copas)](https://www.notion.so/73757d6162304c67b9452ba0088cf01a)

Referensi VIL:
- https://github.com/OceanOS-id/VIL

Tugas:
Buat halaman baru di bawah [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b) dengan judul:

`Agent Task Queue — Phase 3C-3E`

Fokus 3C — Notification/Communication (4 Edge Functions → Rust):
- Email: send-email-digest, send-parent-digest → Rust + lettre crate
- Push: send-push → Rust + web-push crate (VAPID key di VITE_VAPID_PUBLIC_KEY)
- WhatsApp: whatsapp-webhook, send-parent-otp → Rust + reqwest
- PDF: generate-pdf, generate-executive-report, generate-parent-report → Rust + printpdf/genpdf

Fokus 3D — Processing & Misc (6 Edge Functions → Rust):
- grade-quiz-attempt — background quiz grading (service role, domain-specific DLQ)
- process-progress-events — batch progress event processing
- progress-events — enqueue progress events
- load-quiz-data — load quiz for student
- scorm-extract — SCORM ZIP + XML extraction
- bulk-import-users — bulk CSV import

Fokus 3E — Background Jobs / Cron (pg_cron → vil_trigger_cron):
- Scheduled digests: email digest harian (17:00 WIB), parent digest
- Analytics aggregation: refresh materialized views
- Cleanup tasks: expired sessions, old notification data
- AI quota reset: monthly
- XAPI queue flush: periodic sync

Worker Architecture (dari CC7 di Main Plan):
- HTTP Handlers: synchronous, user-facing
- Internal Service Process: VIL Visibility::Internal via Tri-Lane (quiz grading, bulk import)
- Scheduled Workers: VIL vil_trigger_cron
- Retry Policy per queue (lihat CC7)
- Dead-Letter Queue:
  - Domain-specific DLQ tetap di DB: quiz grading
  - General DLQ pakai VIL built-in DeadLetterQueue: bulk import, notification fanout, xAPI flush
  - JANGAN buat custom DLQ table baru

Aturan kerja:
1. Anggap halaman-halaman di atas sebagai source of truth final.
2. Jangan buat keputusan arsitektur baru yang bertentangan dengan spec.
3. Jangan turunkan scope menjadi partial migration — targetnya full migration via multi-agent execution.
4. Setiap task harus: self-contained, punya dependency jelas, punya Input / Output / Edit only / Do not touch, punya code siap copas, punya verify commands, punya stop/block criteria.
5. Semua task harus cocok untuk model AI kecil / coding CLI agents.
6. Jika ada ambiguity, ikuti spec yang sudah locked, jangan improvisasi.
7. DLQ keputusan sudah FINAL — ikuti CC7 di Main Plan.
8. Cron jobs harus test timezone WIB (UTC+7) secara eksplisit.
9. Jika menemukan Edge Function yang terlalu complex untuk single task, pecah menjadi sub-tasks.

Format output task wajib:
- TASK ID
- OWNER TYPE
- GOAL
- READ FIRST
- EDIT ONLY
- DO NOT TOUCH
- IMPLEMENTATION STEPS
- COPY-PASTE STARTER
- VERIFY
- STOP IF
- OUTPUT FORMAT: DONE / BLOCKED / FILES / VERIFY
```

---

## Parallelism Map — Sesi 6-10

| **Sesi** | **Phase**   | **Depends On**                     | **Paralel Dengan**                      |
| -------- | ----------- | ---------------------------------- | --------------------------------------- |
| Sesi 6   | 2 Batch 1   | Phase 1 selesai (scaffold + auth)  | Sesi 7, 8 (prompt gen paralel)          |
| Sesi 7   | 2 Batch 2   | Phase 2 Batch 1 selesai (eksekusi) | Sesi 6, 8, 9, 10 (prompt gen paralel)   |
| Sesi 8   | 2 Batch 3-4 | Phase 2 Batch 2 selesai (eksekusi) | Sesi 6, 7, 9, 10 (prompt gen paralel)   |
| Sesi 9   | 3A-3B       | Phase 2 selesai (semua CRUD done)  | Sesi 10 (prompt gen + eksekusi paralel) |
| Sesi 10  | 3C-3E       | Phase 2 selesai (semua CRUD done)  | Sesi 9 (prompt gen + eksekusi paralel)  |

<aside>
✅

**Semua 5 prompt bisa di-generate paralel.** Eksekusi:

- Phase 2: Batch 1 → 2 → 3-4 (sequential per batch, tapi prompt gen paralel)
- Phase 3: Sesi 9 & 10 bisa **eksekusi paralel** karena AI/LTI dan Notif/Cron area independen
</aside>

---

## Full Session Map — 12 Sesi Total

| **Sesi** | **Phase**       | **Fokus**                                    | **Minggu** | **Status**         |
| -------- | --------------- | -------------------------------------------- | ---------- | ------------------ |
| 1        | 0A Week 2-4     | Service layer refactor lanjutan              | 2-4        | ✅ Prompt ready    |
| 2        | 0B-0D           | Auth, Realtime, Storage abstraction          | 3-8        | ✅ Prompt ready    |
| 3        | 1A              | VIL Rust scaffold, Docker, observability     | 11-14      | ✅ Prompt ready    |
| 4        | 1B              | Auth implementation (JWT, MFA, OAuth, RPCs)  | 14-20      | ✅ Prompt ready    |
| 5        | 1C-1D           | TenantGuard, RbacGuard, parity tests         | 18-22      | ✅ Prompt ready    |
| **6**    | **2 Batch 1**   | **Courses, Classes, Lessons, Builder**       | **23-28**  | **🔵 Halaman ini** |
| **7**    | **2 Batch 2**   | **Quizzes, Assignments, Gradebook**          | **28-32**  | **🔵 Halaman ini** |
| **8**    | **2 Batch 3-4** | **Users, Analytics, Progress + 12 modules**  | **32-38**  | **🔵 Halaman ini** |
| **9**    | **3A-3B**       | **AI Functions + LTI 1.3**                   | **39-46**  | **🔵 Halaman ini** |
| **10**   | **3C-3E**       | **Notifications, Processing, Cron, Workers** | **46-52**  | **🔵 Halaman ini** |
| 11       | 4               | Realtime migration (WebSocket, presence)     | 53-60      | ⬜ Belum           |
| 12       | 5-6             | Storage migration + Supabase decommission    | 61-72      | ⬜ Belum           |
