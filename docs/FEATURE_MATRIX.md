# EduSync LMS — Feature Access Matrix

Matriks akses fitur per role (Student, Teacher, Admin) untuk semua 24 feature module.

## Role Permissions

| Feature         | Student | Teacher       | Admin   | Deskripsi         |
| --------------- | ------- | ------------- | ------- | ----------------- |
| administration  | ✅ Read | ✅ Read/Write | ✅ Full | Administrasi      |
| ai-tutor        | ✅ Read | ✅ Read/Write | ✅ Full | AI Tutor          |
| analytics       | ✅ Read | ✅ Read/Write | ✅ Full | Analitik          |
| announcements   | ✅ Read | ✅ Read/Write | ✅ Full | Pengumuman        |
| assignments     | ✅ Read | ✅ Read/Write | ✅ Full | Tugas             |
| calendar        | ✅ Read | ✅ Read/Write | ✅ Full | Kalender          |
| classroom       | ✅ Read | ✅ Read/Write | ✅ Full | Kelas             |
| courses         | ✅ Read | ✅ Read/Write | ✅ Full | Kursus            |
| dashboards      | ✅ Read | ✅ Read/Write | ✅ Full | Dashboard         |
| discussions     | ✅ Read | ✅ Read/Write | ✅ Full | Diskusi           |
| gamification    | ✅ Read | ✅ Read/Write | ✅ Full | Gamifikasi        |
| gradebook       | ✅ Read | ✅ Read/Write | ✅ Full | Buku Nilai        |
| guidance        | ✅ Read | ✅ Read/Write | ✅ Full | Panduan           |
| lessons         | ✅ Read | ✅ Read/Write | ✅ Full | Pelajaran         |
| moderation      | ✅ Read | ✅ Read/Write | ✅ Full | Moderasi          |
| notifications   | ✅ Read | ✅ Read/Write | ✅ Full | Notifikasi        |
| onboarding      | ✅ Read | ✅ Read/Write | ✅ Full | Onboarding        |
| progress        | ✅ Read | ✅ Read/Write | ✅ Full | Kemajuan Belajar  |
| question-bank   | ✅ Read | ✅ Read/Write | ✅ Full | Bank Soal         |
| quizzes         | ✅ Read | ✅ Read/Write | ✅ Full | Kuis              |
| recommendations | ✅ Read | ✅ Read/Write | ✅ Full | Rekomendasi       |
| reports         | ✅ Read | ✅ Read/Write | ✅ Full | Laporan           |
| storage         | ✅ Read | ✅ Read/Write | ✅ Full | Penyimpanan       |
| struggle        | ✅ Read | ✅ Read/Write | ✅ Full | Deteksi Kesulitan |

## Tenant Isolation

Semua feature di atas memiliki tenant isolation melalui PostgreSQL RLS. Data antar tenant tidak bisa diakses silang.

## Feature Flags

Feature flags dikelola melalui modul **administration** di tabel `tenant_modules`. Admin bisa mengaktifkan/menonaktifkan fitur per tenant.

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
