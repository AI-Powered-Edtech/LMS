# Administration — Feature Module

Manajemen tenant, konfigurasi modul sekolah, dan sinkronisasi data antar sistem

## Arsitektur

```
src/features/administration/
├── api/           # API service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/administrationService.test.ts
│   api/administrationService.ts
│   components/AdministrationCard.tsx
│   components/AdministrationDetailView.tsx
│   components/AdministrationEmptyState.tsx
│   components/AdministrationFilterBar.tsx
│   components/AdministrationForm.tsx
│   components/AdministrationModal.tsx
│   components/AdministrationPageHeader.tsx
│   components/AdministrationSkeleton.tsx
│   components/AdministrationStats.tsx
│   components/AdministrationTable.tsx
│   hooks/useAdministration.ts
│   index.ts
│   queries/administrationQueries.ts
│   types/index.ts
```

## Komponen Utama

- **AdministrationSkeleton** — Loading skeleton untuk halaman Administrasi
- **AdministrationCard** — Kartu untuk menampilkan item Administrasi
- **AdministrationTable** — Tabel data dengan sorting dan pagination
- **AdministrationStats** — Kartu statistik dan metrik
- **AdministrationPageHeader** — Header halaman dengan judul dan aksi
- **AdministrationEmptyState** — Tampilan saat tidak ada data
- **AdministrationFilterBar** — Bar pencarian dan filter
- **AdministrationModal** — Dialog modal untuk create/edit
- **AdministrationForm** — Form input data Administrasi
- **AdministrationDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                                   | Deskripsi                                |
| ---------------------------------------- | ---------------------------------------- |
| `administrationService.getAll(tenantId)` | Ambil semua data Administrasi per tenant |
| `administrationService.upsert(payload)`  | Buat atau update data Administrasi       |

## Database

- `tenants` — Tabel utama Administrasi

## Penggunaan

```tsx
import { useAdministrationData } from '@/src/features/administration'

function MyComponent() {
  const { data, isLoading } = useAdministrationData(tenantId)
  if (isLoading) return <AdministrationSkeleton />
  return <AdministrationTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/administration
```

## Dokumentasi Terkait

- [DATABASE_ARCHITECTURE.md](../../docs/DATABASE_ARCHITECTURE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
