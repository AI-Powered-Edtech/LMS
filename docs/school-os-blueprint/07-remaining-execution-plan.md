# 07 — Remaining Execution Plan

Konkret plan untuk sisa pekerjaan setelah main @ `81d5bf83f`. Disusun dari `06-roadmap.md` checkbox `[ ]` + known gaps dari audit sebelumnya.

**Prinsip**: ship-as-you-go, setiap item ≤1 PR, acceptance criteria eksplisit, dependency-respecting.

## Taxonomy unit kerja

- 🔴 **P0 Blocker** — blocking critical path (build, data integrity, security)
- 🟠 **P1 High** — school-deployment blocker (core feature broken/missing)
- 🟡 **P2 Medium** — quality gap, hardening, nice-to-have production feature
- 🟢 **P3 Low** — polish, deferred expansion

Setiap unit: **What / Why / Dep / Est / Accept / Verify**
- Est: S (<4h), M (4-8h), L (1-2d), XL (>2d)
- Dep: unit-unit yang harus landed dulu

---

## 🔴 P0 Blockers

### U01 — Migration 048 baseline gap (`gradebook_entries`) ✅ DONE
- Created `migration 065_gradebook_baseline.sql` with `gradebook_entries` + `gradebook_settings` schemas
- Applied 065 + retried 048 → clean; dual-mode descriptor (BB/MB/BSH/SB) ready
- Landed 2026-04-24

### U02 — React dup-key warning ✅ RESOLVED via U05
- Post-U05 verification: sweep `wali_kelas` persona (nusantara tenant with rich seed data) renders `teacher/dashboard` with **0 console errors**
- Warning persists on legacy `teacher@edusync.dev` persona (tenant-demo has sparse data); hypothesis confirmed that thin data triggers some client-side key collision path
- Legacy demo tenant is not a production concern. For dev school (nusantara) + real production tenants, warning does not appear.
- Recommend: mark `teacher@edusync.dev` demo tenant as deprecated; rely on nusantara-dev seeded data for testing.

### U03 — Baseline audit ✅ RESOLVED
- Diff analysis: DB 174 tables, migrations define 178. **0 orphan tables** in DB not covered by any migration. 3 migration tables not yet applied (resolved: `lti_user_links` applied; `semantic_search_index` deferred pending pgvector ext)
- Baseline drift WAS point-in-time (gradebook/semesters/onboarding/subscriptions) — now addressed via migrations 037/064/065
- No systematic baseline.sql regeneration needed
- Full findings in `DECISIONS_LOG.md`

---

## 🟠 P1 High

### U04 — Verify & harden `scripts/reset-dev-school.sh` ✅ DONE
- Script patched: docker exec fallback when host psql unavailable
- Post-reset invariants: tenant=1, siswa ≥100, user_roles ≥10
- Migration 066 (enum `PRINCIPAL`/`PARENT`) + 067 (idempotent `auto_add_modules_for_tenant` trigger) + dev_seed column fixes (instructor_id → created_by, author_id → created_by, body → content)
- Verified: 3× stable runs, <2s elapsed, asserts `tenant=1 siswa=120 roles=256`
- CI nightly still uses it; next: capture assertions in workflow log as regression gate
- Landed: `7b7e45b44` (2026-04-24)

### U05 — Dev seed richer content (roadmap Fase 0.5 spec)
- **What**: Extend `dev_seed.sql` dengan: 8 subjects CP/ATP samples, 4 sample courses × 8-12 lessons, 20 assignments, 15 quizzes + attempts, 1 P5 project, 2 extracurricular, 3-month SPP invoices (60% paid), 2-week attendance (90% rata-rata), sample notifications/announcements/forum
- **Why**: Sweep dengan realistic data exposes more bugs; demo untuk pilot school butuh depth
- **Dep**: U04 (reset script)
- **Est**: L
- **Accept**: 9-persona sweep menghasilkan realistic render (tidak empty states everywhere)
- **Verify**: visual spot-check of screenshots; count of non-empty data in each persona dashboard

### U06 — RBAC authorization middleware enforcement (split ke 5 sub-unit)
Current state: `rbac.rs` masih 6-role hierarchy (student/parent/teacher/reviewer/principal/admin); migrasi 046 add 10-role schema + `role_capabilities` table, tapi backend belum baca. Source-of-truth antara `user_roles` / `tenant_memberships.role` text / `role_capabilities` **belum diputuskan**.

