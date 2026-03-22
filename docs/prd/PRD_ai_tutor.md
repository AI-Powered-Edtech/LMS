# PRD — AI Tutor

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Live
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/ai-tutor/`

---

## 1. Problem Statement

Siswa Indonesia menghadapi hambatan dalam belajar mandiri, terutama ketika guru tidak tersedia untuk menjawab pertanyaan spesifik tentang materi pelajaran. Dengan mayoritas akses dari perangkat mobile dan alokasi guru yang terbatas, siswa sering kesulitan mendapatkan penjelasan tambahan atau klarifikasi konsep dalam waktu singkat. Hal ini menyebabkan tingkat pemahaman materi yang rendah, stagnasi pembelajaran, dan frustrasi siswa.

AI Tutor memungkinkan setiap siswa mendapatkan penjelasan kontekstual, unlimited, dan instant untuk setiap topik dalam lesson mereka—tanpa harus menunggu guru. Ini adalah diferensiator kunci EduSync vs Google Classroom (yang tidak memiliki AI assistant terpadu). Dengan fitur ini, engagement siswa meningkat, teacher workload berkurang, dan platform menjadi learning companion yang lebih complete.

---

## 2. Goals

1. **Increase Student Independence:** Siswa dapat menyelesaikan materi 30% lebih cepat karena bisa self-serve explanations tanpa menunggu teacher.
2. **Improve Concept Clarity:** 90% siswa yang menggunakan AI Tutor merasa konsep lebih jelas setelah interaksi, measured via NPS atau post-lesson survey.
3. **Reduce Teacher Support Load:** 40% pertanyaan umum di comments/forums teralihkan ke AI Tutor, membebaskan guru untuk mentoring bernilai tinggi.
4. **Higher Lesson Completion Rate:** Siswa yang menggunakan AI Tutor menyelesaikan lesson 25% lebih konsisten vs kontrol.
5. **Data-Driven Instructional Improvement:** Aggregate pertanyaan siswa ke AI Tutor memberikan insights tentang pain points materi untuk iterasi guru.

---

## 3. Non-Goals

1. **Replace Teacher Interaction:** AI Tutor adalah supplement, bukan replacement untuk guru. Masalah sosial-emosional atau motivasi tetap domain guru.
2. **Multi-Language Support di v1:** Fokus Bahasa Indonesia dahulu. English/languages lain di phase selanjutnya.
3. **Offline AI:** Semua request harus online ke Edge Function. Offline mode adalah future consideration.
4. **AI Fine-Tuning on EduSync Data:** v1 menggunakan general LLM API (e.g., OpenAI GPT, Claude). Custom fine-tuning dengan student Q&A data adalah v2.
5. **Analytics Deep-Dive:** v1 hanya track basic metrics (questions asked, resolution satisfaction). Advanced NLP insights (misconception detection) untuk phase berikutnya.

---

## 4. User Stories

### Untuk Siswa (Student)

- **US1:** As a student, I want to ask the AI Tutor a question about the lesson **so that** I get an instant explanation without interrupting my learning flow or waiting for teacher reply.
  - Example: Siswa baca lesson tentang "Persamaan Linear", stuck di step 3, klik "Tanya AI", bertanya "Kenapa kita pindah +2 ke sisi kanan?", AI kasih step-by-step explanation.

- **US2:** As a student, I want to see AI responses in a modal/panel overlay on the lesson page **so that** I don't lose my place in the reading material.
  - Context: Mayoritas akses dari HP, screen space terbatas. Dialog harus non-intrusive.

- **US3:** As a student, I want to rate helpfulness of AI response (thumbs up/down) **so that** I provide feedback to improve AI quality and teachers see what students struggle with.

- **US4:** As a student, I want follow-up question capability **so that** I can dive deeper into a concept without re-contextualizing each time.
  - Example: Tanya Q1, dapat jawaban, tanya lagi "Bisa kasih contoh soal?", AI remember context.

- **US5:** As a student, I want to request clarification in simple Bahasa Indonesia (not formal) **so that** the AI understands natural student language and responds in friendly tone.

### Untuk Guru (Teacher)

- **US6:** As a teacher, I want to see aggregated questions my students asked the AI per lesson **so that** I understand which concepts are hardest and adjust my teaching.
  - UI: Dashboard tab "AI Q&A Insights" → per lesson → top 10 questions + count.

- **US7:** As a teacher, I want to disable AI Tutor for specific lessons or quizzes **so that** I preserve integrity of assessments where I want student to struggle/think independently.

- **US8:** As a teacher, I want to see which students are heavily relying on AI vs independent learners **so that** I can provide targeted support.

---

## 5. Requirements

### P0 — Must Have

| #   | Requirement                        | Acceptance Criteria (Given/When/Then)                                                                                                                                                                                      |
| --- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **AI Tutor Button on Lesson Page** | Given a student viewing lesson content, When they click "Tanya AI" button (or icon), Then a modal/chat panel opens                                                                                                         |
| 2   | **Natural Language Q&A**           | Given student submits a question, When system calls `ai-tutor` Edge Function with lesson context + question, Then response generated within 5 seconds, formatted as 2–4 paragraph explanation in friendly Bahasa Indonesia |
| 3   | **Context Awareness**              | Given student asks question about lesson content, When AI Tutor responds, Then explanation is specific to that lesson's topic (not generic) + includes 1–2 examples from lesson                                            |
| 4   | **Follow-up Questions**            | Given AI response displayed, When student asks follow-up question in same session, Then AI maintains conversation context (remembers previous Q&As) + responds to follow-up within 3 seconds                               |
| 5   | **Helpfulness Rating (Thumbs)**    | Given AI response received, When student clicks 👍 or 👎, Then rating stored in `ai_tutor_ratings` table (NEW) + triggers feedback telemetry                                                                               |
| 6   | **Rate Limiting**                  | Given student spams AI with 10+ questions in 60 seconds, When next request comes, Then show "Tunggu sebentar sebelum bertanya lagi" + queue request fairly, don't reject                                                   |
| 7   | **Error Handling**                 | Given API fails/timeout, When response cannot be generated, Then display friendly message "AI sedang tidak tersedia. Coba lagi atau tanya guru" + log error for support                                                    |
| 8   | **Disable AI per Lesson**          | Given teacher wants to disable AI for a quiz, When teacher edits lesson settings, Then toggle "Aktifkan AI Tutor" appears + setting stored in `lessons.ai_tutor_enabled` (default TRUE)                                    |
| 9   | **Admin Danger Toggle**            | Given admin wants to disable AI service globally, When admin goes to Settings → AI Tutor, Then see toggle "AI Tutor Service Status" + can pause without code deployment                                                    |
| 10  | **Mobile Responsive**              | Given student on mobile (375px width), When opening AI Tutor panel, Then panel doesn't cover critical lesson content + keyboard doesn't hide response text + bottom panel is scrollable                                    |

### P1 — Nice to Have

| #   | Requirement                     | Notes                                                                                                                                                        |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Suggest Follow-up Questions** | After AI response, show 2–3 suggested follow-up questions (e.g., "Mau lihat contoh soal?", "Penjelasan lebih detail?"). Improves UX tanpa siswa harus ketik. |
| 2   | **Transcript Export**           | Siswa bisa export Q&A transcript ke PDF untuk study reference later.                                                                                         |
| 3   | **Teacher AI Feedback Form**    | Teacher bisa mark AI response as "Jawaban salah" atau "Tidak sesuai materi", feeds back to product team for model improvement.                               |
| 4   | **Weekly AI Digest**            | Teacher dapat summary email: "Top 10 student questions this week" + common misconceptions.                                                                   |
| 5   | **Dark Mode Support**           | Chat panel respects system dark mode preference + Tailwind `dark:` classes applied.                                                                          |

### P2 — Future Considerations

| #   | Consideration                           | Reasoning                                                                                                                                |
| --- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **AI Fine-Tuning on School Curriculum** | v2: Upload school curriculum/textbooks, AI learns school-specific content for hyper-accurate responses. Currently generic LLM knowledge. |
| 2   | **Multi-Language Responses**            | v2: Support English, Javanese, other regional languages. v1 is Indonesian-only.                                                          |
| 3   | **Sentiment Analysis & Mental Health**  | v2: Detect frustration/low confidence in student questions → suggest break/teacher check-in. Privacy-sensitive feature.                  |
| 4   | **AI-Generated Practice Problems**      | v2: "Generate 5 practice problems on this topic" button leveraging same LLM. Current scope doesn't include content generation.           |
| 5   | **Offline Mode with Cached Responses**  | v2: Cache popular Q&As locally on device for offline access in areas with poor connectivity.                                             |

---

## 6. Success Metrics

### Leading Indicators (Hari–Minggu)

- **AI Tutor Activation Rate:** % of students who click "Tanya AI" at least once per lesson. **Target:** 60% by week 4.
  - **Cara Ukur:** `SELECT COUNT(DISTINCT user_id) WHERE ai_tutor_used = true / total_students`

- **Avg Questions per Active Student:** Rata-rata berapa pertanyaan active users bertanya per session. **Target:** 2.5 questions/student/lesson.
  - **Cara Ukur:** `ai_tutor_questions / ai_tutor_active_users`

- **Response Time (P95):** 95th percentile response time dari question submit ke answer received. **Target:** <3 seconds.
  - **Cara Ukur:** Measure di Edge Function logs `timestamp_question_received` vs `timestamp_response_sent`

- **Helpfulness Rating Ratio:** % of responses rated 👍. **Target:** >70% thumbs-up.
  - **Cara Ukur:** `thumbs_up_count / (thumbs_up_count + thumbs_down_count)`

### Lagging Indicators (Minggu–Bulan)

- **Lesson Completion Rate (AI Users vs Control):** % completion rate siswa yang use AI >5 questions vs non-users. **Target:** +25% for heavy users.
  - **Cara Ukur:** Cohort analysis, control group without AI toggle.

- **Time-to-Lesson-Completion:** Median hari untuk siswa complete lesson. **Target:** 30% faster dengan AI vs without.

- **Teacher Workload Reduction:** % pertanyaan di discussion/comments yang sekarang gone to AI instead. **Target:** 35% shift.
  - **Cara Ukur:** Aggregate comment threads "AI Tutor" reference + topic classification.

- **NPS for AI Feature:** Post-lesson survey "Seberapa helpful AI Tutor?" (0–10 scale). **Target:** 8.0+.

---

## 7. Open Questions

| #   | Pertanyaan                                                                                 | Owner                 | Blocking?            |
| --- | ------------------------------------------------------------------------------------------ | --------------------- | -------------------- |
| 1   | Mana LLM provider untuk Edge Function? (OpenAI GPT-4, Claude, local open-source?)          | Engineering + Product | Ya                   |
| 2   | Apakah ada content moderation untuk prevent harmful jailbreak attempts?                    | Security/Engineering  | Ya                   |
| 3   | Cost per API call vs budget? Bisakah monetize ini di future (premium AI)?                  | Product/Finance       | Tidak (nice-to-know) |
| 4   | Berapa session context depth (follow-up questions)? Limit 5 atau unlimited dalam 1 lesson? | Engineering/UX        | Ya                   |
| 5   | Apakah AI boleh refer siswa ke teacher/forum untuk certain topics?                         | Product/Pedagogy      | Tidak (v2)           |
| 6   | Teacher dashboard untuk insights — ini di v1 atau v2?                                      | Product/Design        | Tidak (v2)           |

---

## 8. Timeline & Phases

### Phase 1: MVP (2 minggu)

- **Week 1:** Design modal UI, integrate Edge Function `ai-tutor`, implement question/response flow, add rating system.
- **Week 2:** Mobile testing, error handling, rate limiting, disable-per-lesson toggle, launch to beta teachers.

### Phase 2: Polish + Monitoring (1 minggu)

- Analytics integration, monitor P95 latency, collect user feedback, A/B test button placement.
- Launch to all schools.

### Phase 3: Insights Dashboard (v1.1, later)

- Teacher dashboard: top questions per lesson + misconception detection.

**Hard Deadline:** Ship MVP to beta teachers by EOD April (week 2 of dev).

---

## 9. Dependensi & Risiko

### Technical Dependencies

1. **Edge Function `ai-tutor` exists & deployed:** Must be tested end-to-end with realistic latency.
2. **Supabase RLS for `ai_tutor_questions` table:** Must isolate by tenant + course.
3. **React Query integration:** Questions/responses cached efficiently to reduce re-renders on mobile.

### Integration Points

- **Lessons Table:** Must add column `lessons.ai_tutor_enabled` (boolean, default true).
- **Auth Context:** Must use `useAuth()` to get `user_id`, `course_id` for context.
- **Notifications:** v1.1 might notify teacher of high-confusion topics. Coordinate with notifications team.

### Risks & Mitigations

| Risk                                   | Impact                           | Mitigation                                                                                 |
| -------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| LLM API errors/latency (>5s)           | Poor UX, student abandonment     | Rate limit aggressively, show friendly fallback, queue gracefully                          |
| LLM provides incorrect/harmful content | Damage to credibility, liability | Prompt engineering with guardrails, content moderation filter, teacher override capability |
| High API costs exceed budget           | Financial risk                   | Monitor per-school usage, implement throttling, consider tiered access (premium)           |
| Students abuse AI to cheat on quizzes  | Academic integrity               | Disable AI on `quiz_mode = true` lessons, teacher review suspicious patterns               |
| Mobile UX breaks on small screens      | Low adoption on phones           | Aggressive mobile testing, panel bottom-sheet design, keyboard handling                    |

### Edge Cases to Test

1. **Offline question submission:** If student loses connection mid-question, queue request and retry when online.
2. **Concurrent follow-ups:** If student submits 3 follow-up questions rapidly, handle gracefully (queue, don't error).
3. **Very long questions (>1000 chars):** Truncate with warning or encourage summarization.
4. **Non-lesson-related questions:** Student asks "Kenapa langit biru?" when on Math lesson. AI should politely redirect: "Itu pertanyaan menarik! Untuk topik di luar pelajaran ini, tanya guru atau cek resources lain."
5. **Lesson without AI context (e.g., quiz-only lesson):** Ensure `ai_tutor_enabled` check prevents confusion.
