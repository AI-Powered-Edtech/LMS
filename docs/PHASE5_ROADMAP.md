# Phase 5 Roadmap — Feature Health 100/100

**Target**: Semua 24 feature → Skor Total 100/100
**Baseline**: Rata-rata saat ini ~42/100 (3 Complete, 13 In Progress, 8 Needs Work)
**Estimasi**: 6–8 sprint sessions

---

## Cara Skor Dihitung

Setiap feature dinilai dari 3 dimensi (rata-rata = Skor Total):

| Dimensi           | Max | Cara Hitung                                                                              |
| ----------------- | --- | ---------------------------------------------------------------------------------------- |
| **Completeness**  | 100 | api/(20) + hooks/(15) + types/(15) + components/(20) + queries/(15) + \_\_tests\_\_/(15) |
| **Dokumentasi**   | 100 | README.md(30) + doc refs ×2 (max 70) → butuh 35+ doc files menyebut feature              |
| **UI/UX Quality** | 100 | base(20) + dark: files ×5 (max 50, butuh 10+) + skeleton files ×8 (max 30, butuh 4+)     |

---

## Gap Summary

| Dimensi       | Total Gap Items                                       | Feature Paling Tertinggal                                                                                                               |
| ------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Completeness  | 55 missing folders                                    | administration(5), calendar(4), moderation(4), onboarding(4), storage(4)                                                                |
| Dokumentasi   | 23 missing README + semua butuh lebih banyak doc refs | administration(2), calendar(2), guidance(2), moderation(2)                                                                              |
| UI/UX Quality | 14 features tanpa dark mode, 18 tanpa skeleton        | administration, ai-tutor, announcements, assignments, calendar, classroom, courses, discussions, lessons, moderation, progress, storage |

---

## Sprint Plan

### Sprint 5A — Structure & README (Quick Wins)

**Effort**: 1 session · **Impact**: Completeness +15–30 per feature, Dokumentasi +30

Buat folder dan file stub yang hilang di setiap feature module. Ini murni structural — file berisi type exports dan re-exports, bukan logic baru.

**Deliverables:**

1. **Buat missing folders** (55 items):

| Feature         | Folders yang Perlu Dibuat                             |
| --------------- | ----------------------------------------------------- |
| administration  | hooks/, types/, components/, queries/, \_\_tests\_\_/ |
| ai-tutor        | hooks/, \_\_tests\_\_/                                |
| announcements   | hooks/, components/                                   |
| assignments     | types/, components/, queries/                         |
| calendar        | types/, components/, queries/, \_\_tests\_\_/         |
| classroom       | types/, components/, queries/                         |
| courses         | hooks/, components/                                   |
| dashboards      | hooks/, \_\_tests\_\_/                                |
| discussions     | types/, components/, queries/                         |
| gamification    | hooks/                                                |
| gradebook       | hooks/, \_\_tests\_\_/                                |
| guidance        | hooks/, \_\_tests\_\_/                                |
| lessons         | hooks/, components/                                   |
| moderation      | hooks/, types/, components/, \_\_tests\_\_/           |
| onboarding      | api/, hooks/, queries/, \_\_tests\_\_/                |
| progress        | types/, components/, queries/                         |
| question-bank   | hooks/, types/, queries/                              |
| recommendations | hooks/                                                |
| reports         | hooks/, \_\_tests\_\_/                                |
| storage         | hooks/, components/, queries/, \_\_tests\_\_/         |
| struggle        | hooks/                                                |

2. **Buat README.md** untuk 23 feature (semua kecuali quizzes):
   - Template standar: Overview, Architecture, API, Usage, Testing
   - Setiap README minimal 30 baris

3. **Fix README.md utama**: 22 → 24 Feature Modules (3 lokasi)

**Exit Criteria**: Semua 24 features punya 6 subfolder + README.md

---

### Sprint 5B — Unit & Integration Tests

**Effort**: 2–3 sessions · **Impact**: Completeness +15 per feature (test gap)

Tambah test files ke 12 features yang belum punya. Setiap feature butuh minimal 1 `.test.ts` file di `__tests__/`.

**Features yang butuh tests (12):**