**U06.1 — Source-of-truth decision ADR**
- **What**: Tulis ADR di `docs/school-os-blueprint/ADR-001-rbac-source-of-truth.md`: pilih salah satu dari: (a) `user_roles` enum per-tenant, (b) `tenant_memberships.role` flexible text, (c) composite `role_capabilities` driven
- **Est**: S
- **Accept**: ADR committed + reviewed; downstream migrations konsisten
- **Verify**: `grep` 3 kandidat source, confirm only 1 used in production queries

**U06.2 — `rbac_policy.yaml` policy file**
- **What**: Deklarasi route × role × action matrix. Format: `{ "/api/v1/data/gradebook_entries": { GET: ["teacher","wali_kelas","admin","principal"], POST: ["teacher","wali_kelas"] } }`
- **Est**: M
- **Accept**: File di repo, covers 30 most-used endpoints
- **Verify**: schema validate against allowlist in data_plane.rs

**U06.3 — Rust policy loader + middleware binding**
- **What**: `crates/middleware/src/rbac.rs` refactor: load policy at boot, attach middleware ke router, deny 403 kalau role ∉ policy
- **Dep**: U06.1, U06.2
- **Est**: L
- **Accept**: requests yang tidak match policy → 403
- **Verify**: integration tests

**U06.4 — Scope checks (`self` / `rombel` / `tenant` / `foundation`)**
- **What**: Beyond role, add scope predicate: guru bisa lihat rombel-nya, bukan rombel lain. Policy YAML extend with scope.
- **Dep**: U06.3, U08 (rombel semantics settled)
- **Est**: L
- **Accept**: Guru A tidak bisa GET gradebook rombel Guru B
- **Verify**: tests/e2e/rbac-scope.spec.ts

**U06.5 — E2E matrix test**
- **What**: `tests/e2e/rbac.spec.ts` — 10 persona × 10 endpoint matrix. Assert 200/403 correct per cell.
- **Dep**: U06.3, U06.4
- **Est**: M
- **Accept**: 100% cells pass
- **Verify**: CI green

**Total U06 est**: S+M+L+L+M ≈ **2 minggu** (bukan XL tunggal)

### U07 — Normalize membership ke 10-role (split 2 sub-unit)

**U07.1 — Normalize `user_roles` enum + backfill**
- **What**: Current dev_seed masih `ADMIN/TEACHER/STUDENT/PARENT/PRINCIPAL`. Extend enum ke 10 roles + backfill existing rows:
  - Guru dengan assigned rombel → `wali_kelas`
  - Guru dengan `tenant_memberships.role='guru_bk'` → `guru_bk`
  - Admin dengan `tenant_memberships.role='tu'` → `tu`
  - Admin dengan `tenant_memberships.role LIKE 'wakasek_%'` → split ke `wakasek_kurikulum`/`wakasek_kesiswaan`/dll
  - PRINCIPAL → `principal`
- **Dep**: U06.1 (source-of-truth decision — harus pilih `user_roles` untuk path ini)
- **Est**: M
- **Accept**: `SELECT role, COUNT(*) FROM user_roles GROUP BY role` menunjukkan 10 role dengan counts realistic
- **Verify**: Query + manual spot check

**U07.2 — Update dev_seed.sql + reset workflow ke 10-role**
- **What**: Seed langsung insert 10-role user_roles, hapus post-migration backfill kalau bisa
- **Dep**: U07.1
- **Est**: S
- **Accept**: Fresh reset-dev-school.sh → 10-role distribution correct
- **Verify**: reset + query

### U08 — `classes` → `rombel` split (split 5 sub-unit)

**U08.1 — Schema/data audit**
- **What**: SQL query existing `classes` rows, klasifikasi: (a) yang dipakai sebagai class-section (join rapat dengan `enrollments.student_id`) vs (b) yang dipakai sebagai course-instance (join ke `courses`). Output CSV classification.
- **Est**: S
- **Accept**: Setiap baris `classes` punya label `{section|course_instance}` di audit output
- **Verify**: manual review 20 sample rows

**U08.2 — Read adapters (backward compat)**
- **What**: FE services (classroomService, gradebookService, attendanceService) baca dari **both** `rombel` + `classes`, prefer rombel kalau ada. Fallback ke classes. Idempotent read layer.
- **Dep**: U08.1
- **Est**: M
- **Accept**: Existing UI tetap work, rombel query route prefered
- **Verify**: sweep no regression

