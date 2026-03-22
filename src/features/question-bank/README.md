# QuestionBank — Feature Module

Repositori soal yang bisa digunakan ulang di berbagai kuis

## Arsitektur

```
src/features/question-bank/
├── api/           # Supabase service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/questionBankService.test.ts
│   api/questionBankService.ts
│   components/QuestionBankCard.tsx
│   components/QuestionBankEmptyState.tsx
│   components/QuestionBankFilterBar.tsx
│   components/QuestionBankPageHeader.tsx
│   components/QuestionBankSkeleton.tsx
│   components/QuestionBankStats.tsx
│   components/QuestionBankTable.tsx
│   components/QuestionCard.tsx
│   components/QuestionEditor.tsx
│   components/QuestionSearchModal.tsx
│   hooks/useQuestionBank.ts
│   index.ts
│   queries/questionBankQueries.ts
│   types/index.ts
```

## Komponen Utama

- **QuestionBankSkeleton** — Loading skeleton untuk halaman Bank Soal
- **QuestionBankCard** — Kartu untuk menampilkan item Bank Soal
- **QuestionBankTable** — Tabel data dengan sorting dan pagination
- **QuestionBankStats** — Kartu statistik dan metrik
- **QuestionBankPageHeader** — Header halaman dengan judul dan aksi
- **QuestionBankEmptyState** — Tampilan saat tidak ada data
- **QuestionBankFilterBar** — Bar pencarian dan filter
- **QuestionBankModal** — Dialog modal untuk create/edit
- **QuestionBankForm** — Form input data Bank Soal
- **QuestionBankDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                                 | Deskripsi                             |
| -------------------------------------- | ------------------------------------- |
| `questionBankService.getAll(tenantId)` | Ambil semua data Bank Soal per tenant |
| `questionBankService.upsert(payload)`  | Buat atau update data Bank Soal       |

## Database

- `quiz_questions` — Tabel utama Bank Soal

## Penggunaan

```tsx
import { useQuestionBankData } from '@/src/features/question-bank'

function MyComponent() {
  const { data, isLoading } = useQuestionBankData(tenantId)
  if (isLoading) return <QuestionBankSkeleton />
  return <QuestionBankTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/question-bank
```

## Dokumentasi Terkait

- [DATABASE.md](../../docs/DATABASE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
