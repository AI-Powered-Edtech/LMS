# EduSync LMS — Schema ERD

This document shows the core entity relationships for the EduSync LMS database.

The schema contains **84 tables** across 8 functional domains. All tenant-scoped tables include a `tenant_id` column enforced by Row Level Security.

> Generated from `supabase/migrations/000_baseline.sql` (consolidated from migrations 001–840).

---

## Core Domain Map

```
Identity & Tenancy      → tenants, profiles, user_roles, user_invitations
Academic Structure      → courses, course_modules, lessons, lesson_resources, lesson_chunks
Classroom & Enrollment  → classes, enrollments, course_enrollments, class_schedules
Assessment              → quizzes, quiz_questions, quiz_options, quiz_attempts_v2, quiz_answers
Assignments             → assignments, assignment_submissions, grades
Gamification            → user_points, user_streaks, badges, user_badges, leaderboards
Analytics & Events      → learning_events, activity_events, lesson_progress, course_progress
AI & Communication      → ai_tutor_sessions, ai_tutor_messages, announcements, notifications
```

---

## Entity Relationship Diagram

### Identity & Tenancy

```mermaid
erDiagram
    tenants {
        uuid id PK
        text name
        text slug
        boolean is_active
        timestamptz created_at
    }

    profiles {
        uuid id PK
        uuid tenant_id FK
        text email
        text first_name
        text last_name
        text avatar_url
        timestamptz created_at
    }

    user_roles {
        uuid id PK
        uuid user_id FK
        uuid tenant_id FK
        app_role role
        timestamptz created_at
    }

    user_invitations {
        uuid id PK
        uuid tenant_id FK
        text email
        app_role role
        text token
        timestamptz expires_at
    }

    modules {
        uuid id PK
        uuid tenant_id FK
        text name
        text slug
        boolean is_core
        boolean api_enabled_default
    }

    tenant_modules {
        uuid id PK
        uuid tenant_id FK
        uuid module_id FK
        boolean is_enabled
    }

    tenants ||--o{ profiles : "has"
    tenants ||--o{ user_roles : "scopes"
    tenants ||--o{ user_invitations : "issues"
    tenants ||--o{ tenant_modules : "configures"
    modules ||--o{ tenant_modules : "toggled_by"
    profiles ||--o{ user_roles : "has_role"
```

### Academic Structure

```mermaid
erDiagram
    courses {
        uuid id PK
        uuid tenant_id FK
        text title
        text description
        text subject
        text level
        text status
        uuid created_by FK
        timestamptz created_at
    }

    course_modules {
        uuid id PK
        uuid tenant_id FK
        uuid course_id FK
        text title
        integer order
        timestamptz created_at
    }

    lessons {
        uuid id PK
        uuid tenant_id FK
        uuid module_id FK
        text title
        text content
        text type
        integer order
        boolean is_published
        integer duration_minutes
        timestamptz created_at
    }

    lesson_resources {
        uuid id PK
        uuid tenant_id FK
        uuid lesson_id FK
        text title
        text url
        text resource_type
        integer order
    }

    lesson_chunks {
        uuid id PK
        uuid tenant_id FK
        uuid lesson_id FK
        text content
        integer chunk_index
        vector embedding
    }

    courses ||--o{ course_modules : "contains"
    course_modules ||--o{ lessons : "contains"
    lessons ||--o{ lesson_resources : "has"
    lessons ||--o{ lesson_chunks : "chunked_into"
```

### Classroom & Enrollment

```mermaid
erDiagram
    classes {
        uuid id PK
        uuid tenant_id FK
        uuid course_id FK
        text name
        uuid teacher_id FK
        text join_code
        integer max_students
        timestamptz created_at
    }

    enrollments {
        uuid id PK
        uuid tenant_id FK
        uuid class_id FK
        uuid student_id FK
        text status
        timestamptz joined_at
    }

    course_enrollments {
        uuid id PK
        uuid tenant_id FK
        uuid course_id FK
        uuid user_id FK
        text role
        text status
        timestamptz enrolled_at
    }

    class_schedules {
        uuid id PK
        uuid tenant_id FK
        uuid class_id FK
        text day_of_week
        time start_time
        time end_time
    }

    courses ||--o{ classes : "taught_in"
    classes ||--o{ enrollments : "has"
    classes ||--o{ class_schedules : "scheduled_by"
    profiles ||--o{ enrollments : "student"
    courses ||--o{ course_enrollments : "enrolled_in"
```

