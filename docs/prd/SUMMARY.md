# PRD Summary — 4 Feature Modules

Generated: 2026-03-22

## Files Created

✅ **PRD_administration.md** (263 lines, 15 KB)

- Administration, user management, bulk import, feature toggles, audit trail, billing
- Key features: CSV import, role management, audit log, school settings, feature flags
- P0: User CRUD, bulk CSV import, feature toggles, audit log, school settings, billing dashboard

✅ **PRD_moderation.md** (317 lines, 18 KB)

- Content moderation, report workflow, admin review queue, moderation decisions
- Key features: Report submission, moderation queue, approve/reject, mute/suspend users, audit trail
- P0: Content reports, moderation queue, approve/reject actions, user suspension, email notifications

✅ **PRD_classroom.md** (343 lines, 20 KB)

- Class management, join codes, roster, class-specific deadlines and announcements
- Key features: Class CRUD, join code generation, roster management, class announcements, schedule
- P0: Class creation, join codes with expiration, roster view, remove students, export CSV, announcements

✅ **PRD_calendar.md** (338 lines, 21 KB)

- Academic calendar, events, scheduling, integration with assignments/quizzes
- Key features: Event CRUD, month/list view, event types (exam/deadline/holiday/event), notifications, academic settings
- P0: Calendar events, academic calendar settings, holiday display, draft/published states, notifications

---

## Document Structure (Each PRD Contains)

1. **Problem Statement** — Problem, impact, cost of not solving
2. **Goals** — 3–7 specific, measurable goals
3. **Non-Goals** — Explicitly scoped OUT of v1 (with reasons)
4. **User Stories** — Per persona (student, teacher, admin, engineer)
5. **Requirements** — P0 (must-have), P1 (nice-to-have), P2 (future considerations)
6. **Success Metrics** — Leading indicators (days–weeks), lagging indicators (weeks–months)
7. **Open Questions** — Blocking vs. non-blocking decisions needed
8. **Timeline & Phases** — Phase breakdown + hard deadline
9. **Dependensi & Risiko** — Technical dependencies, integration risks, edge cases
10. **Additional Sections** — Database schemas, RLS policies, database functions, UI flows, lifecycle diagrams, email templates

---

## Key Features Summary

### Administration

- **User Management**: View, add, edit, delete users. Search, filter, paginate.
- **Bulk CSV Import**: Upload CSV (email, name, role). Validate, detect errors, show success count.
- **Feature Toggles**: Admin enable/disable features per-school (Discussions, Moderation, Gamification, etc.)
- **Audit Trail**: Log all admin actions (user added, feature toggled, setting changed).
- **Billing Dashboard**: View subscription status, invoices, payment method (read-only).
- **School Settings**: Configure school name, timezone, academic year, semester dates.
- **P1 Additions**: Bulk delete, user export, activity search, bulk role change, branding customization.

### Moderation

- **Report Submission**: Users report content (discussion, comment, file) with reason (spam, bullying, inappropriate, other).
- **Moderation Queue**: Admin dashboard showing reported content, sorted by report count, with context.
- **Approve/Reject**: Admin review + decide. Reject: require reason. Approve: instant publish.
- **Moderation History**: Audit log of all decisions (date, content, action, moderator, reason). Filterable, searchable, exportable.
- **User Suspension**: Admin mute (hide content) or suspend (prevent login) users.
- **Moderation Policy**: Admin set mode (off, lenient, strict). Strict = require approval before content visible.
- **Notifications**: Email admin when reported, email creator when rejected/approved.
- **P1 Additions**: Auto-flag keywords, bulk actions, content search, appeal workflow, stats dashboard.

### Classroom

- **Class CRUD**: Create, edit, archive classes. Fields: name, description, course, teacher.
- **Join Codes**: Teacher generates unique, expiring codes. Students join with code (no admin needed).
- **Roster Management**: Teacher views/manages class roster. Remove students. Export CSV.
- **Class Announcements**: Teacher announce scoped to class (not school-wide).
- **Class Schedule**: Teacher set periods (e.g., Mon 10:00-11:00, Wed 14:00-15:00). Informational.
- **Class Isolation**: One student can join multiple classes. Each class independent.
- **P1 Additions**: Bulk invite CSV, class statistics, duplicate class, QR codes, class colors/icons.

