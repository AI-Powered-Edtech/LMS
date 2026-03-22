# PRD — Announcements (Pengumuman)

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Live
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/announcements/`

---

## 1. Problem Statement

Sekolah Indonesia mengandalkan berbagai channel terpisah (WhatsApp, SMS, email, papan pengumuman fisik) untuk komunikasi penting kepada siswa dan orang tua. Hal ini menyebabkan:

- **Fragmentation:** Informasi tersebar di multiple platforms, siswa/orang tua sering terlewat.
- **Teacher Overhead:** Guru harus copy-paste pengumuman ke WhatsApp, email, LMS secara manual.
- **Low Accountability:** Tidak ada tracking siapa yang sudah baca/menerima informasi penting (e.g., deadline perubahan jadwal, event penting).
- **RSVP Chaos:** Guru collect RSVP via WhatsApp (+62 8xx), seringkali hilang atau tercampur.

Announcements di EduSync mengatasi ini dengan **centralized, school-wide communication** dengan tracking dan RSVP terintegrasi—mengubah EduSync menjadi single source of truth untuk school communication, bukan hanya learning platform.

---

## 2. Goals

1. **Consolidate Communication Channels:** 80% school announcements tersentralisir di EduSync, reduce teacher reliance on WhatsApp by 60%.
2. **Improve Information Reach:** 95% targeted students see announcement within 24 hours (via in-app + push notification).
3. **Enable RSVP Tracking:** 100% of event/consent announcements have RSVP capability, eliminate WhatsApp polling chaos, get definitive headcount.
4. **Reduce Teacher Communication Time:** Teacher spend <2 min per announcement (vs 10 min for multi-channel broadcasting).
5. **Parent Transparency:** Parents dapat lihat school announcements directly or via digest email, feel informed about school updates.

---

## 3. Non-Goals

1. **Email as Primary Channel:** v1 uses in-app notifications. Email digest/forwarding adalah v2 untuk parent reach.
2. **Scheduled Announcements:** v1 adalah "publish immediately". Schedule for future time adalah v2 feature.
3. **Rich Media (Video/Images) at Scale:** v1 supports text + links only. Image/video upload untuk school logo atau document preview adalah v2.
4. **Translation/Multi-Language:** Announcements posted in Indonesian. Auto-translate untuk parent notifications adalah future phase.
5. **Announcement Templates:** v1 is free-form. School-wide templates (exam schedule template, closure notice template) adalah v2.

---

## 4. User Stories

### Untuk Admin Sekolah (Admin)

- **US1:** As a school admin, I want to post a school-wide announcement **so that** all students + teachers instantly see critical updates (closure, schedule change, event).
  - Example: "Senin 25 Maret libur nasional, tidak ada sekolah." Posted Sunday, seen by all Monday pagi.

- **US2:** As a school admin, I want to target announcements to specific classes/grades **so that** I don't spam irrelevant info (e.g., SMA-only announcement doesn't reach SD).
  - Scenario: "SMA debate competition enrollment open" → target hanya SMA students.

- **US3:** As a school admin, I want to create an announcement with RSVP (yes/no/maybe) **so that** I can collect headcount for event planning (fieldtrip, assembly, etc).
  - Use case: "Fieldtrip to museum 30 April, RSVP by 20 April" → see who's coming in realtime.

- **US4:** As a school admin, I want to pin important announcements at top of feed **so that** critical info stays visible (not buried by newer posts).
  - Context: Pin "COVID Protocol" or "Parent-Teacher Meeting Date" untuk minggu-minggu mendatang.

- **US5:** As a school admin, I want to see read statistics (who read, who didn't) **so that** I know which students/classes need follow-up for critical info (consent forms, safety).

### Untuk Guru (Teacher)

- **US6:** As a teacher, I want to post class-level announcements **so that** my students see updates specific to my class (homework, test schedule, material links).
  - Example: "Latihan soal chapter 5 di link berikut. Dikumpulkan Jumat pukul 5 sore."

- **US7:** As a teacher, I want to RSVP to school announcements (attendance, consent) **so that** admin has teacher consent/attendance as separate data.

### Untuk Siswa (Student)

- **US8:** As a student, I want to see all announcements relevant to me (school-wide + my class) in one feed **so that** I don't miss info.

- **US9:** As a student, I want to RSVP to announcements with buttons (Yes/No/Maybe) **so that** admin/teacher knows my status without me typing.
  - Mobile-friendly buttons, not form-filling.

- **US10:** As a student, I want to mark announcements as read **so that** I can track what I've seen (good for anxious students checking "did I see this?").

---

## 5. Requirements

### P0 — Must Have

| #   | Requirement                           | Acceptance Criteria (Given/When/Then)                                                                                                                                                                                    |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Announcement CRUD (Admin/Teacher)** | Given admin/teacher on announcements page, When they click "Buat Pengumuman", Then form opens with fields: Title, Content, Target (School-wide / Class-specific / Grade), Pinned toggle.                                 |
| 2   | **Announcement Feed (All Roles)**     | Given student/teacher viewing dashboard or announcements tab, When page loads, Then list displays all relevant announcements (by target audience) in reverse chronological order + pinned items at top.                  |
| 3   | **Target Audience Filtering**         | Given admin creates announcement with target "Grade 10 SMA", When published, Then only students/teachers in Grade 10 SMA can see it (not Grade 9). Enforce via RLS on `announcements` + `announcement_reads` tables.     |
| 4   | **RSVP Capability**                   | Given announcement created with "Enable RSVP" toggle, When student/teacher views it, Then 3 buttons appear: "Ya" / "Mungkin" / "Tidak". Click stores response in `announcement_rsvps` table (NEW).                       |
| 5   | **RSVP Summary for Creator**          | Given announcement creator (admin/teacher) views announcement detail, When RSVP enabled, Then show summary: "25 Ya / 5 Mungkin / 2 Tidak / 68 Belum balas" + list students by response (downloadable CSV).               |
| 6   | **Mark as Read**                      | Given student reads announcement, When clicking on announcement or 3-second auto-mark on feed, Then record in `announcement_reads` table with `read_at` timestamp.                                                       |
| 7   | **Read Statistics**                   | Given admin/creator views announcement detail, When scrolling down, Then see read count: "72 dari 100 siswa sudah baca" + bar chart over time (reads in last 24h).                                                       |
| 8   | **Pin/Unpin Announcement**            | Given admin/teacher views their announcement, When clicking "Pin" button, Then announcement moves to top of feed + `announcements.pinned` flag set to true. Can have max 3 pinned at once.                               |
| 9   | **Delete Announcement (Admin only)**  | Given admin on announcement detail, When clicking "Delete", Then confirm dialog appears. On confirm, soft-delete (set `deleted_at`), still count towards read stats for historical reporting, but don't display in feed. |
| 10  | **Mobile Responsive**                 | Given student on mobile (375px), When viewing announcements feed, Then cards stack vertically, RSVP buttons are large touch-targets (48px+), no horizontal scroll.                                                       |
| 11  | **Empty State**                       | Given no announcements posted yet, When user opens announcements tab, Then show friendly message "Belum ada pengumuman" with icon.                                                                                       |
| 12  | **Pagination**                        | Given 500+ announcements exist, When user scrolls feed, Then load announcements in batches of 20 (infinite scroll or "Load More"), don't load all at once.                                                               |

### P1 — Nice to Have

| #   | Requirement                               | Notes                                                                                                                                    |
| --- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Announcement Categories/Tags**          | Admin/teacher tag announcements (Academic, Event, Health&Safety, Admin). Students can filter by tag. Improves discoverability.           |
| 2   | **Search Announcements**                  | Search bar to find announcements by keyword + date range filter.                                                                         |
| 3   | **Unread Badge**                          | Announcement tab shows red badge with count of unread announcements.                                                                     |
| 4   | **Push Notification on New Announcement** | New school-wide or class-level announcement triggers push to relevant students (integrates with notifications team's Edge Function).     |
| 5   | **Email Summary for Parents**             | Daily or weekly digest email sent to parent contact with: top 3 school announcements + class-level announcements their child belongs to. |
| 6   | **Announcement Template**                 | Admin saves announcement as reusable template (e.g., "Weekly Schedule Template"), prefill content for quick posting.                     |
| 7   | **Comment on Announcements**              | Students can leave questions/comments on announcements (e.g., clarify homework due date). Teachers moderate.                             |

### P2 — Future Considerations

| #   | Consideration                                            | Reasoning                                                                                                     |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | **Scheduled/Recurring Announcements**                    | e.g., "Weekly schedule every Monday 5 AM" or "Repeat this event announcement next term". Advanced scheduling. |
| 2   | **Rich Media (Images, Documents, Videos)**               | v1 is text + URLs only. Embed images (school logo, event flyer), PDF uploads (curriculum changes) for v2.     |
| 3   | **Announcement Analytics**                               | View peak read times, engagement by grade, A/B test announcement wording. Product analytics for v2.           |
| 4   | **Multi-Language Announcements**                         | Post announcement in Indonesian, auto-translate abstract to English for international students/parents.       |
| 5   | **Announcement Translations/Auto-Translate for Parents** | Send announcements to parent emails with auto-translation to parent's language preference.                    |

---

## 6. Success Metrics

### Leading Indicators (Hari–Minggu)

- **Announcement Post Frequency:** # announcements posted per week. **Target:** 8–12 per school (mix of school-wide + class-level).
  - **Cara Ukur:** `SELECT COUNT(*) FROM announcements WHERE created_at > NOW() - INTERVAL '7 days'`

- **Read Rate (24h):** % of students who read announcement within 24h of posting. **Target:** 85%+.
  - **Cara Ukur:** `COUNT(DISTINCT announcement_reads WHERE created_at < 24h after announcement.created_at) / total_target_students`

- **RSVP Participation:** % of students who RSVP to RSVP-enabled announcements. **Target:** 70%+.
  - **Cara Ukur:** `COUNT(RSVP responses) / COUNT(target students for RSVP announcements)`

- **Average Response Time (RSVP):** Median hours for student to RSVP after announcement posted. **Target:** <24h (same-day response).

### Lagging Indicators (Minggu–Bulan)

- **WhatsApp Group Message Reduction:** % reduction in school/class WhatsApp group messages post-launch. **Target:** 50% reduction measured via teacher surveys.
  - **Cara Ukur:** Teacher self-report or IT log analysis.

- **Missed Information Incidents:** # incidents where student missed critical announcement. **Target:** Zero by month 2 (measure via parent/teacher complaints).

- **Teacher Communication Efficiency:** Avg time teacher spends posting announcements + collecting RSVP. **Target:** <3 min vs 10 min pre-EduSync.
  - **Cara Ukur:** Time-tracking survey or in-app UX measurement.

- **Parent Satisfaction (if email enabled):** Parent NPS for getting announcements via EduSync digest. **Target:** 8+.

---

## 7. Open Questions

| #   | Pertanyaan                                                                 | Owner                  | Blocking?                                         |
| --- | -------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------- |
| 1   | Berapa max pinned announcements (3, 5, unlimited)?                         | Product/UX             | Ya                                                |
| 2   | Announcement timestamps — timezone awareness per school? Or UTC?           | Engineering            | Ya                                                |
| 3   | RSVP deadline enforcement? Can student change RSVP after deadline?         | Product/Pedagogy       | Tidak (can be v1.1)                               |
| 4   | Apakah class-level announcements visible to parents/guardians?             | Product/Privacy        | Ya                                                |
| 5   | Deletion — hard delete atau soft delete? Keep audit trail?                 | Engineering/Compliance | Ya                                                |
| 6   | Announcement notification — who can notify? (Only admins or teachers too?) | Product                | Tidak (v1 is admin/teacher, students see in feed) |

---

## 8. Timeline & Phases

### Phase 1: MVP (1.5 minggu)

- **Week 1 (3 hari):** Design announcements page, implement CRUD for admin, target audience filtering + RLS.
- **Week 1 (2 hari):** RSVP flow, read tracking, statistics display.
- **Week 2 (2 hari):** Mobile testing, pagination, empty states.

### Phase 2: Polish + Launch (3 hari)

- Analytics integration, user feedback collection, A/B test RSVP button placement.
- Launch to all schools.

### Phase 3: P1 Features (v1.1, 1 minggu later)

- Push notifications, categories/tags, email digest.

**Hard Deadline:** Ship MVP to beta schools by EOD April (week 2 of dev).

---

## 9. Dependensi & Risiko

### Technical Dependencies

1. **Database tables:** `announcements`, `announcement_reads`, `announcement_rsvps` (all NEW).
2. **RLS Policies:** Must isolate by `tenant_id` + `target_audience` (school-wide, class-specific, grade-specific).
3. **Notifications Integration:** v1.1 push notifications depend on `send-push` Edge Function.

### Schema Design

```sql
-- Table: announcements
CREATE TABLE announcements (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  created_by UUID REFERENCES users(id), -- admin or teacher
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_type ENUM('school_wide', 'class', 'grade'),
  target_class_id UUID REFERENCES classes(id), -- if class-level
  target_grade INT, -- if grade-level
  has_rsvp BOOLEAN DEFAULT false,
  rsvp_deadline TIMESTAMPTZ,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- soft delete
  CONSTRAINT rls_tenant CHECK (tenant_id = (SELECT get_my_tenant_id()))
);

