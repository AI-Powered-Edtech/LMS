# EduSync LMS — PRD Index

**Generated:** 2026-03-22

---

## 4 Feature Modules — Full PRDs

### 1. Administration (Administrasi)

📄 **File:** `PRD_administration.md`  
📊 **Size:** 263 lines, 15 KB  
🎯 **Focus:** User management, bulk import, feature toggles, audit trail, billing

**Key Deliverables:**

- User CRUD (create, read, update, delete)
- Bulk CSV import with validation + error reporting
- Feature toggle dashboard (enable/disable features per-school)
- Audit log viewer (all admin actions logged)
- School settings form (timezone, academic year, etc.)
- Billing dashboard (read-only subscription + invoices)

**Phase Timeline:**

- Phase 1 (Wk 1-2): MVP — User CRUD, basic audit log, feature toggles
- Phase 2 (Wk 3-4): CSV import, billing, advanced audit filtering
- Phase 3 (Wk 5-6): Polish, loading states, dark mode, error handling
- Hard Deadline: **2026-04-30**

**New Tables:**

- `import_jobs` (CSV import history)

**Key Metrics:**

- Admin overhead: 5-10 hrs/week → <2 hrs/week
- CSV import success rate: >95%
- Feature adoption: >80% of schools toggle ≥1 feature

---

### 2. Moderation (Moderasi)

📄 **File:** `PRD_moderation.md`  
📊 **Size:** 317 lines, 18 KB  
🎯 **Focus:** Content moderation, report workflow, approval system, user suspension

**Key Deliverables:**

- Report submission form (reason: spam, bullying, inappropriate, other)
- Moderation queue dashboard (reported content, sorted by report count)
- Approve/reject workflow with reason capture
- Moderation history + audit log (filterable, searchable, exportable)
- User suspension system (mute or suspend repeat offenders)
- Moderation policy settings (off, lenient, strict)
- Email notifications (admin, reporter, content creator)

**Phase Timeline:**

- Phase 1 (Wk 1-2): MVP — Report submission, moderation queue, approve/reject
- Phase 2 (Wk 3-4): User suspension, email notifications, policy settings
- Phase 3 (Wk 5-6): Auto-flagging, bulk actions, compliance export
- Hard Deadline: **2026-05-30**

**New Tables:**

- `content_reports` (reports from users)
- `moderation_actions` (moderator decisions)
- `user_suspension_records` (muted/suspended users)

**Key Metrics:**

- Queue clear time: <5% pending >24 hours
- Report submission rate: >50% of inappropriate content reported
- Student safety survey: >80% feel "platform is safe"

---

### 3. Classroom (Kelas)

📄 **File:** `PRD_classroom.md`  
📊 **Size:** 343 lines, 20 KB  
🎯 **Focus:** Class management, join codes, roster, class isolation

**Key Deliverables:**

- Class CRUD (create, read, update, archive)
- Join code generation + expiration (6-char alphanumeric, configurable TTL + max uses)
- Student join via code (no admin approval needed)
- Teacher roster management (view, remove, export CSV)
- Class announcements (scoped to class, not school-wide)
- Class schedule (periods: Mon 10:00-11:00, etc.)
- Leave class functionality (student can unenroll)

**Phase Timeline:**

- Phase 1 (Wk 1-2): MVP — Class CRUD, join codes, roster view
- Phase 2 (Wk 3-4): Announcements, schedule, remove student, export CSV
- Phase 3 (Wk 5-6): Analytics, mobile responsive, dark mode
- Hard Deadline: **2026-05-15**

**New Tables:**

- `classrooms` (class definitions)
- `classroom_members` (enrollment: student ↔ class)
- `class_join_codes` (shareable codes with expiration)
- `class_schedules` (class periods)
- `class_announcements` (class-scoped messages)

**Key Metrics:**

- Join code adoption: >80% of students join via code
- Teacher adoption: >50% of teachers create ≥1 class
- Support ticket reduction: "How do I add students?" tickets ↓75%

---

