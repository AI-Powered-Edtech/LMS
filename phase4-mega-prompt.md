# PHASE 4 MEGA PROMPT — Excellence & Production (Queue setelah Phase 3)

> Prompt ini di-queue setelah Phase 3 selesai. Agent WAJIB menghasilkan laporan gabungan Phase 3 + Phase 4 di akhir.
> PENTING: Gunakan `pnpm` (bukan npm). `node_modules/.bin/tsc` (bukan `npx tsc`).

---

Kamu adalah senior full-stack engineer yang melanjutkan pekerjaan dari **Phase 3 (Polish & Optimize)** ke **Phase 4 (Excellence & Production)** untuk EduSync LMS. Baca `CLAUDE.md` di root project untuk konteks lengkap.

## PRASYARAT — VERIFIKASI PHASE 3

Sebelum mulai Phase 4, **verifikasi dulu** bahwa Phase 3 sudah selesai:

```bash
# Quick check Phase 3 deliverables
pnpm build                          # harus sukses
node_modules/.bin/tsc --noEmit      # 0 error
pnpm test --run                     # 0 failure
ls src/components/ui/Toast.tsx       # harus ada (dari Sprint 3.1)
ls src/components/ui/ErrorBoundary.tsx # harus ada (dari Sprint 3.1)
ls src/i18n/                        # harus ada (dari Sprint 3.2)
ls src/utils/webVitals.ts           # harus ada (dari Sprint 3.0)
```

Jika ada yang belum selesai dari Phase 3, **selesaikan dulu** sebelum lanjut Phase 4. Catat apa saja yang perlu diselesaikan di `docs/phase3-carryover.md`.

---

## ATURAN WAJIB (sama dengan Phase 3)

1. **Semua teks UI harus Bahasa Indonesia** — tidak boleh English di UI
2. **Dark mode WAJIB** di semua komponen baru (`dark:` variants)
3. **Setiap sprint diakhiri**: `pnpm build` sukses, `node_modules/.bin/tsc --noEmit` 0 error
4. **pnpm, bukan npm** — semua command pakai `pnpm`
5. **Commit setiap akhir sprint** + update `CHANGELOG.md`
6. **Update `docs/DATABASE.md`** setiap ada migration baru
7. **Semua tabel baru**: RLS enabled, `tenant_id` policy, indexes

---

## SPRINT 4.0 — Feature Completion: Gradebook & Notifications (Day 1-3) 🔴 CRITICAL

### Day 1: Gradebook DB Persistence + Export

**Langkah:**

1. Deep-dive ke semua gradebook-related code: `src/features/reports/`, komponen gradebook yang ada, quiz/assignment grading flows, dan database schema terkait (`quiz_attempts`, `assignment_submissions`, dll).

2. **Migration `supabase/migrations/002_gradebook.sql`:**
   - Tabel `gradebook_entries`:
     - `id` UUID PK default gen_random_uuid()
     - `tenant_id` UUID NOT NULL (FK tenants)
     - `student_id` UUID NOT NULL (FK auth.users)
     - `course_id` UUID NOT NULL (FK courses)
     - `assignment_id` UUID (nullable FK assignments)
     - `quiz_id` UUID (nullable FK quizzes)
     - `score` FLOAT, `max_score` FLOAT
     - `percentage` FLOAT GENERATED ALWAYS AS (CASE WHEN max_score > 0 THEN (score / max_score \* 100) ELSE 0 END) STORED
     - `grade_letter` TEXT
     - `notes` TEXT
     - `graded_by` UUID (FK auth.users), `graded_at` TIMESTAMPTZ
     - `created_at`, `updated_at`
   - Tabel `gradebook_settings`:
     - `id` UUID PK, `tenant_id`, `course_id` UNIQUE
     - `grading_scale` JSONB DEFAULT '{"A": 90, "B": 80, "C": 70, "D": 60, "F": 0}'
     - `weight_quizzes` FLOAT DEFAULT 0.5, `weight_assignments` FLOAT DEFAULT 0.5
   - RLS: teacher lihat grades course mereka, student lihat grades sendiri saja
   - Indexes: `(tenant_id, course_id)`, `(tenant_id, student_id)`, `(course_id, student_id)` UNIQUE constraint per assignment/quiz

