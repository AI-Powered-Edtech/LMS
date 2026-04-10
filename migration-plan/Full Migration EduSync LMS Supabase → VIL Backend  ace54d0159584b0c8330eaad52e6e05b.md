# Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi

<aside>
🎯

**Rekomendasi: YA, migrasi layak dilakukan — dengan strategi strangler fig pattern & incremental.**

Frontend React 19 tetap dipertahankan. Backend Supabase (Auth, Edge Functions, Realtime, Storage) diganti bertahap dengan VIL server. Database PostgreSQL tetap kompatibel. VIL reverse proxy di depan Supabase, secara bertahap menyerap endpoint sampai Supabase bisa dimatikan.

</aside>

---

## Context

EduSync LMS adalah platform pendidikan multi-tenant SaaS production-grade untuk sekolah Indonesia berbasis React 19 + Supabase. Analisis codebase menunjukkan Supabase tertanam sangat dalam:

| **Metrik**                      | **Jumlah** | **Catatan**                                                    |
| ------------------------------- | ---------- | -------------------------------------------------------------- | ------- | ----- | ------ | ---------- |
| Files importing Supabase client | 117+       | Tersebar di `src/features/*/api/`, `contexts/`, `services/`    |
| RPC calls                       | 167        | Stored procedures di PostgreSQL                                |
| Edge Functions                  | 22         | AI grading, LTI 1.3, SCORM, push, email, PDF, WhatsApp, dll    |
| Feature modules                 | 48         | `src/features/` — dari auth hingga xapi                        |
| Realtime subscriptions          | 9+ hooks   | Course builder presence, notifications, discussions, messaging |
| Storage operations              | 19         | Video upload, file submissions, avatars                        |
| Roles                           | 5          | `student                                                       | teacher | admin | parent | principal` |

**Timeline realistis: ~80-88 minggu (~20-22 bulan) part-time (~15-20 jam/minggu)**

**Total effort: ~1,193-1,333 jam kerja** (base 853 + Spec 4 gaps + VIL Gap Analysis v2 + 15 Production Readiness gaps — lihat Effort Summary v3 FINAL)

<aside>
📚

**5 Keputusan Kritis (sudah locked di Spec documents):**

1. **PostgREST replacement:** Opsi A — typed per-resource REST endpoints + `vil_resource!` macro + `VilQueryBuilder` TS class (Spec 4 §1)
2. **Auth behavioral parity:** 25+ field `AuthContextType` contract, `get_auth_bootstrap` shape, signout side-effects, MFA, forgot password (Spec 1 + Spec 4 §2)
3. **`auth.*` SQL migration:** `SET LOCAL` replacement + stored procedure audit (Spec 4 §3)
4. **Operational baseline:** Docker Compose + PgBouncer + backup + VIL version pinning + CI/CD (Spec 3 + Spec 4 §7-11)
5. **Realtime reliability:** `pg_notify` (ephemeral) vs `vil_trigger_cdc` (durable) per channel (Spec 4 §8)
</aside>

---

## Mengapa Migrasi ke VIL?

### ✅ Alasan Kuat (Strategic)

