# PRD — Onboarding (Orientasi Pengguna)

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Live
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/onboarding/`

---

## 1. Problem Statement

Penelitian awal menunjukkan bahwa **40% guru baru tidak menyelesaikan setup kursus pertama mereka dalam 2 minggu** pertama. Kompetitor seperti Moodle terkenal dengan kurva belajar yang curam — guru kebingungan dengan terlalu banyak opsi, tidak jelas langkah selanjutnya. EduSync harus **memandu guru dan admin baru melalui setup dengan checklist interaktif, progress visual, dan insentif penyelesaian**.

Masalah utama:

- **Admin Sekolah (Tenant Setup):** Saat first login, tidak tahu harus setup apa dulu (invite guru, buat kelas, setting, dll). Setup terbengkalai → sekolah tidak aktif.
- **Guru Baru:** Tidak jelas cara membuat kursus pertama; UI terlalu kompleks; abandon setelah 5 menit.
- **Siswa Baru:** Tidak tahu bagaimana navigate ke kursus atau mengerjakan tugas; butuh tutorial inline.
- **Retensi:** Churn rate 35% di minggu 1–2 karena user stuck; no guidance available.

**Competitive Context:** Ruangguru & Zenius memiliki guided onboarding yang baik. Untuk sekolah Indonesia dengan guru non-tech, onboarding yang **simple, visual, dan progress-driven** adalah kunci adoption.

---

## 2. Goals

1. **Reduce Churn:** 80% dari new users (admin/guru/siswa) complete onboarding checklist dalam 1 minggu pertama → goal: meningkatkan retention dari 65% menjadi 85% di week-2.
2. **Streamline Admin Setup:** Admin dapat setup sekolah (invite guru, buat kelas, setting dasar) dalam <30 menit tanpa support ticket.
3. **Empower Teacher:** Guru dapat membuat dan publish kursus pertama dalam <45 menit dengan guided wizard.
4. **Clarity for Students:** Siswa tahu bagaimana enroll, submit tugas, dan track progress tanpa confusion.
5. **Data-Driven Onboarding:** Track onboarding progress per user → identify bottleneck steps → iterate copy + UX.

---

## 3. Non-Goals

1. **Multilingual Onboarding (v1)** — Hanya Bahasa Indonesia di v1; English deferral ke v2.
2. **Video Tutorials** — Embedded video guides deferred; text + inline illustrations sufficient untuk v1.
3. **Contextual Help Chatbot** — AI-powered Q&A deferred; manual FAQ page is sufficient.
4. **Gamified Onboarding (Badges/XP)** — Defer ke P1; focus on completion, not gamification.
5. **Export/Share Onboarding Progress** — Tidak perlu share progress dengan orang lain di v1.
6. **Mobile Onboarding Flow** — v1 desktop-first; mobile onboarding flows same as desktop (just responsive).

---

## 4. User Stories

### Untuk Admin Sekolah (School Administrator)

- **US-O-A1:** Sebagai admin sekolah, saat pertama login, saya melihat onboarding checklist dengan langkah-langkah jelas (invite guru, buat kelas, setting sekolah), sehingga saya tidak bingung mulai dari mana.
  - Acceptance: Modal/page "Setup Checklist" muncul on first login; 4–6 checklistable tasks; progress bar; skip option (tapi di-encourage lanjut).

- **US-O-A2:** Sebagai admin, saya ingin invite guru dalam 1 klik (email form), dan langsung checklist task ini done; tidak perlu step tambahan.
  - Acceptance: Inline email input form di checklist; "Send Invite" button; toast confirmation; checkbox otomatis checked setelah success.

- **US-O-A3:** Sebagai admin, saya ingin create kelas pertama dengan nama dan guru pembimbing dalam <2 menit dari checklist.
  - Acceptance: Mini form di checklist "Buat Kelas Pertama"; auto-redirect ke class detail setelah success; checkbox done.

- **US-O-A4:** Sebagai admin, saya ingin completion badge/success screen saat semua checklist done, dan encouraged untuk invite lebih banyak guru.
  - Acceptance: "Setup Selesai! 🎉" screen; show stats (X guru invited, Y kelas dibuat); CTA "Invite Guru Lainnya" atau "View Dashboard".

### Untuk Guru (Teacher)

- **US-O-T1:** Sebagai guru baru, saat pertama kali akses "Course Builder", saya lihat mini-onboarding "Buat Kursus Pertama" dengan langkah 1–5 (Title → Modules → Lessons → Publish → Done).
  - Acceptance: Modal overlay "Panduan Cepat: Buat Kursus"; step-by-step numbered; dapat skip; progress counter (Step 1/5).

- **US-O-T2:** Sebagai guru, saya ingin inline tooltips pada form fields (judul kursus, modul, pelajaran) untuk explain apa field ini untuk.
  - Acceptance: Hover tooltip (Lucide `HelpCircle` icon) with brief 1-sentence explanation per field; copy in Bahasa Indonesia.

- **US-O-T3:** Sebagai guru, saya ingin banner "You're almost there!" saat saya publish kursus pertama, dengan CTA "View in Catalog" atau "Invite Students".
  - Acceptance: Toast/banner notification; dissmissible; show "1 Kursus Published" stat di sidebar.

- **US-O-T4:** Sebagai guru, saya ingin tahu progress saya per course (lessons created, students enrolled) via simple dashboard card di homepage.
  - Acceptance: "Kursus Saya" card with 3–4 stats per course (lessons, enrolled students, avg score); link ke course builder.

### Untuk Siswa (Student)

- **US-O-S1:** Sebagai siswa, saat pertama login, saya melihat "Welcome!" page yang explain apa itu EduSync, bagaimana browse & enroll kursus, submit tugas, dalam bahasa yang mudah dipahami.
  - Acceptance: Single page with 3–4 sections; illustrations; main CTA "Mulai Belajar" → course catalog; can skip.

- **US-O-S2:** Sebagai siswa, saya ingin guided tour untuk fitur utama (enroll course, submit assignment, view grades) saat pertama kali access feature tersebut.
  - Acceptance: Shepherd.js/Intro.js integration; highlight relevant UI; 3–5 steps per tour; tooltip text in Bahasa Indonesia.

- **US-O-S3:** Sebagai siswa, saya ingin clear visual progress bar per course sehingga tahu saya sudah selesai % berapa.
  - Acceptance: Progress bar on course card + course detail page; show "3/10 Lessons Done" text below bar.

- **US-O-S4:** Sebagai siswa, saya ingin receive completion notification saat saya finish kursus, dengan option download certificate.
  - Acceptance: Toast + banner notification; "Selamat! Anda telah menyelesaikan [Course Name]"; button "Download Sertifikat".

---

## 5. Requirements

### P0 — Must Have

| #   | Requirement                           | Acceptance Criteria                                                                                                                                                                                                                                                |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Admin Onboarding Checklist**        | Modal/page on first login with 5–6 tasks (invite guru, buat kelas, setting, upload logo). Each task: description, CTA button, checkbox. Progress bar (X/6 done). Save checklist state in `onboarding_checklist` table (user_id, tenant_id, task_id, completed_at). |
| 2   | **Teacher Course Creation Wizard**    | Step-by-step wizard for first course: Title → Cover Image → Add 1st Module → Add 1st Lesson → Publish → Done. Each step has inline help text. Store wizard progress in DB; user can resume from last step.                                                         |
| 3   | **Inline Tooltips (Contextual Help)** | Info icon on form fields in builder (title, description, level, etc.); on hover/click show tooltip with 1-sentence explanation in Bahasa Indonesia. Use Lucide `HelpCircle` icon.                                                                                  |
| 4   | **Welcome Screen for New Students**   | On first login, show welcome modal/page explaining EduSync basics; main CTA "Explore Courses"; can skip and go to dashboard.                                                                                                                                       |
| 5   | **Onboarding Progress Tracking**      | Table `user_onboarding_progress`: tracks user_id, feature (admin_setup/teacher_course/student_guide), step_completed, completed_at, updated_at. Enable product analytics (% users completed per step).                                                             |
| 6   | **Completion Badges & CTA**           | When user completes onboarding checklist, show success screen with stats (X teachers invited, Y courses created) + next CTA (invite more, view dashboard).                                                                                                         |
| 7   | **RLS & Multi-Tenant**                | All onboarding data scoped to tenant_id. Users can only view/complete own onboarding checklist. Admin can see tenant-wide completion % via analytics view.                                                                                                         |
| 8   | **Dark Mode Support**                 | All onboarding components support dark mode with `dark:` Tailwind variants. Test with `class="dark"` on html.                                                                                                                                                      |
| 9   | **Mobile Responsive**                 | Checklist card responsive (full width on mobile, sidebar on desktop). Modals centered & scrollable on small screens. Wizard buttons stack on mobile.                                                                                                               |
| 10  | **Dismiss & Restore Onboarding**      | User can hide/dismiss onboarding checklist from view. "Onboarding" menu item in settings to restore it. Completed items cannot be "un-done" but user can reset full checklist (admin only).                                                                        |
| 11  | **Documentation**                     | Create `src/features/onboarding/README.md` with: table schema, RPC list, component structure, onboarding flow diagrams. Update `docs/DATABASE.md` with new tables.                                                                                                 |

### P1 — Nice to Have

| #   | Requirement                             | Reasoning                                                                                                                                                                |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Email Onboarding Sequence**           | Send follow-up emails (day 1, day 3, day 7) if user hasn't completed onboarding; encouragement + links to next steps. Requires Supabase Email or third-party (SendGrid). |
| 2   | **Guided Tours (Shepherd.js)**          | Interactive step-by-step tours for main features (course builder, gradebook, assignment submission). Trigger on first access to feature or via "Take Tour" button.       |
| 3   | **Onboarding Analytics Dashboard**      | Admin view: % completion rate per role, avg time to complete, drop-off at each step, funnel visualization. Export CSV.                                                   |
| 4   | **Video Walkthrough Links**             | Link to YouTube videos (hosted on school channel) for onboarding steps; embedded player in tooltip or modal. Deferred: content production effort.                        |
| 5   | **Onboarding Customization per School** | Admin can customize onboarding copy, logo, colors, task order per tenant. Deferred: admin UX complexity.                                                                 |
| 6   | **Gamified Onboarding (Badges)**        | Award badges for completing milestones (first course, first quiz, 10 students enrolled, etc.). Show on profile. Links to gamification system.                            |

### P2 — Future Considerations

| #   | Item                                                | Reasoning                                                                                                                           |
| --- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **AI-Powered Contextual Help (Chatbot)**            | LLM-based Q&A for onboarding questions; integrates with product to answer "how do I X?" Deferred: LLM API cost, response latency.   |
| 2   | **Bulk User Onboarding via CSV**                    | Admin upload CSV of teachers/students; auto-send onboarding links. Deferred: import logic, error handling complex.                  |
| 3   | **Third-Party Integration (Google Classroom Sync)** | Auto-import classes/students from Google Classroom; auto-complete relevant onboarding steps. Deferred: OAuth, data sync complexity. |
| 4   | **Personalized Learning Path**                      | Onboarding recommends features based on school profile (size, subjects, grade levels). Deferred: recommendation engine design.      |
| 5   | **Offline Onboarding (PWA)**                        | Onboarding checklist downloadable/workable offline; sync when online. Deferred: offline state management.                           |

---

## 6. Success Metrics

### Leading Indicators (hari–minggu)

| Metric                                   | Target                                                                | Cara Ukur                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Onboarding Checklist Completion Rate** | 80% of new users (admin) complete ≥3/6 tasks within day 1             | `SELECT COUNT(DISTINCT user_id) WHERE role='admin' AND completed_tasks >= 3` / new_admin_users. |
| **Teacher First Course Time**            | 50% of teachers create first course within 3 days                     | Measure `courses.created_at` for each teacher; count those <3 days after first login.           |
| **Student Welcome Screen View Rate**     | 95% of new students see welcome screen                                | `SELECT COUNT(*) WHERE onboarding_event='welcome_shown'` / new_student_users.                   |
| **Tooltip Interaction Rate**             | 60% of teachers hover/click form tooltips in builder                  | Analytics: `help_icon_click` / form visits; track Lucide HelpCircle interactions.               |
| **Wizard Completion per Step**           | 90% complete step 1 (title), 85% step 2 (cover), 75% step 5 (publish) | Funnel: track `wizard_step_completed` events per step_id.                                       |

### Lagging Indicators (minggu–bulan)

| Metric                                            | Target                                             | Cara Ukur                                                                                                |
| ------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **7-Day Active User Retention**                   | Increase from 65% to 80%                           | `SELECT COUNT(DISTINCT user_id) WHERE last_active_at >= 7_days_ago` / cohort_size.                       |
| **Admin Churn (No Activity)**                     | Reduce admin churn from 30% to <15% in month 1     | Count admin users inactive >14 days after onboarding_completion.                                         |
| **Teacher Course Creation Rate**                  | 70% of teachers create ≥1 course within 30 days    | `SELECT COUNT(DISTINCT created_by) FROM courses WHERE created_at <= 30_days_ago` / active_teacher_count. |
| **Student Enrollment Rate**                       | 60% of students enroll in ≥1 course within 14 days | `SELECT COUNT(DISTINCT user_id) FROM enrollments WHERE enrolled_at <= 14_days_ago` / student_user_count. |
| **Net Promoter Score (NPS)**                      | Target 40+ (good for edu SaaS)                     | Post-onboarding survey: "How likely to recommend EduSync to colleague?" (1-10 Likert).                   |
| **Support Ticket Reduction (Onboarding-related)** | Reduce from ~15/week to <5/week                    | Count support tickets tagged "onboarding" or "first-time setup".                                         |

---

## 7. Open Questions

| #   | Pertanyaan                                                                                                        | Owner       | Blocking?                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Should admin onboarding be mandatory (block dashboard until done) or optional (checklist in sidebar)?             | Product     | Ya — need decision before component design. Recommend: mandatory modal, but can skip (encourage); show again in sidebar reminder. |
| 2   | Should teacher wizard auto-save each step to DB, or only save on "Finish"?                                        | Engineering | Tidak — auto-save per step is safer (resume capability); requires transactional DB design.                                        |
| 3   | For student welcome screen, should we collect any data (grade, interests) to personalize dashboard?               | Product     | Tidak — v1 keep simple; no form fields; just informational. Personalization in P1.                                                |
| 4   | Should onboarding include "Invite First Student" task for teachers, or just courses?                              | Product     | Tidak — v1 focus on course creation; student enrollment happens naturally via course catalog. Invite in P1.                       |
| 5   | What if user completes task but later undoes it (e.g., deletes the only course created)? Mark task as incomplete? | Engineering | Tidak — mark task once, don't regress; focus on encouraging progress, not penalizing.                                             |
| 6   | Do we need i18n infrastructure for onboarding tooltips/copy in v1, or hardcode Indonesian for now?                | Engineering | Tidak — hardcode Indonesian for v1; i18n framework in v2 is OK.                                                                   |

---

## 8. Timeline & Phases

### Phase 1: Foundation (Week 1)

- [ ] Database schema: `onboarding_checklist`, `user_onboarding_progress`, task definitions
- [ ] RLS policies + RPC foundation (fetch checklist, mark task done)
- [ ] UI components: ChecklistCard, ChecklistTask, TooltipIcon

### Phase 2: Admin & Teacher Onboarding (Week 2)

- [ ] Admin checklist modal + integration with dashboard
- [ ] Teacher course wizard (Step-by-step UI)
- [ ] Inline tooltips on builder forms
- [ ] Progress tracking + completion badge

### Phase 3: Student Onboarding & Polish (Week 3)

- [ ] Student welcome screen
- [ ] Completion notifications (toast)
- [ ] Dark mode + responsive audit
- [ ] Documentation

### Phase 4: Analytics & Launch Prep (Week 4)

- [ ] Onboarding analytics dashboard (optional P1)
- [ ] Performance audit (modal load time, tooltip rendering)
- [ ] UAT with 5 teachers + 10 students
- [ ] Soft launch to 1 school

---

## 9. Dependensi & Risiko

### Dependensi

| Dependensi                   | Status  | Impact                                                      |
| ---------------------------- | ------- | ----------------------------------------------------------- |
| Supabase Auth & RLS          | ✅ Live | Needed for user identity + multi-tenant isolation.          |
| React Query v5               | ✅ Live | For onboarding checklist query caching.                     |
| Zustand (local state)        | ✅ Live | Can store wizard step locally (e.g., `useOnboardingStore`). |
| Dark mode support (Tailwind) | ✅ Live | All components must support dark mode.                      |
| Lucide React icons           | ✅ Live | HelpCircle, CheckCircle, etc. for UI.                       |

### Risiko & Mitigasi

| Risiko                                                                                     | Severity | Mitigasi                                                                                          |
| ------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------- |
| **Onboarding Modal Fatigue** — Too many modals confuse users; users skip all.              | Medium   | Keep checklist to 5–6 tasks max; allow skip; show progress bar to motivate. UX test with 5 users. |
| **Wizard Data Loss** — User fills form but closes browser; progress lost.                  | High     | Auto-save each wizard step to DB in real-time; on resume, populate form with last saved data.     |
| **Tooltip Overcrowding** — Too many info icons clutter form; UX degraded.                  | Low      | Limit tooltips to 3–4 most critical fields per form; A/B test.                                    |
| **Analytics Event Spam** — Tracking every interaction creates too much data.               | Low      | Sample events (e.g., 10% of tooltip clicks); focus on critical funnel events.                     |
| **Low Mobile Adoption** — Mobile users skip onboarding or have broken UI.                  | Medium   | QA test onboarding on mobile (iOS + Android); ensure touch targets >44px; modal scrollable.       |
| **Race Condition on Task Completion** — Two concurrent requests mark same task done twice. | Low      | Use DB unique constraint on (user_id, task_id); idempotent RPC.                                   |

---

## 10. Acceptance Criteria for V1 Launch

**Admin:**

- [ ] Sees onboarding checklist on first login
- [ ] Can complete all 5–6 checklist tasks
- [ ] Gets success screen + "Setup Complete" badge
- [ ] Can dismiss and restore checklist from settings

**Teacher:**

- [ ] Sees step-by-step course creation wizard
- [ ] Can create + publish first course via wizard (<45 min)
- [ ] Sees tooltips on form fields
- [ ] Receives notification when course published

**Student:**

- [ ] Sees welcome screen on first login
- [ ] Can skip welcome screen
- [ ] Sees progress bar on course cards
- [ ] Receives notification on course completion

**Technical:**

- [ ] Onboarding checklist data saved in DB (tenant-scoped)
- [ ] Wizard progress resumable across sessions
- [ ] Dark mode working on all new components
- [ ] Mobile responsive (tested on mobile device)
- [ ] Zero data leakage (RLS enforced)
- [ ] Documentation updated

---

## 11. Implementation Notes for Engineers

### Database Schema

```sql
-- Onboarding Tasks (static, seeded data)
CREATE TABLE onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key VARCHAR UNIQUE (e.g., 'invite_teachers', 'create_first_class'),
  title TEXT NOT NULL (e.g., 'Undang Guru'),
  description TEXT,
  icon VARCHAR (e.g., 'users', 'plus'),
  "order" INT DEFAULT 1,
  required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now(),

  CONSTRAINT tenant_key UNIQUE (tenant_id, key)
);

