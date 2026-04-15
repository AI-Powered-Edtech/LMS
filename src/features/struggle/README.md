# Struggle — Feature Module

Deteksi otomatis siswa yang kesulitan berdasarkan pola belajar dan performa

## Arsitektur

```
src/features/struggle/
├── api/           # API service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/struggleService.test.ts
│   api/struggleService.ts
│   components/NotificationBell.tsx
│   components/StruggleAlertPanel.tsx
│   components/StruggleCard.tsx
│   components/StruggleConfigPanel.tsx
│   components/StruggleEmptyState.tsx
│   components/StruggleHelpPrompt.tsx
│   components/StrugglePageHeader.tsx
│   components/StruggleSkeleton.tsx
│   components/StruggleStats.tsx
│   components/StruggleTable.tsx
│   hooks/useStruggle.ts
│   index.ts
│   queries/useStruggleQueries.ts
│   types/index.ts
│   utils/struggleHelpers.ts
```

## Komponen Utama

- **StruggleSkeleton** — Loading skeleton untuk halaman Deteksi Kesulitan
- **StruggleCard** — Kartu untuk menampilkan item Deteksi Kesulitan
- **StruggleTable** — Tabel data dengan sorting dan pagination
- **StruggleStats** — Kartu statistik dan metrik
- **StrugglePageHeader** — Header halaman dengan judul dan aksi
- **StruggleEmptyState** — Tampilan saat tidak ada data
- **StruggleFilterBar** — Bar pencarian dan filter
- **StruggleModal** — Dialog modal untuk create/edit
- **StruggleForm** — Form input data Deteksi Kesulitan
- **StruggleDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                             | Deskripsi                                     |
| ---------------------------------- | --------------------------------------------- |
| `struggleService.getAll(tenantId)` | Ambil semua data Deteksi Kesulitan per tenant |
| `struggleService.upsert(payload)`  | Buat atau update data Deteksi Kesulitan       |

## Database

- `struggle_alerts` — Tabel utama Deteksi Kesulitan

## Penggunaan

```tsx
import { useStruggleData } from '@/src/features/struggle'

function MyComponent() {
  const { data, isLoading } = useStruggleData(tenantId)
  if (isLoading) return <StruggleSkeleton />
  return <StruggleTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/struggle
```

## Dokumentasi Terkait

- [DATABASE_ARCHITECTURE.md](../../docs/DATABASE_ARCHITECTURE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
