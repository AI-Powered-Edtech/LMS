# EduSync LMS — Component Library

Daftar shared components dan feature-specific components yang digunakan di EduSync LMS.

## Shared Components (src/components/ui/)

| Component | File         | Digunakan oleh        |
| --------- | ------------ | --------------------- |
| Skeleton  | Skeleton.tsx | Semua feature modules |
| Button    | Button.tsx   | Semua feature modules |
| Modal     | Modal.tsx    | Semua feature modules |
| Card      | Card.tsx     | Semua feature modules |

## Feature-Specific Components

Setiap feature module memiliki komponen spesifik di `src/features/{feature}/components/`:

### administration

- AdministrationSkeleton — Loading skeleton untuk Administrasi
- AdministrationCard — Kartu item Administrasi
- AdministrationTable — Tabel data Administrasi
- AdministrationStats — Statistik Administrasi
- AdministrationPageHeader — Header halaman
- AdministrationEmptyState — Empty state
- AdministrationFilterBar — Bar pencarian
- AdministrationModal — Dialog modal
- AdministrationForm — Form input
- AdministrationDetailView — Detail view

### ai-tutor

- AiTutorSkeleton — Loading skeleton untuk AI Tutor
- AiTutorCard — Kartu item AI Tutor
- AiTutorTable — Tabel data AI Tutor
- AiTutorStats — Statistik AI Tutor
- AiTutorPageHeader — Header halaman
- AiTutorEmptyState — Empty state
- AiTutorFilterBar — Bar pencarian
- AiTutorModal — Dialog modal
- AiTutorForm — Form input
- AiTutorDetailView — Detail view

### analytics

- AnalyticsSkeleton — Loading skeleton untuk Analitik
- AnalyticsCard — Kartu item Analitik
- AnalyticsTable — Tabel data Analitik
- AnalyticsStats — Statistik Analitik
- AnalyticsPageHeader — Header halaman
- AnalyticsEmptyState — Empty state
- AnalyticsFilterBar — Bar pencarian
- AnalyticsModal — Dialog modal
- AnalyticsForm — Form input
- AnalyticsDetailView — Detail view

### announcements

- AnnouncementsSkeleton — Loading skeleton untuk Pengumuman
- AnnouncementsCard — Kartu item Pengumuman
- AnnouncementsTable — Tabel data Pengumuman
- AnnouncementsStats — Statistik Pengumuman
- AnnouncementsPageHeader — Header halaman
- AnnouncementsEmptyState — Empty state
- AnnouncementsFilterBar — Bar pencarian
- AnnouncementsModal — Dialog modal
- AnnouncementsForm — Form input
- AnnouncementsDetailView — Detail view

### assignments

- AssignmentsSkeleton — Loading skeleton untuk Tugas
- AssignmentsCard — Kartu item Tugas
- AssignmentsTable — Tabel data Tugas
- AssignmentsStats — Statistik Tugas
- AssignmentsPageHeader — Header halaman
- AssignmentsEmptyState — Empty state
- AssignmentsFilterBar — Bar pencarian
- AssignmentsModal — Dialog modal
- AssignmentsForm — Form input
- AssignmentsDetailView — Detail view

### calendar

- CalendarSkeleton — Loading skeleton untuk Kalender
- CalendarCard — Kartu item Kalender
- CalendarTable — Tabel data Kalender
- CalendarStats — Statistik Kalender
- CalendarPageHeader — Header halaman
- CalendarEmptyState — Empty state
- CalendarFilterBar — Bar pencarian
- CalendarModal — Dialog modal
- CalendarForm — Form input
- CalendarDetailView — Detail view

### classroom

- ClassroomSkeleton — Loading skeleton untuk Kelas
- ClassroomCard — Kartu item Kelas
- ClassroomTable — Tabel data Kelas
- ClassroomStats — Statistik Kelas
- ClassroomPageHeader — Header halaman
- ClassroomEmptyState — Empty state
- ClassroomFilterBar — Bar pencarian
- ClassroomModal — Dialog modal
- ClassroomForm — Form input
- ClassroomDetailView — Detail view

### courses

