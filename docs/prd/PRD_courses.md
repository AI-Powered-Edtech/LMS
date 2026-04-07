# PRD — Courses (Kursus)

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Live
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/courses/`

---

## 1. Problem Statement

Guru Indonesia memerlukan platform untuk membuat, mengelola, dan membagikan materi pembelajaran dalam bentuk kursus yang terstruktur. Saat ini, proses pembuatan kursus memerlukan banyak langkah manual, dan tidak ada cara yang intuitif untuk melacak kemajuan siswa per kursus. Kompetitor seperti Ruangguru dan Zenius menyediakan katalog kursus yang baik, namun EduSync perlu menghadirkan **pembuat kursus (course builder) yang intuitif tanpa memerlukan coding**.

Masalah utama:

- **Guru:** Sulit membuat struktur kursus dengan modul dan pelajaran; tidak ada dashboard untuk melihat kesehatan kursus (enrollment, completion rate, avg score).
- **Siswa:** Kesulitan menemukan kursus yang relevan; tidak jelas progress mereka per kursus; tidak ada rekomendasi personal.
- **Admin:** Tidak bisa audit kualitas kursus atau enforce content standards per sekolah.

---

## 2. Goals

1. **Memberdayakan Guru:** Guru dapat membuat kursus dengan drag-and-drop module builder, setup enrollment policies, dan monitor kinerja kursus real-time.
2. **Meningkatkan Discovery:** Siswa dapat menemukan dan browse kursus dengan filter (subject, level, rating), serta lihat preview sebelum enroll.
3. **Tracking Transparent:** Sistem otomatis melacak progress siswa per course dengan milestone dan completion certificates.
4. **Monetization-Ready:** Admin dapat set course pricing (saat ini gratis, tapi infrastructure siap untuk PPP payment).
5. **Content Quality:** Admin dapat review dan approve kursus sebelum publish; enforce course structure template.

---

## 3. Non-Goals

1. **Course Marketplace (v1)** — Fitur jual-beli kursus antar guru; deferred ke Phase 6 (requires payment gateway upgrade).
2. **Advanced Course Sequencing** — Prerequisite courses, branching paths; terlalu complex untuk v1, deferred.
3. **Live Classes Integration** — Sinkronisasi dengan Zoom/Google Meet; requires Edge Function baru, defer ke v2.
4. **Bulk Course Import/Export** — CSV/PDF export dan import; nice-to-have, not blocking launch.
5. **Mobile App Support** — Course builder desktop-first; mobile siswa just browse/enroll, don't build.

---

## 4. User Stories

### Untuk Guru (Teacher)

- **US-C1:** Sebagai guru, saya ingin membuat kursus baru dengan judul, deskripsi, cover image, dan level kesulitan (SD/SMP/SMA), sehingga saya dapat mulai membangun materi.
  - Acceptance: Form modal dengan preview cover; auto-generate slug; status default = draft; created_by diset dari auth user.

- **US-C2:** Sebagai guru, saya ingin menambah modul (modules) ke dalam kursus dan mengatur urutannya dengan drag-and-drop, sehingga materi terstruktur dengan baik.
  - Acceptance: Sidebar module list dengan drag-handle; auto-reorder field `order`; real-time persisten ke DB.

- **US-C3:** Sebagai guru, saya ingin menambah pelajaran (lessons) ke dalam modul dengan konten article, video, atau embedded quiz, sehingga siswa dapat belajar.
  - Acceptance: Lesson form dengan block editor (article, video, quiz); autosave content; preview before publish.

- **US-C4:** Sebagai guru, saya ingin publish kursus ke siswa dan set siapa saja yang bisa enroll (public/class-only/passcode).
  - Acceptance: Publish modal; set enrollment policy; generate shareable link atau passcode; status → published.

- **US-C5:** Sebagai guru, saya ingin melihat dashboard kursus dengan statistik (enrollment count, completion rate, avg quiz score, time-to-complete), sehingga saya tahu kualitas kursus saya.
  - Acceptance: Course stats card dengan 4–6 KPI utama; re-calculated setiap 5 menit via pg_cron atau on-demand; chart enrollment over time.

- **US-C6:** Sebagai guru, saya ingin archive kursus lama tanpa menghapus data siswa, sehingga tidak berantakan di katalog.
  - Acceptance: Soft-delete; status = 'archived'; tidak muncul di student browse list; teacher bisa restore.

### Untuk Siswa (Student)

- **US-S1:** Sebagai siswa, saya ingin browse katalog kursus per subject/level dan lihat rating + review dari siswa lain, sehingga saya bisa choose kursus terbaik.
  - Acceptance: Course grid/list view; filter by subject, level, rating; sort by popularity/newest/rating; pagination.

- **US-S2:** Sebagai siswa, saya ingin melihat preview kursus (description, modules count, duration estimate, first lesson sample) sebelum enroll.
  - Acceptance: Course detail modal/page; show 1–2 free preview lessons; show total modules; estimated time-to-complete.

- **US-S3:** Sebagai siswa, saya ingin enroll kursus (public atau pakai passcode) dan mulai belajar, sehingga saya bisa track progress.
  - Acceptance: Enroll button → create enrollment record; redirect ke first lesson; progress bar per course appear.

- **US-S4:** Sebagai siswa, saya ingin lihat progress kursus saya (% completion, modules completed, last accessed, next task).
  - Acceptance: Course progress card di dashboard; show per-module progress; "Continue Learning" button ke last lesson.

- **US-S5:** Sebagai siswa, saya ingin menerima certificate saat saya complete 100% kursus (semua pelajaran + quiz passed).
  - Acceptance: Auto-trigger certificate generation; downloadable PDF; shareable link; add ke portfolio.

### Untuk Admin Sekolah (Admin)

- **US-A1:** Sebagai admin, saya ingin lihat semua kursus di sekolah saya (dengan status approval) dan approve/reject sebelum published.
  - Acceptance: Admin dashboard list semua courses; filter by status (draft/pending/approved/published); bulk approve action.

- **US-A2:** Sebagai admin, saya ingin enforce course content standards (min 3 modules, max 5 MB per video) dan reject courses yang tidak sesuai.
  - Acceptance: Auto-validation saat publish; return error message ke guru; show hints untuk fix.

---

## 5. Requirements

### P0 — Must Have

| #   | Requirement                  | Acceptance Criteria                                                                                                                                                         |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Course Create/Edit**       | Form dengan fields: title, description, cover image, subject, level, status. Auto-generate slug & ID. Cover image upload to Supabase Storage (`/courses/{courseId}/cover`). |
| 2   | **Module Management**        | Add/edit/delete modules. Drag-drop reorder dengan auto-update `course_modules."order"` field. Show lesson count per module.                                                 |
| 3   | **Lesson Integration**       | Lessons belong to modules. Lessons have `type` (article/video/quiz), `"order"`, and lesson_resources. Block editor for content.                                             |
| 4   | **Course Publish Workflow**  | Draft → Pending (optional approval) → Published. Toggle publish button; set enrollment_policy (public/class_only/passcode).                                                 |
| 5   | **Course Enrollment**        | Students can enroll via public link, class roster, or passcode. Create enrollment record with `user_id`, `course_id`, `enrolled_at`, `completed_at`.                        |
| 6   | **Progress Tracking**        | Auto-calculate course progress = (lessons_completed / total_lessons) × 100. Update per-lesson completion. Show on student dashboard.                                        |
| 7   | **Course Stats API**         | RPC `v1_get_course_stats(p_course_id)` returns: enrollment_count, completion_rate, avg_quiz_score, total_time_spent. Cache in `course_stats` table, refresh every 5 min.    |
| 8   | **Course Catalog (Student)** | Browse courses page; filter by subject/level; sort by rating/popularity/newest. Paginate 12 per page. Search by title.                                                      |
| 9   | **Course Detail Page**       | Show course info, module list with lesson count, estimated duration, teacher name, enrollment count, avg rating. Preview 1 free lesson.                                     |
| 10  | **RLS & Multi-Tenant**       | All courses scoped to tenant_id. Teachers can only edit own courses. Students can only see enrolled or public courses. Admin can see all.                                   |
| 11  | **Dark Mode**                | All new components support dark mode with `dark:` Tailwind variants. Test with `class="dark"` on html.                                                                      |
| 12  | **Responsive Design**        | Course grid responsive on mobile (1-2 cols); builder responsive (sidebar collapse on mobile).                                                                               |
| 13  | **Documentation**            | Update `docs/DATABASE_ARCHITECTURE.md` with course schema; create `src/features/courses/README.md` with API reference.                                                      |

### P1 — Nice to Have

| #   | Requirement                | Reasoning                                                                                                |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | **Course Templates**       | Pre-built course templates (Math 101, Biology 10, etc.) to speed up teacher onboarding.                  |
| 2   | **Bulk Student Enroll**    | Admin upload CSV of student emails to auto-enroll into course (vs manual one-by-one).                    |
| 3   | **Course Rating & Review** | Students rate/review courses (1-5 stars + text comment) visible on course detail. Avg rating on catalog. |
| 4   | **Estimated Duration**     | Auto-calc time-to-complete based on avg lesson duration + quiz duration. Show on catalog + detail.       |
| 5   | **Course Announcements**   | Teachers post announcements scoped to a course (like class_announcements). Show in course header.        |
| 6   | **Archive & Restore**      | Teachers soft-delete (archive) courses; admin can bulk restore. Archived courses show 0 enrollments.     |

### P2 — Future Considerations

| #   | Item                             | Reasoning                                                                                                   |
| --- | -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | **Course Prerequisites**         | Allow course A to require completion of course B. Deferred: adds complex enrollment logic.                  |
| 2   | **Course Marketplace & Payment** | Buy/sell courses; Stripe integration. Deferred: requires payment gateway, tax handling, payouts (Phase 6).  |
| 3   | **Live Class Sessions**          | Zoom/Google Meet integration inside courses. Deferred: requires RTC, recording, playback.                   |
| 4   | **Course Cloning**               | Teachers clone existing courses (own or public templates). Deferred: data duplication logic complex.        |
| 5   | **Advanced Analytics**           | Dropout analysis, student cohort comparison, A/B testing course structure. Deferred: data science pipeline. |

---

## 6. Success Metrics

### Leading Indicators (hari–minggu)

| Metric                                  | Target                                                        | Cara Ukur                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Guru Course Creation Rate**           | 80% of active teachers create ≥1 course within 4 weeks        | Measure via `courses` table row count by `created_at` date; survey 10 teachers.                             |
| **Course Builder Completion Time**      | Guru dapat buat course (3 modules, 6 lessons) dalam <30 menit | Usability test dengan 5 guru; time each step; identify bottlenecks.                                         |
| **Student Browse-to-Enroll Conversion** | 40% of students who view course detail enroll                 | `SELECT COUNT(*) WHERE view_event_type='course_detail' AND subsequent_event='enroll'` / total detail views. |
| **Module Order Persistence**            | 100% of drag-drop reorders save correctly                     | QA test 20 reorder sequences; verify DB `course_modules."order"` matches UI order.                          |
| **Course Publish Success Rate**         | 95% of courses pass validation on first attempt               | Count `courses.status='published'` / attempted publishes (via logs).                                        |

### Lagging Indicators (minggu–bulan)

| Metric                            | Target                                    | Cara Ukur                                                                           |
| --------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------- |
| **Active Course Enrollment**      | 500+ active course enrollments by month 2 | Unique `(user_id, course_id)` pairs in `enrollments` per month.                     |
| **Course Completion Rate**        | 30% of students complete enrolled course  | `SELECT COUNT(DISTINCT user_id) WHERE course_progress >= 100` / active enrollments. |
| **Avg Time-to-Complete**          | 8–12 hours per course                     | Aggregate `student_lesson_signals.total_time_spent` per course.                     |
| **Teacher Course Quality (NPS)**  | 7.0+ average rating from teacher survey   | "How satisfied are you with the course builder?" (1-10 Likert).                     |
| **Student Course Satisfaction**   | 4.0+ avg rating on 5-star scale           | Course review aggregate from P1 rating feature.                                     |
| **Performance: Course List Page** | Load <2 sec (p50), <5 sec (p95)           | Monitor Core Web Vitals; set budget in build pipeline.                              |

---

## 7. Open Questions

| #   | Pertanyaan                                                                                            | Owner       | Blocking?                                                          |
| --- | ----------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------ |
| 1   | Should course pricing (PPP) be built in v1, or stub out RPC/columns for future?                       | Product     | Tidak — stub is OK, data model ready.                              |
| 2   | Do we require course approval workflow by admin, or auto-publish on draft→publish?                    | Product     | Tidak — v1 auto-publish; approval in P1.                           |
| 3   | Should lessons be copyable across courses (reuse content)?                                            | Engineering | Tidak — v1 no copy; think about FK design.                         |
| 4   | Max file size per course cover & video? Compression strategy?                                         | Engineering | Tidak — use Supabase Storage defaults; optimize in v2.             |
| 5   | Bagaimana menangani course dengan siswa sudah enroll, saat guru delete? Soft-delete atau hard-delete? | Engineering | Tidak — soft-delete (status=archived); RLS hides from draft query. |
| 6   | Support for course co-teachers (multiple teachers per course)?                                        | Product     | Tidak — v1 owner only; P1 feature.                                 |

---

## 8. Timeline & Phases

### Phase 1: Foundation (Week 1–2)

- [x] Database schema finalized (`courses`, `course_modules`, `lessons`, `enrollments`, `course_stats`)
- [ ] RLS policies + RPC foundation (`v1_get_course_stats`)
- [ ] Teacher course builder UI skeleton (module list, lesson form)

### Phase 2: Core Teacher Features (Week 3–4)

- [ ] Course CRUD (create, edit, publish, archive)
- [ ] Module management (add, reorder, delete)
- [ ] Lesson editor with block support (article, video, quiz embed)
- [ ] Enrollment policy setup (public/class_only/passcode)

### Phase 3: Student Enrollment & Tracking (Week 5–6)

- [ ] Course catalog browse + filter
- [ ] Course detail page + preview
- [ ] Enroll flow (public + passcode)
- [ ] Progress tracking (auto-calculate completion %)
- [ ] Course dashboard card (continue learning)

### Phase 4: Stats & Polish (Week 7–8)

- [ ] Course stats dashboard (for teachers)
- [ ] Certificate generation (Supabase Functions)
- [ ] Dark mode audit + responsive fix
- [ ] Documentation + testing

### Phase 5: Launch Prep (Week 9)

- [ ] Performance audit (course list load time)
- [ ] Security review (RLS + tenant isolation)
- [ ] UAT with 3–5 teacher + 10 student beta users
- [ ] Soft launch to 1 school

---

## 9. Dependensi & Risiko

### Dependensi

| Dependensi                          | Status  | Impact                                                         |
| ----------------------------------- | ------- | -------------------------------------------------------------- |
| Supabase Auth & RLS ready           | ✅ Live | Blocking if not; needed for user identity + multi-tenant.      |
| React Query v5 (server state)       | ✅ Live | No new deps needed; use existing hook pattern.                 |
| Lesson module finalized             | ✅ Live | Courses contain lessons; lesson schema must be stable.         |
| Quiz RPC (`v1_submit_quiz_attempt`) | ✅ Live | Course lesson-embedded quizzes must work; already implemented. |
| Storage bucket configured           | ✅ Live | Course cover images need `/courses/{courseId}/cover` bucket.   |

### Risiko & Mitigasi

| Risiko                                                                                                    | Severity | Mitigasi                                                                       |
| --------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| **Course builder performance** — Module reorder triggers too many DB writes, UI lags.                     | Medium   | Debounce reorder writes (500ms); batch update all orders in single RPC call.   |
| **Progress tracking race condition** — Concurrent lesson complete events update progress inconsistently.  | Medium   | Use DB triggers + atomic increment on `course_progress.completion_percentage`. |
| **Enrollment explosion** — If course goes viral, enrollment table grows large; queries slow.              | Low      | Index on `(course_id, user_id)`; paginate enrollment list queries.             |
| **Teacher overwrites module** — Two teachers editing same course concurrently; last-write-wins data loss. | Low      | Add optimistic locking (version field) or real-time conflict detection.        |
| **Mobile builder UX** — Drag-drop reorder poor on mobile; builder not usable on phone.                    | Medium   | v1 desktop-only builder; add note "use desktop"; mobile can view-only.         |
| **Missing course struct validation** — Teachers publish course with 0 modules; looks broken to students.  | Low      | Enforce min 1 module + 1 lesson before publish; return validation error.       |

---

## 10. Acceptance Criteria for V1 Launch

**Teacher:**

- [ ] Can create course with title, description, cover image
- [ ] Can add 3+ modules and 5+ lessons to course
- [ ] Can publish course; students see it in catalog
- [ ] Can view course stats (enrollment, completion %, avg score)
- [ ] Can archive course without losing student data

**Student:**

- [ ] Can browse 50+ courses with filtering + search
- [ ] Can enroll in course (public link or passcode)
- [ ] Can see progress bar per course
- [ ] Can resume lesson from "last accessed"
- [ ] Receive certificate on 100% completion

**Admin:**

- [ ] Can see all courses by all teachers
- [ ] Can view course quality metrics (enforcement of min modules)
- [ ] Can bulk-approve courses for publish

**Technical:**

- [ ] RLS enforces tenant isolation (no data leakage)
- [ ] Course list page loads <2 sec (p50)
- [ ] No N+1 queries; pagination on all lists
- [ ] Dark mode working on all new components
- [ ] Documentation updated (`docs/DATABASE_ARCHITECTURE.md`, feature README)

---

## 11. Implementation Notes for Engineers

### Database Gotchas

- `course_modules."order"` — Must quote `order` (SQL reserved word) in all queries.
- `lessons."order"` — Same as above; quote in SELECT, UPDATE, etc.
- `courses.status` — Use `'published'`, `'draft'`, `'archived'`; NO `is_published` column.
- `enrollments.user_id` — NOT `student_id`.

### RPC Pattern

```sql
-- Example: Get course stats
CREATE OR REPLACE FUNCTION v1_get_course_stats(p_course_id UUID)
RETURNS TABLE (enrollment_count INT, completion_rate FLOAT, avg_score FLOAT, total_time_spent INT)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    COUNT(DISTINCT e.user_id),
    AVG(CASE WHEN cp.completion_percentage = 100 THEN 1 ELSE 0 END) * 100,
    AVG(s.latest_quiz_score),
    SUM(s.total_time_spent)
  FROM enrollments e
  LEFT JOIN course_progress cp ON e.user_id = cp.user_id AND e.course_id = cp.course_id
  LEFT JOIN student_lesson_signals s ON e.user_id = s.user_id
  WHERE e.course_id = p_course_id AND e.tenant_id = (SELECT get_my_tenant_id());