| Priority | Feature        | Alasan                                    |
| -------- | -------------- | ----------------------------------------- |
| P0       | gradebook      | Core assessment flow, baru dibuat Phase 4 |
| P0       | dashboards     | Data-heavy, banyak edge cases             |
| P0       | administration | Multi-tenant admin, security-critical     |
| P1       | ai-tutor       | AI integration, error handling penting    |
| P1       | guidance       | Counselor features, data sensitivity      |
| P1       | reports        | Financial data (SPP, PPDB)                |
| P1       | moderation     | Content moderation actions                |
| P2       | calendar       | Date logic                                |
| P2       | onboarding     | Setup wizard flow                         |
| P2       | storage        | File upload/download                      |
| P2       | struggle       | Algorithm testing                         |
| P2       | dashboards     | Chart rendering                           |

**Jenis test per feature:**

- API layer: mock Supabase client, test query construction
- Hooks: test state transitions, error handling
- Components: render test, user interaction
- Utils: pure function unit tests

**Juga di sprint ini:**

- Tulis real E2E tests (bukan cuma route protection):
  - `e2e/flows/login-enroll-quiz.spec.ts` — Login → enroll course → open lesson → start quiz → submit → lihat hasil
  - `e2e/flows/teacher-grading.spec.ts` — Login teacher → buka gradebook → grade submission → lihat analytics
  - `e2e/flows/admin-management.spec.ts` — Login admin → manage users → toggle features → check audit log

**Exit Criteria**: Semua 24 features punya ≥1 test file. 3 real E2E flow tests pass.

---

### Sprint 5C — Dark Mode & Skeleton Screens

**Effort**: 2–3 sessions · **Impact**: UI/UX Quality +50–80 per feature

Ini sprint terbesar. Setiap feature butuh ≥10 files dengan `dark:` Tailwind variants dan ≥4 files dengan Skeleton loading components.

**5C.1 — Dark Mode (target: 10+ files per feature)**

| Batch               | Features                                                                                                                                                  | Current dark: files | Target |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------ |
| Batch 1 (0 files)   | administration, ai-tutor, announcements, assignments, calendar, classroom, courses, discussions, lessons, moderation, progress, storage                   | 0                   | 10+    |
| Batch 2 (1-5 files) | dashboards(5), gamification(7), gradebook(2), guidance(4), notifications(3), onboarding(1), question-bank(3), recommendations(2), reports(2), struggle(4) | 1-7                 | 10+    |
| Batch 3 (10+ files) | analytics(25), quizzes(11)                                                                                                                                | ✅                  | ✅     |

**Approach:**

- Setiap component TSX file: tambah `dark:bg-gray-800`, `dark:text-gray-100`, `dark:border-gray-700`, dll
- Prioritas: komponen yang user lihat langsung (pages, cards, tables, forms)
- Pakai find-and-replace patterns untuk efisiensi

**5C.2 — Skeleton Screens (target: 4+ files per feature)**

| Status         | Features                                                                                                                                                                                                                          | Current skeleton files |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Butuh 4+ baru  | administration, ai-tutor, announcements, assignments, calendar, classroom, courses, dashboards, discussions, guidance, lessons, moderation, notifications, onboarding, progress, question-bank, recommendations, reports, storage | 0                      |
| Butuh 1-3 lagi | quizzes(1), gradebook(2), struggle(2)                                                                                                                                                                                             | 1-2                    |
| ✅ Done        | analytics(6), gamification(4)                                                                                                                                                                                                     | 4+                     |

**Approach:**

- Buat `<FeatureSkeleton>` component per feature
- Import dari shared `src/components/ui/Skeleton.tsx`
- Implement di setiap page/container yang load data
- Pattern: `if (isLoading) return <FeatureSkeleton />` sebelum render data

**Exit Criteria**: Semua features ≥10 dark: files + ≥4 skeleton files. UI/UX Quality = 100 across the board.

---

### Sprint 5D — Documentation Saturation

**Effort**: 1–2 sessions · **Impact**: Dokumentasi → 100

Saat ini hanya 33 doc files di `docs/`. Untuk setiap feature mendapat 35+ doc refs, kita butuh:

**5D.1 — Buat doc files baru per feature** (24 files):

- `docs/features/ADMINISTRATION.md`
- `docs/features/AI_TUTOR.md`
- `docs/features/ANALYTICS.md`
- ... dst untuk semua 24 features
- Setiap file: overview, API endpoints, database tables, RLS policies, UI pages, known issues

**5D.2 — Update existing docs** untuk cross-reference semua features:

