# 05 — AI Capabilities Map

Peta kapabilitas AI di EduSync School OS: existing, target, guardrails. Sesuai prinsip dok 04: **AI adalah lapisan horisontal, bukan modul terpisah**.

## Existing AI (dari inventory 02)

| Kapabilitas | Status | File | Gap |
|---|---|---|---|
| Content generation (lesson text, outline) | FULL | `ai_handlers.rs::generate_content` | UI menu "Creator" terpisah — seharusnya inline di Course Builder |
| Quiz generation | FULL | `ai_handlers.rs::generate_quiz` | Output langsung ke question bank — ada flow? |
| Essay grading | FULL | `ai_handlers.rs::grade_essay` | Integrasi ke SpeedGrader/Assignment — verify |
| Tutor chat | PARTIAL | `ai_handlers.rs::tutor_chat`, streaming handler orphan | Streaming tidak wired; UI belum omnipresent |
| Recommendations | PARTIAL | RPC `get_student_recommendations` | Algoritma belum jelas (ML atau heuristic?) |
| Struggle detection | PARTIAL | `get_struggle_alerts` | Signal sources belum comprehensive |
| Logging | FULL | `ai_generation_logs` | ✓ |

Provider: Groq (env `GROQ_API_KEY`). Model selection belum explicit.

## Target AI surface area

Prinsip: **AI dipanggil dari workflow user, bukan sebagai menu tersendiri**.

### 1. Authoring assist (untuk guru)

**Di Course Builder:**
- "Tulis paragraf penjelasan tentang X" (inline, bukan pergi ke page Creator)
- "Buat 10 pertanyaan pilihan ganda dari konten ini"
- "Sederhanakan bahasa untuk kelas 4 SD" (level adjustment)
- "Buat versi soal AKM-style dari topik ini" (stimulus + 3 pertanyaan)
- "Jelaskan konsep X untuk anak kesulitan" (remedial version)

**Di RPP (modul ajar) builder:**
- Generate RPP dari CP + fase kurikulum
- Align dengan P5 tema jika applicable

**Di Announcement/Pengumuman:**
- Draft announcement dari bullet points guru
- Translate ke bahasa formal/informal

### 2. Grading assist (untuk guru)

**Di SpeedGrader:**
- Auto-grade essay/short-answer + explanation
- Detect plagiarism (saat ini stub — pilih: Turnitin API atau Copyleaks)
- Similarity scoring antar submission siswa
- Feedback suggestion (guru approve/edit)
- Rubric scoring otomatis (guru define rubric, AI apply)

### 3. Tutoring (untuk siswa)

**Di Lesson Viewer:**
- "Tanyakan AI tutor" sidebar — chat kontekstual dengan lesson content
- Step-by-step hint system (tidak langsung kasih jawaban — guided)
- Explain this section in simpler language
- Practice problems generator

**Di Quiz (setelah attempt):**
- Explain why your answer was wrong
- Related concept refresher

### 4. Intervensi otomatis (untuk sistem)

**Subscribe ke event bus:**
- `assessment.attempt.submitted` + score rendah → trigger struggle signal update → kalau pattern detected, surface ke wali kelas + ortu
- `attendance.absent_pattern_detected` → alert BK
- `lesson_progress.stalled` → kirim nudge siswa ("yuk lanjut!")

### 5. Insight untuk kepala sekolah

**Di Principal Dashboard:**
- Narrative summary bulanan ("Bulan ini, kelas VIII mengalami penurunan nilai Matematika sebesar 12%...")
- Anomaly detection (satu kelas outlier — kenapa?)
- Comparative analytics ("Rombel A lebih baik di IPA tapi lebih rendah di Bahasa — rekomendasi: tukar metode")
- Predictive: forecast % lulus kelas XII berdasarkan tren

### 6. Parent communication

**Di Parent Portal:**
- AI-generated weekly digest ("Minggu ini anak Anda menyelesaikan 8 tugas, 2 terlambat, nilai rata-rata 82...")
- Translate laporan teknis ke bahasa awam
- Kalau ortu tanya via chat, AI first-response (eskalasi ke wali kelas jika butuh)

### 7. Moderation (safety)

**Auto-flag di Forum, Comment, Peer Review:**
- Toxic language detection (Bahasa Indonesia, bahasa gaul, bahasa daerah dasar)
- Personal info leaks (siswa accidentally share alamat, nomor HP)
- Off-topic / spam

