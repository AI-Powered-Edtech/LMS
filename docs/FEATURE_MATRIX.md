# EduSync LMS — Feature Access Matrix

Matriks akses fitur per role (Student, Teacher, Admin, Parent, Principal) untuk semua 49 feature module.

## Role Permissions

| Feature         | Student | Teacher    | Admin | Parent | Principal | Deskripsi         |
| --------------- | ------- | ---------- | ----- | ------ | --------- | ----------------- |
| administration  | —       | Read       | Full  | —      | Read      | Administrasi      |
| ai-tutor        | Read    | Read       | Read  | —      | —         | AI Tutor          |
| analytics       | Read    | Read       | Full  | —      | Full      | Analitik          |
| announcements   | Read    | Read/Write | Full  | Read   | Read      | Pengumuman        |
| assignments     | Read    | Read/Write | Full  | Read   | Read      | Tugas             |
| attendance      | Read    | Read/Write | Full  | Read   | Read      | Kehadiran         |
| auth            | Full    | Full       | Full  | Full   | Full      | Autentikasi       |
| calendar        | Read    | Read/Write | Full  | Read   | Read      | Kalender          |
| classroom       | Read    | Read/Write | Full  | —      | Read      | Kelas             |
| courses         | Read    | Read/Write | Full  | —      | Read      | Kursus            |
| creator         | —       | Read/Write | Full  | —      | —         | AI Content        |
| dashboards      | Read    | Read       | Full  | Read   | Full      | Dashboard         |
| discussions     | Read    | Read/Write | Full  | —      | Read      | Diskusi           |
| gamification    | Read    | Read       | Full  | —      | Read      | Gamifikasi        |
| gradebook       | Read    | Read/Write | Full  | Read   | Read      | Buku Nilai        |
| guidance        | Read    | Read       | Full  | —      | Read      | Panduan           |
| lessons         | Read    | Read/Write | Full  | —      | —         | Pelajaran         |
| lti             | —       | —          | Full  | —      | —         | LTI Integration   |
| moderation      | —       | Read       | Full  | —      | Read      | Moderasi          |
| notifications   | Read    | Read       | Full  | Read   | Read      | Notifikasi        |
| onboarding      | Read    | Read       | Full  | Read   | Read      | Onboarding        |
| parent          | —       | —          | —     | Full   | —         | Portal Orang Tua  |
| principal       | —       | —          | —     | —      | Full      | Dashboard Kepsek  |
| profile         | Read    | Read       | Read  | Read   | Read      | Profil            |
| progress        | Read    | Read/Write | Full  | Read   | Read      | Kemajuan Belajar  |
| question-bank   | —       | Read/Write | Full  | —      | —         | Bank Soal         |
| quizzes         | Read    | Read/Write | Full  | —      | —         | Kuis              |
| recommendations | Read    | Read       | Full  | —      | Read      | Rekomendasi       |
| reports         | —       | Read       | Full  | Read   | Full      | Laporan           |
| settings        | Read    | Read       | Read  | Read   | Read      | Pengaturan        |
| storage         | Read    | Read/Write | Full  | —      | —         | Penyimpanan       |
| struggle        | —       | Read/Write | Full  | —      | Read      | Deteksi Kesulitan |

**Legend:**

- `—` = Not accessible for this role
- `Read` = View-only access
- `Read/Write` = Can create and edit
- `Full` = Full administrative access

## Tenant Isolation

Semua feature di atas memiliki tenant isolation melalui PostgreSQL RLS. Data antar tenant tidak bisa diakses silang.

## Feature Flags

Feature flags dikelola melalui modul **administration** di tabel `tenant_modules`. Admin bisa mengaktifkan/menonaktifkan fitur per tenant.

## Route Structure

| Role      | Route Prefix        | Key Pages                                                                                        |
| --------- | ------------------- | ------------------------------------------------------------------------------------------------ |
| Student   | `/#/app/student/`   | dashboard, courses, quizzes, assignments, classes, grades, attendance, gamification, leaderboard |
| Teacher   | `/#/app/teacher/`   | dashboard, courses, course-builder, quiz-manager, gradebook, grader, analytics, classes          |
| Admin     | `/#/app/admin/`     | dashboard, users, billing, moderation, analytics, system-health, feature-flags                   |
| Parent    | `/#/app/parent/`    | dashboard, nilai, kehadiran, pesan, laporan                                                      |
| Principal | `/#/app/principal/` | dashboard, analytics, report, survey                                                             |
| Shared    | `/#/`               | forum, profile, settings, calendar, announcements, notifications                                 |
