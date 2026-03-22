# PRD — Classroom (Kelas)

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Draft
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/classroom/`

---

## 1. Problem Statement

Di Indonesia, guru mengajar kelas fisik dengan daftar siswa yang sudah ada. Namun, ketika guru ingin menggunakan EduSync, mereka perlu:

1. Create kelas digital yang mirror kelas fisik
2. Add siswa ke kelas (satu per satu atau bulk import — manual & tedious)
3. Manage siapa yang bisa akses apa dalam konteks kelas ini

Saat ini, siswa hanya bisa enroll di courses secara umum (tenant-wide). Ada kebutuhan untuk **kelas-specific enrollment** — guru create kelas, share join code, siswa join dengan code. Ini menciptakan:

- **Kelas sebagai unit organisasi** (analogous dengan classroom fisik)
- **Roster management** (guru lihat siapa aja di kelas, bisa kick/unenroll)
- **Class-scoped deadlines** (kelas A ujian hari Jum'at, kelas B hari Sabtu)
- **Class announcements** (guru announce sesuatu ke kelas tertentu, bukan semua siswa)

**Dampak Saat Ini:** Guru tidak bisa set different deadlines per-class, all announcements broadcast to entire school. Confusion untuk siswa (mana tugasku?). No roster visibility.

**Cost of Not Solving:** Guru bottleneck, students confused about assignments, no classroom isolation (siswa lain bisa lihat semua).

---

## 2. Goals

1. **Class Creation & Management**: Guru bisa create kelas, set kelas name/description, link ke courses, set kelas schedule/periods.
2. **Join Code System**: Guru generate unique join code untuk setiap kelas. Siswa join dengan code (no admin approval needed). Code expires after date or max uses.
3. **Roster Management**: Guru lihat all roster members, klik to view student progress, kick/unenroll, export roster as CSV.
4. **Class Announcements**: Guru bisa announce sesuatu scoped to class (vs. tenant-wide).
5. **Class-Scoped Deadlines**: Assignments/quizzes linked to class (not just course) can have class-specific deadlines.
6. **Class Schedule**: Guru set class periods/schedule (e.g., Senin 10:00-11:00, Rabu 14:00-15:00) — informational, used for analytics + calendar sync.

---

## 3. Non-Goals

- **Automatic Roll Call / Attendance Tracking**: v1 tidak ada attendance feature (live check-in, etc.). Manual tracking only.
- **Class Grouping / Nested Classes**: v1 tidak ada sub-groups atau lab/practical classes. One class level only.
- **Seating Arrangement / Classroom Maps**: v1 tidak ada physical seating arrangement feature.
- **Class Invitations**: v1 tidak ada formal invitation (teacher sends email to student). Only join code.
- **Permission Hierarchy**: v1 tidak ada "teaching assistants" atau co-teachers. One teacher per class.
- **Class Gradebook**: v1 tidak ada integrated gradebook per class. Grades live in assignments/quizzes.
- **Parent/Guardian Access**: v1 tidak ada parent portal to view child's class. Future enhancement.

---

## 4. User Stories

### Untuk Guru

- As a teacher, I want to create a class and set its name, description, and linked course so that I can organize my teaching.
- As a teacher, I want to generate a unique join code for my class so that students can easily join without admin help.
- As a teacher, I want to see my class roster (list of students) and their enrollment status so that I can track who's in my class.
- As a teacher, I want to remove a student from my class so that I can manage enrollment if a student leaves or joins the wrong class.
- As a teacher, I want to set class periods/schedule so that my students know when class meets.
- As a teacher, I want to export my class roster as CSV so that I can use it in my own tools (Excel, etc.).
- As a teacher, I want to view class-specific assignment deadlines and announcements so that I can manage my class separately from others.
- As a teacher, I want to see who hasn't submitted an assignment in my class so that I can follow up with students.

### Untuk Siswa

- As a student, I want to join a class using a join code so that I can enroll without asking the teacher to add me.
- As a student, I want to see which classes I'm enrolled in so that I know where to find my assignments.
- As a student, I want to leave a class so that I can unenroll if I'm in the wrong class.
- As a student, I want to view class-specific announcements so that I know what the teacher is telling my class.
- As a student, I want to see class deadlines so that I know when assignments are due for each class.

### Untuk Admin

- As an admin, I want to view all classes in my school so that I can monitor classroom activity.
- As an admin, I want to archive/disable a class so that it doesn't clutter the interface.
- As an admin, I want to see teacher-class assignments so that I can audit who teaches what.

---

## 5. Requirements

### P0 — Must Have

| Requirement                   | Acceptance Criteria                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Class CRUD**                | Guru bisa create, read, update, delete kelas. Fields: class_name, description, course_id (FK), teacher_id (auto-set to logged-in teacher), status (active/archived), created_at, updated_at, tenant_id. Update: change name/description/course. Delete: soft-delete (set status = archived).                                                          |
| **Join Code Generation**      | Guru click "Generate Code" button. System generates random 6-char alphanumeric code (e.g., "ABC123"), stores in `class_join_codes` table. Code is: unique per class, unexpired (set expiration_date or uses_limit), visible to teacher only. Show code in UI: big, copyable, shareable.                                                               |
| **Join Code Expiration**      | Join code has: expiration_date (default: 30 days from now), max_uses (default: unlimited). After expiration or max uses reached, code cannot be used. Expired codes show warning to teacher. Teacher can regenerate new code anytime.                                                                                                                 |
| **Join Class (Student)**      | Student navigates to "Join Class" page, enters code, click "Join". System: validate code (exists, not expired, not max uses), check if student already in class (no duplicate), add to `classroom_members` table (student_id, classroom_id, joined_at, role = "student", tenant_id). Confirm: "Success! Joined [Class Name]". Redirect to class page. |
| **Class Roster**              | Teacher views roster: table with columns: student_name, email, joined_at, status (active/inactive), submission_count (# assignments submitted for this class). Sortable, searchable. Button to remove/unenroll.                                                                                                                                       |
| **Unenroll Student**          | Teacher click "Remove" on roster item. Confirm dialog: "Remove [Student] from [Class]?" On confirm, delete from `classroom_members`. Student receives notification (optional: "You've been removed from [Class]").                                                                                                                                    |
| **Class List (Student View)** | Student sees list of classes they're enrolled in: card view or table. Each class shows: class_name, teacher_name, course_name, # of assignments, next deadline, leave button.                                                                                                                                                                         |
| **Leave Class**               | Student click "Leave" on their class. Confirm dialog. On confirm, delete from `classroom_members`. Student no longer sees class.                                                                                                                                                                                                                      |
| **Class Schedule**            | Teacher can set class periods (optional). Fields: day of week (Mon-Sun), start_time (HH:MM), end_time (HH:MM). Multiple periods per class (e.g., same class meets Mon & Wed). Store in `class_schedules` table. Display in class detail (informational).                                                                                              |
| **Class Announcements**       | Teacher can create announcement scoped to class. Fields: title, content. Announcement visible only to students in this class. Store in `class_announcements` table. Student sees announcement on class page + in notification feed.                                                                                                                   |
| **Roster Export (CSV)**       | Teacher click "Export Roster" button. System generates CSV: student*name, email, joined_at. Download as "ClassRoster*[ClassName]\_[Date].csv".                                                                                                                                                                                                        |
| **Dark Mode Support**         | All components have dark: variants. Test at class="dark".                                                                                                                                                                                                                                                                                             |
| **Mobile Responsiveness**     | Class list, roster, join form work on mobile. Stack columns if needed.                                                                                                                                                                                                                                                                                |
| **Error Handling**            | Meaningful errors in Bahasa Indonesia. Examples: "Kode tidak valid atau sudah kadaluarsa", "Anda sudah bergabung dengan kelas ini", "Kelas tidak ditemukan".                                                                                                                                                                                          |

### P1 — Nice to Have

| Requirement               | Notes                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Bulk Invite CSV**       | Teacher upload CSV (email list), system sends invitation links to each student. (Requires email service.) |
| **Class Statistics**      | Teacher dashboard: total students, avg submission rate, avg quiz score, attendance (if implemented).      |
| **Class Duplicate**       | Teacher can duplicate existing class (copy name, settings, schedule). Roster not copied.                  |
| **Bulk Unenroll**         | Teacher select multiple students, unenroll all at once.                                                   |
| **Join Code QR Code**     | Show QR code alongside join code. Student scan with phone to auto-join.                                   |
| **Class Colors/Icons**    | Teacher set custom color or icon for class (emoji picker).                                                |
| **Class Permissions**     | If admin revokes course access for school, auto-archive related classes.                                  |
| **Roster Activity Feed**  | Teacher see recent activity in class: [Student] submitted assignment, [Student] joined, etc.              |
| **Class Archive/Restore** | Teacher archive class (hides from list, but data preserved). Admin can archive/restore.                   |

### P2 — Future Considerations

- **Co-teachers**: Allow multiple teachers per class. (Requires permission model.)
- **Teaching Assistants**: Sub-role with limited permissions (view roster, but not delete).
- **Class Groups**: Organize classes into "Sections" (e.g., "Grade 10" section with 5 classes).
- **Attendance Tracking**: Integrate with live sessions; track who attended class.
- **Class Notes**: Shared note-taking space for class (collaborative doc).
- **Gradebook**: Class-specific gradebook view (all assignments, all students, all grades in one table).
- **Parent Portal**: Parents can see child's class roster, announcements, upcoming deadlines.
- **Late Policy**: Teacher set late submission policy per class (e.g., -5% per day). System auto-apply.

---

## 6. Success Metrics

### Leading Indicators

- **Join Code Usage Rate**: >80% of students join classes via code (vs. admin manually adding). Track: count of self-join enrollments / total enrollments.
- **Class Creation Rate**: >50% of teachers create at least 1 class. Track: count of classes / count of teachers.
- **Roster Accuracy**: <1% discrepancy between roster and actual enrollments (test via audit log). Target: 100% accurate.
- **Announcement Reach**: >60% of students view class announcements (tracked via event). Target: high engagement.

### Lagging Indicators

- **Classroom Adoption**: >80% of enrolled students are in at least 1 class (vs. course-only enrollment). Track: students in classes / total students.
- **Teacher Satisfaction**: Survey teachers: "Classroom management is easier with EduSync." Target: >75% agree/strongly agree.
- **Support Tickets**: Reduction in "How do I add students?" tickets. Baseline: 20 tickets/month → Target: <5/month.
- **Course Enrollment vs Class Enrollment**: Ratio should shift from 100% course-only to 70%+ class-linked. Track: enrollment by type.

---

## 7. Open Questions

| #   | Pertanyaan                                                          | Owner         | Blocking?                                                                      |
| --- | ------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------ |
| 1   | Apakah siswa bisa di multiple classes sekaligus?                    | Product       | Tidak — yes, students can join multiple classes                                |
| 2   | Apakah guru bisa teach multiple classes atau hanya 1?               | Product       | Tidak — can teach multiple classes, no limit                                   |
| 3   | Apakah kelas bisa di-link ke multiple courses atau hanya 1?         | Product       | Ya — clarify data model. Plan: 1 class = 1 course (simpler)                    |
| 4   | Apakah join code case-sensitive? (ABC123 vs abc123)                 | Engineering   | Tidak — case-insensitive untuk UX friendliness                                 |
| 5   | Apakah admin bisa create classes atau hanya teacher?                | Product       | Tidak — only teachers create. Admin can archive/disable.                       |
| 6   | Timezone untuk class schedule: timezone-aware atau just times?      | Engineering   | Tidak — store as time only, interpret in school timezone                       |
| 7   | Apakah deleted class data (members, announcements) bisa di-restore? | Product/Legal | Tidak — soft delete for 30 days, then hard delete. Compliance: log all deletes |

---

## 8. Timeline & Phases

**Phase 1 (Week 1-2): MVP — Class CRUD & Join Code**

- `classrooms`, `classroom_members`, `class_join_codes` tables + RLS
- Class creation form (teacher UI)
- Join code generation + display
- Join class page (student UI)
- Class list (student view)
- Basic roster view (teacher)

**Phase 2 (Week 3-4): Roster Management & Announcements**

- Unenroll/remove student
- Export roster CSV
- Class announcements (create + view)
- Class schedule (create + display)
- Leave class (student)
- Bulk remove (optional)

**Phase 3 (Week 5-6): Polish & Analytics**

- Class statistics dashboard
- Mobile responsiveness testing
- Dark mode support
- Error handling + Bahasa Indonesia
- Performance: <2s load time for roster

**Phase 4 (Week 7-8): Launch & Monitor**

- QA + bug fixes
- Gradual rollout to 3 pilot schools
- Teacher training materials
- Monitor adoption metrics
- Iterate based on feedback

**Hard Deadline**: 2026-05-15 (classroom feature live + 3+ schools actively using)

---

## 9. Dependensi & Risiko

### Technical Dependencies

- `classrooms` table (NEW) — columns: id, name, description, course_id (FK courses), teacher_id (FK profiles), status (active/archived), created_at, updated_at, tenant_id. RLS: visible to users in same classroom or teacher/admin.
- `classroom_members` table (NEW) — columns: id, classroom_id (FK classrooms), user_id (FK profiles), role (student/teacher), joined_at, created_at, tenant_id. RLS: visible to members of same classroom + teacher.
- `class_join_codes` table (NEW) — columns: id, classroom_id (FK classrooms), code (unique string), created_by (FK profiles), created_at, expiration_date, max_uses, uses_count, is_active (boolean). RLS: visible to teacher + admin of tenant.
- `class_schedules` table (NEW) — columns: id, classroom_id (FK classrooms), day_of_week (0-6), start_time (TIME), end_time (TIME), created_at. RLS: visible to members of classroom + teacher.
- `class_announcements` table (NEW) — columns: id, classroom_id (FK classrooms), title, content, created_by (FK profiles), created_at, updated_at, tenant_id. RLS: visible to members of classroom.
- React Query v5 — for query invalidation after enrollment/unenroll.
- Supabase Edge Function (optional) — for generating unique join codes if collision risk.

### Integration Risks

- **Course-Class Mismatch**: If course deleted, related classes are orphaned. Mitigation: Add FK constraint with ON DELETE SET NULL; soft-delete courses.
- **Concurrent Enrollment**: If student A and B try to join same code simultaneously, both succeed (race condition). Mitigation: Add UNIQUE constraint on (classroom_id, user_id) in classroom_members (no duplicates).
- **Join Code Collision**: If code generation not random enough, 2 classrooms get same code. Mitigation: Use UUID + hash suffix (very unlikely collision). Or check DB before returning.
- **Roster Sync**: If teacher edit class in one browser tab, another tab doesn't refresh (stale data). Mitigation: React Query auto-refetch on window focus.
- **Large Roster Load**: 1000+ students per class. Roster page very slow. Mitigation: Paginate (50/page), lazy-load, index on classroom_id.

### Edge Cases

- **Leave Own Class (Teacher)**: If teacher leaves their own class, who's the owner? Mitigation: Prevent teacher from leaving. Or auto-delete class if no teachers left.
- **Expired Code, Student Stuck**: Student gets code, tries to join after 30 days (code expired). Error message unhelpful. Mitigation: Show "Code expired. Ask teacher for new code."
- **Student Removed Mid-Assignment**: Student was in class, submitted assignment, teacher removed them. Assignment submission orphaned. Mitigation: assignment submission linked to student, not classroom membership. Removing from class doesn't delete submissions.
- **Schedule Conflict**: Teacher sets class on Mon 10:00-11:00 and Mon 10:30-11:30 (overlap). Mitigation: No validation in v1; just display warnings to teacher.
- **Join Code Reuse**: Teacher deletes class, creates new class, old join code still in DB pointing to deleted class. Mitigation: Soft delete codes when classroom is archived.

---

## 10. Class Lifecycle & States

```
Created (draft)
  ↓
