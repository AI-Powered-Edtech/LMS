# 06 — Implementation Roadmap

Roadmap bertahap untuk mentransformasi EduSync dari "LMS dengan banyak fitur" menjadi **Indonesia School OS**. Jangan big-bang; sequence berdasarkan dependency + value.

## Prinsip

1. **Ship-as-you-go** — setiap milestone = deployable state, bukan rewrite panjang
2. **Dependency-respect** — tidak mulai Rapor sebelum Academic Year / Rombel / Gradebook proper
3. **Validate with pilot schools** setiap milestone — bukan spec paper
4. **Don't rebuild what works** — existing FULL modules (auth, LTI, parent portal, realtime) tetap jalan; incremental upgrade

## Fase & milestone

### 🏗️ Fase 0 — Stabilization (Bulan 1-2)

**Tujuan**: zero console errors, sweep green, orphan features dibersihkan, foundation kuat.

Mulai 2026-04-24. Progress:

- [x] Sweep real-backend 3 persona, capture semua issue
- [x] Fix console/HTTP errors hasil sweep (migration 037, data plane allowlist, FE fixes)
- [x] Print-friendly CSS (PR #248)
- [x] i18n scaffolding react-i18next (PR #249)
- [x] Indonesia format helpers + audit 12 call site (PR #250)
- [x] CSV export helper + wire 3 DataTable (PR #251)
- [ ] User rebuild backend + apply migration 037
- [ ] Re-run sweep → confirm all clean
- [ ] Fix residual React duplicate key warning (teacher dashboard) — investigation stalled; retry dengan akses real-backend
- [ ] **Audit orphan features** (dok 03 bagian C) — keputusan per-item: wire, delete, atau hide UI
- [ ] Remove dual-path quiz/xp handlers (decide: Rust or RPC, bukan dua-duanya)
- [ ] Playwright sweep di CI (gate: no regression)
- [ ] Accessibility baseline audit (ARIA, keyboard nav pada top-10 screens)

**Exit criteria**:
- Sweep 3 persona × 93 screen = 0 console error
- Semua orphan UI status clear (wired / removed / hidden)
- Test harness jalan di CI

### 🏫 Fase 0.5 — Dev School Seeding (Bulan 2)

**Tujuan**: ganti blocker "butuh pilot school" dengan dev school synthetic yang realistic. Memungkinkan semua fase berikutnya diuji E2E tanpa menunggu sekolah real.

**Synthetic tenant: "SMA Nusantara Dev"**
- 1 tenant, 1 academic year (2026/2027), 2 semester
- 1 kepala sekolah, 2 wakasek (kurikulum, kesiswaan), 1 TU, 1 guru BK
- 4 rombel: X-IPA-1 (30 siswa), X-IPA-2 (28), X-IPS-1 (26), XI-IPA-1 (30)
- 6 guru mapel (Matematika, B. Indonesia, B. Inggris, Fisika, Biologi, PKn) + 4 wali kelas
- 120 siswa + 120 parent account (1:1 relationship)
- 8 subject + CP/ATP samples per phase E (SMA X) Kurmer
- 4 sample courses dengan 8-12 lessons masing-masing
- 20 assignments (10 graded, 10 open), 15 quiz dengan attempts
- 1 P5 project (Tema: "Kewirausahaan"), 2 extracurricular
- Sample invoices SPP 3 bulan, 60% paid + 40% pending
- Sample attendance 2 minggu terakhir (90% hadir rata-rata)
- Sample notifications, announcements, forum posts

**Deliverables**:
- [ ] `edusync-api/schema/dev_seed.sql` — idempotent seed script
- [ ] `edusync-api/scripts/reset-dev-school.sh` — drop tenant + recreate
- [ ] `docs/dev-school-accounts.md` — daftar kredensial semua persona
- [ ] Playwright sweep extended: persona wali_kelas, wakasek_kurikulum, principal, guru_bk, tu, parent_specific_child
- [ ] CI job harian: reset + full sweep + regression check

**Exit criteria**:
- Dev school bisa di-reset dalam <30 detik
- Sweep 9 persona lengkap pass
- Setiap feature development berikutnya **wajib** punya E2E test di dev school

### 🏛️ Fase 1 — Core Academic Foundation (Bulan 3-4)

**Tujuan**: data model sekolah Indonesia proper. Tanpa ini, rapor/dapodik tidak mungkin.

Entitas baru (dok 04 shared kernel):
- [ ] `academic_years` table + CRUD + UI admin
- [ ] Refactor `semesters` agar link ke `academic_year_id`
- [ ] `grade_levels` (kelas 1-12 SD/SMP/SMA, unified)
- [ ] `rombel` (rombongan belajar) — split dari `classes`: `classes` jadi "course-instance", `rombel` jadi "class-section"
- [ ] `subjects` (mata pelajaran) dengan kurikulum phase
- [ ] `curriculum_items` (CP/ATP hierarchical)
- [ ] `timetable_slots` (jadwal pelajaran)
- [ ] `student_dossier` (NISN, NIK, alamat, wali)
- [ ] `staff_dossier` (NIP, NUPTK, sertifikasi)

Role refactor:
- [ ] RBAC matrix (role × module × action) — redesign dari coarse role
- [ ] Add roles: `wali_kelas`, `wakasek`, `guru_bk`, `tu`, `yayasan`, `pengawas`
- [ ] Migrate existing memberships ke role baru

Migration existing `classes`:
- [ ] Migration audit: mana `classes` yang seharusnya `rombel`, mana yang `course-instance`
- [ ] Gradual rename + data migration

**Exit criteria**:
- Admin bisa setup TA 2026/2027, semester, rombel X-IPA-1 lengkap dengan wali kelas
- Jadwal pelajaran per rombel visible
- Siswa ter-enroll ke rombel, bukan langsung ke course

### 📊 Fase 2 — Kurmer Assessment & Gradebook (Bulan 5-6)

**Tujuan**: asesmen sesuai Kurmer. Output: nilai intrakurikuler + kualitatif.

- [ ] Lesson/assignment/quiz di-tag ke `curriculum_item` (CP/ATP)
- [ ] Gradebook dual-mode: numerik + kualitatif deskriptor (BB, MB, BSH, SB)
- [ ] Nilai per CP (bukan hanya per assignment)
- [ ] AKM-style question type: stimulus + multiple questions
- [ ] P5 module: project tema lintas mapel, peer + self assessment, portofolio
- [ ] Kokurikuler & ekstrakurikuler record

Event bus introduction:
- [ ] Add `domain_events` outbox table
- [ ] Worker process untuk dispatch
- [ ] Migrate first 2 integrations ke event-driven:
  - `assessment.attempt.submitted` → gradebook + XP + notification
  - `attendance.marked` → parent notification

**Exit criteria**:
- Guru input nilai per CP, siswa lihat rapor per-CP preview
- P5 project dapat dibuat dan dinilai
- Event bus terbukti reliable untuk 2 pilot integrations

### 📄 Fase 3 — Rapor & Reporting (Bulan 7)

**Tujuan**: output formal — rapor Kurmer PDF yang bisa dipakai sekolah.

- [ ] Rapor template engine (PDF): intrakurikuler per mapel per CP, kokurikuler P5, ekstrakurikuler, sikap, absensi
- [ ] Signature flow: guru mapel → wali kelas → kepala sekolah
- [ ] Narrative AI: generate kalimat deskripsi per mapel dari data nilai + partisipasi
- [ ] Batch export (semua siswa 1 rombel)
- [ ] Student/parent view rapor online + PDF download
- [ ] Report_handlers.rs: finalize (replace stub)

**Exit criteria**:
- Sekolah pilot bisa terbitkan rapor semester valid tanpa pakai sistem lain

### 💰 Fase 4 — Finance & PPDB (Bulan 8-9)

**Tujuan**: revenue operation + recruitment.

Finance:
- [ ] Midtrans + Xendit integration (pilih satu atau keduanya)
- [ ] SPP recurring invoice generation
- [ ] Virtual Account generation
- [ ] Payment reconciliation webhook
- [ ] Parent portal: lihat tagihan + bayar inline (link ke gateway)
- [ ] WhatsApp notification tagihan + receipt
- [ ] BOS expense tracking + laporan generator (negeri)

PPDB full flow:
- [ ] Period management, jalur selection, kuota
- [ ] Upload dokumen (akta, KK, rapor SD/SMP)
- [ ] Tes online (reuse quiz engine)
- [ ] Ranking + pengumuman
- [ ] Otomatis enroll ke rombel setelah diterima + payment daftar ulang

**Exit criteria**:
- Sekolah pilot bisa collect SPP via EduSync
- Musim PPDB berikutnya dijalankan end-to-end di EduSync

### 🔗 Fase 5 — Integrations (Bulan 10)

**Tujuan**: jembatani ke ekosistem Indonesia.

- [ ] Dapodik CSV export (student + staff)
- [ ] WhatsApp Business API proper (BSP: Infobip / MessageBird / Twilio)
- [ ] Email via SES/Sendgrid proper
- [ ] Bank VA (BCA, Mandiri direct)
- [ ] Integrasi ke Rapor Pendidikan platform (kalau API available)
- [ ] Webhook API untuk integrasi 3rd party (SIS, HRIS)

### 🎯 Fase 6 — AI Polish & Insight (Bulan 11)

**Tujuan**: AI menjadi lapisan omnipresent, bukan fitur terpisah.

Per dok 05:
- [ ] AuthoringAssist inline di Course Builder (retire page "Creator")
- [ ] SpeedGrader AI scoring + rubric
- [ ] Lesson Viewer Q&A sidebar (tutor streaming wired)
- [ ] Plagiarism: pilih + integrate (Turnitin/Copyleaks)
- [ ] Principal narrative insight bulanan
- [ ] Parent weekly digest AI-generated
- [ ] Moderation AI (toxic classifier)
- [ ] Semantic search lintas modul

### 🛡️ Fase 7 — Non-Functional (Bulan 12)

**Tujuan**: production-grade untuk skala.

- [ ] Offline PWA: lesson cache, draft local-first, sync when online
- [ ] Audit log coverage complete (review every mutation)
- [ ] Performance budget + monitoring (per-page load, query latency)
- [ ] Rate limiting per tenant
- [ ] Backup & disaster recovery drill
- [ ] Pen-test security audit
- [ ] SLO definition & incident runbook
- [ ] Data retention policy per tenant (UU PDP compliance)

### 🚀 Fase 8+ — Expansion (Tahun 2)

- P5 deep: portofolio multi-semester, showcase, rubric Kurmer spesifik
- Magang/PKL (SMK)
- UKS, BK lengkap
- Alumni tracking
- Pesantren variant (hafalan Quran, kalender Hijriyah)
- ABK/inklusi (IEP, asesmen adaptif)
- Yayasan multi-sekolah dashboard
- Mobile native app (kalau PWA tidak cukup)

## Dependency graph

```
Fase 0 (stabilize)
     │
     ▼
Fase 1 (Academic Foundation) ─┐
     │                        │
     ▼                        ▼
Fase 2 (Kurmer Assessment)   Fase 4 (Finance & PPDB — can parallel)
     │
     ▼
Fase 3 (Rapor) ────────────── depends on 1 + 2
     │
     ▼
Fase 5 (Integrations) ─────── depends on 1 (dapodik), 4 (payment gateway)
     │
     ▼
Fase 6 (AI Polish) ────────── can start earlier; tighter after 2-3
     │
     ▼
Fase 7 (NFR) ───────────────── cross-cutting, start day 1 with baseline
```

## Team sizing (rough)

Realistic untuk pace di atas (12 bulan):
- 3-4 full-stack engineers (backend-leaning, Rust comfortable)
- 1-2 frontend specialists (React, UI/UX sensibility)
- 1 AI/ML engineer (part-time cukup untuk Fase 0-5, full di Fase 6)
- 1 PM / domain expert sekolah Indonesia
- 1 QA (automation) + contract sekolah untuk pilot feedback

Lebih kecil: possible tapi timeline stretch 2x. Lebih besar: coordination overhead, tidak accelerate proportional.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sekolah pilot drop mid-way | Medium | High | Multi-sekolah pilot sejak awal; kontrak jelas |
| Regulasi Kurmer berubah | Medium | Medium | Modul curriculum designed agar fleksibel (CP/ATP configurable) |
| Payment gateway integration longer than expected | Medium | Medium | Start POC di Fase 0 background; buffer |
| AI cost runaway | Medium | High | Rate limit + kill switch day 1 |
| Dapodik format berubah | Low | Low | Export, bukan sync; easy to adapt |
| Tenant isolation bug (data leak) | Low | Critical | Integration test per release; security audit Fase 7 |
| Refactor `classes` → `rombel` breaks existing data | High | Medium | Migration dengan shadow read, rollback plan |

## Quick wins (parallel, anytime)

Bukan critical path, tapi high-value/low-effort:
- Indonesia-first UI audit: istilah, format tanggal DD/MM/YYYY, format angka pakai titik/koma Indonesia
- Bahasa Indonesia proofreading (banyak tooltip/button masih "awkward Indonesian" atau campuran English)
- Print-friendly CSS untuk gradebook, rapor preview
- Excel export di semua tabel
- QR code untuk join class, attendance
- Mobile-first audit screen-by-screen (responsive polish)

## How to use this doc

- **Eng lead**: konfirmasi/adjust sequencing sesuai realitas tim & timeline
- **Autonomous cloud agent**: ikuti `SUPERBATCH_CLOUD_AGENT.md` — self-contained brief dengan pre-made decisions
- **Stakeholder**: setiap fase punya exit criteria — itu yang dipresentasikan ke board, bukan progress %

## Authoritative decisions (pre-made untuk unblock autonomous execution)

Tanpa ini, agent cloud akan stuck di open questions. Ini keputusan default — user override kapan saja dengan edit dokumen ini.

| Area | Keputusan | Rasional |
|---|---|---|
| Payment gateway | **Midtrans** (primary), Xendit (secondary fallback di Fase 5) | Familiar di sekolah Indonesia, doc lengkap, support VA BCA/Mandiri langsung |
| Plagiarism | **Build ML in-house** (embedding + cosine similarity via existing AI layer) | Cost-conscious; defer Turnitin/Copyleaks sampai proven scale need |
| Rapor format | **Kurmer 2024 Kemdikbud template** | Default Indonesia; research sample PDF dari docs publik Kemdikbud |
| Role RBAC | **Matrix-based 10 roles**: admin, principal, wakasek, teacher, wali_kelas, guru_bk, tu, student, parent, yayasan | Sesuai struktur sekolah Indonesia standar; lihat `03-gap-analysis.md` |
| `classes` → `rombel` | **Additive migration**: `classes` tetap (course-instance), tambah `rombel` (class-section) | Zero-downtime; shadow read; deprecate `classes` aliasing di Fase 3 |
| Pilot school | **Dev school synthetic** ("SMA Nusantara Dev") — lihat Fase 0.5 | Tidak menunggu pilot real; validasi di real school di Fase 5+ |
| Dapodik integration | **One-way CSV export only** (Fase 5) | API Dapodik tidak publik; export cukup untuk operator sekolah |
| Offline strategy | **PWA via Workbox** (Fase 7) | Standard; no native app dulu |
| Mobile | **PWA + responsive** (Fase 7); native app deferred ke Fase 8+ | Cakupan Indonesia Android cukup dengan PWA |
| i18n default | **Bahasa Indonesia**, English mode tersedia tidak wajib | Target ID-first |
| AI provider | **Groq** (latency-sensitive: tutor, moderation), **Anthropic Sonnet** (quality: essay, narrative) | Cost/quality balance per use-case |
| Backend migration RPC → Rust | **Incremental per-domain** (dok 04 strategy) | Zero big-bang |
| Event bus | **pg_notify + outbox table** dulu (Fase 2), migrate external bus di Fase 8+ kalau perlu | YAGNI |
| Tenant pricing | **Per-siswa/bulan** (deferred konfirmasi, agent skip billing model dulu) | Asumsi; agent fokus teknis |

Doc ini **living**. Update tiap bulan setelah retrospective.
