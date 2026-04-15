# Discussion — Feature Module

Forum diskusi per kursus untuk interaksi guru-siswa

## Arsitektur

```
src/features/discussions/
├── api/           # API service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/discussionService.test.ts
│   api/discussionService.ts
│   components/DiscussionCard.tsx
│   components/DiscussionDetailView.tsx
│   components/DiscussionEmptyState.tsx
│   components/DiscussionFilterBar.tsx
│   components/DiscussionForm.tsx
│   components/DiscussionModal.tsx
│   components/DiscussionPageHeader.tsx
│   components/DiscussionSkeleton.tsx
│   components/DiscussionStats.tsx
│   components/DiscussionTable.tsx
│   hooks/useCommentQueries.ts
│   index.ts
│   queries/discussionQueries.ts
│   types/index.ts
```

## Komponen Utama

- **DiscussionSkeleton** — Loading skeleton untuk halaman Diskusi
- **DiscussionCard** — Kartu untuk menampilkan item Diskusi
- **DiscussionTable** — Tabel data dengan sorting dan pagination
- **DiscussionStats** — Kartu statistik dan metrik
- **DiscussionPageHeader** — Header halaman dengan judul dan aksi
- **DiscussionEmptyState** — Tampilan saat tidak ada data
- **DiscussionFilterBar** — Bar pencarian dan filter
- **DiscussionModal** — Dialog modal untuk create/edit
- **DiscussionForm** — Form input data Diskusi
- **DiscussionDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                               | Deskripsi                           |
| ------------------------------------ | ----------------------------------- |
| `discussionService.getAll(tenantId)` | Ambil semua data Diskusi per tenant |
| `discussionService.upsert(payload)`  | Buat atau update data Diskusi       |

## Database

- `discussions` — Tabel utama Diskusi

## Penggunaan

```tsx
import { useDiscussionData } from '@/src/features/discussions'

function MyComponent() {
  const { data, isLoading } = useDiscussionData(tenantId)
  if (isLoading) return <DiscussionSkeleton />
  return <DiscussionTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/discussions
```

## Dokumentasi Terkait

- [DATABASE_ARCHITECTURE.md](../../docs/DATABASE_ARCHITECTURE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
