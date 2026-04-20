# Remove All Mocks & Switch to Real Backend Spec

## Why
Untuk memastikan seluruh fitur (seperti otentikasi, pembuatan materi guru, hingga siswa mengerjakan kuis/tugas) di EduSync LMS bersifat production-grade. Penggunaan data buatan (mock data) dan Mock Service Worker (MSW) menghambat pengujian yang akurat dan mensimulasikan lingkungan yang tidak realistis, yang mengarah ke bug ketika aplikasi dihubungkan dengan API nyata.

## What Changes
- Menghapus folder `src/mocks` dan seluruh filenya secara permanen.
- **BREAKING**: Menghapus `msw` (Mock Service Worker) dari `package.json` dan `src/main.tsx`.
- Memastikan semua konfigurasi API di `vilApiClient` dan modul klien lainnya terhubung secara langsung ke *backend URL* yang asli.
- Membuat akun demo riil (bukan *hardcoded mock* di sisi klien) untuk Guru dan Siswa melalui registrasi Supabase Auth atau *seeding script* langsung ke basis data.
- Menguji seluruh alur End-to-End dengan akun guru dan siswa yang riil.

## Impact
- Affected specs: Fitur Auth, Manajemen Kursus (Guru), dan Smart Player (Siswa).
- Affected code: `src/main.tsx`, `package.json`, `src/mocks/*`, `vite.config.ts`, dan file lain yang mereferensikan *mock setup*.

## REMOVED Requirements
### Requirement: Mock Service Worker (MSW)
**Reason**: Klien menginginkan 0% *mock* dan aplikasi 100% menggunakan *real backend* dengan kualitas *production-grade*.
**Migration**: Menghapus inisialisasi `worker.start()` dan mengandalkan panggilan jaringan API standar.

## MODIFIED Requirements
### Requirement: Demo Accounts
Akun demo harus dibuat sebagai *real user* di basis data (Supabase/VIL). Semua relasi (seperti Guru mendaftarkan kursus, Siswa mengerjakan kuis di kelas tersebut) harus menggunakan *foreign key* yang sah di *backend*.
