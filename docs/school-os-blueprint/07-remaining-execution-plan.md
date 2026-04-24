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

### U01 — Migration 048 baseline gap (`gradebook_entries`)
- **What**: Audit apakah `gradebook_entries` table seharusnya exist di baseline; kalau iya, buat migration yang create table; lalu apply 048
- **Why**: 048_gradebook_dual_mode gagal apply → dual-mode descriptor (BB/MB/BSH/SB) tidak bisa dipakai → rapor Kurmer incomplete
- **Dep**: none
- **Est**: S
- **Accept**: `migration 048` apply clean, tabel `gradebook_entries` exists, `mode` enum column ada
- **Verify**: `psql` inspect, sweep `admin/gradebook` + `teacher/gradebook` green

### U02 — React dup-key warning (teacher dashboard + adaptive-paths)
- **What**: Runtime instrument untuk trace UUID `257d53d2-0bae-44c1-9c23-470df60d9ed2` ke sumber `.map()`. Tambah `console.assert(unique)` di setiap list render TeacherDashboard + semua komponen yang lazy-loaded pada routes tsb. Rerun sweep, identify line, fix di service layer (dedup).
- **Why**: Non-crash warning, tapi indikator ada bug data duplication—bisa berkembang jadi bug fungsional (render ghost item, key collision di diff reconciliation)
- **Dep**: none
- **Est**: M
- **Accept**: sweep 0 console error di teacher/dashboard + teacher/adaptive-paths
- **Verify**: rerun sweep

### U03 — Backup baseline state `edusync-api/schema/baseline.sql` audit
- **What**: Audit apakah baseline.sql match actual DB `lms-db-1`. Jika drift, document expected baseline. Fix: regenerate baseline dengan `pg_dump` atau catat di migration seed.
- **Why**: Next fresh deploy akan miss tables seperti `gradebook_entries` (U01 root cause), pattern ini bisa berulang. Multiple `037_*` migration numbering collision juga bukti baseline drift.
- **Dep**: none
- **Est**: M
- **Accept**: Fresh postgres + baseline.sql + semua migrations → identical schema dengan `lms-db-1`
- **Verify**: diff schema between fresh + existing

---

## 🟠 P1 High

### U04 — `scripts/reset-dev-school.sh`
- **What**: Write the script. Drop tenant cascade (slug='sma-nusantara-dev') + re-run `dev_seed.sql`. Idempotent.
- **Why**: `docs/dev-school-accounts.md` references it; CI nightly depends on reset capability
- **Dep**: none
- **Est**: S
- **Accept**: `./scripts/reset-dev-school.sh` runs <30s, dev school restored to clean state
- **Verify**: run twice, state stable

### U05 — Dev seed richer content (roadmap Fase 0.5 spec)
- **What**: Extend `dev_seed.sql` dengan: 8 subjects CP/ATP samples, 4 sample courses × 8-12 lessons, 20 assignments, 15 quizzes + attempts, 1 P5 project, 2 extracurricular, 3-month SPP invoices (60% paid), 2-week attendance (90% rata-rata), sample notifications/announcements/forum
- **Why**: Sweep dengan realistic data exposes more bugs; demo untuk pilot school butuh depth
- **Dep**: U04 (reset script)
- **Est**: L
- **Accept**: 9-persona sweep menghasilkan realistic render (tidak empty states everywhere)
- **Verify**: visual spot-check of screenshots; count of non-empty data in each persona dashboard

### U06 — RBAC authorization middleware enforcement
- **What**: Schema 10-role (migrasi 046) ada; middleware belum enforce. Wire ke `edusync-api/crates/middleware/src/rbac.rs`: per-route policy map (role × action × resource). Matrix: siapa boleh GET/POST/PATCH/DELETE di endpoint mana.
- **Why**: Tanpa enforcement, "RBAC matrix" cuma nama string di DB. Audit & security risk.
- **Dep**: U03 (baseline audit so policy attachments stable)
- **Est**: XL
- **Accept**: Pengujian: guru BK tidak bisa akses finance endpoint; wali_kelas bisa akses rombel yang diampu; TU tidak bisa akses gradebook
- **Verify**: tulis `tests/e2e/rbac.spec.ts` dengan 10-role × 5 endpoint matrix; expect right HTTP codes

