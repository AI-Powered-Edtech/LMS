# Rencana Perbaikan Issue API di Fitur Courses

## Ringkasan (Summary)
Rencana ini bertujuan untuk memperbaiki implementasi panggilan API (`apiFetch`) di seluruh fitur **Courses** yang sebelumnya keliru akibat konversi dari `supabase-js`. Sebagian besar operasi CRUD (*Create, Read, Update, Delete*) saat ini hanya memanggil `apiFetch('/nama_tabel')` tanpa menyertakan HTTP Method (`POST`, `PATCH`, `DELETE`), parameter URL (seperti ID), maupun *payload* (body). Perbaikan ini akan memastikan integrasi antara *frontend* dan *backend* (VIL Rust) berjalan dengan lancar.

## Analisis Kondisi Saat Ini (Current State Analysis)
- File-file service di `src/features/courses/api/` dan `src/features/courses/api/builder/` berisi fungsi-fungsi yang mengabaikan parameter *input* dan memanggil `apiFetch('/courses')` (yang secara default adalah metode `GET`).
- Parameter *update* (misalnya variabel `dbUpdate` atau `updates`) diinisialisasi namun tidak pernah dikirim ke *backend*.
- Beberapa komponen seperti `CourseSettingsModal.tsx` melakukan pemanggilan `apiFetch` secara langsung dengan pola yang salah.
- Pemanggilan API ke *backend* VIL Rust diasumsikan mengikuti standar RESTful dengan *prefix* `/v1/` (misalnya `/api/v1/courses`).

## Perubahan yang Diajukan (Proposed Changes)

1. **Refaktor `src/features/courses/api/courseService.ts`**
   - `fetchCourses`: Ubah parameter kueri ke URL string (misal `?search=...&limit=...`).
   - `getCourseById`: Gunakan `apiFetch(\`/v1/courses/${courseId}\`)`.
   - `createCourse`: Gunakan `method: 'POST'` dan sertakan `body: JSON.stringify(courseData)`.
   - `updateCourse`: Gunakan `method: 'PATCH'` pada URL `/v1/courses/${courseId}` dan sertakan `body`.
   - `deleteCourse`: Gunakan `method: 'DELETE'` pada URL `/v1/courses/${courseId}`.

2. **Refaktor Service di `src/features/courses/api/builder/`**
   - **`courseService.ts`**: Perbaiki `fetchCourseStructure`, `draftCourse`, `submitForReview`, `approveCourse` agar mengirim permintaan ke *endpoint* spesifik (`POST /v1/courses/${courseId}/...`).
   - **`moduleService.ts`**: Perbaiki `createModule`, `updateModule` (`PATCH`), dan `deleteModule` (`DELETE`). Sertakan `body` data yang sesuai.
   - **`lessonService.ts`**: Perbaiki `createLesson`, `updateLesson`, `deleteLesson` agar menggunakan parameter URL dan HTTP Method yang benar.
   - **`blockService.ts`**: Perbaiki `fetchLessonBlocks`, `createBlock`, `updateBlock`, `deleteBlock` menggunakan URL `/v1/lesson_resources`.
   - **`quizBuilderService.ts`**: Perbaiki `getQuizByLesson` agar menyertakan `lessonId` di URL. Perbaiki `publishQuiz` dan `draftQuiz` agar memanggil URL spesifik quiz dengan metode `POST` atau `PATCH`.
   - **`collaboratorService.ts`**: Perbaiki `fetchCollaborators`, `addCollaborator`, `removeCollaborator` dengan URL RESTful yang tepat.
   - **`assignmentBuilderService.ts`**: Perbaiki `getAssignmentByLesson` dan `saveAssignmentData`.

3. **Perbaikan Komponen dan File Lain**
   - **`CourseSettingsModal.tsx`**: Ganti pemanggilan mentah `apiFetch('/courses')` menggunakan fungsi service yang sudah diperbaiki, atau sertakan *method* dan URL yang benar (`/v1/courses/${courseId}`).
   - **`templateService.ts` & `versionService.ts`**: Pastikan URL memiliki *prefix* `/v1/` untuk mencocokkan konvensi API lokal.
   - **`useBuilderChannel.ts`**: Hapus impor `apiFetch` yang tidak terpakai.

## Asumsi & Keputusan (Assumptions & Decisions)
- Diasumsikan VIL Rust REST API menangani konvensi URL standar: `/api/v1/courses`, `/api/v1/course_modules`, `/api/v1/lessons`, `/api/v1/lesson_resources`, dll.
- Pembaruan sebagian data (*partial update*) akan menggunakan HTTP Method `PATCH`.
- Parameter `tenantId` (dan parameter *query* lainnya jika dibutuhkan) akan diteruskan melalui URL *query string* (misal `?tenant_id=...`).

## Langkah Verifikasi (Verification Steps)
1. Periksa hasil kompilasi *frontend* (`pnpm build` atau ekivalen) untuk memastikan tidak ada masalah *type-checking*.
2. Jalankan *linter* untuk memastikan perbaikan *import* tidak meninggalkan peringatan.
3. Tinjau file yang diubah untuk memastikan tidak ada pemanggilan `apiFetch('/table')` polos tanpa ID (untuk metode mutasi) atau tanpa metode HTTP yang tepat.