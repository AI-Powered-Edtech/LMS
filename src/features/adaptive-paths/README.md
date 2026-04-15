# Modul Adaptive Learning Paths (Phase 31B)

Modul ini mengimplementasikan jalur belajar adaptif untuk EduSync LMS. Guru dapat mendefinisikan aturan yang mengarahkan siswa ke materi tambahan (remedial) atau materi lanjutan berdasarkan performa mereka.

## Fitur

- **Aturan Jalur** (`learning_path_rules`): Kondisi berbasis skor kuis, waktu belajar, atau status penyelesaian pelajaran yang menentukan pelajaran berikutnya bagi setiap siswa.
- **Pelajaran Remedial**: Pelajaran yang ditandai `is_remedial = true` dapat direkomendasikan tanpa memblokir jalur utama.
- **Evaluasi Adaptif**: RPC `evaluate_next_lesson` mengevaluasi aturan di sisi server (sumber kebenaran). Evaluasi klien tersedia hanya untuk preview di builder.
- **Banner Remedial**: Ditampilkan di viewer pelajaran ketika navigasi adaptif merekomendasikan materi tambahan.

## Struktur

```
adaptive-paths/
├── api/              ← adaptivePathService (API calls)
├── queries/          ← React Query hooks + cache keys
├── components/       ← PathConditionPicker, PathRuleCard, PathRuleEditor, PathRuleList, RemedialBanner
├── utils/            ← pathEvaluator (client-side preview only)
├── types/            ← TypeScript interfaces
├── __tests__/        ← Vitest unit tests
└── index.ts          ← Public barrel exports
```

## Integrasi

- **CourseSettingsModal**: Tab "Alur Pembelajaran" menggunakan `PathRuleList`.
- **LessonBottomNav**: Menampilkan `RemedialBanner` jika `adaptiveReason` tersedia.
- **useLessonViewerState**: Memanggil `evaluateNextLesson` setelah pelajaran selesai untuk menentukan navigasi adaptif.
- **builderReducer**: Action `ADD_PATH_RULE`, `UPDATE_PATH_RULE`, `DELETE_PATH_RULE`, `SET_LESSON_REMEDIAL` untuk sinkronisasi state builder.

## Keamanan

- Semua query menggunakan RLS (`tenant_id = get_my_tenant_id()`).
- Trigger `auto_set_tenant_id` memastikan `tenant_id` selalu diset otomatis saat INSERT.
- RPC `evaluate_next_lesson` menggunakan `SECURITY DEFINER` dengan validasi `auth.uid()`.