### 4. Calendar (Kalender)

📄 **File:** `PRD_calendar.md`  
📊 **Size:** 338 lines, 21 KB  
🎯 **Focus:** Academic calendar, event management, notifications, integration

**Key Deliverables:**

- Calendar event CRUD (title, description, type, dates, times, location)
- Event types with color-coding: Ujian (red), Deadline (blue), Holiday (green), Acara (purple), Other (gray)
- Month view (calendar grid) + list view (sortable, filterable)
- Academic calendar settings (year, semesters, holidays)
- Holiday auto-display (grayed out, all-day)
- Student calendar integration (dashboard widget + upcoming events)
- Auto-sync with assignments/quizzes (deadline → calendar event)
- Draft/published event states
- Email notifications (1 day before, 1 hour before exam)

**Phase Timeline:**

- Phase 1 (Wk 1-2): MVP — Calendar CRUD, month/list views, academic settings
- Phase 2 (Wk 3-4): Student integration, notifications, event search
- Phase 3 (Wk 5-6): Recurring events (simple), stats, mobile responsive
- Hard Deadline: **2026-05-30**

**New Tables:**

- `calendar_events` (academic calendar events)
- `academic_calendar` (school calendar settings: year, semesters, holidays)
- `recurring_event_templates` (v1.1+)

**Key Metrics:**

- Calendar engagement: >70% of students view calendar monthly
- Missed deadlines: ~30% → <5%
- School adoption: >80% of schools use academic calendar (3+ events)

---

## Document Structure (All 4 PRDs)

Each PRD follows the same comprehensive format:

1. **Problem Statement** (2–3 paragraphs)
   - What's broken now?
   - Who's affected?
   - Cost of not solving

2. **Goals** (3–7 specific, measurable goals)

3. **Non-Goals** (3–5 explicitly OUT OF SCOPE for v1)

4. **User Stories** (Per persona: student, teacher, admin, engineer)
   - Formatted as "As a [persona], I want [capability] so that [benefit]"

5. **Requirements** (P0 / P1 / P2)
   - **P0 Must-Have**: Acceptance criteria in Given/When/Then format
   - **P1 Nice-to-Have**: Features that improve UX but not blocking
   - **P2 Future Considerations**: Intentionally deferred from v1

6. **Success Metrics**
   - **Leading Indicators** (fast: days–weeks)
   - **Lagging Indicators** (slow: weeks–months)
   - Targets and measurement methods

7. **Open Questions**
   - Blocking vs. non-blocking
   - Owner assigned
   - Decision deadline

8. **Timeline & Phases**
   - 4 phases typical: MVP → Feature Complete → Polish → Launch
   - Hard deadline (date certain)
   - Dependencies between phases

9. **Dependensi & Risiko**
   - Technical dependencies (tables, RPC, services)
   - Integration risks (concurrency, large data, etc.)
   - Edge cases + mitigation strategies

10. **Additional Sections**
    - Database schema references (table names, RLS policies, RPC functions)
    - UI/UX flows
    - Lifecycle diagrams
    - Email templates (if applicable)
    - Success checklist for developers

---

## Cross-Cutting Concerns (All Features)

### Language & Localization

✅ All user-facing copy in **Bahasa Indonesia**  
✅ Technical terms (table names, RPC functions, routes) in **English**  
✅ Error messages translated (no English Supabase errors)

### Design & UX

✅ Dark mode support: all components have `dark:` variants  
✅ Mobile responsive: works on phones, tablets, desktops  
✅ Loading states: skeleton loaders (no blank screens)  
✅ Accessibility: ARIA labels, keyboard navigation, tab order

### Database

✅ RLS policies enforced (tenant_id isolation)  
✅ No unprotected queries  
✅ Indexed queries (fast pagination)  
✅ Soft delete where appropriate (compliance)

### Code Quality

✅ >80% unit test coverage  
✅ E2E tests for critical workflows  
✅ TypeScript types (no `any`)  
✅ Error handling + logging  
✅ React Query for server state  
✅ Zustand for local feature state (if needed)

