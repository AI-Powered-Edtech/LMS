# 03 — Gap Analysis

Gap antara **current state** (dok 02) vs **target School OS Indonesia** (dok 00-01). Fokus: apa yang missing, apa yang silo, apa yang broken.

## A. Missing domains (fitur belum ada)

Urut by priority (P0 = blocker untuk school deployment, P3 = nice-to-have).

| Prioritas | Domain | Rasional |
|---|---|---|
| **P0** | **Rombel & Wali Kelas** | Tanpa struktur rombel (X-IPA-1) + wali kelas, tidak bisa manage real school. Role "teacher" terlalu coarse. |
| **P0** | **Rapor Kurmer (PDF export)** | Output akhir semester = rapor. Tanpa ini, sekolah tidak bisa pakai EduSync sebagai primary system. |
| **P0** | **Struktur Kurikulum (CP/ATP tagging)** | Lesson/quiz harus tag ke capaian pembelajaran untuk laporan valid. |
| **P0** | **Jadwal pelajaran (timetable, JP)** | Setiap kelas punya jadwal harian; attendance & lesson_monitor butuh konteks jadwal. |
| **P0** | **Payment gateway (Midtrans/Xendit)** | Billing module ada tapi tidak bisa collect. Blocker revenue. |
| **P1** | **BOS expense tracking & reporting** | Sekolah negeri butuh ini; tanpa — tidak addresable ~80% sekolah ID. |
| **P1** | **AKM-style assessment** | Format stimulus + multi-question. Sekolah persiapan ANBK butuh. |
| **P1** | **Dapodik export (CSV)** | One-way export; ringan tapi high-value. |
| **P1** | **Sikap & BK (konseling) module** | Wali kelas input catatan sikap; guru BK catat konseling/pelanggaran. |
| **P1** | **Kalender akademik (tahun ajaran, semester, UTS, UAS, hari libur)** | Beda dengan `calendar_events` umum. Dipakai di rapor, attendance scheduling. |
| **P1** | **P5 (Projek Penguatan Profil Pelajar Pancasila)** | Kurmer-mandated. Lintas-mapel, peer assessment, portofolio. |
| **P2** | **Perpustakaan digital / buku ajar** | Nice-to-have; sekolah biasa punya sistem perpus terpisah. |
| **P2** | **Magang/PKL (SMK)** | Kalau target SMK, butuh. |
| **P2** | **UKS (kesehatan siswa)** | Catatan medis, vaksin, alergi. |
| **P2** | **Alumni tracking** | Lulusan, kelanjutan studi. |
| **P2** | **Hafalan Quran (pesantren)** | Kalau target pesantren. |
| **P3** | **ABK/inklusi (IEP, asesmen adaptif)** | Niche tapi penting untuk positioning inklusif. |
| **P3** | **Dashboard yayasan multi-sekolah** | Untuk yayasan dengan banyak cabang. |

## B. Silo modules (ada tapi tidak terhubung)

Modul-modul yang jalan sendiri, tidak cross-communicate. **Ini inti dari gap "kumpulan fitur" → "1 sistem"**.

| Silo | Seharusnya terhubung ke | Impact |
|---|---|---|
| **Calendar** | Attendance (siswa absen di jam pelajaran X → mark attendance otomatis), Lesson monitor (guru start lesson pada slot jadwal), Notification (reminder 15 menit sebelum mulai) | Guru tidak perlu manual start/scan; parent dapat real-time "anaknya masuk sekolah" |
| **Announcements** | Audit log (siapa broadcast apa ke siapa kapan), Notification channel (WA + push + in-app, sesuai preferensi ortu) | Komunikasi terstruktur, bisa ditagih ke ortu bahwa info sudah dikirim |
| **Forum** | Moderation (flagging), Gradebook (partisipasi diskusi sebagai nilai), AI moderator (deteksi kata kasar, off-topic), Course (forum per-kursus) | Pedagogical value + safety |
| **Moderation** | Audit, User management (soft-ban), Content removal workflow | Saat ini: mark flagged, lalu apa? |
| **PPDB** | Payment (uang pendaftaran + daftar ulang), Quiz (tes online masuk), Enrollment (auto-create rombel), Notification (pengumuman diterima via WA + email) | PPDB jadi end-to-end, bukan sekadar form submission |
| **Finance/Billing** | Parent notifications (tagihan SPP + link pembayaran via WA), Student attendance (tunggakan → akses terbatas? policy sekolah), Admin audit (rekonsiliasi) | Revenue ops |
| **Struggle Detection** | Parent notification (ortu tahu anak struggling), BK/counselor (alert), Adaptive path (remedial auto-assign), Principal exec dashboard (aggregate % siswa at-risk) | AI insight dipakai real, bukan tampil di dashboard saja |
| **AI content generation** | Course Builder (inline, bukan feature terpisah "Creator"), Question Bank (auto-add generated questions), Audit (track AI usage per tenant untuk billing) | AI terjalin, bukan terpisah |
| **Video transcoding** | Lesson publishing (lock lesson dari publish sampai transcoded), Storage cleanup, Analytics (watch time by quality) | Kualitas video pipeline |

