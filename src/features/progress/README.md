# Progress — Feature Module

Tracking kemajuan belajar siswa per kursus, modul, dan pelajaran

## Arsitektur

```
src/features/progress/
├── api/           # API service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/progressService.test.ts
│   __tests__/studentProgressService.test.ts
│   api/progressService.ts
│   api/studentProgressService.ts
│   components/ProgressCard.tsx
│   components/ProgressDetailView.tsx
│   components/ProgressEmptyState.tsx
│   components/ProgressFilterBar.tsx
│   components/ProgressForm.tsx
│   components/ProgressModal.tsx
│   components/ProgressPageHeader.tsx
│   components/ProgressSkeleton.tsx
│   components/ProgressStats.tsx
│   components/ProgressTable.tsx
│   hooks/useStudentProgressQueries.ts
│   index.ts
│   queries/progressQueries.ts
│   types/index.ts
```

## Komponen Utama

- **ProgressSkeleton** — Loading skeleton untuk halaman Kemajuan
- **ProgressCard** — Kartu untuk menampilkan item Kemajuan
- **ProgressTable** — Tabel data dengan sorting dan pagination
- **ProgressStats** — Kartu statistik dan metrik
- **ProgressPageHeader** — Header halaman dengan judul dan aksi
- **ProgressEmptyState** — Tampilan saat tidak ada data
- **ProgressFilterBar** — Bar pencarian dan filter
- **ProgressModal** — Dialog modal untuk create/edit
- **ProgressForm** — Form input data Kemajuan
- **ProgressDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                             | Deskripsi                            |
| ---------------------------------- | ------------------------------------ |
| `progressService.getAll(tenantId)` | Ambil semua data Kemajuan per tenant |
| `progressService.upsert(payload)`  | Buat atau update data Kemajuan       |

## Database

- `student_progress` — Tabel utama Kemajuan

## Penggunaan

```tsx
import { useProgressData } from '@/src/features/progress'

function MyComponent() {
  const { data, isLoading } = useProgressData(tenantId)
  if (isLoading) return <ProgressSkeleton />
  return <ProgressTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/progress
```

## Dokumentasi Terkait

- [DATABASE_ARCHITECTURE.md](../../docs/DATABASE_ARCHITECTURE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
