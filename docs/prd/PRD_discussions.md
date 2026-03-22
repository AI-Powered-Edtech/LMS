# PRD — Discussions (Diskusi)

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Live
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/discussions/`

---

## 1. Problem Statement

Di kelas tradisional, siswa hanya bisa diskusi materi pada jam pelajaran tertentu. Siswa yang malu, tertinggal, atau belajar malam hari tidak punya kesempatan bertanya. Selain itu, pertanyaan bagus dari siswa sering hilang dan tidak bisa direfer kembali.

**Masalah spesifik:**

- Siswa kesulitan materi tidak berani bertanya di kelas (shame culture Indonesia) → stagnasi pemahaman.
- Guru offline (malam) tidak bisa jawab pertanyaan siswa → siswa frustrasi, cari jawaban di Google/YouTube (less reliable).
- Diskusi via WhatsApp scatter, hilang dalam chat history → tidak bisa direfer next year.
- Teacher tidak bisa identify topik yang paling confusing across class.

Discussions di EduSync membuat **asynchronous Q&A per course/lesson menjadi norm**, mengurangi shame barrier, preserve knowledge, dan give teachers visibility ke pain points. Forum diskusi ini adalah core 21st-century learning tool dan competitive advantage.

---

## 2. Goals

1. **Increase Shy Student Voice:** 70% of "silent" students (non-hand-raisers) participate in at least 1 discussion per term.
2. **Preserve Instructional Knowledge:** 95% of student questions + teacher answers retained in searchable, reusable format (vs lost in WhatsApp).
3. **Enable Asynchronous Collaboration:** Students can discuss 24/7 without waiting for live teacher, improve engagement outside school hours by 50%.
4. **Identify Teaching Gaps:** Teacher see top 10 discussion topics per lesson → measure what students struggle most with → iterate teaching.
5. **Reduce Teacher Email/Message Overload:** 40% of "Why is my grade X?" or "Can you explain Y?" questions migrated to forum (student-to-student or answered once for class).

---

## 3. Non-Goals

1. **General Social Forum:** v1 is course-scoped. School-wide bulletin board / off-topic forum adalah v2.
2. **Real-Time Chat:** v1 is asynchronous forum (post + reply model). Real-time chat (like Slack) is future product.
3. **AI-Powered Moderation:** v1 is human moderation only (teacher pin/delete). Auto-detect spam/hate speech is v2 (requires ML).
4. **Reputation/Karma System:** v1 no upvotes, badges for top responders. Gamification is v2 (separate from discussions).
5. **Nested Threads (Multiple Levels):** v1 is 1-level (original post + comments). Reddit-style deep nesting is v2 (complex for mobile).
6. **Polling/Survey per Discussion:** v1 is text-only. Embedded polls for "Which concept is hardest?" is v2.

---

## 4. User Stories

### Untuk Siswa (Student)

- **US1:** As a student, I want to post a question or discussion topic in a course forum **so that** I can ask for help without raising hand in class (less shame).
  - Example: Student posts "Apa itu 'faktorisasi'? Saya nggak mengerti caranya dari teks buku" at 9 PM when stuck on homework.

- **US2:** As a student, I want to see existing discussions in the course **so that** I can search before posting (avoid duplicate questions).
  - Context: Student learns to check forum before asking, reduce clutter.

- **US3:** As a student, I want to reply to a discussion **so that** I can contribute ideas, help peers, or ask clarification.
  - Example: Another student replies with step-by-step example, original asker says "Terima kasih! Sekarang mengerti."

- **US4:** As a student, I want to see which discussions were "solved" or pinned by teacher **so that** I prioritize reading high-value threads.
  - Example: Green checkmark "Terjawab" on discussions teacher confirmed are correct.

- **US5:** As a student, I want to edit/delete my own post **so that** I can fix typos or remove if I realize it's silly.

- **US6:** As a student, I want to get notified when teacher replies to my discussion **so that** I don't miss the answer.

### Untuk Guru (Teacher)

- **US7:** As a teacher, I want to see all discussions in my courses **so that** I can monitor what students are struggling with.

- **US8:** As a teacher, I want to mark a discussion as "Terjawab" or "Official Answer" **so that** I signal to class this is the correct explanation.
  - Example: Student gives wrong answer, teacher replies "Good attempt, but correct answer is X because Y", pins that.

- **US9:** As a teacher, I want to pin important discussions or teacher answers at the top **so that** they don't get buried.
  - Example: Pin a discussion about common misconception: "Perbedaan antara correlasi dan kausalitas" (pin if 10+ students asked).

- **US10:** As a teacher, I want to delete off-topic or inappropriate discussions **so that** forum stays focused.

- **US11:** As a teacher, I want to see discussion metrics (which topics asked most, which students contribute most) **so that** I can adjust pedagogy and recognize student contributions.

---

## 5. Requirements

### P0 — Must Have

| #   | Requirement                          | Acceptance Criteria (Given/When/Then)                                                                                                                                                                                             |
| --- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Discussion Forum per Course**      | Given student viewing a course, When clicking "Diskusi" tab, Then forum loads with list of discussions created in that course.                                                                                                    |
| 2   | **Create Discussion (Post)**         | Given student on course forum, When clicking "Buat Diskusi", Then form opens with: Title (required), Content (required, rich-text basic formatting), optional tags. On submit, discussion created + visible to all class members. |
| 3   | **Discussion List (Pagination)**     | Given forum with 100+ discussions, When loading, Then display 20 per page + sorting options (newest, oldest, most-replied) + search bar.                                                                                          |
| 4   | **Reply to Discussion**              | Given discussion open, When clicking "Balas", Then comment form appears. On submit, reply stored, notification sent to original poster (if enabled).                                                                              |
| 5   | **Edit/Delete Own Post**             | Given student viewing their own discussion/reply, When clicking "Edit" or "Hapus", Then allow edit (within 1 hour of creation) or soft-delete (show "[Dihapus]" placeholder).                                                     |
| 6   | **Teacher Pin/Unpin**                | Given teacher viewing discussion, When clicking "Pin" button, Then discussion moves to top of course forum. Max 5 pinned.                                                                                                         |
| 7   | **Teacher Mark as Solved**           | Given teacher viewing discussion, When clicking "Tandai Terjawab" button, Then green checkmark appears + discussion highlights differently in list (signal to class this is official answer).                                     |
| 8   | **Teacher Delete Discussion**        | Given teacher on discussion, When clicking "Hapus", Then confirmation dialog appears. On confirm, soft-delete, show "[Dihapus oleh guru]" + hide from general list but keep in reports.                                           |
| 9   | **Course Isolation (RLS)**           | Given student enrolled in Course A only, When viewing Course A forum, Then see only discussions from Course A (not other courses). Enforce via RLS on `discussions` table.                                                        |
| 10  | **Discussion Notification (In-App)** | Given someone replies to a discussion user started, When reply is created, Then notification appears in user's notification bell (integrates with notifications module).                                                          |
| 11  | **Mobile Responsive**                | Given student on mobile viewing discussion, When opening thread, Then text is readable (font size ≥14px), reply box doesn't hide keyboard, minimal scroll.                                                                        |
| 12  | **Rich Text Editor (Basic)**         | Given student creating discussion, When clicking in content field, Then markdown or simple bold/italic/link buttons appear (not full WYSIWYG, keep light).                                                                        |
| 13  | **Search Discussions**               | Given student on course forum, When typing in search box, Then discussions filtered by keyword in title + content + name, results live-update.                                                                                    |

### P1 — Nice to Have

| #   | Requirement                    | Notes                                                                                                                          |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Discussion Tags/Categories** | Student/teacher tag discussions (Konsep, Soal, Bug in textbook, Meta). Filter by tag on forum. Improves organization.          |
| 2   | **Sort by Most Helpful**       | Teacher can "star" or rate replies as "most helpful", that reply bubbles up for others.                                        |
| 3   | **Discussion Subscription**    | Student can "follow" a discussion to get notifications on all new replies (not just their own threads).                        |
| 4   | **Teacher Insights Dashboard** | Teacher dashboard: top 10 discussion topics per lesson, % student participation, response time stats.                          |
| 5   | **Mention (@mention)**         | Student can mention teacher or peer: "@Bu Ani, apakah ini benar?" → notify mentioned user. Requires careful anti-abuse design. |
| 6   | **Quoted Replies**             | Replying to a discussion shows a quote of parent comment, for clarity in long threads.                                         |
| 7   | **Spam/Abuse Flagging**        | Student/teacher can flag inappropriate reply. Flagged items reviewed by admin.                                                 |

### P2 — Future Considerations

| #   | Consideration                     | Reasoning                                                                                            |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | **AI Moderation**                 | Auto-detect off-topic, spam, or inappropriate language. ML-based classification.                     |
| 2   | **Reputation/Badges**             | Student who answer correctly get "Expert" badge, encourage peer tutoring. Gamification.              |
| 3   | **Nested Threads (Reddit-style)** | Allow replies-to-replies, build discussion trees. Complex UI, especially on mobile.                  |
| 4   | **Discussion Analytics Export**   | Teacher download all discussions + replies as CSV for qualitative analysis (misconception patterns). |
| 5   | **General School Forum**          | Discussions across all courses (school-wide Q&A). v1 is per-course only.                             |
| 6   | **Real-Time Presence**            | Show "X users viewing" or typing indicators. Requires WebSocket, not just REST.                      |

---

## 6. Success Metrics

### Leading Indicators (Hari–Minggu)

- **Discussion Creation Rate:** # discussions created per course per week. **Target:** 5–8 per class (mix of student + teacher-initiated).
  - **Cara Ukur:** `SELECT COUNT(*) FROM discussions WHERE course_id = X AND created_at > NOW() - INTERVAL '7 days'`

- **Participation Rate:** % of students who create or reply to at least 1 discussion per term. **Target:** 80%.
  - **Cara Ukur:** `COUNT(DISTINCT users in discussions/replies) / total_enrolled_students`

- **Reply Rate (Latency):** Avg hours from discussion posted to first reply. **Target:** <12h (within same day or next morning).
  - **Cara Ukur:** `AVG(first_reply_timestamp - discussion_created_at) per discussion`

- **Teacher Moderation Latency:** Avg hours from off-topic/spam discussion to teacher delete. **Target:** <24h.
  - **Cara Ukur:** `AVG(deleted_at - created_at) for teacher-deleted discussions`

### Lagging Indicators (Minggu–Bulan)

- **Soft Student Engagement:** % of "shy" or low-hand-raise students who participate in discussions. **Target:** 65%+ (tracked via teacher observation or self-report).
  - **Cara Ukur:** Pre-launch survey: which students rarely raised hand → track discussion activity post-launch.

- **Reduced Teacher Message Load:** % reduction in 1-on-1 student questions via email/message post-launch. **Target:** 35% reduction.
  - **Cara Ukur:** Teacher self-report or message log analysis.

- **Knowledge Retention (Institutional):** # "duplicate" discussions (same question asked again next term). **Target:** <10% (means forum is discoverable/searchable).
  - **Cara Ukur:** Teacher identify repeat questions, check if searchable version existed.

- **Forum Vibrancy Score:** Custom metric combining creation rate, reply rate, and teacher participation. **Target:** Score 7/10 by month 3.

---

## 7. Open Questions

| #   | Pertanyaan                                                                 | Owner                 | Blocking?                                            |
| --- | -------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------- |
| 1   | Rich-text editor scope — markdown only, or WYSIWYG with image embed?       | Design/UX             | Ya                                                   |
| 2   | Who can create discussions — students + teachers, or students only?        | Product/Pedagogy      | Ya                                                   |
| 3   | Can teacher moderate before discussions appear (queue), or always visible? | Product               | Tidak (v1 is visible, v1.1 can add moderation queue) |
| 4   | Max discussion title length, content length?                               | Engineering           | Tidak (reasonable defaults OK)                       |
| 5   | Discussion notification — email digest or in-app only?                     | Product/Notifications | Ya (coordinate w/ notifications team)                |
| 6   | Can discussions be in lessons or only course-level?                        | Product/Pedagogy      | Tidak (v1 is course-level, lesson-level v2)          |

---

## 8. Timeline & Phases

### Phase 1: MVP (1.5 minggu)

- **Week 1 (3 hari):** Design forum UI, implement discussions CRUD, RLS by course + role.
- **Week 1 (2 hari):** Replies, edit/delete, teacher pin/mark-solved, search.
- **Week 2 (2 hari):** Notifications integration, mobile testing, pagination.

### Phase 2: Polish + Launch (3 hari)

- User testing, analytics integration, teacher feedback, A/B test forum layout.
- Launch to all schools.

### Phase 3: P1 Features (v1.1, 1 minggu later)

- Tags, teacher insights dashboard, abuse flagging, @mentions.

**Hard Deadline:** Ship MVP to beta courses by EOD April (week 2 of dev).

---

## 9. Dependensi & Risiko

### Technical Dependencies

1. **Database tables:** `discussions`, `discussion_comments` (both NEW).
2. **RLS Policies:** Isolate by `tenant_id` + `course_id` + `enrollments` (only enrolled students see).
3. **Notifications:** Reply notifications depend on `notifications` module (already exists, just integrate).
4. **Search:** Course discussions search may require full-text index on `discussions.title` + `discussions.content`.

### Schema Design

```sql
-- Table: discussions
CREATE TABLE discussions (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  course_id UUID REFERENCES courses(id),
  created_by UUID REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- markdown or HTML
  pinned BOOLEAN DEFAULT false,
  solved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- soft delete
  CONSTRAINT rls_tenant CHECK (tenant_id = (SELECT get_my_tenant_id()))
);