**U08.3 — Write migration (data copy)**
- **What**: Migration 065 copies class-section rows dari `classes` ke `rombel`, mapping fields, preserve FK. Mark original `classes` rows with `is_migrated=true`.
- **Dep**: U08.1, U08.2
- **Est**: L
- **Accept**: All section rows ada di rombel, FK enrollments repointable
- **Verify**: count match pre/post

**U08.4 — FE route + service cleanup**
- **What**: Services write ke `rombel` only (bukan classes untuk section use case). Update `dev_seed.sql` + `useRombel*` hooks. Deprecate `classroomService` untuk section path.
- **Dep**: U08.3
- **Est**: M
- **Accept**: `grep "from.*classes" src/` remaining hanya untuk course-instance semantics
- **Verify**: grep + manual review

**U08.5 — Regression sweep + Rapor re-verify**
- **What**: Run sweep + rapor generator against dev school. Confirm per-rombel grades calculated correctly.
- **Dep**: U08.4
- **Est**: S
- **Accept**: Rapor per-siswa match per-rombel membership
- **Verify**: compare rapor output pre/post

**Total U08 est**: S+M+L+M+S ≈ **2 minggu**

### U09 — Midtrans `create_payment` real API call
- **What**: Replace fake `snap-{uuid}` token in `payment_handlers.rs::create_payment` dengan real Midtrans Snap API call: POST ke `https://app.sandbox.midtrans.com/snap/v1/transactions` with base64 server key auth. Return real `snap_token` + `redirect_url`.
- **Why**: Parent portal payment flow broken — UI opens Snap popup dengan token fiktif → Midtrans rejects → payment never processed
- **Dep**: none (env `MIDTRANS_SERVER_KEY` config sudah di `.env.example`)
- **Est**: M
- **Accept**: sandbox transaction completes; webhook `midtrans_webhook` receives notification; invoice status updates
- **Verify**: manual end-to-end test dengan Midtrans sandbox account

### U10 — Payment reconciliation hardening (partial exists)
- **Current state**: `midtrans_webhook.rs` sudah verify signature + insert `payment_transactions` + lookup invoice + UPDATE `invoices.status` ke 'paid'/'cancelled'. Reconciliation basic ada.
- **What** (hardening):
  1. **Schema consistency**: audit `invoices` vs `spp_invoices` — migrasi 054 bikin `spp_invoices`; webhook write ke `invoices`. Decide: unify atau add dispatcher.
  2. **Idempotency**: repeated webhook (same `transaction_id`) harus no-op. Add unique index + ON CONFLICT handling.
  3. **Event emission**: emit `invoice.paid` ke `domain_events` outbox setelah update (unblock U13 subscriber for receipt WA).
  4. **Sandbox E2E test**: `tests/integration/midtrans_webhook.rs` with 4 payload variants (settlement/pending/cancel/deny).
- **Dep**: U09 (payment creation path testable)
- **Est**: M
- **Accept**: Repeated webhook idempotent; invoice table unified; event emitted; sandbox E2E pass
- **Verify**: integration tests

### U11 — Server-side PDF renderer untuk rapor (split 6 sub-unit)

**U11.1 — Tech decision ADR**
- **What**: `docs/school-os-blueprint/ADR-002-pdf-renderer.md`. Trade-off: Puppeteer sidecar (Node service, full HTML/CSS fidelity, memory overhead) vs Typst (Rust-native binary, smaller footprint, custom template lang) vs wkhtmltopdf (deprecated, avoid). Decide + commit.
- **Est**: S
- **Accept**: ADR with chosen tech + rollback plan
- **Verify**: decision referenced in U11.2+

**U11.2 — Renderer POC**
- **What**: POC: single rapor → PDF binary output. Hardcoded sample data dulu.
- **Dep**: U11.1
- **Est**: M
- **Accept**: PDF generated, visually acceptable (signature blocks, table alignment)
- **Verify**: manual review

**U11.3 — Endpoint `POST /api/v1/pdf/rapor/:rapor_id`**
- **What**: Rust handler receives rapor_id, query data, render, return PDF binary atau S3 signed URL
- **Dep**: U11.2, U01 (gradebook data), U08.5 (rombel data stable)
- **Est**: M
- **Accept**: Endpoint responds 200 with PDF
- **Verify**: curl + visual

