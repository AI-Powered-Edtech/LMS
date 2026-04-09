# EduSync LMS — Developer Experience Guide & Docs Map

> Pintu masuk tunggal untuk developer baru. Gunakan file ini untuk navigasi semua dokumentasi project.
>
> Last updated: 2026-04-03

---

## Start Here — 5 Menit Pertama

| Anda sedang…                    | Baca ini                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Setup project baru / onboarding | [docs/SETUP_GUIDE.md](SETUP_GUIDE.md)                                                           |
| Memahami arsitektur sistem      | [docs/ARCHITECTURE.md](ARCHITECTURE.md)                                                         |
| Menambah fitur baru             | [docs/ARCHITECTURE.md §Feature Module](ARCHITECTURE.md) + [CONTRIBUTING.md](../CONTRIBUTING.md) |
| Debug masalah umum              | [docs/DEVELOPER_RUNBOOK.md §Common Issues](DEVELOPER_RUNBOOK.md)                                |
| Perubahan database / migration  | [docs/DATABASE.md](DATABASE.md)                                                                 |
| Memahami model keamanan & RLS   | [docs/SECURITY.md](SECURITY.md) + [docs/RLS_POLICIES.md](RLS_POLICIES.md)                       |
| Menulis unit/E2E tests          | [docs/TESTING.md](TESTING.md)                                                                   |
| Deploy ke produksi              | [docs/DEPLOYMENT.md](DEPLOYMENT.md)                                                             |
| Memahami analytics & gamifikasi | [docs/ANALYTICS.md](ANALYTICS.md) + [docs/GAMIFICATION.md](GAMIFICATION.md)                     |
| Lihat status roadmap fitur      | [docs/ENGINEERING_ROADMAP.md](ENGINEERING_ROADMAP.md)                                           |

---

## Documentation Map

### 🚀 Getting Started

| File                          | Deskripsi                                                    |
| ----------------------------- | ------------------------------------------------------------ |
| `README.md`                   | Overview proyek, quick start, project structure              |
| `docs/SETUP_GUIDE.md`         | Setup lengkap untuk Supabase project baru, seed, env vars    |
| `docs/DEVELOPER_RUNBOOK.md`   | Daily workflows, debug recipes, known issues & fixes         |
| `CONTRIBUTING.md`             | Contribution guide, code conventions, pre-merge checklist    |
| `CHANGELOG.md`                | Riwayat semua perubahan per phase (Phase A → Phase 30)       |
| `docs/ENGINEERING_ROADMAP.md` | Status semua phase, current: **Phase 30 ✅** (selesai semua) |

---

### 🏗 Architecture

| File                                             | Deskripsi                                                       |
| ------------------------------------------------ | --------------------------------------------------------------- |
| `docs/ARCHITECTURE.md`                           | Tech stack, routing, state management, feature module structure |
| `docs/TENANT_ARCHITECTURE.md`                    | Multi-tenant isolation model (how RLS + tenant_id works)        |
| `docs/DATA_FLOW.md`                              | Data flow diagrams end-to-end                                   |
| `docs/SYSTEM_MAP.md`                             | High-level system overview map                                  |
| `docs/architecture/DOMAIN_MAP.md`                | Domain mapping (academic, assessment, analytics, etc.)          |
| `docs/architecture/FRONTEND_APP_ARCHITECTURE.md` | Frontend app architecture detail                                |
| `docs/architecture/DATA_FLOW_ARCHITECTURE.md`    | Detailed data flow architecture                                 |
| `docs/adr/`                                      | Architecture Decision Records (ADR-001 to ADR-004)              |

---

### 🗄 Database

| File                            | Deskripsi                                    |
| ------------------------------- | -------------------------------------------- |
| `docs/DATABASE.md`              | Schema reference — tabel, kolom, RPC catalog |
| `docs/DATABASE_ARCHITECTURE.md` | Database architecture detail                 |
| `docs/RLS_POLICIES.md`          | Row-Level Security policy catalog per tabel  |
| `docs/schema-erd.md`            | Entity-Relationship Diagram                  |

