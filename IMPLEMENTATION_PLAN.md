# EduSync LMS — Implementation Plan: UX Improvements & New Personas

> **Created:** 2026-04-02
> **Status:** Proposed
> **Scope:** Phase 26-30 — UX Improvements + Parent Portal + Principal Dashboard
> **Predecessor:** Phase 25B (Final Polish & Cleanup) — COMPLETED

---

## Executive Summary

Setelah analisis mendalam seluruh flow UX untuk 5 persona (3 implemented + 2 planned), dokumen ini mengidentifikasi **47 celah improvement** dan merencanakan **5 phase implementasi** baru.

### Ringkasan Persona

| #   | Persona                | Role        | Status             | Priority |
| --- | ---------------------- | ----------- | ------------------ | -------- |
| 1   | Rafi (Student)         | `student`   | ✅ Implemented     | -        |
| 2   | Bu Ratna (Teacher)     | `teacher`   | ✅ Implemented     | -        |
| 3   | Pak Hendra (Admin)     | `admin`     | ✅ Implemented     | -        |
| 4   | Ibu Sari (Parent)      | `parent`    | 🔴 Not implemented | **P0**   |
| 5   | Dr. Widodo (Principal) | `principal` | 🔴 Not implemented | **P1**   |

---

## Phase 26: Student UX Improvements (2 minggu)

### 26.1 Quiz Timer Pause/Resume

**Problem:** Timer kuis tidak bisa dihentikan saat student terganggu (telepon, internet putus).
**Impact:** HIGH — mempengaruhi fairness dan user experience
**Solution:**

- Tambah tombol "Pause" yang bisa digunakan 1x per kuis (max 5 menit)
- Freeze timer di frontend + backend saat pause
- Tambah kolom `pause_count` dan `pause_remaining` di `quiz_attempts`
- RLS: student hanya bisa pause jika `pause_remaining > 0`

**Files touched:**

- `src/features/quizzes/hooks/useQuizTimer.ts` — pause/resume logic
- `src/features/quizzes/components/QuizHeader.tsx` — pause button UI
- `supabase/migrations/026_quiz_pause.sql` — migration
- `docs/features/quizzes.md` — update documentation

**Estimasi:** 3 hari

### 26.2 File Preview Before Assignment Submit

**Problem:** Student tidak bisa verifikasi file yang di-upload sebelum submit.
**Impact:** MEDIUM — risiko submit file yang salah
**Solution:**

- Implementasi file preview modal untuk PDF, gambar, dan text files
- Gunakan `<iframe>` untuk PDF, `<img>` untuk gambar, `<pre>` untuk text
- Tambah thumbnail preview di submission panel

**Files touched:**

- `src/features/assignments/components/FilePreviewModal.tsx` — new component
- `src/features/assignments/components/StudentSubmissionPanel.tsx` — add preview button
- `src/features/storage/api/fileApi.ts` — add preview URL generation

**Estimasi:** 2 hari

### 26.3 Offline Mode untuk Lessons

**Problem:** Lesson viewer butuh koneksi internet terus-menerus.
**Impact:** MEDIUM — student di area dengan koneksi buruk
**Solution:**

- Implementasi PWA service worker untuk cache lesson content
- Tambah "Download Lesson" button untuk akses offline
- Queue submission lokal saat offline, sync saat online
- Gunakan IndexedDB untuk menyimpan lesson content

**Files touched:**

- `vite.config.ts` — PWA plugin configuration
- `src/features/lessons/services/offlineCache.ts` — new service
- `src/features/lessons/hooks/useOfflineLesson.ts` — new hook
- `public/sw.js` — service worker
- `src/features/lessons/components/OfflineBanner.tsx` — offline indicator

**Estimasi:** 5 hari

### 26.4 Real-time Grade Data (Fix What-If Grades)

**Problem:** What-If Grades menggunakan data dummy jika belum ada submission.
**Impact:** LOW-MEDIUM — misleading untuk student baru
**Solution:**

- Ganti DEFAULT_ASSIGNMENTS dengan real-time fetch dari gradebook
- Jika belum ada data, tampilkan empty state yang informatif
- Tambah loading skeleton saat fetch grade data

**Files touched:**

- `src/features/gradebook/components/StudentGradeView.tsx` — fix data source
- `src/features/gradebook/hooks/useStudentGrades.ts` — add real-time fetch

**Estimasi:** 1 hari

### 26.5 Deep Link Course Enrollment

