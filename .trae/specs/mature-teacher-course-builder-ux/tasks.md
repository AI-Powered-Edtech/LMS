# Tasks
- [x] Task 1: Fondasi UX (Modal Konfirmasi Konsisten)
  - [x] SubTask 1.1: Buat komponen confirm modal reuse [Modal.tsx](file:///workspace/src/components/ui/Modal.tsx) (title, description, confirm/cancel).
  - [x] SubTask 1.2: Ganti `confirm()` pada [BuilderSidebar.tsx](file:///workspace/src/components/CourseBuilder/BuilderSidebar.tsx) untuk hapus modul dan hapus lesson.
  - [x] SubTask 1.3: Ganti `confirm()` pada [LessonBlockEditor.tsx](file:///workspace/src/components/CourseBuilder/LessonBlockEditor.tsx) untuk hapus block.

- [x] Task 2: Perbaikan Silabus (Sidebar Curriculum Maturity)
  - [x] SubTask 2.1: Tambah inline rename modul (edit in-place) di sidebar, memanggil `actions.updateModule`.
  - [x] SubTask 2.2: Tambah inline rename lesson di sidebar, memanggil `actions.updateLesson`.
  - [x] SubTask 2.3: Implementasi drag-and-drop lesson lintas modul:
    - [x] Update handler DND agar mendeteksi `source.droppableId` dan `destination.droppableId`.
    - [x] Tambah action/service untuk memindahkan lesson ke modul lain (update `module_id` + reorder).
  - [x] SubTask 2.4: Samakan dark mode di sidebar (tambahkan class `dark:` selaras dengan editor).
  - [x] SubTask 2.5: Lokalisasi copywriting (hapus string Inggris seperti “New …”, “Delete …”).

- [x] Task 3: Course Settings “Coursera-level”
  - [x] SubTask 3.1: Tambah section Cover/Thumbnail upload di [CourseSettingsModal.tsx](file:///workspace/src/features/courses/components/CourseSettingsModal.tsx) menggunakan [storageService.ts](file:///workspace/src/features/storage/api/storageService.ts).
  - [x] SubTask 3.2: Tambah Danger Zone delete course (konfirmasi modal + redirect).
  - [x] SubTask 3.3: Standarisasi input subject menjadi dropdown/combobox sederhana berbasis daftar subject yang sudah ada (fallback: teks bila kosong).
  - [x] SubTask 3.4: Tambah kontrol status course (draft/published/archived) yang selaras dengan badge status di [BuilderTopBar.tsx](file:///workspace/src/components/CourseBuilder/BuilderTopBar.tsx).

- [x] Task 4: Publish Readiness \u0026 Poles
  - [x] SubTask 4.1: Tambah konfirmasi publish/unpublish di [BuilderTopBar.tsx](file:///workspace/src/components/CourseBuilder/BuilderTopBar.tsx) menggunakan confirm modal.
  - [x] SubTask 4.2: Tambah “publish checklist” singkat (mis. modul \u003e 0, lesson \u003e 0) sebelum final publish.
  - [x] SubTask 4.3: Seragamkan radius/spacing pada builder shell agar tidak kontras antara sidebar vs editor.

- [x] Task 5: Data \u0026 DB (Cover Support)
  - [x] SubTask 5.1: Tambah kolom pada `public.courses`:
    - `cover_url text null`
    - `cover_storage_object_id uuid null references public.storage_objects(id) on delete set null` (jika tabel tersedia)
  - [x] SubTask 5.2: Update type `Course` agar memuat `status`, `published_at`, `cover_url`, `cover_storage_object_id`.
  - [x] SubTask 5.3: Pastikan API `courseService.getCourseById`/`updateCourse` menyertakan field baru ini.

- [x] Task 6: Verifikasi E2E (Guru)
  - [x] SubTask 6.1: Jalankan build + typecheck + lint.
  - [x] SubTask 6.2: Uji manual flow guru:
    - Buat course \u2192 set cover \u2192 tambah modul \u2192 rename modul \u2192 tambah lesson \u2192 rename lesson \u2192 pindah lesson antar modul \u2192 tambah block \u2192 hapus (via modal) \u2192 publish (via konfirmasi).

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 1, Task 2
- Task 5 depends on Task 3
- Task 6 depends on Task 1, Task 2, Task 3, Task 4, Task 5
