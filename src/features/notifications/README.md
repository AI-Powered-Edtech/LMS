# Notification — Feature Module

Sistem notifikasi real-time dengan preferensi per pengguna

## Arsitektur

```
src/features/notifications/
├── api/           # API service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/notificationService.test.ts
│   api/notificationApi.ts
│   api/notificationService.ts
│   components/NotificationBell.tsx
│   components/NotificationCard.tsx
│   components/NotificationEmptyState.tsx
│   components/NotificationFilterBar.tsx
│   components/NotificationPageHeader.tsx
│   components/NotificationPanel.tsx
│   components/NotificationPreferencesPanel.tsx
│   components/NotificationSkeleton.tsx
│   components/NotificationStats.tsx
│   components/NotificationTable.tsx
│   hooks/useNotifications.ts
│   index.ts
│   queries/notificationQueries.ts
│   types/index.ts
```

## Komponen Utama

- **NotificationSkeleton** — Loading skeleton untuk halaman Notifikasi
- **NotificationCard** — Kartu untuk menampilkan item Notifikasi
- **NotificationTable** — Tabel data dengan sorting dan pagination
- **NotificationStats** — Kartu statistik dan metrik
- **NotificationPageHeader** — Header halaman dengan judul dan aksi
- **NotificationEmptyState** — Tampilan saat tidak ada data
- **NotificationFilterBar** — Bar pencarian dan filter
- **NotificationModal** — Dialog modal untuk create/edit
- **NotificationForm** — Form input data Notifikasi
- **NotificationDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                                 | Deskripsi                              |
| -------------------------------------- | -------------------------------------- |
| `notificationService.getAll(tenantId)` | Ambil semua data Notifikasi per tenant |
| `notificationService.upsert(payload)`  | Buat atau update data Notifikasi       |

## Database

- `notifications` — Tabel utama Notifikasi

## Penggunaan

```tsx
import { useNotificationData } from '@/src/features/notifications'

function MyComponent() {
  const { data, isLoading } = useNotificationData(tenantId)
  if (isLoading) return <NotificationSkeleton />
  return <NotificationTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/notifications
```

## Dokumentasi Terkait

- [DATABASE_ARCHITECTURE.md](../../docs/DATABASE_ARCHITECTURE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
