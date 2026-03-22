# Guidance — Feature Module

Sistem panduan in-app (tooltip, walkthrough, banner) untuk onboarding pengguna

## Arsitektur

```
src/features/guidance/
├── api/           # Supabase service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/guidanceService.test.ts
│   api/guidanceService.ts
│   components/BannerGuide.tsx
│   components/CheckpointGuide.tsx
│   components/GuidanceCard.tsx
│   components/GuidanceEmptyState.tsx
│   components/GuidancePageHeader.tsx
│   components/GuidanceSkeleton.tsx
│   components/GuidanceStats.tsx
│   components/GuidanceTable.tsx
│   components/GuideRenderer.tsx
│   components/TooltipGuide.tsx
│   components/WalkthroughGuide.tsx
│   data/defaultGuides.ts
│   hooks/useGuidance.ts
│   index.ts
│   queries/useGuidanceQueries.ts
│   types/index.ts
```

## Komponen Utama

- **GuidanceSkeleton** — Loading skeleton untuk halaman Panduan
- **GuidanceCard** — Kartu untuk menampilkan item Panduan
- **GuidanceTable** — Tabel data dengan sorting dan pagination
- **GuidanceStats** — Kartu statistik dan metrik
- **GuidancePageHeader** — Header halaman dengan judul dan aksi
- **GuidanceEmptyState** — Tampilan saat tidak ada data
- **GuidanceFilterBar** — Bar pencarian dan filter
- **GuidanceModal** — Dialog modal untuk create/edit
- **GuidanceForm** — Form input data Panduan
- **GuidanceDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                             | Deskripsi                           |
| ---------------------------------- | ----------------------------------- |
| `guidanceService.getAll(tenantId)` | Ambil semua data Panduan per tenant |
| `guidanceService.upsert(payload)`  | Buat atau update data Panduan       |

## Database

- `guides` — Tabel utama Panduan

## Penggunaan

```tsx
import { useGuidanceData } from '@/src/features/guidance'

function MyComponent() {
  const { data, isLoading } = useGuidanceData(tenantId)
  if (isLoading) return <GuidanceSkeleton />
  return <GuidanceTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/guidance
```

## Dokumentasi Terkait

- [DATABASE.md](../../docs/DATABASE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