**Migrasi aktif:** `supabase/migrations/` (259+ file, dimulai dari `000_baseline.sql`)
**Arsip migrasi:** `supabase/migrations/_archive/` (file individual, referensi saja)

---

### 🔐 Security & Auth

| File                            | Deskripsi                                                  |
| ------------------------------- | ---------------------------------------------------------- |
| `docs/AUTH.md`                  | Auth flow — session, JWT, GoTrue, custom access token hook |
| `docs/AUTH_SETUP_GUIDE.md`      | Langkah konfigurasi auth dari awal                         |
| `docs/SECURITY.md`              | Security model, CSP, threat mitigations, Sentry hardening  |
| `docs/RLS_POLICIES.md`          | Katalog lengkap semua RLS policy                           |
| `docs/rbac-matrix.md`           | Role-Based Access Control matrix per fitur                 |
| `docs/TENANT_SECURITY_AUDIT.md` | Hasil audit keamanan tenant isolation                      |
| `docs/owasp-assessment.md`      | OWASP Top 10 assessment                                    |
| `docs/security-audit.md`        | Security audit report                                      |

---

### 📊 Features & Domains

| File                     | Deskripsi                                              |
| ------------------------ | ------------------------------------------------------ |
| `docs/ANALYTICS.md`      | Analytics system — teacher dashboard, RPCs, events     |
| `docs/GAMIFICATION.md`   | XP, badges, leaderboard v2, streaks                    |
| `docs/FEATURE_MATRIX.md` | Feature access matrix per role (student/teacher/admin) |
| `docs/USERFLOW.md`       | User journey flows                                     |
| `docs/features/`         | 25 file dokumentasi per feature (satu per domain)      |
| `docs/prd/`              | Product Requirements Documents per feature (27 file)   |

**Feature README files** juga tersedia di setiap `src/features/{domain}/README.md`.

---

### 🧪 Testing

| File              | Deskripsi                                                 |
| ----------------- | --------------------------------------------------------- |
| `docs/TESTING.md` | Test accounts, unit + E2E guide, coverage matrix 24 flows |

**Test files:**

- Unit: `src/**/__tests__/*.test.ts(x)` — Vitest
- E2E: `e2e/flows24/*.spec.ts` — Playwright (24 flows + cross-cutting)

---

### 🚢 Operations & Deployment

| File                        | Deskripsi                                    |
| --------------------------- | -------------------------------------------- |
| `docs/deploy-checklist.md`  | Pre-deploy checklist                         |
| `docs/environments.md`      | Environment configuration (dev/staging/prod) |
| `docs/upgrade-guide.md`     | Dependency upgrade strategy                  |
| `docs/DISASTER_RECOVERY.md` | RPO/RTO, PITR, rollback procedures           |
| `docs/incident-runbook.md`  | Incident response runbook                    |

---

### 📐 UX / Design System

| File                                   | Deskripsi                                        |
| -------------------------------------- | ------------------------------------------------ |
| `docs/ux/UX_BLUEPRINT.md`              | UX design blueprint                              |
| `docs/ux/USER_FLOWS.md`                | User journey flows per role                      |
| `docs/ux/SCREEN_SPECS.md`              | Screen specifications                            |
| `docs/ux/UI_COMPONENT_ARCHITECTURE.md` | UI component architecture                        |
| `docs/design-system.md`                | Design system (tokens, typography, colors)       |
| `docs/COMPONENT_LIBRARY.md`            | UI component catalog (from `src/components/ui/`) |
| `docs/ACCESSIBILITY.md`                | Accessibility guidelines dan implementasi        |

---

### 📋 Planning & Strategy

| File                          | Deskripsi                                             |
| ----------------------------- | ----------------------------------------------------- |
| `docs/ENGINEERING_ROADMAP.md` | Engineering phase roadmap                             |
| `plans/`                      | Implementation plans per feature                      |
| `strategy/`                   | Business strategy docs (model, personas, competitive) |
| `docs/adr/`                   | Architecture Decision Records                         |

---

## Archived Documentation

File-file berikut telah dipindahkan ke `docs/_archive/` karena duplikat, outdated, atau sudah selesai:

