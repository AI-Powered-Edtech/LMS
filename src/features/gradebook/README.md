# Gradebook — Feature Module

Buku nilai digital untuk pencatatan dan pelaporan nilai siswa

## Arsitektur

```
src/features/gradebook/
├── api/           # API service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/gradebookService.test.ts
│   api/gradebookApi.ts
│   components/GradebookCard.tsx
│   components/GradebookEmptyState.tsx
│   components/GradebookFilterBar.tsx
│   components/GradebookForm.tsx
│   components/GradebookModal.tsx
│   components/GradebookPageHeader.tsx
│   components/GradebookSkeleton.tsx
│   components/GradebookStats.tsx
│   components/GradebookTable.tsx
│   components/StudentGradeView.tsx
│   hooks/useGradebook.ts
│   index.ts
│   queries/useGradebook.ts
│   types/index.ts
```

## Komponen Utama

- **GradebookSkeleton** — Loading skeleton untuk halaman Buku Nilai
- **GradebookCard** — Kartu untuk menampilkan item Buku Nilai
- **GradebookTable** — Tabel data dengan sorting dan pagination
- **GradebookStats** — Kartu statistik dan metrik
- **GradebookPageHeader** — Header halaman dengan judul dan aksi
- **GradebookEmptyState** — Tampilan saat tidak ada data
- **GradebookFilterBar** — Bar pencarian dan filter
- **GradebookModal** — Dialog modal untuk create/edit
- **GradebookForm** — Form input data Buku Nilai
- **GradebookDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                          | Deskripsi                              |
| ------------------------------- | -------------------------------------- |
| `gradebookApi.getAll(tenantId)` | Ambil semua data Buku Nilai per tenant |
| `gradebookApi.upsert(payload)`  | Buat atau update data Buku Nilai       |

## Database

- `grade_entries` — Tabel utama Buku Nilai

## Penggunaan

```tsx
import { useGradebookData } from '@/src/features/gradebook'

function MyComponent() {
  const { data, isLoading } = useGradebookData(tenantId)
  if (isLoading) return <GradebookSkeleton />
  return <GradebookTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/gradebook
```

## Dokumentasi Terkait

- [DATABASE_ARCHITECTURE.md](../../docs/DATABASE_ARCHITECTURE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
