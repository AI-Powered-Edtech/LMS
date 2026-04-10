# Handoff — Phase 2 Status

Dokumentasi ini mencatat status aktual Phase 2 di codebase saat ini. Implementasi runtime untuk mode `vil` sudah masuk lintas Batch 1–4, tetapi handoff ke Phase 3 **belum final** karena shadow mode, security gate, dan integration suite penuh belum ditutup.

---

## Status Aktual per 2026-04-11

### Yang Sudah Masuk Kode

| Modul | Status | Catatan |
| --- | --- | --- |
| Foundation Batch 1 schema audit | ✅ | Skema inti sudah diintrospeksi dan dipetakan ke model/whitelist lokal |
| Models Batch 1 | ✅ | `course.rs`, `class.rs`, `course_module.rs`, `lesson.rs` cocok dengan skema lokal |
| Courses CRUD | ✅ | Backend VIL punya route `courses` + modules, dan frontend `courseService` memakai cabang VIL |
| Generic VIL data plane | ✅ | `/api/v1/data/:table` + `/api/v1/rpc/:name` aktif untuk service layer yang masih memakai `supabase.from/rpc` |
| Frontend service refactor | ✅ | Service Batch 1–4 yang kritikal sudah dipindah dari nested PostgREST joins ke flat query composition |
| Auth-adjacent onboarding RPCs | ✅ | `create_school_tenant`, enroll, invitation flow, onboarding flow tersambung ke mode `vil` |
| Batch 2–4 | ✅ Implemented | Quiz, assignment, gradebook, analytics, progress, parent/onboarding path sudah bisa melewati VIL data plane |

### Yang Masih Tersisa

- Shadow mode + divergence logging formal belum ada
- Gate 3 security review belum dijalankan
- Integration suite penuh untuk Batch 1–4 belum tersedia
- Google OAuth callback Phase 1 masih stub

---

## Artefak yang Relevan Saat Ini

### Rust Backend

```
edusync-api/crates/
├── models/
│   ├── src/
│   │   ├── course.rs
│   │   ├── class.rs
│   │   ├── lesson.rs
│   │   ├── course_module.rs
│   │   └── lib.rs
└── api-server/
    └── src/
        ├── main.rs
        ├── extractors.rs
        ├── courses.rs
        └── auth/
```

### Frontend Service Layer

- `src/services/auth/vilSession.ts` — shared session storage + in-memory auth event bus untuk mode `vil`
- `src/services/auth/vilAuthProvider.ts` — login/register/refresh/signout/bootstrap/verify/reset flow untuk VIL
- `src/services/api/runtime.ts` — runtime registry untuk active backend/client
- `src/services/api/vilApiClient.ts` — query builder VIL + generic RPC proxy untuk mode `vil`
- `src/features/courses/api/courseService.ts` — sudah punya cabang VIL untuk CRUD course inti
- `src/features/quizzes/api/*`, `src/features/assignments/api/*`, `src/features/gradebook/api/*`, `src/features/progress/api/*`, `src/features/parent/api/*`, `src/features/lessons/api/*` — service layer inti sudah diadaptasi ke flat query composition yang kompatibel dengan VIL

---

## Known Gaps

- Google OAuth callback VIL masih stub
- `pnpm typecheck`, `pnpm lint`, dan `pnpm build` repo utama masih gagal oleh debt pre-existing di area non-migration seperti `OfflineSyncIndicator`, `useBulkImport`, `ai-builder-copilot`, dan beberapa comprehensive test file
- `questionBankService` Phase 33A masih memakai join PostgREST lama dan belum termasuk scope Phase 2 ini
- Realtime, storage, Edge Functions, PDF, dan email digest tetap berada di jalur phase berikutnya

## Test Accounts

| Email                 | Password      | Role    |
| --------------------- | ------------- | ------- |
| `teacher@edusync.dev` | `password123` | TEACHER |
| `student@edusync.dev` | `password123` | STUDENT |
| `admin@edusync.dev`   | `password123` | ADMIN   |

---

## Next Required Before Phase 3

Sebelum Phase 3 boleh dimulai, minimal hal berikut masih harus selesai:

1. Gate 3 security review dijalankan
2. Shadow mode + divergence logging dipasang untuk flow kritikal
3. Integration tests Batch 1–4 ditambahkan dan dijalankan
4. Cleanup debt typecheck/lint repo utama yang masih unrelated ke migration slice

---

## Phase 3 Scope

Phase 3 nanti akan mencakup:

- **3A:** Email + Push Notification Services (migrasi dari Edge Functions)
- **3B:** External Integrations (LTI, SCORM)
- **3C:** Advanced Features (AI Tutor, Essay Grading, PDF Generation)
- **3D:** Performance Optimization (Caching, Rate Limiting)

---

## Support Info

- **Dev App:** `http://localhost:5173` (setelah `pnpm dev`)
- **VIL Server:** `http://localhost:8080`
- **Test JWTs:** lihat `AGENTS.md` atau `/home/rog/Documents/edusync1/LMS/docs/TESTING.md`