Active (students can join, view content)
  ↓
[Teacher can edit name/schedule/course]
  ↓
Archived (students can't join new; existing members still see)
  ↓
Deleted (soft: data preserved; hard: deleted after 30 days)
```

**Join Code Lifecycle:**

```
Generated (active, usable)
  ↓
[Uses accumulate]
  ↓
Expired (after expiration_date OR uses_count >= max_uses)
  ↓
Regenerated (teacher creates new code)
  ↓
Superseded (old code disabled when new code generated)
```

---

## 11. UI/UX Flows

**Teacher: Create Class**

```
[Classes] button → [+ Create Class]
→ Form: Name, Description, Course (dropdown), Schedule (optional)
→ [Create]
→ Success toast: "Kelas berhasil dibuat!"
→ Redirect to class page
→ Show "Generate Join Code" button (prominent)
```

**Student: Join Class**

```
[My Classes] → [Join Class] button
→ Input: "Masukkan kode kelas"
→ [Join]
→ Validate code
→ Success: "Selamat! Anda bergabung dengan [Class Name]"
→ Redirect to class page
```

**Teacher: Manage Roster**

```
[My Classes] → [Class Name] → [Roster] tab
→ Table: Student, Email, Joined, Status, Actions
→ [Remove] button → Confirm dialog
→ [Export CSV] button → Download roster_[classname]_[date].csv
```

---

## 12. Database Schema References

**Tables:**

- `classrooms` (NEW)
- `classroom_members` (NEW)
- `class_join_codes` (NEW)
- `class_schedules` (NEW)
- `class_announcements` (NEW)

**RPC Functions:**

- `create_classroom(name, description, course_id)` — Guru create class
- `generate_join_code(classroom_id, expiration_days, max_uses)` — Generate code
- `join_classroom_via_code(code)` — Student join with code
- `remove_student_from_classroom(classroom_id, student_id)` — Teacher remove
- `leave_classroom(classroom_id)` — Student leave
- `get_classroom_roster(classroom_id)` — Get all members
- `create_class_announcement(classroom_id, title, content)` — Announce
- `get_class_announcements(classroom_id)` — Fetch announcements
- `export_roster_csv(classroom_id)` — Export as CSV

**RLS Policies:**

- Classrooms: Visible to members (teacher + enrolled students) + admin.
- Classroom_members: Visible to members + teacher + admin.
- Class_join_codes: Visible to teacher + admin of tenant.
- Class_schedules: Visible to members + teacher.
- Class_announcements: Visible to members + teacher.

---

## 13. Success Checklist (Dev)

- [ ] `classrooms` table + RLS
- [ ] `classroom_members` table + RLS (with unique constraint)
- [ ] `class_join_codes` table + RLS
- [ ] `class_schedules` table + RLS
- [ ] `class_announcements` table + RLS
- [ ] Class CRUD API (create, read, update, archive/delete)
- [ ] Join code generation + validation
- [ ] Join class via code (student)
- [ ] Roster view (teacher) + filtering/search
- [ ] Remove/unenroll student (teacher)
- [ ] Leave class (student)
- [ ] Create/view announcements
- [ ] Class schedule creation + display
- [ ] Export roster CSV
- [ ] Class list (student view)
- [ ] Loading states (skeleton loaders)
- [ ] Dark mode support (dark: variants)
- [ ] Mobile responsiveness
- [ ] Error handling + Bahasa Indonesia
- [ ] React Query hooks + invalidation
- [ ] Unit tests (>80% coverage)
- [ ] E2E tests (create class, join, remove student, leave class)
- [ ] Documentation: README.md
