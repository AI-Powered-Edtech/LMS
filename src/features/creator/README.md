# Creator — Feature Module

AI Content Generator untuk kursus dan kuis dari dokumen yang diunggah. Production-ready.

## Status

**Production-Ready — Phase 38B** (2026-04-04)

## Arsitektur

```
src/features/creator/
├── api/
│   ├── creatorService.ts           # generate-ai-content Edge Function wrapper
│   └── questionBankIntegration.ts  # Simpan soal ke question_bank
├── components/
│   ├── AIImportBanner.tsx          # Banner di CourseBuilder (bridge store)
│   ├── EditQuestionModal.tsx       # Modal edit soal (ganti window.prompt)
│   ├── HistoryPanel.tsx            # Slide-in riwayat 20 generasi terbaru
│   ├── QuestionCard.tsx            # Card soal + checkbox + edit/hapus
│   └── UsageQuotaBar.tsx           # Bar kuota penggunaan AI per jam
├── queries/
│   └── creatorQueries.ts           # React Query hooks (5 mutations + 1 query)
├── store/
│   └── creatorBridge.store.ts      # Zustand bridge: Creator → CourseBuilder
├── types/
│   └── index.ts                    # TS interfaces + Bloom constants
├── utils/
│   └── exportToCSV.ts              # Export soal ke CSV (Excel-compatible)
└── index.ts                        # Barrel export
```

## Edge Function

| Function                     | Purpose                      | Auth                | LLM                |
| ---------------------------- | ---------------------------- | ------------------- | ------------------ |
| `generate-ai-content`        | Generate konten dari file    | JWT (teacher/admin) | Groq llama-3.1-70b |
| `generate-quiz-from-content` | Generate dari lesson content | JWT (teacher/admin) | Groq llama-3.1-70b |

## Database

| Tabel                  | Purpose                                |
| ---------------------- | -------------------------------------- |
| `ai_generated_content` | Hasil generasi AI — persisted per-user |
| `ai_generation_logs`   | Usage log untuk rate limiting (20/jam) |

## Flow Generasi

```
1. Upload file (.pdf/.docx/.txt/.csv ≤ 10MB)
2. Konfigurasi: Jenis Tugas + Jumlah Soal + Bloom Level (C1–C6)
3. [Optional] Lihat kuota: UsageQuotaBar (20 generasi/jam)
4. Edge Function: generate-ai-content
   ├── Auth + role check (student/parent/principal → 403)
   ├── Rate limit: 20 success/jam via ai_generation_logs
   ├── Text extraction: PDF(BT/ET regex), DOCX(zip.js), TXT/CSV(decode)
   ├── Groq API: prompt Bloom-aware, json_object format, 30s timeout
   ├── Simpan ke ai_generated_content
   └── Log ke ai_generation_logs
5. Result phase:
   ├── Checkbox seleksi per soal
   ├── Pilih Semua / Batalkan Semua
   ├── Edit soal (EditQuestionModal — full modal, bukan window.prompt)
   ├── Hapus soal
   └── Aksi: CSV, Bank Soal, Jadwalkan, Tambahkan ke Kursus
6. CourseBuilder integration via Zustand bridge (AIImportBanner)
```

## Hooks

| Hook                           | Type        | Purpose                          |
| ------------------------------ | ----------- | -------------------------------- |
| `useGenerateAIContent`         | useMutation | Generate AI content dari file    |
| `useMarkContentUsed`           | useMutation | Set used_at pada hasil tersimpan |
| `useDeleteGeneration`          | useMutation | Hapus dari riwayat               |
| `useUpdateGenerationQuestions` | useMutation | Update soal yang sudah diedit    |
| `useAIContentHistory`          | useQuery    | Fetch 20 riwayat terbaru (lazy)  |

## Security

- ✅ Role check: hanya `teacher` + `admin`
- ✅ Rate limiting: 20 generasi/jam per user
- ✅ File validation: MIME + ukuran di client + server
- ✅ Tenant isolation: semua query scoped ke tenant_id
- ✅ `tenant_id` tidak dikembalikan ke client dalam response

## Routes

| Role    | URL                      |
| ------- | ------------------------ |
| teacher | `/#/app/teacher/creator` |
| admin   | `/#/app/admin/creator`   |