- CoursesSkeleton — Loading skeleton untuk Kursus
- CoursesCard — Kartu item Kursus
- CoursesTable — Tabel data Kursus
- CoursesStats — Statistik Kursus
- CoursesPageHeader — Header halaman
- CoursesEmptyState — Empty state
- CoursesFilterBar — Bar pencarian
- CoursesModal — Dialog modal
- CoursesForm — Form input
- CoursesDetailView — Detail view

### dashboards

- DashboardsSkeleton — Loading skeleton untuk Dashboard
- DashboardsCard — Kartu item Dashboard
- DashboardsTable — Tabel data Dashboard
- DashboardsStats — Statistik Dashboard
- DashboardsPageHeader — Header halaman
- DashboardsEmptyState — Empty state
- DashboardsFilterBar — Bar pencarian
- DashboardsModal — Dialog modal
- DashboardsForm — Form input
- DashboardsDetailView — Detail view

### discussions

- DiscussionsSkeleton — Loading skeleton untuk Diskusi
- DiscussionsCard — Kartu item Diskusi
- DiscussionsTable — Tabel data Diskusi
- DiscussionsStats — Statistik Diskusi
- DiscussionsPageHeader — Header halaman
- DiscussionsEmptyState — Empty state
- DiscussionsFilterBar — Bar pencarian
- DiscussionsModal — Dialog modal
- DiscussionsForm — Form input
- DiscussionsDetailView — Detail view

### gamification

- GamificationSkeleton — Loading skeleton untuk Gamifikasi
- GamificationCard — Kartu item Gamifikasi
- GamificationTable — Tabel data Gamifikasi
- GamificationStats — Statistik Gamifikasi
- GamificationPageHeader — Header halaman
- GamificationEmptyState — Empty state
- GamificationFilterBar — Bar pencarian
- GamificationModal — Dialog modal
- GamificationForm — Form input
- GamificationDetailView — Detail view

### gradebook

- GradebookSkeleton — Loading skeleton untuk Buku Nilai
- GradebookCard — Kartu item Buku Nilai
- GradebookTable — Tabel data Buku Nilai
- GradebookStats — Statistik Buku Nilai
- GradebookPageHeader — Header halaman
- GradebookEmptyState — Empty state
- GradebookFilterBar — Bar pencarian
- GradebookModal — Dialog modal
- GradebookForm — Form input
- GradebookDetailView — Detail view

### guidance

- GuidanceSkeleton — Loading skeleton untuk Panduan
- GuidanceCard — Kartu item Panduan
- GuidanceTable — Tabel data Panduan
- GuidanceStats — Statistik Panduan
- GuidancePageHeader — Header halaman
- GuidanceEmptyState — Empty state
- GuidanceFilterBar — Bar pencarian
- GuidanceModal — Dialog modal
- GuidanceForm — Form input
- GuidanceDetailView — Detail view

### lessons

- LessonsSkeleton — Loading skeleton untuk Pelajaran
- LessonsCard — Kartu item Pelajaran
- LessonsTable — Tabel data Pelajaran
- LessonsStats — Statistik Pelajaran
- LessonsPageHeader — Header halaman
- LessonsEmptyState — Empty state
- LessonsFilterBar — Bar pencarian
- LessonsModal — Dialog modal
- LessonsForm — Form input
- LessonsDetailView — Detail view

### moderation

- ModerationSkeleton — Loading skeleton untuk Moderasi
- ModerationCard — Kartu item Moderasi
- ModerationTable — Tabel data Moderasi
- ModerationStats — Statistik Moderasi
- ModerationPageHeader — Header halaman
- ModerationEmptyState — Empty state
- ModerationFilterBar — Bar pencarian
- ModerationModal — Dialog modal
- ModerationForm — Form input
- ModerationDetailView — Detail view

### notifications

- NotificationsSkeleton — Loading skeleton untuk Notifikasi
- NotificationsCard — Kartu item Notifikasi
- NotificationsTable — Tabel data Notifikasi
- NotificationsStats — Statistik Notifikasi
- NotificationsPageHeader — Header halaman
- NotificationsEmptyState — Empty state
- NotificationsFilterBar — Bar pencarian
- NotificationsModal — Dialog modal
- NotificationsForm — Form input
- NotificationsDetailView — Detail view

