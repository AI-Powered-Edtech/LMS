# Superbatch Perbaikan UX Course Builder (Setara Coursera) Spec

## Why

Course Builder (sisi guru) saat ini sudah fungsional, namun masih memiliki hambatan UX besar di penyusunan silabus, pengaturan kursus, dan konsistensi interaksi. Perbaikan “superbatch” diperlukan agar alur pembuatan kursus menjadi cepat, aman, konsisten, dan terasa matang setara pengalaman instruktur di Coursera.

## What Changes

- Menambah kemampuan edit cepat di sidebar kurikulum (rename modul/lesson tanpa masuk editor).
- Mengizinkan drag-and-drop lesson lintas modul (re-structure curriculum tanpa friksi).
- Mengganti seluruh konfirmasi destruktif dari `confirm()` menjadi modal UI konsisten.
- Melengkapi Course Settings dengan:
  - upload thumbnail/cover course,
  - kontrol status course (draft/published/archived) yang jelas,
  - “danger zone” delete course.
- Menyamakan konsistensi UI (dark mode sidebar, copywriting Indonesia, radius/spacing) agar terasa 1 produk.
- Menambahkan “publish readiness” (validasi + konfirmasi) sebelum publish/unpublish.

## Impact

- Affected specs: UX Guru untuk authoring & publishing kursus.
- Affected code:
  - [CourseBuilder.tsx](file:///workspace/src/pages/CourseBuilder.tsx)
  - [BuilderSidebar.tsx](file:///workspace/src/components/CourseBuilder/BuilderSidebar.tsx)
  - [BuilderTopBar.tsx](file:///workspace/src/components/CourseBuilder/BuilderTopBar.tsx)
  - [LessonBlockEditor.tsx](file:///workspace/src/components/CourseBuilder/LessonBlockEditor.tsx)
  - [CourseSettingsModal.tsx](file:///workspace/src/features/courses/components/CourseSettingsModal.tsx)
  - [Modal.tsx](file:///workspace/src/components/ui/Modal.tsx) (dipakai ulang untuk konfirmasi)
  - [storageService.ts](file:///workspace/src/features/storage/api/storageService.ts) (dipakai untuk upload cover)
  - (DB) `public.courses` menambah kolom cover (lihat detail di Requirements)

## ADDED Requirements

### Requirement: Inline Rename Modul & Lesson

Sistem SHALL memungkinkan guru mengubah nama modul dan lesson langsung dari sidebar kurikulum tanpa berpindah konteks ke editor.

#### Scenario: Success case

- **WHEN** guru mengklik ikon edit (atau double click) pada judul modul di sidebar.
- **THEN** judul modul masuk mode edit, dapat disimpan dengan Enter dan dibatalkan dengan Escape.
- **AND** perubahan tersimpan dan tercermin pada sidebar serta editor.

### Requirement: Drag-and-Drop Lesson Lintas Modul

Sistem SHALL memungkinkan guru memindahkan lesson dari satu modul ke modul lain via drag-and-drop.

#### Scenario: Success case

- **WHEN** guru drag lesson dari Modul A dan drop ke Modul B.
- **THEN** lesson berpindah modul dengan urutan yang benar.
- **AND** state builder dan backend tersinkronisasi (tanpa refresh).

### Requirement: Konfirmasi Destruktif Konsisten

Sistem SHALL menggunakan modal UI (bukan `confirm()`) untuk aksi destruktif: hapus modul, hapus lesson, hapus block.

#### Scenario: Success case

- **WHEN** guru menekan tombol hapus.
- **THEN** modal konfirmasi muncul menampilkan apa yang akan dihapus dan konsekuensinya.
- **AND** aksi hanya dieksekusi jika pengguna menekan tombol konfirmasi.

### Requirement: Course Thumbnail/Cover

Sistem SHALL menyediakan thumbnail/cover untuk course agar kursus mudah dibedakan di daftar dan terasa profesional.

#### Scenario: Success case

- **WHEN** guru mengunggah gambar cover di pengaturan kursus.
- **THEN** file diunggah via `storageService` ke bucket `course-images`.
- **AND** course disimpan dengan `cover_url` (dan opsional `cover_storage_object_id` bila tersedia).
- **AND** daftar course (teacher) menampilkan cover tersebut.

### Requirement: Danger Zone Delete Course

Sistem SHALL menyediakan aksi hapus course untuk guru (dengan konfirmasi) di Course Settings.

#### Scenario: Success case

- **WHEN** guru menekan “Hapus Kursus”.
- **THEN** modal konfirmasi meminta tindakan eksplisit (mis. mengetik judul kursus atau klik konfirmasi).
- **AND** course terhapus via service dan user diarahkan kembali ke halaman kelola materi.

## MODIFIED Requirements

### Requirement: Publish Workflow

Sistem SHALL menambahkan konfirmasi publish/unpublish dan memblokir publish jika syarat minimal belum terpenuhi.

#### Scenario: Success case

- **WHEN** guru menekan tombol “Publikasi”.
- **THEN** sistem menampilkan ringkasan readiness (minimal: ada modul dan ada lesson).
- **AND** setelah konfirmasi, status berubah menjadi `published` dan badge status ter-update.

## REMOVED Requirements

### Requirement: Native Browser Confirm

**Reason**: Tidak kohesif dengan desain modern dan mengganggu UX.
**Migration**: Ganti semua `confirm()` di Course Builder dengan modal UI reuse [Modal.tsx](file:///workspace/src/components/ui/Modal.tsx).