| **Alasan**                    | **Penjelasan**                                                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🦀 **Dogfooding**             | Platform [vastar.id](http://vastar.id) yang mengajarkan VIL **dibangun pakai VIL sendiri** — bukti nyata paling kuat bahwa kurikulum menghasilkan developer yang mampu.        |
| ⚡ **Performance**            | VIL: ~41,000 req/s (HTTP) vs Supabase Edge Functions: ~500-2,000 req/s. Untuk auto-grader yang compile Rust code, latency matters.                                             |
| 🔒 **Type Safety End-to-End** | Rust ownership system + VIL semantic types = zero runtime errors untuk business logic. EduSync saat ini punya ESLint warnings yang Rust compiler akan tangkap di compile time. |
| 🏗️ **Arsitektur Scalable**    | Tri-Lane Protocol memungkinkan auto-grader, scoring engine, dan notification berjalan tanpa head-of-line blocking.                                                             |
| 📚 **Curriculum Alignment**   | Modul VIL Core mengajarkan persis teknologi yang dipakai platform. Learner bisa melihat bagaimana konsep diterapkan di production.                                             |
| 💰 **Cost Reduction**         | Satu VPS ~$20/bulan bisa handle 41K req/s vs Supabase Pro $25/bulan + Edge Function limits + connection pooling limits.                                                        |

### ⚠️ Risiko & Mitigasi

| **Risiko**                                   | **Impact**                                                                    | **Mitigasi**                                                                                                   |
| -------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| VIL masih sangat baru (1 star)               | High — ecosystem belum battle-tested                                          | Kamu kontributor/owner VIL — bisa fix langsung. Gate 4: jika VIL terlalu unstable, fork ke Axum.               |
| Learning curve Rust                          | Medium                                                                        | EduSync sudah TypeScript strict — typing mindset sudah ada. Rust borrow checker adalah tambahan.               |
| Supabase convenience hilang                  | Medium — harus implement Auth, Realtime, Storage sendiri                      | VIL punya `JwtAuth`, `VilPassword`, `vil_ws`, `vil_storage_s3`. Incremental migration mengurangi blast radius. |
| 748 RLS policies harus di-port ke middleware | High — security regression risk                                               | Shadow mode testing: request ke Supabase DAN VIL, compare responses. Automated policy verification tests.      |
| Password hash format mismatch                | Critical — existing users tidak bisa login                                    | Dual-hash verification: try VIL format → fallback Supabase bcrypt/argon2 → re-hash on success.                 |
| `auth.users` schema migration                | High — Supabase stores users di schema `auth` terpisah dari `public.profiles` | Buat tabel `users` di public schema, migrasi data dari `auth.users`, update semua FK references.               |

---

## Arsitektur: Before vs After

### Current (EduSync + Supabase)

```
React 19 + Vite 6 + Tailwind v4 (routing: lihat Spec 1 §5 audit)
        │
        ▼
   Supabase Client SDK (@supabase/supabase-js v2)
        │
   ┌────┴────────────────────┐
   │  Supabase Platform       │
   │  • Auth (GoTrue) — 5 roles, MFA, OAuth Google  │
   │  • 22 Edge Functions (Deno)     │
   │  • 167 RPC calls (PostgreSQL)   │
   │  • Realtime (9+ subscriptions)  │
   │  • Storage (videos, files)      │
   │  • 748 RLS policies             │
   │  • pg_cron (scheduled digests)  │
   └─────────────────────────┘
```

### Target (EduSync + VIL)

```
React 19 + Vite 6 + Tailwind v4 (routing: lihat Spec 1 §5 audit)
        │
        ▼
   REST/SSE API calls (via abstraction layer)
        │
   ┌────┴──────────────────────────────┐
   │  VIL Server (vil_server)           │
   │  • VilApp + ServiceProcess         │
   │  • JwtAuth + VilPassword + MFA     │
   │  • TenantGuard + RbacGuard (5 roles)│
   │  • Tri-Lane mesh                   │
   │  • SSE streaming                   │
   │  • Rate limiting (per-tenant)      │
   │  • Circuit breaker (AI services)   │
   ├────────────────────────────────────┤
   │  vil_db_sqlx / vil_db_sea_orm      │
   │         │                          │
   │    PostgreSQL                      │
   │  (same DB, new ORM layer)          │
   ├────────────────────────────────────┤
   │  vil_storage_s3 (MinIO/S3)         │
   │  vil_ws (WebSocket rooms)          │
   │  vil_log + vil_otel (Grafana)      │
   │  vil_trigger_cron (scheduled jobs) │
   └────────────────────────────────────┘
```

---

## Phase 0: Frontend Abstraction Layer (Minggu 1-10, ~150 jam)

<aside>
🎯

**Goal:** Decouple React frontend dari Supabase SDK. Setelah phase ini, TIDAK ADA feature module yang import `@supabase/supabase-js` langsung. Semua akses data melalui abstraction layer yang bisa di-switch ke Supabase atau VIL.

</aside>

### 0A. API Client Abstraction (Minggu 1-4)

**Files to create:**

- `src/services/api/types.ts` — Type definitions (QueryResult, InsertResult, etc.)
- `src/services/api/apiClient.ts` — Interface generik (query, insert, update, delete, rpc)
- `src/services/api/supabaseApiClient.ts` — Implementasi Supabase (wrap existing client)
- `src/services/api/restApiClient.ts` — Stub untuk VIL (throw "not implemented")
- `src/services/api/index.ts` — Barrel export + singleton `setApiClient`/`getApiClient` (initialized di `main.tsx` via `VITE_API_BACKEND` flag)

**Files to refactor (117+ files):**

- 48 feature modules di `src/features/*/api/` → gunakan ApiClient interface
- `src/contexts/AuthContext.tsx` → last to refactor (paling complex)
- `src/services/supabase/client.ts` → only imported by abstraction layer

### 0B. Auth Abstraction (Minggu 3-5)

**Interface `AuthProvider`:** signIn, signUp, signInWithOAuth, signOut, getSession, onAuthStateChange, refreshSession, exchangeCodeForSession

**Key files:**

- `src/contexts/auth/useSessionManagement.ts` (287 lines, 8 direct Supabase auth calls)
- `src/contexts/AuthContext.tsx`
- `src/features/auth/api/authService.ts` (8 RPC calls + 1 Edge Function invoke)
- `src/features/auth/` — MFA service (⚠️ **sering terlewat di plan — harus di-abstract juga**)

### 0C. Realtime Abstraction (Minggu 5-7)

**Interface `RealtimeClient`:** subscribe, track/untrack (presence), broadcast

**9 files to refactor:**

- `useBuilderChannel.ts` (broadcast + presence)
- `useBuilderPresence.ts`
- `useNotifications.ts` + `useAdminNotifications.ts`
- `discussionQueries.ts`
- `useMessages.ts` + `MessageThread.tsx`
- `classroomService.ts`
- `groupAssignmentService.ts`

### 0D. Storage Abstraction (Minggu 6-8)

**Interface `StorageClient`:** upload, download, remove, getPublicUrl

**Files:** storageService.ts, videoUploadService.ts, videoCaptionService.ts, assignmentService.ts, documentApi.ts

### 0F. Compatibility Contract Freeze (Minggu 8-9)

<aside>
🟠

**Gap #1 & #11:** Frontend existing bergantung pada shape data Supabase. VIL harus return format identik. Freeze contract SEBELUM mulai build VIL.

</aside>

- **API Contract Compatibility Matrix** — dokumentasikan per surface:
  - Auth/session shape (`User`, `Session`, `AuthResponse`)
  - Error shape (`{ code, message, details, hint }` — PostgREST format)
  - Pagination shape (`{ data, count, error }` + `.range(from, to)`)
  - Timestamp/date format (ISO-8601, timezone handling)
  - Enum/status naming (`courses.status`: `draft|published|in_review|approved`)
  - Nullability contracts (which fields can be null)
  - Realtime event payload shape (postgres_changes format)
  - Storage public URL shape
- **Golden Tests** — "Supabase vs VIL output must be field-compatible":
  - Buat test suite yang call Supabase DAN VIL, compare response shapes
  - Per-endpoint: request shape, response shape, error shape, status codes
- **Schema Ownership Decision Memo** (Gate 0.5):
  - Source of truth migration: **Supabase CLI sampai Phase 2 selesai, lalu pindah ke sqlx**
  - Freeze Supabase migrations saat VIL mulai write ke DB (Phase 1)
  - Dual-write schema evolution: semua migration harus backward-compatible
  - Enum/status changes hanya boleh via migration file, bukan manual ALTER

### 0G. Direct Dependency Audit + CI Guard (Minggu 9-10)

<aside>
🟠

**Gap #2 & #12:** Supabase imports bocor di hooks, queries, utils, components — bukan hanya di `api/` layer. Harus audit + enforce.

</aside>

- **Full audit** semua direct Supabase imports:
  - `src/features/**/hooks/` — e.g. `useParentNotifications.ts`, `useAdminNotifications.ts`, `useNotifications.ts`, `useChildActivityHistory.ts`
  - `src/features/**/queries/` — e.g. `notificationQueries.ts`
  - `src/features/**/api/` — e.g. `digestApi.ts`, `notificationApi.ts`, `notificationService.ts`
  - `src/utils/` — e.g. `offlineQueue.ts` (direct Supabase imports untuk quiz submission, xAPI)
  - `src/components/` — scan for inline queries
- **CI Guard** — tambahkan ke pipeline:
  - `grep -r "from '@/services/supabase/client'" src/features/ src/utils/ src/components/ | grep -v __tests__ | wc -l` harus = 0
  - ESLint `no-restricted-imports` rule sudah ada di `eslint.config.js` tapi hanya warn — upgrade ke **error** setelah abstraction selesai
  - PR checklist: "no direct supabase import", "no new Edge Function", "all VIL endpoints in compatibility matrix"

### 0E. Verification (Minggu 8-10)

```
# Scope: features + contexts + utils + components (match 0G audit scope)
grep -r "from '@supabase/supabase-js'" src/features/ src/contexts/ src/utils/ src/components/ | grep -v __tests__ | wc -l
# Expected: 0

grep -r "from '@/services/supabase/client'" src/features/ src/contexts/ src/utils/ src/components/ | grep -v __tests__ | wc -l
# Expected: 0 (only src/services/api/supabaseApiClient.ts allowed)
```

- `pnpm validate` passes (typecheck + lint + test)
- All E2E tests pass
- Zero behavior change
- **Rollback:** Git revert. `VITE_API_BACKEND=supabase` functionally identical to original.

---

## Phase 1: VIL Server Scaffold + Auth (Minggu 11-22, ~180 jam)

<aside>
🎯

**Goal:** VIL Rust server yang handle auth + reverse proxy ke Supabase untuk sisanya. Ini adalah **critical path** — jika auth tidak bisa full parity, ini exit point terakhir yang reasonable.

</aside>

### 1A. Scaffold (Minggu 11-14)

- Create Rust workspace `edusync-api/` (crates: server, models, auth, middleware, services)
- Connect ke PostgreSQL YANG SAMA (both Supabase & VIL read/write same DB)
- Generate Rust structs untuk core tables (profiles, tenants, courses, classes, users)
- Reverse proxy: request yang belum di-handle → forward ke Supabase
- Docker Compose + Nginx routing
- **🆕 CORS configuration** — setup `Access-Control-Allow-Origin`, credentials, headers untuk frontend di `localhost:5173` dan production domain
- **🆕 CSP header update** — update `index.html` Content-Security-Policy `connect-src` untuk include VIL server domain

### 1B. Auth Implementation (Minggu 14-20)

<aside>
⚠️

**Harus 100% complete sebelum switch. Ini area paling kritis karena Supabase menyimpan users di schema `auth` yang terpisah dari `public`.**

</aside>

| **#** | **Task**                                                           | **Detail**                                                                                                                                                                                                                     | **Estimasi** |
| ----- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| 1     | **`auth.users` migration plan**                                    | Supabase stores users di `auth.users` (terpisah dari `public.profiles`). Buat tabel `public.users` di VIL-managed schema, migrasi data, update semua FK references. `profiles.id` FK ke `auth.users.id` harus di-handle.       | 2 hari       |
| 2     | **JWT issuance** (VIL built-in `JwtAuth`)                          | **Gunakan VIL built-in `JwtAuth::new(secret)`** — tidak perlu implement JWT middleware sendiri. Custom claims: `sub`, `email`, `roles[]`, `tenant_id`, `exp`, `iat`. Format harus compatible dengan frontend `useAuth()` hook. | 0.5 hari     |
| 3     | **Password hashing (dual-format)**                                 | Match Supabase's bcrypt format. Dual-hash verification: try VIL → fallback Supabase → re-hash on success. **Kritis:** existing 3 dev accounts + semua production users harus tetap bisa login.                                 | 1.5 hari     |
| 4     | **Session management**                                             | Access token 1hr + refresh token 30d. Frontend refreshes 5 min before expiry (sudah di-implement di `useSessionManagement.ts`).                                                                                                | 1 hari       |
| 5     | **PKCE OAuth flow (Google)**                                       | Google OAuth sudah dipakai di production. Harus handle callback redirect sesuai routing audit (lihat Spec 1 §5 — kemungkinan path-based `/auth/callback`).                                                                     | 2 hari       |
| 6     | **Email verification**                                             | Resend/SendGrid/SMTP. GoTrue `.test` TLD bug tidak akan ada lagi — tapi harus test `.dev` domain.                                                                                                                              | 1 hari       |
| 7     | **🆕 MFA (Multi-Factor Authentication)**                           | Supabase punya built-in TOTP MFA. Port ke VIL: TOTP generation, QR code enrollment, recovery codes, verification flow. `mfaService.ts` sudah ada di frontend.                                                                  | 2 hari       |
| 8     | **9 auth RPCs** (incl. `get_auth_bootstrap` — critical parity RPC) | `get_auth_bootstrap` (🚨 paling kritis — lihat Spec 1 §2), `ensure_profile_exists`, `accept_invitation`, `enroll_student`, `validate_invitation`, `public_lookup_class`, `onboard_student_join_class`, `create_school_tenant`  | 3 hari       |
| 9     | **Rate limiting** (VIL built-in `RateLimit`)                       | **Gunakan VIL built-in `RateLimit::new(limit, duration)`** — tidak perlu implement sendiri. Configure per-endpoint: auth 10/min, AI 50/hr, quiz 5/min, general 100/min.                                                        | 0.5 hari     |
| 10    | **🆕 API response format standardization**                         | Supabase PostgREST returns `{ code, message, details, hint }` untuk errors. Frontend `handleSupabaseError()` di `supabaseUtils.ts` depends on format ini. VIL harus return format yang compatible.                             | 0.5 hari     |

### 1C. Tenant & RBAC Middleware (Minggu 18-20)

- `TenantGuard` middleware: extract `tenant_id` dari JWT, inject ke semua query — **menggantikan `get_my_tenant_id()` SQL function + `auto_set_tenant_id()` trigger**
- `RbacGuard` middleware: **gunakan VIL built-in `RbacPolicy`** dengan wildcard permissions — `Role::new("teacher").permission("courses:*")`. Map 5 roles (`student | teacher | admin | parent | principal`). **Role datang dari `user_roles` table, BUKAN `profiles.role`**
- Port RLS policies table-by-table (saat endpoint pindah ke VIL)
- **🆕 Sentry integration** — `initSentry()` di `main.tsx` sudah ada, pastikan VIL errors juga ter-capture

### 1D. Verification

- Auth E2E tests pass terhadap VIL (3 test accounts: teacher/student/admin @[edusync.dev](http://edusync.dev))
- Login/signup/OAuth/logout/MFA cycle berjalan
- Multi-tenant isolation verified
- Feature flag switch antara Supabase auth dan VIL auth
- **🆕 Auth callback redirect** — routing path harus sesuai hasil Routing Audit (lihat Spec 1 §5)

---

## Phase 2: Core CRUD Endpoints (Minggu 23-38, ~240 jam)

<aside>
🎯

**Goal:** Migrasi data endpoints paling banyak dipakai dari Supabase PostgREST ke VIL REST handlers. 48 feature modules, 167 RPCs.

</aside>

### Batch 1 (Minggu 23-28): Courses, Classes, Lessons

- `src/features/courses/api/` — core LMS experience (8 methods, cleanest POC)
- `src/features/classroom/api/` — class management
- `src/features/lessons/api/` — lesson CRUD + block-based content
- `src/features/course-builder/api/` — drag-drop builder, collaborative editing
- Port relevant RLS policies ke Rust guard functions

### Batch 2 (Minggu 28-32): Assignments, Quizzes, Gradebook

- `src/features/quizzes/api/` — **paling kompleks: 13 service files**, timer, autosave, auto-grade
- `src/features/assignments/api/` — submissions, group assignments
- `src/features/gradebook/api/` — complex aggregation queries, SpeedGrader
- `src/features/question-bank/api/` — question bank integration

### Batch 3 (Minggu 32-36): Users, Analytics, Progress

- `src/features/analytics/api/` — **21+ RPC calls di analyticsQueries.ts — KEEP sebagai stored procedures, panggil via `sqlx::query!`**
- `src/features/progress/api/` — progress tracking
- `src/features/xapi/api/` — xAPI statements (sudah punya offline queue dari Phase 31B)
- `src/features/administration/api/` — bulk import, user management

### Batch 4 (Minggu 36-38): Remaining

- `src/features/discussions/api/` — forum
- `src/features/notifications/api/` — notification batching (sudah dari Phase 31C)
- `src/features/calendar/api/` — calendar events
- `src/features/attendance/api/` — QR attendance
- `src/features/certificates/api/` — certificate generation
- `src/features/gamification/api/` — XP, badges, streaks, leaderboard
- `src/features/parent/api/` — parent portal
- `src/features/principal/api/` — principal dashboard
- `src/features/onboarding/api/` — teacher onboarding wizard
- `src/features/surveys/api/`, `src/features/finance/api/`

**Per-batch workflow:**

1. Write Rust model structs (`Serialize`, `Deserialize`, `sqlx::FromRow`)
2. Write CRUD handlers
3. Port RLS policies ke Rust guards
4. **🆕 Shadow mode testing** — request ke Supabase DAN VIL, compare responses
5. Write integration tests
6. Update frontend `RestApiClient`
7. Run E2E tests dengan `VITE_API_BACKEND=vil`
8. Enable via **per-flow cutover** (lihat Spec 2 §3 Flow Cutover Matrix) — feature flags sebagai mekanisme teknis, flow sebagai unit keputusan operasional

**Rollback:** Per-flow flags. Jika `quiz.read` gagal tapi `quiz.submit` OK, hanya read path yang revert. Lihat Spec 2 §3 untuk rollback unit per flow.

---

## Phase 3: Edge Functions → VIL Services (Minggu 39-52, ~200 jam)

<aside>
🎯

**Goal:** Port 22 Edge Functions (~7,900 lines Deno TypeScript) ke Rust handlers.

</aside>

### 3A. AI Functions (Minggu 39-43)

| **Edge Function**            | **Lines** | **Complexity**             | **Catatan**                                                                                                                                        |
| ---------------------------- | --------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ai-grade-essay`             | 187       | Medium                     | **Gunakan VIL `SseCollect` • `SseDialect::openai()`** untuk proxy ke Groq API. **VIL built-in `CircuitBreaker`** untuk fault tolerance.            |
| `ai-tutor`                   | 674       | **High** (paling kompleks) | **Gunakan VIL `SseCollect`** untuk streaming proxy ke Groq. Conversation state di DB. Context injection dari lesson + student progress via `sqlx`. |
| `generate-ai-content`        | 476       | Medium                     | Content validation sudah ada di `contentValidator.ts` (Phase 31A).                                                                                 |
| `generate-quiz-from-content` | ~200      | Medium                     | Generate quiz questions from lesson content.                                                                                                       |

### 3B. LTI 1.3 Functions (Minggu 43-46)

- `lti-oidc-login`, `lti-launch`, `lti-jwks` — use `jsonwebtoken` crate (RS256)
- LTI guest users get deterministic email: `lti-{platformId8}-{sub}@lti.edusync.internal`
- `lti_nonces` table uses `service_role` only
- Test terhadap real LTI platforms (Canvas, Moodle)
- LTI error handler sudah ada dari Phase 31B

### 3C. Notification/Communication (Minggu 46-49)

- **Email:** `send-email-digest`, `send-parent-digest` → Rust + `lettre`
- **Push:** `send-push` → Rust + `web-push` (VAPID key di `VITE_VAPID_PUBLIC_KEY`)
- **WhatsApp:** `whatsapp-webhook`, `send-parent-otp` → Rust + reqwest
- **PDF:** `generate-pdf`, `generate-executive-report`, `generate-parent-report` → Rust + `printpdf`/`genpdf`

### 3D. Processing & Misc (Minggu 49-52)

- `grade-quiz-attempt` — background quiz grading (service role)
- `process-progress-events` — batch progress event processing
- `progress-events` — enqueue progress events
- `load-quiz-data` — load quiz for student
- `scorm-extract` — SCORM ZIP + XML extraction
- `bulk-import-users` — bulk CSV import (sudah di-harden di Phase 31)
- `check-rate-limit` — sudah di-replace di Phase 1B
- `health-check` — simple health endpoint

### 🆕 3E. Background Jobs / Cron (Minggu 50-52)

<aside>
⚠️

**Gap yang sering terlewat!** Supabase pakai `pg_cron` untuk scheduled tasks. VIL harus replace dengan `vil_trigger_cron`.

</aside>

- **Scheduled digests:** email digest harian (17:00 WIB), parent digest
- **Analytics aggregation:** refresh materialized views (dari Phase 31 optimization)
- **Cleanup tasks:** expired sessions, old notification data (`cleanup_expired_notification_data()`)
- **AI quota reset:** monthly reset AI usage counters
- **XAPI queue flush:** periodic sync offline statements

---

## Phase 4: Realtime Migration (Minggu 53-60, ~120 jam)

<aside>
🎯

**Goal:** Supabase Realtime → VIL WebSocket rooms (`vil_ws`).

</aside>

### 4A. WebSocket Server (Minggu 53-55)

- `vil_ws` room support + presence tracking
- `pg_notify` → LISTEN/NOTIFY forwarding (replace `postgres_changes`)
- Add triggers ke tables yang butuh realtime
- **🆕 Reconnection strategy** — exponential backoff sudah di-design, pastikan no message loss

### 4B. Port 9 Realtime Consumers (Minggu 55-58)

| **Hook/File**               | **Pattern**                  | **Complexity**                    |
| --------------------------- | ---------------------------- | --------------------------------- |
| `useBuilderChannel.ts`      | Broadcast + presence         | High — collaborative editing      |
| `useBuilderPresence.ts`     | Presence tracking            | Medium                            |
| `useNotifications.ts`       | postgres_changes → pg_notify | Medium                            |
| `useAdminNotifications.ts`  | postgres_changes → pg_notify | Medium                            |
| `discussionQueries.ts`      | postgres_changes             | Low                               |
| `useMessages.ts`            | Broadcast                    | Medium — parent-teacher messaging |
| `MessageThread.tsx`         | Broadcast                    | Low                               |
| `classroomService.ts`       | postgres_changes             | Low                               |
| `groupAssignmentService.ts` | Broadcast                    | Low                               |

**Catatan:** EduSync saat ini sudah minimize WebSocket (polling preference untuk Supabase Free Tier) — lihat rule di [AGENTS.md](http://AGENTS.md). VIL WebSocket bisa lebih agresif karena self-hosted.

### 4C. Verification (Minggu 58-60)

- Collaborative builder works with 2+ users
- Notifications real-time
- Reconnection with exponential backoff
- No message loss on reconnect

---

## Phase 5: Storage Migration (Minggu 61-66, ~80 jam)

<aside>
🎯

**Goal:** Supabase Storage → S3/MinIO via `vil_storage_s3`.

</aside>

1. Deploy MinIO/S3/R2
2. Configure `vil_storage_s3`
3. **Dual-write period:** VIL writes to both Supabase Storage + S3
4. Background migration script: copy all existing files (videos, submissions, avatars)
5. Switch reads to S3
6. **🆕 URL rewriting** — update semua `getPublicUrl()` references di DB dan frontend
7. **🆕 CSP update** — update `img-src` dan `connect-src` di `index.html` untuk S3 domain

---

## Phase 6: Supabase Decommission (Minggu 67-72, ~50 jam)

1. Remove `@supabase/supabase-js` dari `package.json`
2. Remove Supabase abstraction implementations (keep interfaces)
3. Remove Edge Functions directory (`supabase/functions/`)
4. Remove Supabase config (`supabase/config.toml`)
5. Migrate PostgreSQL hosting jika perlu (Neon/RDS/self-hosted)
6. Remove RLS policies dari DB (now enforced in Rust middleware)
7. **🆕 Remove `supabase` devDependency** (CLI)
8. **🆕 Update Sentry** — pastikan error tracking pointing ke VIL endpoints
9. **🆕 Update PWA service worker** — cache strategy untuk VIL API endpoints
10. Final full E2E test run (`pnpm test:e2e`)
11. Final load test (`k6 run tests/load/stress.js`)

---

## 🆕 Cross-Cutting Concerns (Parallel dengan semua phase)

<aside>
🔧

**Ini adalah gap-gap yang TIDAK ADA di plan awal tapi kritis untuk production success.**

</aside>

### CC1. Monitoring & Observability (Mulai Phase 1)

<aside>
🦀

**VIL `.observer(true)` otomatis menyediakan** `/_vil/dashboard/` dengan live metrics, SLO budget, per-route latency, error rate, topology graph — tidak perlu build custom monitoring dashboard.

</aside>

- **VIL Observer Dashboard** — `.observer(true)` di VilApp, auto-generates: `/_vil/dashboard/` (live UI), `/_vil/metrics` (Prometheus scrape), `/_vil/api/*` (JSON untuk central scraping)
- **Auto-registered endpoints** — `GET /health` (liveness), `GET /ready` (readiness), `GET /metrics` (Prometheus per-handler), `GET /info` (server metadata)
- **Request routing dashboard** — berapa % ke VIL vs Supabase (custom, di Grafana)
- **Error rate comparison** antara kedua backend per endpoint
- **Alerting** — VIL Observer punya threshold-based alerts (error rate, P99, latency spread) built-in + Grafana alerting
- `vil_otel` → OpenTelemetry distributed tracing (W3C traceparent auto-generated)
- `vil_log` → semantic logging (4.5-6.2x faster than `tracing`)

### CC2. Database Migration Strategy (Mulai Phase 0)

<aside>
✅

**KEPUTUSAN FINAL (dari Phase 0F Gate 0.5):**

1. **Phase 0–2:** Supabase CLI tetap jadi source of truth untuk migrations
2. **Phase 2 selesai:** Freeze Supabase migrations, pindah ke `sqlx migrate`
3. **Selama dual-running:** Semua migration harus backward-compatible (no breaking ALTER)
4. **Enum/status changes:** Hanya via migration file, bukan manual ALTER
5. **Schema write authority:** Hanya 1 tool yang boleh write migration pada satu waktu
</aside>

- Phase 0–2: Supabase CLI manage migrations, VIL hanya read via `sqlx`
- Phase 2 completion: Freeze Supabase CLI, pindah ke `sqlx migrate` sebagai source of truth
- Selama dual-running: backward-compatible migrations only (additive columns, no drops)
- VIL `sqlx` migrations parallel track dimulai Phase 1 untuk tabel baru (`public.users`, `dead_letter_jobs`)

### CC3. Staging Environment (Mulai Phase 1)

- Staging VIL server yang mirror production DB (read replica)
- Preview deployments per-branch
- E2E test environment yang isolated
- **Parity tests:** panggil Supabase dan VIL dengan input yang sama, assert output identical

### CC4. Comprehensive Rate Limiting (Mulai Phase 2)

- Per-tenant, per-user rate limiting di semua API endpoints
- Khusus rate limit untuk: file uploads, AI endpoints (expensive), quiz submissions (anti-cheat)
- Replace Supabase `check-rate-limit` Edge Function

### CC5. Graceful Degradation / Circuit Breaker (Mulai Phase 3)

- Circuit breaker untuk AI endpoints (Groq API down) — sudah di-design Phase 31A
- Fallback behavior per feature saat VIL server down
- Frontend error handling via `unhandledrejection` handler di `main.tsx`

### CC6. Offline & Queue Semantics (Mulai Phase 1)

<aside>
🟠

**Gap #3:** EduSync punya offline queue infrastructure yang sudah mature (`offlineQueue.ts`, `offlineStorage.ts`, `xapiQueue.ts`, HMAC-signed progress queue). Queue ini harus tetap valid saat backend pindah ke VIL.

</aside>

- **Idempotency keys** wajib untuk:
  - xAPI statements (`xapi:{verb}:{objectType}:{objectId}:{userId}`)
  - Quiz submissions (attempt ID + user ID)
  - Progress events (lesson ID + user ID + timestamp)
  - Assignment uploads (submission ID)
- **Delivery semantics** per entity:
  - xAPI: **at-least-once** (server dedup by idempotency key)
  - Quiz submit: **exactly-once** (attempt immutable after submit)
  - Progress: **last-write-wins** (latest timestamp)
  - Assignment upload: **at-least-once** (server dedup by submission ID)
- **Retry policy parity:**
  - `offlineQueue.ts` sudah punya exponential backoff (2s→300s, max 5 retries)
  - VIL server harus accept same idempotency keys dan return 200 (bukan 409)
  - Dead-letter: items quarantined after `MAX_RETRIES` (5)
- **Queue migration strategy:**
  - Browser queues yang sudah tersimpan di IndexedDB (`SYNC_QUEUE_STORE`) akan tetap valid karena format payload sama
  - `offlineQueue.ts` calls `supabase.from()` / `supabase.rpc()` → harus refactor ke `getApiClient().from()` di Phase 0
  - HMAC-signed progress queue (`sessionStorage`) harus tetap compatible
- **Conflict resolution per entity:**
  - `processOperation()` di `offlineQueue.ts` sudah handle: success, retry, conflict, permanent
  - Conflict strategy: `client-wins` | `server-wins` | `manual`

### CC7. Worker & Queue Runtime Architecture (Mulai Phase 2)

<aside>
🟠

**Gap #5:** Beberapa proses EduSync bukan endpoint tapi job-processing pipeline. Harus dipisahkan secara tegas dari HTTP handlers.

</aside>

- **HTTP Handlers** (synchronous, user-facing):
  - All CRUD endpoints, auth, quiz fetch, course browse
- **Internal Service Process** (VIL `Visibility::Internal`, via Tri-Lane):
  - Quiz grading worker (`grade-quiz-attempt`)
  - Bulk import processor (`process-bulk-import-jobs`)
- **Scheduled Workers** (VIL `vil_trigger_cron`):
  - Email digest (17:00 WIB daily)
  - Analytics refresh (every 15 min)
  - AI quota reset (monthly)
  - Cleanup expired data (daily 02:00 WIB)
- **Retry Policy per Queue:**
  - Quiz grading: 3 retries, exponential backoff (30s→2min→10min), then dead-letter
  - Bulk import: resume from last chunk, 3 retries per chunk
  - xAPI flush: 3 retries, drop after max
  - Notification fanout: 2 retries, then log and skip
- **Dead-Letter Queue (DLQ) — KEPUTUSAN FINAL:**
  - **Domain-specific DLQ tetap di DB:** Quiz grading (`quiz_submission_queue.status = 'dead_letter'`) — karena butuh domain context untuk replay (attempt data, student info)
  - **General DLQ pakai VIL built-in `DeadLetterQueue`:** Untuk bulk import, notification fanout, xAPI flush — via Tri-Lane mesh DLQ (`.enqueue()`, `.recent()`, `.mark_replayed()`)
  - **Agent TIDAK BOLEH membuat custom DLQ table baru** — gunakan salah satu dari 2 mekanisme di atas
- **Observability per queue:**
  - Queue depth, lag, failure rate, DLQ count
  - VIL Observer dashboard + custom Grafana panel

### CC8. Frontend Runtime Compatibility (Mulai Phase 1)

<aside>
🟠

**Gap #6, #7, #8, #9, #10:** Per-flow cutover, React Query parity, privileged workflows, observability correlation, PWA/service worker.

</aside>

- **Per-Flow Cutover Matrix** (bukan per-feature):
  - Contoh quizzes: Read → VIL, Autosave → Supabase, Submit → VIL, Grading → Supabase, Notification → Supabase, Gradebook RPC → Supabase
  - Setiap feature harus punya matrix flow × backend sebelum cutover
- **React Query Parity Checklist:**
  - Key invalidation tetap sama (key factories sudah tenant-scoped)
  - Optimistic updates tetap aman (rollback on error)
  - `staleTime` / `refetchInterval` tidak berubah
  - Hybrid refresh (polling + realtime) tetap konsisten
  - Mutation → invalidation mapping doc per feature
- **Privileged Operation Inventory:**
  - System jobs: grading, analytics refresh, cleanup — actor = `system`
  - Admin jobs: bulk import, tenant bootstrap — actor = `tenant_admin`
  - Maintenance: storage migration, schema evolution — actor = `platform_admin`
  - VIL: gunakan `Visibility::Internal` ServiceProcess (tidak exposed ke HTTP)
  - Audit log: semua privileged operations harus log ke `activity_logs`
- **Frontend↔Backend Observability Correlation:**
  - `X-Request-ID` header propagation (browser → VIL → DB → worker)
  - VIL auto-generates W3C `traceparent` — propagate ke async jobs
  - Error code catalog: map VIL error codes ke existing UI toast messages
  - Shadow-mode dashboard: Supabase vs VIL mismatch rate per endpoint
- **PWA / Service Worker Migration** (Phase 1, bukan Phase 6):
  - Audit SW cached request patterns (`workbox-window` config)
  - API hostname/path changes impact pada cache
  - Auth token forwarding lewat SW untuk VIL endpoints
  - Background sync compatibility (SW → VIL instead of Supabase)
  - Cache invalidation strategy saat domain cutover
- **API Versioning Parity:**
  - VIL routes: `/api/v1/...` (match existing Supabase pattern)
  - `X-API-Version` header dari existing `apiVersion.ts` — VIL harus respect
  - Compatibility window: 6 bulan setelah v2 release
  - Deprecation headers: `X-API-Deprecated`, `X-API-Sunset`
  - Mapping: Supabase Edge Function → VIL route (1:1 untuk Phase 3)

---

## Go/No-Go Gates

| **Gate**                         | **Kapan**                   | **Kriteria**                                                                          | **Keputusan Jika Gagal**                                           |
| -------------------------------- | --------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Gate 1                           | After Phase 0 (W10)         | Abstraction layer causes regressions > 2 minggu                                       | Evaluasi ulang scope migrasi                                       |
| **Gate 2** (exit point terakhir) | After Phase 1 Auth (W22)    | VIL auth tidak bisa full parity (PKCE, MFA, email verification, password hash compat) | **STOP** — tetap pakai Supabase Auth, migrasi hanya Edge Functions |
| Gate 3                           | After Phase 2 Batch 1 (W28) | RLS→middleware menghasilkan security bugs                                             | Pause, build automated policy verification tests                   |
| Gate 4                           | After Phase 3 (W52)         | VIL stability bermasalah (crashes, memory leaks)                                      | Fork VIL atau switch ke **Axum** langsung                          |
| Gate 5                           | After Phase 4 (W60)         | Realtime tidak reliable (message loss, presence gaps)                                 | Keep Supabase Realtime, hanya migrasi REST                         |
| Gate 6                           | After Phase 6 (W72)         | All tests pass, load tests pass                                                       | **Success! 🎉**                                                    |

---

## Effort Summary

| **Phase**                    | **Minggu**        | **Jam**              | **Risiko Utama**                                                                                                                |
| ---------------------------- | ----------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 0: Frontend Abstraction      | 1-10              | ~150                 | Behavioral differences di 48 feature modules                                                                                    |
| 1: Auth + Scaffold           | 11-22             | ~160                 | Password hash, OAuth PKCE, MFA, `auth.users` migration. **VIL built-in: JwtAuth, RateLimit, RbacPolicy** hemat ~20 jam          |
| 2: CRUD Endpoints            | 23-38             | ~240                 | 167 RPCs, complex SQL, 748 RLS parity                                                                                           |
| 3: Edge Functions + Cron     | 39-52             | ~170                 | AI complexity, LTI compliance, background job migration. **VIL built-in: SseCollect, CircuitBreaker, SseDialect** hemat ~30 jam |
| 4: Realtime                  | 53-60             | ~120                 | Presence gaps, pg_notify triggers, message loss                                                                                 |
| 5: Storage                   | 61-66             | ~80                  | Data migration, URL rewriting, CSP updates                                                                                      |
| 6: Decommission              | 67-72             | ~50                  | Missed dependencies, PWA cache invalidation                                                                                     |
| **Total (base)**             | **~60 minggu**    | **~853 jam**         | Sebelum Spec 4 gaps                                                                                                             |
| **• Spec 4 gaps**            | **+10-15**        | **+176-266**         | PostgREST replacement, password reset, auth.\* migration, deployment, etc.                                                      |
| **REVISED TOTAL v1**         | **~70-75 minggu** | **~1,030-1,120 jam** | Setelah Spec 4 gaps                                                                                                             |
| **• VIL Gap Analysis v2**    | **+3-5**          | **+43-63**           | 14 temuan dari [ROADMAP.md](http://ROADMAP.md) • API Reference                                                                  |
| **• Production Readiness**   | **+7-10**         | **+120-170**         | 15 gaps: RLS verification (+30-50), TS codegen (+12-20), compliance (+16), monitoring (+12), dll                                |
| **REVISED TOTAL v3 (FINAL)** | **~80-88 minggu** | **~1,193-1,333 jam** | Angka realistis setelah semua gap analysis + production readiness                                                               |

---

## Mapping: Supabase Feature → VIL Replacement

| **Supabase Feature**  | **EduSync Usage**                                       | **VIL Replacement**                                   | **Effort**              |
| --------------------- | ------------------------------------------------------- | ----------------------------------------------------- | ----------------------- |
| Auth (GoTrue)         | Register, login, OAuth, MFA, session, JWT, 5 roles      | `vil_server` `JwtAuth` • `VilPassword` • custom MFA   | High                    |
| Edge Functions (Deno) | 22 functions (~7,900 lines)                             | `VilApp` • `ServiceProcess` endpoints                 | High (tapi incremental) |
| PostgreSQL + 167 RPCs | All data + stored procedures                            | `vil_db_sqlx` — **same DB, RPCs tetap di PostgreSQL** | Low                     |
| Realtime              | 9 subscriptions (presence, broadcast, postgres_changes) | `vil_ws` WebSocket server + `pg_notify`               | Medium                  |
| Storage               | Videos, file uploads, avatars                           | `vil_storage_s3` (MinIO / S3-compatible)              | Low                     |
| RLS (748 policies)    | Data access control per tenant/role                     | `TenantGuard` • `RbacGuard` middleware                | High                    |
| pg_cron               | Scheduled digests, analytics refresh                    | `vil_trigger_cron`                                    | Low                     |

---

## Risk Register

| **Risiko**                        | **Likelihood** | **Impact**   | **Mitigasi**                                                     |
| --------------------------------- | -------------- | ------------ | ---------------------------------------------------------------- |
| VIL stability issues              | Medium         | High         | Fork ke Axum jika needed (Gate 4)                                |
| Password hash mismatch            | High           | **Critical** | Dual-hash verification + extensive testing                       |
| RLS → middleware security bugs    | Medium         | High         | Shadow mode testing, automated policy tests                      |
| MFA implementation gaps           | Medium         | High         | Port `mfaService.ts` logic, test against existing enrolled users |
| `auth.users` schema migration     | Medium         | High         | Careful FK mapping, dual-read period                             |
| Background job (cron) gaps        | Medium         | Medium       | Audit semua pg_cron jobs sebelum Phase 3                         |
| CORS/Cookie issues                | Medium         | Medium       | Test di staging dulu, CSP header gradual update                  |
| Performance regression            | Low            | Medium       | k6 load tests (`pnpm load:smoke`, `pnpm load:stress`)            |
| Scope creep                       | High           | Medium       | Strict phase gates + per-feature flags                           |
| Team burnout (18 bulan part-time) | Medium         | High         | Realistic timeline, celebrate phase completions                  |

---

## Verification Strategy (Setiap Phase)

```
# Setiap phase completion:
pnpm validate          # typecheck + lint + unit tests
pnpm test:e2e          # E2E tests (Playwright)
pnpm load:smoke        # k6 smoke test (100 VU)

# Phase 2+:
k6 run tests/load/stress.js  # stress test (2000 VU)

# Cross-cutting:
# Shadow mode: compare Supabase vs VIL responses
# Parity tests: identical input → identical output
# Security: tenant isolation, role guard tests
```

---

## 📝 6 Execution Contracts — Wajib Sebelum Cutover

<aside>
📝

**Plan ini 8.5/10 di level roadmap, tapi belum execution-ready tanpa 6 kontrak teknis berikut.** Setiap kontrak adalah artefak wajib yang harus ada SEBELUM phase terkait dimulai. Tanpa ini, migrasi akan "kelihatan maju di dokumen tapi pecah saat cutover".

</aside>

### Contract 1: Routing Source-of-Truth Memo — Gate 0 BLOCKER

<aside>
🚨

**KEPUTUSAN WAJIB sebelum Phase 0 dimulai.** Codebase inkonsisten: `AGENTS.md` menyebut hash routing `/#/`, tapi `App.tsx` pakai `BrowserRouter` (path-based). `main.tsx` juga pakai `window.location.pathname` untuk OAuth callback.

</aside>

**Fakta dari codebase:**

- `App.tsx`: `import { BrowserRouter as Router }` → **path-based**
- `main.tsx`: `window.location.pathname === '/auth/callback'` → **path-based**
- `useSessionManagement.ts`: `window.location.pathname === '/auth/callback'` → **path-based**
- `AGENTS.md` / `CLAUDE.md`: "Hash routing — semua URL pakai `/#/` prefix" → **dokumentasi salah**

**KEPUTUSAN:** EduSync menggunakan **path-based routing** (BrowserRouter). Dokumentasi `AGENTS.md` yang menyebut hash routing adalah **legacy/inkonsisten** dan harus di-update. Semua keputusan migrasi (OAuth callback, Nginx rules, PWA cache, deep links) menggunakan path-based sebagai source of truth.

**Dampak ke migrasi:**

- OAuth callback: `/auth/callback` (path) → VIL Nginx harus route ini
- Nginx: semua `/app/*`, `/auth/*`, `/login`, `/register` harus fallback ke `index.html`
- PWA service worker: `navigateFallback` patterns path-based
- Error redirect: `window.location.assign('/login')` (sudah path-based di `main.tsx`)

---

### Contract 2: Auth State Side-Effects Matrix — Gate 2 DELIVERABLE

**Artefak wajib sebelum auth cutover.** Backend auth bisa "lulus" tapi UX tetap rusak jika side-effects tidak di-replicate.

| **Event**    | **Side Effects (dari codebase aktual)**                   | **Source** |
| ------------ | --------------------------------------------------------- | ---------- |
| **Sign Out** | 1. Clear React state (user, session) SEBELUM call backend |

2. Remove localStorage keys: `activeTenantId`, `pendingInviteToken`, `pendingJoinCode`, `pendingInviteRetryCount`
3. Remove semua `ai_tutor_session_*` keys
4. `clearPostAuthRedirect()` • `clearOAuthRedirectPending()`
5. Set authStatus = 'unauthenticated'
6. TERAKHIR: `supabase.auth.signOut()` (best-effort, error swallowed) | `useSessionManagement.ts` |
   | **Token Refresh Failure** | 1. Toast: "Sesi Anda telah berakhir"
7. `setSessionExpired(true)`
8. Trigger `signOut()` (full cleanup above)
9. Proactive check setiap 60s, refresh jika <5min until expiry | `useSessionManagement.ts` |
   | **Unhandled 401/403** | 1. Guard `authRedirectPending` mencegah double redirect
10. `window.location.assign('/login')`
11. 2s cooldown sebelum reset guard | `main.tsx` |
    | **App Startup** | 1. `normalizeLegacyHashUrl()` — redirect hash URLs ke path
12. `sanitizeRedirectTarget()` dari query params
13. `validateEnv()` — fail fast jika env vars missing
14. `initSentry()` sebelum render | `main.tsx` |
    | **Auth Bootstrap** | 1. `getAuthBootstrap()` RPC → profile + memberships + default_tenant
15. Validate cached `activeTenantId` terhadap memberships
16. Process `pendingInviteToken` (dengan 1x retry)
17. Process `pendingJoinCode`
18. 12s timeout → error + `bootstrapReady = true` | `useRoleResolution.ts` |
    | **Tenant Switch** | 1. Validate `is_active` — block switch ke inactive tenant
19. Save ke `localStorage.activeTenantId`
20. Update `activeTenant` state
21. Breadcrumb ke Sentry | `useTenantSwitching.ts` |

**VIL harus replicate SEMUA side-effects di atas.** Backend auth endpoint yang benar tapi frontend cleanup yang salah = infinite spinner, stale tenant, atau cross-tenant data leak.

---

### Contract 3: Frontend Runtime Compatibility Contract — Gate 1 DELIVERABLE

Sudah detail di Spec 2, tapi harus dipromosikan ke main plan sebagai **prerequisite Phase 2 Batch 1**:

- [ ] `getApiClient()` singleton works di hooks DAN service files
- [ ] Error shape PostgREST-compatible: `{ code, message, details, hint }`
- [ ] React Query key factories unchanged (tenant-scoped)
- [ ] Invalidation mapping verified per module
- [ ] Optimistic update rollback tested
- [ ] `staleTime` / `refetchInterval` unchanged
- [ ] CI guard: ESLint `no-restricted-imports` on **error** (bukan warn)
- [ ] Vertical slice courses lulus 10-step checklist (Spec 2 §2.3)

**Tanpa contract ini passed:** Phase 2 Batch 1 TIDAK BOLEH dimulai.

---

### Contract 4: Offline Delivery Contract — Gate 3 DELIVERABLE

| **Entity**        | **Delivery Semantics** | **Idempotency Key Format**                     | **Replay Response**             | **Queue Location**           |
| ----------------- | ---------------------- | ---------------------------------------------- | ------------------------------- | ---------------------------- |
| xAPI Statement    | At-least-once          | `xapi:{verb}:{objectType}:{objectId}:{userId}` | 200 OK (bukan 409)              | IndexedDB `SYNC_QUEUE_STORE` |
| Quiz Submit       | Exactly-once           | `quiz:{attempt_id}:{user_id}`                  | 200 OK (return existing result) | IndexedDB                    |
| Progress Event    | Last-write-wins        | `progress:{lesson_id}:{user_id}`               | 200 OK (upsert)                 | sessionStorage (HMAC-signed) |
| Assignment Upload | At-least-once          | `assignment:{submission_id}`                   | 200 OK (bukan 409)              | IndexedDB                    |

**Tambahan contract:**

- Service worker harus route request ke backend baru setelah cutover (update SW `runtimeCaching` patterns)
- Queue yang tersimpan sebelum cutover tetap valid (payload format sama)
- Auth token refresh harus terjadi SEBELUM offline replay (stale token = 401 cascade)
- `offlineQueue.ts` dan `xapiQueue.ts` HARUS sudah pakai `getApiClient()` (Phase 0 task 0A-22)

---

### Contract 5: Realtime Decision Matrix — Gate 5 DELIVERABLE

| **Channel**         | **Current (Supabase)** | **Target (VIL)**  | **Mechanism**            | **Loss Tolerance** | **Reconnect Budget** |
| ------------------- | ---------------------- | ----------------- | ------------------------ | ------------------ | -------------------- |
| Notifications       | postgres_changes       | VIL WS            | pg_notify (ephemeral)    | ✅ Acceptable      | 30s max              |
| Discussions         | postgres_changes       | VIL WS            | pg_notify (ephemeral)    | ✅ Acceptable      | 30s max              |
| Classroom           | postgres_changes       | VIL WS            | pg_notify (ephemeral)    | ✅ Acceptable      | 30s max              |
| Builder Presence    | broadcast              | VIL WS            | pg_notify (ephemeral)    | ✅ Acceptable      | 5s max               |
| Builder Content     | broadcast              | VIL WS            | Outbox pattern (durable) | ❌ No loss         | 5s max               |
| Parent Messaging    | postgres_changes       | VIL WS            | Outbox pattern (durable) | ❌ No loss         | 30s max              |
| Group Assignment    | broadcast              | VIL WS            | pg_notify (ephemeral)    | ✅ Acceptable      | 30s max              |
| Admin Notifications | postgres_changes       | **Tetap polling** | React Query refetch 30s  | ✅ N/A             | N/A                  |

**Rationale:** Admin notifications tetap polling karena volume rendah dan tidak perlu real-time. Channel lain naik ke WebSocket karena VIL self-hosted = no connection limit.

---

### Contract 6: Cutover Rehearsal Playbook — Gate 2+ DELIVERABLE

**Sebelum SETIAP gate cutover**, jalankan rehearsal berikut:

1. **Seeded staging** — `supabase db reset` + `seed.sql` di staging environment. 3 test tenants, 3 roles.
2. **Dual-run verification** — Request ke Supabase DAN VIL, compare response shapes field-by-field.
3. **Per-flow cutover test** — Switch 1 flow (e.g., `quiz.read`) ke VIL, verify, rollback, verify rollback.
4. **Rollback rehearsal** — Switch back ke Supabase, verify zero data loss, verify cache consistency.
5. **Load comparison** — k6 smoke test (100 VU) terhadap VIL endpoint, compare p95/p99 dengan Supabase baseline.
6. **Auth cycle test** — Full login → bootstrap → navigate → action → refresh → logout cycle di VIL.
7. **Offline replay test** — Queue actions offline, switch backend, go online, verify replay succeeds.

**One-click switching:** Environment variable per-flow (`VITE_API_BACKEND`, `VITE_REALTIME_BACKEND`) — restart frontend = switch. Tidak perlu redeploy backend.

---

### 📊 Tambahan: Phase 0 Supabase Import Inventory (Contract 3 prereq)

Inventory wajib sebelum Phase 0 dianggap selesai:

| **Kategori**                  | **Contoh File**                                           | **Refactor Wave** | **"Done" Criteria**                              |
| ----------------------------- | --------------------------------------------------------- | ----------------- | ------------------------------------------------ |
| Service (`features/*/api/`)   | `courseService.ts`, `quizCRUD.ts`                         | 0A Week 1-4       | 0 `supabase.from()` / `supabase.rpc()`           |
| Query (`features/*/queries/`) | `notificationQueries.ts`                                  | 0B Wave 2-3       | 0 direct Supabase imports                        |
| Hook (`features/*/hooks/`)    | `useParentNotifications.ts`, `useChildActivityHistory.ts` | 0B Wave 4         | 0 `supabase.from()` (realtime OK sampai Phase 4) |
| Util (`utils/`)               | `offlineQueue.ts`                                         | 0A Task 0A-22     | 0 direct imports                                 |
| Context (`contexts/`)         | `AuthContext.tsx`, `useSessionManagement.ts`              | 0B-0D             | 0 direct imports (last to refactor)              |
| Component (`components/`)     | Scan for inline queries                                   | 0B Wave 4         | 0 direct imports                                 |

**CI enforcement:** `grep -r "from '@/services/supabase/client'" src/features/ src/utils/ src/components/ src/contexts/ | grep -v __tests__ | wc -l` = **0** sebelum Phase 0 gate.

---

### 📊 Tambahan: Capacity Model Baseline

Dari `BENCHMARK_REPORT.md` codebase:

| **Endpoint**  | **Current p95 (Supabase)** | **Target p95 (VIL)**          | **DB Pool Impact**             | **Rollback Threshold** |
| ------------- | -------------------------- | ----------------------------- | ------------------------------ | ---------------------- |
| Auth (login)  | ~350ms                     | <200ms                        | Low (1 query)                  | p95 > 500ms            |
| Quiz load     | ~420ms                     | <300ms                        | Medium (3-5 queries)           | p95 > 600ms            |
| Dashboard     | ~850ms                     | <500ms                        | High (RPC aggregation)         | p95 > 1200ms           |
| Gradebook     | ~1100ms                    | <700ms                        | High (complex joins)           | p95 > 1500ms           |
| Analytics RPC | ~2300ms                    | <1500ms (keep as stored proc) | Very High (materialized views) | p95 > 3000ms           |

**Rule:** Jika VIL endpoint p95 > rollback threshold selama 1 jam → auto-rollback flow tersebut ke Supabase.

---

### VIL Built-in Adoption Checklist

| **VIL Feature**    | **Keputusan** | **Alasan**                                                     | **Exit Criteria jika Belum Matang**                                 |
| ------------------ | ------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `JwtAuth`          | ✅ Pakai      | Core feature, well-tested                                      | Fallback ke `jsonwebtoken` crate langsung                           |
| `RbacPolicy`       | ✅ Pakai      | Simple role-permission mapping                                 | Custom enum-based check                                             |
| `RateLimit`        | ✅ Pakai      | Simple, in-memory OK                                           | Custom `tower` middleware                                           |
| `SseCollect`       | ✅ Pakai      | AI proxy critical path                                         | `reqwest` • manual SSE parsing                                      |
| `CircuitBreaker`   | ✅ Pakai      | AI fault tolerance                                             | Custom state machine                                                |
| `CsrfProtection`   | ✅ Pakai      | Double-submit cookie standard                                  | Custom `tower` middleware                                           |
| `TenantGuard`      | ❌ Custom     | VIL multi-tenancy = commercial (Phase 5b)                      | N/A — always custom                                                 |
| `SessionManager`   | ❌ Skip       | Cookie-based, kita butuh JWT + refresh token                   | N/A — custom PostgreSQL store                                       |
| `FeatureFlags`     | ❌ Skip       | In-memory only, restart = reset                                | N/A — env vars                                                      |
| `OAuth2Client`     | ❌ Skip       | Server-to-server, bukan browser PKCE                           | N/A — `oauth2` crate langsung                                       |
| `IdempotencyStore` | ⚠️ Partial    | In-memory OK untuk non-critical. Quiz submit pakai PostgreSQL. | Full PostgreSQL store jika VIL restart sering                       |
| `MultiPoolManager` | ❌ Skip       | Terlalu early-stage. PgBouncer lebih proven.                   | N/A — PgBouncer                                                     |
| `vil_trigger_cdc`  | ⚠️ Evaluate   | Lebih reliable dari pg_notify tapi butuh WAL setup             | Outbox pattern sebagai fallback (sudah di Phase 4)                  |
| `vil_ws`           | ⚠️ Evaluate   | Room management maturity belum terkonfirmasi                   | `axum::extract::WebSocketUpgrade` • custom WsHub (sudah di Phase 4) |

---

## 🚨 15 Production Readiness Gaps — Dari Plan ke Production

<aside>
🚨

**15 gap yang membedakan "plan bagus di dokumen" dan "plan yang survive kontak dengan production".** 4 kritikal, 6 signifikan, 5 operasional. Revised total: ~1,193-1,333 jam (~80-88 minggu).

</aside>

### 🔴 Gap Kritikal

| **#** | **Gap**                                     | **Keputusan**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | **Effort**               |
| ----- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1     | **WebSocket Auth Strategy**                 | **JWT di query param** `ws://api.edusync.id/ws?token=xxx`. Browser tidak bisa set WS headers. Mitigation: token short-lived (1hr), wss:// only (encrypted), server validates + extracts on handshake. Sudah di-implement di Phase 4 task 4A-3.                                                                                                                                                                                                                                                                                               | +0 (sudah di task queue) |
| 2     | **TypeScript Type Generation Pipeline**     | **`utoipa` (Rust) → OpenAPI spec → `openapi-typescript` → TS types.** Run di CI setiap `cargo build`. Menggantikan `supabase gen types`. Tambahkan sebagai task paralel di Phase 2 Batch 1.                                                                                                                                                                                                                                                                                                                                                  | +12-20 jam               |
| 3     | **RLS → Middleware Verification Framework** | **RLS Policy Test Matrix:** Setiap dari 748 policies di-convert ke integration test dengan 3 scenarios: allow, deny-wrong-tenant, deny-wrong-role. Script `extract-rls-policies.sh` parse `supabase/migrations/*.sql` dan generate test skeleton. Coverage metric: % policies ter-verify. Gate 3 blocker: ≥90% coverage. **PENTING:** Script ini harus menjadi **deliverable pertama di Phase 2 Batch 1** (SEBELUM mulai port endpoint), bukan paralel. Tanpa framework ini, setiap endpoint yang di-port ke VIL adalah security blind spot. | +30-50 jam               |
| 4     | **DB Schema Rollback Strategy**             | Semua migration scripts punya **up + down**. `public.users` co-exist dengan `auth.users` via sync trigger (sudah di 1B-01). Jika Gate 2 gagal: run rollback script (DROP public.users CASCADE), sync trigger tetap jalan. FK resolution: `profiles.id` tetap FK ke `auth.users.id` selama dual-running.                                                                                                                                                                                                                                      | +8 jam                   |

### 🟡 Gap Signifikan

| **#** | **Gap**                              | **Keputusan**                                                                                                                                                                                                                                                                                                                                                                                                      | **Effort**  |
| ----- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 5     | **Secrets Management**               | **Phase 1A:** `.env` file untuk dev, **Docker secrets** untuk staging/prod. JWT signing key rotation: generate new key, dual-verify (old+new) selama 24h, remove old. Groq/Resend/WhatsApp API keys di Docker secrets, BUKAN env vars di docker-compose.yml.                                                                                                                                                       | +6 jam      |
| 6     | **DNS & Domain Cutover**             | Frontend pakai `VITE_SUPABASE_URL` (hardcoded Supabase project URL). Phase 0: abstract ke `VITE_API_URL`. Phase 1+: VIL di `api.edusync.id`, Supabase di `xxx.supabase.co`. Nginx split: `/api/v1/*` → VIL, `/rest/v1/*` → Supabase (fallback). DNS TTL: 60s saat cutover.                                                                                                                                         | +4 jam      |
| 7     | **External Webhook URL Migration**   | Phase 3: saat port Edge Functions, update webhook URLs di WhatsApp Business API, LTI platform configs. Nginx permanent redirect: `xxx.supabase.co/functions/v1/whatsapp-webhook` → `api.edusync.id/api/v1/webhooks/whatsapp`. Maintain redirect selama 6 bulan post-migration.                                                                                                                                     | +8 jam      |
| 8     | **Migration Health Dashboard**       | **Grafana dashboard** dengan panels: VIL vs Supabase traffic split (%), error rate comparison, p95 latency comparison, data consistency check failures. Data dari VIL Observer `/_vil/metrics` • Supabase logs. Buat di Phase 1A paralel.                                                                                                                                                                          | +12 jam     |
| 9     | **Student Data Compliance (UU PDP)** | **Data residency:** VPS di Indonesia (IDCloudHost/Biznet). **Data Processing Agreement:** wajib dengan cloud provider per UU PDP Pasal 55. **Backup encryption:** `pg_dump` • `gpg` → encrypted S3. **Access audit:** semua privileged operations log ke `activity_logs` (sudah di CC7). **Data deletion:** `DELETE FROM profiles WHERE id = $1` cascade ke semua FK tables. Buat compliance checklist di Phase 0. | +16 jam     |
| 10    | **Feature Development Policy**       | **TIDAK ada feature freeze.** Fitur baru dikembangkan di abstraction layer (`getApiClient()`). Jika fitur butuh Edge Function baru selama Phase 3: build di VIL langsung (bukan Supabase). Bug fixes di existing Edge Functions tetap di Supabase sampai VIL equivalent ready.                                                                                                                                     | +0 (policy) |

### 🟠 Gap Operasional

| **#** | **Gap**                        | **Keputusan**                                                                                                                                                                                                                                                                                    |
| ----- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 11    | **TLS/SSL**                    | Caddy (auto-TLS via Let's Encrypt). WebSocket otomatis wss://. Internal traffic (VIL ↔ PgBouncer) tanpa TLS (same Docker network).                                                                                                                                                               |
| 12    | **Process Supervision**        | Docker `restart: unless-stopped` • `healthcheck` (sudah di 1A-8). OOM: Docker memory limit 4GB + VIL `graceful_shutdown_timeout_secs: 30`. In-flight quiz grading: DLQ catches failed attempts.                                                                                                  |
| 13    | **CI/CD Pipeline**             | `cargo-chef` untuk Docker layer caching (sudah di Dockerfile Phase 1A). GitHub Actions: `cargo test` → `docker build` → push to registry → `docker compose pull && docker compose up -d`. Zero-downtime: health check before traffic switch.                                                     |
| 14    | **Cargo Build Time**           | `sccache` untuk shared compilation cache. Dev: `cargo build` (debug, incremental, ~30s). CI: `cargo build --release` dengan `cargo-chef` cache (~5min after first build). Docker multi-stage: chef → planner → builder → runtime.                                                                |
| 15    | **pg_notify Payload Mismatch** | Trigger functions kirim **truncated row data** dalam JSON (bukan full row). `LEFT(content, 500)` untuk text fields. Frontend **re-fetch via React Query invalidation** setelah notification (bukan rely on payload data). 7KB warning threshold di pg_listener. Sudah di Phase 4 task 4A-5/4A-6. |

### 💡 Rekomendasi Strategis Baru

1. **"Canary Tenant" Strategy** — Per-tenant cutover (bukan per-flow). Satu test school sepenuhnya di VIL, sisanya di Supabase. Lebih realistic karena satu tenant menggunakan semua flows.
2. **Phase 0 sebagai Trial Period** — Jika Phase 0 memakan >14 minggu (40% over estimate) → strong signal total estimate terlalu optimistis. Gunakan Phase 0 velocity sebagai multiplier.
3. **RLS Policy Test Generator** — Script yang parse `supabase/migrations/*.sql`, extract `CREATE POLICY` statements, generate integration test skeleton per policy.
4. **TypeScript Codegen Pipeline** — `utoipa` (Rust) → OpenAPI spec → `openapi-typescript` → TS types. Run di CI, menggantikan `supabase gen types`.

---

## Langkah Pertama (Minggu 1)

---

## 🚨 VIL Deep Dive Gap Analysis v2 — 14 Temuan dari [ROADMAP.md](http://ROADMAP.md) + API Reference

<aside>
🚨

**14 gap ditemukan dari pembacaan mendalam VIL [ROADMAP.md](http://ROADMAP.md), API Reference, dan Server Guide. 4 gap kritis, 6 gap penting, 4 gap minor. Revised total: ~1,116-1,225 jam (~76-80 minggu).**

</aside>

### 🔴 Gap Kritis (Bisa Menggagalkan Migrasi)

| **#** | **Gap**                                                   | **Detail**                                                                                                                                                                                                                     | **Keputusan / Fix**                                                                                                                                                                                                                                                                                                                                         | **Effort**                              |
| ----- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1     | **VIL v0.1.0 — Banyak crate skeleton**                    | `vil_mq_*` masih skeleton. Multi-tenancy ada di Phase 5b (commercial, belum ada). Plan asumsi `TenantGuard` mature — padahal belum diimplementasi.                                                                             | **KEPUTUSAN:** `TenantGuard` 100% custom middleware (sudah di-address di Phase 1C task 1C-01). JANGAN rely pada VIL multi-tenancy. Tambah VIL crate smoke test di Phase 1A-0.                                                                                                                                                                               | +15-20 jam (sudah termasuk di Phase 1C) |
| 2     | **Password Reset / Forgot Password tidak di-plan**        | Phase 1B punya signup, login, OAuth, MFA, email verification — tapi TIDAK ada forgot password flow. Supabase GoTrue punya ini.                                                                                                 | **FIX:** Tambahkan task 1B-13 di Phase 1B: generate reset token, email link, token validation + expiry, new password hashing, rate limiting. Sudah ada di task queue Phase 1B.                                                                                                                                                                              | +8 jam                                  |
| 3     | **`OAuth2Client` VIL vs PKCE Flow**                       | VIL `OAuth2Client` untuk server-to-server OAuth (caching token), BUKAN browser PKCE flow. EduSync butuh redirect-based code exchange + callback handling.                                                                      | **KEPUTUSAN:** JANGAN pakai VIL `OAuth2Client` untuk PKCE. Build custom handler pakai `oauth2` crate + `reqwest` langsung. Task 1B-15 sudah implement ini.                                                                                                                                                                                                  | +0 (sudah di task queue)                |
| 4     | **`vil_trigger_cdc` — Logical Replication tidak di-plan** | Plan menyebut `pg_notify` tapi tidak ada decision matrix per-channel. `vil_trigger_cdc` pakai PostgreSQL logical replication (WAL-based) — lebih reliable tapi butuh setup `wal_level = logical`, replication slot monitoring. | **KEPUTUSAN:** Decision matrix sudah ditambahkan di Phase 4 task queue. Ephemeral channels (notifications, discussions, classroom, builder_presence, group_assignment) → `pg_notify`. Durable channels (builder_content, messaging) → outbox pattern sebagai fallback jika `vil_trigger_cdc` belum ready. Lihat Phase 4 Channel → Delivery Decision Matrix. | +10 jam                                 |

### 🟡 Gap Penting (Bisa Menyebabkan Delay Signifikan)

| **#** | **Gap**                                       | **Detail**                                                                                                                                                | **Keputusan / Fix**                                                                                                                                                                                                                                                                                            | **Effort**               |
| ----- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 5     | **File Upload (Multipart) tidak di-plan**     | VIL pakai `ShmSlice` untuk body — tidak ada multipart extractor. Video upload bisa 100MB+.                                                                | **KEPUTUSAN:** Pakai **presigned URL pattern** (sudah di Phase 5 task 5A-3). Frontend upload langsung ke S3 via presigned URL, VIL hanya generate URL. Untuk kasus yang butuh server-side processing, pakai `axum::extract::Multipart` (VIL built on Axum).                                                    | +5 jam                   |
| 6     | **DB Connection Pooling tidak detail**        | Supabase pakai PgBouncer (transaction pooling). VIL `SqlxPool` default session-level. Pool exhaustion sangat mungkin dengan 5 roles + realtime + workers. | **KEPUTUSAN:** Pakai PgBouncer di depan PostgreSQL (sudah di Docker Compose Phase 1A task 1A-8). Pool config: default 40 koneksi, grading worker pool terpisah max 10. VIL `MultiPoolManager` TIDAK dipakai — terlalu early-stage.                                                                             | +3 jam                   |
| 7     | **CSRF Protection tidak di-plan**             | Supabase handle CSRF via JWT + CORS. VIL punya `CsrfProtection` (double-submit cookie). Setelah migrasi, frontend call VIL langsung — butuh CSRF.         | **FIX:** Tambahkan CSRF setup di Phase 1C task 1C-10. Exempt `/api/webhook`, safe methods (GET, HEAD, OPTIONS). VIL `CsrfProtection` built-in dipakai.                                                                                                                                                         | +4 jam                   |
| 8     | **API Documentation / OpenAPI tidak di-plan** | Supabase auto-generate API docs. Setelah migrasi, 167 RPCs + 22 Edge Functions tanpa docs.                                                                | **DEFERRED:** OpenAPI generation ditambahkan sebagai task paralel di Phase 2-3. Pakai `utoipa` crate (lebih mature dari VIL `OpenApiBuilder`). Prioritas rendah — bisa ditambahkan post-migration.                                                                                                             | +8 jam (paralel)         |
| 9     | **Session Management tidak konsisten**        | Plan menyebut JWT (1hr + 30d refresh) tapi tidak memutuskan: pure JWT atau JWT + server session? Di mana refresh token disimpan? Bagaimana revoke?        | **KEPUTUSAN FINAL:** JWT + refresh token di PostgreSQL `public.refresh_tokens` table (sudah di Phase 1B task 1B-01 migration + 1B-05 session management). Token revocation via `revoke_all_user_sessions()`. Cleanup via cron. JANGAN pakai VIL `SessionManager` — itu cookie-based, bukan yang kita butuhkan. | +0 (sudah di task queue) |
| 10    | **Feature Flags hanya in-memory**             | VIL `FeatureFlags` = in-memory. Server restart = reset. Plan sangat bergantung pada per-flow cutover flags.                                               | **KEPUTUSAN:** Pakai **environment variables** per-flag (`VITE_API_BACKEND`, `VITE_REALTIME_BACKEND`, `VITE_STORAGE_DUAL_WRITE`). Untuk server-side: baca dari env var saat startup + cache. BUKAN VIL `FeatureFlags`. Ini lebih simple dan persisted via `.env` file / Docker env.                            | +2 jam                   |

### 🟢 Gap Minor (Ditangani Saat Implementasi)

| **#** | **Gap**                                | **Keputusan**                                                                                                                                                      |
| ----- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 11    | **`IdempotencyStore` hanya in-memory** | Untuk critical paths (quiz submit): idempotency key di PostgreSQL table (sudah di task 2B-07 `ON CONFLICT` pattern). Untuk non-critical: VIL in-memory acceptable. |
| 12    | **Graceful Shutdown tidak di-plan**    | Tambahkan `graceful_shutdown_timeout_secs: 30` di VIL config. Docker `stop_grace_period: 35s`. SSE connections get 30s drain.                                      |
| 13    | **Content Negotiation bisa salah**     | Force JSON only: semua handler return `Json<T>`. Ignore `Accept` header. VIL `vil_server_format` TIDAK dipakai.                                                    |
| 14    | **Dev Experience tidak di-plan**       | Dual-running: `pnpm dev` (frontend) + `cargo watch -x run` (VIL) + `supabase start` (DB). Tambahkan `Makefile` dengan target `dev-all` yang start ketiganya.       |

### 📊 Revised Effort Summary

| **Item**                                       | **Jam**                              |
| ---------------------------------------------- | ------------------------------------ |
| Previous revised total                         | ~1,030-1,120                         |
| Gap #1: Custom TenantGuard (sudah di Phase 1C) | +0 (included)                        |
| Gap #2: Password Reset                         | +8                                   |
| Gap #4: CDC decision + outbox pattern          | +10                                  |
| Gap #5: Presigned URL multipart                | +5                                   |
| Gap #6: PgBouncer config detail                | +3                                   |
| Gap #7: CSRF Protection                        | +4                                   |
| Gap #8: OpenAPI (paralel)                      | +8                                   |
| Gap #10-14: Minor fixes                        | +5                                   |
| **REVISED TOTAL v2**                           | **~1,073-1,163 jam (~73-78 minggu)** |

### 💡 Rekomendasi Strategis

1. **Pin VIL ke commit hash** (bukan tag — v0.1.0 tag mungkin bergerak). Lock `Cargo.lock`.
2. **VIL crate smoke test** (Phase 1A-0): test `vil_storage_s3`, `vil_ws`, `vil_trigger_cron` secara isolated. Jika >50% skeleton → trigger Axum fallback (Gate 4).
3. **Fallback plan `vil_ws`**: jika room management kurang mature, pakai `axum::extract::WebSocketUpgrade` + custom `WsHub` (sudah di Phase 4 task queue).
4. **Evaluasi `vil_cache`** untuk refresh token store: `RedisCacheBackend` bisa menggantikan custom PostgreSQL store jika perlu.

---

## 🔍 Deep Dive Findings & Agent-Ready Plan

Hasil analisis mendalam codebase mengungkap **10 gap kritis** yang belum ada di plan awal. Baca sebelum mulai:

- **🔍 Gap Analysis** — 10 temuan kritis dari deep dive ke `AuthContext.tsx`, `useSessionManagement.ts`, `useRoleResolution.ts`, `mfaService.ts`, `courseService.ts`
- **🤖 Agent Task Queue Week 1** — 9 task self-contained dengan kode siap copas untuk AI coding agents

Gap terpenting:

1. 🔴 `get_auth_bootstrap` RPC (paling kritis, belum di plan)
2. 🔴 OAuth callback pakai PATH routing (`/auth/callback`), BUKAN hash routing
3. 🟡 ApiClient harus pakai **module-level singleton** (bukan React Context) karena service files bukan hooks
4. 🟡 `AuthContextType` punya 25+ fields yang harus identik di VIL auth
5. 🟡 Proactive token refresh setiap 60 detik (check 5 menit sebelum expiry)

---

<aside>
🚀

**Phase 0A dimulai dengan:**

1. Buat `src/services/api/types.ts` — define QueryResult, InsertResult, etc.
2. Buat `src/services/api/apiClient.ts` — define ApiClient interface
3. Buat `src/services/api/supabaseApiClient.ts` — wrap existing Supabase client
4. Buat `src/services/api/restApiClient.ts` — VIL stub (throw "not implemented")
5. Buat `src/services/api/index.ts` — Barrel export + singleton `setApiClient`/`getApiClient` (initialized di `main.tsx` via `VITE_API_BACKEND` flag)
6. Refactor **full course vertical slice** sebagai proof-of-concept: `courseService.ts` + `templateService.ts` + `versionService.ts` + verify semua query hooks, invalidation, optimistic updates (lihat Spec 2 §2.3 untuk 10-step checklist)
7. Run `pnpm validate` — pastikan zero regressions
8. **Vertical slice courses harus lulus semua criteria di Spec 2 §2.2 sebelum lanjut ke module berikutnya.**
</aside>

## 📋 Phase Detail Documents

[Phase 0: Frontend Abstraction Layer — Week 1-10 Detail](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Phase%200%20Frontend%20Abstraction%20Layer%20%E2%80%94%20Week%201-10%20Det%20b8bf6c6b0ff14370a7e8c8965c6efa01.md)

[Phase 1: VIL Server Scaffold + Auth — Week 11-22 Detail](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Phase%201%20VIL%20Server%20Scaffold%20+%20Auth%20%E2%80%94%20Week%2011-22%20De%2065123c0b728949559ac6e6d61505671e.md)

[Phase 2: Core CRUD Endpoints — Week 23-38 Detail](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Phase%202%20Core%20CRUD%20Endpoints%20%E2%80%94%20Week%2023-38%20Detail%20f0151809ff8944fd870ba84bb0512a09.md)

[Phase 3: Edge Functions → VIL Services — Week 39-52 Detail](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Phase%203%20Edge%20Functions%20%E2%86%92%20VIL%20Services%20%E2%80%94%20Week%2039-52%20df750d8dd2d54365a67d53d4eaea6ad8.md)

[Phase 4-6: Realtime, Storage & Decommission — Week 53-72 Detail](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Phase%204-6%20Realtime,%20Storage%20&%20Decommission%20%E2%80%94%20Week%20%20183a3d06366d4240b34eda79cdb657ba.md)

---

## 📐 Spec Documents (Source of Truth)

[Spec 1: Auth & Session Parity Contract](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Spec%201%20Auth%20&%20Session%20Parity%20Contract%209d46671841b94553a52962dfd09c072c.md)

[Spec 2: Frontend Runtime Compatibility Contract](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Spec%202%20Frontend%20Runtime%20Compatibility%20Contract%20662f7d41ec7f4607a825f104dba69e33.md)

[Spec 3: VIL Runtime, Worker & CI Operations](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Spec%203%20VIL%20Runtime,%20Worker%20&%20CI%20Operations%2003bce3edf2464666a0047fbf1fc29d40.md)

[Spec 4: Infrastructure, Data Layer & Operational Gaps — 15 Temuan Baru](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Spec%204%20Infrastructure,%20Data%20Layer%20&%20Operational%20Ga%2024943c65b9ae46a899bec8829b02f5de.md)

---

## 🔍 Analysis & Reference

[Gap Analysis & Codebase Findings dari Deep Dive](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Gap%20Analysis%20&%20Codebase%20Findings%20dari%20Deep%20Dive%20d1d3a74e25004ea0b168da3a42f47620.md)

[VIL Deep Dive Gap Analysis — 27 Temuan dari API Reference](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/VIL%20Deep%20Dive%20Gap%20Analysis%20%E2%80%94%2027%20Temuan%20dari%20API%20Re%2091cdf325428d4cf6bd6d44c0b69f022f.md)

[Agent Bootstrap Context — VIL Framework Reference untuk EduSync](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Agent%20Bootstrap%20Context%20%E2%80%94%20VIL%20Framework%20Reference%20%20f2f6b969e8c64b6c9bffacaf474d765f.md)

[Full Migration Becomes Possible — Multi-Agent Execution Model](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Full%20Migration%20Becomes%20Possible%20%E2%80%94%20Multi-Agent%20Exec%208b907d086a5042569489e649aca8927f.md)

---

## 🤖 Agent Task Queues

### Phase 0 — Frontend Abstraction

[Agent Task Queue — Phase 0A Week 1 (Kode Siap Copas)](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Agent%20Task%20Queue%20%E2%80%94%20Phase%200A%20Week%201%20(Kode%20Siap%20Copa%2073757d6162304c67b9452ba0088cf01a.md)

[Agent Task Queue — Phase 0A Week 2-4](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Agent%20Task%20Queue%20%E2%80%94%20Phase%200A%20Week%202-4%205d66d1c594bf41f0ace3a07445777b8a.md)

[Agent Task Queue — Phase 0B-0D](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Agent%20Task%20Queue%20%E2%80%94%20Phase%200B-0D%2081752e8cfaaa4765ba909bb7e8003624.md)

### Phase 1 — VIL Server + Auth

[Agent Task Queue — Phase 1A](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Agent%20Task%20Queue%20%E2%80%94%20Phase%201A%202504fed2b25d4aec8d4ce161aa3fffac.md)

[Agent Task Queue — Phase 1B](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Agent%20Task%20Queue%20%E2%80%94%20Phase%201B%20babf8b2b691143d09b505911de3440ff.md)

[Agent Task Queue — Phase 1C-1D](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Agent%20Task%20Queue%20%E2%80%94%20Phase%201C-1D%20000b9a3a5dfd46b68a8e170bcc84dd67.md)

### Phase 2 — Core CRUD Endpoints

[Agent Task Queue — Phase 2 Batch 1](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Agent%20Task%20Queue%20%E2%80%94%20Phase%202%20Batch%201%206a1748e6d5124c069902bb27d5395b9a.md)

[Agent Task Queue — Phase 2 Batch 2](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Agent%20Task%20Queue%20%E2%80%94%20Phase%202%20Batch%202%2077ee54e46f59427abb014e7f54d71f23.md)

[Agent Task Queue — Phase 2 Batch 3-4](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Agent%20Task%20Queue%20%E2%80%94%20Phase%202%20Batch%203-4%20711551bc4f5b45e79cf3cb10348511b5.md)

### Phase 3 — Edge Functions → VIL Services

[Agent Task Queue — Phase 3A-3B](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Agent%20Task%20Queue%20%E2%80%94%20Phase%203A-3B%20c1231c819c2f40a4a1dcb891a4a3f0b8.md)

[Agent Task Queue — Phase 3C-3E](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Agent%20Task%20Queue%20%E2%80%94%20Phase%203C-3E%20d3c8da4ca1e142ac8c93c9b22e1f55a5.md)

### Phase 4–6 — Realtime, Storage, Decommission

[Agent Task Queue — Phase 4](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Agent%20Task%20Queue%20%E2%80%94%20Phase%204%20664f873af1df4507b5f976698ed22971.md)

[Agent Task Queue — Phase 5-6](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Agent%20Task%20Queue%20%E2%80%94%20Phase%205-6%20413bc968b010470798e2a80124cc5e55.md)

---

## 📝 Parallel Session Prompts

[Parallel Session Prompts — Sesi 1-5 (Copy-Paste untuk Notion AI)](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Parallel%20Session%20Prompts%20%E2%80%94%20Sesi%201-5%20(Copy-Paste%20un%20c3bea8a0374b42d9b2620b86fbb367d5.md)

[Parallel Session Prompts — Sesi 6-10 (Copy-Paste untuk Notion AI)](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Parallel%20Session%20Prompts%20%E2%80%94%20Sesi%206-10%20(Copy-Paste%20u%20169b49377b9941989e9f06cfb0eadd0d.md)

[Parallel Session Prompts — Sesi 11-12 (Copy-Paste untuk Notion AI)](Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20/Parallel%20Session%20Prompts%20%E2%80%94%20Sesi%2011-12%20(Copy-Paste%20%2040001ec230ff40fb9e6e7f2479791d44.md)
