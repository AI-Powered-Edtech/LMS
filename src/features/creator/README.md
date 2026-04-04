# Creator — Feature Module

AI Content Generator untuk kursus, modul, dan pelajaran dari dokumen yang diunggah.

## Status

**Production-Ready** — Phase 38A selesai (2026-05-05)

## Arsitektur

```
src/features/creator/
├── api/
│   └── creatorService.ts      # Supabase calls: generate, history, markUsed, delete
├── components/
│   ├── EditQuestionModal.tsx   # Modal editor untuk soal (menggantikan window.prompt)
│   ├── HistoryPanel.tsx        # Slide-in panel riwayat generasi
│   └── QuestionCard.tsx        # Card soal dengan checkbox seleksi + edit/hapus
├── queries/
│   └── creatorQueries.ts       # React Query hooks (useMutation + useQuery)
├── types/
│   └── index.ts                # TypeScript interfaces + Bloom constants
├── index.ts                    # Barrel export
└── README.md
```

## Key Files

| File                               | Purpose                                                                                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/creatorService.ts`            | 5 metode: `generateAIContent`, `fetchHistory`, `markAsUsed`, `updateQuestions`, `deleteGeneration`                                                  |
| `queries/creatorQueries.ts`        | `useGenerateAIContent` (useMutation), `useAIContentHistory` (useQuery), `useMarkContentUsed`, `useUpdateGenerationQuestions`, `useDeleteGeneration` |
| `components/EditQuestionModal.tsx` | Modal full-featured untuk edit soal PG (4 opsi + pilih jawaban benar) dan soal terbuka                                                              |
| `components/QuestionCard.tsx`      | Kartu soal dengan checkbox seleksi, tombol edit/hapus, preview opsi berwarna                                                                        |
| `components/HistoryPanel.tsx`      | Panel slide-in menampilkan 20 riwayat generasi terbaru                                                                                              |

## Edge Functions

| Function                     | Purpose                          | Auth                          | LLM                          |
| ---------------------------- | -------------------------------- | ----------------------------- | ---------------------------- |
| `generate-ai-content`        | Generate konten dari file upload | User JWT (teacher/admin only) | Groq llama-3.1-70b-versatile |
| `generate-quiz-from-content` | Generate soal dari konten lesson | User JWT (teacher/admin only) | Groq llama-3.1-70b-versatile |

## Database Tables

| Tabel                  | Purpose                                                  |
| ---------------------- | -------------------------------------------------------- |
| `ai_generated_content` | Menyimpan hasil generasi AI (persistence)                |
| `ai_generation_logs`   | Append-only log untuk rate limiting, metering, analytics |

## Flow Generasi

```
1. Upload file (.pdf/.docx/.txt/.csv, maks 10MB)
2. Konfigurasi: Jenis Tugas + Jumlah Soal + Level Bloom (C1–C6)
3. Edge Function: generate-ai-content
   ├── Auth JWT + role check (student diblokir)
   ├── Rate limit: maks 20 generasi/jam per user
   ├── Ekstraksi teks: PDF (BT/ET regex), DOCX (zip.js XML), TXT/CSV (decode)
   ├── Groq API: prompt Bloom-aware + JSON response format
   ├── Simpan ke ai_generated_content
   └── Log ke ai_generation_logs
4. Result: soal + summary + badge "Tersimpan"
5. Aksi: Edit soal, Hapus soal, Pilih subset, Jadwalkan, Tambahkan ke Kursus
```

## Rate Limiting

- **Limit**: 20 generasi berhasil per jam per user
- **Implementasi**: Count pada tabel `ai_generation_logs` (status='success', created_at > NOW()-1h)
- **Response**: HTTP 429 + pesan user-friendly

## File Extraction

| Format         | Metode Ekstraksi                              |
| -------------- | --------------------------------------------- |
| `.txt`, `.csv` | TextDecoder UTF-8 langsung                    |
| `.pdf`         | Regex BT/ET block parser + plaintext fallback |
| `.docx`        | zip.js → word/document.xml → strip XML tags   |
| `.mp4`         | Tidak didukung (ditolak dengan pesan jelas)   |

## Bloom's Taxonomy Integration

Level C1–C6 dikirim ke LLM sebagai bagian dari prompt, dengan deskripsi bahasa Indonesia:

- C1: Mengingat (fakta, definisi)
- C2: Memahami (menjelaskan dengan kata sendiri)
- C3: Mengaplikasikan (menerapkan pada situasi baru)
- C4: Menganalisis (menguraikan, membandingkan)
- C5: Mengevaluasi (menilai, mengkritisi)
- C6: Mencipta (merancang, bersintesis)

## Pages

- `src/pages/Creator.tsx` — Halaman utama AI Generator (teacher/admin)

## Routes

| Role    | URL                      |
| ------- | ------------------------ |
| teacher | `/#/app/teacher/creator` |
| admin   | `/#/app/admin/creator`   |
