# EduSync LMS — Setup and Deployment Guide

Panduan untuk developer baru yang ingin menjalankan EduSync di Supabase project masing-masing, plus runbook deploy production ke Puter.

---

## Prerequisites

| Tool         | Versi Minimum | Instalasi                |
| ------------ | ------------- | ------------------------ |
| Node.js      | 20+           | https://nodejs.org       |
| Supabase CLI | 1.x           | `npm i -g supabase`      |
| Puter CLI    | terbaru       | sesuai dokumentasi Puter |
| Git          | 2.x           | Sudah ada di macOS/Linux |

---

## Quick Start (5 Langkah)

### 1. Clone & Install

```bash
git clone <repo-url>
cd LMS
pnpm install
```

### 2. Buat Supabase Project

1. Buka https://supabase.com/dashboard → **New Project**
2. Catat:
   - **Project URL**: `https://<REF>.supabase.co`
   - **Anon Key**: dari Project Settings → API
   - **Database Password**: yang kamu set saat buat project

### 3. Setup Environment

```bash
cp .env.example .env
```

Edit `.env` dan isi:

```
VITE_SUPABASE_URL=https://<REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key-kamu>
VITE_DEV_PASSWORD=password123
```

### 4. Push Schema ke Supabase

```bash
# Link CLI ke project kamu
supabase link --project-ref <REF>

# Push semua migrasi
supabase db push --include-all
```

> **Estimasi waktu**: ~2-5 menit tergantung koneksi.
> Migrasi bersifat idempotent — aman dijalankan ulang.

### 5. Enable Extensions & Auth Hook

Di Supabase Dashboard:

1. **Database → Extensions** → enable **`pg_cron`**
2. **Authentication → Hooks** → enable **`custom_access_token_hook`**
   - Pilih function: `custom_access_token_hook`
   - **WAJIB** — tanpa ini, JWT tidak ada tenant_id & role, RLS tidak jalan

---

## Seed Data (Demo Accounts)

Setelah migrasi berhasil, kamu perlu seed data demo agar bisa login dan test.

### Opsi A: Lewat SQL Editor (Recommended)

Buka **Supabase Dashboard → SQL Editor**, lalu jalankan file seed **satu per satu, berurutan**:

1. **`supabase/seed/seed_base.sql`** — Buat tenant "Demo School"
2. **`supabase/seed/seed_users.sql`** — Buat 3 user di auth.users
3. **`supabase/seed/seed_demo.sql`** — Buat courses, quizzes, classes, enrollments

### Opsi B: Lewat Dashboard Manual

Jika Opsi A gagal (misalnya karena permission), buat user secara manual:

1. Buka **Authentication → Users → Add User**
2. Buat 3 akun (centang **"Auto Confirm User"**):

| Email                      | Password      | Role (akan di-assign otomatis) |
| -------------------------- | ------------- | ------------------------------ |
| `teacher@demo.edusync.com` | `password123` | TEACHER                        |
| `student@demo.edusync.com` | `password123` | STUDENT                        |
| `admin@demo.edusync.com`   | `password123` | ADMIN                          |

3. Lalu jalankan **`seed_base.sql`** dan **`seed_demo.sql`** di SQL Editor (skip seed_users.sql).

### Opsi C: Pakai Supabase Local (supabase db reset)

Jika pakai Supabase local development:

```bash
supabase start
supabase db reset
```

`supabase db reset` otomatis menjalankan `supabase/seed.sql` setelah migrasi.

---

## Akun Demo

Setelah seed berhasil:

| Email                      | Password      | Role    |
| -------------------------- | ------------- | ------- |
| `teacher@demo.edusync.com` | `password123` | TEACHER |
| `student@demo.edusync.com` | `password123` | STUDENT |
| `admin@demo.edusync.com`   | `password123` | ADMIN   |

---

## Jalankan Development Server

```bash
pnpm run dev
```

Buka http://localhost:5173 → login dengan salah satu akun demo.

---

## Edge Functions (Opsional)

Edge Functions diperlukan untuk fitur AI (AI Tutor, AI Grading). Jika tidak mengerjakan fitur AI, bisa dilewati.

### Deploy

```bash
# Deploy semua sekaligus
supabase functions deploy --project-ref <REF>
```

Atau satu per satu:

```bash
supabase functions deploy ai-tutor --project-ref <REF>
supabase functions deploy ai-grade-essay --project-ref <REF>
supabase functions deploy generate-ai-content --project-ref <REF>
supabase functions deploy grade-quiz-attempt --project-ref <REF>
supabase functions deploy load-quiz-data --project-ref <REF>
supabase functions deploy progress-events --project-ref <REF>
supabase functions deploy process-progress-events --project-ref <REF>
```

### Set Secrets

```bash
# Groq API key (untuk AI Tutor & AI Grading)
supabase secrets set GROQ_API_KEY=<your-groq-key> --project-ref <REF>
```

> `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, dan `SUPABASE_DB_URL` otomatis tersedia di Edge Functions — tidak perlu di-set manual.

---

## Troubleshooting

### "permission denied for table auth.users" saat seed

**Penyebab**: Supabase hosted tidak mengizinkan direct insert ke `auth.users` dari SQL Editor biasa.

**Solusi**: Buat user lewat Dashboard (Opsi B di atas), lalu jalankan `seed_base.sql` + `seed_demo.sql` saja.

### Login berhasil tapi halaman kosong / infinite loading

**Penyebab**: `custom_access_token_hook` belum di-enable.

**Solusi**: Dashboard → Authentication → Hooks → enable `custom_access_token_hook`.

### RLS error: "new row violates RLS policy"

**Penyebab**: JWT tidak mengandung `tenant_id` claim.

**Solusi**: Sama — pastikan `custom_access_token_hook` aktif. Lalu logout dan login ulang agar JWT baru di-issue.

### "pg_cron extension is not available"

**Penyebab**: Extension belum di-enable.

**Solusi**: Dashboard → Database → Extensions → enable `pg_cron`. Beberapa migrasi membuat cron job; tanpa extension ini migrasi akan gagal.

### Migration error di file tertentu

**Penyebab**: Migrasi sebelumnya mungkin gagal silent.

**Solusi**:

```bash
# Cek status migrasi
supabase migration list --project-ref <REF>

# Jika ada yang stuck, push ulang
supabase db push --include-all --project-ref <REF>
```

### Network ban (terlalu banyak login gagal)

```bash
supabase network-bans remove --project-ref <REF>
```

---

## Checklist Setup Baru

- [ ] Supabase project dibuat
- [ ] `.env` diisi dengan URL dan anon key project kamu
- [ ] `supabase link --project-ref <REF>`
- [ ] `supabase db push --include-all`
- [ ] `pg_cron` extension enabled
- [ ] `custom_access_token_hook` enabled di Auth Hooks
- [ ] Seed data dijalankan (seed_base → seed_users → seed_demo)
- [ ] `pnpm run dev` → login berhasil dengan akun demo
- [ ] (Opsional) Edge Functions deployed + GROQ_API_KEY set

---

## Deploy Production ke Puter

Frontend production EduSync di-host sebagai static site di Puter. Backend production tetap Supabase.

### 1. Pastikan source release bersih

- Deploy hanya dari commit yang sudah siap di branch release/main.
- Jangan deploy dari worktree lokal yang masih punya perubahan belum committed.
- Pastikan migrasi baru yang ikut rilis memang sudah direview.

### 2. Build gate wajib

```bash
pnpm run build
```

Perintah ini adalah gate utama pre-deploy karena sudah menjalankan:

1. `pnpm run typecheck`
2. `pnpm run lint`
3. `pnpm run test:ci`
4. `vite build`

Jika `pnpm run build` gagal, jangan lanjut deploy.

### 3. Frontend environment di Puter

Set environment berikut untuk build production:

```env
VITE_SUPABASE_URL=https://<PROD_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<production-anon-key>
VITE_SENTRY_DSN=<optional-production-dsn>
VITE_VAPID_PUBLIC_KEY=<optional-web-push-public-key>
```

EduSync memakai HashRouter, jadi tidak perlu rewrite khusus di Puter. `index.html` menangani bootstrap dan app menavigasi melalui `/#/`.

### 4. Konfigurasi Supabase production

#### Link CLI dan migrasi