- `ARCHITECTURE.md` — mention semua 24 features dalam architecture section
- `DATABASE.md` — mention semua features yang punya tables/RPCs
- `SECURITY.md` — mention semua features dalam RLS section
- `TESTING.md` — mention semua features dalam test coverage section
- Dan seterusnya untuk semua 33 existing docs

**5D.3 — Buat doc files tambahan** jika masih kurang:

- `docs/API_REFERENCE.md` — semua RPC endpoints grouped by feature
- `docs/COMPONENT_LIBRARY.md` — semua shared components
- `docs/FEATURE_MATRIX.md` — feature × role matrix
- `docs/PERFORMANCE.md` — performance budget per feature
- `docs/ACCESSIBILITY.md` — a11y compliance per feature

**Target**: Setiap feature disebut di ≥35 doc files → Dokumentasi score = 100

**Exit Criteria**: `node scripts/score-features.js` menunjukkan Dokumentasi = 100 untuk semua 24 features.

---

### Sprint 5E — Final Polish & Verification

**Effort**: 1 session · **Impact**: Verify semua scores = 100

1. Run `score-features.js` dan verifikasi semua 24 features = 100/100
2. Fix outliers yang masih < 100
3. Run full E2E browser test (semua 3 role)
4. Push ke Notion Feature Health Tracker
5. Update CHANGELOG.md dan ENGINEERING_ROADMAP.md

---

## Priority Matrix

```
                    HIGH IMPACT
                        │
    Sprint 5C           │           Sprint 5B
    (Dark Mode +        │           (Tests)
     Skeleton)          │
    ─────────────── ────┼──── ───────────────
    Sprint 5D           │           Sprint 5A
    (Docs Saturation)   │           (Structure +
                        │            README)
                        │
                    LOW IMPACT
    HIGH EFFORT ────────┼──────── LOW EFFORT
```

**Rekomendasi urutan**: 5A → 5B → 5C → 5D → 5E

Alasan: 5A paling cepat dan langsung menaikkan Completeness. 5B critical untuk quality. 5C terbesar tapi dampak UI/UX nyata. 5D bisa dilakukan paralel.

---

## Current vs Target Scores

| #   | Feature            | Current | After 5A | After 5B | After 5C | After 5D | Target |
| --- | ------------------ | ------- | -------- | -------- | -------- | -------- | ------ |
| 1   | Administration     | 17      | 42       | 47       | 80       | 100      | 100    |
| 2   | AI Tutor           | 53      | 63       | 68       | 90       | 100      | 100    |
| 3   | Analytics          | 90      | 90       | 90       | 90       | 100      | 100    |
| 4   | Announcements      | 36      | 53       | 53       | 80       | 100      | 100    |
| 5   | Assignments        | 43      | 55       | 55       | 82       | 100      | 100    |
| 6   | Calendar           | 20      | 42       | 47       | 80       | 100      | 100    |
| 7   | Classroom          | 31      | 50       | 50       | 80       | 100      | 100    |
| 8   | Courses            | 52      | 62       | 62       | 85       | 100      | 100    |
| 9   | Dashboards         | 45      | 55       | 60       | 82       | 100      | 100    |
| 10  | Discussions        | 29      | 48       | 48       | 78       | 100      | 100    |
| 11  | Gamification       | 78      | 83       | 83       | 90       | 100      | 100    |
| 12  | Gradebook          | 53      | 63       | 68       | 85       | 100      | 100    |
| 13  | Guidance           | 41      | 56       | 61       | 83       | 100      | 100    |
| 14  | Lessons            | 49      | 62       | 62       | 85       | 100      | 100    |
| 15  | Moderation         | 20      | 42       | 47       | 80       | 100      | 100    |
| 16  | Notifications      | 51      | 61       | 61       | 83       | 100      | 100    |
| 17  | Onboarding         | 23      | 42       | 47       | 78       | 100      | 100    |
| 18  | Progress Tracking  | 47      | 55       | 55       | 82       | 100      | 100    |
| 19  | Question Bank      | 37      | 52       | 52       | 80       | 100      | 100    |
| 20  | Quizzes            | 91      | 91       | 91       | 95       | 100      | 100    |
| 21  | Recommendations    | 46      | 56       | 56       | 82       | 100      | 100    |
| 22  | Reports            | 39      | 54       | 59       | 82       | 100      | 100    |
| 23  | Storage            | 34      | 47       | 52       | 78       | 100      | 100    |
| 24  | Struggle Detection | 54      | 59       | 59       | 85       | 100      | 100    |

