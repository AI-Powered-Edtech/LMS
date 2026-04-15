# Recommendation — Feature Module

Rekomendasi konten belajar berdasarkan progress dan performa siswa

## Arsitektur

```
src/features/recommendations/
├── api/           # API service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/recommendationService.test.ts
│   api/recommendationService.ts
│   components/RecommendationCard.tsx
│   components/RecommendationEmptyState.tsx
│   components/RecommendationFeed.tsx
│   components/RecommendationFilterBar.tsx
│   components/RecommendationModal.tsx
│   components/RecommendationPageHeader.tsx
│   components/RecommendationSkeleton.tsx
│   components/RecommendationStats.tsx
│   components/RecommendationTable.tsx
│   components/ReviewPrompt.tsx
│   components/SmartNextButton.tsx
│   hooks/useRecommendation.ts
│   index.ts
│   queries/recommendationQueries.ts
│   types/index.ts
```

## Komponen Utama

- **RecommendationSkeleton** — Loading skeleton untuk halaman Rekomendasi
- **RecommendationCard** — Kartu untuk menampilkan item Rekomendasi
- **RecommendationTable** — Tabel data dengan sorting dan pagination
- **RecommendationStats** — Kartu statistik dan metrik
- **RecommendationPageHeader** — Header halaman dengan judul dan aksi
- **RecommendationEmptyState** — Tampilan saat tidak ada data
- **RecommendationFilterBar** — Bar pencarian dan filter
- **RecommendationModal** — Dialog modal untuk create/edit
- **RecommendationForm** — Form input data Rekomendasi
- **RecommendationDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                                   | Deskripsi                               |
| ---------------------------------------- | --------------------------------------- |
| `recommendationService.getAll(tenantId)` | Ambil semua data Rekomendasi per tenant |
| `recommendationService.upsert(payload)`  | Buat atau update data Rekomendasi       |

## Database

- `recommendations` — Tabel utama Rekomendasi

## Penggunaan

```tsx
import { useRecommendationData } from '@/src/features/recommendations'

function MyComponent() {
  const { data, isLoading } = useRecommendationData(tenantId)
  if (isLoading) return <RecommendationSkeleton />
  return <RecommendationTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/recommendations
```

## Dokumentasi Terkait

- [DATABASE_ARCHITECTURE.md](../../docs/DATABASE_ARCHITECTURE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