## C. Orphan features (ada UI, backend tidak wired)

Dari inventory:

| Feature | Bukti orphan | Risiko |
|---|---|---|
| Plagiarism dashboard | Handler stub return 0 | User pikir tidak ada plagiasi, false sense of security |
| Report PDF export | `stub_handlers` dipakai bukan `report_handlers.rs` | Admin klik "Export", dapat file kosong |
| AI Tutor streaming | `ai_streaming_handlers.rs` tidak imported | UI mungkin minta streaming, backend tidak serve |
| Quiz handlers Rust | `quiz_handlers.rs` tidak mounted | Redundant code; maintenance burden |
| XP handlers Rust | Sama | Sama |

**Action**: audit setiap orphan, keputusan 3-way: wire properly, atau hapus code, atau hide UI.

## D. Broken integrations (dari sweep 2026-04-24)

Sudah dicatat di sweep report. Summary:

- Tabel `onboarding_progress` dipanggil FE tapi tidak exist (hanya `teacher_onboarding_progress`) — **fixed** (remove allowlist)
- `invoices` missing kolom `amount_due`, `amount_paid`, `due_date` — **fixed** via migration 037
- `course_stats` missing kolom analytics — **fixed** via migration 037
- RPC `get_gradebook_students` missing — **fixed** via migration 037
- `semesters`, `lti_platform_registrations`, `leaderboards`, `modules` tidak di allowlist — **fixed**
- tenant_modules nested select syntax — **fixed** (FE split queries)
- Teacher dashboard React dup key — **belum**, perlu deep dive
- UI/UX polish (dari screenshot sweep) — belum dianalisis systematic

## E. Role/permission gap

Current roles: `teacher, student, admin, parent, principal`.

Gap:
- **wali_kelas** — teacher dengan scope rombel (bisa lihat semua nilai siswa rombelnya, komunikasi ortu)
- **wakasek** (4 jenis: kurikulum, kesiswaan, sarpras, humas) — admin dengan scope
- **guru_bk** — bisa input catatan konseling, akses data siswa restricted
- **tu** (tata usaha) — admin dengan scope administrasi (finance, surat, PPDB) bukan kurikulum
- **yayasan** — read-only lintas tenant
- **pengawas** (dinas pendidikan) — read-only lintas tenant untuk negeri

**Action**: redesign ke RBAC matrix (role × module × action) bukan coarse role.

## F. Data model gap

Current: user → tenant_membership → (courses, lessons, etc).

Missing entities:
- `grade_levels` / `tingkat` (kelas 1-12)
- `rombel` / `class_sections` ("X-IPA-1") — distinct from `classes` yang saat ini course-equivalent
- `subjects` / `mata_pelajaran` dengan CP/ATP refs
- `curriculum_plans` (RPP / modul ajar)
- `timetable_slots` (JP dalam seminggu)
- `academic_years` + `report_periods` (UTS, UAS)
- `student_dossier` (data dapodik lengkap: NISN, NIK, alamat, wali, etc)
- `staff_dossier` (NIP, NUPTK, sertifikasi, tugas tambahan)
- `p5_projects` / `extracurriculars`
- `discipline_records` (catatan sikap, pelanggaran)
- `bk_sessions` (konseling)
- `medical_records` (UKS)
- `payment_transactions` + `bos_expense_items`

## G. Non-functional gap

- **Offline-first** — tidak ada service worker cache untuk lesson content, tidak ada local-first draft. Blocker untuk rural deployment.
- **Export/reporting** — PDF stub, tidak ada bulk CSV exporter, tidak ada scheduled report delivery
- **Audit log coverage** — tabel `audit_logs` ada tapi adopsi inconsistent (tidak semua mutasi tercatat)
- **I18n** — Bahasa Indonesia dominan tapi belum ada i18n framework untuk mendukung daerah bilingual (Aceh, NTT) atau English mode
- **Mobile** — responsive OK, tapi beberapa flow (course builder, speed grader) butuh mouse. PWA install prompt belum systematic.
- **Performance budget** — belum ada; dashboard admin sering load banyak widget paralel, observed latency perlu dimonitor

## Open questions

- Rapor Kurmer format: ada standar Kemdikbud 2024 — template jadi? Perlu riset file samples
- Payment: fee structure (absorb by tenant vs passed to parent)?
- Dapodik export: prioritas semester ini atau tahun depan?
- Silo-breaking refactor = big bang atau incremental? (Rekomendasi incremental; lihat roadmap.)
