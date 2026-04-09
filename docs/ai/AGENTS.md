# EduSync LMS — Agent Configuration

> Quick reference untuk AI coding agents. Baca `CLAUDE.md` untuk instruksi lengkap.
> Baca `docs/README.md` untuk peta dokumentasi lengkap.

---

## Project Identity

| Aspek               | Detail                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| **Tipe**            | Multi-tenant SaaS LMS untuk sekolah Indonesia                                  |
| **Stack**           | React 19, Vite 6, TypeScript 5.8, Tailwind CSS v4, Supabase JS v2              |
| **Backend**         | Supabase-only — tidak ada Express/NestJS. Logic di PostgreSQL + Edge Functions |
| **Package manager** | **pnpm** (bukan npm atau yarn)                                                 |
| **UI language**     | **Bahasa Indonesia** — semua teks user-visible                                 |
| **Routing**         | Hash routing — semua URL pakai `/#/` prefix                                    |
| **Status**          | Production-ready — Phase 30 selesai (2026-04-02)                               |
| **Roles**           | `'student' \| 'teacher' \| 'admin' \| 'parent' \| 'principal'`                 |

---

### Fitur Baru (Phase 26–30)

| Phase | Fitur                                                                                           | Status       |
| ----- | ----------------------------------------------------------------------------------------------- | ------------ |
| 26    | Student UX: Quiz Timer Pause, File Preview, Offline Mode, Deep Link Enrollment                  | ✅ COMPLETED |
| 27    | Teacher UX: Onboarding Wizard, SpeedGrader Annotations, CSV Export, Activity Feed               | ✅ COMPLETED |
| 28    | Admin UX: Bulk User Import, Audit Export, Feature Management, Finance Dashboard                 | ✅ COMPLETED |
| 29    | Parent Portal: OTP Registration, Mobile Dashboard, WhatsApp Digest, Messaging, Monthly Reports  | ✅ COMPLETED |
| 30    | Principal Dashboard: Executive Metrics, Before-After Analytics, Report Generator, Survey System | ✅ COMPLETED |

---

## Critical Rules

### ❌ Jangan Lakukan

- **Gunakan `npm` atau `yarn`** — Project ini menggunakan **pnpm** secara eksklusif
- **Buat tabel tanpa `tenant_id` dan RLS** — Semua tabel baru Wajib memiliki:
  1. `tenant_id UUID NOT NULL` (FK ke `tenants.id`)
  2. RLS ENABLED
  3. Policy: `tenant_id = get_my_tenant_id()`
  4. Trigger: `auto_set_tenant_id()`
- **Gunakan `SELECT *` dalam query** — Selalu tentukan kolom eksplisit untuk performa dan keamanan
- **Buat Edge Function tanpa `auth.uid() IS NULL` check** — Semua RPC/Edge Function baru Wajib:
  1. SECURITY DEFINER dengan `SET search_path TO 'public'`
  2. Auth check: `IF auth.uid() IS NULL THEN RAISE EXCEPTION ...`
  3. Daftar kolom eksplisit (TIDAK pernah `SELECT *`)
- **Gunakan `profile.role` untuk otorisasi** — Role datang dari tabel `user_roles`, BUKAN `profiles.role`. Selalu gunakan `useAuth().role`
- **Buat RPC tanpa tenant-scoping di tabel analytics** — Semua RPC analytics Wajib menerima parameter `p_tenant_id` dan menggunakannya
- **Modifikasi file di luar `src/features/{domain}/api/` untuk Supabase calls** — Selalu gunakan service layer di `features/*/api/`, dengan pengecualian `AuthContext.tsx`
- **Buat komponen tanpa variants `dark:`** — Semua komponen baru Wajib memiliki `dark:` Tailwind variants
- **Tuliskan teks UI dalam Bahasa Inggris** — Semua teks user-visible Wajib Bahasa Indonesia. Tidak ada label, tombol, pesan error, atau header dalam Bahasa Inggris di UI
- **Biarkan koneksi WebSocket tetap aktif** — Dalam upaya mengurangi beban Supabase Free Tier, gunakan polling (bukan WebSocket) untuk fitur realtime
- **Gunakan `localStorage` untuk data penting** — Gunakan `sessionStorage` untuk data bersifat sementara (auto-clear saat tab ditutup)
- **Buat query tanpa pagination pada tabel besar** — Selalu inject `.limit()` ke query tabel yang pertumbuhannya tidak terbatas (misal: `notifications`, `activity_logs`)
- **Modifikasi `.env` dengan kredensial hardcode** — Kredensial untuk development harus sesuai dengan yang tercantum di `CLAUDE.md` bagian Test Accounts
- **Buat dokumentasi setelah setiap task signifikan** — Referensi: `CLAUDE.md §Documentation Policy`