### Assessment — Quizzes

```mermaid
erDiagram
    quizzes {
        uuid id PK
        uuid tenant_id FK
        uuid course_id FK
        uuid module_id FK
        text title
        text instructions
        integer time_limit_minutes
        integer passing_score
        integer max_attempts
        text status
        boolean is_published
    }

    quiz_questions {
        uuid id PK
        uuid tenant_id FK
        uuid quiz_id FK
        text text
        integer order
        text question_type
        integer points
        text explanation
    }

    quiz_options {
        uuid id PK
        uuid tenant_id FK
        uuid question_id FK
        text text
        boolean is_correct
    }

    quiz_attempts_v2 {
        uuid id PK
        uuid tenant_id FK
        uuid quiz_id FK
        uuid student_id FK
        attempt_status status
        integer score
        integer total_points
        timestamptz started_at
        timestamptz submitted_at
    }

    quiz_answers {
        uuid id PK
        uuid attempt_id FK
        uuid question_id FK
        uuid selected_option_id FK
        boolean is_correct
        integer points_earned
    }

    quizzes ||--o{ quiz_questions : "has"
    quiz_questions ||--o{ quiz_options : "has"
    quizzes ||--o{ quiz_attempts_v2 : "attempted_by"
    quiz_attempts_v2 ||--o{ quiz_answers : "contains"
```

### Assignments & Grades

```mermaid
erDiagram
    assignments {
        uuid id PK
        uuid tenant_id FK
        uuid class_id FK
        text title
        text description
        integer max_points
        timestamptz due_date
        boolean is_published
    }

    assignment_submissions {
        uuid id PK
        uuid tenant_id FK
        uuid assignment_id FK
        uuid student_id FK
        text content
        text status
        timestamptz submitted_at
    }

    grades {
        uuid id PK
        uuid tenant_id FK
        uuid submission_id FK
        uuid graded_by FK
        integer points_earned
        text feedback
        timestamptz graded_at
    }

    assignments ||--o{ assignment_submissions : "submitted_via"
    assignment_submissions ||--o| grades : "graded_by"
```

### Gamification

```mermaid
erDiagram
    user_points {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        integer total_points
        integer weekly_points
        integer monthly_points
        timestamptz updated_at
    }

    user_streaks {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        integer current_streak
        integer longest_streak
        date last_activity_date
        timestamptz updated_at
    }

    badges {
        uuid id PK
        uuid tenant_id FK
        text name
        text description
        text icon
        text condition_type
        integer condition_value
        integer xp_reward
    }

    user_badges {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        uuid badge_id FK
        timestamptz earned_at
    }

    leaderboards {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        integer total_points
        integer rank
        text period
        timestamptz updated_at
    }

    profiles ||--o| user_points : "earns"
    profiles ||--o| user_streaks : "maintains"
    profiles ||--o{ user_badges : "awarded"
    badges ||--o{ user_badges : "awarded_to"
    profiles ||--o{ leaderboards : "ranked_in"
```

### Analytics & Progress

```mermaid
erDiagram
    learning_events {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        text event_type
        uuid course_id FK
        integer points_earned
        timestamptz created_at
    }

    lesson_progress {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        uuid lesson_id FK
        boolean is_completed
        integer progress_percent
        timestamptz completed_at
        timestamptz last_accessed_at
    }

    course_progress {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        uuid course_id FK
        integer completed_lessons
        integer total_lessons
        numeric percentage
        timestamptz last_activity_at
    }

    activity_events {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        activity_event_type event_type
        jsonb payload
        timestamptz created_at
    }

    profiles ||--o{ learning_events : "generates"
    profiles ||--o{ lesson_progress : "tracks"
    profiles ||--o{ course_progress : "tracks"
    profiles ||--o{ activity_events : "triggers"
```

