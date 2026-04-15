# Classroom — Feature Module

Manajemen kelas, daftar siswa, dan penugasan guru

## Arsitektur

```
src/features/classroom/
├── api/           # API service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/classroomService.test.ts
│   api/classroomService.ts
│   components/ClassroomCard.tsx
│   components/ClassroomDetailView.tsx
│   components/ClassroomEmptyState.tsx
│   components/ClassroomFilterBar.tsx
│   components/ClassroomForm.tsx
│   components/ClassroomModal.tsx
│   components/ClassroomPageHeader.tsx
│   components/ClassroomSkeleton.tsx
│   components/ClassroomStats.tsx
│   components/ClassroomTable.tsx
│   hooks/useClassroomQueries.ts
│   index.ts
│   queries/classroomQueries.ts
│   types/index.ts
```

## Komponen Utama

- **ClassroomSkeleton** — Loading skeleton untuk halaman Kelas
- **ClassroomCard** — Kartu untuk menampilkan item Kelas
- **ClassroomTable** — Tabel data dengan sorting dan pagination
- **ClassroomStats** — Kartu statistik dan metrik
- **ClassroomPageHeader** — Header halaman dengan judul dan aksi
- **ClassroomEmptyState** — Tampilan saat tidak ada data
- **ClassroomFilterBar** — Bar pencarian dan filter
- **ClassroomModal** — Dialog modal untuk create/edit
- **ClassroomForm** — Form input data Kelas
- **ClassroomDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                              | Deskripsi                         |
| ----------------------------------- | --------------------------------- |
| `classroomService.getAll(tenantId)` | Ambil semua data Kelas per tenant |
| `classroomService.upsert(payload)`  | Buat atau update data Kelas       |

## Database

- `classrooms` — Tabel utama Kelas

## Penggunaan

```tsx
import { useClassroomData } from '@/src/features/classroom'

function MyComponent() {
  const { data, isLoading } = useClassroomData(tenantId)
  if (isLoading) return <ClassroomSkeleton />
  return <ClassroomTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/classroom
```

## Dokumentasi Terkait

- [DATABASE_ARCHITECTURE.md](../../docs/DATABASE_ARCHITECTURE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
