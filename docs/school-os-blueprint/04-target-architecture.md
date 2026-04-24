# 04 — Target Architecture: Modular + Integrated

Target arsitektur EduSync School OS setelah transformasi. Fokus: **cara modul saling terhubung** (karena ini inti gap "kumpulan fitur → 1 sistem").

## Prinsip arsitektur

1. **Core domain + pluggable modules** — core (identity, tenancy, academic year, rombel, subject) immutable. Modul pedagogis/administratif (assessment, finance, PPDB, P5) toggleable per tenant via `tenant_modules`.
2. **One-way data flow antar modul lewat event bus**, bukan langsung query table modul lain. Mengurangi coupling, memudahkan test.
3. **Shared kernel read-only** — beberapa entity (student, rombel, semester) dipakai semua modul. Akses via service layer, bukan raw query.
4. **Tenant-scoped everything** — semua tabel, RPC, API endpoint wajib terima `tenant_id` explicit. Middleware validate.

## Layered architecture

```
┌────────────────────────────────────────────────────────────┐
│  UI Layer (React, role-specific shells)                    │
│  - admin/teacher/student/parent/principal shell            │
│  - shared components (DataTable, Dialog, Toast)            │
│  - offline PWA shell                                       │
└─────────────────┬──────────────────────────────────────────┘
                  │ TanStack Query + VilApiClient
┌─────────────────▼──────────────────────────────────────────┐
│  Application Layer (Rust handlers + SQL RPC)               │
│  - thin handlers: validate → call domain service           │
│  - RPC still supported, but NEW logic goes Rust-first      │
└─────────────────┬──────────────────────────────────────────┘
                  │
┌─────────────────▼──────────────────────────────────────────┐
│  Domain Services (NEW: extract from data_plane.rs monolith)│
│  - identity, tenant, academic, enrollment, assessment,     │
│    gradebook, attendance, finance, communication,          │
│    curriculum, rapor, ppdb, wellbeing, ai                  │
│  - each service owns its tables, exposes typed API         │
└─────────┬───────────────────────────┬──────────────────────┘
          │                           │
┌─────────▼─────────┐      ┌──────────▼─────────────────────┐
│  Event Bus        │      │  Shared Kernel                 │
│  (pg_notify +     │      │  - Identity (users, profiles)  │
│   outbox table)   │      │  - Tenancy (tenants, modules)  │
│                   │      │  - Academic (year, semester,   │
│  student.enrolled │      │    rombel, subject, curriculum)│
│  quiz.submitted   │      │                                │
│  payment.received │      │  Read-only cross-module        │
└───────────────────┘      └────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────────────────────┐
│  Data Layer (PostgreSQL)                                   │
│  - tenant_id partition keys                                │
│  - migrations/ownership per domain                         │
└────────────────────────────────────────────────────────────┘
```

## Core shared kernel (immutable, used by everything)

Entities yang **semua modul** butuh. Definisikan sekali, tidak diduplikasi.

```
┌─ Identity ────────┐   ┌─ Tenancy ─────────┐   ┌─ Academic ───────┐
│ users             │   │ tenants           │   │ academic_years   │
│ profiles          │   │ tenant_memberships│   │ semesters        │
│ mfa_factors       │   │ tenant_modules    │   │ rombel           │
│ auth_sessions     │   │ feature_flags     │   │ subjects         │
│                   │   │                   │   │ curriculum_items │
│                   │   │                   │   │ timetable_slots  │
└───────────────────┘   └───────────────────┘   └──────────────────┘
```

**Academic entities baru** (P0 gap dari dok 03):

- `academic_years` — TA 2026/2027, dst.
- `semesters` (ada) — link ke academic_year
- `grade_levels` — 1-12 (SD/SMP/SMA numbering unified)
- `rombel` — rombongan belajar: "X-IPA-1" dengan grade_level + wali_kelas_id + siswa list
- `subjects` — mata pelajaran, ada `curriculum_phase` (A/B/C/D/E/F Kurmer)
- `curriculum_items` — CP (Capaian Pembelajaran), ATP (Alur Tujuan Pembelajaran), hierarchical
- `timetable_slots` — jadwal pelajaran: (rombel, day, jp_start, jp_end, subject, teacher)

Existing entities yang perlu refactor:
- `classes` — saat ini ambigu (course-like ATAU section-like). **Rename atau split** ke `rombel` vs `courses`.
- `enrollments` — link ke `rombel`, bukan langsung ke `classes` (course).

## Module boundaries

Setiap modul punya:
- **Owned tables** (no other module writes)
- **Exposed queries** (read-only public view)
- **Published events** (via outbox / pg_notify)
- **Subscribed events** (listen from other modules)

### Contoh: Assessment module

**Owned tables**: `quizzes`, `quiz_questions`, `quiz_attempts_v2`, `assignments`, `assignment_submissions`, `anti_cheat_events`

**Exposed queries**:
- `assessment.get_student_attempts(student_id, semester_id) → []`
- `assessment.get_attempt_summary(attempt_id) → {score, flagged, ...}`

**Publishes**:
- `assessment.attempt.submitted` → payload {attempt_id, student_id, course_id, score, flagged, tenant_id}
- `assessment.attempt.flagged` → payload {attempt_id, signals}