| File                               | Alasan                                                           |
| ---------------------------------- | ---------------------------------------------------------------- |
| `DATA_FLOW.md`                     | Boilerplate generik, sudah tercakup di ARCHITECTURE.md           |
| `architecture/README.md`           | Konten sudah ada di ARCHITECTURE.md + SETUP_GUIDE.md             |
| `security-audit.md`                | Snapshot `npm audit` satu waktu                                  |
| `security-pentest.md`              | Outdated Phase 3 assessment, superseded oleh owasp-assessment.md |
| `PERFORMANCE.md`                   | Template tanpa data aktual                                       |
| `DEPLOYMENT.md`                    | 17 baris, target Puter.com sudah obsolete                        |
| `INFRA_SETUP.md`                   | Overlap dengan environments.md + SETUP_GUIDE.md                  |
| `GAP_ANALYSIS.md`                  | Phase-specific gap tracking, seharusnya GitHub issues            |
| `PHASE22_GAP_ANALYSIS.md`          | Phase 22 sudah selesai                                           |
| `features/ANALYTICS.md`            | Auto-generated boilerplate                                       |
| `features/GAMIFICATION.md`         | Auto-generated boilerplate                                       |
| `IMPLEMENTATION_PLAN_REMAINING.md` | Task-level items, seharusnya GitHub issues                       |
| `audit-implementation-plan.md`     | Phase-specific, sudah diimplementasi                             |
| `PR_CLEANUP_PLAN.md`               | Selesai, historis                                                |
| `MODULE_CONSOLIDATION_PLAN.md`     | Analisis selesai, "no action needed"                             |
| `TODO_BILLING.md`                  | TODO list, seharusnya GitHub issue                               |
| `MD_AUDIT_REPORT_2026_FINAL.md`    | Meta-audit dokumentasi, self-referential                         |
| `MIGRATION_GUIDE.md`               | Boilerplate repetitif per fitur                                  |
| `MIGRATION_RESET_GUIDE.md`         | Self-declared outdated                                           |
| `backup-recovery.md`               | Konten fully subsumed oleh DISASTER_RECOVERY.md                  |

---

## Development Tooling

### Package Manager: pnpm

Project ini menggunakan **pnpm**. Jangan gunakan `npm install` atau `yarn`.

```bash
pnpm install           # Install / sync dependencies
pnpm dev               # Dev server → http://localhost:5173
pnpm build             # Production build → dist/
pnpm preview           # Preview production build lokal
pnpm typecheck         # TypeScript check (tsc --noEmit)
pnpm lint              # ESLint (eslint src/)
pnpm format            # Prettier formatter
pnpm test              # Unit tests (Vitest)
pnpm test:e2e          # E2E tests (Playwright)
pnpm storybook         # Storybook component dev (port 6006)
pnpm analyze           # Bundle analyzer → dist/stats.html
pnpm check:circular    # Circular import detector (madge)
pnpm perf:lighthouse   # Lighthouse CI performance audit
pnpm load:smoke        # k6 smoke load test
```

### Quality Gates (wajib lolos sebelum merge)

| Check      | Command                     | Keterangan                   |
| ---------- | --------------------------- | ---------------------------- |
| TypeScript | `pnpm typecheck`            | 0 errors                     |
| Lint       | `pnpm lint`                 | 0 errors                     |
| Build      | `pnpm build`                | Must succeed                 |
| Unit tests | `pnpm test`                 | Coverage threshold terpenuhi |
| E2E (CI)   | `.github/workflows/e2e.yml` | Auto-runs on PR              |

### Pre-commit Hook (Husky + lint-staged)

Berjalan otomatis saat `git commit`:

- ESLint pada staged `.ts/.tsx` files
- Prettier pada staged files

### Tooling Detail

