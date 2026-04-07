# EduSync Infrastructure Setup

Panduan ini untuk developer yang baru join atau setup ulang Supabase project lokal.

## Prerequisites

- Supabase CLI: `npm install -g supabase`
- Node.js 18+
- `.env.local` berisi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dari project kamu

## Setup (Urutan Wajib)

### 1. Clone & install

```bash
git clone <repo>
cd LMS
npm install
```

### 2. Apply semua migrations

```bash
supabase db push
```

Ini akan apply semua file di `supabase/migrations/` ke Supabase project kamu secara berurutan.

> **Penting:** Setiap developer menggunakan Supabase project ID masing-masing.
> Jangan share project ID tim — gunakan project pribadi untuk development.

### 3. Setup Storage buckets

```bash
supabase db query scripts/setup-storage.sql
```

Ini membuat dua bucket:

- `course-content` — private, untuk video dan file attachment (maks 100 MB)
- `lesson-images` — public CDN, untuk gambar di lesson blocks (maks 10 MB)

Script ini **idempotent** — aman dijalankan berkali-kali.

### 4. Jalankan dev server

```bash
npm run dev
```

---

## Troubleshooting

### "RPC get_lesson_snapshot() tidak ditemukan"

Migration 803 belum diapply. Jalankan:

```bash
supabase db push
```

### Lesson Viewer error / blank

Cek apakah `get_lesson_snapshot` sudah ada di Supabase project kamu:

```bash
supabase db query "SELECT routine_name FROM information_schema.routines WHERE routine_name = 'get_lesson_snapshot';"
```

Jika kosong → jalankan `supabase db push` lagi.

### Storage upload gagal

Pastikan sudah jalankan `scripts/setup-storage.sql`. Cek bucket di Supabase Dashboard → Storage.

---

## Path Konvensi Storage

File diupload ke path `{tenant_id}/{course_id}/{lesson_id}/{block_id}.ext`:

```
course-content/
  <tenant_id>/
    <course_id>/
      <lesson_id>/
        <block_id>.mp4       ← video upload
        <block_id>.pdf       ← file attachment

lesson-images/
  <tenant_id>/
    <course_id>/
      <lesson_id>/
        <block_id>.webp      ← image block
```

---

## Migrations Penting

| File                                   | Konten                                                    |
| -------------------------------------- | --------------------------------------------------------- |
| `001_migration.sql`                    | Schema dasar: lessons, quizzes, assignments, RLS          |
| `801_fix_jwt_tenant_injection.sql`     | JWT tenant security hardening                             |
| `802_teacher_dashboard_results_v1.sql` | Teacher analytics RPCs                                    |
| `803_smart_player_schema.sql`          | Smart Player: block types, RPC snapshot, lesson_snapshots |

<!-- Phase 5 Feature Cross-Reference -->

## Feature Module Cross-Reference

EduSync LMS terdiri dari 49 feature module yang saling terintegrasi:

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