### ✅ Selalu Lakukan

- Gunakan `useAuth()` untuk identitas user: `const { user, profile, role, tenantId } = useAuth()`
- Pastikan semua komponen memiliki `dark:` Tailwind variants
- Tuliskan semua teks user-visible dalam Bahasa Indonesia
- Dokumentasikan setiap perubahan signifikan di file yang relevan di `docs/`
- Tambahkan entri ke `CHANGELOG.md` setelah setiap task signifikan
- Update `docs/DATABASE_ARCHITECTURE.md` jika ada perubahan skema
- Jalankan `pnpm typecheck`, `pnpm lint`, `pnpm build` sebelum pull request
- Ikuti struktur modul fitur standar di `src/features/{domain}/`:
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
  └── README.md       ← Dokumentasi fitur
  ```

---

## Key File Locations

| Apa                     | Di Mana                                                 |
| ----------------------- | ------------------------------------------------------- |
| Supabase client         | `src/services/supabase/client.ts`                       |
| Auth context            | `src/contexts/AuthContext.tsx`                          |
| Tema konteks            | `src/contexts/ThemeContext.tsx`                         |
| Pohon rute              | `src/app/routes.tsx` (mengimpor dari `src/app/routes/`) |
| Konfigurasi navigasi    | `src/shared/config/navigation.ts`                       |
| Registry kunci kueri    | `src/shared/lib/queryKeys.ts`                           |
| Konstanta stale time    | `src/utils/queryConstants.ts`                           |
| Skema bersama (Valibot) | `src/shared/schemas/`                                   |
| Tipe bersama            | `src/shared/types/`                                     |
| Primitif UI             | `src/components/ui/`                                    |
| Modul fitur             | `src/features/` (32 modul)                              |
| Migrasi DB              | `supabase/migrations/`                                  |
| Edge Functions          | `supabase/functions/` (28 fungsi)                       |
| Utilitas aplikasi luas  | `src/utils/`                                            |
| Dokumentasi             | `docs/` (lihat `docs/README.md` untuk peta lengkap)     |

---

## SQL Gotchas

| Kolom/Tabel                   | Keterangan                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `quiz_questions.text`         | Kolom adalah `text`, BUKAN `question_text`                                               |
| `quiz_options.text`           | Kolom adalah `text`, BUKAN `option_text`                                                 |
| `course_modules."order"`      | `"order"` adalah kata yang dipesan SQL, **harus dikutip**                                |
| `lessons."order"`             | Sama, **harus dikutip**                                                                  |
| `courses.status`              | Gunakan `status = 'published'`, BUKAN `is_published` (kolom ini TIDAK ada)               |
| `enrollments.user_id`         | BUKAN `student_id`                                                                       |
| `student_lesson_signals`      | Gunakan: `total_time_spent`, `last_accessed_at`, `latest_quiz_score`                     |
|                               | (bukan `time_spent_seconds`, `last_event_at`, `quiz_avg_score`)                          |
| `courses.status`              | Enum meliputi `'in_review'` dan `'approved'` (ditambahkan oleh migrasi `20260324160000`) |
| `course_collaborators` table  | Menggunakan `auto_set_tenant_id()` trigger — BUKAN `set_tenant_id_from_user()`           |
| Fungsi trigger auto-is tenant | `auto_set_tenant_id()` — **selalu gunakan ini untuk tabel baru**                         |

---

## Auth Gotchas

| Masalah                            | Penjelasan                                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `.test` TLD emails gagal           | GoTrue menolak `.test` TLD — gunakan `.dev` atau domain nyata untuk akun test                              |
| React controlled inputs            | Form login tidak dapat diisi secara terprogram — membutuhkan event keyboard                                |
| `signOut()` harus clear state dulu | Harus membersihkan React state SEBELUM memanggil `supabase.auth.signOut()` (mencegah spinner tak terbatas) |
| `.env` untuk development           | Lihat bagian Test Accounts di `CLAUDE.md` untuk kredensial yang valid                                      |

---

## Routing Gotchas

| Masalah                       | Penjelasan                                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `RoleRoute` untuk leaderboard | Harus mencakup kedua `student` dan `teacher`: `role={["student","teacher"]}` (bukan hanya `role="student"`) |

---

## Dokumentasi Kebijakan

Setelah **APAPUN task signifikan**:

1.  Update file yang relevan di `docs/`
2.  Jika membuat modul fitur baru → buat `README.md` di dalamnya
3.  Jika menghapus fitur atau file → hapus dokumentasinya
4.  Tambahkan entri ke `CHANGELOG.md`
5.  Update `docs/DATABASE_ARCHITECTURE.md` jika ada perubahan skema

Referensi: `CLAUDE.md §Documentation Policy`

---

## Edge Functions

Semua Edge Functions berada di `supabase/functions/`. Setiap fungsi mandiri (tidak berbagi modul). Gunakan `Deno.serve`, `jsr:` imports, dan helper CORS/response standar.

| Fungsi                      | Tujuan                                          | Auth                          |
| --------------------------- | ----------------------------------------------- | ----------------------------- |
| `ai-grade-essay`            | AI essay grading via Groq                       | User JWT                      |
| `ai-tutor`                  | AI tutor chat                                   | User JWT                      |
| `generate-ai-content`       | AI content generation                           | User JWT                      |
| `generate-pdf`              | PDF certificate generation                      | User JWT                      |
| `grade-quiz-attempt`        | Background quiz grading                         | Service role                  |
| `health-check`              | System health status                            | None (public)                 |
| `load-quiz-data`            | Load quiz for student                           | User JWT                      |
| `process-progress-events`   | Batch progress event processing                 | API key                       |
| `progress-events`           | Enqueue progress events                         | User JWT                      |
| `send-email-digest`         | Email digest sender                             | Service role                  |
| `send-push`                 | Push notification sender                        | User JWT                      |
| `lti-jwks`                  | Public JWKS for LTI platforms                   | None (public GET)             |
| `lti-oidc-login`            | LTI OIDC login initiation                       | None (platform-initiated)     |
| `lti-launch`                | LTI launch token validation + user provisioning | None (validates LTI id_token) |
| `scorm-extract`             | SCORM ZIP upload, validation, extraction        | User JWT (teacher/admin)      |
| `generate-executive-report` | Executive report generation                     | Service role                  |
| `generate-parent-report`    | Parent report generation                        | Service role                  |
| `bulk-import-users`         | Bulk user import                                | Service role                  |
| `check-rate-limit`          | Rate limiting check                             | Service role                  |
| `send-parent-digest`        | Parent digest sending                           | Service role                  |
| `send-parent-otp`           | Parent OTP sending                              | Service role                  |
| `whatsapp-webhook`          | WhatsApp webhook handler                        | Service role                  |

---

## Test Accounts (Shared Dev Project)

| Email                 | Password      | Role    |
| --------------------- | ------------- | ------- |
| `teacher@edusync.dev` | `password123` | TEACHER |
| `student@edusync.dev` | `password123` | STUDENT |
| `admin@edusync.dev`   | `password123` | ADMIN   |

Dev app: `http://localhost:5173` (setelah `pnpm dev`)
