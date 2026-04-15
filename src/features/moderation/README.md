# Moderation — Feature Module

Moderasi konten diskusi, komentar, dan aktivitas pengguna

## Arsitektur

```
src/features/moderation/
├── api/           # API service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/moderationService.test.ts
│   api/moderationService.ts
│   components/ModerationCard.tsx
│   components/ModerationDetailView.tsx
│   components/ModerationEmptyState.tsx
│   components/ModerationFilterBar.tsx
│   components/ModerationForm.tsx
│   components/ModerationModal.tsx
│   components/ModerationPageHeader.tsx
│   components/ModerationSkeleton.tsx
│   components/ModerationStats.tsx
│   components/ModerationTable.tsx
│   hooks/useModeration.ts
│   index.ts
│   queries/moderationQueries.ts
│   types/index.ts
```

## Komponen Utama

- **ModerationSkeleton** — Loading skeleton untuk halaman Moderasi
- **ModerationCard** — Kartu untuk menampilkan item Moderasi
- **ModerationTable** — Tabel data dengan sorting dan pagination
- **ModerationStats** — Kartu statistik dan metrik
- **ModerationPageHeader** — Header halaman dengan judul dan aksi
- **ModerationEmptyState** — Tampilan saat tidak ada data
- **ModerationFilterBar** — Bar pencarian dan filter
- **ModerationModal** — Dialog modal untuk create/edit
- **ModerationForm** — Form input data Moderasi
- **ModerationDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                               | Deskripsi                            |
| ------------------------------------ | ------------------------------------ |
| `moderationService.getAll(tenantId)` | Ambil semua data Moderasi per tenant |
| `moderationService.upsert(payload)`  | Buat atau update data Moderasi       |

## Database

- `moderation_actions` — Tabel utama Moderasi

## Penggunaan

```tsx
import { useModerationData } from '@/src/features/moderation'

function MyComponent() {
  const { data, isLoading } = useModerationData(tenantId)
  if (isLoading) return <ModerationSkeleton />
  return <ModerationTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/moderation
```

## Dokumentasi Terkait

- [DATABASE_ARCHITECTURE.md](../../docs/DATABASE_ARCHITECTURE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