### U07 — Migration existing memberships ke 10-role
- **What**: Data migration script: profile dengan role="teacher" → tentukan berdasarkan tugas tambahan apakah jadi wali_kelas/wakasek/guru_bk. Admin sekolah → siapa yang harus jadi principal. TU ditentukan dari administrative_assignment.
- **Why**: Tanpa migrasi, 10-role schema kosong, semua tetap di coarse role. Tapi kalau fresh install, tidak perlu ini.
- **Dep**: U06 (policy structure settled)
- **Est**: M (per sekolah pilot)
- **Accept**: Di dev school, minimal 1 user per role dari 10-role matrix
- **Verify**: `SELECT role, COUNT(*) FROM user_roles GROUP BY role`

### U08 — `classes` → `rombel` audit + gradual split
- **What**: `classes` saat ini ambigu (course-instance vs class-section). Audit existing rows: mana representasi rombel (terikat ke siswa tetap) vs course-instance (materi). Split data: clone ke `rombel` table untuk class-section semantics; biarkan course-instance tetap di `classes`.
- **Why**: Blok kalkulasi rapor per-rombel yang benar (saat ini mencampur)
- **Dep**: U07 (role data settled)
- **Est**: L
- **Accept**: Gradebook, attendance, rapor accessors all query `rombel` untuk class-section context; `classes` hanya untuk course-instance
- **Verify**: grep remaining `from('classes')` in FE, confirm semantic usage correct

### U09 — Midtrans `create_payment` real API call
- **What**: Replace fake `snap-{uuid}` token in `payment_handlers.rs::create_payment` dengan real Midtrans Snap API call: POST ke `https://app.sandbox.midtrans.com/snap/v1/transactions` with base64 server key auth. Return real `snap_token` + `redirect_url`.
- **Why**: Parent portal payment flow broken — UI opens Snap popup dengan token fiktif → Midtrans rejects → payment never processed
- **Dep**: none (env `MIDTRANS_SERVER_KEY` config sudah di `.env.example`)
- **Est**: M
- **Accept**: sandbox transaction completes; webhook `midtrans_webhook` receives notification; invoice status updates
- **Verify**: manual end-to-end test dengan Midtrans sandbox account

### U10 — Payment reconciliation logic in webhook
- **What**: `midtrans_webhook.rs` sudah verify signature + insert payload. Tambah: UPDATE `invoice` status based on `transaction_status` ('settlement' → 'paid', 'cancel/expire/deny' → 'failed', 'pending' → 'pending'). Idempotent (handle repeated webhook).
- **Why**: Tanpa ini webhook cuma logs; invoice status tidak pernah updated
- **Dep**: U09
- **Est**: S
- **Accept**: Pay via sandbox → webhook received → invoice.status='paid' dalam 3 detik
- **Verify**: integration test dengan mocked webhook payload

### U11 — PDF renderer server-side untuk rapor
- **What**: Pilih: (a) Puppeteer-based service (Node sidecar), atau (b) Typst (Rust native), atau (c) wkhtmltopdf. Implement endpoint `POST /pdf/rapor/:rapor_id` yang render `RaporPrint.tsx` template → PDF binary. Store hasil di S3.
- **Why**: Saat ini hanya browser print (Ctrl+P per page). Batch export rapor 1 rombel impossible tanpa ini.
- **Dep**: U01 (gradebook proper), U08 (rombel)
- **Est**: XL (tech selection + impl + deploy)
- **Accept**: batch export 30 siswa → 30 PDF files in S3, downloadable via signed URL
- **Verify**: sekolah pilot terbitkan rapor semester

### U12 — Rapor signature flow UI end-to-end
- **What**: Saat ini schema `rapor_signatures` ada. UI flow: guru mapel sign per-mapel → wali kelas review + sign all → kepsek final sign. State machine di FE + backend. Email notification pada setiap transition.
- **Why**: Rapor resmi butuh tanda tangan digital berurut sesuai struktur sekolah
- **Dep**: U11 (PDF) — optional sebelum PDF works
- **Est**: L
- **Accept**: Rapor tidak bisa di-publish sebelum 3 signature complete
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

### U14 — Accessibility baseline fixes top-20 screens
- **What**: Spec `tests/e2e/a11y.spec.ts` ada tapi tidak run. Integrate `@axe-core/playwright`. Scan top-20 screens, fix errors (ARIA labels, keyboard nav, color contrast, focus traps). Add CI gate.
- **Why**: Sekolah inklusi butuh ini; compliance check; UX polish
- **Dep**: none
- **Est**: L
- **Accept**: axe scan 0 critical/serious violations di 20 screens
- **Verify**: `playwright test a11y.spec.ts` green, visible in CI

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

