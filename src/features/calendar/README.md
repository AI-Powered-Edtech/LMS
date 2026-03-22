# Calendar — Feature Module

Kalender akademik dengan jadwal pelajaran, ujian, dan kegiatan sekolah

## Arsitektur

```
src/features/calendar/
├── api/           # Supabase service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/calendarService.test.ts
│   api/calendarService.ts
│   components/CalendarCard.tsx
│   components/CalendarDetailView.tsx
│   components/CalendarEmptyState.tsx
│   components/CalendarFilterBar.tsx
│   components/CalendarForm.tsx
│   components/CalendarModal.tsx
│   components/CalendarPageHeader.tsx
│   components/CalendarSkeleton.tsx
│   components/CalendarStats.tsx
│   components/CalendarTable.tsx
│   hooks/useCalendarQueries.ts
│   index.ts
│   queries/calendarQueries.ts
│   types/index.ts
```

## Komponen Utama

- **CalendarSkeleton** — Loading skeleton untuk halaman Kalender
- **CalendarCard** — Kartu untuk menampilkan item Kalender
- **CalendarTable** — Tabel data dengan sorting dan pagination
- **CalendarStats** — Kartu statistik dan metrik
- **CalendarPageHeader** — Header halaman dengan judul dan aksi
- **CalendarEmptyState** — Tampilan saat tidak ada data
- **CalendarFilterBar** — Bar pencarian dan filter
- **CalendarModal** — Dialog modal untuk create/edit
- **CalendarForm** — Form input data Kalender
- **CalendarDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                             | Deskripsi                            |
| ---------------------------------- | ------------------------------------ |
| `calendarService.getAll(tenantId)` | Ambil semua data Kalender per tenant |
| `calendarService.upsert(payload)`  | Buat atau update data Kalender       |

## Database

- `calendar_events` — Tabel utama Kalender

## Penggunaan

```tsx
import { useCalendarData } from '@/src/features/calendar'

function MyComponent() {
  const { data, isLoading } = useCalendarData(tenantId)
  if (isLoading) return <CalendarSkeleton />
  return <CalendarTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/calendar
```

## Dokumentasi Terkait

- [DATABASE.md](../../docs/DATABASE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
