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
