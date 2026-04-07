# Kursus (courses)

## Overview

Core learning module. Pembuatan kursus dengan course builder, pengelolaan modul, dan enrollment siswa.

Modul ini merupakan bagian dari arsitektur feature-module EduSync LMS, terletak di `src/features/courses/`. Setiap feature module memiliki struktur standar: api/, queries/, hooks/, types/, components/, dan **tests**/.

## Update Stabilitas (2026-04-05)

- Fallback invalidation di `useTemplates` dan `useCourseVersions` tidak lagi menggunakan tenant key kosong (`''`).
- Saat tenant context tidak tersedia, invalidasi cache memakai `predicate` pada scope query `courses`.

## Domain

**Academic** — Modul ini termasuk dalam domain Academic bersama dengan feature terkait lainnya.

## Arsitektur

```
src/features/courses/
├── api/           # Supabase service layer (query, mutation, RPC calls)
├── queries/       # React Query hooks dengan query keys
├── hooks/         # Custom React hooks untuk state & logic
├── types/         # TypeScript interfaces & type definitions
├── components/    # React components (dark mode + skeleton loading)
└── __tests__/     # Unit tests (vitest + mock supabase)
```

### Interaksi dengan Supabase

Semua data di-query melalui Supabase JS client dengan RLS enforcement. Setiap query menggunakan `tenant_id` untuk isolasi multi-tenant.

### Tenant Isolation

Tabel yang digunakan oleh courses dilindungi oleh RLS policy:

```sql
CREATE POLICY "tenant_isolation" ON courses
  USING (tenant_id = (SELECT get_my_tenant_id()));
```

## Database Tables

- `courses` — Tabel courses untuk Kursus
- `course_modules` — Tabel course modules untuk Kursus
- `enrollments` — Tabel enrollments untuk Kursus

## RPC / Edge Functions

Fungsi-fungsi database yang terkait dengan courses:

- `get_courses_stats()` — Statistik aggregat
- `search_courses()` — Full-text search

## UI Pages

| Route                    | Deskripsi                  | Role    |
| ------------------------ | -------------------------- | ------- |
| `/#/app/student/courses` | Halaman Kursus untuk siswa | Student |
| `/#/app/teacher/courses` | Halaman Kursus untuk guru  | Teacher |
| `/#/app/admin/courses`   | Halaman Kursus untuk admin | Admin   |

## Komponen

- **CoursesSkeleton** — Loading skeleton
- **CoursesCard** — Kartu item
- **CoursesTable** — Tabel data
- **CoursesStats** — Kartu statistik
- **CoursesFilterBar** — Bar pencarian dan filter

## Dependencies

Feature yang di-depend oleh courses:

- **administration** — Administrasi
- **ai-tutor** — AI Tutor
- **analytics** — Analitik
- **announcements** — Pengumuman
- **assignments** — Tugas

Feature yang depend ke courses:

- **calendar** — Kalender
- **classroom** — Kelas
- **dashboards** — Dashboard
- **discussions** — Diskusi
- **gamification** — Gamifikasi

## Known Issues

- Query large dataset perlu pagination (limit 50 per page)
- RLS policy harus di-test setelah setiap schema migration

## Testing

```bash
npx vitest run src/features/courses
```

## Related Features

Semua 24 feature module dalam EduSync LMS yang saling terintegrasi:

- **administration** — Administrasi: Manajemen tenant, konfigurasi modul sekolah, sinkronisasi data
- **ai-tutor** — AI Tutor: Asisten belajar berbasis AI yang memberikan penjelasan personal kepada siswa
- **analytics** — Analitik: Dashboard analitik komprehensif untuk guru dan admin
- **announcements** — Pengumuman: Sistem pengumuman sekolah
- **assignments** — Tugas: Manajemen tugas dari pembuatan hingga penilaian
- **calendar** — Kalender: Kalender akademik terintegrasi dengan jadwal pelajaran, ujian, deadline tugas, dan kegiatan sekolah
- **classroom** — Kelas: Manajemen kelas virtual dan fisik
- **courses** — Kursus: Core learning module
- **dashboards** — Dashboard: Dashboard kustom dengan widget builder
- **discussions** — Diskusi: Forum diskusi per kursus
- **gamification** — Gamifikasi: Sistem gamifikasi lengkap: XP, badge, level, streak counter, dan leaderboard
- **gradebook** — Buku Nilai: Buku nilai digital untuk guru
- **guidance** — Panduan: Sistem panduan in-app (tooltip, walkthrough, banner, checkpoint)
- **lessons** — Pelajaran: Konten pelajaran dengan block-based editor
- **moderation** — Moderasi: Moderasi konten user-generated (diskusi, komentar)
- **notifications** — Notifikasi: Sistem notifikasi real-time dengan bell icon dan panel
- **onboarding** — Onboarding: Wizard onboarding untuk pengguna baru
- **progress** — Kemajuan Belajar: Tracking progress belajar siswa secara granular per kursus, modul, dan pelajaran
- **question-bank** — Bank Soal: Repositori soal yang bisa digunakan ulang di berbagai kuis
- **quizzes** — Kuis: Sistem kuis komprehensif dengan timer, anti-cheat, autosave, review mode, dan analitik hasil per soal
- **recommendations** — Rekomendasi: Engine rekomendasi konten berdasarkan progress, performa, dan pola belajar siswa
- **reports** — Laporan: Generator laporan akademik, keuangan (SPP), PPDB, dan custom
- **storage** — Penyimpanan: Manajemen file dan media untuk materi pembelajaran
- **struggle** — Deteksi Kesulitan: Deteksi otomatis siswa yang kesulitan berdasarkan pola belajar, waktu per soal, dan penurunan performa

## Referensi

- [ARCHITECTURE.md](../ARCHITECTURE.md) — Arsitektur sistem
- [DATABASE.md](../DATABASE.md) — Referensi tabel dan RPC
- [SECURITY.md](../SECURITY.md) — Model keamanan dan RLS
- [AUTH.md](../AUTH.md) — Flow autentikasi
- [TESTING.md](../TESTING.md) — Panduan testing