3. **Auto-populate dari quiz/assignment submissions:**
   - RPC `sync_gradebook_entries(p_course_id UUID, p_tenant_id UUID)` — pull semua submissions, upsert ke gradebook_entries
   - Trigger pada `quiz_attempts` INSERT/UPDATE → auto-sync ke gradebook
   - Trigger pada `assignment_submissions` INSERT/UPDATE → auto-sync ke gradebook
   - Hitung `grade_letter` berdasarkan `gradebook_settings.grading_scale`

4. **Feature module `src/features/gradebook/`:**
   - `api/gradebookApi.ts` — CRUD untuk entries dan settings
   - `queries/useGradebook.ts` — React Query hooks
   - `types/index.ts` — GradebookEntry, GradebookSettings
   - `index.ts` — barrel export

5. **Gradebook UI:**
   - Teacher page `/app/teacher/gradebook`:
     - Table: siswa (rows) × assignment/quiz (columns) × scores (cells)
     - Inline editing: klik cell → edit score → auto-save
     - Sorting, search, filter
     - Statistik: rata-rata kelas, median, chart distribusi nilai
     - Bulk grade: select multiple → set grade sama
   - Student page `/app/student/grades`:
     - Summary nilai per kursus
     - Detail score per assignment/quiz dengan feedback

6. **Export:**
   - CSV: gunakan PapaParse (sudah di deps)
   - PDF: gunakan `generate-pdf` Edge Function dari Phase 3

**Verifikasi**: Teacher buat quiz → student submit → gradebook auto-populated → teacher edit → export CSV. Build clean.

**Commit**: `feat: gradebook DB persistence with auto-sync, inline editing, export`

---

### Day 2: In-App Notification Center

**Langkah:**

1. **Migration `supabase/migrations/003_notifications.sql`:**
   - Tabel `notifications`:
     - `id` UUID PK, `tenant_id`, `user_id` (recipient)
     - `type` TEXT CHECK: `grade_posted`, `assignment_due`, `quiz_available`, `announcement`, `course_enrolled`, `badge_earned`, `discussion_reply`, `system`
     - `title` TEXT, `body` TEXT, `metadata` JSONB
     - `is_read` BOOLEAN DEFAULT false, `read_at` TIMESTAMPTZ
     - `created_at` TIMESTAMPTZ DEFAULT now()
   - Tabel `notification_preferences`:
     - `id` UUID PK, `tenant_id`, `user_id` UNIQUE
     - `email_enabled` BOOLEAN DEFAULT true, `push_enabled` BOOLEAN DEFAULT false
     - `quiet_hours_start` TIME, `quiet_hours_end` TIME
     - `disabled_types` TEXT[]
   - RLS: user lihat notifikasi sendiri saja
   - Index: `(user_id, is_read, created_at DESC)`

2. **Notification triggers** (DB functions):
   - `on_grade_posted()` — gradebook_entries INSERT → notify student
   - `on_assignment_due_soon()` — perlu cron job (24h sebelum due date)
   - `on_quiz_available()` — quiz status → published → notify enrolled students
   - `on_announcement_created()` — notify semua anggota kelas
   - `on_badge_earned()` — notify student
   - `on_discussion_reply()` — notify thread participants

3. **Realtime subscription** — `src/hooks/useNotifications.ts`:
   - Subscribe Supabase Realtime channel: `notifications:user_id={userId}`
   - New notification → tambah ke local state + show toast + update badge count
   - Mark read → update local state
   - Cleanup on unmount

4. **Notification center UI:**
   - Bell icon di header (semua role):
     - Badge unread count (red dot jika > 0)
     - Click → dropdown panel
     - Setiap notifikasi: icon by type, title, body, relative time, read indicator
     - Click notifikasi → navigate ke halaman relevan
     - "Tandai semua sudah dibaca" button
     - "Lihat semua" → halaman full
   - Halaman `/app/{role}/notifications`:
     - Paginated list, filter: Semua, Belum Dibaca, per Type
     - Panel pengaturan notifikasi

