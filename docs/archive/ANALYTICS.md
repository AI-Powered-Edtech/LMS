# Analitik (analytics)

## Overview

Dashboard analitik komprehensif untuk guru dan admin. Memantau engagement, retention, progress, dan early warning siswa berisiko.

Modul ini merupakan bagian dari arsitektur feature-module EduSync LMS, terletak di `src/features/analytics/`. Setiap feature module memiliki struktur standar: api/, queries/, hooks/, types/, components/, dan **tests**/.

## Domain

**Analytics** — Modul ini termasuk dalam domain Analytics bersama dengan feature terkait lainnya.

## Arsitektur

```
src/features/analytics/
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

Tabel yang digunakan oleh analytics dilindungi oleh RLS policy:

```sql
CREATE POLICY "tenant_isolation" ON analytics_events
  USING (tenant_id = (SELECT get_my_tenant_id()));
```

## Database Tables

- `analytics_events` — Tabel analytics events untuk Analitik
- `engagement_metrics` — Tabel engagement metrics untuk Analitik

## RPC / Edge Functions

Fungsi-fungsi database yang terkait dengan analytics:

- `get_analytics_stats()` — Statistik aggregat
- `search_analytics()` — Full-text search

## UI Pages

| Route                      | Deskripsi                    | Role    |
| -------------------------- | ---------------------------- | ------- |
| `/#/app/student/analytics` | Halaman Analitik untuk siswa | Student |
| `/#/app/teacher/analytics` | Halaman Analitik untuk guru  | Teacher |
| `/#/app/admin/analytics`   | Halaman Analitik untuk admin | Admin   |

## Komponen

- **AnalyticsSkeleton** — Loading skeleton
- **AnalyticsCard** — Kartu item
- **AnalyticsTable** — Tabel data
- **AnalyticsStats** — Kartu statistik
- **AnalyticsFilterBar** — Bar pencarian dan filter

## Dependencies

Feature yang di-depend oleh analytics:

- **administration** — Administrasi
- **ai-tutor** — AI Tutor
- **announcements** — Pengumuman
- **assignments** — Tugas
- **calendar** — Kalender

Feature yang depend ke analytics:

- **classroom** — Kelas
- **courses** — Kursus
- **dashboards** — Dashboard
- **discussions** — Diskusi
- **gamification** — Gamifikasi

## Known Issues

- Query large dataset perlu pagination (limit 50 per page)
- RLS policy harus di-test setelah setiap schema migration

## Testing

```bash
npx vitest run src/features/analytics
```

## Related Features

Semua 49 feature module dalam EduSync LMS yang saling terintegrasi:

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
- [DATABASE_ARCHITECTURE.md](../DATABASE_ARCHITECTURE.md) — Referensi tabel dan RPC
- [SECURITY.md](../SECURITY.md) — Model keamanan dan RLS
- [AUTH.md](../AUTH.md) — Flow autentikasi
- [TESTING.md](../TESTING.md) — Panduan testing
