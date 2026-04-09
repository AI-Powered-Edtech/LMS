# Dashboard — Feature Module

Dashboard kustom dengan widget builder untuk visualisasi data

## Arsitektur

```
src/features/dashboards/
├── api/           # Supabase service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/dashboardService.test.ts
│   api/dashboardService.ts
│   components/DashboardBuilder.tsx
│   components/DashboardCard.tsx
│   components/DashboardList.tsx
│   components/DashboardPageHeader.tsx
│   components/DashboardSkeleton.tsx
│   components/DashboardStats.tsx
│   components/DashboardTable.tsx
│   components/DashboardViewer.tsx
│   components/WidgetPicker.tsx
│   components/WidgetRenderer.tsx
│   hooks/useDashboard.ts
│   index.ts
│   queries/dashboardQueries.ts
│   types/index.ts
```

## Komponen Utama

- **DashboardSkeleton** — Loading skeleton untuk halaman Dashboard
- **DashboardCard** — Kartu untuk menampilkan item Dashboard
- **DashboardTable** — Tabel data dengan sorting dan pagination
- **DashboardStats** — Kartu statistik dan metrik
- **DashboardPageHeader** — Header halaman dengan judul dan aksi
- **DashboardEmptyState** — Tampilan saat tidak ada data
- **DashboardFilterBar** — Bar pencarian dan filter
- **DashboardModal** — Dialog modal untuk create/edit
- **DashboardForm** — Form input data Dashboard
- **DashboardDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                              | Deskripsi                             |
| ----------------------------------- | ------------------------------------- |
| `dashboardService.getAll(tenantId)` | Ambil semua data Dashboard per tenant |
| `dashboardService.upsert(payload)`  | Buat atau update data Dashboard       |

## Database

- `dashboards` — Tabel utama Dashboard

## Penggunaan

```tsx
import { useDashboardData } from '@/src/features/dashboards'

function MyComponent() {
  const { data, isLoading } = useDashboardData(tenantId)
  if (isLoading) return <DashboardSkeleton />
  return <DashboardTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/dashboards
```

## Dokumentasi Terkait

- [DATABASE_ARCHITECTURE.md](../../docs/DATABASE_ARCHITECTURE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
