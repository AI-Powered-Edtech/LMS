# Report — Feature Module

Generator laporan akademik, keuangan (SPP), dan PPDB

## Arsitektur

```
src/features/reports/
├── api/           # API service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/reportService.test.ts
│   api/reportService.ts
│   components/ExportButton.tsx
│   components/ReportCard.tsx
│   components/ReportEmptyState.tsx
│   components/ReportFilterBar.tsx
│   components/ReportList.tsx
│   components/ReportModal.tsx
│   components/ReportPageHeader.tsx
│   components/ReportScheduler.tsx
│   components/ReportSkeleton.tsx
│   components/ReportStats.tsx
│   components/ReportTable.tsx
│   hooks/useReport.ts
│   index.ts
│   queries/reportQueries.ts
│   types/index.ts
```

## Komponen Utama

- **ReportSkeleton** — Loading skeleton untuk halaman Laporan
- **ReportCard** — Kartu untuk menampilkan item Laporan
- **ReportTable** — Tabel data dengan sorting dan pagination
- **ReportStats** — Kartu statistik dan metrik
- **ReportPageHeader** — Header halaman dengan judul dan aksi
- **ReportEmptyState** — Tampilan saat tidak ada data
- **ReportFilterBar** — Bar pencarian dan filter
- **ReportModal** — Dialog modal untuk create/edit
- **ReportForm** — Form input data Laporan
- **ReportDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                           | Deskripsi                           |
| -------------------------------- | ----------------------------------- |
| `reportService.getAll(tenantId)` | Ambil semua data Laporan per tenant |
| `reportService.upsert(payload)`  | Buat atau update data Laporan       |

## Database

- `reports` — Tabel utama Laporan

## Penggunaan

```tsx
import { useReportData } from '@/src/features/reports'

function MyComponent() {
  const { data, isLoading } = useReportData(tenantId)
  if (isLoading) return <ReportSkeleton />
  return <ReportTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/reports
```

## Dokumentasi Terkait

- [DATABASE_ARCHITECTURE.md](../../docs/DATABASE_ARCHITECTURE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
