# ai-authoring — Feature Module

AI Authoring Assistant untuk guru: generate soal dan konten pembelajaran dari file upload atau konten lesson.

## Status

**Production-Ready** — Phase 39A selesai (2026-04-05)

## Arsitektur

```
src/features/ai-authoring/
├── api/
│   └── aiAuthoringService.ts      # Unified service: generateFromFile, generateFromLesson, history CRUD
├── components/
│   ├── AIQuizGeneratorPanel.tsx   # Panel kontekstual dari lesson builder (dengan curriculum + history)
│   ├── EditQuestionModal.tsx      # Modal editor soal (quiz & esai)
│   ├── HistoryPanel.tsx           # Panel riwayat generasi (file & lesson unified)
│   └── QuestionCard.tsx           # Card soal dengan select/edit/hapus
├── queries/
│   └── aiAuthoringQueries.ts      # React Query hooks (useMutation + useQuery)
├── types/
│   └── index.ts                   # TypeScript interfaces + konstanta
├── index.ts                       # Barrel export
└── README.md
```

## Capability

| Capability                  | Source                 | Edge Function                |
| --------------------------- | ---------------------- | ---------------------------- |
| Generate dari file upload   | `generateFromFile()`   | `generate-ai-content`        |
| Generate dari konten lesson | `generateFromLesson()` | `generate-quiz-from-content` |
| History & riwayat           | `fetchHistory()`       | DB                           |
| Tandai digunakan            | `markAsUsed()`         | DB                           |
| Edit soal                   | `updateQuestions()`    | DB                           |
| Hapus riwayat               | `deleteGeneration()`   | DB                           |

## Database Tables

| Tabel                  | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `ai_generated_content` | Hasil generasi AI (file & lesson)             |
| `ai_generation_logs`   | Audit log: rate limiting, metering, analytics |

### Kolom baru (Phase 39A)

| Kolom            | Tipe  | Purpose                               |
| ---------------- | ----- | ------------------------------------- |
| `source_type`    | text  | `'file'` atau `'lesson'`              |
| `lesson_id`      | uuid? | FK ke lessons (untuk source lesson)   |
| `subject`        | text? | Mata pelajaran (curriculum alignment) |
| `grade_level`    | text? | Kelas target (curriculum alignment)   |
| `curriculum_ref` | text? | Referensi CP/Kurikulum Merdeka        |

## Curriculum Alignment

Semua tiga parameter ini opsional. Jika diisi, dikirim ke LLM sebagai konteks tambahan dalam prompt untuk menghasilkan soal yang lebih sesuai kurikulum.

## Question Types

| Tipe              | Label           | Deskripsi                |
| ----------------- | --------------- | ------------------------ |
| `MCQ`             | Pilihan Ganda   | 4 opsi, 1 benar          |
| `TRUE_FALSE`      | Benar/Salah     | 2 opsi                   |
| `MULTIPLE_SELECT` | Pilih Beberapa  | Beberapa opsi bisa benar |
| `SHORT_ANSWER`    | Jawaban Singkat | Jawaban teks pendek      |
| `OPEN`            | Esai / Uraian   | Jawaban panjang + rubrik |

## Backward Compatibility

Module `creator` dan `ai-quiz-gen` tetap ada sebagai thin re-export wrappers. Semua consumer existing tidak perlu mengubah import mereka.

| Module                      | Status                                |
| --------------------------- | ------------------------------------- |
| `src/features/creator/`     | Re-export wrapper dari `ai-authoring` |
| `src/features/ai-quiz-gen/` | Re-export wrapper dari `ai-authoring` |

## Pages & Entry Points

| Halaman                                | Route                    | Role           |
| -------------------------------------- | ------------------------ | -------------- |
| `src/pages/Creator.tsx`                | `/#/app/teacher/creator` | teacher, admin |
| `QuizBlockEditor.tsx` (embedded panel) | Di dalam course builder  | teacher, admin |