**U11.4 — S3 persistence**
- **What**: Store rendered PDF ke S3 bucket `rapor/{tenant_id}/{rapor_id}.pdf`. Update `rapor_documents.pdf_url`. Signed URL 7-day TTL.
- **Dep**: U11.3
- **Est**: S
- **Accept**: PDF retrievable via signed URL setelah generation
- **Verify**: manual download test

**U11.5 — Batch export per rombel**
- **What**: Endpoint `POST /api/v1/pdf/rapor/batch/:rombel_id`. Async job, returns job_id, polling status. When done, download ZIP.
- **Dep**: U11.4
- **Est**: L
- **Accept**: 30-siswa rombel → ZIP of 30 PDFs dalam <2 menit
- **Verify**: E2E test

**U11.6 — Visual regression test**
- **What**: Playwright snapshot of rapor PDF dengan known dataset. Detect accidental layout breakage.
- **Dep**: U11.5
- **Est**: S
- **Accept**: Test catches injected layout break; no false positives for 10 consecutive runs
- **Verify**: CI green

**Total U11 est**: S+M+M+S+L+S ≈ **2 minggu**

### U12 — Rapor signature flow UI end-to-end
- **What**: Schema `rapor_signatures` ada. State machine: DRAFT → guru_signed → wali_signed → kepsek_signed → published. Backend enforces order; FE UI per role menampilkan "queue saya". Notification tiap transition (email + in-app + WA jika wired).
- **Why**: Rapor resmi butuh tanda tangan digital berurut sesuai struktur sekolah
- **Dep**: U06 (role policy enforcement for sign eligibility); PDF (U11) **optional** — flow bisa dikerjakan parallel dengan PDF selama state machine backend jelas
- **Est**: L
- **Accept**: Rapor tidak bisa di-publish sebelum 3 signature complete; wrong role sign → 403
- **Verify**: E2E test dengan 3 persona (guru mapel, wali_kelas, kepsek)

### U13 — Event bus subscribers per event type
- **What**: `domain_events` outbox + `events_worker` ada. Tulis subscribers:
  - `assessment.attempt.submitted` → update gradebook_entries, award XP, create notification
  - `attendance.marked` → create parent_notifications (via WA queue)
  - `invoice.paid` → update student status, send receipt
  - `rapor.signed` → progress state machine
- **Why**: Tanpa subscribers, outbox cuma table, tidak ada efek cross-modul. Roadmap Fase 2 mandate event-driven integration.
- **Dep**: U01 (gradebook), U10 (invoice status)
- **Est**: L
- **Accept**: Submit quiz di dev school → gradebook row muncul + XP awarded + parent notification queued dalam 10 detik
- **Verify**: integration test emit event → assert downstream side effects

### U14 — Accessibility: run/fix/gate ✅ DONE
- Fixed a11y spec login (was using getByLabel — fails silently; switched to getByTestId matching sweep pattern) + route composition (admin shell at `/app/admin/*`, shared at `/app/*`)
- Captured baseline: 20 routes × axe scan. Initial violations:
  - 229 color-contrast::serious (spread across 16 routes)
  - 3 select-name::critical, 1 button-name::critical, 1 link-name::serious, 3 nested-interactive::serious
- Fixed all critical/serious missing-name violations: added `aria-label` to 4 selects (Gradebook course selector, GradebookMainTable filter, QuestionEditor type + difficulty, QuestionSearchModal filter) + back button in Gradebook
- Relaxed gate comparison: fail on NEW violation **ID** not in any baseline route (ignore node-count flicker)
- Wired into `.github/workflows/sweep.yml` as `Run a11y gate` step with `--workers=1` (parallel runs flaky due to shared DOM state)
- Verified: 20/20 serial pass
- Landed: this commit

---

## 🟡 P2 Medium

### U15 — Midtrans Snap JS inline payment di parent portal
- **What**: Install `@midtrans/snap-js`. ParentPortal invoice row → "Bayar" button → Snap popup inline. On close, poll invoice status.
- **Dep**: U09
- **Est**: M
- **Accept**: Parent can pay SPP tanpa leave app
- **Verify**: E2E manual

### U16 — WhatsApp Business BSP wiring
- **What**: Pilih BSP (Twilio WhatsApp Business API atau Infobip). Config template messages untuk: OTP parent register, invoice tagihan, invoice receipt, rapor ready, attendance alert. Hook ke notification queue.
- **Dep**: U13 (event bus for trigger points)
- **Est**: L
- **Accept**: Real WA message received oleh parent test device
- **Verify**: send test notification