---

## Timeline Overview

| Feature        | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Hard Deadline |
| -------------- | ------- | ------- | ------- | ------- | ------------- |
| Administration | Wk 1-2  | Wk 3-4  | Wk 5-6  | Launch  | 2026-04-30    |
| Classroom      | Wk 1-2  | Wk 3-4  | Wk 5-6  | Launch  | 2026-05-15    |
| Moderation     | Wk 1-2  | Wk 3-4  | Wk 5-6  | Launch  | 2026-05-30    |
| Calendar       | Wk 1-2  | Wk 3-4  | Wk 5-6  | Launch  | 2026-05-30    |

---

## Key Success Metrics (Cross-Feature)

### Administration

- Admin overhead: 5–10 hrs/week → <2 hrs/week
- CSV import success: >95%
- Feature adoption: >80% of schools toggle ≥1 feature
- Audit coverage: 100% of admin actions logged

### Moderation

- Moderation queue response: <5% pending >24 hours
- Report submission rate: >50% of inappropriate content reported
- Student safety: >80% survey response "platform is safe"
- False positive rate: <10% (auto-flag accuracy)

### Classroom

- Join code adoption: >80% of students self-join (vs. manual)
- Teacher adoption: >50% of teachers create ≥1 class
- Support reduction: "How do I add students?" tickets ↓75%
- Enrollment accuracy: <1% discrepancy

### Calendar

- Student engagement: >70% view calendar monthly
- Deadline awareness: missed deadlines ~30% → <5%
- School adoption: >80% use calendar (3+ events)
- Notification open rate: >60% of deadline notifications opened

---

## Database Schema Summary

### New Tables (12 Total)

**Administration:**

- `import_jobs`

**Moderation:**

- `content_reports`
- `moderation_actions`
- `user_suspension_records`

**Classroom:**

- `classrooms`
- `classroom_members`
- `class_join_codes`
- `class_schedules`
- `class_announcements`

**Calendar:**

- `calendar_events`
- `academic_calendar`

### Modified Existing Tables

- `tenants`: Add `feature_flags` (JSON), `moderation_settings` (JSON), `school_name`, `timezone`, `academic_year`, etc.

---

## Implementation Notes for Developers

### General

1. Read PRD completely before starting
2. Clarify any blocking open questions before building
3. Implement P0 features first; P1/P2 are addons
4. Follow CLAUDE.md conventions:
   - Route protection: `RoleRoute role="teacher"` or `RoleRoute role={["student","teacher"]}`
   - useAuth() for identity
   - React Query for server state
   - Zustand for feature state (if needed)
   - Dark mode: test at `class="dark"` on html

5. Database first, then edge functions, then frontend
6. RLS policies locked down (tenant_id isolation)
7. No hardcoded user IDs, tenant IDs, credentials

### Testing

- Unit tests: >80% coverage (vitest)
- E2E tests: critical workflows (cypress or playwright)
- Accessibility: WCAG 2.1 AA (axe DevTools)
- Performance: FCP <1s, LCP <3s, CLS <0.1

### Documentation

- Update `src/features/[domain]/README.md` after launch
- Add entry to `docs/CHANGELOG.md`
- Update `docs/DATABASE.md` if schema changed
- Add entry to `docs/ENGINEERING_ROADMAP.md`

---

## Files Location

All files in: `/sessions/peaceful-exciting-hypatia/mnt/LMS/docs/prd/`

```
PRD_administration.md    (15 KB, 263 lines)
PRD_moderation.md        (18 KB, 317 lines)
PRD_classroom.md         (20 KB, 343 lines)
PRD_calendar.md          (21 KB, 338 lines)
INDEX.md                 (this file)
SUMMARY.md               (overview summary)
```

---

## Contact & Feedback

**Document Owner:** Head of Product, EduSync  
**Last Updated:** 2026-03-22  
**Status:** Draft (ready for review)

For questions or changes, refer to the Open Questions section in each PRD.