**Problem:** Enrollment manual via 6-digit code — tidak ada QR scan atau link click.
**Impact:** LOW — friction saat onboarding
**Solution:**

- Support deep link `/#/enroll?code=XH2K7` untuk auto-enroll
- Generate QR code untuk join class (bisa di-print guru)
- Tambah "Scan QR" button di mobile (gunakan kamera)

**Files touched:**

- `src/app/routes/enrollRoutes.tsx` — new route
- `src/features/classroom/components/QRCodeGenerator.tsx` — new component
- `src/features/classroom/components/QRScanner.tsx` — new component

**Estimasi:** 3 hari

---

## Phase 27: Teacher UX Improvements (2 minggu)

### 27.1 Guided Onboarding Wizard untuk Guru Baru

**Problem:** Dashboard terlalu overwhelming untuk guru yang baru mengadopsi LMS.
**Impact:** HIGH — adoption rate rendah untuk guru non-teknis
**Solution:**

- Implementasi 5-step wizard untuk first-time login:
  1. "Selamat Datang" — overview platform
  2. "Buat Kelas Pertama" — guided class creation
  3. "Tambah Siswa" — share join code atau import CSV
  4. "Buat Materi Pertama" — quick course builder
  5. "Selesai! Mulai Mengajar" — redirect ke dashboard
- Simpan progress wizard di localStorage + database

**Files touched:**

- `src/features/onboarding/components/TeacherOnboardingWizard.tsx` — new component
- `src/features/onboarding/hooks/useOnboardingProgress.ts` — new hook
- `src/features/onboarding/api/onboardingApi.ts` — new API
- `supabase/migrations/027_onboarding_progress.sql` — migration

**Estimasi:** 4 hari

### 27.2 SpeedGrader Annotation Persistence

**Problem:** Anotasi di SpeedGrader belum tersimpan secara persisten.
**Impact:** MEDIUM — guru tidak bisa review anotasi sebelumnya
**Solution:**

- Simpan annotation coordinates + text ke tabel `submission_annotations`
- Load annotations saat buka submission
- Support multiple annotations per submission
- Tambah annotation layer di DocumentViewer

**Files touched:**

- `src/features/gradebook/components/AnnotationLayer.tsx` — new component
- `src/features/gradebook/api/annotationApi.ts` — new API
- `src/features/gradebook/components/DocumentViewer.tsx` — add annotation overlay
- `supabase/migrations/027_submission_annotations.sql` — migration

**Estimasi:** 3 hari

### 27.3 CSV Export untuk Gradebook

**Problem:** Tombol export CSV ada tapi hanya menampilkan toast "segera hadir".
**Impact:** MEDIUM — guru butuh export untuk laporan
**Solution:**

- Implementasi CSV export menggunakan PapaParse (sudah ada di dependencies)
- Export semua kolom gradebook: nama siswa, semua assignment, total grade
- Support filter by class dan date range
- Download file CSV langsung dari browser

**Files touched:**

- `src/features/gradebook/utils/csvExport.ts` — new utility
- `src/features/gradebook/components/GradebookTable.tsx` — implement export button

**Estimasi:** 1 hari

### 27.4 Activity Feed di Teacher Dashboard

**Problem:** Activity feed masih placeholder (EmptyState statis).
**Impact:** MEDIUM — guru tidak bisa lihat aktivitas real-time
**Solution:**

- Fetch recent activity dari `activity_events` table
- Tampilkan: submission baru, quiz completed, student joined class
- Support filter by class dan activity type
- Auto-refresh setiap 30 detik

**Files touched:**

- `src/features/dashboards/components/TeacherActivityFeed.tsx` — new component
- `src/features/dashboards/hooks/useTeacherActivity.ts` — new hook
- `src/pages/TeacherDashboard.tsx` — replace placeholder

**Estimasi:** 2 hari

### 27.5 Question Bank Integration di Quiz Manager

**Problem:** Teacher membuat soal dari scratch, tidak bisa pull dari Question Bank.
**Impact:** MEDIUM — duplikasi effort
**Solution:**

- Tambah "Import from Question Bank" button di Quiz Editor
- Modal dengan search + filter question bank
- Multi-select questions → add to quiz
- Preview soal sebelum import

**Files touched:**

- `src/features/quizzes/components/ImportFromQuestionBank.tsx` — new component
- `src/features/question-bank/hooks/useQuestionBankSelect.ts` — new hook
- `src/pages/QuizManager.tsx` — add import button

**Estimasi:** 3 hari