```bash
supabase link --project-ref <PROD_REF>
supabase db push --include-all --project-ref <PROD_REF>
```

Jika release ini membawa migrasi additive seperti `20260408000001_assignments_prd_alignment.sql`, aman push database lebih dulu sebelum frontend.

#### Auth settings wajib

Di Supabase Dashboard:

- **Authentication → URL Configuration**
  - Site URL: `https://app.edusync.id`
  - Redirect URLs:
    - `https://app.edusync.id`
    - `https://app.edusync.id/#/auth/callback`
    - `https://app.edusync.id/#/reset-password`
- **Authentication → Hooks**
  - Pastikan `custom_access_token_hook` tetap aktif

Ini wajib karena OAuth login dan reset password membentuk callback dari `window.location.origin`.

#### Edge Functions

Deploy semua fungsi:

```bash
supabase functions deploy --project-ref <PROD_REF>
```

Set secret minimum berikut:

```bash
supabase secrets set CORS_ORIGIN=https://app.edusync.id --project-ref <PROD_REF>
supabase secrets set APP_URL=https://app.edusync.id --project-ref <PROD_REF>
```

Tambahkan secret fitur hanya bila memang aktif di production:

```bash
supabase secrets set GROQ_API_KEY=<key> --project-ref <PROD_REF>
supabase secrets set LTI_LAUNCH_URL=<url> --project-ref <PROD_REF>
supabase secrets set LTI_RSA_PUBLIC_KEY=<key> --project-ref <PROD_REF>
supabase secrets set VAPID_PRIVATE_KEY=<key> --project-ref <PROD_REF>
supabase secrets set VAPID_SUBJECT=mailto:admin@edusync.id --project-ref <PROD_REF>
supabase secrets set SMTP_FROM=<sender> --project-ref <PROD_REF>
supabase secrets set VIDEO_WEBHOOK_SECRET=<secret> --project-ref <PROD_REF>
supabase secrets set WHATSAPP_WEBHOOK_SECRET=<secret> --project-ref <PROD_REF>
```

`CORS_ORIGIN` wajib karena beberapa Edge Function masih punya fallback origin lama. Tanpa secret ini, request browser dari domain Puter dapat gagal CORS.

### 5. Deploy frontend ke Puter

Gunakan workflow resmi:

```bash
pnpm run deploy:puter
```

Manual upload folder `dist/` hanya dipakai sebagai fallback darurat.

### 6. Domain dan verifikasi

- Hubungkan domain `app.edusync.id` di dashboard Puter
- Pastikan TLS/HTTPS aktif sebelum smoke test
- Verifikasi health endpoint:

```bash
curl -f "https://<PROD_REF>.supabase.co/functions/v1/health-check"
```

### 7. Smoke test production

1. Buka `https://app.edusync.id` di private window
2. Login sebagai student, teacher, dan admin
3. Pastikan dashboard load normal
4. Buka kursus dan kuis
5. Buka gradebook / SpeedGrader
6. Uji deep link `/#/...` lalu refresh browser
7. Jika auth, routing, assignments, atau PWA ikut berubah, jalankan juga `pnpm run test:e2e`

---

## Catatan Arsitektur

- **Hash routing**: Semua URL menggunakan `/#/` prefix. Tidak perlu konfigurasi redirect di server hosting.
- **Multi-tenant**: Setiap row memiliki `tenant_id`. RLS policy memfilter berdasarkan `get_my_tenant_id()` dari JWT.
- **Default tenant**: Migration 825 membuat tenant fallback dengan UUID `00000000-0000-0000-0000-000000000001`. Tenant ini dipakai oleh `handle_new_user()` trigger jika user signup tanpa tenant_id di metadata.
- **Bahasa**: Semua UI dalam Bahasa Indonesia. Jangan pakai label/teks English di frontend.

---

## Alur Kerja Tim

```
Developer baru:
  1. Clone repo
  2. Buat Supabase project sendiri
  3. cp .env.example .env → isi credentials
  4. supabase link + supabase db push --include-all
  5. Seed data
  6. pnpm run dev → mulai develop

Saat ada migrasi baru dari tim:
  1. git pull
  2. supabase db push --include-all
  3. Lanjut develop
```
