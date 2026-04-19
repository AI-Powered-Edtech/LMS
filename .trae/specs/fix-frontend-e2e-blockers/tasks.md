# Tasks

- [x] Task 1: Perbaiki error Linter (ESLint) pada codebase frontend
  - [x] SubTask 1.1: Identifikasi semua error linter yang menyebabkan build gagal (contohnya `simple-import-sort/imports`).
  - [x] SubTask 1.2: Perbaiki masalah linter dengan menjalankan perintah fix atau melakukan modifikasi manual.
  - [x] SubTask 1.3: Pastikan perintah `pnpm run lint` dan `pnpm build` dapat berjalan sukses tanpa error.

- [x] Task 2: Pastikan dependensi Playwright (browser engines) terinstal sepenuhnya
  - [x] SubTask 2.1: Selesaikan instalasi browser engines untuk Playwright (`npx playwright install --with-deps`).
  - [x] SubTask 2.2: Pastikan tidak ada pesan error `Executable doesn't exist` saat menjalankan pengujian.

- [x] Task 3: Selesaikan error pada pengujian E2E (`tests/e2e/login.spec.ts`)
  - [x] SubTask 3.1: Periksa alasan pengujian gagal saat simulasi login gagal karena jaringan (harapan `Gagal terhubung ke server`).
  - [x] SubTask 3.2: Sesuaikan teks error pada file tes (`tests/e2e/login.spec.ts`) atau komponen UI terkait (misal `src/pages/Login.tsx`) agar sinkron.
  - [x] SubTask 3.3: Perbaiki error pengujian `should click teacher demo button` yang gagal/time-out.

- [x] Task 4: Validasi seluruh pengujian E2E dan proses validasi
  - [x] SubTask 4.1: Jalankan ulang `pnpm run validate` (typecheck, lint, test:ci) dan pastikan lolos.
  - [x] SubTask 4.2: Jalankan `npx playwright test tests/e2e` dan pastikan semua skenario lulus (passed).

# Task Dependencies
- Task 2 dan Task 3 bergantung pada Task 1 (Build harus sukses terlebih dahulu).
- Task 4 bergantung pada semua Task sebelumnya.