### Calendar

- **Event CRUD**: Create, edit, delete calendar events. Fields: title, description, type, dates, times, location.
- **Event Types**: Ujian (red), Tugas Deadline (blue), Hari Libur (green), Acara Sekolah (purple), Lainnya (gray).
- **Calendar Views**: Month grid view + list view (sortable, filterable). Search by title.
- **Academic Calendar Settings**: Admin configure school year, semester dates, holidays.
- **Holiday Display**: Holidays auto-appear on calendar, grayed out, all-day.
- **Student Integration**: Calendar on student dashboard, shows upcoming events + personal deadlines (from assignments/quizzes).
- **Notifications**: Email 1 day before event, 1 hour before exam.
- **Draft/Published**: Events can be draft (private) or published (visible to all).
- **P1 Additions**: Recurring events, email/push notifications, export iCal, conflict detection, class-scoped events, stats.

---

## User Personas Covered

- **Siswa (Student)**: View class calendar + deadlines, join class, receive notifications
- **Guru (Teacher)**: Create/manage classes, roster, announcements, schedule; create calendar events; moderate content
- **Admin Sekolah**: Manage users (bulk import), toggle features, view audit trail, set academic calendar, manage moderation policy, configure settings
- **Platform Engineer/Support**: Debug tenant config, view feature flags across tenants

---

## Database Tables (New)

**Administration:**

- `import_jobs` (CSV import history)

**Moderation:**

- `content_reports` (reports submitted by users)
- `moderation_actions` (moderator decisions)
- `user_suspension_records` (muted/suspended users)

**Classroom:**

- `classrooms` (class definitions)
- `classroom_members` (enrollment records)
- `class_join_codes` (shareable codes)
- `class_schedules` (class periods)
- `class_announcements` (class-scoped announcements)

**Calendar:**

- `calendar_events` (academic calendar events)
- `academic_calendar` (school-level settings: year, semesters, holidays)
- `recurring_event_templates` (v1.1+)

**Existing Tables Modified:**

- `tenants`: Add `feature_flags` (JSON), `moderation_settings` (JSON), `school_name`, `timezone`, `academic_year`, etc.

---

## Timeline & Hard Deadlines

| Feature        | Target Completion | Notes                                                              |
| -------------- | ----------------- | ------------------------------------------------------------------ |
| Administration | 2026-04-30        | MVP: user mgmt, CSV import, feature toggles, audit log             |
| Moderation     | 2026-05-30        | MVP: report workflow, moderation queue, decisions                  |
| Classroom      | 2026-05-15        | MVP: class CRUD, join codes, roster, announcements                 |
| Calendar       | 2026-05-30        | MVP: events, academic settings, student integration, notifications |

---

## Success Metrics (High-Level)

**Administration:**

- Reduce admin overhead from 5-10 hrs/week to <2 hrs/week
- CSV import success rate >95%
- > 80% of schools toggle at least 1 feature

**Moderation:**

- <5% of reports pending >24 hours
- > 70% of students report inappropriate content
- Student safety survey: >80% feel "platform is safe"

**Classroom:**

- > 80% of students join classes via code (vs. manual)
- > 50% of teachers create at least 1 class
- Reduce "How do I add students?" support tickets by 75%

**Calendar:**

- > 70% of students view calendar monthly
- Reduce missed deadlines from ~30% to <5%
- > 80% of schools actively use academic calendar (3+ events)

---

## All PRDs Use Consistent Format

✅ Bahasa Indonesia for all user-facing text
✅ Technical terms in English (table names, column names, route, RPC)
✅ Actionable requirements (dev can implement from doc alone)
✅ Database schema references (table names, RLS policies, RPC functions)
✅ Success checklist for developers
✅ Blocking vs. non-blocking open questions
✅ P0/P1/P2 prioritization
✅ Risk mitigation strategies
✅ Dark mode + mobile responsiveness requirements
✅ Error handling + i18n requirements
✅ 4–6 pages each (typical PRD length)
