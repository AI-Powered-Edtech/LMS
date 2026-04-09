# EduSync LMS — Performance Guide

Panduan performa dan optimasi untuk EduSync LMS.

## Load Time Budget

| Feature         | Target FCP | Target LCP | Bundle Size |
| --------------- | ---------- | ---------- | ----------- |
| administration  | < 1.5s     | < 2.5s     | < 50KB      |
| ai-tutor        | < 1.5s     | < 2.5s     | < 50KB      |
| analytics       | < 1.5s     | < 2.5s     | < 50KB      |
| announcements   | < 1.5s     | < 2.5s     | < 50KB      |
| assignments     | < 1.5s     | < 2.5s     | < 50KB      |
| calendar        | < 1.5s     | < 2.5s     | < 50KB      |
| classroom       | < 1.5s     | < 2.5s     | < 50KB      |
| courses         | < 1.5s     | < 2.5s     | < 50KB      |
| dashboards      | < 1.5s     | < 2.5s     | < 50KB      |
| discussions     | < 1.5s     | < 2.5s     | < 50KB      |
| gamification    | < 1.5s     | < 2.5s     | < 50KB      |
| gradebook       | < 1.5s     | < 2.5s     | < 50KB      |
| guidance        | < 1.5s     | < 2.5s     | < 50KB      |
| lessons         | < 1.5s     | < 2.5s     | < 50KB      |
| moderation      | < 1.5s     | < 2.5s     | < 50KB      |
| notifications   | < 1.5s     | < 2.5s     | < 50KB      |
| onboarding      | < 1.5s     | < 2.5s     | < 50KB      |
| progress        | < 1.5s     | < 2.5s     | < 50KB      |
| question-bank   | < 1.5s     | < 2.5s     | < 50KB      |
| quizzes         | < 1.5s     | < 2.5s     | < 50KB      |
| recommendations | < 1.5s     | < 2.5s     | < 50KB      |
| reports         | < 1.5s     | < 2.5s     | < 50KB      |
| storage         | < 1.5s     | < 2.5s     | < 50KB      |
| struggle        | < 1.5s     | < 2.5s     | < 50KB      |

## Optimization Strategies

### Code Splitting

Setiap feature module di-lazy-load menggunakan React.lazy() dan Suspense. Ini memastikan initial bundle size tetap kecil.

### React Query Caching

Semua feature menggunakan React Query v5 untuk server state management. Query results di-cache dan di-dedupe secara otomatis.

### Pagination

Semua query pada tabel besar menggunakan pagination (limit 50 per page) untuk menghindari memory issues.

## Feature-Specific Optimizations

- **administration**: Menggunakan Administrasi service dengan pagination dan caching
- **ai-tutor**: Menggunakan AI Tutor service dengan pagination dan caching
- **analytics**: Menggunakan Analitik service dengan pagination dan caching
- **announcements**: Menggunakan Pengumuman service dengan pagination dan caching
- **assignments**: Menggunakan Tugas service dengan pagination dan caching
- **calendar**: Menggunakan Kalender service dengan pagination dan caching
- **classroom**: Menggunakan Kelas service dengan pagination dan caching
- **courses**: Menggunakan Kursus service dengan pagination dan caching
- **dashboards**: Menggunakan Dashboard service dengan pagination dan caching
- **discussions**: Menggunakan Diskusi service dengan pagination dan caching
- **gamification**: Menggunakan Gamifikasi service dengan pagination dan caching
- **gradebook**: Menggunakan Buku Nilai service dengan pagination dan caching
- **guidance**: Menggunakan Panduan service dengan pagination dan caching
- **lessons**: Menggunakan Pelajaran service dengan pagination dan caching
- **moderation**: Menggunakan Moderasi service dengan pagination dan caching
- **notifications**: Menggunakan Notifikasi service dengan pagination dan caching
- **onboarding**: Menggunakan Onboarding service dengan pagination dan caching
- **progress**: Menggunakan Kemajuan Belajar service dengan pagination dan caching
- **question-bank**: Menggunakan Bank Soal service dengan pagination dan caching
- **quizzes**: Menggunakan Kuis service dengan pagination dan caching
- **recommendations**: Menggunakan Rekomendasi service dengan pagination dan caching
- **reports**: Menggunakan Laporan service dengan pagination dan caching
- **storage**: Menggunakan Penyimpanan service dengan pagination dan caching
- **struggle**: Menggunakan Deteksi Kesulitan service dengan pagination dan caching

## Production Readiness Audit Optimizations (2026-03-23)

| Optimization                                                                                                           | Impact                                                                        |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `React.memo` on 8 hot components (Card, Badge, Button, EmptyState, Skeleton, LessonSidebar, NotificationPanel, Header) | Eliminates unnecessary re-renders in component trees                          |
| Quiz autosave: N parallel `v1_save_answer` RPCs → single `batch_save_answers` RPC                                      | Reduces network calls from N to 1 per autosave cycle                          |
| KaTeX CSS lazy-loaded via dynamic `import()` in Forum.tsx and AITutorPanel.tsx                                         | Removes ~30KB CSS from initial bundle for non-math pages                      |
| `OptimizedImage` gains `srcSet` + `sizes` props                                                                        | Serves appropriately-sized images per viewport                                |
| `AuthContext` value memoized (`useMemo` + `useCallback`)                                                               | Prevents all `useAuth()` consumers from re-rendering on every provider render |
| TeacherDashboard query invalidation scoped to `['analytics', tenantId]`                                                | Prevents cross-tenant cache thrashing                                         |
| 8 unpaginated queries capped with `.limit()`                                                                           | Prevents OOM on large datasets                                                |
| `logDevError()` replaces `console.error` in 6 high-traffic files                                                       | Zero console noise in production builds                                       |

## Monitoring

Performance monitoring dilakukan melalui modul **analytics** yang mengtrack Core Web Vitals.

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