5. **Feature module** — enhance `src/features/notifications/`:
   - `api/notificationApi.ts` — fetch, markRead, markAllRead, updatePreferences
   - `queries/useNotifications.ts` — React Query + Realtime
   - `types/index.ts`
   - `components/NotificationBell.tsx`, `NotificationPanel.tsx`, `NotificationItem.tsx`

**Verifikasi**: Buat announcement → student lihat toast + bell badge → click → navigate ke announcement. Build clean.

**Commit**: `feat: in-app notification center with Realtime, triggers, preferences`

---

### Day 3: Email Digests + Push Notifications

**Langkah:**

1. **Edge Function `supabase/functions/send-email-digest/index.ts`:**
   - Query unread notifications per user (24 jam terakhir)
   - Group by type, generate HTML email summary
   - Kirim via Supabase Auth email (atau Resend jika dikonfigurasi)
   - Tandai notifikasi sebagai `email_sent`
   - Cron: daily jam 8:00 pagi
   - Respect `notification_preferences.email_enabled`

2. **Web Push notifications:**
   - `src/utils/pushNotifications.ts`:
     - Request push permission saat login (opt-in, bukan forced)
     - Register service worker untuk push events
     - Simpan push subscription di `notification_preferences.push_subscription` (JSONB)
   - Edge Function `supabase/functions/send-push/index.ts`:
     - Accept notification payload, kirim via Web Push API
     - Dipanggil oleh notification triggers jika `push_enabled: true`
   - Service worker `push` event handler:
     - Show native notification (title, body, icon)
     - Click → buka app di halaman relevan

3. **Batching + deduplication:**
   - Batch rapid-fire notifications (10 discussion replies → 1 summary)
   - Deduplicate: jangan notify jika sudah ada unread notification tipe+entity sama
   - Rate limit: max 50 notifikasi/jam per user

**Verifikasi**: Teacher post grade → student dapat in-app toast + push notification + besok pagi email digest.

**Commit**: `feat: email digests + web push notifications + batching`

---

## SPRINT 4.1 — Feature Completion: Offline & Onboarding (Day 4-6) 🟠 HIGH

### Day 4: Offline Quiz Mode

**Langkah:**

1. **`src/utils/offlineStorage.ts`** — IndexedDB wrapper:
   - Gunakan `idb` library (lightweight) atau native API
   - Database: `edusync-offline`
   - Object stores: `quiz-cache`, `quiz-answers`, `sync-queue`
   - API: `cacheQuiz()`, `saveAnswer()`, `getPendingSubmissions()`, `clearSynced()`

2. **Offline quiz flow:**
   - Quiz start → cache semua questions + options ke IndexedDB
   - Selama quiz → save tiap jawaban ke IndexedDB (auto-save)
   - Submit:
     - Online → submit langsung ke Supabase, clear cache
     - Offline → simpan di sync-queue, tampilkan badge "Tersimpan offline"
   - `src/hooks/useNetworkStatus.ts` — detect online/offline
   - Banner: "Anda sedang offline — jawaban tersimpan secara lokal"
   - Back online → auto-sync semua pending submissions

3. **Conflict resolution:**
   - Quiz sudah disubmit dari device lain → skip sync, notify user
   - Deadline lewat saat offline → tetap sync, flag `submitted_late: true`
   - Max attempts exceeded → reject sync, notify user

4. **Background sync:**
   - Service worker `sync` event → attempt sync pending submissions
   - `src/utils/backgroundSync.ts` — retry dengan exponential backoff (1s, 5s, 30s, 5min)

**Verifikasi**: Start quiz → go offline (DevTools) → jawab → submit → go online → auto-sync.

**Commit**: `feat: offline quiz mode with IndexedDB, auto-sync, conflict resolution`

---

### Day 5: Self-Serve Tenant Registration + Onboarding

**Langkah:**

1. **Migration `supabase/migrations/004_tenant_onboarding.sql`:**
   - `tenant_invitations`: id, tenant_id, email, role, token UUID UNIQUE, expires_at, accepted_at, invited_by
   - `onboarding_progress`: id, tenant_id, user_id, steps_completed JSONB, completed_at
   - RLS: admin kelola invitations, user lihat onboarding sendiri