### 27.6 Mobile Responsiveness untuk Course Builder & SpeedGrader

**Problem:** Halaman kompleks tidak optimal di smartphone.
**Impact:** HIGH — guru mengajar via smartphone Android mid-range
**Solution:**

- Course Builder: Simplified mobile layout (list-based, bukan drag-drop)
- SpeedGrader: Stack layout (document di atas, rubric di bawah)
- Test di viewport 360x640 (Android mid-range)
- Gunakan responsive breakpoints Tailwind

**Files touched:**

- `src/pages/CourseBuilder.tsx` — mobile layout
- `src/pages/SpeedGrader.tsx` — mobile layout
- `src/features/courses/components/MobileLessonEditor.tsx` — new component

**Estimasi:** 4 hari

---

## Phase 28: Admin UX Improvements (2 minggu)

### 28.1 Bulk User Import via CSV

**Problem:** Setiap user harus di-invite satu per satu.
**Impact:** HIGH — sangat lambat untuk sekolah 500+ siswa
**Solution:**

- CSV upload wizard: download template → isi → upload → preview → confirm
- Parse CSV di frontend (PapaParse sudah ada)
- Batch create invitations via Edge Function
- Progress bar + error report untuk failed rows

**Files touched:**

- `src/features/administration/components/BulkImportWizard.tsx` — new component (4 steps)
- `src/features/administration/api/bulkImportApi.ts` — new API
- `supabase/functions/bulk-import-users/index.ts` — new Edge Function
- `supabase/migrations/028_bulk_import.sql` — migration

**Estimasi:** 5 hari

### 28.2 Audit Log Export

**Problem:** Tidak ada export capability untuk compliance reporting.
**Impact:** MEDIUM — sulit untuk audit eksternal
**Solution:**

- Export audit logs ke CSV/PDF
- Filter by date range, action type, actor
- Include pagination info di export
- Download langsung dari browser

**Files touched:**

- `src/features/administration/utils/auditExport.ts` — new utility
- `src/pages/AuditDashboard.tsx` — add export button

**Estimasi:** 1 hari

### 28.3 Unified Feature Management

**Problem:** Feature flags dan modul config terpisah (confusing).
**Impact:** MEDIUM — admin bingung mana yang harus dipakai
**Solution:**

- Gabungkan AdministrationDashboard module toggle dan FeatureFlagsPage
- Single "Feature Management" page dengan:
  - Module toggles (on/off per modul)
  - Feature flags (rollout percentage)
  - Tenant overrides
- Hapus halaman FeatureFlagsPage yang terpisah

**Files touched:**

- `src/features/administration/components/FeatureManagement.tsx` — new unified component
- `src/pages/AdministrationDashboard.tsx` — replace module config section
- `src/pages/FeatureFlagsPage.tsx` — deprecated, redirect ke FeatureManagement

**Estimasi:** 3 hari

### 28.4 Admin Notification Center

**Problem:** Admin tidak mendapat notifikasi real-time.
**Impact:** MEDIUM — reactive management
**Solution:**

- Notification bell di topbar (seperti student/teacher)
- Notifikasi untuk: invitation accepted, moderation report, sync failure, system alert
- Real-time via Supabase Realtime subscription
- Mark as read, clear all

**Files touched:**

- `src/features/notifications/components/NotificationCenter.tsx` — enhance existing
- `src/features/notifications/hooks/useAdminNotifications.ts` — new hook
- `src/components/layout/Topbar.tsx` — add notification bell

**Estimasi:** 3 hari

### 28.5 Sidebar Navigation Enhancement

**Problem:** Sidebar admin terlalu minimalis (hanya 4 item).
**Impact:** MEDIUM — discoverability rendah
**Solution:**

- Expand sidebar dengan grouped navigation:
  - **Administrasi**: Dashboard, Users, Classes, Courses
  - **Analytics**: Analytics, Audit, System Health
  - **Keuangan**: Billing, Finance (jika enabled)
  - **Pengaturan**: Settings, Feature Management, LTI
- Collapsible groups
- Search bar di sidebar

**Files touched:**

- `src/shared/config/navigation.ts` — add admin navigation groups
- `src/components/navigation/AdminSidebar.tsx` — new component
- `src/components/layout/AdminLayout.tsx` — use new sidebar

**Estimasi:** 3 hari

### 28.6 Finance Dashboard Implementation

**Problem:** Finance dashboard masih placeholder ("Segera Hadir").
**Impact:** HIGH — admin butuh SPP management
**Solution:**