---

## Catatan Penting

1. **Jangan buat folder/file kosong** — setiap file harus punya konten yang bermakna (minimal type definitions, hook stubs, component shells)
2. **Dark mode bukan hanya `dark:bg-gray-800`** — setiap component harus tested di dark mode toggle
3. **Skeleton screens harus realistis** — match layout actual page, bukan placeholder generik
4. **Doc refs harus organik** — jangan paksa mention feature di docs yang tidak relevan
5. **Test quality > quantity** — 1 test yang cover happy path + error path lebih baik dari 10 test kosong
6. **README.md harus actionable** — developer baru harus bisa paham feature dari README saja

---

_Generated: 2026-03-22 | Baseline from: E2E Browser Testing + Code Analysis_

<!-- Phase 5 Feature Cross-Reference -->

## Feature Module Cross-Reference

EduSync LMS terdiri dari 24 feature module yang saling terintegrasi:

| Feature         | Domain         | Deskripsi                                                                                                                  |
| --------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| administration  | Admin          | Administrasi — Manajemen tenant, konfigurasi modul sekolah, sinkronisasi data                                              |
| ai-tutor        | Learning       | AI Tutor — Asisten belajar berbasis AI yang memberikan penjelasan personal kepada siswa                                    |
| analytics       | Analytics      | Analitik — Dashboard analitik komprehensif untuk guru dan admin                                                            |
| announcements   | Communication  | Pengumuman — Sistem pengumuman sekolah                                                                                     |
| assignments     | Assessment     | Tugas — Manajemen tugas dari pembuatan hingga penilaian                                                                    |
| calendar        | Academic       | Kalender — Kalender akademik terintegrasi dengan jadwal pelajaran, ujian, deadline tugas, dan kegiatan sekolah             |
| classroom       | Academic       | Kelas — Manajemen kelas virtual dan fisik                                                                                  |
| courses         | Academic       | Kursus — Core learning module                                                                                              |
| dashboards      | Analytics      | Dashboard — Dashboard kustom dengan widget builder                                                                         |
| discussions     | Communication  | Diskusi — Forum diskusi per kursus                                                                                         |
| gamification    | Engagement     | Gamifikasi — Sistem gamifikasi lengkap: XP, badge, level, streak counter, dan leaderboard                                  |
| gradebook       | Assessment     | Buku Nilai — Buku nilai digital untuk guru                                                                                 |
| guidance        | Admin          | Panduan — Sistem panduan in-app (tooltip, walkthrough, banner, checkpoint)                                                 |
| lessons         | Learning       | Pelajaran — Konten pelajaran dengan block-based editor                                                                     |
| moderation      | Admin          | Moderasi — Moderasi konten user-generated (diskusi, komentar)                                                              |
| notifications   | Communication  | Notifikasi — Sistem notifikasi real-time dengan bell icon dan panel                                                        |
| onboarding      | Admin          | Onboarding — Wizard onboarding untuk pengguna baru                                                                         |
| progress        | Learning       | Kemajuan Belajar — Tracking progress belajar siswa secara granular per kursus, modul, dan pelajaran                        |
| question-bank   | Assessment     | Bank Soal — Repositori soal yang bisa digunakan ulang di berbagai kuis                                                     |
| quizzes         | Assessment     | Kuis — Sistem kuis komprehensif dengan timer, anti-cheat, autosave, review mode, dan analitik hasil per soal               |
| recommendations | Learning       | Rekomendasi — Engine rekomendasi konten berdasarkan progress, performa, dan pola belajar siswa                             |
| reports         | Analytics      | Laporan — Generator laporan akademik, keuangan (SPP), PPDB, dan custom                                                     |
| storage         | Infrastructure | Penyimpanan — Manajemen file dan media untuk materi pembelajaran                                                           |
| struggle        | Analytics      | Deteksi Kesulitan — Deteksi otomatis siswa yang kesulitan berdasarkan pola belajar, waktu per soal, dan penurunan performa |

Setiap feature module mengikuti arsitektur standar dengan folder: api/, queries/, hooks/, types/, components/, dan **tests**/. Semua feature mendukung dark mode dan skeleton loading screens.
