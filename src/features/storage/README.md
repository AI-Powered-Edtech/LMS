# Storage — Feature Module

Manajemen file dan media untuk materi pembelajaran

## Arsitektur

```
src/features/storage/
├── api/           # Supabase service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/storageService.test.ts
│   api/storageService.ts
│   components/StorageCard.tsx
│   components/StorageDetailView.tsx
│   components/StorageEmptyState.tsx
│   components/StorageFilterBar.tsx
│   components/StorageForm.tsx
│   components/StorageModal.tsx
│   components/StoragePageHeader.tsx
│   components/StorageSkeleton.tsx
│   components/StorageStats.tsx
│   components/StorageTable.tsx
│   hooks/useStorage.ts
│   index.ts
│   queries/storageQueries.ts
│   types/index.ts
```

## Komponen Utama

- **StorageSkeleton** — Loading skeleton untuk halaman Penyimpanan
- **StorageCard** — Kartu untuk menampilkan item Penyimpanan
- **StorageTable** — Tabel data dengan sorting dan pagination
- **StorageStats** — Kartu statistik dan metrik
- **StoragePageHeader** — Header halaman dengan judul dan aksi
- **StorageEmptyState** — Tampilan saat tidak ada data
- **StorageFilterBar** — Bar pencarian dan filter
- **StorageModal** — Dialog modal untuk create/edit
- **StorageForm** — Form input data Penyimpanan
- **StorageDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                            | Deskripsi                               |
| --------------------------------- | --------------------------------------- |
| `storageService.getAll(tenantId)` | Ambil semua data Penyimpanan per tenant |
| `storageService.upsert(payload)`  | Buat atau update data Penyimpanan       |

## Database

- `storage_files` — Tabel utama Penyimpanan

## Penggunaan

```tsx
import { useStorageData } from '@/src/features/storage'

function MyComponent() {
  const { data, isLoading } = useStorageData(tenantId)
  if (isLoading) return <StorageSkeleton />
  return <StorageTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/storage
```

## Dokumentasi Terkait

- [DATABASE_ARCHITECTURE.md](../../docs/DATABASE_ARCHITECTURE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
