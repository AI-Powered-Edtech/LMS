# Play Store Listing — EduSync LMS

> **Audience:** PM, Marketing, Legal
> **Status:** Draft — pending PM + Legal sign-off before Play Console submission
> **Last updated:** 2026-04-17
> **Cross-refs:** [TWA.md](./TWA.md) (U11 — TWA wrapper), [DATA_SAFETY.md](./DATA_SAFETY.md), [SECURITY.md](./SECURITY.md), [FEATURES.md](./FEATURES.md)
> **Primary language:** Indonesian (id-ID). Secondary: English (en-US).

---

## 1. App identity

| Field | Value |
| --- | --- |
| App name | EduSync — LMS Sekolah |
| Package name | id.edusync.lms |
| Developer | PT EduSync Teknologi Nusantara |
| Contact email | support@edusync.id |
| Website | https://edusync.id |
| Privacy policy URL | https://edusync.id/privacy |
| Default locale | id-ID |

---

## 2. Short description (≤80 chars)

### Indonesian (primary)

> **"LMS untuk sekolah: kelola kelas, kuis, nilai & komunikasi dengan AI."** (78 chars)

### English (secondary)

> **"School LMS: manage classes, quizzes, grades & communication with AI."** (69 chars)

---

## 3. Full description

### 3.1 Indonesian (primary, ~3000 chars)

**EduSync — Platform Pembelajaran Terpadu untuk Sekolah Indonesia**

EduSync adalah Learning Management System (LMS) modern yang dirancang khusus untuk sekolah dasar, menengah, dan atas di Indonesia. Dari satu aplikasi, siswa, guru, admin, orang tua, dan kepala sekolah dapat berkolaborasi dalam proses belajar-mengajar — dengan bantuan AI, gamifikasi, dan dukungan offline.

**Untuk Siswa**
- Akses materi pelajaran, tugas, dan kuis dari mana saja
- Kerjakan soal dengan auto-save anti-kehilangan data
- Dapatkan XP, lencana, dan naik level saat menyelesaikan tantangan
- Chat dengan guru dan teman sekelas secara real-time
- Tutor AI 24/7 untuk menjawab pertanyaan pelajaran
- Tetap belajar walau offline — progres tersinkron otomatis saat online

**Untuk Guru**
- Buat kelas, modul, dan kuis dalam hitungan menit
- AI bantu membuat soal, rubrik, dan menilai esai
- Gradebook real-time dengan analitik per-siswa
- Deteksi plagiat otomatis untuk tugas esai
- Import siswa dari CSV atau LTI dari Moodle/Canvas
- Kirim pengumuman lewat push notification atau WhatsApp

**Untuk Admin Sekolah**
- Kelola multi-tenant: cabang, angkatan, jurusan
- Panel moderasi konten siswa dengan satu klik block
- Ekspor nilai ke format rapor Kemendikbud
- Audit log lengkap untuk akreditasi
- SSO Google & integrasi LTI untuk tools eksternal

**Untuk Orang Tua**
- Pantau progres, nilai, dan kehadiran anak real-time
- Terima notifikasi PR, ulangan, dan pengumuman penting
- Chat langsung dengan wali kelas
- Dashboard sederhana — tanpa login berlapis

**Untuk Kepala Sekolah**
- Dashboard eksekutif: tren nilai, engagement, kehadiran
- Laporan akreditasi dan KPI per-guru siap cetak
- Perbandingan antar-angkatan dan antar-kelas
- Insight AI untuk identifikasi siswa yang butuh intervensi

**Fitur Unggulan**
- **AI Bawaan:** Tutor AI, auto-grading esai, generator konten & kuis, deteksi plagiat — didukung Groq LLM dengan privasi ketat (prompt tanpa PII).
- **Gamifikasi:** XP, leaderboard kelas, lencana prestasi, streak harian — membuat belajar lebih seru.
- **Offline-first:** PWA dengan service worker; siswa di daerah dengan koneksi terbatas tetap bisa belajar.
- **Real-time:** Chat, kolaborasi dokumen, presence indicator — semua lewat WebSocket.
- **Multi-tenant:** Satu instalasi untuk seluruh yayasan pendidikan.

**Komitmen Privasi**
- Data siswa disimpan di server Indonesia (Jakarta)
- Enkripsi TLS 1.3 in-transit dan AES-256 at-rest
- Patuh UU PDP No. 27/2022 — DPO dan jalur delete/export tersedia
- Tanpa iklan, tanpa penjualan data — selamanya
- Sertifikasi SOC 2 Type II dalam proses

**Hubungi Kami**
Tertarik mencoba EduSync di sekolah Anda? Hubungi **sales@edusync.id** untuk demo dan trial gratis 30 hari. Tim kami siap membantu onboarding guru, migrasi data dari LMS lama, dan pelatihan end-to-end.

Lihat dokumentasi lengkap di https://docs.edusync.id
Ikuti update kami di https://edusync.id/blog