-- Table: discussion_comments
CREATE TABLE discussion_comments (
  id UUID PRIMARY KEY,
  discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- soft delete
);

-- Indexes for performance
CREATE INDEX idx_discussions_course_id ON discussions(course_id);
CREATE INDEX idx_discussions_created_at ON discussions(created_at DESC);
CREATE INDEX idx_discussion_comments_discussion_id ON discussion_comments(discussion_id);
```

### Integration Points

- **Courses Table:** Already exists, discussions linked by `course_id`.
- **Users Table:** Already exists, `discussions.created_by` + `discussion_comments.created_by`.
- **Enrollments Table:** Already exists, RLS checks if user enrolled in course before showing discussions.
- **Notifications:** Integrate with `notifications` table to send notification when reply posted.

### Risks & Mitigations

| Risk                                                        | Impact                                   | Mitigation                                                                                                                |
| ----------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Spam/off-topic discussions overwhelm forum                  | Forum becomes noise, students lose trust | Rate limit per user (max 5 discussions/day), teacher moderation queue (v1.1), flag abuse system.                          |
| Student posts personally identifying info or sensitive data | Privacy violation, bullying risk         | Warn students "Don't post personal info" in UI, teacher can delete sensitive posts immediately, audit trail.              |
| Shy students still don't participate (cultural inertia)     | Feature adoption low                     | Teacher encouragement, grade/XP incentive for participation (v1.1), model good discussion in class.                       |
| Search slow with 10k+ discussions per course                | Poor UX                                  | Paginate results, full-text index, consider ElasticSearch if performance issues (v2).                                     |
| Incorrect teacher responses not corrected                   | Student learns wrong info                | Teacher train on marking official answers, peer reply-correction, student upvote-helpful to bubble correct answer (v1.1). |
| Notification spam (reply to every discussion)               | Students disable notifications           | Smart notification: only notify if user created discussion or replied in thread (not all course discussions).             |

### Edge Cases to Test

1. **Discussion with 500+ replies:** Paginate replies, load in batches, don't load all at once.
2. **Student deletes account:** Orphaned discussions/replies. Handle by showing "[User dihapus]" instead of real name, preserve content for learning.
3. **Teacher marks discussion solved, then new reply added:** Do they get notified? Who's responsible for resolving follow-ups?
4. **Student edits discussion title/content after replies:** Replies suddenly out of context. Allow edit but show "[Diedit]" timestamp + original text in edit history (v1.1).
5. **Course is archived:** Should discussions still be readable? Yes, for reference, but not create new discussions.
6. **Concurrent edits:** Two students edit same discussion rapidly. Last edit wins (optimistic locking not needed for MVP).