### onboarding

- OnboardingSkeleton — Loading skeleton untuk Onboarding
- OnboardingCard — Kartu item Onboarding
- OnboardingTable — Tabel data Onboarding
- OnboardingStats — Statistik Onboarding
- OnboardingPageHeader — Header halaman
- OnboardingEmptyState — Empty state
- OnboardingFilterBar — Bar pencarian
- OnboardingModal — Dialog modal
- OnboardingForm — Form input
- OnboardingDetailView — Detail view

### progress

- ProgressSkeleton — Loading skeleton untuk Kemajuan Belajar
- ProgressCard — Kartu item Kemajuan Belajar
- ProgressTable — Tabel data Kemajuan Belajar
- ProgressStats — Statistik Kemajuan Belajar
- ProgressPageHeader — Header halaman
- ProgressEmptyState — Empty state
- ProgressFilterBar — Bar pencarian
- ProgressModal — Dialog modal
- ProgressForm — Form input
- ProgressDetailView — Detail view

### question-bank

- QuestionBankSkeleton — Loading skeleton untuk Bank Soal
- QuestionBankCard — Kartu item Bank Soal
- QuestionBankTable — Tabel data Bank Soal
- QuestionBankStats — Statistik Bank Soal
- QuestionBankPageHeader — Header halaman
- QuestionBankEmptyState — Empty state
- QuestionBankFilterBar — Bar pencarian
- QuestionBankModal — Dialog modal
- QuestionBankForm — Form input
- QuestionBankDetailView — Detail view

### quizzes

- QuizzesSkeleton — Loading skeleton untuk Kuis
- QuizzesCard — Kartu item Kuis
- QuizzesTable — Tabel data Kuis
- QuizzesStats — Statistik Kuis
- QuizzesPageHeader — Header halaman
- QuizzesEmptyState — Empty state
- QuizzesFilterBar — Bar pencarian
- QuizzesModal — Dialog modal
- QuizzesForm — Form input
- QuizzesDetailView — Detail view

### recommendations

- RecommendationsSkeleton — Loading skeleton untuk Rekomendasi
- RecommendationsCard — Kartu item Rekomendasi
- RecommendationsTable — Tabel data Rekomendasi
- RecommendationsStats — Statistik Rekomendasi
- RecommendationsPageHeader — Header halaman
- RecommendationsEmptyState — Empty state
- RecommendationsFilterBar — Bar pencarian
- RecommendationsModal — Dialog modal
- RecommendationsForm — Form input
- RecommendationsDetailView — Detail view

### reports

- ReportsSkeleton — Loading skeleton untuk Laporan
- ReportsCard — Kartu item Laporan
- ReportsTable — Tabel data Laporan
- ReportsStats — Statistik Laporan
- ReportsPageHeader — Header halaman
- ReportsEmptyState — Empty state
- ReportsFilterBar — Bar pencarian
- ReportsModal — Dialog modal
- ReportsForm — Form input
- ReportsDetailView — Detail view

### storage

- StorageSkeleton — Loading skeleton untuk Penyimpanan
- StorageCard — Kartu item Penyimpanan
- StorageTable — Tabel data Penyimpanan
- StorageStats — Statistik Penyimpanan
- StoragePageHeader — Header halaman
- StorageEmptyState — Empty state
- StorageFilterBar — Bar pencarian
- StorageModal — Dialog modal
- StorageForm — Form input
- StorageDetailView — Detail view

### struggle

- StruggleSkeleton — Loading skeleton untuk Deteksi Kesulitan
- StruggleCard — Kartu item Deteksi Kesulitan
- StruggleTable — Tabel data Deteksi Kesulitan
- StruggleStats — Statistik Deteksi Kesulitan
- StrugglePageHeader — Header halaman
- StruggleEmptyState — Empty state
- StruggleFilterBar — Bar pencarian
- StruggleModal — Dialog modal
- StruggleForm — Form input
- StruggleDetailView — Detail view

## Dark Mode Support

Semua komponen mendukung dark mode melalui Tailwind CSS `dark:` variants.

## Skeleton Loading

Semua feature menggunakan skeleton loading dari `src/components/ui/Skeleton.tsx`.

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
