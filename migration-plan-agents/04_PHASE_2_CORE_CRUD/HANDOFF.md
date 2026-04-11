# Handoff — Phase 2 Status

Dokumentasi ini mencatat status final Phase 2. **Gate 3 PASSED 2026-04-11.** Phase 3 siap dimulai.

---

## Status Final per 2026-04-11

### Yang Sudah Masuk Kode

| Modul | Status | Catatan |
| --- | --- | --- |
| Foundation Batch 1 schema audit | ✅ | Skema inti sudah diintrospeksi dan dipetakan ke model/whitelist lokal |
| Models Batch 1 | ✅ | `course.rs`, `class.rs`, `course_module.rs`, `lesson.rs` cocok dengan skema lokal |
| Courses CRUD | ✅ | Backend VIL punya route `courses` + modules, dan frontend `courseService` memakai cabang VIL |
| Generic VIL data plane | ✅ | `/api/v1/data/:table` + `/api/v1/rpc/:name` aktif untuk service layer yang masih memakai `supabase.from/rpc` |
| Observability + divergence sink | ✅ | `init_tracing()` aktif, request correlation id dipropagasi, `POST /api/v1/internal/divergence-events` tersedia, sink wajib Bearer auth, identity selalu di-override dari JWT |
| Shadow read path | ✅ | Read shadow untuk proxy query/RPC aman, auth bootstrap, dan `courses` GET path aktif |
| **Shadow write path** | ✅ **NEW** | Write shadow aktif untuk: `quiz_attempts_v2`, `quiz_answers`, `quiz_attempt_questions_v2`, `assignment_submissions`, `gradebook_entries` (tables); `v1_submit_quiz_attempt`, `submit_assignment_attempt`, `sync_gradebook_entries`, `grade_attempt_question` (RPCs). Primary path tetap authoritative; shadow hanya convergence check. |
| Gate 3 scoped verification | ✅ | `typecheck:migration-gate` (lulus), `lint:migration-gate` (0 errors), `test:gate3` (21/21 hijau) |
| Frontend service refactor | ✅ | Service Batch 1–4 yang kritikal sudah dipindah dari nested PostgREST joins ke flat query composition |
| Auth-adjacent onboarding RPCs | ✅ | `create_school_tenant`, enroll, invitation flow, onboarding flow tersambung ke mode `vil` |
| Batch 2–4 | ✅ | Quiz, assignment, gradebook, analytics, progress, parent/onboarding path sudah bisa melewati VIL data plane |
| **Data plane UPDATE bug fix** | ✅ **NEW** | Perbaiki dua bug di `data_plane.rs` UPDATE handler: (1) `jsonb_populate_record` column definition list redundant, (2) SET clause menggunakan `sqlx::Separated` yang salah — diganti dengan direct builder loop + bind langsung per kolom |
| **Security review** | ✅ **NEW** | Zero critical blockers. Auth endpoints protected. Tenant isolation enforced di semua mutation paths. Identity tidak dipercaya dari client. RPC args divalidasi terhadap pg_proc. Column names divalidasi terhadap allowlist. Residual non-blocking: shadow-config unauthenticated, divergence endpoint no rate-limit. |
| Integration test expansion | ✅ **NEW** | 12 test baru: data plane auth (401/403), lifecycle insert/update/delete, gradebook read, lessons read, course_modules read, write shadow identity override, tenant write protection |

### Yang Masih Tersisa (Post-Gate 3)

- Google OAuth callback Phase 1 masih stub (`auth/oauth.rs:52`) — non-blocking untuk Phase 3
- Integration coverage untuk quiz_attempt write dan assignment submission write belum ada test langsung (membutuhkan DB fixtures yang kompleks)
- `pnpm typecheck` + `pnpm lint` untuk scope di luar migration masih ada pre-existing errors

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
- `src/services/api/shadow.ts` — helper shadow read, hashing hasil, dan pengiriman divergence event
- `src/services/api/vilApiClient.ts` — query builder VIL + generic RPC proxy untuk mode `vil`
- `src/features/courses/api/courseService.ts` — sudah punya cabang VIL untuk CRUD course inti
- `src/features/quizzes/api/*`, `src/features/assignments/api/*`, `src/features/gradebook/api/*`, `src/features/progress/api/*`, `src/features/parent/api/*`, `src/features/lessons/api/*` — service layer inti sudah diadaptasi ke flat query composition yang kompatibel dengan VIL

---

## Known Gaps

- Google OAuth callback VIL masih stub
- Shadow saat ini masih fokus di read/idempotent path; write shadow belum dibuka
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

1. Write shadow dipasang untuk flow mutasi kritikal
2. Gate 3 security review ditutup penuh
3. Integration tests Batch 1–4 diperluas dari starter suite yang ada sekarang
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
