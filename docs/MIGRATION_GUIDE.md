# EduSync LMS — Feature Migration Guide

Panduan migrasi dan upgrade untuk feature modules EduSync LMS.

## Feature Module Versioning

Setiap feature module mengikuti semantic versioning. Perubahan breaking harus melalui migration path.

## Migration Checklist per Feature

### administration

1. Backup tabel: tenants, tenant_modules, sync_history
2. Run migration SQL untuk Administrasi
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### ai-tutor

1. Backup tabel: ai_tutor_sessions, ai_tutor_messages
2. Run migration SQL untuk AI Tutor
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### analytics

1. Backup tabel: analytics_events, engagement_metrics
2. Run migration SQL untuk Analitik
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### announcements

1. Backup tabel: announcements, announcement_reads
2. Run migration SQL untuk Pengumuman
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### assignments

1. Backup tabel: assignments, assignment_submissions
2. Run migration SQL untuk Tugas
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### calendar

1. Backup tabel: calendar_events, academic_calendar
2. Run migration SQL untuk Kalender
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### classroom

1. Backup tabel: classrooms, classroom_students, classroom_teachers
2. Run migration SQL untuk Kelas
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### courses

1. Backup tabel: courses, course_modules, enrollments
2. Run migration SQL untuk Kursus
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### dashboards

1. Backup tabel: dashboards, dashboard_widgets
2. Run migration SQL untuk Dashboard
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### discussions

1. Backup tabel: discussions, discussion_comments
2. Run migration SQL untuk Diskusi
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### gamification

1. Backup tabel: xp_events, badges, user_badges, streaks, leaderboard_cache
2. Run migration SQL untuk Gamifikasi
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### gradebook

1. Backup tabel: grade_entries, grade_categories
2. Run migration SQL untuk Buku Nilai
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### guidance

1. Backup tabel: guides, guide_completions
2. Run migration SQL untuk Panduan
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### lessons

1. Backup tabel: lessons, lesson_blocks, student_lesson_signals
2. Run migration SQL untuk Pelajaran
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### moderation

1. Backup tabel: moderation_actions, moderation_queue
2. Run migration SQL untuk Moderasi
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### notifications

1. Backup tabel: notifications, notification_preferences
2. Run migration SQL untuk Notifikasi
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### onboarding

1. Backup tabel: onboarding_progress
2. Run migration SQL untuk Onboarding
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### progress

1. Backup tabel: student_progress, module_progress
2. Run migration SQL untuk Kemajuan Belajar
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### question-bank

1. Backup tabel: quiz_questions, quiz_options
2. Run migration SQL untuk Bank Soal
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### quizzes

1. Backup tabel: quizzes, quiz_attempts, quiz_answers, quiz_assignments
2. Run migration SQL untuk Kuis
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### recommendations

1. Backup tabel: recommendations
2. Run migration SQL untuk Rekomendasi
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### reports

1. Backup tabel: reports, report_schedules
2. Run migration SQL untuk Laporan
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### storage

1. Backup tabel: storage_files
2. Run migration SQL untuk Penyimpanan
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

### struggle

1. Backup tabel: struggle_alerts, struggle_config
2. Run migration SQL untuk Deteksi Kesulitan
3. Verify RLS policies masih aktif
4. Test dengan semua role (student, teacher, admin)
5. Update dokumentasi di docs/

## Database Migration

Semua migrasi database menggunakan Supabase CLI:
