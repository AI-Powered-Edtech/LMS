# Analisis UI/UX Course Builder (Sisi Guru) Spec

## Why
Fitur pembuatan kursus (Course Builder) dari sisi guru saat ini dirasakan masih berada pada tahap awal (pembangunan fitur fungsional dasar) dan belum mencapai tingkat kematangan produk yang ideal. Analisis menyeluruh terhadap UI, UX, dan alur (flow) pembuatan materi sangat diperlukan untuk mengidentifikasi hambatan pengguna (friction points), inkonsistensi desain, dan area perbaikan agar fitur ini setara dengan platform LMS profesional (seperti Udemy, Teachable, atau Coursera untuk Instruktur).

## What Changes
- Melakukan audit UI/UX pada keseluruhan modul *Course Builder*.
- Menganalisis alur pengguna (*user flow*) mulai dari inisiasi kursus baru, pengaturan silabus (Modul dan Pelajaran), penulisan konten/materi (*Block Editor*), hingga pengaturan kuis/tugas dan publikasi.
- Menghasilkan dokumen laporan analisis komprehensif yang berisi evaluasi status saat ini, identifikasi *pain points*, dan rekomendasi perbaikan desain serta alur.

## Impact
- Affected specs: Pengalaman Pengguna (UX) Guru dalam mengelola materi pembelajaran.
- Affected code:
  - `src/features/courses/components/builder/*`
  - `src/pages/CourseBuilder.tsx` (atau halaman terkait)
  - `docs/teacher-course-builder-ux-analysis.md` (Dokumen laporan baru yang akan dibuat)

## ADDED Requirements
### Requirement: Laporan Analisis Kematangan Fitur Builder
Sistem (melalui agen) HARUS menyediakan evaluasi objektif mengenai antarmuka dan alur pembuatan kursus.

#### Scenario: Success case
- **WHEN** agen meninjau struktur kode dan antarmuka komponen pembangun kursus (*Course Builder*).
- **THEN** sebuah laporan Markdown yang terstruktur dihasilkan, merinci kelebihan, kelemahan, dan rekomendasi perbaikan spesifik untuk UI dan UX dari sisi instruktur/guru.