### 8. Search semantic

**Cross-module search:**
- Embeddings di lesson content, question bank, announcements, forum posts
- Query: "materi tentang ekosistem kelas 7" → retrieve relevant regardless of exact keyword

## Model strategy

Pilih model per use-case berdasarkan latency × quality × cost:

| Use case | Latency need | Quality need | Model recommendation |
|---|---|---|---|
| Tutor chat (streaming) | Sub-second | Medium | Groq Llama 70B, Haiku 4.5 |
| Essay grading | <5s OK | High | Claude Sonnet 4.6 atau GPT-4 |
| Content generation (lesson) | <10s OK | High | Claude Sonnet 4.6 |
| Quiz generation | <10s OK | Medium-High | Groq 70B atau Sonnet |
| Toxic classification | Sub-second | Medium | Small classifier (local) atau Haiku |
| Embedding | Batch OK | N/A | OpenAI text-embedding-3-small atau local |
| Narrative insight (principal) | <30s OK | High | Claude Sonnet 4.6 (good at summarization) |
| Intent routing | Sub-second | Medium | Haiku |

**Recommendation**: abstraction layer `AiProvider` trait; tiap use-case config model via env + feature flag per tenant.

## Guardrails (wajib)

### Privacy
- **PII filter** sebelum prompt ke LLM: strip NISN, NIK, nomor HP, alamat
- **Tenant isolation** di prompt context: gak pernah mix data tenant A dengan tenant B
- **Opt-in per tenant**: sekolah bisa disable AI features (tenant_modules flag `ai_enabled`)
- **Student consent** (minor): parent consent record for AI features involving student data beyond class

### Cost & abuse
- **Rate limit per tenant**: X AI calls per jam, per hari. Over → queue / upgrade prompt
- **Per-user rate limit**: cegah 1 siswa spam tutor 1000×
- **Token budget**: log token usage per request, alert kalau over threshold
- **Feature-flag disable**: kalau cost runaway, admin bisa kill switch

### Quality & safety
- **Prompt injection defense**: sanitize user input, system prompt locked
- **Refuse list**: jangan generate konten pornografis, kekerasan, SARA — walaupun model tidak otomatis refuse, add filter
- **Hallucination guardrail untuk essay grading**: AI output = suggestion, teacher finalizes. Tidak pernah auto-submit grade.
- **Factual checking untuk content gen**: flag "AI-generated, needs teacher review" sampai guru approve
- **Prompt versioning**: prompt templates in repo (`src/domains/ai/prompts/*.md`), versioned, tested

### Auditability
- **Log semua AI call** ke `ai_generation_logs` (sudah ada) — request, response, user, tenant, cost, duration
- **Per-tenant dashboard**: "AI usage bulan ini — 1234 generations, Rp 234.500 cost"
- **Explainability untuk grading**: saat AI kasih score, sertakan reasoning yang guru bisa review

## Data pipeline untuk AI features

### Struggle detection pipeline
```
quiz_attempts_v2 → progress_events → student_lesson_signals
                                        ↓
                                  aggregate per student per week
                                        ↓
                                  at_risk_score (0-1, via rule or ML)
                                        ↓
                           threshold exceeded → struggle_alerts row
                                        ↓
                           notify wali_kelas, BK, parent (if configured)
```

### Recommendations pipeline (proposed)
```
user_xp + lesson_progress + course_enrollments
            ↓
    feature extraction (completion rate, strong subjects, weak CPs)
            ↓
    embedding-based similar content retrieval
            ↓
    rank by: not-yet-attempted, matching weak areas, pedagogical progression
            ↓
    top-N served via get_student_recommendations RPC
```

Phase 1: rule-based (heuristic).
Phase 2: collaborative filtering.
Phase 3: neural rec system (kalau scale justify).

## Open questions

- Plagiarism: buy (Turnitin/Copyleaks — $$) atau build (embedding + similarity)? Buy recommended untuk segera.
- AI usage cost passed to tenant? (pricing model implication)
- On-premise LLM option? Beberapa sekolah sensitif data (yayasan Islam, data siswa). Explore Qwen/Llama self-host.
- Bahasa daerah (Jawa, Sunda, Batak): support di tutor? Kemungkinan out-of-scope dulu.
