# Announcement — Feature Module

Sistem pengumuman sekolah untuk guru, siswa, dan orang tua

## Arsitektur

```
src/features/announcements/
├── api/           # Supabase service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/announcementService.test.ts
│   api/announcementService.ts
│   components/AnnouncementCard.tsx
│   components/AnnouncementDetailView.tsx
│   components/AnnouncementEmptyState.tsx
│   components/AnnouncementFilterBar.tsx
│   components/AnnouncementForm.tsx
│   components/AnnouncementModal.tsx
│   components/AnnouncementPageHeader.tsx
│   components/AnnouncementSkeleton.tsx
│   components/AnnouncementStats.tsx
│   components/AnnouncementTable.tsx
│   hooks/useAnnouncement.ts
│   index.ts
│   queries/announcementKeys.ts
│   queries/announcementQueries.ts
│   types/index.ts
```

## Komponen Utama

- **AnnouncementSkeleton** — Loading skeleton untuk halaman Pengumuman
- **AnnouncementCard** — Kartu untuk menampilkan item Pengumuman
- **AnnouncementTable** — Tabel data dengan sorting dan pagination
- **AnnouncementStats** — Kartu statistik dan metrik
- **AnnouncementPageHeader** — Header halaman dengan judul dan aksi
- **AnnouncementEmptyState** — Tampilan saat tidak ada data
- **AnnouncementFilterBar** — Bar pencarian dan filter
- **AnnouncementModal** — Dialog modal untuk create/edit
- **AnnouncementForm** — Form input data Pengumuman
- **AnnouncementDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                                 | Deskripsi                              |
| -------------------------------------- | -------------------------------------- |
| `announcementService.getAll(tenantId)` | Ambil semua data Pengumuman per tenant |
| `announcementService.upsert(payload)`  | Buat atau update data Pengumuman       |

## Database

- `announcements` — Tabel utama Pengumuman

## Penggunaan

```tsx
import { useAnnouncementData } from '@/src/features/announcements'

function MyComponent() {
  const { data, isLoading } = useAnnouncementData(tenantId)
  if (isLoading) return <AnnouncementSkeleton />
  return <AnnouncementTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/announcements
```

## Dokumentasi Terkait

- [DATABASE_ARCHITECTURE.md](../../docs/DATABASE_ARCHITECTURE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