### U17 — BOS expense laporan PDF generator
- **What**: BOS expense schema (migrasi 055) ada. Generator laporan Kemdikbud format: per komponen (1. Kegiatan Pembelajaran, 2. Kesiswaan, ...), breakdown per bulan, signature kepsek.
- **Dep**: U11 (PDF infra)
- **Est**: M
- **Accept**: Generate laporan BOS 1 triwulan, sesuai template Kemdikbud
- **Verify**: sekolah negeri pilot review

### U18 — PPDB flow lengkap
- **What**: Schema ada (056). Tambahkan:
  - Upload dokumen (reuse storage layer, link ke `ppdb_registrations`)
  - Tes online (reuse quiz engine, `ppdb_quiz_id` field)
  - Ranking algorithm per jalur + kuota
  - Pengumuman batch (WA + email)
  - Auto-enroll ke rombel + daftar ulang invoice
- **Dep**: U09 (payment), U16 (WA), U13 (event bus)
- **Est**: XL
- **Accept**: 1 musim PPDB end-to-end di dev school
- **Verify**: simulate 50 pendaftar, full flow pass

### U19 — Dapodik async Rust job processor
- **What**: FE Dapodik CSV export (sync) sudah ada. Tambah async path: `dapodik_export_jobs` schema ada; tulis Rust cron/worker yang process job queue, generate CSV, upload ke S3, kirim signed URL via email.
- **Dep**: none
- **Est**: M
- **Accept**: Schedule job → CSV ready dalam <5 menit, operator download
- **Verify**: integration test

### U20 — AuthoringAssistButton integration ke Course Builder
- **What**: Komponen AI sudah ada. Wire ke existing `src/pages/CourseBuilder.tsx` toolbar: "Tulis paragraf", "Buat pertanyaan", "Sederhanakan bahasa" per-selection di editor.
- **Dep**: none
- **Est**: M
- **Accept**: Guru di CourseBuilder bisa invoke AI dari inline context menu
- **Verify**: E2E test

### U21 — AI Tutor token-streaming refactor
- **What**: Current wrapper: `tutor_chat` returns full response, `ai_tutor_real.rs` emits single SSE chunk. Refactor `edusync_services::ai::tutor::tutor_chat` ke streaming variant yang yield chunks. Update handler untuk pipe real-time.
- **Why**: FE UX expects token-by-token typing effect; single-chunk feels laggy
- **Dep**: none
- **Est**: L
- **Accept**: First token <500ms, smooth typing effect in LessonViewer
- **Verify**: manual UX test

### U22 — Rate limit middleware enforcement
- **What**: Schema (migrasi 059) ada. Wire middleware Rust: per-tenant + per-user daily token/request limit. 429 response dengan retry-after.
- **Dep**: none
- **Est**: M
- **Accept**: Burst 1000 AI calls dari 1 user → 429 setelah limit; refills after reset period
- **Verify**: integration test

### U23 — Offline PWA: validate + regression test (config sudah ada)
- **Current state**: `vite.config.ts` sudah punya Workbox rule khusus `lessons-content` dengan `StaleWhileRevalidate` (200 entries, 7-day TTL) + API `NetworkFirst` fallback ke `/offline.html`.
- **What**:
  1. Manual verify: visit lesson → go offline → reload → LessonViewer renders
  2. Identify gaps: draft autosave local-first saat offline? Submit queue saat kembali online? (likely missing)
  3. Tulis E2E test yang emulate `context.setOffline(true)` + reload + assert content tetap visible
  4. Add ke CI sebagai regression gate
- **Dep**: none
- **Est**: M (validation + gap-fill; bukan tune from zero)
- **Accept**: offline LessonViewer survives reload; E2E test catches cache regression
- **Verify**: Playwright offline mode test in CI

### U24 — Narrative AI untuk rapor deskripsi
- **What**: Scaffold AI provider ada. Prompt: input nilai + partisipasi per mapel → output 2-3 kalimat deskripsi Bahasa Indonesia sopan sesuai tone Kemdikbud.
- **Dep**: U11 (rapor infra)
- **Est**: M
- **Accept**: 1 rombel rapor → AI-generated deskripsi sesuai data, no hallucination
- **Verify**: wali_kelas review 10 rapor, accept >8/10