| Tool                  | Purpose                   | Config                                            |
| --------------------- | ------------------------- | ------------------------------------------------- |
| **Vitest**            | Unit testing              | `vitest.config.ts`                                |
| **Playwright**        | E2E testing               | `playwright.config.ts`, `playwright-24.config.ts` |
| **Storybook**         | Component development     | `.storybook/`                                     |
| **Knip**              | Dead code detection       | `knip.json`                                       |
| **Madge**             | Circular dependency check | `pnpm check:circular`                             |
| **Lighthouse CI**     | Performance audit         | `lighthouserc.json`                               |
| **Rollup Visualizer** | Bundle size analysis      | `pnpm analyze`                                    |
| **Sentry**            | Error monitoring          | `src/utils/sentry.ts`                             |

---

## Feature Module Pattern

Setiap fitur baru mengikuti struktur standar di `src/features/{domain}/`:

```
src/features/{domain}/
├── api/            ← Supabase calls (DB queries, RPC, Edge Functions)
├── queries/        ← React Query hooks (useQuery, useMutation)
├── hooks/          ← Custom React hooks (non-query business logic)
├── types/          ← TypeScript interfaces (index.ts)
├── components/     ← React components untuk domain ini
├── store/          ← Zustand store (hanya jika diperlukan — contoh: quizzes)
├── utils/          ← Pure utility functions
├── __tests__/      ← Vitest unit tests
├── index.ts        ← Public barrel export
└── README.md       ← Feature documentation
```

### 32 Feature Modules

| Module            | Domain         | Deskripsi                                          |
| ----------------- | -------------- | -------------------------------------------------- |
| `administration`  | Admin          | Manajemen tenant, konfigurasi modul sekolah        |
| `ai-tutor`        | Learning       | Asisten belajar berbasis AI (Groq llama-3.1-70b)   |
| `analytics`       | Analytics      | Dashboard analitik komprehensif untuk guru & admin |
| `announcements`   | Communication  | Sistem pengumuman sekolah                          |
| `assignments`     | Assessment     | Manajemen tugas dari pembuatan hingga penilaian    |
| `attendance`      | Academic       | Tracking kehadiran siswa                           |
| `auth`            | Identity       | Alur autentikasi                                   |
| `calendar`        | Academic       | Kalender akademik terintegrasi                     |
| `classroom`       | Academic       | Manajemen kelas virtual dan fisik                  |
| `courses`         | Academic       | Course catalog dan course builder                  |
| `creator`         | Content        | AI content generation                              |
| `dashboards`      | Analytics      | Dashboard kustom dengan widget builder             |
| `discussions`     | Communication  | Forum diskusi per kursus                           |
| `gamification`    | Engagement     | XP, badges, level, streak, leaderboard             |
| `gradebook`       | Assessment     | Buku nilai digital, SpeedGrader                    |
| `guidance`        | Admin          | In-app walkthroughs, tooltips, banners             |
| `lessons`         | Learning       | Lesson viewer, Smart Player, SCORM player          |
| `lti`             | Integration    | LTI 1.3 integration                                |
| `moderation`      | Admin          | Moderasi konten user-generated                     |
| `notifications`   | Communication  | Notifikasi in-app + push notifications             |
| `onboarding`      | Admin          | Wizard onboarding untuk pengguna baru              |
| `parent`          | Parent         | Portal orang tua                                   |
| `principal`       | Principal      | Dashboard eksekutif kepala sekolah                 |
| `profile`         | Identity       | Manajemen profil pengguna                          |
| `progress`        | Learning       | Progress tracking per kursus/modul/pelajaran       |
| `question-bank`   | Assessment     | Bank soal yang bisa digunakan ulang                |
| `quizzes`         | Assessment     | Quiz player, grading, anti-cheat, Zustand store    |
| `recommendations` | Learning       | Engine rekomendasi konten                          |
| `reports`         | Analytics      | Generator laporan akademik & keuangan              |
| `settings`        | Identity       | Pengaturan pengguna                                |
| `storage`         | Infrastructure | Manajemen file & media                             |
| `struggle`        | Analytics      | Deteksi otomatis siswa yang kesulitan              |

---

## Authentication & Identity