-- User's onboarding checklist state
CREATE TABLE user_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES onboarding_tasks(id) ON DELETE CASCADE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT unique_progress UNIQUE (user_id, task_id)
);

-- Teacher's course creation wizard state
CREATE TABLE onboarding_wizard_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  wizard_type VARCHAR (e.g., 'course_creation'),
  current_step INT DEFAULT 1,
  data JSONB (stores form data: {title, cover_image_url, modules, lessons}),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Enable RLS
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_wizard_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant's tasks"
  ON onboarding_tasks FOR SELECT
  USING (tenant_id = (SELECT get_my_tenant_id()));

CREATE POLICY "Users can only view their own progress"
  ON user_onboarding_progress FOR SELECT
  USING (user_id = auth.uid());
```

### Feature Module Structure

```
src/features/onboarding/
├── api/
│   ├── onboardingService.ts (API calls)
│   └── wizardService.ts (wizard state management)
├── queries/
│   ├── onboardingKeys.ts (React Query keys)
│   └── onboardingQueries.ts (useQuery hooks)
├── hooks/
│   ├── useOnboarding.ts (fetch checklist, mark done)
│   └── useWizard.ts (wizard step management)
├── store/
│   └── wizardStore.ts (Zustand: current step, form data)
├── types/
│   └── index.ts (ChecklistTask, OnboardingProgress, etc.)
├── components/
│   ├── ChecklistCard.tsx
│   ├── ChecklistTask.tsx
│   ├── CompletionBadge.tsx
│   ├── CourseWizard.tsx
│   ├── WelcomeScreen.tsx
│   ├── TooltipIcon.tsx
│   └── OnboardingModal.tsx
├── __tests__/
│   └── onboardingService.test.ts
└── README.md
```

### Route Structure

- **Admin:** First login redirects to onboarding modal (or sidebar reminder)
- **Teacher:** `/#/app/teacher/course-builder?onboarding=true` triggers wizard
- **Student:** First login shows welcome modal; can skip to `/#/app/student/dashboard`

---

## Glossary

| Term                       | Definisi                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------- |
| **Onboarding Checklist**   | To-do list bagi user baru untuk complete setup (e.g., invite teachers, create class). |
| **Course Creation Wizard** | Step-by-step guided form untuk buat kursus (title → modules → lessons → publish).     |
| **Contextual Tooltip**     | Info icon + hover text yang explain form field atau feature.                          |
| **Onboarding Task**        | Single atomic action dalam checklist (e.g., "Invite Guru Pertama").                   |
| **Wizard Step**            | Single page/section dalam multi-step form (e.g., Step 1: Course Title).               |
| **Completion Badge**       | Visual indicator (icon + text) shown when user finish onboarding.                     |