- Implementasi dasar finance dashboard:
  - SPP payment tracking per student
  - Payment status overview (lunas/belum/partial)
  - Payment history per student
  - Export laporan keuangan
- Integrasi dengan tabel billing yang sudah ada

**Files touched:**

- `src/features/administration/components/FinanceDashboard.tsx` — implement
- `src/features/administration/hooks/useFinanceData.ts` — new hook
- `supabase/migrations/028_finance_enhancement.sql` — migration (jika perlu)

**Estimasi:** 5 hari

---

## Phase 29: Parent Portal (3 minggu) — P0

### 29.1 Database Schema & Role

**Solution:**

- Tambah role `PARENT` ke enum `app_role`
- Buat tabel `student_parent_links`:
  ```sql
  CREATE TABLE student_parent_links (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    student_id uuid NOT NULL REFERENCES profiles(id),
    parent_id uuid NOT NULL REFERENCES profiles(id),
    relationship text, -- 'ayah', 'ibu', 'wali'
    created_at timestamptz DEFAULT now(),
    UNIQUE(student_id, parent_id)
  );
  ```
- RLS policies: parent hanya bisa lihat data anak yang di-link
- Tambah RPC `get_my_children()` untuk fetch linked students

**Files touched:**

- `supabase/migrations/029_parent_role.sql` — new migration
- `supabase/migrations/029_parent_rls.sql` — RLS policies
- `src/contexts/AuthContext.tsx` — add 'parent' to Role type
- `src/components/guards/RoleResolver.tsx` — add parent routing
- `src/shared/types/roles.ts` — update type definitions

**Estimasi:** 3 hari

### 29.2 OTP-based Registration

**Solution:**

- Registrasi via nomor HP + OTP (bukan email/password)
- Integrasi WhatsApp API untuk kirim OTP (gunakan provider seperti Wablas/Fonnte)
- Auto-link ke profil anak berdasarkan nomor HP yang didaftarkan sekolah
- Fallback: registrasi via invite link dari sekolah

**Files touched:**

- `supabase/functions/send-whatsapp-otp/index.ts` — new Edge Function
- `src/features/auth/components/ParentRegistration.tsx` — new component
- `src/features/auth/components/OTPVerification.tsx` — enhance existing
- `src/app/routes/parentRoutes.tsx` — new route file

**Estimasi:** 5 hari

### 29.3 Parent Dashboard (Mobile-First)

**Solution:**
Dashboard sederhana dengan komponen:

- **Header**: Nama anak + kelas + foto
- **Traffic Light System**: Hijau (semua baik), Kuning (perlu perhatian), Merah (perlu intervensi)
- **Nilai Terbaru**: List nilai quiz/tugas terakhir dengan trend arrow
- **Kehadiran Minggu Ini**: Grid hari dengan status (✅/❌/⚠️)
- **Tugas Belum Selesai**: List tugas yang overdue/belum dikumpulkan
- **Notifikasi**: Digest harian aktivitas anak
- **Hubungi Guru**: Button untuk kirim pesan

**Files touched:**

- `src/features/parent/components/ParentDashboard.tsx` — new component
- `src/features/parent/components/TrafficLightIndicator.tsx` — new component
- `src/features/parent/components/ChildGradeCard.tsx` — new component
- `src/features/parent/components/ChildAttendanceGrid.tsx` — new component
- `src/features/parent/hooks/useChildData.ts` — new hook
- `src/features/parent/api/parentApi.ts` — new API service
- `src/components/layout/ParentLayout.tsx` — new layout (mobile-first)

**Estimasi:** 7 hari

### 29.4 Daily Digest via WhatsApp

**Solution:**

- Edge Function yang generate daily digest per parent
- Kirim via WhatsApp API setiap sore (17:00 WIB)
- Konten: ringkasan aktivitas anak (tugas selesai, nilai baru, kehadiran)
- Schedule via pg_cron atau external scheduler

**Files touched:**

- `supabase/functions/send-parent-digest/index.ts` — new Edge Function
- `supabase/migrations/029_parent_digest_schedule.sql` — pg_cron job
- `src/features/notifications/api/digestApi.ts` — digest configuration

**Estimasi:** 3 hari

### 29.5 Message Teacher Feature

**Solution:**

- In-app messaging antara parent dan teacher
- Thread per guru (bukan group)
- Notifikasi real-time saat guru membalas
- Template pesan cepat: "Anak saya sakit hari ini", "Minta jadwal meeting"