-- Table: announcement_reads
CREATE TABLE announcement_reads (
  id UUID PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- Table: announcement_rsvps
CREATE TABLE announcement_rsvps (
  id UUID PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  response ENUM('yes', 'maybe', 'no'),
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);
```

### Integration Points

- **Classes Table:** Must link announcements to `classes(id)` for class-level targeting.
- **Auth:** Use `useAuth()` to get `user_id`, `role`, `tenantId`.
- **Notifications:** Coordinate with notifications team for push notification integration (v1.1).

### Risks & Mitigations

| Risk                                                 | Impact                       | Mitigation                                                                                        |
| ---------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| Teacher accidentally delete important announcement   | Student misses critical info | Soft delete, show "deleted" state briefly with "Undo" button (15 sec window), keep in read stats. |
| RSVP data used against student (attendance bullying) | Privacy concern              | School policy training, admin accountability, audit logs.                                         |
| High announcement volume (spam)                      | Feed becomes noise           | Rate limit per user (max 5 posts/day), require admin approval for school-wide.                    |
| Student RSVP without reading announcement            | False positive engagement    | Encourage but don't enforce read-before-RSVP; accept that some do both simultaneously.            |
| Mobile RSVP buttons too small, high mis-clicks       | UX friction                  | Large 48px+ buttons, haptic feedback on click.                                                    |

### Edge Cases to Test

1. **Announcement for class that's deleted:** Class-level announcement references deleted class. Handle gracefully (don't show, or mark obsolete).
2. **RSVP after deadline:** Student RSVPs 1 hour after deadline. Allow RSVP but visually mark "Lambat" or show warning.
3. **Deleted student:** Student deleted but has RSVP on announcement. RLS should exclude them from reading, but RSVP record persists (for audit).
4. **Concurrent RSVP changes:** Student clicks "Ya" then "Tidak" rapidly. Handle idempotent update (last one wins).
5. **Large read count (50k+):** Announcement reaches 50k students, loading read stats slow. Paginate read list, show summary bar chart.