### U23 — Offline PWA lesson cache tuning
- **What**: PWA config generic. Tune strategy: lesson content → stale-while-revalidate, long TTL; API calls → network-first; static assets → cache-first.
- **Dep**: none
- **Est**: M
- **Accept**: LessonViewer render offline untuk lesson yang pernah di-visit
- **Verify**: devtools "offline" mode + reload

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

### U30 — Performance budget + monitoring
Lighthouse CI ada, belum threshold. Add SLO later when real traffic.

### U31 — Backup & DR drill
`docs/DISASTER_RECOVERY.md` ada. Drill requires production-like environment.

### U32 — Pen-test
Explicit out-of-scope per SUPERBATCH runbook §3.

### U33 — Data retention policy per tenant
UU PDP compliance. Schema needed per-tenant; policy decision pending legal review.

---

## Dependency graph

```
U01 gradebook ──┬──► U13 event bus subscribers ──► U18 PPDB, U24 narrative
                │
U02 dup-key ────┤   (standalone)
                │
U03 baseline ───┴──► U06 RBAC middleware ───► U07 role data ───► U08 rombel split
                                                                      │
                                                                      ▼
U04 reset-sh ────► U05 richer seed ────► (dev school full)           │
                                                                      │
U09 midtrans ───► U10 reconciliation ──► U15 inline snap ──► U18 PPDB
                                                                      │
U11 PDF infra ──► U12 signature UI ─────────────────────────────────► U24 narrative
            └──► U17 BOS report
                                                                      ▼
U14 a11y ────── (standalone, parallel)                              (Fase 3 complete)

U16 WA BSP ────► U18 PPDB
U20 Authoring ─ (standalone)
U19 Dapodik ── (standalone)
U21 Tutor stream ─ (standalone)
U22 Rate limit ─► U25 Semantic search
U23 PWA ─── (standalone)
```

**Critical path** (longest chain): U03 → U06 → U07 → U08 → U11 → U12 → U24 = **7 units, ~3 weeks** (rough).

---

## Batch-able units (parallel-safe)

Bisa dikerjakan paralel (file disjoint, no shared state change):

**Batch A (Fase 0 finish)**:
- U01 (migration 048 baseline) — SQL only
- U02 (dup-key) — FE only
- U04 (reset-sh script)
- U14 (a11y) — FE + test only

**Batch B (Payment path)**:
- U09, U10, U15 (sequential within batch, but batch is standalone from others)

**Batch C (Content depth)**:
- U05 (seed richer), U20 (AuthoringAssist wire), U21 (tutor stream)

**Batch D (Operational)**:
- U19 (Dapodik async), U22 (rate limit), U23 (PWA tune)

---

## Recommended execution sequence

### Week 1 (Blocker cleanup)
1. **Day 1-2**: U01, U02, U04 paralel
2. **Day 3-4**: U03 (baseline audit)
3. **Day 5**: U14 (a11y, can run paralel with U03)

### Week 2 (Payment + RBAC path begin)
1. U09 → U10 → U15 (serial, payment end-to-end)
2. Paralel: U06 (RBAC middleware)
3. Paralel: U05 (richer seed)

### Week 3 (Rombel + Rapor foundation)
1. U07 → U08 (role data + classes split)
2. Paralel: U11 (PDF infra tech selection + POC)
3. Paralel: U20 (AuthoringAssist wire)

### Week 4 (Rapor complete + Events)
1. U11 (PDF infra complete)
2. U12 (signature UI)
3. U13 (event bus subscribers)
4. Paralel: U21 (tutor streaming)

### Week 5 (PPDB + Integrations)
1. U16 (WA BSP) — prerequisite for U18
2. U18 (PPDB full flow)
3. Paralel: U19 (Dapodik async), U17 (BOS report)

### Week 6 (Hardening)
1. U22 (rate limit), U23 (PWA), U24 (narrative AI), U25 (semantic search)

### Beyond (Fase 8+, deferred)
P5 deep, Magang, UKS, alumni, pesantren variant, ABK inklusi, yayasan multi-sekolah, native mobile.

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
