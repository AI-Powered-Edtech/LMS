# Rencana Perbaikan Fitur Courses (Fix All Issues in Courses)

## Summary
Rencana ini bertujuan untuk memperbaiki semua masalah (issues) yang ada di dalam fitur **Courses** (`src/features/courses/` dan halaman terkait). Berdasarkan analisis codebase, fitur Courses saat ini memiliki beberapa masalah kritis terkait TypeScript, sisa-sisa migrasi API (seperti error 404 pada pemanggilan API yang belum terstandarisasi), serta masalah *type safety* pada data model. Perbaikan ini akan memastikan fitur Courses siap untuk *production* tanpa adanya error saat di-build atau dijalankan.

## Current State Analysis
- **API Endpoints (404 Errors)**: Masih terdapat beberapa file di dalam `src/features/courses/api/builder/` yang melakukan pemanggilan API menggunakan sintaks PostgREST lama (misal `apiFetch('/assignments?lesson_id=eq...')`). Karena fungsi `apiFetch` secara otomatis menambahkan prefix `/api`, pemanggilan ini menghasilkan URL `/api/assignments?...` yang berujung pada error 404 (Not Found).
- **TypeScript Errors (Strict Mode)**: Terdapat penggunaan tipe `any`, `unknown`, dan *type casting* paksa yang kotor (misalnya `course as Course & { modules?: unknown[] }` di `CourseCard.tsx`).
- **Unused Variables**: Beberapa parameter seperti `tenantId` dideklarasikan di parameter fungsi API tetapi tidak pernah digunakan di dalam *body* fungsi, memicu peringatan/error *linter*.
- **Data Mapping Issues**: Pada `courseService.ts` di folder builder, terdapat pemetaan data yang memaksa nilai `description: null` untuk modul, yang berpotensi menyebabkan hilangnya data deskripsi saat ditampilkan di UI.

## Proposed Changes

### 1. Standarisasi API Endpoints di Builder Services
Memperbaiki seluruh file service di `src/features/courses/api/builder/` agar menggunakan endpoint RESTful yang benar dengan *prefix* `/v1/` dan metode HTTP yang tepat (GET, POST, PATCH, DELETE).
- **`blockService.ts`**: Ubah pemanggilan `GET /lesson_resources?lesson_id=eq...` menjadi format REST `/v1/lesson_resources?lesson_id=...`. Perbaiki fungsi `createBlock`, `updateBlock`, dan `deleteBlock` agar menyertakan parameter URL dan *body* JSON yang tepat.
- **`quizBuilderService.ts`**: Ubah pemanggilan `GET /quizzes?lesson_id=eq...` menjadi format REST `/v1/quizzes?lesson_id=...`. Perbaiki fungsi `publishQuiz` dan `draftQuiz` agar menggunakan metode `PATCH`. Hapus pengecekan error `PGRST116` yang kotor.
- **`assignmentBuilderService.ts`**: Ubah pemanggilan `GET /assignments?lesson_id=eq...` menjadi format REST `/v1/assignments?lesson_id=...`. Perbaiki logika `saveAssignmentData` untuk menggunakan `POST` atau `PATCH` berdasarkan ketersediaan ID.
- **`collaboratorService.ts`**: Ubah endpoint `/course_collaborators` menjadi `/v1/course_collaborators`.

### 2. Perbaikan TypeScript Types & Casting
- **`src/features/courses/types/index.ts`**: Perbarui interface `Course` untuk menyertakan properti opsional `modules?: any[]` (atau tipe modul yang lebih spesifik) dan `module_count?: number` agar tidak perlu melakukan *type casting* paksa di komponen UI.
- **`src/pages/Courses.tsx`**: Hapus *type casting* kotor pada variabel `moduleCount` di komponen `CourseCard` setelah interface `Course` diperbarui. Pastikan pemisahan *type imports* (menggunakan `import type`).
- **`src/features/courses/api/builder/courseService.ts`**: Ganti penggunaan tipe `any` dan `unknown` dengan antarmuka yang tepat (misal `DomainCourse`, `DomainModule`). Perbaiki pemetaan data agar tidak memaksa `description: null`.

### 3. Pembersihan Unused Variables & Linter Warnings
- Tambahkan *underscore* (`_`) pada parameter yang tidak terpakai di seluruh file service (contoh: ubah `tenantId: string` menjadi `_tenantId: string`) untuk menghindari error `no-unused-vars` dari TypeScript/ESLint.
- Hapus semua *import* yang tidak terpakai di file-file komponen dan service.

## Assumptions & Decisions
- Perbaikan API ini mengasumsikan bahwa backend (baik itu VIL Rust atau Deno Edge Functions) mendukung format RESTful dengan *prefix* `/v1/` untuk fitur *builder* (misal `/v1/lesson_resources`, `/v1/quizzes`, `/v1/assignments`).
- Pembersihan *type casting* akan dilakukan dengan menambahkan properti opsional pada interface utama (`Course`) daripada membuat *mapped types* yang rumit di setiap komponen.
- Jika ada endpoint yang masih menghasilkan 404 setelah perbaikan ini, hal tersebut berada di luar cakupan *frontend* dan memerlukan perbaikan di sisi *routing backend*.

## Verification Steps
1. Jalankan `pnpm tsc --noEmit` untuk memastikan tidak ada lagi error TypeScript di direktori `src/features/courses/` dan `src/pages/`.
2. Jalankan `pnpm lint` untuk memverifikasi bahwa tidak ada *warning* terkait variabel atau *import* yang tidak terpakai.
3. Lakukan pengujian manual (atau jalankan pengujian E2E) pada fitur Course Builder untuk memastikan operasi CRUD (Create, Read, Update, Delete) pada modul, materi, kuis, dan tugas berjalan tanpa error 404.