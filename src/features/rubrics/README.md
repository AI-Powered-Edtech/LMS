# Fitur: Dynamic Rubric Builder (Phase 31A)

Modul ini menyediakan sistem rubrik penilaian dinamis untuk tugas di EduSync LMS.

## Struktur Modul

```
src/features/rubrics/
├── api/                  ← Supabase calls (rubricService.ts)
├── queries/              ← React Query hooks + query keys
├── hooks/                ← useRubricBuilder (useReducer state)
├── components/
│   ├── RubricBuilder.tsx       ← Editor rubrik dengan DnD
│   ├── RubricCriterionRow.tsx  ← Satu baris kriteria + level
│   ├── RubricLevelCell.tsx     ← Satu sel tingkat penilaian
│   ├── RubricPreview.tsx       ← Tampilan read-only rubrik
│   ├── RubricScoringGrid.tsx   ← Grid penilaian di SpeedGrader
│   └── RubricTemplateModal.tsx ← Browser template rubrik
├── utils/
│   └── rubricCalculations.ts   ← Pure utility functions
├── types/index.ts
└── index.ts              ← Public barrel export
```

## Skema Database

| Tabel             | Deskripsi                              |
| ----------------- | -------------------------------------- |
| `rubrics`         | Rubrik utama, terhubung ke assignment  |
| `rubric_criteria` | Kriteria dalam sebuah rubrik           |
| `rubric_levels`   | Tingkat penilaian per kriteria         |
| `rubric_scores`   | Skor per kriteria per submission siswa |

Semua tabel menggunakan `tenant_id` + RLS untuk isolasi multi-tenant.

## RPCs

| RPC                                    | Fungsi                                                |
| -------------------------------------- | ----------------------------------------------------- |
| `save_rubric(jsonb)`                   | Upsert rubrik + kriteria + level secara transaksional |
| `get_rubric_with_criteria(uuid)`       | Deep join rubrik dengan semua kriteria dan level      |
| `score_submission_rubric(uuid, jsonb)` | Bulk upsert skor rubrik per submission                |

## Penggunaan

### Membuat/mengedit rubrik (guru di CreateAssignmentModal)

```tsx
import { RubricBuilder } from '@/features/rubrics'
;<RubricBuilder
  assignmentId={assignmentId}
  initialRubric={existingRubric}
  onSave={(rubricId) => console.log('Saved:', rubricId)}
  onCancel={() => setTab('detail')}
/>
```

### Penilaian di SpeedGrader

```tsx
import { RubricScoringGrid } from '@/features/rubrics'
;<RubricScoringGrid rubric={rubric} scores={scores} onChange={setScores} />
```

### Tampilan preview (siswa/review)

```tsx
import { RubricPreview } from '@/features/rubrics'
;<RubricPreview rubric={rubric} />
```

## Catatan

- Template rubrik dapat dibagikan antar tugas dalam satu tenant
- Drag-and-drop urutan kriteria menggunakan `@hello-pangea/dnd`
- Skor per kriteria disimpan terpisah dari nilai assignment utama