2. **Tenant creation flow** — route `/register/organization`:
   - Wizard 4 langkah:
     - Step 1: Info organisasi (nama, tipe: sekolah/universitas/perusahaan, ukuran)
     - Step 2: Akun admin (nama, email, password)
     - Step 3: Konfigurasi awal (timezone, bahasa, skala nilai)
     - Step 4: Undang anggota tim (bulk email input, role assignment)
   - RPC `create_tenant_with_admin(...)` — atomic: buat tenant + admin user + default settings
   - Kirim invite links ke team members

3. **Onboarding checklist** — `src/features/onboarding/`:
   - Overlay/sidebar untuk admin baru:
     - [ ] Buat kursus pertama
     - [ ] Undang guru
     - [ ] Undang siswa (atau buat kelas)
     - [ ] Kustomisasi branding (logo, warna)
     - [ ] Atur skala penilaian
     - [ ] Aktifkan gamifikasi
   - Progress bar (0-100%), dismiss option, "Lanjutkan nanti"
   - Track di tabel `onboarding_progress`

4. **Invite link flow** — route `/invite/{token}`:
   - Validasi token (belum expired, belum dipakai)
   - User sudah ada → tambahkan ke tenant dengan role
   - User baru → register → tambahkan ke tenant

**Verifikasi**: Visit `/register/organization` → wizard → admin dashboard + onboarding → invite teacher → teacher join.

**Commit**: `feat: self-serve tenant registration, invite links, onboarding wizard`

---

### Day 6: Bulk Operations + Feature Flags

**Langkah:**

1. **Bulk operations untuk teacher:**
   - **Bulk grade**: Gradebook page → checkbox column + dropdown "Tindakan Massal" → Set Nilai, Tambah Poin, Tambah Komentar
   - **Bulk enroll**: Upload CSV siswa → `email, role, class_name` → PapaParse parse → validasi → preview → konfirmasi
   - **Bulk assign**: Select multiple siswa → assign quiz/tugas + due date
   - Komponen reusable `src/components/ui/BulkActionBar.tsx`:
     - Muncul saat items selected, count + actions, confirm dialog

2. **Feature flags** — `supabase/migrations/005_feature_flags.sql`:
   - Tabel `feature_flags`: id, flag_name TEXT UNIQUE, enabled BOOLEAN, tenant_ids UUID[], rollout_percentage INT (0-100), metadata JSONB
   - `src/utils/featureFlags.ts`:
     - `isFeatureEnabled(flagName): boolean`
     - Fetch flags saat app init, cache in memory
   - Flags initial: `offline_quiz` (10%), `push_notifications` (opt-in), `ai_tutor_v2` (per-tenant), `gradebook_export_pdf` (all)
   - Admin UI: `/app/admin/feature-flags` — toggle flags per tenant

3. **Bulk RPCs** — migration tambahan:
   - `bulk_enroll_students(emails[], course_id, tenant_id)` — batch INSERT
   - `bulk_update_grades(entries[], tenant_id)` — batch UPDATE
   - `bulk_assign_quiz(student_ids[], quiz_id, due_date)` — batch INSERT

**Verifikasi**: Upload CSV → 20 siswa enrolled → bulk assign quiz → bulk grade. Feature flag toggle works.

**Commit**: `feat: bulk operations (grade, enroll, assign) + feature flag system`

---

## SPRINT 4.2 — Observability & Monitoring (Day 7-9) 🟡 MEDIUM

### Day 7: Sentry + Error Tracking

**Langkah:**

1. `pnpm add @sentry/react` + `pnpm add -D @sentry/vite-plugin`
2. `src/utils/sentry.ts`:
   - `Sentry.init()` dengan: DSN dari env `VITE_SENTRY_DSN`, environment, release dari package.json version
   - `tracesSampleRate: 0.1`, `replaysSessionSampleRate: 0.1`, `replaysOnErrorSampleRate: 1.0`
   - Integrations: browserTracing, replay, reactRouterV7