```tsx
// ✅ Selalu gunakan useAuth() untuk identitas user
const { user, profile, role, tenantId } = useAuth()

// ✅ role values: 'admin' | 'teacher' | 'student' (lowercase)
// Role bersumber dari tabel user_roles, BUKAN profile.role

// ✅ Route protection
<RoleRoute role="teacher">
  <TeacherPage />
</RoleRoute>

// ✅ Multiple roles
<RoleRoute role={["student", "teacher"]}>
  <SharedPage />
</RoleRoute>

// ✅ Guard chain: AuthGuard → TenantGuard → RoleGuard
```

---

## Database Conventions

```sql
-- ✅ Semua tabel baru wajib memiliki:
-- 1. tenant_id UUID NOT NULL (FK ke tenants.id)
-- 2. RLS ENABLED
-- 3. Policy: tenant_id = get_my_tenant_id()
-- 4. Trigger: auto_set_tenant_id()

-- ✅ Semua RPC baru wajib:
-- 1. SECURITY DEFINER dengan SET search_path TO 'public'
-- 2. Auth check: IF auth.uid() IS NULL THEN RAISE EXCEPTION ...
-- 3. Explicit column list (TIDAK pernah SELECT *)

-- ✅ Nama kolom yang sering keliru:
quiz_questions.text           -- BUKAN question_text
quiz_options.text             -- BUKAN option_text
course_modules."order"        -- quoted (SQL reserved word)
lessons."order"               -- quoted (SQL reserved word)
enrollments.user_id           -- BUKAN student_id
courses.status                -- gunakan 'published', BUKAN is_published
student_lesson_signals        -- kolom: total_time_spent, last_accessed_at, latest_quiz_score
```

---

## Routing Conventions

```
Hash routing — semua URL menggunakan /#/ prefix

/#/login                           → Auth
/#/workspace-selector              → Tenant picker
/#/app/student/*                   → Student routes
/#/app/teacher/*                   → Teacher routes
/#/app/admin/*                     → Admin routes
/#/teaching/course-builder         → Course builder (teacher/admin)
/#/teaching/quiz-manager           → Quiz manager (teacher/admin)
/#/analytics                       → Analytics dashboard
/#/gradebook                       → Gradebook
/#/leaderboard                     → Leaderboard (student + teacher)
```

Route files: `src/app/routes/` (split by domain: student, teacher, admin, shared, legacy)

---

## UI Conventions

### Bahasa Indonesia

**Semua teks user-visible wajib Bahasa Indonesia.** Tidak ada English label, button text, error message, atau header di UI. Error dari Supabase (English) harus diterjemahkan via `translateAuthError()`.

### Dark Mode

**Semua komponen baru wajib memiliki `dark:` Tailwind variants.**

```tsx
// ✅ Benar
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">

<div className="bg-white text-gray-900">
```

### `cn()` Utility

```tsx
import { cn } from '@/utils/cn'

// Gabungkan classes secara kondisional
;<div className={cn('base-class', isActive && 'active-class', className)} />
```

### Stale Time Constants

```tsx
import { STALE } from '@/utils/queryConstants'

useQuery({ staleTime: STALE.STATIC }) // 30 menit — tenant config, badges
useQuery({ staleTime: STALE.MODERATE }) // 5 menit — courses, analytics
useQuery({ staleTime: STALE.DYNAMIC }) // 30 detik — calendar, assignments
useQuery({ staleTime: STALE.REALTIME }) // 0 — notifications
```

---

## Edge Functions

23 Deno Edge Functions deployed ke Supabase (`supabase/functions/`):

