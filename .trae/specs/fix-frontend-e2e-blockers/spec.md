# Perbaikan Blocker End-to-End (E2E) Frontend Spec

## Why
Terdapat beberapa masalah (blocker) yang menghambat proses menjalankan dan menguji aplikasi frontend secara end-to-end (E2E). Masalah ini mencakup error ESLint/TypeScript yang membuat proses build gagal, serta beberapa pengujian Playwright (khususnya alur login) yang gagal berjalan atau gagal divalidasi dengan benar. Semua blocker ini harus diselesaikan agar seluruh flow fitur dapat diuji secara otomatis dan menyeluruh.

## What Changes
- Memperbaiki semua masalah linter (khususnya `simple-import-sort/imports`) di seluruh basis kode frontend sehingga `pnpm build` dan `pnpm run validate` dapat berjalan dengan sukses.
- Menyelesaikan instalasi dependensi Playwright yang tertunda atau tidak lengkap.
- Memperbaiki pengujian E2E yang gagal, termasuk pada file `tests/e2e/login.spec.ts` (seperti pesan error koneksi yang tidak sesuai dan interaksi klik yang gagal).
- Memastikan semua konfigurasi E2E dapat dijalankan tanpa error environment.

## Impact
- Affected specs: Pengujian E2E Playwright, CI/CD Pipeline (Build & Validate).
- Affected code: File konfigurasi, kode sumber frontend dengan masalah linter, dan file pengujian di dalam folder `tests/e2e/`.

## ADDED Requirements
### Requirement: Pengujian E2E Playwright Lulus
Sistem SHALL memastikan seluruh skenario pengujian E2E dengan Playwright berjalan sukses (passed) tanpa error environment atau UI mismatch.

#### Scenario: Validasi Pesan Error Login
- **WHEN** pengujian menyimulasikan kegagalan koneksi jaringan saat login
- **THEN** UI harus menampilkan pesan error "Gagal terhubung ke server" sesuai ekspektasi pengujian

## MODIFIED Requirements
### Requirement: Validasi Linter & Build Sukses
Kode frontend SHALL lulus pengecekan linter dan TypeScript tanpa error, serta berhasil di-build tanpa peringatan kritis.
