# Course — Feature Module

Pembuatan dan pengelolaan kursus dengan modul dan materi pembelajaran

## Arsitektur

```
src/features/courses/
├── api/           # Supabase service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/courseBuilderService.test.ts
│   __tests__/courseService.test.ts
│   api/builder/blockService.ts
│   api/builder/courseService.ts
│   api/builder/lessonService.ts
│   api/builder/moduleService.ts
│   api/courseBuilderService.ts
│   api/courseService.ts
│   components/CourseCard.tsx
│   components/CourseDetailView.tsx
│   components/CourseEmptyState.tsx
│   components/CourseFilterBar.tsx
│   components/CourseForm.tsx
│   components/CourseModal.tsx
│   components/CoursePageHeader.tsx
│   components/CourseSkeleton.tsx
│   components/CourseStats.tsx
│   components/CourseTable.tsx
│   hooks/useCourse.ts
│   index.ts
│   queries/courseKeys.ts
│   queries/courseQueries.ts
│   types/index.ts
```

## Komponen Utama

- **CourseSkeleton** — Loading skeleton untuk halaman Kursus
- **CourseCard** — Kartu untuk menampilkan item Kursus
- **CourseTable** — Tabel data dengan sorting dan pagination
- **CourseStats** — Kartu statistik dan metrik
- **CoursePageHeader** — Header halaman dengan judul dan aksi
- **CourseEmptyState** — Tampilan saat tidak ada data
- **CourseFilterBar** — Bar pencarian dan filter
- **CourseModal** — Dialog modal untuk create/edit
- **CourseForm** — Form input data Kursus
- **CourseDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                           | Deskripsi                          |
| -------------------------------- | ---------------------------------- |
| `courseService.getAll(tenantId)` | Ambil semua data Kursus per tenant |
| `courseService.upsert(payload)`  | Buat atau update data Kursus       |

## Database

- `courses` — Tabel utama Kursus

## Penggunaan

```tsx
import { useCourseData } from '@/src/features/courses'

function MyComponent() {
  const { data, isLoading } = useCourseData(tenantId)
  if (isLoading) return <CourseSkeleton />
  return <CourseTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/courses
```

## Dokumentasi Terkait

- [DATABASE.md](../../docs/DATABASE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
