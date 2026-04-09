# AI Builder Copilot

Fitur AI Copilot yang terintegrasi langsung di Course Builder. Surface utamanya berupa drawer di sisi kanan yang membantu guru atau admin membuat kerangka kursus, draft pelajaran, asesmen, transformasi konten, dan meninjau riwayat artefak AI.

## Status

Implementasi V1 aktif di codebase dan digate oleh feature flag `ai_course_builder_copilot`.

## Struktur

```text
src/features/ai-builder-copilot/
  api/
    aiBuilderCopilotService.ts
  components/
    AssessmentTab.tsx
    CourseBuilderAICopilotDrawer.tsx
    HistoryTab.tsx
    ImproveTab.tsx
    LessonDraftTab.tsx
    OutlineTab.tsx
    shared/
      ArtifactStatusBadge.tsx
      BlockPreviewCard.tsx
      CopilotLoadingState.tsx
      DiffPreview.tsx
      ModuleOutlineCard.tsx
  hooks/
    useAICopilotFeatureGate.ts
  queries/
    aiBuilderCopilotQueries.ts
  store/
    builderAICopilot.store.ts
  types/
    index.ts
  __tests__/
    builderAICopilot.store.test.ts
  index.ts
```

## Entry Points

1. `BuilderTopBar` menampilkan tombol `AI` jika feature flag aktif.
2. `BuilderSidebar` menampilkan CTA `Hasilkan dengan AI` pada empty state.
3. `LessonBlockEditor` menampilkan CTA empty state dan aksi `Perbaiki dengan AI` pada blok teks.
4. `CourseBuilder.tsx` me-mount `CourseBuilderAICopilotDrawer` sebagai panel kanan yang mutually exclusive dengan release panel.

## Tab dan Capability

| Tab | Tujuan | Backend |
| --- | --- | --- |
| `Outline` | Generate modul + lesson tree dari konteks kursus | Edge Function `generate-course-outline` |
| `Lesson Draft` | Generate blok teks untuk lesson aktif | Edge Function `generate-lesson-draft` |
| `Assessment` | Generate kuis, bacaan, atau tugas dari lesson aktif | Edge Function `generate-lesson-draft` |
| `Improve` | Ringkas, perluas, sederhanakan, ubah nada, atau ubah konten terpilih | Edge Function `transform-course-content` |
| `History` | Lihat artefak AI terdahulu dan muat ulang preview | Query `ai_builder_artifacts` |

## Data Flow

1. User membuka drawer dari builder.
2. Tab memanggil edge function melalui `aiBuilderCopilotService`.
3. Edge function menyimpan hasil ke `ai_builder_artifacts` dengan status `generated`.
4. UI menampilkan preview terlebih dahulu.
5. Saat user menekan apply:
   - outline memakai RPC `apply_ai_outline_artifact`
   - lesson draft / assessment memakai RPC `apply_ai_lesson_artifact`
   - transform menulis ulang block yang sedang dipilih melalui action builder yang sudah ada
6. History membaca artefak yang dibuat user tersebut untuk course aktif, dengan pagination cursor berbasis `created_at`.

## State Lokal

Store `builderAICopilot.store.ts` menyimpan:

- `isOpen`
- `activeTab`
- `launchContext`
- `hydratedArtifact`

`hydratedArtifact` dipakai oleh tab untuk memuat ulang preview dari History tanpa silent apply.

## Security dan Guardrails

- Edge function mewajibkan autentikasi dan menolak role `student`.
- Semua edge function memverifikasi akses ke course target sebelum operasi LLM berjalan.
- Request dibatasi oleh rate limit berbasis `ai_generation_logs`.
- Field teks utama dibatasi maksimal 5.000 karakter dan prompt akhir maksimal 10.000 karakter.
- Apply flow selalu draft-first; tidak ada overwrite diam-diam ke builder.
- Riwayat builder AI bersifat user-scoped pada V1 melalui filter `created_by`.

## Database

Migration utama: `supabase/migrations/20260509000001_ai_builder_copilot.sql`

Objek yang ditambahkan:

- tabel `ai_builder_artifacts`
- RPC `apply_ai_outline_artifact`
- RPC `apply_ai_lesson_artifact`
- seed feature flag `ai_course_builder_copilot`

## Catatan Implementasi

- V1 masih mengikuti model lesson-scoped untuk kuis dan assignment.
- Assessment mode `quiz`, `reading`, dan `writing` semuanya disimpan sebagai artifact `assessment`.
- History tab saat ini memuat ulang preview, bukan melakukan apply otomatis.
- `/creator` masih tetap hidup untuk backward compatibility, tetapi surface builder adalah alur AI utama untuk authoring di dalam course builder.