3. Instrument critical paths: auth failures, Supabase calls, quiz submission breadcrumbs, Smart Player errors, PDF generation failures
4. Source maps: configure `@sentry/vite-plugin` di `vite.config.ts`, upload saat build, JANGAN serve ke browser
5. Update `.env.example`: tambah `VITE_SENTRY_DSN=`

**Verifikasi**: Trigger error intentional → muncul di Sentry dengan source map + breadcrumbs.

**Commit**: `ops: Sentry integration with source maps, session replay, Edge Functions`

---

### Day 8: Production Metrics + Health Dashboard

**Langkah:**

1. **Migration `supabase/migrations/006_metrics.sql`:**
   - Tabel `app_metrics`: id BIGSERIAL, tenant_id, metric_name TEXT, metric_value FLOAT, metadata JSONB, recorded_at TIMESTAMPTZ
   - RLS: only admin
2. **`src/utils/metrics.ts`** — `trackMetric(name, value, metadata?)` fire-and-forget
   - Metrics: quiz.completion_rate, quiz.avg_score, lesson.avg_time_seconds, page.load_time_ms, error.rate, user.daily_active, api.response_time_ms
3. **Admin health dashboard** `/app/admin/system-health`:
   - System Status: API latency, error rate 24h
   - User Activity: DAU/WAU/MAU chart, peak hours heatmap
   - Performance: Web Vitals aggregates
   - Feature Usage: quiz starts/completions, lessons viewed
   - Auto-refresh 60s, color-coded: 🟢 healthy / 🟡 degraded / 🔴 critical
4. **Edge Function `supabase/functions/health-check/index.ts`:**
   - Check DB connection, auth service, storage
   - Return JSON: `{ status: 'healthy', checks: {...}, timestamp }`
   - Public endpoint, no auth

**Commit**: `ops: production metrics, admin health dashboard, uptime endpoint`

---

### Day 9: Backup, Recovery & Incident Runbook

**Langkah:**

1. **`docs/backup-recovery.md`**: automated backups (Supabase Pro), manual pg_dump procedure, recovery steps, monthly test restore, data retention policy
2. **`docs/incident-runbook.md`**: P1-P4 severity levels, response times, 6 common scenarios (DB connection exhausted, RLS blocking, Edge Function timeout, auth token expired, build failure, high error rate), post-incident process
3. **`docs/environments.md`**: production/staging/local setup, `.env.staging` template
4. **`docs/deploy-checklist.md`**: pre-deploy checks, deploy steps, post-deploy smoke test, rollback procedure

**Commit**: `docs: backup/recovery, incident runbook, staging setup, deploy checklist`

---

## SPRINT 4.3 — Load Testing & Security Hardening (Day 10-12) 🟢 MEDIUM

### Day 10: k6 Load Tests

**Langkah:**

1. Buat `tests/load/` directory:
   - `config.js` — shared config (base URL, auth tokens, thresholds)
   - `scenarios/`: auth-flow.js (100 VU), quiz-submission.js (50 VU), smart-player.js (50 VU), gradebook.js (200 students), dashboard.js (100 VU), analytics.js (10k rows)
   - `smoke.js` — 5 VU, 30s
   - `stress.js` — 100 VU, ramp 5min
2. **Thresholds**: auth < 500ms p95, quiz submit < 1s p95, dashboard < 2s p95, gradebook < 3s p95, analytics < 5s p95, error rate < 1%
3. Scripts: `"load:smoke": "k6 run tests/load/smoke.js"`, `"load:stress": "k6 run tests/load/stress.js"`
4. `docs/load-test-results.md` — baseline results, bottlenecks, recommended max concurrent users

**Commit**: `test: k6 load test suite — auth, quiz, dashboard, analytics scenarios`

---

### Day 11: CodeQL + Security Hardening

**Langkah:**

1. **`.github/workflows/codeql.yml`**: trigger push/PR/weekly, language javascript-typescript, block High/Critical
2. **Close OWASP Partial gaps** (dari Phase 2 assessment):
   - A03 Injection: audit semua `.rpc()` calls, pastikan no string interpolation, tambah integration tests
   - A07 Auth: account lockout setelah 5 gagal login (30min cooldown), session timeout 24h inactive, password strength (8+ chars, 1 uppercase, 1 number)
