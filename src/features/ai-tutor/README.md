# AITutor — Feature Module

Asisten belajar berbasis AI yang memberikan penjelasan personal dan saran belajar

## Arsitektur

```
src/features/ai-tutor/
├── api/           # Supabase service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/aiTutorService.test.ts
│   api/aiTutorService.ts
│   api/promptBuilder.ts
│   components/AITutorCard.tsx
│   components/AITutorDetailView.tsx
│   components/AITutorEmptyState.tsx
│   components/AITutorFilterBar.tsx
│   components/AITutorForm.tsx
│   components/AITutorInput.tsx
│   components/AITutorModal.tsx
│   components/AITutorPageHeader.tsx
│   components/AITutorPanel.tsx
│   components/AITutorSkeleton.tsx
│   components/AITutorStats.tsx
│   components/AITutorTable.tsx
│   components/AITutorTyping.tsx
│   hooks/useAITutor.ts
│   index.ts
│   queries/aiTutorQueries.ts
│   types/index.ts
```

## Komponen Utama

- **AITutorSkeleton** — Loading skeleton untuk halaman AI Tutor
- **AITutorCard** — Kartu untuk menampilkan item AI Tutor
- **AITutorTable** — Tabel data dengan sorting dan pagination
- **AITutorStats** — Kartu statistik dan metrik
- **AITutorPageHeader** — Header halaman dengan judul dan aksi
- **AITutorEmptyState** — Tampilan saat tidak ada data
- **AITutorFilterBar** — Bar pencarian dan filter
- **AITutorModal** — Dialog modal untuk create/edit
- **AITutorForm** — Form input data AI Tutor
- **AITutorDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                            | Deskripsi                            |
| --------------------------------- | ------------------------------------ |
| `aiTutorService.getAll(tenantId)` | Ambil semua data AI Tutor per tenant |
| `aiTutorService.upsert(payload)`  | Buat atau update data AI Tutor       |

## Database

- `ai_tutor_sessions` — Tabel utama AI Tutor

## Penggunaan

```tsx
import { useAITutorData } from '@/src/features/ai-tutor'

function MyComponent() {
  const { data, isLoading } = useAITutorData(tenantId)
  if (isLoading) return <AITutorSkeleton />
  return <AITutorTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/ai-tutor
```

## Dokumentasi Terkait

- [DATABASE.md](../../docs/DATABASE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
