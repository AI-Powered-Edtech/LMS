# EduSync LMS — Panduan Setup untuk Developer Baru

> Dokumen ini menjelaskan cara setup EduSync LMS di Supabase project milik sendiri.
> Terakhir diperbarui: 2026-03-22

---

## Prasyarat

- **Node.js** ≥ 18 dan **npm** ≥ 9
- **Supabase CLI** ≥ 1.100 (`npm install -g supabase`)
- **Git** (clone repo ini)
- Akun Supabase (gratis cukup untuk development)
- (Opsional) **GROQ API Key** untuk fitur AI Tutor & AI Grading — dapatkan di https://console.groq.com

---

## Langkah 1: Clone & Install Dependencies

```bash
git clone <REPO_URL>
cd LMS
npm install
```

---

## Langkah 2: Buat Supabase Project Baru

1. Buka https://supabase.com/dashboard → **New Project**
2. Pilih region terdekat (Singapore / `ap-southeast-1` untuk Indonesia)
3. Buat password database yang kuat — simpan baik-baik
4. Tunggu project selesai provisioning (~2 menit)
5. Catat **Project Reference ID** (format: `abcdefghijklmnop`) dari URL dashboard

---

## Langkah 3: Enable Extensions (WAJIB SEBELUM MIGRATION)

Buka Supabase Dashboard → **Database** → **Extensions**, lalu aktifkan:

| Extension   | Keterangan                                                    |
| ----------- | ------------------------------------------------------------- |
| `uuid-ossp` | UUID generation (biasanya sudah aktif)                        |
| `pgcrypto`  | Cryptographic functions                                       |
| `pg_cron`   | Scheduled jobs (butuh plan Pro untuk hosted, gratis di local) |
| `pg_net`    | HTTP requests dari database                                   |

> **Catatan:** `pg_cron` dan `pg_net` mungkin hanya tersedia di Supabase Pro plan untuk hosted project. Untuk development lokal (`supabase start`), semua extension tersedia gratis.

---

## Langkah 4: Link CLI ke Project

```bash
supabase link --project-ref <PROJECT_REF>
```

Masukkan password database saat diminta.

---

## Langkah 5: Apply Migration + Seed

### Opsi A: Supabase CLI (DIREKOMENDASIKAN)

```bash
supabase db reset --linked
```

Perintah ini otomatis:

1. Menghapus schema lama
2. Menjalankan `supabase/migrations/000_baseline.sql` (84 tabel, 194 RLS policy, 213 function)
3. Menjalankan `supabase/seed.sql` yang memanggil 4 file seed secara berurutan

### Opsi B: SQL Editor Manual (jika CLI bermasalah)

Jika harus via SQL Editor di Dashboard:

1. **Baseline**: Copy-paste isi `supabase/migrations/000_baseline.sql` ke SQL Editor dan jalankan.
   - ⚠️ File ini ~485KB — jika timeout, split menjadi beberapa bagian.
2. **Seed** (jalankan secara berurutan di SQL Editor):
   - `supabase/seed/seed_base.sql` — data tenant, tahun ajaran, dsb.
   - `supabase/seed/seed_users.sql` — akun test (insert ke `auth.users`, butuh superuser)
   - `supabase/seed/seed_demo.sql` — kursus, modul, lesson demo
   - `supabase/seed/seed_gamification.sql` — badge, XP, leaderboard data

> **PENTING:** File `seed.sql` di root menggunakan `\i` (psql include) sehingga **tidak bisa** dijalankan langsung di SQL Editor. Harus jalankan sub-file satu per satu sesuai urutan di atas.

> **PENTING:** `seed_users.sql` melakukan INSERT langsung ke `auth.users`. Ini hanya bisa dilakukan sebagai superuser (SQL Editor di Dashboard atau `supabase db push`).

---

## Langkah 6: Konfigurasi Custom Access Token Hook (CRITICAL)

Tanpa langkah ini, **seluruh aplikasi tidak bisa berfungsi** karena RLS policy bergantung pada `tenant_id` di JWT claim.

1. Buka Supabase Dashboard → **Authentication** → **Hooks**
2. Cari hook **"Custom Access Token"**
3. Aktifkan dan pilih function: `custom_access_token_hook`
4. Klik **Save**

### Apa yang dilakukan hook ini?

Function `custom_access_token_hook` membaca `tenant_id` dari tabel `profiles` dan meng-inject-nya ke JWT custom claims. Semua RLS policy menggunakan `get_my_tenant_id()` yang membaca claim ini untuk tenant isolation.

---

## Langkah 7: Setup pg_cron Jobs (Opsional)

Baseline migration membuat semua function yang dibutuhkan, tapi **tidak** men-schedule cron jobs. Jika kamu butuh background processing:

```sql
-- Badge + XP + Streak processor (setiap 30 menit)
SELECT cron.schedule(
  'badge-xp-streak-30min',
  '*/30 * * * *',
  $$SELECT check_badge_eligibility(NULL); SELECT process_xp_awards();$$
);
```

> **Catatan:** Sebagian besar fitur analytics dan gamification sekarang berjalan on-demand (trigger-based atau dipanggil dari frontend), sehingga cron job ini opsional. Tanpa cron job, badge eligibility check akan sedikit tertunda tapi tidak mempengaruhi fungsionalitas utama.

---

## Langkah 8: Deploy Edge Functions (Opsional — untuk fitur AI)

Hanya diperlukan jika ingin menggunakan fitur AI Tutor dan AI Grading.

### 8a. Set Secret

```bash
supabase secrets set GROQ_API_KEY=<GROQ_KEY_KAMU> --project-ref <PROJECT_REF>
```

### 8b. Deploy Functions

```bash
# Deploy semua sekaligus
supabase functions deploy ai-tutor --project-ref <PROJECT_REF>
supabase functions deploy ai-grade-essay --project-ref <PROJECT_REF>
supabase functions deploy generate-ai-content --project-ref <PROJECT_REF>
supabase functions deploy grade-quiz-attempt --project-ref <PROJECT_REF>
supabase functions deploy load-quiz-data --project-ref <PROJECT_REF>
supabase functions deploy process-progress-events --project-ref <PROJECT_REF>
supabase functions deploy progress-events --project-ref <PROJECT_REF>
```

### Daftar Edge Functions

| Function                  | Kegunaan                       | Secret Dibutuhkan |
| ------------------------- | ------------------------------ | ----------------- |
| `ai-tutor`                | Chatbot AI untuk siswa         | `GROQ_API_KEY`    |
| `ai-grade-essay`          | Grading essay otomatis         | `GROQ_API_KEY`    |
| `generate-ai-content`     | Generate konten AI untuk guru  | `GROQ_API_KEY`    |
| `grade-quiz-attempt`      | Proses jawaban quiz            | —                 |
| `load-quiz-data`          | Load data quiz untuk player    | —                 |
| `process-progress-events` | Background processing progress | —                 |
| `progress-events`         | Endpoint untuk progress events | —                 |

---

## Langkah 9: Setup Frontend

### 9a. Buat file `.env`

```bash
cp .env.example .env
```

### 9b. Isi variabel

Buka Supabase Dashboard → **Project Settings** → **API**, lalu salin:

```env
# Project URL kamu
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co

# Anon / Public key
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Pre-fill password di Quick Login (hanya untuk dev)
VITE_DEV_PASSWORD=password123
```

### 9c. Jalankan dev server

```bash
npm run dev
```

Buka http://localhost:5173 di browser.

---

## Langkah 10: Verifikasi

Login menggunakan akun test berikut (dibuat oleh seed):

| Email                 | Password      | Role    |
| --------------------- | ------------- | ------- |
| `teacher@edusync.dev` | `password123` | TEACHER |
| `student@edusync.dev` | `password123` | STUDENT |
| `admin@edusync.dev`   | `password123` | ADMIN   |

Halaman login memiliki tombol **DEV QUICK LOGIN** untuk switch antar role dengan cepat.

### Checklist Verifikasi

- [ ] Bisa login sebagai ketiga role
- [ ] Dashboard menampilkan data demo
- [ ] Sidebar menu sesuai role
- [ ] Bisa membuka kursus dan lesson (sebagai student)
- [ ] Bisa melihat analytics (sebagai teacher)

---

## Troubleshooting

### "permission denied for table profiles"

→ Custom Access Token Hook belum diaktifkan. Lihat **Langkah 6**.

### "JWT claim tenant_id is null"

→ User belum punya profile di tabel `profiles`. Pastikan seed berjalan dengan benar.

### "pg_cron extension is not available"

→ `pg_cron` membutuhkan Supabase Pro plan pada hosted project. Untuk development, gunakan `supabase start` (local) yang menyediakan semua extension.

### Login gagal / "Invalid login credentials"

→ Pastikan `seed_users.sql` berhasil dijalankan. Cek apakah user ada di Authentication → Users di Dashboard.

### Edge function error "GROQ_CONFIG_MISSING"

→ Secret belum di-set. Jalankan `supabase secrets set GROQ_API_KEY=<key>`.

### SQL Editor timeout saat apply baseline

→ File `000_baseline.sql` sangat besar (485KB). Gunakan `supabase db reset --linked` via CLI sebagai gantinya.

---

## Development Lokal (Opsional)

Untuk development fully-offline menggunakan Supabase lokal:

```bash
# Start Supabase lokal (Docker harus berjalan)
supabase start

# Ini akan memberikan URL dan keys lokal
# Gunakan di .env:
# VITE_SUPABASE_URL=http://localhost:54321
# VITE_SUPABASE_ANON_KEY=<local-anon-key>

# Reset database lokal (apply migration + seed)
supabase db reset
```

---

## Struktur Folder Supabase

```
supabase/
├── config.toml                 # Konfigurasi Supabase CLI
├── migrations/
│   ├── 000_baseline.sql        # Satu file berisi seluruh schema (squash dari 181 migrasi)
│   └── _archive/               # 181 migrasi individual (arsip referensi, tidak dijalankan)
├── seed.sql                    # Orchestrator — memanggil 4 sub-file via \i
├── seed/
│   ├── seed_base.sql           # Tenant, academic years, classes
│   ├── seed_users.sql          # Auth users + profiles + roles (6 akun)
│   ├── seed_demo.sql           # Courses, modules, lessons, enrollments
│   └── seed_gamification.sql   # Badges, XP config, leaderboard
├── schema_baseline.sql         # Backup/referensi schema (485KB)
└── functions/                  # 7 Deno Edge Functions
    ├── ai-tutor/
    ├── ai-grade-essay/
    ├── generate-ai-content/
    ├── grade-quiz-attempt/
    ├── load-quiz-data/
    ├── process-progress-events/
    └── progress-events/
```

<!-- Phase 5 Feature Cross-Reference -->

## Feature Module Cross-Reference

EduSync LMS terdiri dari 24 feature module yang saling terintegrasi:

| Feature         | Domain         | Deskripsi                                                                                                                  |
| --------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| administration  | Admin          | Administrasi — Manajemen tenant, konfigurasi modul sekolah, sinkronisasi data                                              |
| ai-tutor        | Learning       | AI Tutor — Asisten belajar berbasis AI yang memberikan penjelasan personal kepada siswa                                    |
| analytics       | Analytics      | Analitik — Dashboard analitik komprehensif untuk guru dan admin                                                            |
| announcements   | Communication  | Pengumuman — Sistem pengumuman sekolah                                                                                     |
| assignments     | Assessment     | Tugas — Manajemen tugas dari pembuatan hingga penilaian                                                                    |
| calendar        | Academic       | Kalender — Kalender akademik terintegrasi dengan jadwal pelajaran, ujian, deadline tugas, dan kegiatan sekolah             |
| classroom       | Academic       | Kelas — Manajemen kelas virtual dan fisik                                                                                  |
| courses         | Academic       | Kursus — Core learning module                                                                                              |
| dashboards      | Analytics      | Dashboard — Dashboard kustom dengan widget builder                                                                         |
| discussions     | Communication  | Diskusi — Forum diskusi per kursus                                                                                         |
| gamification    | Engagement     | Gamifikasi — Sistem gamifikasi lengkap: XP, badge, level, streak counter, dan leaderboard                                  |
| gradebook       | Assessment     | Buku Nilai — Buku nilai digital untuk guru                                                                                 |
| guidance        | Admin          | Panduan — Sistem panduan in-app (tooltip, walkthrough, banner, checkpoint)                                                 |
| lessons         | Learning       | Pelajaran — Konten pelajaran dengan block-based editor                                                                     |
| moderation      | Admin          | Moderasi — Moderasi konten user-generated (diskusi, komentar)                                                              |
| notifications   | Communication  | Notifikasi — Sistem notifikasi real-time dengan bell icon dan panel                                                        |
| onboarding      | Admin          | Onboarding — Wizard onboarding untuk pengguna baru                                                                         |
| progress        | Learning       | Kemajuan Belajar — Tracking progress belajar siswa secara granular per kursus, modul, dan pelajaran                        |
| question-bank   | Assessment     | Bank Soal — Repositori soal yang bisa digunakan ulang di berbagai kuis                                                     |
| quizzes         | Assessment     | Kuis — Sistem kuis komprehensif dengan timer, anti-cheat, autosave, review mode, dan analitik hasil per soal               |
| recommendations | Learning       | Rekomendasi — Engine rekomendasi konten berdasarkan progress, performa, dan pola belajar siswa                             |
| reports         | Analytics      | Laporan — Generator laporan akademik, keuangan (SPP), PPDB, dan custom                                                     |
| storage         | Infrastructure | Penyimpanan — Manajemen file dan media untuk materi pembelajaran                                                           |
| struggle        | Analytics      | Deteksi Kesulitan — Deteksi otomatis siswa yang kesulitan berdasarkan pola belajar, waktu per soal, dan penurunan performa |

Setiap feature module mengikuti arsitektur standar dengan folder: api/, queries/, hooks/, types/, components/, dan **tests**/. Semua feature mendukung dark mode dan skeleton loading screens.
