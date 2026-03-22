# Onboarding — Feature Module

Wizard onboarding untuk pengguna baru dengan checklist langkah-langkah setup

## Arsitektur

```
src/features/onboarding/
├── api/           # Supabase service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/onboardingService.test.ts
│   api/onboardingService.ts
│   components/OnboardingCard.tsx
│   components/OnboardingChecklist.tsx
│   components/OnboardingEmptyState.tsx
│   components/OnboardingFilterBar.tsx
│   components/OnboardingForm.tsx
│   components/OnboardingModal.tsx
│   components/OnboardingPageHeader.tsx
│   components/OnboardingSkeleton.tsx
│   components/OnboardingStats.tsx
│   components/OnboardingTable.tsx
│   hooks/useOnboarding.ts
│   index.ts
│   queries/onboardingQueries.ts
│   types/index.ts
```

## Komponen Utama

- **OnboardingSkeleton** — Loading skeleton untuk halaman Onboarding
- **OnboardingCard** — Kartu untuk menampilkan item Onboarding
- **OnboardingTable** — Tabel data dengan sorting dan pagination
- **OnboardingStats** — Kartu statistik dan metrik
- **OnboardingPageHeader** — Header halaman dengan judul dan aksi
- **OnboardingEmptyState** — Tampilan saat tidak ada data
- **OnboardingFilterBar** — Bar pencarian dan filter
- **OnboardingModal** — Dialog modal untuk create/edit
- **OnboardingForm** — Form input data Onboarding
- **OnboardingDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                               | Deskripsi                              |
| ------------------------------------ | -------------------------------------- |
| `onboardingService.getAll(tenantId)` | Ambil semua data Onboarding per tenant |
| `onboardingService.upsert(payload)`  | Buat atau update data Onboarding       |

## Database

- `onboarding_progress` — Tabel utama Onboarding

## Penggunaan

```tsx
import { useOnboardingData } from '@/src/features/onboarding'

function MyComponent() {
  const { data, isLoading } = useOnboardingData(tenantId)
  if (isLoading) return <OnboardingSkeleton />
  return <OnboardingTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/onboarding
```

## Dokumentasi Terkait

- [DATABASE.md](../../docs/DATABASE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