3. **Migration `supabase/migrations/007_auth_hardening.sql`**:
   - `auth_audit_log`: event, user_id, ip_address, user_agent, timestamp
   - `login_attempts`: email, attempts, locked_until
4. **CI additions**: `pnpm audit --audit-level=high`, license check (no GPL in prod)
5. **`docs/security-pentest.md`**: self-assessment per OWASP item, test scenarios (XSS, CSRF, tenant isolation bypass), RLS bypass attempts, results

**Commit**: `sec: CodeQL, OWASP gaps closed, auth hardening, penetration test docs`

---

### Day 12: CI/CD Production Pipeline

**Langkah:**

1. **Enhance CI** `.github/workflows/ci.yml` — tambah jobs:
   - `security`: npm audit + license check (parallel)
   - `bundle-check`: verify chunk sizes < budget
   - `storybook-build`: verify Storybook builds
   - `load-smoke`: k6 smoke test (after e2e)
2. **CD** `.github/workflows/deploy.yml`:
   - Trigger: merge to main
   - Steps: CI pass → build + source maps ke Sentry → Vercel deploy → post-deploy smoke test (curl health endpoint) → notify
   - Rollback on smoke failure
3. **Release** `.github/workflows/release.yml`:
   - On tag `v*`: create GitHub release dengan changelog, auto-generate release notes
4. CI badges di README.md

**Commit**: `ci: production CI/CD pipeline — security, bundle, deploy, release`

---

## SPRINT 4.4 — Final Polish: 10/10 Exit (Day 13-14) 🔵 FINISH

### Day 13: Coverage → 90% + Lint Warnings → 0

**Langkah:**

1. Update `vitest.config.ts` thresholds → 90%
2. Tulis tests untuk SEMUA Phase 4 features:
   - Gradebook CRUD, auto-sync, export
   - Notifications CRUD, Realtime mock
   - Offline storage, sync queue
   - Feature flags, rollout percentage
   - Bulk operations, CSV parsing
   - Metrics tracking
3. Integration tests: gradebook auto-sync flow, notification trigger flow, feature flag evaluation
4. Fix ALL `no-explicit-any` warnings → target < 10 (dari 225)
5. E2E baru: `gradebook.spec.ts`, `notifications.spec.ts`, `onboarding.spec.ts`, `offline-quiz.spec.ts`
6. Target: 90%+ semua thresholds, 400+ total tests, 15+ E2E specs

**Commit**: `test: coverage 90%, lint warnings eliminated, E2E expanded`

---

### Day 14: Final Verification + LAPORAN GABUNGAN PHASE 3 & 4

**INI ADALAH STEP PALING PENTING. Agent WAJIB menyelesaikan ini sebelum selesai.**

**Langkah:**

1. **Full quality gate:**

   ```bash
   pnpm lint                           # 0 errors, < 10 warnings
   pnpm format:check                   # all pass
   node_modules/.bin/tsc --noEmit      # 0 errors
   pnpm test --run                     # 0 failures, 400+ tests
   pnpm test --run --coverage          # 90%+ all thresholds
   pnpm build                          # clean, within budget
   ```

2. **Feature verification** (test manual):
   - Gradebook: quiz → submit → auto-grade → teacher edit → export CSV
   - Notifications: bell unread → click → mark read → preferences
   - Offline quiz: start → airplane → submit → reconnect → synced
   - Tenant onboarding: register org → admin → invite teacher → join
   - Bulk ops: CSV upload 20 siswa → bulk assign → bulk grade
   - Feature flags: toggle → disabled → toggle → enabled

3. **Production readiness check:**
   - PWA installable + service worker active
   - Health endpoint returns 200
   - Sentry configured (DSN in .env.example)

4. **Update semua docs:**
   - `docs/DATABASE.md` — tambah semua tabel baru dari Phase 4 (6 migration)
   - `CHANGELOG.md` — entry Phase 4 lengkap
   - `README.md` — update badges, feature list