| Function                    | Purpose                         | Auth                     |
| --------------------------- | ------------------------------- | ------------------------ |
| `ai-tutor`                  | AI chat via Groq                | User JWT                 |
| `ai-grade-essay`            | AI essay grading                | User JWT                 |
| `generate-ai-content`       | AI content generation           | User JWT                 |
| `generate-pdf`              | Certificate PDF generation      | User JWT                 |
| `grade-quiz-attempt`        | Quiz grading pipeline           | Service role             |
| `health-check`              | System health status            | Public                   |
| `load-quiz-data`            | Load quiz data for player       | User JWT                 |
| `process-progress-events`   | Batch progress event processing | API key                  |
| `progress-events`           | Enqueue progress events         | User JWT                 |
| `send-email-digest`         | Email digest sender             | Service role             |
| `send-push`                 | Push notification sender        | User JWT                 |
| `lti-jwks`                  | Public JWKS for LTI             | Public                   |
| `lti-oidc-login`            | LTI OIDC login initiation       | None (platform)          |
| `lti-launch`                | LTI launch token validation     | None (LTI)               |
| `scorm-extract`             | SCORM ZIP extraction            | User JWT (teacher/admin) |
| `generate-executive-report` | Executive report generation     | Service role             |
| `generate-parent-report`    | Parent report generation        | Service role             |
| `bulk-import-users`         | Bulk user import                | Service role             |
| `check-rate-limit`          | Rate limiting check             | Service role             |
| `send-parent-digest`        | Parent digest sending           | Service role             |
| `send-parent-otp`           | Parent OTP sending              | Service role             |
| `whatsapp-webhook`          | WhatsApp webhook handler        | Service role             |

---

## Gotcha Index

| Masalah                         | Penjelasan                                                                   | Referensi                      |
| ------------------------------- | ---------------------------------------------------------------------------- | ------------------------------ |
| `profile.role` undefined        | Role datang dari `user_roles`, bukan `profile.role`                          | `CLAUDE.md`                    |
| Kolom quiz salah                | `quiz_questions.text`, bukan `question_text`                                 | `CLAUDE.md §SQL Gotchas`       |
| `order` column error            | `course_modules."order"` dan `lessons."order"` harus di-quote                | `CLAUDE.md §SQL Gotchas`       |
| `courses.status`                | Gunakan `'published'`, bukan `is_published`                                  | `CLAUDE.md §SQL Gotchas`       |
| `enrollments.user_id`           | Bukan `student_id`                                                           | `CLAUDE.md §SQL Gotchas`       |
| Infinite spinner setelah logout | `signOut()` harus clear state SEBELUM `supabase.auth.signOut()`              | `DEVELOPER_RUNBOOK.md §9`      |
| Email `.test` TLD               | GoTrue menolak `.test` TLD — gunakan `.dev`                                  | `DEVELOPER_RUNBOOK.md §9`      |
| `has_role()` failure            | Gunakan query langsung ke `user_roles`, jangan `has_role()` di analytics RPC | `CLAUDE.md §SQL Gotchas`       |
| LTI nonce RLS                   | `lti_nonces` hanya bisa diakses `service_role`                               | `CLAUDE.md §LTI/SCORM Gotchas` |
| SCORM sticky states             | `completed`/`passed` tidak bisa di-revert                                    | `CLAUDE.md §LTI/SCORM Gotchas` |

---

## Key Source File Locations

| What                     | Where                                                 |
| ------------------------ | ----------------------------------------------------- |
| Supabase client          | `src/services/supabase/client.ts`                     |
| Auth context             | `src/contexts/AuthContext.tsx`                        |
| Theme context            | `src/contexts/ThemeContext.tsx`                       |
| Route tree               | `src/app/routes.tsx` (imports from `src/app/routes/`) |
| Navigation config        | `src/shared/config/navigation.ts`                     |
| Query keys registry      | `src/shared/lib/queryKeys.ts`                         |
| Stale time constants     | `src/utils/queryConstants.ts`                         |
| Shared schemas (Valibot) | `src/shared/schemas/`                                 |
| Shared types             | `src/shared/types/`                                   |
| UI primitives            | `src/components/ui/`                                  |
| Feature modules          | `src/features/` (32 modules)                          |
| DB migrations            | `supabase/migrations/`                                |
| Edge Functions           | `supabase/functions/`                                 |
| App-wide utilities       | `src/utils/`                                          |

---

## Documentation Maintenance Policy

Setelah **setiap task yang signifikan**:

1. Update file yang relevan di `docs/`
2. Jika membuat feature module baru → buat `README.md` di dalamnya
3. Jika menghapus fitur → hapus dokumentasinya
4. Tambahkan entry ke `CHANGELOG.md`
5. Update `docs/DATABASE.md` jika ada perubahan schema

Referensi: `CLAUDE.md §Documentation Policy`
