# Gamification — Feature Module

Sistem XP, badge, level, streak, dan leaderboard untuk motivasi belajar

## Arsitektur

```
src/features/gamification/
├── api/           # API service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/gamificationService.test.ts
│   __tests__/leaderboardService.test.ts
│   api/gamificationService.ts
│   api/leaderboardService.ts
│   components/BadgeManager.tsx
│   components/BadgeShowcase.tsx
│   components/BadgeUnlockToast.tsx
│   components/CertificateViewer.tsx
│   components/GamificationCard.tsx
│   components/GamificationSkeleton.tsx
│   components/GamificationTable.tsx
│   components/LeaderboardV2.tsx
│   components/LevelBadge.tsx
│   components/LevelUpToast.tsx
│   components/StreakCounter.tsx
│   components/XPProgressBar.tsx
│   hooks/useGamification.ts
│   index.ts
│   queries/gamificationQueries.ts
│   queries/leaderboardQueries.ts
│   types/index.ts
```

## Komponen Utama

- **GamificationSkeleton** — Loading skeleton untuk halaman Gamifikasi
- **GamificationCard** — Kartu untuk menampilkan item Gamifikasi
- **GamificationTable** — Tabel data dengan sorting dan pagination
- **GamificationStats** — Kartu statistik dan metrik
- **GamificationPageHeader** — Header halaman dengan judul dan aksi
- **GamificationEmptyState** — Tampilan saat tidak ada data
- **GamificationFilterBar** — Bar pencarian dan filter
- **GamificationModal** — Dialog modal untuk create/edit
- **GamificationForm** — Form input data Gamifikasi
- **GamificationDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                                 | Deskripsi                              |
| -------------------------------------- | -------------------------------------- |
| `gamificationService.getAll(tenantId)` | Ambil semua data Gamifikasi per tenant |
| `gamificationService.upsert(payload)`  | Buat atau update data Gamifikasi       |

## Database

- `xp_events` — Tabel utama Gamifikasi

## Penggunaan

```tsx
import { useGamificationData } from '@/src/features/gamification'

function MyComponent() {
  const { data, isLoading } = useGamificationData(tenantId)
  if (isLoading) return <GamificationSkeleton />
  return <GamificationTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/gamification
```

## Dokumentasi Terkait

- [DATABASE_ARCHITECTURE.md](../../docs/DATABASE_ARCHITECTURE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
