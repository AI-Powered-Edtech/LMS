# Assignment — Feature Module

Manajemen tugas, pengumpulan, dan penilaian untuk guru dan siswa

## Arsitektur

```
src/features/assignments/
├── api/           # API service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/assignmentService.test.ts
│   __tests__/gradebookService.test.ts
│   api/assignmentService.ts
│   api/gradebookService.ts
│   components/AssignmentCard.tsx
│   components/AssignmentDetailView.tsx
│   components/AssignmentEmptyState.tsx
│   components/AssignmentFilterBar.tsx
│   components/AssignmentForm.tsx
│   components/AssignmentModal.tsx
│   components/AssignmentPageHeader.tsx
│   components/AssignmentSkeleton.tsx
│   components/AssignmentStats.tsx
│   components/AssignmentTable.tsx
│   hooks/useAssignments.ts
│   hooks/useGradebookQueries.ts
│   index.ts
│   queries/assignmentQueries.ts
│   types.ts
│   types/index.ts
```

## Komponen Utama

- **AssignmentSkeleton** — Loading skeleton untuk halaman Tugas
- **AssignmentCard** — Kartu untuk menampilkan item Tugas
- **AssignmentTable** — Tabel data dengan sorting dan pagination
- **AssignmentStats** — Kartu statistik dan metrik
- **AssignmentPageHeader** — Header halaman dengan judul dan aksi
- **AssignmentEmptyState** — Tampilan saat tidak ada data
- **AssignmentFilterBar** — Bar pencarian dan filter
- **AssignmentModal** — Dialog modal untuk create/edit
- **AssignmentForm** — Form input data Tugas
- **AssignmentDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                               | Deskripsi                         |
| ------------------------------------ | --------------------------------- |
| `assignmentService.getAll(tenantId)` | Ambil semua data Tugas per tenant |
| `assignmentService.upsert(payload)`  | Buat atau update data Tugas       |

## Database

- `assignments` — Tabel utama Tugas

## Penggunaan

```tsx
import { useAssignmentData } from '@/src/features/assignments'

function MyComponent() {
  const { data, isLoading } = useAssignmentData(tenantId)
  if (isLoading) return <AssignmentSkeleton />
  return <AssignmentTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/assignments
```

## Dokumentasi Terkait

- [DATABASE_ARCHITECTURE.md](../../docs/DATABASE_ARCHITECTURE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
