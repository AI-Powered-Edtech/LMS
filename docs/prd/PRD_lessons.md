# PRD — Lessons (Pelajaran)

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Live
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/lessons/`

---

## 1. Problem Statement

Siswa Indonesia memerlukan cara yang fleksibel untuk belajar konten yang beragam—artikel, video, interactive quiz—dalam satu tempat. Guru perlu mudah membuat pelajaran tanpa coding. Saat ini, banyak LMS membatasi konten ke satu tipe per "page", padahal pembelajaran modern membutuhkan **multi-block lessons dengan mix article + video + embedded quiz**.

Masalah utama:

- **Guru:** Tidak bisa buat lesson dengan beberapa block sekaligus; perlu upload video setiap kali.
- **Siswa:** Engagement rendah karena monoton (hanya text atau hanya video); tidak bisa self-assess dengan quiz embedded.
- **Platform:** Tidak ada insight tentang student engagement per lesson (time spent, dropout rate, common mistakes).

---

## 2. Goals

1. **Flexible Content Authoring:** Guru dapat mix article blocks, video blocks, quiz blocks dalam satu lesson dengan block editor drag-and-drop.
2. **Rich Media Support:** Support YouTube/Vimeo embeds dan self-hosted video upload ke Supabase Storage tanpa external dependency.
3. **Student Engagement:** Embed quiz di lesson untuk self-assessment; track student interaction signals (time spent, quiz scores, replay count).
4. **Progress Tracking:** Automatic mark lesson complete when all required blocks viewed + quiz passed; sync to course progress.
5. **Analytics Ready:** Collect `student_lesson_signals` (time spent, last accessed, quiz score) for engagement dashboard + AI Tutor recommendations.

---

## 3. Non-Goals

1. **Live Synchronous Learning** — No Zoom/Google Meet integration in v1; async learning only.
2. **Advanced Video Analytics** — Heatmap (where students pause/rewind); deferred to Phase 6 analytics overhaul.
3. **Student Annotations/Notes** — Sticky notes on lesson content; good UX but complex to build.
4. **Multi-language Subtitles** — Video CC in English/Indonesia; Phase 6 with i18n overhaul.
5. **Offline Mode** — Download lesson for offline access; requires service worker + storage management, defer.

---

## 4. User Stories

### Untuk Guru (Teacher)

- **US-L1:** Sebagai guru, saya ingin membuat lesson dengan artikel + video + quiz dalam satu editor, sehingga saya bisa craft engaging multi-modal learning experience.
  - Acceptance: Block editor dengan drag-drop; 3 block types: article, video, quiz; preview real-time.

- **US-L2:** Sebagai guru, saya ingin upload video ke Supabase Storage dan embed dalam lesson, sehingga tidak perlu YouTube atau external host.
  - Acceptance: "Upload video" button → Supabase Storage; show upload progress; auto-generate thumbnail; embed player.

- **US-L3:** Sebagai guru, saya ingin set pembelajaran mandatory (misal: harus view semua video sebelum lanjut) atau optional, sehingga saya bisa kontrol student journey.
  - Acceptance: Block-level toggle "Required" vs "Optional"; on completion, check all required blocks viewed before allow mark complete.

- **US-L4:** Sebagai guru, saya ingin lihat analytics per lesson—berapa siswa sudah complete, avg time spent, rata-rata quiz score—sehingga saya tahu apakah lesson efektif.
  - Acceptance: Teacher lesson dashboard dengan table: enrollment vs completion count, avg time, avg quiz score; filter by date range.

- **US-L5:** Sebagai guru, saya ingin edit lesson after publish tanpa breaking student access, sehingga saya bisa fix typo atau update content.
  - Acceptance: Version lesson_resources; students always see latest; edit form persisten; no downtime.

### Untuk Siswa (Student)

- **US-S1:** Sebagai siswa, saya ingin belajar dari lesson dengan article + video, dan langsung kerjakan quiz dalam halaman yang sama, sehingga tidak perlu pindah tab.
  - Acceptance: Single lesson page dengan semua blocks; smooth scroll; quiz dalam iframe atau inline; submit quiz in-context.

- **US-S2:** Sebagai siswa, saya ingin video player auto-track waktu saya menonton (progress bar), dan resume dari timestamp last paused saat kembali.
  - Acceptance: Video player (HTML5 or player lib) dengan persistent seek position in `student_lesson_signals`; resume button.

- **US-S3:** Sebagai siswa, saya ingin lihat progress bar lesson (article viewed, video watched, quiz done) sehingga saya tahu apa yang kurang.
  - Acceptance: Progress indicator: 3/5 blocks complete; show which blocks remaining; % completion overall.

- **US-S4:** Sebagai siswa, saya ingin mark lesson "complete" setelah lihat semua required content, sehingga progress kursus terupdate.
  - Acceptance: Completion button; auto-trigger jika all required blocks viewed + quiz passed; update `course_progress` real-time.

- **US-S5:** Sebagai siswa, saya ingin rewatch video atau redo quiz tanpa penalty, sehingga saya bisa belajar ulang.
  - Acceptance: "Rewatch" button untuk video; "Redo quiz" button; auto-track retry count; latest score saved (not avg).

- **US-S6:** Sebagai siswa, saya ingin report masalah (broken video, typo, unclear) dengan one-click feedback, sehingga guru tahu ada issue.
  - Acceptance: Feedback button; modal for "video broken", "confusing", "inappropriate content"; send to teacher dashboard.

### Untuk Admin Sekolah (Admin)

- **US-A1:** Sebagai admin, saya ingin audit student engagement per lesson (time spent, completion %, quiz pass rate) untuk mendeteksi struggling students.
  - Acceptance: Admin dashboard dengan lesson engagement table; sort by lowest completion rate; drill-down per lesson to see student list.

---

## 5. Requirements

### P0 — Must Have

| #   | Requirement                   | Acceptance Criteria                                                                                                                                                                                        |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Lesson Schema**             | Table `lessons` with fields: course_id, module_id, type, "order", title, description, created_by, published_at, status (draft/published/archived). Quotes on "order" field.                                |
| 2   | **Lesson Resources**          | Table `lesson_resources` with JSONB `content` field storing block array: `[{type: 'article', text: '...'}, {type: 'video', url: '...'}, {type: 'quiz', quiz_id: '...'}]`.                                  |
| 3   | **Block Types**               | Support 3 block types: Article (rich text), Video (YouTube/Vimeo/upload), Quiz (embedded by quiz_id). Render in lesson viewer.                                                                             |
| 4   | **Video Upload**              | "Upload video" button → Supabase Storage (`/lessons/{lessonId}/videos/{filename}`); show upload progress (0-100%); auto-generate thumbnail from first frame.                                               |
| 5   | **Block Editor**              | Drag-and-drop editor to add/remove/reorder blocks. Preview real-time. "Required" toggle per block. Save to lesson_resources JSONB on editor close.                                                         |
| 6   | **Lesson Viewer**             | Single-page viewer rendering all blocks; smooth scroll; video player with progress seek; quiz embed inline; responsive on mobile.                                                                          |
| 7   | **Block Completion Tracking** | Table `student_lesson_signals` tracks per-block progress: `{user_id, lesson_id, article_viewed, video_watched_seconds, quiz_score}`. Update on user interaction (scroll article, seek video, submit quiz). |
| 8   | **Lesson Completion Logic**   | Mark lesson complete when: all required blocks viewed (article scroll to bottom, video play ≥80%, quiz score ≥60%). Auto-update `course_progress` aggregate.                                               |
| 9   | **Progress Persistence**      | Save progress (time watched, scroll position) to DB real-time (debounced 5 sec) so student can resume anytime.                                                                                             |
| 10  | **Lesson Stats API**          | RPC `v1_get_lesson_stats(p_lesson_id)` returns: completion_count, completion_rate, avg_time_spent, avg_quiz_score, retry_count. Updated in `student_lesson_signals` aggregate.                             |
| 11  | **Teacher Lesson Dashboard**  | View lesson performance metrics: student list with completion status, time spent, quiz score. Sort by score/time/status.                                                                                   |
| 12  | **RLS & Multi-Tenant**        | All lessons scoped to course → module → tenant. Teachers can only edit own lesson. Students can only view if enrolled in course.                                                                           |
| 13  | **Dark Mode**                 | All components support dark mode with `dark:` Tailwind. Test on viewer + editor.                                                                                                                           |
| 14  | **Documentation**             | Update `docs/DATABASE_ARCHITECTURE.md` with lesson_resources schema; create feature README with block type reference.                                                                                      |

### P1 — Nice to Have

| #   | Requirement                | Reasoning                                                                                         |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | **Lesson Duplication**     | Copy lesson within course or cross-course to save time.                                           |
| 2   | **Student Annotations**    | Highlight text + sticky note margin in article blocks; teacher can view common highlights.        |
| 3   | **Video Transcript/CC**    | Auto-generate captions with Google Speech-to-Text or upload manual SRT. Show captions in player.  |
| 4   | **Lesson Scheduling**      | Release lesson on specific date/time (mimic classroom calendar). Show "locked until" to students. |
| 5   | **Collaborative Editing**  | Multiple teachers co-edit lesson in real-time (CRDTs or server-side lock).                        |
| 6   | **Discussion Integration** | Embed per-lesson discussion thread; students ask Q&A directly on lesson page.                     |

### P2 — Future Considerations

| #   | Item                         | Reasoning                                                                            |
| --- | ---------------------------- | ------------------------------------------------------------------------------------ |
| 1   | **Advanced Video Analytics** | Heatmap (where students pause/rewind most); requires video stream processing.        |
| 2   | **Synchronous Lesson Mode**  | Broadcast live lesson to class with Zoom API integration; requires RTC layer.        |
| 3   | **Adaptive Learning Paths**  | Branch lesson content based on quiz score (if <60%, show remedial; else next level). |
| 4   | **Offline Download**         | Download lesson (article + video) for offline access via service worker.             |
| 5   | **A/B Test Content**         | Run A/B tests on two lesson versions; measure completion %, time spent, scores.      |

---

## 6. Success Metrics

### Leading Indicators (hari–minggu)

| Metric                          | Target                                                 | Cara Ukur                                                                                      |
| ------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| **Lesson Creation Rate**        | Guru create 2–5 lessons per course on average          | COUNT(\*) FROM lessons WHERE created_at >= NOW() - INTERVAL '7 days'; target 50+ lessons/week. |
| **Block Editor Usability**      | 90% of lessons contain ≥2 block types (not monolithic) | SELECT COUNT(\*) WHERE JSONB array length(lesson_resources.content) ≥ 2 / total lessons.       |
| **Video Upload Success Rate**   | 95% of upload attempts succeed without retry           | COUNT(successful_uploads) / COUNT(total_uploads); log upload errors.                           |
| **Editor Autosave Reliability** | 100% of edits persisted correctly                      | Diff before vs after; no data loss. QA regression test on 50 edit scenarios.                   |
| **Block Completion Accuracy**   | >95% of auto-completed blocks correct                  | Verify against user session logs; manual spot-check 20 records.                                |

### Lagging Indicators (minggu–bulan)

| Metric                            | Target                                                    | Cara Ukur                                                                  |
| --------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Student Lesson Engagement**     | 70% of enrolled students complete ≥50% lessons per course | COUNT(user_id) WHERE completion_rate >= 50% / total enrolled per course.   |
| **Avg Time-to-Complete Lesson**   | 20–40 minutes per lesson (article + video + quiz)         | AVG(student_lesson_signals.total_time_spent) per lesson; exclude outliers. |
| **Video Watch Duration**          | 80%+ of video watched per lesson (avg)                    | AVG(video_watched_seconds) / video_length_seconds ≥ 0.8.                   |
| **Quiz Pass Rate per Lesson**     | 65%+ of students pass quiz (score ≥60%) on first attempt  | COUNT(\*) WHERE quiz_score >= 60 / total quiz attempts per lesson.         |
| **Lesson Completion Rate**        | 75%+ of students mark lesson complete                     | COUNT(completion_event) / COUNT(views) per lesson.                         |
| **Retry Engagement**              | 40%+ of students redo quiz or rewatch video               | COUNT(DISTINCT user_id) WHERE retry_count > 0 / total students per lesson. |
| **Performance: Lesson Page Load** | <1.5 sec p50, <4 sec p95                                  | Monitor Core Web Vitals; LCP, FID, CLS budgets in build.                   |

---

## 7. Open Questions

| #   | Pertanyaan                                                                                  | Owner       | Blocking?                                                                                     |
| --- | ------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| 1   | Should quiz embed fetch quiz data fresh per student attempt, or cache?                      | Engineering | Tidak — fetch fresh per attempt; ensures fairness.                                            |
| 2   | Max video file size? Compression codec (H.264, VP9)?                                        | Engineering | Tidak — use Supabase Storage defaults; optimize in v2 if needed.                              |
| 3   | Should lesson progress be auto-marked complete, or require explicit "Mark Complete" button? | Product     | Tidak — auto-complete if all required blocks done; show button for confirmation.              |
| 4   | How to handle video in slow internet? Adaptive bitrate streaming (HLS/DASH)?                | Engineering | Tidak — v1 single bitrate; if user wants quality, they manage bandwidth. HLS in v2.           |
| 5   | Should students be able to skip required blocks (e.g., video), or enforce viewing order?    | Product     | Tidak — v1 allow skip; but only mark complete if all required viewed. Can soft-enforce later. |
| 6   | How long to cache lesson_stats before re-compute? Every view or 5-min batch?                | Engineering | Tidak — on-demand compute (RPC call); cache in React Query for 30 sec; let teacher refresh.   |

---

## 8. Timeline & Phases

### Phase 1: Schema & Video Infra (Week 1–2)

- [x] Database schema finalized (`lessons`, `lesson_resources`, `student_lesson_signals`)
- [ ] Supabase Storage bucket created for videos (`/lessons/{lessonId}/videos`)
- [ ] RLS policies for lesson access (via course → enrollment check)
- [ ] Video upload utility function (to Storage)

### Phase 2: Block Editor (Week 3–4)

- [ ] Block editor UI (add/remove/reorder blocks via drag-drop)
- [ ] Article block (rich text editor, e.g., Slate or draft-js)
- [ ] Video block (upload or embed YouTube/Vimeo)
- [ ] Quiz block (select quiz by ID)
- [ ] Real-time preview

### Phase 3: Lesson Viewer (Week 5–6)

- [ ] Single-page lesson viewer layout
- [ ] Article block renderer (HTML sanitization)
- [ ] Video player (HTML5 with progress bar + timestamp resume)
- [ ] Quiz block inline renderer (iframe or direct)
- [ ] Progress bar showing block completion status

### Phase 4: Completion Tracking (Week 7–8)

- [ ] `student_lesson_signals` table auto-populate on interactions
- [ ] Lesson completion logic (if all required blocks done → mark complete)
- [ ] Update `course_progress` aggregate on lesson completion
- [ ] Resume from last position (video seek, article scroll)

### Phase 5: Teacher Analytics & Polish (Week 9–10)

- [ ] Teacher lesson dashboard (engagement metrics)
- [ ] Dark mode audit
- [ ] Responsive mobile design
- [ ] Error handling + UX polish

### Phase 6: Launch Prep (Week 11)

- [ ] Performance testing (video stream, large article)
- [ ] Security audit (video access RLS, student isolation)
- [ ] UAT with 3 teachers + 15 students
- [ ] Soft launch to 1 school

---

## 9. Dependensi & Risiko

### Dependensi

| Dependensi                                 | Status  | Impact                                                                             |
| ------------------------------------------ | ------- | ---------------------------------------------------------------------------------- |
| Course + Module schema                     | ✅ Live | Lessons depend on parent course_id + module_id.                                    |
| Quiz system (RPC `v1_submit_quiz_attempt`) | ✅ Live | Embedded quiz blocks rely on working quiz engine.                                  |
| Supabase Storage                           | ✅ Live | Video upload/CDN; must be configured.                                              |
| Video player library                       | ⚠️ TBD  | Recommend: `react-player` or `plyr` (lightweight HTML5 wrapper); test perf.        |
| Rich text editor                           | ⚠️ TBD  | Recommend: `@tiptap/react` or `slate` (popular, extensible); need to lock version. |

### Risiko & Mitigasi

| Risiko                                                                                                                       | Severity | Mitigasi                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| **Video upload hangs on mobile** — Large file + unstable connection.                                                         | Medium   | Implement resumable upload (Tus protocol or native S3 multipart); show upload speed; allow pause/resume.      |
| **Progress tracking race condition** — Multiple quiz submissions or video seeks update `student_lesson_signals` out-of-sync. | Medium   | Use atomic DB increment (e.g., `time_spent = time_spent + delta`); transaction on RPC.                        |
| **Video streaming CDN latency** — Students in remote area slow to load video from Supabase Storage.                          | Low      | v1 use Supabase CDN; monitor real-world latency; add caching headers; consider CloudFlare in v2.              |
| **Rich text XSS** — Teacher injects malicious HTML in article block; render raw → XSS.                                       | Medium   | Sanitize on save with `DOMPurify` or `xss` library; use `dangerouslySetInnerHTML` only after sanitization.    |
| **Quiz data stale in embedded block** — Teacher updates quiz after student starts lesson; quiz config mismatch.              | Low      | Fetch quiz data fresh per student attempt; don't cache in lesson_resources. Version quiz questions immutably. |
| **Mobile video player UX** — Drag-drop block editor not usable on phone; lesson viewer mobile responsive but editor sucks.   | Medium   | v1 desktop editor only; mobile can view + consume, not edit. Add note in UI.                                  |

---

## 10. Acceptance Criteria for V1 Launch

**Teacher:**

- [ ] Can add article + video + quiz blocks to lesson
- [ ] Can upload video to Supabase Storage without manual encoding
- [ ] Can preview lesson before publish
- [ ] Can edit lesson after publish; students see latest version
- [ ] Can see lesson engagement metrics (completion %, avg time, quiz score)

**Student:**

- [ ] Can view lesson with article, video, quiz in one page
- [ ] Can pause/resume video; progress saved automatically
- [ ] Can take quiz embedded in lesson; score persists
- [ ] Can mark lesson complete after all required blocks done
- [ ] Can see progress bar (X/Y blocks complete)
- [ ] Can resume lesson from last position after close/reopen

**Admin:**

- [ ] Can audit student engagement per lesson (completion, time, scores)
- [ ] Can drill-down to individual student progress

**Technical:**

- [ ] RLS enforces lesson access via course enrollment check
- [ ] No N+1 queries on lesson load or block completion update
- [ ] Video loads <2 sec on 4G (test with Lighthouse throttling)
- [ ] Rich text XSS-safe (sanitization tested)
- [ ] Dark mode working on editor + viewer
- [ ] Documentation updated (DATABASE_ARCHITECTURE.md, feature README)

---

## 11. Implementation Notes for Engineers

### Database Gotchas

- `lessons."order"` — Must quote `order` field in all SQL queries (reserved word).
- `lesson_resources` — JSONB array of blocks; use `jsonb_array_length(content)` to count blocks.
- `student_lesson_signals` — Three key columns: `total_time_spent`, `last_accessed_at`, `latest_quiz_score` (not `time_spent_seconds`, `last_event_at`, `quiz_avg_score`).

### JSONB Block Schema

```json
[
  {
    "type": "article",
    "required": true,
    "content": "<h2>Introduction</h2><p>Learn about...</p>",
    "order": 0
  },
  {
    "type": "video",
    "required": true,
    "url": "https://storage.supabase.co/lessons/{lessonId}/videos/...",
    "thumbnail": "...",
    "duration": 600,
    "order": 1
  },
  {
    "type": "quiz",
    "required": true,
    "quizId": "uuid",
    "order": 2
  }
]
```

### Progress Tracking Pattern

```sql
-- On lesson load, check student progress
SELECT
  (lesson_resources::jsonb #> '{0,type}' = '"article"'::jsonb
    AND article_viewed)::int +
  (lesson_resources::jsonb #> '{1,type}' = '"video"'::jsonb
    AND video_watched_seconds > (lesson_resources::jsonb #> '{1,duration}')::int * 0.8)::int +
  (lesson_resources::jsonb #> '{2,type}' = '"quiz"'::jsonb
    AND quiz_score >= 60)::int AS blocks_completed
FROM student_lesson_signals
WHERE user_id = $1 AND lesson_id = $2;
```

### Feature Module Structure

```
src/features/lessons/
├── api/
│   ├── lessonService.ts
│   └── videoUploadService.ts
├── queries/
│   ├── lessonKeys.ts
│   └── lessonQueries.ts
├── hooks/
│   ├── useLesson.ts
│   ├── useBlockEditor.ts
│   └── useLessonProgress.ts
├── types/
│   └── index.ts (LessonBlock, StudentLessonSignal, etc.)
├── components/
│   ├── LessonViewer.tsx
│   ├── BlockEditor.tsx
│   ├── ArticleBlock.tsx
│   ├── VideoBlock.tsx
│   ├── QuizBlock.tsx
│   ├── ProgressBar.tsx
│   └── TeacherLessonDashboard.tsx
├── utils/
│   ├── blockRenderer.ts
│   ├── progressCalculator.ts
│   └── videoUploadHelper.ts
├── __tests__/
│   └── lessonService.test.ts
└── README.md
```

### Route Structure

- **Student:** `/#/app/student/courses/{courseId}/lessons/{lessonId}` — lesson viewer
- **Teacher:** `/#/app/teacher/course-builder?courseId={id}&moduleId={id}&lessonId={id}` — edit lesson
- **Teacher:** `/#/app/teacher/lessons/{lessonId}/analytics` — lesson dashboard
- **Admin:** `/#/app/admin/lessons/{lessonId}/engagement` — engagement drill-down

---

## Glossary

| Term                       | Definisi                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| **Pelajaran (Lesson)**     | Unit pembelajaran tunggal berisi multi-block content (article, video, quiz).             |
| **Block**                  | Komponen konten dalam lesson: article, video, quiz.                                      |
| **Required Block**         | Block yang harus diselesaikan siswa untuk mark lesson complete.                          |
| **lesson_resources**       | JSONB array menyimpan block content; fleksibel untuk perubahan di masa depan.            |
| **student_lesson_signals** | Record progress siswa per lesson: waktu, akses terakhir, skor quiz.                      |
| **Progress Tracking**      | Automatic monitoring siswa mana sudah complete; input untuk course_progress aggregate.   |
| **Lesson Completion**      | Siswa complete lesson = semua required blocks done. Auto-trigger update course_progress. |
