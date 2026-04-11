# Decommission Audit — EduSync LMS Phase 6

**Tanggal:** 2026-04-11  
**Status:** Decommission in progress

## Ringkasan

Phase 6 menghapus seluruh dependency Supabase dari frontend EduSync LMS.
Backend Rust (VIL) menjadi satu-satunya API layer.

## Supabase Dependencies yang Dihapus

### Package

- `@supabase/supabase-js` — dihapus dari `package.json`

### Provider Files yang Dihapus

- `src/services/api/supabaseApiClient.ts`
- `src/services/auth/supabaseAuthProvider.ts`
- `src/services/storage/supabaseStorageProvider.ts`
- `src/services/realtime/supabaseRealtimeProvider.ts`

### Edge Functions yang Diarsipkan

- 30 Edge Functions di `supabase/functions/` — dihapus (semua sudah diport ke VIL di Phase 3)

### Shadow Mode yang Dihapus

- ~130 baris shadow comparison code dari `vilApiClient.ts`
- ~28 baris shadow auth dari `vilAuthProvider.ts`
- Constants: `WRITE_SHADOW_TABLES`, `WRITE_SHADOW_RPCS`, `SAFE_READ_RPCS`

## Status Consumer Files

**127 file consumer** yang mengimport `{ supabase }` dari `@/services/supabase/client`:

- TIDAK diubah satu per satu
- Proxy `supabase` di `client.ts` direplace dengan VIL-native implementation
- Semua `supabase.from()` → VIL `ApiQueryBuilder`
- Semua `supabase.auth` → VIL `AuthProvider`
- Semua `supabase.storage` → VIL `StorageProvider`

## Edge Function Calls yang Dimigrasikan (20 file)

| Edge Function                | VIL Endpoint                        |
| ---------------------------- | ----------------------------------- |
| `ai-grade-essay`             | `POST /api/v1/ai/grade-essay`       |
| `ai-tutor`                   | `POST /api/v1/ai/tutor`             |
| `generate-ai-content`        | `POST /api/v1/ai/generate-content`  |
| `generate-quiz-from-content` | `POST /api/v1/ai/generate-quiz`     |
| `generate-pdf`               | `POST /api/v1/pdf/certificate`      |
| `generate-executive-report`  | `POST /api/v1/pdf/executive-report` |
| `generate-parent-report`     | `POST /api/v1/pdf/parent-report`    |
| `bulk-import-users`          | `POST /api/v1/import/users`         |
| `scorm-extract`              | `POST /api/v1/scorm/extract`        |
| `lti-jwks`                   | `GET /api/v1/lti/jwks`              |
| `send-parent-otp`            | `POST /api/v1/whatsapp/send-otp`    |

## TODOs Post-Decommission

- [ ] Implementasi `/api/v1/lti/grade-passback` (LTI grade passback)
- [ ] Implementasi `/api/v1/plagiarism/check` (plagiarism detection)
- [ ] Dedicated endpoints untuk generate-course-outline, generate-lesson-draft
- [ ] Migrasi database hosting dari Supabase ke independent PostgreSQL (setelah Phase 6)
- [ ] Full RLS removal setelah DB migration (saat ini: hanya tighten anon access)

## Database

**RLS Policies**: TIDAK dihapus di Phase 6 — database masih hosted di Supabase.
Migration `008_tighten_rls_for_vil.sql` merevoke akses anon role untuk mencegah
akses PostgREST langsung. Full RLS removal dilakukan setelah DB migration.

## Environment Variables

### Dihapus (Phase 6)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Ditambah

- `VITE_API_BACKEND=vil`
- `VITE_API_URL=http://localhost:8080`
- `VITE_WS_URL=ws://localhost:8080/ws`

## Rollback

**Phase 6 tidak memiliki rollback resmi.**
Jika diperlukan emergency rollback:

1. Revert git ke commit sebelum Phase 6 dimulai (`0c72d4b6`)
2. Deploy ulang dengan konfigurasi lama
