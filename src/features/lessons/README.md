# Lesson — Feature Module

Konten pelajaran dengan block editor, video, dan materi interaktif

## Arsitektur

```
src/features/lessons/
├── api/           # API service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/lessonService.test.ts
│   api/lessonService.ts
│   blockRegistry.ts
│   components/LessonCard.tsx
│   components/LessonDetailView.tsx
│   components/LessonEmptyState.tsx
│   components/LessonFilterBar.tsx
│   components/LessonForm.tsx
│   components/LessonModal.tsx
│   components/LessonPageHeader.tsx
│   components/LessonSkeleton.tsx
│   components/LessonStats.tsx
│   components/LessonTable.tsx
│   hooks/useLesson.ts
│   index.ts
│   queries/lessonQueries.ts
│   types/index.ts
│   utils/lessonAccess.ts
│   utils/lessonDuration.ts
```

## Komponen Utama

- **LessonSkeleton** — Loading skeleton untuk halaman Pelajaran
- **LessonCard** — Kartu untuk menampilkan item Pelajaran
- **LessonTable** — Tabel data dengan sorting dan pagination
- **LessonStats** — Kartu statistik dan metrik
- **LessonPageHeader** — Header halaman dengan judul dan aksi
- **LessonEmptyState** — Tampilan saat tidak ada data
- **LessonFilterBar** — Bar pencarian dan filter
- **LessonModal** — Dialog modal untuk create/edit
- **LessonForm** — Form input data Pelajaran
- **LessonDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                           | Deskripsi                             |
| -------------------------------- | ------------------------------------- |
| `lessonService.getAll(tenantId)` | Ambil semua data Pelajaran per tenant |
| `lessonService.upsert(payload)`  | Buat atau update data Pelajaran       |

## Database

- `lessons` — Tabel utama Pelajaran

## Penggunaan

```tsx
import { useLessonData } from '@/src/features/lessons'

function MyComponent() {
  const { data, isLoading } = useLessonData(tenantId)
  if (isLoading) return <LessonSkeleton />
  return <LessonTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/lessons
```

## Dokumentasi Terkait

- [DATABASE_ARCHITECTURE.md](../../docs/DATABASE_ARCHITECTURE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