EduSync — membuat pendidikan Indonesia selangkah lebih maju.

---

### 3.2 English (secondary)

**EduSync — The Unified Learning Platform for Indonesian Schools**

EduSync is a modern Learning Management System (LMS) purpose-built for Indonesian primary, secondary, and high schools. From a single app, students, teachers, admins, parents, and principals collaborate on the teaching-learning journey — powered by AI, gamification, and robust offline support.

**For Students**
- Access lessons, assignments, and quizzes anywhere, anytime
- Take quizzes with anti-data-loss auto-save
- Earn XP, badges, and level up as you complete challenges
- Real-time chat with teachers and classmates
- 24/7 AI tutor for instant help with any subject
- Keep learning offline — progress auto-syncs when back online

**For Teachers**
- Spin up classes, modules, and quizzes in minutes
- AI helps generate questions, rubrics, and grade essays
- Real-time gradebook with per-student analytics
- Automatic plagiarism detection for essays
- Import students via CSV or LTI from Moodle/Canvas
- Send announcements via push or WhatsApp

**For School Admins**
- Multi-tenant management: branches, cohorts, majors
- One-click content moderation panel
- Export grades in Kemendikbud-compatible report formats
- Complete audit logs for accreditation
- Google SSO and LTI integration for external tools

**For Parents**
- Track your child's progress, grades, and attendance in real time
- Receive notifications for homework, tests, and announcements
- Direct chat with the homeroom teacher
- Simple dashboard — no login friction

**For Principals**
- Executive dashboard: grade trends, engagement, attendance
- Print-ready accreditation reports and per-teacher KPIs
- Cross-cohort and cross-class comparisons
- AI-powered insights to flag students needing intervention

**Highlighted Features**
- **Built-in AI:** AI tutor, essay auto-grading, content & quiz generation, plagiarism detection — powered by Groq LLM with strict privacy (PII-free prompts).
- **Gamification:** XP, class leaderboards, achievement badges, daily streaks.
- **Offline-first:** Service-worker-powered PWA for low-connectivity regions.
- **Real-time:** Chat, collaborative docs, presence indicators over WebSockets.
- **Multi-tenant:** One install for an entire education foundation.

**Privacy Commitment**
- Student data stored on Jakarta-based servers
- TLS 1.3 in transit, AES-256 at rest
- Compliant with Indonesia's UU PDP No. 27/2022 — DPO and delete/export flows available
- No ads, no data sales — ever
- SOC 2 Type II certification in progress

**Get in Touch**
Want to try EduSync at your school? Email **sales@edusync.id** for a demo and a 30-day free trial. Our team helps with teacher onboarding, data migration, and end-to-end training.

Full docs at https://docs.edusync.id
Follow updates at https://edusync.id/blog

EduSync — moving Indonesian education one step forward.

---

## 4. Category & tags

| Field | Value |
| --- | --- |
| Primary category | Education |
| Secondary category | Productivity |
| Tags (Indonesian) | pendidikan, sekolah, kurikulum, kuis, kelas, e-learning, indonesia |
| Tags (English) | education, lms, school, quiz, classroom, e-learning, indonesia |

---

## 5. Content rating questionnaire (IARC via Play Console)

| Question | Answer | Justification |
| --- | --- | --- |
| Violence | **No** | No violent content. |
| Sexual content | **No** | No sexual or suggestive content. |
| Language | **No** | No profanity; chat has server-side profanity filter. |
| Controlled substances | **No** | No depiction, promotion, or reference. |
| Gambling / real-money gaming | **No** | XP & badges are non-monetary gamification. |
| User-generated content | **Yes** | Students post in class discussions. **Mitigation:** admin moderation panel, profanity filter, report-and-block, 24h moderation SLA. |
| Users interact (chat) | **Yes** | Student-teacher and student-student chat. **Mitigation:** opt-in, blocklist, teacher visibility, audit log. |
| Shares user location | **No** | No GPS collection. |
| Digital purchases | **No** | School-billed; no in-app purchases. |

**Expected rating:** IARC 3+ (Everyone) with "Users interact" and "User-generated content" descriptors.

---

## 6. Target audience & regions

| Field | Value |
| --- | --- |
| Target age | 13+ (age-gate at registration) |
| Families Policy | Not applicable |
| Primary country | Indonesia |
| Secondary countries | Malaysia, Singapore, Philippines, Vietnam (SEA) |
| Tertiary | Global (English translation enabled) |
| Default language | Indonesian (id-ID) |
| Additional languages | English (en-US), with Javanese & Sundanese locales on roadmap |

---

## 7. Screenshots plan

Minimum: **8 phone + 2 tablet** screenshots (Play policy minimum is 2; we over-deliver for discoverability).

### 7.1 Phone screenshots (1080×1920, portrait)

