# SUPERBATCH — Autonomous Cloud Agent Runbook

**Audience**: Cloud agent (Claude / equivalent) dengan full access ke repo, dev environment, Docker, PostgreSQL, CI. Jalan berjam-jam / sehari penuh tanpa supervision.

**Mission**: Eksekusi semua blueprints & plan di `docs/school-os-blueprint/` sampai selesai, atau sampai hit hard-stop criteria. Transformasi EduSync LMS → Indonesia School OS.

---

## 0. Bootstrap (wajib baca sebelum kerja)

Baca urutan:

1. `docs/school-os-blueprint/README.md` — index
2. `docs/school-os-blueprint/00-vision.md` — kenapa
3. `docs/school-os-blueprint/01-indonesia-context.md` — konteks domain
4. `docs/school-os-blueprint/02-current-inventory.md` — peta modul existing
5. `docs/school-os-blueprint/03-gap-analysis.md` — apa yang missing
6. `docs/school-os-blueprint/04-target-architecture.md` — target arsitektur
7. `docs/school-os-blueprint/05-ai-capabilities.md` — AI strategy
8. `docs/school-os-blueprint/06-roadmap.md` — fase & deliverables (**authoritative decisions** di akhir)
9. `CLAUDE.md` — coding conventions
10. Memory: `.claude/projects/-home-emp-Downloads-LMS/memory/*.md` — user policies (no-mocks, dev-env quirks)

**Hard constraints dari user:**
- **ZERO mocks**: jangan pakai `vi.mock`, `page.route`, MSW, hardcoded fake data di runtime. Unit test boleh pure function test tanpa vi.mock. E2E = real backend only.
- **Real backend wajib**: semua verifikasi hit real DB + real API
- Bahasa Indonesia untuk UI string baru
- Tidak buat dokumentasi baru (.md) kecuali diminta di task

---

## 1. Environment setup (cloud agent harus punya akses)

```bash
# Pre-requisites (asumsi cloud env)
- Node 20+, pnpm atau npm
- Rust stable (cargo)
- Docker + docker-compose
- PostgreSQL 15+ (via docker-compose atau managed)
- Playwright (npm install sudah cover)
- gh CLI dengan auth ke repo AI-Powered-Edtech/LMS

# Startup
cd <repo>
npm install
cd edusync-api && docker-compose up -d postgres && cd ..
# Apply migrations:
psql $DATABASE_URL -f edusync-api/schema/baseline.sql  # kalau fresh
for m in edusync-api/migrations/*.sql; do psql $DATABASE_URL -f "$m"; done
cd edusync-api && cargo build --release && ./target/release/api-server &
cd .. && npm run dev &  # FE on :5173
# Wait for ready
until curl -sf http://localhost:8080/api/v1/health && curl -sf http://localhost:5173; do sleep 2; done
```

**Verify setup**: jalankan `./node_modules/.bin/playwright test tests/e2e/sweep.spec.ts --reporter=line`. Harus lulus 3/3 dengan <15 issue total (state baseline 2026-04-24).

---

## 2. Authoritative decisions (jangan minta konfirmasi)

Semua keputusan ada di `docs/school-os-blueprint/06-roadmap.md` bagian "Authoritative decisions". Ringkasan operasional:

- **Payment**: Midtrans
- **Plagiarism**: Build in-house (embedding similarity)
- **Rapor**: Kurmer 2024 Kemdikbud template
- **RBAC**: 10-role matrix
- **`classes` refactor**: Additive `rombel` table, zero-downtime
- **Pilot school**: Build synthetic "SMA Nusantara Dev" (Fase 0.5 — prioritas #1)
- **Dapodik**: CSV export only
- **Offline**: PWA Workbox (Fase 7)
- **AI providers**: Groq (latency), Anthropic Sonnet (quality)

Kalau keputusan tidak tercakup di atas atau di roadmap: **pilih default paling konservatif** (minimal change, reversible, well-documented). Log keputusan di commit message + tambah entry di `docs/school-os-blueprint/DECISIONS_LOG.md` (buat kalau belum ada).

---

## 3. Execution order (dependency-respecting)

**Priority ladder** — agent kerjakan top-down. Setiap fase harus pass **Exit Criteria** sebelum lanjut. Boleh paralel DALAM fase (multiple branch), tidak antar fase kecuali explicit listed.

### Prio 1 — Fase 0 completion (sisa dari 2026-04-24 batch)
1. Rebuild backend + apply migration 037 → verify sweep clean
2. Fix React dup-key teacher dashboard (investigasi live sweep, trace UUID source)
3. Orphan audit: per item di `03-gap-analysis.md` section C, decide & execute wire/delete/hide
4. Delete dual-path Rust handlers (quiz/xp yang tidak mounted)
5. Playwright sweep → CI workflow (`.github/workflows/sweep.yml`)
6. Accessibility audit top-20 screens (axe-core scan + fix)

### Prio 2 — Fase 0.5 Dev School Seeding (foundation untuk semua fase berikut)
7. Write `edusync-api/schema/dev_seed.sql` dengan schema SMA Nusantara Dev (lihat roadmap Fase 0.5 untuk detail)
8. Script `edusync-api/scripts/reset-dev-school.sh`
9. Dokumentasi `docs/dev-school-accounts.md` — semua kredensial persona
10. Extend `tests/e2e/sweep.spec.ts` dengan 6 persona tambahan (wali_kelas, wakasek, principal, guru_bk, tu, parent_specific_child)
11. CI harian: reset + full sweep 9 persona

### Prio 3 — Fase 1 Academic Foundation
12. `academic_years` table + RPC + admin UI
13. Refactor `semesters` link ke `academic_year_id`
14. `grade_levels` (1-12)
15. `rombel` table + CRUD + assignment siswa/wali kelas (aditif, jangan drop `classes`)
16. `subjects` + `curriculum_items` (CP/ATP Kurmer phase E sample data)
17. `timetable_slots` + editor grid UI
18. `student_dossier` + `staff_dossier` (NISN, NIK, NIP, NUPTK fields)
19. RBAC refactor: 10-role matrix, migrate existing memberships

### Prio 4 — Fase 2 Kurmer Assessment
20. Lesson/assignment/quiz CP/ATP tagging
21. Gradebook dual-mode (numerik + deskriptor BB/MB/BSH/SB)
22. Nilai per CP aggregation
23. AKM-style question type
24. P5 module
25. Event bus: `domain_events` outbox + worker
26. Migrate `assessment.attempt.submitted` ke event-driven

### Prio 5 — Fase 3 Rapor
27. Rapor Kurmer PDF template engine (puppeteer atau rust-based)
28. Signature flow (guru → wali kelas → kepsek)
29. AI narrative untuk deskripsi mapel
30. Batch export 1 rombel
31. Replace `stub_handlers` report export dengan `report_handlers.rs` proper

### Prio 6 — Fase 4 Finance + PPDB
32. Midtrans integration (snap + VA + webhook)
33. SPP recurring invoice cron
34. Parent portal payment inline
35. BOS expense tracking (negeri)
36. PPDB full flow: period, jalur, kuota, upload dokumen, tes online, ranking, auto-enroll

### Prio 7 — Fase 5 Integrations
37. Dapodik CSV export
38. WhatsApp BSP proper wiring (Twilio/Infobip)
39. Email (SES/Sendgrid)
40. Bank VA integrations

### Prio 8 — Fase 6 AI Polish
41. AuthoringAssist inline Course Builder → retire standalone Creator page
42. SpeedGrader AI scoring + rubric
43. Lesson Viewer Q&A tutor streaming
44. Plagiarism engine (embedding similarity)
45. Principal narrative insight bulanan
46. Parent weekly digest AI-generated
47. Toxic moderation classifier
48. Semantic search lintas modul

### Prio 9 — Fase 7 Non-functional
49. PWA + Workbox cache lesson
50. Audit log coverage complete
51. Rate limit per tenant
52. Performance budget + monitoring
53. Pen-test & security hardening

**Fase 8+**: tidak dikerjakan autonomous, eskalasi ke user.

---

## 4. Rules of engagement

### PR workflow
- **Satu unit = satu PR** kecuali explicit marked "combine".
- PR title format: `<type>(<scope>): <short>` — conventional commits.
- PR body: reference prio number + fase dari superbatch ini + exit criteria yang dipenuhi.
- PR tidak boleh merge auto. Agent open PR, CI jalan, agent poll status sebelum lanjut unit dependent.

### Dependencies antar unit
- Dalam fase: paralel boleh kalau file disjoint.
- Antar fase: sekuensial — Fase X+1 tunggu Fase X exit criteria.
- Kalau unit A blocker unit B: kerjakan A dulu, jangan optimistis queue B.

### Konflik
- Merge conflict di `package.json`, migration files: resolve manual, jangan force.
- Kalau 2 worktree paralel edit file sama: rebase kedua, cek lagi.

### Failing tests
- **Tidak boleh skip/disable** test untuk bypass CI. Root-cause fix wajib.
- Kalau test existing flaky: tandai di `docs/school-os-blueprint/FLAKY_TESTS.md`, jangan disable langsung, eskalasi ke user.

### No-mock policy enforcement
- Tidak boleh introduce `vi.mock`, `page.route`, MSW, fixture faker runtime. Pre-commit grep:
  ```bash
  grep -rE "vi\.mock|page\.route\(|msw|setupServer" src/ tests/ && echo "BLOCKED: mock added" && exit 1
  ```
- Kalau butuh test isolation: real backend + dev school seed.

### Commit frequency
- Commit setiap unit selesai + test passing.
- Push ke feature branch setiap commit.
- Open PR setelah unit complete + E2E pass.

### Daily progress log
Agent update `docs/school-os-blueprint/DAILY_PROGRESS.md` setiap 4 jam:
```markdown
## <ISO-date>
- <HH:MM> — Started Prio X Unit Y — <title>
- <HH:MM> — PR #NNN opened: <url>
- <HH:MM> — Blocker: <what>, decision: <what agent did>
- <HH:MM> — Unit Y complete, E2E pass
```

---

## 5. Verification gates

Setiap unit wajib pass SEBELUM agent open PR:

```bash
# 1. Typecheck
./node_modules/.bin/tsc --noEmit

# 2. Lint
./node_modules/.bin/eslint . --max-warnings=0

# 3. Unit tests
./node_modules/.bin/vitest run

# 4. Backend: kalau unit sentuh Rust code
cd edusync-api && cargo test && cargo build --release && cd ..

# 5. E2E sweep (real backend)
./node_modules/.bin/playwright test tests/e2e/sweep.spec.ts --reporter=line
# Parse report: no regression vs baseline
node -e "
  const baseline = require('./.qa-sweep-baseline.json');
  const current = ['admin','teacher','student'].flatMap(p => require('./.qa-sweep/'+p+'/report.json'));
  const newIssues = current.filter(c => !baseline.some(b => b.route === c.route && b.url === c.url));
  if (newIssues.filter(x => x.consoleErrors.length + x.pageErrors.length + x.failedRequests.length > 0).length) {
    console.error('REGRESSION DETECTED'); process.exit(1);
  }
"

# 6. Unit-specific E2E (kalau ada, mis. Playwright spec khusus fitur baru)
./node_modules/.bin/playwright test tests/e2e/<feature>.spec.ts
```

Gagal di gate manapun → fix sebelum commit. Jangan push broken.

---

## 6. Hard-stop criteria

Agent **berhenti & eskalasi ke user** (via DAILY_PROGRESS.md + GitHub issue) kalau:

1. **Keputusan di luar authoritative list** yang tidak aman di-default:
   - Destructive DB migration (drop table, truncate, breaking rename)
   - Kebijakan pricing / komersial
   - Perubahan brand / copywriting legal (privacy policy, TOS)
   - Integrasi yang butuh API key / credential yang belum tersedia
2. **3× consecutive unit failure** di fase yang sama — berhenti, investigate root cause.
3. **Regression sweep introduce issue baru** yang tidak bisa di-fix dalam <1 jam.
4. **Security concern** (SQL injection, XSS, auth bypass) terdeteksi saat development.
5. **Cost/resource alarm**: AI API usage > $X per hari, CI runtime > Y jam, storage > Z GB.

Format escalation:
```markdown
# ESCALATION — <date> <time>
## Context
<prio + unit + what tried>
## Blocker
<specific problem>
## Options
1. <option A>
2. <option B>
## Agent recommendation
<option + why>
## Agent action
PAUSED on this unit, moved to <next safe unit>
```

---

## 7. Continuous learning loop

Setiap end-of-day:

1. Agent run retrospective:
   - Units completed vs planned
   - Blockers hit
   - Decisions made outside authoritative list (need user review)
2. Update `docs/school-os-blueprint/06-roadmap.md` progress checkboxes
3. Update `docs/school-os-blueprint/DAILY_PROGRESS.md`
4. Open GitHub issue untuk user review kalau ada escalation pending

---

## 8. Quick context recall

Kalau agent kehilangan context (restart / rotate), recovery dalam 3 langkah:

1. Read `docs/school-os-blueprint/DAILY_PROGRESS.md` — terakhir kerja apa
2. Read `docs/school-os-blueprint/06-roadmap.md` — progress checkboxes
3. `gh pr list --author @me --state all --limit 20` — PR yang sudah di-open

Resume dari unit berikutnya di priority ladder.

---

## 9. Start command

Agent mulai dengan:

```bash
echo "## $(date -Iseconds) — Cloud agent boot" >> docs/school-os-blueprint/DAILY_PROGRESS.md
echo "Reading superbatch runbook..." >> docs/school-os-blueprint/DAILY_PROGRESS.md
# Bootstrap (section 1)
# Baseline capture
./node_modules/.bin/playwright test tests/e2e/sweep.spec.ts --reporter=line
cp -r .qa-sweep/admin/report.json .qa-sweep/teacher/report.json .qa-sweep/student/report.json .qa-sweep-baseline.json  # adjust sesuai pattern
# Start priority ladder
# Prio 1 Unit 1: "Rebuild backend + apply migration 037"
```

Setelah itu: loop sampai semua prio done atau hit hard-stop.

---

## Lampiran A — Sumber sample data untuk dev school

Agent harus generate realistic Indonesian-context data. Reference list untuk synthetic gen:

- **Nama siswa**: mix Indonesian names (gabungan nama awal Ahmad/Siti/Budi/Rina/Agus/Dewi + nama tengah/belakang daerah)
- **NISN**: 10-digit format `YYY0NNNNNN` (tahun lahir 2 digit + 0 + random 6)
- **NIK**: 16-digit format (bisa synthetic — jangan real)
- **Alamat**: variasi Jakarta, Bandung, Surabaya, Yogyakarta, Medan (kota besar)
- **Phone**: 08xx-xxxx-xxxx Indonesian format
- **Mata pelajaran Fase E (SMA X)**:
  - Umum: PAI/Agama, Pendidikan Pancasila, Bahasa Indonesia, Matematika, Bahasa Inggris, Pendidikan Jasmani, Seni, Sejarah Indonesia, Informatika
  - IPA: Fisika, Kimia, Biologi
  - IPS: Ekonomi, Sosiologi, Geografi
- **CP samples**: ambil dari dokumen Kemdikbud publik (per fase, per mapel) — agent riset di Fase 1

---

## Lampiran B — Known gotchas

- **HashRouter**: FE pakai `#/` routing. Sweep spec sudah handle; unit baru yang bikin FE nav harus aware.
- **Data plane allowlist**: table baru wajib ditambah ke `edusync-api/crates/api-server/src/data_plane.rs` ALLOWED_TABLES, atau endpoint 403.
- **Realtime**: pg_notify trigger perlu `NOTIFY realtime_changes` — pola lihat migrasi 014.
- **Tenant isolation**: SEMUA query wajib filter `tenant_id`. RLS sudah di-disable (migrasi 009), isolation hanya via middleware.
- **Migrations numbering**: `037_` sudah dipakai (QA sweep fixes). Lanjut `038_`, `039_`, dst.

---

Doc ini **single source of truth** untuk autonomous execution. Update kalau user menambah keputusan. Agent bisa referensi doc lain, tapi authoritative sequence ada di sini.