**Subscribes**:
- `enrollment.student.added` → nothing? (assessment module doesn't care)
- `academic_year.rolled_over` → archive old attempts

**Who listens to Assessment?**
- **Gradebook** — on `attempt.submitted`, create/update gradebook_entry
- **Gamification** — on `attempt.submitted`, award XP
- **Notifications** — on `attempt.submitted`, notify teacher (grading queue), notify parent (preview of grade)
- **Struggle Detection** — on `attempt.submitted`, recompute at-risk score
- **Moderation** — on `attempt.flagged`, create review task

### Contoh: Attendance module

**Owned tables**: `attendance_records`

**Subscribes**:
- `academic.timetable_slot.started` → expect attendance in next X minutes
- `enrollment.student.added` → no-op

**Publishes**:
- `attendance.marked` → {student_id, slot_id, status, timestamp}
- `attendance.absent_pattern_detected` → {student_id, consecutive_absences}

**Who listens?**
- **Parent Notifications** — on `attendance.marked` (late/absent), kirim WA
- **Rapor** — aggregate attendance for periode
- **BK/Wellbeing** — on `attendance.absent_pattern_detected`, trigger counselor alert
- **Billing** (optional, opt-in policy) — if tunggakan SPP → attendance block flag

## Event bus implementation

**Incremental, start small**. Don't over-engineer.

**Phase 1**: Outbox table + pg_notify (already have pattern from realtime/)
```sql
CREATE TABLE domain_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  event_type text not null,  -- e.g., "assessment.attempt.submitted"
  aggregate_id uuid not null,
  payload jsonb not null,
  occurred_at timestamptz default now(),
  processed_at timestamptz  -- null = pending
);
```

Rust handler setelah mutate table → insert `domain_events` in same transaction.
Separate worker process: poll unprocessed events → dispatch to subscribers (in-process handlers) → mark processed.

**Phase 2**: kalau throughput issue, migrate ke external bus (Redis Streams, NATS, Kafka). Tidak butuh dulu.

**Why not direct function call?**
- Direct call = coupling (Assessment module harus tahu Gradebook, Gamification, Notification API)
- Event = tidak peduli; publisher cuma emit, subscriber attach sendiri
- Support retry, dead-letter, replay

## AI sebagai lapisan horisontal

Bukan "AI module" terpisah. AI adalah **service yang dipanggil modul lain**, bukan domain sendiri.

```
┌──────────────────────────────────────────────────────┐
│ AI Service Layer                                     │
│                                                      │
│  Content Gen ── dipakai ── Course Builder            │
│       │                   Question Bank              │
│       │                   Announcements (draft)      │
│                                                      │
│  Grading ────── dipakai ── Assignment (essay)        │
│       │                   Peer Review                │
│                                                      │
│  Tutoring ───── dipakai ── Lesson Viewer (Q&A)       │
│                                                      │
│  Classification─dipakai ── Moderation (toxic)        │
│                                                      │
│  Embedding ──── dipakai ── Search (semantic)         │
│                                                      │
│  Analytics ──── dipakai ── Principal Dashboard       │
│                           (anomaly, narrative)       │
└──────────────────────────────────────────────────────┘
```

Guardrails:
- Log setiap AI call ke `ai_generation_logs` (sudah ada) — audit + billing
- Rate limit per tenant (prevent abuse)
- Feature flag per AI use-case — tenant bisa disable
- PII filter — hapus NISN/NIK dari prompt sebelum kirim ke LLM
- Prompt versioning — prompt templates di repo, versioned
- Model selection per use-case (Groq cepat untuk tutoring, Claude/GPT quality untuk essay grading)

## Frontend architecture target

Saat ini: `src/pages/*` dan `src/features/*`. Campur.

Target:
```
src/
├── app/              # router, bootstrapping, providers
├── shared/           # design system, hooks, utilities
│   ├── ui/           # DataTable, Dialog, Toast, Form
│   ├── api/          # VilApiClient, query factories
│   └── hooks/
├── domains/          # 1 dir per domain (mirror backend services)
│   ├── identity/
│   ├── academic/     # year, semester, rombel, subject
│   ├── assessment/   # quiz, assignment
│   ├── gradebook/
│   ├── attendance/
│   ├── curriculum/   # CP, ATP, RPP, modul ajar
│   ├── rapor/
│   ├── finance/
│   ├── ppdb/
│   ├── communication/# announcement, forum, parent message
│   ├── wellbeing/    # BK, sikap, UKS
│   └── ai/
└── shells/           # role-based shells compose domain widgets
    ├── teacher/
    ├── student/
    ├── parent/
    ├── admin/
    └── principal/
```

**Shells compose, not duplicate**. Teacher dashboard = compose widgets dari assessment, gradebook, attendance, communication domains. Parent dashboard = compose widgets dari child's gradebook, attendance, finance, communication.

## Refactor strategy (incremental, zero-downtime)

**JANGAN** big-bang rewrite. Existing code works; iterate.

1. **Tulis domain services baru di `crates/domain-*`** (Rust), di-wire via AppState.
2. **Migrasi RPC ke domain service satu per satu**, mulai dari yang paling coupled (gradebook, assessment).
3. **Setelah migrated**, deprecate RPC in `ALLOWED_RPCS`, lalu hapus setelah 1-2 release.
4. **Event outbox**: tambah table + worker, start publish di handler baru saja; subscribers bertahap convert dari direct-call ke event-listener.
5. **Frontend domains/**: directory baru, migrate feature directory satu per satu. Import paths diupdate.

## Open questions

- Pilih event bus library Rust (tokio-channel sederhana, atau sqlx-listen)?
- Apakah pindah ke CQRS (separate read models)? Kemungkinan overkill sekarang.
- Cache strategy: query-level (TanStack) vs domain cache (Redis)? Saat ini: query-level cukup. Tambah Redis kalau hot path terbukti.
- GraphQL gateway? Tidak direkomendasikan — REST/RPC cukup, kompleksitas tambahan tidak justified.
