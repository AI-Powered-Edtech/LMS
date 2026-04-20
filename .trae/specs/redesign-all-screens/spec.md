# Redesign All Screens Spec

## Why
Antarmuka dan pengalaman pengguna (UI/UX) saat ini perlu ditingkatkan agar lebih intuitif, modern, dan mudah digunakan oleh seluruh persona pengguna (Guru, Siswa, Orang Tua, dan Admin). Desain yang konsisten, berpusat pada pengguna, dan memiliki estetika visual yang kuat akan meningkatkan efisiensi operasional dan kepuasan pengguna dalam menggunakan LMS EduSync.

## What Changes
- Mendesain ulang dashboard utama untuk persona Guru (`TeacherDashboard.tsx`), Siswa (`Dashboard.tsx`), dan Admin (`AdministrationDashboard.tsx`).
- Memperbarui alur masuk pengguna, termasuk halaman Login (`Login.tsx`) dan Pemilihan Ruang Kerja (`WorkspaceSelector.tsx`).
- Menerapkan prinsip desain dari panduan `frontend-design` dan `frontend-skill`: komposisi yang bersih (minimalis namun elegan), hierarki visual yang kuat, tipografi yang berkarakter, dan interaksi/motion yang halus.
- Mengurangi elemen UI yang tidak perlu (mengganti desain *card-heavy* dengan *layout-driven*) untuk mengurangi *cognitive load*.
- Memastikan responsivitas dan aksesibilitas di semua ukuran layar (mobile, tablet, desktop).

## Impact
- Affected specs: UI/UX dari seluruh aplikasi, khususnya *entry flow* dan dashboard utama.
- Affected code: File-file di dalam `src/pages/` (seperti `TeacherDashboard.tsx`, `Dashboard.tsx`, `AdministrationDashboard.tsx`, `Login.tsx`, `WorkspaceSelector.tsx`) dan komponen UI terkait.

## ADDED Requirements
### Requirement: Estetika Visual Premium dan Fungsional
Sistem SHALL menyediakan antarmuka yang modern, premium, dan fungsional, membedakan antara kebutuhan utilitas (admin/guru) dan pengalaman belajar (siswa).

#### Scenario: Pengalaman Dashboard yang Fokus
- **WHEN** pengguna masuk ke dashboard mereka
- **THEN** mereka akan melihat informasi metrik/status yang paling relevan dengan hierarki visual yang jelas, didukung oleh animasi transisi yang elegan dan tanpa elemen dekoratif yang mengganggu fokus.

## MODIFIED Requirements
### Requirement: Konsistensi Desain Antar Persona
Seluruh halaman dashboard SHALL mematuhi bahasa desain yang konsisten, namun tetap dioptimalkan untuk tugas spesifik masing-masing persona (misal: operasional untuk admin, manajerial untuk guru, dan gamifikasi/progres untuk siswa).