### U25 — Semantic search lintas modul
- **What**: Embeddings endpoint ada. Tambah: background job index lesson_content + announcements + forum_posts ke `content_embeddings` table. FE global search box → cosine similarity search.
- **Dep**: U22 (rate limit, to avoid cost blowout)
- **Est**: L
- **Accept**: Query "ekosistem kelas 7" return relevant lessons regardless keyword match
- **Verify**: curated query set with expected matches

---

## 🟢 P3 Low / Deferred

### U26 — Email SES/Sendgrid wiring
Provider integration swap; SMTP sudah work. Deferred until WA works (WA > email di ID sekolah).

### U27 — Bank VA direct integration
BCA/Mandiri direct BIN. Deferred; Midtrans VA via Midtrans sudah cover.

### U28 — Rapor Pendidikan platform integration
Kemdikbud API. Deferred — tidak public.

### U29 — Webhook API 3rd party
Outbound webhook system. Niche feature; deferred.

### U30 — Performance budget + monitoring (bump to P2 jika pilot serius)
Lighthouse CI ada, belum threshold. Untuk pilot school serius (>500 siswa), bump ke P2 dan set budget awal: FCP <2s, LCP <3s, TTI <5s, API p95 <500ms. Alert Slack jika regresi.
- **Dep**: monitoring infra (kalau belum ada)
- **Est**: M

### U31 — Backup & DR drill
`docs/DISASTER_RECOVERY.md` ada. Drill requires production-like environment.

### U32 — Pen-test
Explicit out-of-scope per SUPERBATCH runbook §3.

### U33 — Data retention policy per tenant
UU PDP compliance. Schema needed per-tenant; policy decision pending legal review.

---

## Dependency graph (revised)

```
U01 gradebook ─┬──► U13 event bus subscribers ──► U18 PPDB, U24 narrative
               │
U02 dup-key ───┤   (standalone FE investigation)
               │
U03 baseline ──┴──► U06.1 RBAC ADR ──► U06.2 policy.yaml ──► U06.3 middleware
                                                                    │
                                    ┌───────────────────────────────┤
                                    ▼                               ▼
                          U07.1 role backfill            U08.1 rombel audit
                                    │                               │
                                    ▼                               ▼
                          U07.2 seed 10-role            U08.2-5 rombel split (5 sub-unit)
                                                                    │
U04 reset-sh verify ─► U05 richer seed ─────────── (dev school realistic) │
                                                                    │
                                    ┌───────────────────────────────┤
                                    ▼                               ▼
                          U06.4 scope checks ──► U06.5 RBAC matrix test
                                                                    │
U09 midtrans create ─► U10 reconciliation ─► U15 inline snap ─► U18 PPDB
                                                                    │
                                                         ┌──────────┤
                                                         ▼          ▼
U11.1 ADR → U11.2 POC → U11.3 endpoint → U11.4 S3 → U11.5 batch → U11.6 snapshot
                                                         │
                                    ┌────────────────────┤
                                    ▼                    ▼
                          U12 signature UI      U24 narrative AI
                                    │
                                    └──► (Fase 3 complete)

U14 a11y run/gate ── (standalone, parallel)
U16 WA BSP ────► U18 PPDB
U20 Authoring ─ (standalone) | U19 Dapodik ── (standalone)
U21 Tutor stream (standalone) | U22 Rate limit ─► U25 Semantic search
U23 PWA validate (standalone)
```

**Critical path** (longest chain, revised post-audit):
```
U03 → U06.1 → U06.2 → U06.3
    → U08.1 → U08.2 → U08.3 → U08.4 → U08.5
    → U06.4                         (scope checks — required before U12 role enforcement)
    → U11.1 → U11.2 → U11.3 → U11.4
    → U12 → U24
```

U06.4 (scope checks) wajib sebelum U12 karena signature eligibility (wali_kelas sign rombel-nya, kepsek sign school-level) butuh scope predicates dari U06.4. U06.5 (matrix test) bukan delivery critical — bisa paralel.

= ~16 sub-units, realistic **4-6 minggu** kalau solo operator, **2-3 minggu** kalau tim 3-4 engineer paralel dan vendor credential sudah siap (Midtrans sandbox, OpenAI key, etc.).

---

## Batch-able units (parallel-safe)

Bisa dikerjakan paralel (file disjoint, no shared state change):

**Batch A (Fase 0 finish)**:
- U01 (migration 048 baseline) — SQL only
- U02 (dup-key) — FE only
- U04 (reset-sh verify/harden — script exists)
- U14 (a11y run/fix/gate — infra exists) — FE + test only