**Files touched:**

- `src/features/parent/components/MessageTeacher.tsx` — new component
- `src/features/parent/components/MessageThread.tsx` — new component
- `supabase/migrations/029_parent_messages.sql` — messages table + RLS
- `src/features/parent/api/messageApi.ts` — new API

**Estimasi:** 4 hari

### 29.6 Monthly Progress Report

**Solution:**

- Auto-generate laporan bulanan per anak
- Format: PDF dengan branding sekolah
- Konten: nilai, kehadiran, perilaku, pencapaian
- Kirim via WhatsApp atau download dari dashboard

**Files touched:**

- `supabase/functions/generate-parent-report/index.ts` — new Edge Function
- `src/features/parent/components/MonthlyReport.tsx` — new component
- `src/features/reports/utils/parentReportGenerator.ts` — report generation

**Estimasi:** 3 hari

---

## Phase 30: Principal Dashboard (2 minggu) — P1

### 30.1 Database Schema & Role

**Solution:**

- Tambah role `PRINCIPAL` ke enum `app_role`
- Principal bisa lihat semua data tenant (read-only)
- Tambah tabel `principal_settings` untuk konfigurasi dashboard

**Files touched:**

- `supabase/migrations/030_principal_role.sql` — new migration
- `src/contexts/AuthContext.tsx` — add 'principal' to Role type
- `src/components/guards/RoleResolver.tsx` — add principal routing

**Estimasi:** 2 hari

### 30.2 Executive Dashboard

**Solution:**
Dashboard 1 halaman dengan komponen:

- **Adoption Metrics**: Guru aktif, siswa aktif, trend bulanan
- **Academic Overview**: Rata-rata nilai, siswa berisiko, proyeksi kelulusan
- **ROI Calculator**: Penghematan biaya cetak, waktu guru, kepuasan orang tua
- **Teacher Leaderboard**: Adopsi guru per kelas
- **Achievement Highlights**: Kelas terbaik, course paling aktif, siswa berprestasi
- **Quick Actions**: Download report, export untuk yayasan, jadwalkan auto-report

**Files touched:**

- `src/features/principal/components/ExecutiveDashboard.tsx` — new component
- `src/features/principal/components/AdoptionMetrics.tsx` — new component
- `src/features/principal/components/ROICalculator.tsx` — new component
- `src/features/principal/components/TeacherLeaderboard.tsx` — new component
- `src/features/principal/hooks/useExecutiveData.ts` — new hook
- `src/features/principal/api/executiveApi.ts` — new API
- `src/components/layout/PrincipalLayout.tsx` — new layout

**Estimasi:** 5 hari

### 30.3 Automated Report Generation

**Solution:**

- Generate laporan bulanan dalam format PDF
- Template: branding sekolah, logo, header resmi
- Konten: adoption metrics, academic performance, ROI, satisfaction survey
- Export: PDF, Excel, atau kirim email ke yayasan
- Schedule: auto-generate setiap akhir bulan

**Files touched:**

- `supabase/functions/generate-executive-report/index.ts` — new Edge Function
- `src/features/principal/components/ReportScheduler.tsx` — new component
- `src/features/reports/utils/executiveReportGenerator.ts` — report generation

**Estimasi:** 3 hari

### 30.4 Before-After Analytics

**Solution:**

- Perbandingan data sebelum dan sesudah implementasi LMS
- Metrics: nilai rata-rata, kehadiran, engagement, kepuasan
- Visual: before/after charts, trend lines
- Export untuk presentasi ke yayasan/dinas

**Files touched:**

- `src/features/principal/components/BeforeAfterAnalytics.tsx` — new component
- `src/features/analytics/api/executiveAnalyticsApi.ts` — new API
- `supabase/migrations/030_executive_analytics.sql` — materialized views

**Estimasi:** 3 hari

### 30.5 Satisfaction Survey System

**Solution:**

- Built-in survey untuk guru, siswa, dan orang tua
- Template survey: kepuasan LMS, kemudahan penggunaan, saran perbaikan
- Distribusi: in-app notification, email, WhatsApp
- Hasil: dashboard dengan response rate, score breakdown, trend

**Files touched:**

- `src/features/principal/components/SurveyBuilder.tsx` — new component
- `src/features/principal/components/SurveyResults.tsx` — new component
- `supabase/migrations/030_satisfaction_survey.sql` — survey tables
- `src/features/principal/api/surveyApi.ts` — new API

**Estimasi:** 4 hari

---

