# PRD — Calendar (Kalender)

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Draft
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/calendar/`

---

## 1. Problem Statement

Sekolah Indonesia memiliki kalender akademik yang kompleks: jadwal pelajaran, ujian, hari libur, acara sekolah, deadline tugas, dll. Saat ini, kalender ini tersebar di:

- Spreadsheet (tidak bisa di-sync dengan deadline sistem)
- Pengumuman verbal (tidak tercatat)
- WhatsApp group (tidak terorganisir)
- Sistem lain (tidak terintegrasi)

**Dampak:**

- Siswa miss deadlines karena tidak tahu tanggalnya (atau tanggal salah)
- Guru tidak bisa set deadline assignment relative to calendar event (e.g., "3 hari sebelum ujian")
- Admin tidak punya centralized view of academic calendar
- No sync dengan sistem penjadwalan kelas
- Confusion: ada 5 calendar sources, data tidak konsisten

**Cost of Not Solving:** Student engagement down, teacher stress (chase deadlines), admin overhead (answer "kapan ujian?" questions), no compliance record (regulasi Indonesia require kalender akademik tersimpan).

---

## 2. Goals

1. **Centralized Academic Calendar**: Satu source of truth untuk semua event akademik di sekolah (tenant-level).
2. **Event Types & Categorization**: Events categorized (ujian, deadline tugas, hari libur, acara sekolah, etc.) dengan color-coding.
3. **Student Calendar View**: Siswa lihat dashboard kalender dengan upcoming events, deadlines, exam dates. Sync dengan assignment/quiz due dates.
4. **Teacher Calendar Management**: Guru bisa create/edit events (exam dates, assignment deadlines, acara kelas). Publish to calendar.
5. **Calendar Integrations**: Export to iCal/Google Calendar. (v1.1)
6. **Reminders & Notifications**: Push notification 1 day before event, 1 hour before exam, etc.
7. **School-level Visibility**: Admin configure academic year, semester dates, holidays. Enforce across platform.

---

## 3. Non-Goals

- **Meeting Scheduling**: v1 tidak ada Calendly-style meeting booking. Events are read-only announcements.
- **Conflict Detection**: v1 tidak ada auto-detect schedule conflicts (e.g., 2 exams same day). Manual review only.
- **Resource Allocation**: v1 tidak ada room/equipment booking. (Potential future feature.)
- **Student Absence Tracking**: v1 tidak ada attendance/absence events. (Separate feature.)
- **Recurring Events (Complex)**: v1 hanya simple recurring (weekly pada hari tertentu). No complex rules (biweekly, every other month, etc.).
- **Private/Confidential Events**: v1 semua events public (visible to all students in school). No permission-based visibility.
- **Timezone-aware Events**: v1 assume single school timezone. No multi-timezone support.

---

## 4. User Stories

### Untuk Siswa

- As a student, I want to view my school's academic calendar so that I know important dates (exams, holidays, deadlines).
- As a student, I want to see my personal deadlines (assignments due, quizzes scheduled) integrated with the academic calendar so that I can plan my study.
- As a student, I want to receive notifications 1 day before deadline and 1 hour before exam so that I don't miss important events.
- As a student, I want to export calendar events to Google Calendar or Apple Calendar so that I can sync with my personal calendar.

### Untuk Guru

- As a teacher, I want to create calendar events (exam date, assignment deadline, class event) so that I can communicate important dates to students.
- As a teacher, I want to edit or delete calendar events I created so that I can correct mistakes or reschedule.
- As a teacher, I want to view my school's academic calendar and other teachers' events so that I can avoid scheduling conflicts.
- As a teacher, I want to publish events and see when they were published so that I know students have visibility.

### Untuk Admin

- As an admin, I want to configure academic year, semester dates, and holidays for my school so that the platform enforces correct dates.
- As an admin, I want to view all calendar events created by teachers so that I can audit and manage the calendar.
- As an admin, I want to create school-wide events (holiday, acara sekolah) so that all students see them.
- As an admin, I want to set recurring events (e.g., weekly Friday briefing, monthly assembly) so that I don't have to create each instance manually.

---

## 5. Requirements

### P0 — Must Have

| Requirement                      | Acceptance Criteria                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Calendar Event CRUD**          | Any user (teacher/admin) can create event. Fields: title, description, event_type (enum: ujian/tugas/libur/acara/lainnya), start_date, end_date (end_date >= start_date), start_time (optional), end_time (optional), color (selected from palette), location (optional), created_by (auto), tenant_id, is_published (boolean). Validation: title required, date not in past. |
| **Event Types & Color-Coding**   | Pre-defined event types with colors: Ujian (red), Tugas Deadline (blue), Hari Libur (green), Acara Sekolah (purple), Lainnya (gray). Teacher choose type when creating event; color auto-assigned. Display event color in calendar view.                                                                                                                                      |
| **Calendar Month View**          | Calendar widget showing month grid. Each date cell shows events scheduled that day (if any). Click date to view/create event. Events color-coded by type. Navigation: prev/next month, "today" button. Mobile-responsive (scroll horizontally if needed).                                                                                                                     |
| **Calendar List View**           | Alternative view: sortable/filterable list of all events. Columns: date, title, type, created_by, status (published/draft). Filter by event type, date range, creator. Sortable by date. Paginated (25/page).                                                                                                                                                                 |
| **Event Detail View**            | Click on event to view modal/page. Show: title, description, date/time, type, location, color, created_by, created_at, updated_at. For draft events: show draft badge. Action buttons: Edit (if owner or admin), Delete (if owner or admin), Publish (if draft).                                                                                                              |
| **Create/Edit Event Form**       | Form with fields: title, description, type (dropdown), start_date (date picker), end_date (date picker), start_time (time picker, optional), end_time (time picker, optional), color (color picker), location (text), is_all_day (toggle). Validation: title + date required. On save, store in `calendar_events` table.                                                      |
| **Publish/Draft Toggle**         | Events have draft/published state. Draft: visible only to creator + admin. Published: visible to all users. On publish, store `published_at` timestamp. Show "Draft" badge in UI for unpublished events. Admin can force publish any event.                                                                                                                                   |
| **Student Calendar Integration** | Student dashboard shows calendar widget (mini month or upcoming events list). Clicking event shows detail. Upcoming events sorted by date. Show personal assignments/quizzes as events (sourced from `assignments` + `quizzes` tables). Color code: blue for deadline, red for exam.                                                                                          |
| **Academic Calendar Settings**   | Admin page to set: academic_year (e.g., "2025-2026"), semester_1_start, semester_1_end, semester_2_start, semester_2_end, school_holidays (list of date ranges), timezone. Store in `tenants` table or `academic_calendar` table. Display in calendar as background color (grayed out on holidays).                                                                           |
| **Holiday Display**              | Holidays (configured by admin) display as all-day events with distinct styling (e.g., gray background, "Hari Libur" label). Holidays auto-appear on calendar. Recurring holidays (e.g., "Hari Raya every year") are created as separate events per year.                                                                                                                      |
| **Event Search**                 | Search calendar events by title/description. Search bar on calendar page. Results show matching events. Clickable results.                                                                                                                                                                                                                                                    |
| **Recurring Events (Simple)**    | Optional: Admin create recurring event. Fields: repeat_pattern (none/daily/weekly/monthly), repeat_end_date. System auto-generate event instances. Store `recurring_event_template` table. (Can be v1.1 if over-scope.)                                                                                                                                                       |
| **Dark Mode Support**            | All calendar components have dark: variants. Calendar widget readable in dark mode.                                                                                                                                                                                                                                                                                           |
| **Mobile Responsiveness**        | Calendar month view scrollable on mobile. List view stacked. Event form accessible on small screens.                                                                                                                                                                                                                                                                          |
| **Error Handling**               | Meaningful error messages in Bahasa Indonesia. Examples: "Tanggal akhir harus >= tanggal mulai", "Judul event wajib diisi".                                                                                                                                                                                                                                                   |

### P1 — Nice to Have

| Requirement                     | Notes                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Email Notifications**         | Send email 1 day before event + 1 hour before exam. Configurable per user. Requires email service.                                                |
| **Push Notifications**          | Send push notification (if app installed) 1 day before + 1 hour before exam.                                                                      |
| **Export iCal**                 | Admin/student can export calendar as .ics file (iCal format). Importable to Google Calendar, Apple Calendar, Outlook.                             |
| **Recurring Events (Advanced)** | Support complex patterns: biweekly, monthly on specific day (e.g., 2nd Monday), repeat for N occurrences. (Likely v1.1+)                          |
| **Conflict Detection**          | Warn if creating exam event when another exam already scheduled same day. Suggestion: reschedule. (Advisory only.)                                |
| **Class-Specific Events**       | Extend events to be scoped to classes (not just school-wide). E.g., "Class A exam on Friday, Class B on Saturday." Requires restructuring. (v1.1) |
| **Calendar Stats**              | Dashboard widget: upcoming events (next 7 days), event count by type, busy days.                                                                  |
| **Event Reminders Dashboard**   | Student view: "Your upcoming deadlines this week" + "Exams coming up" with countdown.                                                             |
| **Bulk Event Import**           | Admin upload CSV of events (date, title, type). System create events in bulk.                                                                     |
| **Calendar Sync with LMS**      | Auto-create calendar event when assignment/quiz created (due_date → calendar event). Keep in sync (edit assignment → update calendar event).      |

### P2 — Future Considerations

- **Meeting Scheduling Integration**: Integrate Zoom/Google Meet. Calendar event can have meeting link. (Different from event creation — more like booking.)
- **Parent Calendar Access**: Parents see child's calendar + upcoming deadlines. Receive email reminders.
- **Student Absence Events**: Integration with attendance system. "Student absent" event + reason.
- **Timezone-aware Events**: Support events across timezones (e.g., online exam for international school branch).
- **Calendar Sharing**: Teachers/admin share calendar with specific users (e.g., share exam schedule with other teachers).
- **Advanced Conflict Resolution**: AI suggestion to reschedule conflicting events (requires historical data + preferences).

---

## 6. Success Metrics

### Leading Indicators

- **Event Creation Rate**: >50% of schools create at least 1 calendar event/month. Track: events created / active schools.
- **Calendar View Engagement**: >70% of students view calendar at least once/month. Track: unique calendar_view events.
- **Event Discovery**: <5% of missed deadlines due to "didn't know the date" (vs. current ~30%). Track: student survey.
- **Notification Open Rate**: >60% of students open deadline notification when received. Track: push/email open rate.

### Lagging Indicators

- **Calendar Adoption**: >80% of schools actively use academic calendar (3+ events). Track: schools with events > 0.
- **Student Awareness**: Student survey: "I know all my deadlines and exam dates." Target: >85% agree.
- **Support Ticket Reduction**: Reduce "when is the exam?" tickets from 50/month to <10/month.
- **Teacher Satisfaction**: "Calendar feature helps me organize teaching." Target: >75% agree.
- **Deadline Adherence**: Students submitting on-time rates increase by 10% (baseline: 65% → target: 75%).

---

## 7. Open Questions

| #   | Pertanyaan                                                                          | Owner       | Blocking?                                                                              |
| --- | ----------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| 1   | Apakah semua events harus school-wide atau bisa class-specific?                     | Product     | Tidak — v1: school-wide. v1.1: add class-scoping                                       |
| 2   | Apakah admin bisa delete event dari guru atau hanya view?                           | Product     | Tidak — admin can delete any event (soft delete)                                       |
| 3   | Apakah draft events count toward "published calendar"?                              | Product     | Tidak — only published events visible to students                                      |
| 4   | Apakah timezone dari event adalah school timezone atau user timezone?               | Engineering | Ya — clarify. Plan: school timezone (stored UTC internally).                           |
| 5   | Apakah ada notifikasi otomatis atau hanya email yang scheduled manually?            | Product     | Tidak — auto-notify 1 day before + 1 hour before (requires job scheduler like pg_cron) |
| 6   | Bagaimana jika admin change academic year mid-year? Apakah existing events berubah? | Product     | Tidak — no retroactive change. New events use new year. Old events preserved.          |
| 7   | Apakah student bisa create calendar events atau hanya teacher/admin?                | Product     | Tidak — teacher + admin only. v1: no student-created events                            |

---

## 8. Timeline & Phases

**Phase 1 (Week 1-2): MVP — Calendar Basics**

- `calendar_events` table + RLS
- Event CRUD (create, read, update, delete)
- Month view + list view
- Event types + color-coding
- Academic calendar settings (admin page)
- Holiday display

**Phase 2 (Week 3-4): Student Integration & Notifications**

- Student calendar view + upcoming events
- Integration with assignments/quizzes (auto-events)
- Draft/published toggle
- Event search
- Email notifications (1 day before, 1 hour before)

**Phase 3 (Week 5-6): Polish & Recurring Events**

- Recurring events (simple: daily/weekly/monthly)
- Mobile responsiveness
- Dark mode support
- Error handling + Bahasa Indonesia
- Calendar stats widget

**Phase 4 (Week 7-8): Launch & Monitor**

- QA + bug fixes
- Gradual rollout (5 pilot schools)
- Teacher/student training materials
- Monitor adoption metrics
- Gather feedback for v1.1

**Hard Deadline**: 2026-05-30 (calendar feature live + 5+ schools using)

---

## 9. Dependensi & Risiko

### Technical Dependencies

- `calendar_events` table (NEW) — columns: id, title, description, event_type (enum), start_date, end_date, start_time (TIME, nullable), end_time (TIME, nullable), location, color, created_by (FK profiles), created_at, updated_at, is_published (boolean), published_at (nullable), tenant_id. RLS: published events visible to all, draft visible to creator + admin.
- `academic_calendar` table (OPTIONAL, can use `tenants` instead) — columns: tenant_id (FK), academic_year (string), semester_1_start (date), semester_1_end, semester_2_start, semester_2_end, school_holidays (JSON array of date ranges), timezone.
- `recurring_event_templates` table (v1.1) — store recurring event metadata + generated instances.
- React Query v5 — for invalidation + caching.
- Background job scheduler (pg_cron) — for sending notifications (1 day before, 1 hour before).
- Email service — Supabase auth emails or Resend/SendGrid.

### Integration Risks

- **Date Range Logic**: If start_date > end_date, validation fails. Risk: user confused about which date is which. Mitigation: Label clearly "Tanggal Mulai" and "Tanggal Selesai". Use date picker (not text input).
- **Timezone Confusion**: Events stored in UTC, but displayed in school timezone. If timezone changed mid-year, existing events shift. Risk: exam showing wrong date. Mitigation: Timezone immutable in v1. Store both UTC + local time.
- **Holiday Overlap**: Admin creates "Holiday: Ramadan" from May 1-20. Then creates "Holiday: Lebaran" May 15-20. Overlap. Mitigation: No validation in v1, but display warning to admin.
- **Student Sees Draft Event**: If RLS policy too permissive, student sees draft event teacher is working on. Risk: confusion, misinformation. Mitigation: RLS = `(is_published = true OR created_by = auth.uid() OR is_admin())`.
- **Mass Notification Spam**: If 1000+ students and system sends 1k emails 1 day before exam, email service rate-limited. Mitigation: Batch emails, use job queue, stagger send times.
- **Recurring Event Explosion**: If admin create "recurring: weekly for 5 years", system generate 260 event records. Memory + DB size. Mitigation: Limit recurring events to 2-year max in v1. Use template + on-demand generation if needed.

### Edge Cases

- **Event on Holiday**: Exam scheduled on hari libur. Should system warn or allow? Mitigation: Allow (no validation), but show warning to admin ("Exam scheduled on holiday").
- **Retroactive Event Creation**: Teacher create event dated 2 weeks ago. Should it appear in calendar? Mitigation: Allow, but show warning "Event is in the past".
- **Delete Event with Students Notified**: Admin delete exam event after notifications already sent. Students still see notification + event gone. Mitigation: Send cancellation notification ("Exam [Title] has been cancelled").
- **Time Zone Change**: School switches timezone mid-year. Existing events with times now show wrong time. Mitigation: No timezone change support in v1. Document: timezone is immutable per school.
- **All-Day vs Timed Events**: "Hari Libur" is all-day (no time). Exam is 10:00-11:30 (timed). Different display. Mitigation: `is_all_day` toggle. If true, hide time picker.

---

## 10. Event Types & Styling

```
Ujian (Red #EF4444)
├─ Text: "Ujian"
├─ Used for: quizzes, exams, tests
└─ Notification: 1 hour before

Tugas Deadline (Blue #3B82F6)
├─ Text: "Deadline Tugas"
├─ Used for: assignment due dates
└─ Notification: 1 day before

Hari Libur (Green #10B981)
├─ Text: "Libur"
├─ Used for: holidays, school breaks
└─ All-day event

Acara Sekolah (Purple #A855F7)
├─ Text: "Acara"
├─ Used for: assembly, field trip, workshop
└─ Can be timed or all-day

Lainnya (Gray #6B7280)
├─ Text: "Event"
├─ Used for: announcements, other
└─ No specific notification rule
```

---

## 11. Calendar Integration Points

**Auto-Generated Events from LMS:**

- Assignment due_date → Calendar event (type: Tugas Deadline)
- Quiz scheduled_date + due_date → Calendar events
- Class schedule (if exists) → Weekly recurring calendar block (informational)

**Sync Strategy:**

- When assignment/quiz created: auto-create calendar event
- When assignment/quiz updated: update calendar event
- When assignment/quiz deleted: delete calendar event
- Manual edit to calendar does NOT sync back to assignment (one-way)

---

## 12. Database Schema References

**Tables:**

- `calendar_events` (NEW)
- `academic_calendar` (NEW, or extend `tenants`)
- `recurring_event_templates` (NEW, optional for v1.1)

**RPC Functions:**

- `create_calendar_event(title, description, type, start_date, end_date, start_time, end_time, location, color)` — Create event
- `update_calendar_event(event_id, fields)` — Update event
- `delete_calendar_event(event_id)` — Soft-delete (mark is_deleted = true)
- `publish_calendar_event(event_id)` — Set is_published = true, store published_at
- `get_calendar_events(start_date, end_date, event_type)` — Fetch events in range
- `get_academic_calendar(tenant_id)` — Fetch school calendar settings
- `set_academic_calendar(tenant_id, year, semester_dates, holidays)` — Update settings
- `send_calendar_reminders()` — Batch job to send notifications

**RLS Policies:**

- `calendar_events`: Published events visible to all. Draft visible to creator + admin.
- `academic_calendar`: Visible to all users (read-only). Editable by admin only.

---

## 13. Notification Schedule

```
Event: Ujian Matematika, 2026-03-25 10:00
└─ 2026-03-24 10:00: Email "Ujian besok pukul 10:00"
└─ 2026-03-25 09:00: Push/Email "Ujian dimulai dalam 1 jam"

Event: Deadline Tugas Fisika, 2026-03-30 23:59
└─ 2026-03-29 23:59: Email "Deadline tugas besok malam"

Event: Hari Libur (all-day), 2026-04-01
└─ 2026-03-31 08:00: Email "Besok hari libur"
```

---

## 14. Success Checklist (Dev)

- [ ] `calendar_events` table + RLS policy
- [ ] `academic_calendar` table + RLS policy
- [ ] Create event form (all fields + validation)
- [ ] Edit event form
- [ ] Delete event (soft-delete)
- [ ] Event detail view (modal or page)
- [ ] Calendar month view (grid)
- [ ] Calendar list view (sortable/filterable)
- [ ] Event search functionality
- [ ] Academic calendar settings page (admin)
- [ ] Holiday display on calendar
- [ ] Draft/published toggle + badge
- [ ] Event type color-coding
- [ ] Student calendar integration (dashboard)
- [ ] Auto-events from assignments/quizzes
- [ ] Recurring events (simple: daily/weekly/monthly) [optional for v1]
- [ ] Email notifications (1 day before, 1 hour before)
- [ ] Mobile responsiveness
- [ ] Dark mode support (dark: variants)
- [ ] Error handling + Bahasa Indonesia
- [ ] React Query hooks + invalidation
- [ ] Background job for notifications (pg_cron)
- [ ] Unit tests (>80% coverage)
- [ ] E2E tests (create event, publish, view calendar, receive notification)
- [ ] Export iCal (optional for v1.1)
- [ ] Documentation: README.md