---

## 🔴 WAJIB: LAPORAN GABUNGAN PHASE 3 + PHASE 4

**Setelah semua selesai, BUAT FILE `docs/phase3-4-combined-report.md`** dengan format berikut:

```markdown
# EduSync LMS — Laporan Gabungan Phase 3 & Phase 4

Tanggal: [tanggal selesai]
Agent: Claude Code

---

## Ringkasan Eksekutif

[2-3 paragraf: apa yang dicapai, dari skor berapa ke berapa, highlight utama]

---

## Phase 3: Polish & Optimize — Hasil

### Sprint 3.0 — Bundle Surgery & Performance

- [ ] html2canvas + jspdf removed: [YA/TIDAK] — bundle reduction: [X]kB
- [ ] Server-side PDF Edge Function: [STATUS]
- [ ] PWA: installable [YA/TIDAK], service worker [AKTIF/TIDAK]
- [ ] KaTeX lazy-loaded: [YA/TIDAK]
- [ ] Bundle budget: main chunk [X]kB (target < 350kB)
- [ ] Core Web Vitals monitoring: [AKTIF/TIDAK]
- [ ] DB performance indexes: [COMMITTED/TIDAK]

### Sprint 3.1 — UI/UX Foundation

- [ ] Design system tokens: [FILE PATH]
- [ ] UI components enhanced: [JUMLAH] komponen
- [ ] UI components baru: [LIST]
- [ ] Storybook: [JUMLAH] stories, dark mode [YA/TIDAK]

### Sprint 3.2 — Accessibility & Responsiveness

- [ ] Skeleton screens: [JUMLAH] created
- [ ] Error boundaries: [JUMLAH] features wrapped
- [ ] WCAG 2.1 AA: semantic HTML [YA/TIDAK], ARIA [YA/TIDAK], keyboard nav [YA/TIDAK]
- [ ] Responsive: 5 breakpoints verified [YA/TIDAK]
- [ ] i18n infrastructure: [YA/TIDAK], strings extracted: [JUMLAH]

### Sprint 3.3 — Testing & Tech Stack

- [ ] Coverage: [X]% (target 80%)
- [ ] Bundle CI enforcement: [YA/TIDAK]
- [ ] Upgrade docs: [YA/TIDAK]
- [ ] Dependency docs: [YA/TIDAK]

---

## Phase 4: Excellence & Production — Hasil

### Sprint 4.0 — Gradebook & Notifications

- [ ] Gradebook tables + auto-sync: [STATUS]
- [ ] Teacher gradebook UI: inline editing [YA/TIDAK], export [CSV/PDF/BOTH]
- [ ] Student grade view: [STATUS]
- [ ] Notification center: [JUMLAH] trigger types, Realtime [YA/TIDAK]
- [ ] Notification preferences: [STATUS]

### Sprint 4.1 — Offline & Onboarding

- [ ] Offline quiz: IndexedDB [YA/TIDAK], auto-sync [YA/TIDAK], conflict resolution [YA/TIDAK]
- [ ] Tenant registration wizard: [JUMLAH] steps
- [ ] Invite link flow: [STATUS]
- [ ] Onboarding checklist: [JUMLAH] items
- [ ] Bulk operations: grade [YA/TIDAK], enroll CSV [YA/TIDAK], assign [YA/TIDAK]
- [ ] Feature flags: [JUMLAH] flags, admin UI [YA/TIDAK]

### Sprint 4.2 — Observability

- [ ] Sentry: configured [YA/TIDAK], source maps [YA/TIDAK], session replay [YA/TIDAK]
- [ ] Production metrics: [JUMLAH] metrics tracked
- [ ] Health dashboard: [STATUS]
- [ ] Health endpoint: [URL]
- [ ] Backup/recovery docs: [YA/TIDAK]
- [ ] Incident runbook: [YA/TIDAK]

### Sprint 4.3 — Load Testing & Security

- [ ] k6 scenarios: [JUMLAH], smoke pass [YA/TIDAK]
- [ ] CodeQL: [STATUS]
- [ ] OWASP: [X]/10 Protected (target 10/10)
- [ ] Auth hardening: lockout [YA/TIDAK], session timeout [YA/TIDAK]
- [ ] CI/CD: [JUMLAH] CI jobs, CD deploy [YA/TIDAK], release automation [YA/TIDAK]

### Sprint 4.4 — Final Polish

- [ ] Coverage: [X]% (target 90%), [JUMLAH] total tests
- [ ] Lint warnings: [JUMLAH] (target < 10)
- [ ] E2E specs: [JUMLAH] (target 15+)

---

## Migrations Baru

| File                        | Tabel                                   | Keterangan              |
| --------------------------- | --------------------------------------- | ----------------------- |
| 001_performance_indexes.sql | —                                       | Indexes Phase 3         |
| 002_gradebook.sql           | gradebook_entries, gradebook_settings   | Gradebook persistence   |
| 003_notifications.sql       | notifications, notification_preferences | Notification center     |
| 004_tenant_onboarding.sql   | tenant_invitations, onboarding_progress | Self-serve registration |
| 005_feature_flags.sql       | feature_flags                           | Feature flag system     |
| 006_metrics.sql             | app_metrics                             | Production metrics      |
| 007_auth_hardening.sql      | auth_audit_log, login_attempts          | Security hardening      |

## Edge Functions Baru

| Function          | Keterangan                | Secrets                   |
| ----------------- | ------------------------- | ------------------------- |
| generate-pdf      | Server-side PDF (Phase 3) | —                         |
| send-email-digest | Daily notification digest | RESEND_API_KEY (optional) |
| send-push         | Web Push notifications    | VAPID keys                |
| health-check      | Uptime monitoring         | —                         |

## Bundle Size Comparison

| Metric        | Pre-Phase 3 | Post-Phase 3 | Post-Phase 4 |
| ------------- | ----------- | ------------ | ------------ |
| Main chunk    | [X]kB       | [X]kB        | [X]kB        |
| Total initial | [X]kB       | [X]kB        | [X]kB        |
| vendor-pdf    | [X]kB       | REMOVED      | REMOVED      |

## Test Coverage Comparison

| Metric      | Pre-Phase 3 | Post-Phase 3 | Post-Phase 4 |
| ----------- | ----------- | ------------ | ------------ |
| Statements  | [X]%        | [X]%         | [X]%         |
| Branches    | [X]%        | [X]%         | [X]%         |
| Functions   | [X]%        | [X]%         | [X]%         |
| Lines       | [X]%        | [X]%         | [X]%         |
| Total tests | [X]         | [X]          | [X]          |

## Skor Akhir

| Aspek                | Pre-Phase 3 | Post-Phase 3 | Post-Phase 4 |
| -------------------- | ----------- | ------------ | ------------ |
| Performance & Bundle | 7.5         | [X]          | [X]          |
| UI/UX & Frontend     | 8.0         | [X]          | [X]          |
| Tech Stack           | 8.0         | [X]          | [X]          |
| Testing              | 7.5         | [X]          | [X]          |
| Architecture         | 9.5         | [X]          | [X]          |
| Security             | 9.5         | [X]          | [X]          |
| Code Hygiene         | 9.5         | [X]          | [X]          |
| Docs & DevOps        | 9.0         | [X]          | [X]          |
| Database             | 9.0         | [X]          | [X]          |
| Features             | 9.0         | [X]          | [X]          |
| **OVERALL**          | **8.65**    | **[X]**      | **[X]**      |

## Blocker / Known Issues

[List apa saja yang tidak bisa diselesaikan, alasan, dan workaround]

## Rekomendasi untuk Phase 5+

[3-5 rekomendasi berdasarkan pengalaman eksekusi Phase 3-4]
```

**ISI SEMUA [X] dan [STATUS] dengan data aktual.** Jangan ada placeholder yang tersisa.

---

## FINAL COMMIT

```
chore: Phase 4 final verification + combined Phase 3-4 report 🏆
```

Update `CHANGELOG.md` dengan entry Phase 4 lengkap. Pastikan `docs/phase3-4-combined-report.md` ter-commit.