## System-Wide Improvements (Parallel dengan semua phase)

### SW.1 Notification Center Enhancement

**Scope:** Semua persona
**Solution:**

- Unified notification system untuk semua role
- Real-time via Supabase Realtime
- Notification types: assignment_due, quiz_result, grade_posted, message_received, system_alert
- Preference settings: email, push, in-app, WhatsApp

**Estimasi:** 3 hari

### SW.2 PWA Enhancement

**Scope:** Semua persona
**Solution:**

- Full PWA support: installable, offline-capable
- Service worker untuk cache static assets
- Background sync untuk submission saat offline
- Push notification support

**Estimasi:** 5 hari

### SW.3 Documentation Update

**Scope:** Semua modul
**Solution:**

- Update dokumentasi untuk 6 modul yang belum terdokumentasi: attendance, auth, creator, lti, profile, settings
- Update USERFLOW.md dengan semua route yang ada
- Update DOMAIN_MAP.md dengan tabel baru (parent, principal, annotations, dll)
- Tambah PRD untuk Parent Portal dan Principal Dashboard

**Estimasi:** 3 hari

### SW.4 Performance Optimization

**Scope:** Semua halaman
**Solution:**

- Implementasi React Suspense boundaries untuk semua lazy-loaded pages
- Code splitting per route
- Image optimization (lazy loading, WebP)
- Database query optimization: tambah index, materialized views

**Estimasi:** 3 hari

---

## Timeline & Dependencies

```
Week 1-2:  Phase 26 (Student UX Improvements)
Week 3-4:  Phase 27 (Teacher UX Improvements)
Week 5-6:  Phase 28 (Admin UX Improvements)
Week 7-9:  Phase 29 (Parent Portal) — P0
Week 10-11: Phase 30 (Principal Dashboard) — P1
Parallel:  System-Wide Improvements (SW.1-SW.4)
```

### Dependency Graph

```
Phase 26 ──────────────────────────────────────────────────────┐
Phase 27 ──────────────────────────────────────────────────────┤
Phase 28 ──────────────────────────────────────────────────────┤──→ Phase 29 (needs Role + RLS from all phases)
Phase 29 ──────────────────────────────────────────────────────┤
Phase 30 ──────────────────────────────────────────────────────┘

SW.1 (Notifications) ──→ Needed by Phase 29.4, 29.5, 29.6
SW.2 (PWA) ────────────→ Needed by Phase 26.3, 29.3
SW.3 (Documentation) ──→ Parallel, update setelah setiap phase
SW.4 (Performance) ────→ Parallel, ongoing optimization
```

---

## Risk Assessment

| Risk                                        | Impact | Probability | Mitigation                                   |
| ------------------------------------------- | ------ | ----------- | -------------------------------------------- |
| WhatsApp API integration delay              | HIGH   | MEDIUM      | Fallback ke email/SMS digest                 |
| PWA compatibility issues                    | MEDIUM | LOW         | Test di browser utama sejak awal             |
| Database migration conflicts                | HIGH   | MEDIUM      | Test migration di staging sebelum production |
| Scope creep di Parent Portal                | HIGH   | HIGH        | Strict adherence to MVP scope                |
| Performance degradation dengan new features | MEDIUM | MEDIUM      | Load testing setelah setiap phase            |
| RLS policy complexity untuk parent          | HIGH   | MEDIUM      | Review security oleh tim sebelum merge       |

---

## Success Metrics

| Metric                       | Target              | Measurement              |
| ---------------------------- | ------------------- | ------------------------ |
| Student quiz completion rate | +15%                | Analytics dashboard      |
| Teacher adoption rate        | +25%                | Admin analytics          |
| Admin user management time   | -50%                | Time tracking survey     |
| Parent registration rate     | 60% dalam 3 bulan   | Parent portal analytics  |
| Principal satisfaction score | 80%+                | Survey system            |
| PWA install rate             | 30% of active users | Service worker analytics |
| Page load time               | <2s (Lighthouse)    | Lighthouse CI            |

---

## Appendix: File Impact Summary

| Phase     | New Files | Modified Files | Migration Files |
| --------- | --------- | -------------- | --------------- |
| 26        | 8         | 12             | 1               |
| 27        | 10        | 15             | 1               |
| 28        | 8         | 18             | 2               |
| 29        | 18        | 8              | 4               |
| 30        | 15        | 6              | 3               |
| SW        | 5         | 20             | 0               |
| **Total** | **64**    | **79**         | **11**          |