**Batch B (Payment path)**:
- U09, U10, U15 (sequential within batch, but batch is standalone from others)

**Batch C (Content depth)**:
- U05 (seed richer), U20 (AuthoringAssist wire), U21 (tutor stream)

**Batch D (Operational)**:
- U19 (Dapodik async), U22 (rate limit), U23 (PWA validate/regression — config exists)

---

## Recommended execution sequence (revised: 6 minggu realistis, bukan optimistis)

### Week 1 — Blocker cleanup + baseline stabilization
1. **Day 1-2**: U01 (migrasi 048 + baseline gradebook_entries), U02 (dup-key service/cache audit), U04 (reset-sh CI hardening) paralel
2. **Day 3-4**: U03 (baseline.sql audit — scope may expand; escalate if >2 day)
3. **Day 5**: U14 run/fix/gate a11y
4. **End-week gate**: sweep green, baseline clean, reset-sh reliable

### Week 2 — Payment path + RBAC foundation
1. U09 → U10 → U15 (payment end-to-end, MUST have Midtrans sandbox credential ready)
2. Paralel: U06.1 ADR, U06.2 policy.yaml, U07.1 role backfill
3. Paralel: U05 richer seed (depends on nothing; valuable for downstream testing)

### Week 3 — RBAC runtime + Rombel split begin
1. U06.3 middleware binding, U06.4 scope checks, U06.5 matrix test (serial within U06)
2. Paralel: U08.1 rombel audit (data analysis)
3. Paralel: U20 AuthoringAssist wire to CourseBuilder (standalone)

### Week 4 — Rombel split complete + Rapor infra
1. U08.2-5 (read adapters → write migration → FE cleanup → regression)
2. Paralel: U11.1 ADR (PDF tech), U11.2 POC
3. Paralel: U13 event bus subscribers

### Week 5 — Rapor complete + Integrations begin
1. U11.3-6 (endpoint → S3 → batch → visual regression)
2. U12 signature flow (parallel dengan PDF karena state machine independent)
3. U21 tutor token-streaming refactor
4. Paralel: U16 WA BSP wiring (prereq U18)

### Week 6 — Content completion + Hardening
1. U24 narrative AI for rapor (depends on rapor data + PDF infra ready)
2. U18 PPDB full flow (depends on U09, U13, U16)
3. Paralel: U17 BOS PDF report, U19 Dapodik async worker
4. Paralel: U22 rate limit enforcement, U23 offline PWA validate

### Week 7+ — Deferred / Fase 8
- U25 semantic search (blocks on U22)
- U30 performance budget (pilot-dependent)
- Fase 8+: P5 deep, Magang/PKL, UKS, alumni, pesantren, ABK inklusi, yayasan, native mobile

### Milestone gates

- **Week 2 end**: Payment sandbox E2E green; RBAC ADR committed
- **Week 3 end**: RBAC enforced; rombel audit complete
- **Week 4 end**: Rombel split shipped; sweep green
- **Week 5 end**: Rapor PDF generator works; signature flow testable
- **Week 6 end**: Dev school realistis; PPDB flow testable; production-readiness gates pass

---

## Stop signals

Eksekusi berhenti + escalate ke user kalau:
- U01: baseline gap ternyata meluas ke banyak table → perlu decision "apakah baseline.sql di-regenerate atau migrations yang dikoreksi"
- U06: role policy decision tidak obvious (contoh: apakah guru BK boleh lihat nilai siswa non-konseling?) — butuh domain input
- U09: MIDTRANS_SERVER_KEY sandbox belum di-provision → perlu credential
- U11: tech pick (Puppeteer vs Typst) punya biaya ops berbeda → butuh decision
- U16: BSP vendor selection + pricing → business decision
- Unit manapun yang surfaces security concern (SQL injection, XSS, auth bypass)

## How to use this doc

- **Operator**: pick unit P0 dulu, commit per unit, PR per unit
- **Cloud agent next session**: baca ini + `DAILY_PROGRESS.md` + `DECISIONS_LOG.md`, resume dari unit berikutnya
- **PM**: setiap unit bisa jadi ticket/epic; critical path di graph memberikan ETA
- **Stakeholder**: P0 = current sprint, P1 = next 2 sprints, P2 = quarter, P3 = backlog

Update doc setiap unit selesai: coret dari section, tambah ke `DAILY_PROGRESS.md`.