### AI Tutor

```mermaid
erDiagram
    ai_tutor_sessions {
        uuid id PK
        uuid tenant_id FK
        uuid student_id FK
        uuid lesson_id FK
        text status
        timestamptz started_at
        timestamptz ended_at
    }

    ai_tutor_messages {
        uuid id PK
        uuid tenant_id FK
        uuid session_id FK
        text role
        text content
        jsonb metadata
        timestamptz created_at
    }

    ai_tutor_interactions {
        uuid id PK
        uuid tenant_id FK
        uuid student_id FK
        text question
        text response
        integer helpful_rating
        timestamptz created_at
    }

    ai_tutor_sessions ||--o{ ai_tutor_messages : "contains"
    profiles ||--o{ ai_tutor_sessions : "initiates"
    profiles ||--o{ ai_tutor_interactions : "has"
```

---

## Cross-domain FK Summary

| Table           | Most Referenced By                                     |
| --------------- | ------------------------------------------------------ |
| `tenants`       | 58 FK references — all tenant-scoped tables            |
| `profiles`      | 28 FK references — user context everywhere             |
| `courses`       | 17 FK references — modules, classes, progress          |
| `classes`       | 11 FK references — enrollments, assignments, schedules |
| `lessons`       | 10 FK references — resources, chunks, progress         |
| `quizzes`       | 7 FK references — questions, attempts, assignments     |
| `question_bank` | 5 FK references — options, tags, usage                 |

---

## Table Inventory (all 84 tables)

| Domain        | Tables                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity      | `tenants`, `profiles`, `user_roles`, `user_invitations`, `modules`, `tenant_modules`                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Academic      | `courses`, `course_modules`, `lessons`, `lesson_resources`, `lesson_chunks`                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Classroom     | `classes`, `enrollments`, `course_enrollments`, `class_schedules`, `course_classes`                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Assessment    | `quizzes`, `quiz_questions`, `quiz_options`, `quiz_attempts_v2`, `quiz_answers`, `quiz_attempt_questions_v2`, `quiz_assignments`, `quiz_submission_queue`, `quiz_cheating_events`, `quiz_attempt_telemetry`, `quiz_stats`, `quiz_answer_history`, `quiz_attempts_v2_2026_03`, `quiz_attempts_v2_2026_04`, `quiz_attempts_v2_2026_07`, `quiz_attempts_v2_2026_10`, `quiz_attempts_v2_historic`, `quiz_a_q_v2_2026_03`, `quiz_a_q_v2_2026_04`, `quiz_a_q_v2_historic`, `quiz_attempts_legacy`, `quiz_attempt_questions_legacy` |
| Question Bank | `question_bank`, `question_options`, `question_tags`, `question_stats`, `question_bank_usage`                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Assignments   | `assignments`, `assignment_submissions`, `grades`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Gamification  | `user_points`, `user_streaks`, `badges`, `user_badges`, `leaderboards`, `leaderboards_weekly`                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Analytics     | `learning_events`, `activity_events`, `activity_logs`, `lesson_progress`, `course_progress`, `course_stats`, `course_insights`, `analytics_metrics`, `analytics_audit`, `analytics_rate_limits`, `analytics_circuit_breaker`, `student_concept_mastery`, `recommendations`                                                                                                                                                                                                                                                   |
| Attendance    | `attendance_records`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Discussions   | `discussions`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Announcements | `announcements`, `class_announcements`, `announcement_rsvps`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Notifications | `notifications`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| AI Tutor      | `ai_tutor_sessions`, `ai_tutor_messages`, `ai_tutor_interactions`, `ai_tutor_feedback`, `ai_tutor_cache`, `ai_tutor_rate_limits`, `ai_generation_metadata`                                                                                                                                                                                                                                                                                                                                                                   |
| Billing       | `invoices`, `payments`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Admin         | `admin_audit_logs`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

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