$$;
```

### Feature Module Structure

```
src/features/courses/
├── api/
│   ├── courseService.ts
│   └── builder/
│       ├── courseService.ts
│       ├── moduleService.ts
│       └── lessonService.ts
├── queries/
│   ├── courseKeys.ts
│   └── courseQueries.ts
├── hooks/
│   ├── useCourse.ts
│   └── useCourseBuilder.ts
├── types/
│   └── index.ts
├── components/
│   ├── CourseCard.tsx
│   ├── CourseList.tsx
│   ├── CourseBuilder.tsx
│   ├── ModuleEditor.tsx
│   └── LessonEditor.tsx
├── __tests__/
│   └── courseService.test.ts
└── README.md
```

### Route Structure

- **Student:** `/#/app/student/courses` — browse catalog
- **Student:** `/#/app/student/courses/{courseId}` — course detail + enroll
- **Student:** `/#/app/student/courses/{courseId}/learn` — course player
- **Teacher:** `/#/app/teacher/course-builder` — list my courses
- **Teacher:** `/#/app/teacher/course-builder?courseId={id}` — edit course
- **Admin:** `/#/app/admin/courses` — manage all courses

---

## Glossary

| Term                         | Definisi                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| **Kursus (Course)**          | Koleksi terstruktur dari materi pembelajaran, terdiri dari modul dan pelajaran.              |
| **Modul (Module)**           | Grup logis dari pelajaran dalam kursus (misal: "Bab 1: Pengenalan", "Bab 2: Konsep Lanjut"). |
| **Pelajaran (Lesson)**       | Unit terkecil pembelajaran; bisa article, video, atau embedded quiz.                         |
| **Enrollment**               | Catatan siswa "mengikuti" kursus tertentu; mulai track progress.                             |
| **Progress**                 | Persentase completion kursus = (lessons_completed / total_lessons) × 100.                    |
| **Draft/Published/Archived** | Status kursus; hanya Published visible ke students.                                          |
| **Enrollment Policy**        | Rule tentang siapa bisa enroll: public (semua), class_only (roster), passcode (invite link). |
| **RLS (Row-Level Security)** | PostgreSQL policy yang restrict queries per tenant; core security model.                     |