| # | Scene | Persona | Caption (id) | Caption (en) |
| --- | --- | --- | --- | --- |
| 1 | Student dashboard (XP, streak, next lesson) | Siswa | "Belajar lebih seru dengan XP & streak harian" | "Learn with XP & daily streaks" |
| 2 | Quiz taking screen with timer + auto-save indicator | Siswa | "Kerjakan kuis dengan auto-save anti-kehilangan" | "Take quizzes with anti-loss auto-save" |
| 3 | AI tutor chat with code/math rendering | Siswa | "Tanya Tutor AI kapan saja, 24/7" | "Ask AI tutor anytime, 24/7" |
| 4 | Teacher gradebook with per-student analytics | Guru | "Nilai siswa real-time dengan analitik AI" | "Real-time gradebook with AI analytics" |
| 5 | Teacher quiz generator (AI-assisted) | Guru | "Buat soal dalam hitungan detik dengan AI" | "Generate quizzes in seconds with AI" |
| 6 | Admin moderation panel | Admin | "Moderasi konten siswa satu klik" | "One-click content moderation" |
| 7 | Parent dashboard (child progress + notifications) | Orang Tua | "Pantau anak Anda secara real-time" | "Track your child in real time" |
| 8 | Principal executive dashboard (grade trends, KPIs) | Kepala Sekolah | "Dashboard eksekutif untuk kepala sekolah" | "Executive dashboard for principals" |

### 7.2 Tablet screenshots (2048×1536, landscape)

| # | Scene | Caption |
| --- | --- | --- |
| 1 | Teacher split-view: class list + live chat | "Kelas & chat sekaligus di tablet" |
| 2 | Admin multi-tenant overview | "Kelola banyak cabang sekaligus" |

All screenshots pulled from a staging tenant seeded with anonymized demo data (`staging-demo.edusync.id`). Real student names/faces **must not** appear.

---

## 8. Graphics assets

### 8.1 App icon (512×512)

- **Source:** `public/icons/icon-512.png` (existing PWA icon)
- **Requirements:** PNG, 32-bit, transparent background allowed, ≤1 MB.
- **Action:** no re-work needed; confirm via Play Console icon validator.

### 8.2 Feature graphic (1024×500) — design brief

- **Aspect:** 1024×500 landscape JPG/PNG, no alpha.
- **Composition:**
  - Left 40%: wordmark "EduSync" in `Manrope ExtraBold`, color `#0F5DD0` (primary blue), tagline "LMS pintar untuk sekolah Indonesia" in `Inter Medium` `#111827`.
  - Right 60%: isometric collage — laptop with gradebook UI, phone with quiz UI, tablet with AI tutor chat. Background: diagonal gradient `#E8F0FE` → `#FFFFFF`.
  - Bottom-right: Bahasa Indonesia flag accent strip + "Made in Indonesia" microcopy in 10pt.
- **Accessibility:** contrast ratio ≥4.5:1 for all text.
- **No user PII, no real logos, no ads.**
- **Deliverable:** Figma source + exported PNG in `design/play-store/feature-graphic.png`.

### 8.3 Promo video (optional, 30s)

- **Format:** YouTube unlisted link, 16:9, 1920×1080, ≤30s.
- **Script outline:**
  - 0–3s: hook — "Sekolah Anda masih pakai WhatsApp untuk semuanya?"
  - 3–10s: student UI montage (quiz, XP, AI tutor)
  - 10–18s: teacher UI (gradebook, AI grading)
  - 18–25s: admin + parent dashboards
  - 25–30s: CTA — "EduSync. Hubungi sales@edusync.id"
- **Voice-over:** Indonesian, optional English subtitle track.
- **Deliverable:** YouTube link + caption `.srt` file.

---

## 9. Pre-launch checklist

- [ ] `docs/DATA_SAFETY.md` signed by PM + Legal
- [ ] Privacy policy published at https://edusync.id/privacy
- [ ] Terms of Service published at https://edusync.id/terms
- [ ] Content rating questionnaire submitted (§5)
- [ ] All 8 phone + 2 tablet screenshots captured from staging tenant
- [ ] Feature graphic 1024×500 exported and reviewed by Marketing
- [ ] App icon validated in Play Console
- [ ] Internal testing track: 20 testers for 2 weeks, zero P0 bugs
- [ ] Closed testing track: 3 pilot schools, 4 weeks, feedback collected
- [ ] Crash-free rate ≥99.5% on Sentry last 7 days
- [ ] TWA wrapper built per `docs/TWA.md` (U11)
- [ ] Digital Asset Links verified (`/.well-known/assetlinks.json`)
- [ ] Play Console billing & tax forms completed
- [ ] Marketing launch blog post drafted
- [ ] Support team staffed for launch day

---

## 10. Sign-off

| Role | Name | Date | Signature |
| --- | --- | --- | --- |
| PM | _______ | _______ | _______ |
| Legal | _______ | _______ | _______ |
| Marketing Lead | _______ | _______ | _______ |
| CTO | _______ | _______ | _______ |

Once signed, this document is the source of truth for Play Console listing submission. Any change after submission requires a re-review by PM + Legal.
