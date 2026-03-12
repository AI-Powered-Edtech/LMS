# EduSync LMS — Domain Architecture Map

Dokumen ini difokuskan pada pemetaan domain entitas utama EduSync. Untuk detail arsitektur pembelajaran secara keseluruhan, lihat [COURSE_ENGINE_BLUEPRINT.md](./architecture/COURSE_ENGINE_BLUEPRINT.md). Data struktur SQL dapat ditemukan di [DATABASE_SCHEMA.md](./architecture/DATABASE_SCHEMA.md).


## Architecture Principles

1. **Multi-Tenant Security First:** Setiap tabel (kecuali data global sistem) wajib memiliki `tenant_id` dan dilindungi oleh RLS (Row Level Security).
2. **Database-Driven & Precomputed Read (CQRS Lite):** Query frontend menggunakan prinsip \`O(1)\` via tabel consumer/pre-aggregated. Agregasi berat dilarang dilakukan _on-the-fly_ di tabel aktif.
3. **Event Communication (Pub/Sub):** Perubahan dan penyelesaian tugas dilakukan asinkron via `activity_events` (Event Bus) kemudian di-consume oleh Edge Functions/Database Webhooks.
4. **Idempotency & Retry:** Semua interaksi event-based menggunakan flag seperti `processed_gamification_at` untuk mencegah efek ganda akibat pengiriman ulang (retry).

---

## 1. 🏢 Tenant Domain
**Fokus:** Mengelola entitas institusi/organisasi dan isolasi sistem dasar.

| Entity | Purpose | Fitur Penting |
|--------|---------|---------------|
| `tenants` | Data utama sekolah/institusi | `id`, `name`, `slug`, `domain`, `status` |
| `tenant_modules` | Feature toggles per tenant | `tenant_id`, `module_name`, `is_enabled` |
| `tenant_settings` | Konfigurasi tampilan/UI/UX tenant | `tenant_id`, `theme_colors`, `logo_url` |
| `academic_units` | Unit satuan (mis. TK, SD, SMP, SMA) di institusi | `id`, `tenant_id`, `name` |
| `tenant_memberships` | Mapping multi-tenant lintas instruktur/admin | `tenant_id`, `user_id`, `role`, `joined_at` |

---

## 2. 🔐 Identity Domain
**Fokus:** Autentikasi, profil pengguna, dan kontrol izin/role.

| Entity | Purpose | Fitur Penting |
|--------|---------|---------------|
| `users` | Proxy ke Supabase Auth & role primer | `id`, `tenant_id`, `auth_id`, `email`, `role` |
| `roles` | Daftar peran yang tersedia | `id`, `name` (STUDENT, TEACHER, ADMIN, dll) |
| `user_profiles` | Informasi personal dan preferensi | `id`, `tenant_id`, `user_id`, `full_name`, `avatar_url` |
| `user_roles` | _Pivot_ role jika butuh >1 role per user di satu tenant | `tenant_id`, `user_id`, `role_id` |
| `user_sessions` | Device tracking, login history & security audit | `id`, `user_id`, `device_info`, `ip_address`, `last_active_at` |

---

## 3. 🏫 Academic Domain
**Fokus:** Logistik sekolah, penjadwalan, semester, kelas fisik, dan absensi.

| Entity | Purpose | Fitur Penting |
|--------|---------|---------------|
| `academic_terms` | Siklus akademik (Tahun Ajaran/Semester) | `id`, `tenant_id`, `name`, `start_date`, `end_date` |
| `subjects` | Mata pelajaran umum | `id`, `tenant_id`, `name`, `code` |
| `classes` | Kelas tempat KBM berlangsung | `id`, `tenant_id`, `subject_id`, `teacher_id`, `term_id` |
| `class_teachers` | Multi-teacher (asisten guru / co-teacher) per kelas | `tenant_id`, `class_id`, `teacher_id`, `role` |
| `enrollments` | Keanggotaan murid di dalam kelas | `id`, `tenant_id`, `class_id`, `student_id`, `status` |
| `class_schedules` | Jadwal rutinitas mingguan kelas | `id`, `tenant_id`, `class_id`, `day_of_week`, `time` |
| `attendance_sessions`| Absensi master pada hari tertentu | `id`, `tenant_id`, `class_id`, `date`, `teacher_id` |
| `attendance_records` | Data absensi per murid | `id`, `tenant_id`, `session_id`, `student_id`, `status` |
| `class_announcements`| Pengumuman broadcast di level kelas | `id`, `tenant_id`, `class_id`, `author_id`, `content` |

---

## 4. 📚 Learning Domain
**Fokus:** Penyortiran materi, course, modul pembelajaran, dan pelacakan progress dasar.

| Entity | Purpose | Fitur Penting |
|--------|---------|---------------|
| `courses` | Wadah utama sekumpulan materi | `id`, `tenant_id`, `subject_id`, `title`, `description` |
| `course_classes` | Menyambungkan silabus course ke banyak class | `class_id`, `course_id`, `tenant_id` |
| `course_modules` | Hierarki grouping (Bab / Sesi) dari course | `id`, `tenant_id`, `course_id`, `title`, `order_index` |
| `lessons` | Unit materi terkecil (Teks, Video, PDF) | `id`, `tenant_id`, `module_id`, `title`, `type` |
| `lesson_resources` | File/attachment penunjang lesson | `id`, `tenant_id`, `lesson_id`, `file_url` |
| `lesson_comments` | Student notes & teacher feedback spesifik ke materi | `id`, `tenant_id`, `lesson_id`, `user_id`, `content` |

---

## 5. 📝 Assessment Domain
**Fokus:** Sistem evaluasi, penugasan, pengerjaan kuis, dan rubrik penilaian.

| Entity | Purpose | Fitur Penting |
|--------|---------|---------------|
| `assignments` | Definisi tugas yang diberikan guru | `id`, `tenant_id`, `class_id`, `due_date`, `max_score` |
| `rubrics` | Panduan tabel penilaian terstandarisasi untuk guru| `id`, `tenant_id`, `assignment_id`, `title`, `description`|
| `rubric_scores` | Detail nilai per kriteria dari rubrik | `id`, `tenant_id`, `submission_id`, `rubric_id`, `score` |
| `assignment_submissions`| Lembar jawaran/tugas masuk dari murid | `id`, `tenant_id`, `assignment_id`, `student_id`, `status` |
| `assignment_attachments`| File attachment baik buat Soal maupun Jawaban | `id`, `tenant_id`, `file_url` |
| `grades` | Nilai dan feedback guru terhadap submission | `id`, `tenant_id`, `submission_id`, `grader_id`, `score` |
| `quizzes` | Entitas tes pilihan ganda / essai berikat waktu | `id`, `tenant_id`, `class_id`, `time_limit`, `passing_score`|
| `quiz_questions`| Bank detail soal dalam sebuah quiz | `id`, `tenant_id`, `quiz_id`, `question_text`, `type` |
| `quiz_options` | Jawaban / Pilihan Ganda | `id`, `tenant_id`, `question_id`, `option_text`, `is_correct` |
| `quiz_attempts` | Sesi saat murid mulai hingga mengakhiri kuis | `id`, `tenant_id`, `quiz_id`, `student_id`, `score`, `status` |
| `quiz_answers` | Opsi atau teks pengerjaan final per pertanyaan | `id`, `tenant_id`, `attempt_id`, `question_id`, `points` |

---

## 6. ⚡ Activity Domain
**Fokus:** Log kronologis, aliran komunikasi, dan event bus backend.

| Entity | Purpose | Fitur Penting |
|--------|---------|---------------|
| `activity_events` | (Event Bus) Trigger untuk sinkronisasi asinkron | `id`, `tenant_id`, `event_type`, `event_version`, `actor_id`, `payload` |
| `event_processing_logs`| Observability eksekusi dari edge functions / consumers | `id`, `event_id`, `consumer_name`, `status`, `execution_ms`, `error_msg` |
| `activity_logs` | Audit Log kemanan (IP, User Agent, aksi) | `id`, `tenant_id`, `user_id`, `action`, `ip_address` |
| `discussion_forums` | Grup forum diskusi level kelas / course | `id`, `tenant_id`, `class_id`, `title` |
| `discussion_threads`| Topik di dalam forum | `id`, `tenant_id`, `forum_id`, `author_id`, `title` |
| `discussion_posts` | Komentar interaktif antar pengguna dengan balasan | `id`, `tenant_id`, `thread_id`, `parent_post_id`, `content`|
| `notifications` | Precomputed kotak masuk peringatan pengguna UI | `id`, `tenant_id`, `user_id`, `type`, `read_at` |
| `notification_preferences`| Setelan preferensi push/email/in-app alert | `id`, `tenant_id`, `user_id`, `channel`, `is_enabled` |

---

## 7. 🏆 Gamification Domain
**Fokus:** Retensi dan keterlibatan pengguna lewat mekanik bermain.

| Entity | Purpose | Fitur Penting |
|--------|---------|---------------|
| `points_ledger` | History pemasukan / pengurangan poin secara mutlak| `id`, `tenant_id`, `user_id`, `amount`, `reason`, `event_id`|
| `user_points` | Precomputed table: total poin & tingkatan level | `id`, `tenant_id`, `user_id`, `total_points`, `level` |
| `leaderboards` | Precomputed data rank berdasarkan skor per kelas | `id`, `tenant_id`, `class_id`, `user_id`, `rank`, `score` |
| `badges` | Penjabaran spesifikasi badge / medali sistem | `id`, `tenant_id`, `name`, `criteria_type`, `criteria_value`|
| `badge_rules` | Aturan otomasi kapan badge diberikan | `id`, `tenant_id`, `badge_id`, `trigger_event`, `threshold`|
| `user_badges` | Penanda badge yang sudah berhasil diraih user | `id`, `tenant_id`, `user_id`, `badge_id`, `awarded_at` |

---

## 8. 🎓 Certificates Domain (Opsional / Masa Depan)
**Fokus:** Manajemen kelulusan, kredensial dan ijazah digital.

| Entity | Purpose | Fitur Penting |
|--------|---------|---------------|
| `certificate_templates`| Layout & template statis ijazah/sertifikat | `id`, `tenant_id`, `course_id`, `background_url` |
| `certificates` | Hasil generate dokumen valid kelulusan | `id`, `tenant_id`, `course_id`, `issue_date` |
| `certificate_issues` | Log penempatan & klaim sertifikat user spesifik | `id`, `tenant_id`, `user_id`, `certificate_id`, `url` |

---

## 9. 💰 Finance / Billing Domain (Opsional SaaS)
**Fokus:** Moneterisasi langganan antar sekolah atau marketplace course.

| Entity | Purpose | Fitur Penting |
|--------|---------|---------------|
| `plans` | Paket langganan (mis: Basic, Pro, Enterprise) | `id`, `tier_name`, `price`, `max_students` |
| `subscriptions` | Langganan aktif per tenant perusahaan | `id`, `tenant_id`, `plan_id`, `status`, `expires_at` |
| `invoices` | Cetakan billing/tagihan tertunda & selesai | `id`, `tenant_id`, `amount`, `status`, `due_date` |
| `payments` | Riwayat transaksi log pembayaran sukses | `id`, `tenant_id`, `invoice_id`, `method`, `paid_at` |

---

## 10. 📈 Progress & Tracking Domain
**Fokus:** Melacak penyelesaian materi individu dan agregasi progres level kursus.

| Entity | Purpose | Fitur Penting |
|--------|---------|---------------|
| `lesson_progress` | Track status selesai per murid per lesson | `id`, `tenant_id`, `student_id`, `lesson_id`, `completed` |
| `course_progress` | Agregasi precomputed persentase kelulusan course | `id`, `tenant_id`, `course_id`, `student_id`, `percentage` |

---

## 11. 📊 Analytics & Reporting Domain
**Fokus:** Wawasan data pembelajaran untuk guru/admin. Mengandalkan data pre-aggregated dari database.

| Entity | Purpose | Fitur Penting |
|--------|---------|---------------|
| `course_stats` | Tabel consumer metrik kursus pre-aggregated | `tenant_id`, `course_id`, `avg_progress`, `lesson_completion_rate`, `student_ranking` |

> **Hubungan Data Pipeline (Phase 3):**  
> `quiz_attempts` (Activity) → memicu upsert ke → `lesson_progress` (Progress) → memicu trigger DB ke → `course_progress` (Progress) → diringkas melalui periodic RPC (cron) ke → `course_stats` (Analytics).

---

## Data Event & Lifecyle Constraints

> Keberhasilan sistem SaaS dengan lebih dari ratusan tabel ada di retention & pipeline integrity

*   **Idempotency Guards:** Semua tabel Activity Consumer (`user_points`, `notifications`, `leaderboards`, dll) harus mengecek kolom referensi ke `activity_events` untuk meminimalisasi *duplicate writes* yang sering terjadi di environment serverless.
*   **Event Retention (3-Tier Policy):** Mengingat jumlah event akan membengkak, rotasikan data secara bertahap:
    *   **Hot Events:** Tabel utama (`activity_events`), durasi 30-90 hari (query super kencang).
    *   **Warm Archive:** Dipindahkan ke tabel `activity_events_archive` per kuartal (durasi s.d 1 tahun).
    *   **Cold Storage:** Dibuang dari Postgres ke _Object Store_ (misal S3 / Supabase Storage) berbentuk file Parquet/JSONL.
*   **Event Versioning:** Setiap payload memiliki label `event_version` guna melayani evolusi skema payload seiring pertambahan fitur di long-lived-systems.
*   **Frontend Restrictions:** Tidak ada perhitungan agregasi berat di frontend. Frontend *hanya* men-query `user_points` atau `course_progress` tanpa melalukan kalkulasi `COUNT(*)` sama sekali.
