# PRD — Guidance (Panduan Contextual)

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Live
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/guidance/`

---

## 1. Problem Statement

Meskipun EduSync menyediakan UI yang intuitif, fitur-fitur advanced (Course Builder, Gradebook, Assignment Scoring) masih membingungkan pengguna, terutama guru non-tech. User sering stuck di feature tertentu tanpa tahu ada opsi lain atau cara shortcut. Selain itu, ketika feature baru di-launch, user tidak tahu ada dan tidak pernah explore.

Masalah utama:

- **Guru:** Tidak sadar akan fitur advanced seperti bulk grading, automatic quiz correction, assignment rubric. Stuck di UI yang kompleks.
- **Siswa:** Tidak tahu bagaimana submit assignment dengan benar, tidak lihat feedback dari guru, lost di course flow.
- **Admin:** Tidak tahu fitur baru apa saja sudah available; sulit explain ke guru.
- **Feature Adoption:** Feature baru hanya adopt 10–20% pengguna dalam bulan pertama; many users never discover features.

Berbeda dari **Onboarding** (yang adalah **satu kali setup flow**), **Guidance** adalah **bantuan ongoing dalam product** — tooltips, banners untuk feature baru, guided tours interaktif untuk advanced workflows.

---

## 2. Goals

1. **Increase Feature Discovery:** 60% of active users discover and use ≥1 advanced feature (gradebook, bulk grading, rubrics, quiz reports) per month → goal: meningkatkan feature adoption dari 15% menjadi 60%.
2. **Reduce Support Load:** Bantuan in-app mengurangi support tickets 25%; guru bisa self-serve answers.
3. **Enable New Feature Adoption:** Ketika feature baru diluncurkan, banner + guided tour ensure 50%+ users are aware within week 1.
4. **Improve User Confidence:** User merasa confident navigate advanced features without reading documentation.
5. **Provide Contextual Help:** Smart tooltips, banners, tours appear at right time based on user behavior/role.

---

## 3. Non-Goals

1. **AI Chatbot** — LLM-powered Q&A deferred; manual help text sufficient untuk v1.
2. **Video Tutorials** — Embedded video guides deferred; text + inline illustrations sufficient.
3. **Help Search (Global Search Bar)** — Full-text search of help content deferred; contextual links only.
4. **Third-Party Integrations (Intercom, Drift)** — Managed support chat deferred; no external dependencies untuk v1.
5. **A/B Testing Infrastructure** — Guidance copy/triggers not A/B tested in v1; manual iteration only.
6. **Offline Help** — Help content only available online; no offline cache in v1.

---

## 4. User Stories

### Untuk Guru (Teacher)

- **US-G-T1:** Sebagai guru, saat pertama kali saya access Gradebook, saya melihat banner "Pro Tip: Bulk Grade" yang explain fitur bulk grading (select multiple students → grade all), sehingga saya tahu ada cara cepat.
  - Acceptance: Non-intrusive banner (top of gradebook); dismissible; show once per user per feature; include CTA "Learn More" → guided tour.

- **US-G-T2:** Sebagai guru, saat saya hover pada field "Rubric" di assignment form, tooltip muncul explain apa itu rubric dan why it helps consistency, sehingga saya encourage use it.
  - Acceptance: Info icon pada field; tooltip on hover; 1-2 sentence explanation; link ke "Setup Rubric" modal.

- **US-G-T3:** Sebagai guru, saat fitur baru "Quiz Auto-Score" diluncurkan, saya melihat feature announcement banner di dashboard dengan "Try It Out" button, sehingga saya immediately explore.
  - Acceptance: Top-of-page banner (dismissible); show once; highlight in sidebar; auto-hide after 7 days.

- **US-G-T4:** Sebagai guru, saya ingin "Take Guided Tour" button di toolbar (Gradebook, Assignment, Quiz) untuk learn fitur itu step-by-step.
  - Acceptance: Button (?) atau "Tutorial" in action menu; on click, launch Shepherd.js tour dengan 4–6 steps; highlight UI elements, explain workflow.

### Untuk Siswa (Student)

- **US-G-S1:** Sebagai siswa, saat saya pertama kali akses Assignment page, saya lihat inline banner "How to Submit" dengan 3 steps (click "New Submission" → upload file → click "Submit"), sehingga saya tidak bingung.
  - Acceptance: Collapsible info banner di top of assignment list; visual step-by-step; dismissible; show until user submits first assignment.

- **US-G-S2:** Sebagai siswa, saat saya hover pada grade icon (check/cross), tooltip explain apa arti itu icon (graded/pending/needs improvement), sehingga saya understand feedback.
  - Acceptance: Icon-based tooltip; show on hover; short explanation.

- **US-G-S3:** Sebagai siswa, saat guru post new assignment, saya melihat subtle notification in sidebar "New: Math Assignment due Friday", sehingga saya don't miss task.
  - Acceptance: Notification badge on sidebar; dismissible; click → go to assignment.

### Untuk Admin Sekolah (Admin)

- **US-G-A1:** Sebagai admin, saya ingin "Feature Status" page yang list semua features available, dengan enabled/disabled toggle per feature + "Help Guide" link untuk each feature.
  - Acceptance: Admin dashboard page; table: feature name, status, last updated, help link; toggle on/off; help link → guide modal or wiki link.

- **US-G-A2:** Sebagai admin, saat new feature released, saya ingin "Admin Release Notes" page dengan 1-paragraph summary + link ke "Share with Teachers" template email.
  - Acceptance: Release notes in admin dashboard; template email pre-filled; admin can customize + send to all teachers.

---

## 5. Requirements

### P0 — Must Have

| #   | Requirement                                | Acceptance Criteria                                                                                                                                                                                                                          |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Contextual Tooltips System**             | Info icon on key form fields; on hover/click show tooltip with 1–2 sentence explanation. Lucide `HelpCircle` or `Info` icon. Copy in Bahasa Indonesia. Customizable per field (via admin panel or hardcoded).                                |
| 2   | **Feature Announcement Banners**           | Top-of-page banner for new features; dismissible; shows once per user; auto-hide after 7 days or manual dismiss. Banner data in `feature_announcements` table with (title, description, feature_key, publish_date, expire_date).             |
| 3   | **Guided Tours (Shepherd.js Integration)** | Step-by-step interactive tours for 3–5 key features (course builder, gradebook, quiz, assignment submission, grading). Each tour: 4–6 steps, highlight UI elements, explain action at each step.                                             |
| 4   | **Contextual Help Triggers**               | Show help banner/tooltip based on user behavior (e.g., "You haven't created quiz yet — try Quiz Builder"; "This is your first time here — learn more"). Rules-based trigger system in `guidance_rules` table.                                |
| 5   | **Feature Guidance Content Library**       | Centralized table `guidance_content` with: content_id, title, description, feature_key, help_type (tooltip/banner/tour), role (teacher/student/admin), lang. Allow admin to edit some content (v1: at least banners + feature descriptions). |
| 6   | **Inline Links to Help**                   | Key UI elements include subtle "Learn More" or "?" link that opens help modal/tooltip or external wiki link. Links in buttons, headers, field labels.                                                                                        |
| 7   | **"Take Tour" Button**                     | Toolbar/action menu button in gradebook, assignment, quiz, course builder; on click launch pre-defined Shepherd tour for that feature.                                                                                                       |
| 8   | **RLS & Multi-Tenant**                     | All guidance content scoped to tenant_id where applicable. Teachers can only see guidance for roles they have. Students can only see student-level guidance. Admin can customize per tenant.                                                 |
| 9   | **Dark Mode Support**                      | All tooltips, banners, tour steps support dark mode with `dark:` Tailwind variants.                                                                                                                                                          |
| 10  | **Mobile Responsive**                      | Tooltips on mobile: tap info icon → show tooltip in modal (not hover). Banners stack and readable on small screens. Tours adjust highlight box for mobile viewport.                                                                          |
| 11  | **Guidance Analytics**                     | Track events: tooltip_shown, tooltip_clicked, banner_shown, banner_dismissed, tour_started, tour_completed. Store in `guidance_events` table for product analytics.                                                                          |
| 12  | **Documentation**                          | Create `src/features/guidance/README.md` with: guidance content structure, tour definitions, trigger rules, component API. Update `docs/DATABASE.md`.                                                                                        |

### P1 — Nice to Have

| #   | Requirement                      | Reasoning                                                                                                                                         |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Admin Guidance Editor UI**     | Admin panel to edit guidance content (banners, tooltips, tour copy) without code; WYSIWYG editor. Deferred: admin UX complexity.                  |
| 2   | **Contextual Video Links**       | Embed YouTube links in tooltips/banners; play embedded player in modal. Deferred: video production effort.                                        |
| 3   | **Feature Rollout per School**   | Admin can control which features are visible/enabled per tenant (feature flags). Deferred: complex flags infrastructure.                          |
| 4   | **Smart Suggestion Engine**      | ML-based suggestions: "You haven't graded quiz yet — want to try bulk grading?" Deferred: analytics pipeline setup.                               |
| 5   | **Guidance Analytics Dashboard** | Admin view: which guidance most helpful (CTR on learn more), which features need better help (high tour starts, low adoption). Deferred: BI work. |
| 6   | **Contextual Help Chatbot**      | LLM-powered Q&A integration (OpenAI API); answer "how do I X?" questions. Deferred: API cost, latency.                                            |

### P2 — Future Considerations

| #   | Item                                                | Reasoning                                                                                                        |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | **Multilingual Guidance**                           | Support English, Javanese, Sundanese; i18n for all guidance copy. Deferred: translation effort.                  |
| 2   | **Offline Guidance**                                | Cache guidance content locally (Service Worker); view when offline. Deferred: PWA cache strategy design.         |
| 3   | **Third-Party Help Integrations (Intercom, Drift)** | Managed chat widget + knowledge base. Deferred: external dependency, privacy review.                             |
| 4   | **Embedded Help Documentation (Gitbook)**           | Replace wiki with Gitbook; sync help content from Gitbook to guidance tables. Deferred: content management tool. |

---

## 6. Success Metrics

### Leading Indicators (hari–minggu)

| Metric                       | Target                                                 | Cara Ukur                                                                          |
| ---------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **Tooltip View Rate**        | 70% of teachers view ≥1 tooltip per week               | `SELECT COUNT(DISTINCT user_id) WHERE tooltip_shown_event >= 1` / active_teachers. |
| **Banner Dismiss Rate**      | <30% of users dismiss banners (should read them first) | `banner_dismissed_events / banner_shown_events`. Low dismiss = good engagement.    |
| **Tour Completion Rate**     | 60% of users who start tour complete all steps         | `tour_completed / tour_started`. High completion = tour is useful.                 |
| **Feature Announcement CTR** | 40% of users click "Learn More" on feature banners     | `banner_cta_click / banner_shown`.                                                 |
| **Help Link Click Rate**     | 30% of form tooltips clicked for "Learn More"          | `tooltip_help_click / tooltip_shown`.                                              |

### Lagging Indicators (minggu–bulan)

| Metric                                   | Target                                                                 | Cara Ukur                                                                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Feature Adoption (Advanced Features)** | 50% of teachers use bulk grading, rubrics, quiz reports within 4 weeks | Track `bulk_grading_used`, `rubric_created`, `quiz_report_viewed` events; calculate distinct user count / active_teachers. |
| **Support Ticket Reduction**             | Reduce guidance-related tickets from 20/week to <10/week               | Tag support tickets "guidance", "how-to", "feature question"; trend over 4 weeks.                                          |
| **Feature Satisfaction (Post-Tour NPS)** | Target 7.0+ NPS for tours                                              | Post-tour micro-survey: "Was this tour helpful?" (1-10 Likert).                                                            |
| **Help Content Usefulness**              | 70% of users rate help banners "helpful"                               | Prompt: "Was this helpful?" (Yes/No) on banner; measure Yes%.                                                              |
| **Time to Feature Proficiency**          | Teachers reach "expert" (5+ uses) of new feature within 2 weeks        | Track feature usage frequency; measure days from first use to 5th use.                                                     |

---

## 7. Open Questions

| #   | Pertanyaan                                                                                                | Owner       | Blocking?                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Should guidance banners be shown on all pages, or only on specific features?                              | Design      | Tidak — v1 show only on key features (gradebook, assignment, quiz, course builder). Expand later.                                 |
| 2   | Should tooltips be auto-triggered (show after N seconds) or only on hover/click?                          | Design      | Tidak — v1 hover/click only (less disruptive). Auto-trigger for critical safety info (confirm delete) in P1.                      |
| 3   | What's the priority order for creating 5 tours (course builder, gradebook, assignment, quiz, grading)?    | Product     | Tidak — prioritize by user frequency: gradebook (high), assignment (high), course builder (medium), quiz (medium), grading (low). |
| 4   | Should guidance content be editable by admin in v1, or hardcoded/updatable only by engineering?           | Product     | Tidak — v1 hardcoded is OK; admin editor in P1. Use feature flags to toggle content.                                              |
| 5   | Do we need to track which user dismissed which banner (to not re-show), or just once per user per banner? | Engineering | Tidak — once per user per banner is sufficient; store in `user_guidance_state` table.                                             |

---

## 8. Timeline & Phases

### Phase 1: Foundation (Week 1)

- [ ] Database schema: `guidance_content`, `feature_announcements`, `guidance_events`, `user_guidance_state`
- [ ] Shepherd.js integration + custom theme (Tailwind)
- [ ] UI components: TooltipIcon, FeatureBanner, TourTrigger

### Phase 2: Core Guidance Features (Week 2)

- [ ] Contextual tooltip system (integrate on 3–5 key forms)
- [ ] Feature announcement banners (integrate on dashboard + key pages)
- [ ] Tour creation for 3 key features (course builder, gradebook, assignment)
- [ ] Analytics event tracking

### Phase 3: Advanced Guidance (Week 3)

- [ ] Contextual help triggers (rules-based)
- [ ] "Take Tour" button integration
- [ ] Additional tours (quiz, grading)
- [ ] Dark mode + responsive audit

### Phase 4: Analytics & Launch Prep (Week 4)

- [ ] Guidance analytics dashboard (optional P1)
- [ ] Performance audit (tooltip render time, tour overlay performance)
- [ ] UAT with 5 teachers
- [ ] Documentation + soft launch

---

## 9. Dependensi & Risiko

### Dependensi

| Dependensi                           | Status     | Impact                                                           |
| ------------------------------------ | ---------- | ---------------------------------------------------------------- |
| Shepherd.js library                  | ⚠️ New     | Need to add as npm dependency; integrate with React + Tailwind.  |
| Supabase Auth & RLS                  | ✅ Live    | Needed for tenant-scoped guidance content.                       |
| React Query v5                       | ✅ Live    | Cache guidance content queries.                                  |
| Dark mode support (Tailwind)         | ✅ Live    | All guidance components must support dark mode.                  |
| Analytics framework (event tracking) | ⚠️ Partial | Need to implement event logging infrastructure (or use PostHog). |

### Risiko & Mitigasi

| Risiko                                                                                                   | Severity | Mitigasi                                                                                                         |
| -------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| **Guidance Fatigue** — Too many tooltips/banners = user annoyance, click away.                           | High     | Limit to 2–3 active guidance items per page; stagger rollout over 2–3 weeks; survey users weekly.                |
| **Shepherd.js Performance** — Tour overlays + JavaScript heavy; slow on low-end devices.                 | Medium   | Lazy-load Shepherd.js; use intersection observer to detect tours only when needed; monitor Core Web Vitals.      |
| **Guidance Copy Quality** — Poorly written tooltips confuse rather than help; need UX writing expertise. | High     | Hire UX writer or partner with product designer; iterate copy based on user feedback (surveys, support tickets). |
| **Inconsistent Guidance** — Copy mismatch with actual UI (UI changes but guidance doesn't).              | Medium   | Version guidance content with feature releases; owner of each feature updates own guidance. Document process.    |
| **Low Engagement** — Users ignore tooltips/banners (blindness to help); adoption low.                    | Medium   | A/B test banner copy + placement; survey users on visibility; consider animated tooltips (pulse effect).         |
| **Mobile Tooltip Overflow** — Tooltip text too long; overflows on mobile.                                | Low      | Test all tooltips on mobile; max 2 lines of text; wrap long text.                                                |

---

## 10. Acceptance Criteria for V1 Launch

**Teacher:**

- [ ] Sees tooltips on key form fields (title, rubric, enrollment policy, etc.)
- [ ] Sees feature announcement banner for new features
- [ ] Can click "Take Tour" button and complete interactive tour (e.g., Gradebook)
- [ ] Tours highlight correct UI elements and explain actions

**Student:**

- [ ] Sees help banner on assignment submission page (step-by-step guide)
- [ ] Sees tooltips on grade icons (explanation of feedback)
- [ ] Can dismiss/hide help banners

**Admin:**

- [ ] Can see feature status page (which features available)
- [ ] Can read release notes for new features
- [ ] Can customize tenant-wide feature toggles (P1: on/off features)

**Technical:**

- [ ] Guidance content in DB (not hardcoded UI strings)
- [ ] RLS enforces tenant-scoped guidance content
- [ ] Analytics events tracked (tooltip_shown, banner_dismissed, tour_started, tour_completed)
- [ ] Dark mode working on tooltips, banners, tours
- [ ] Mobile responsive (tooltip modal on tap, banner stack on small screens)
- [ ] Shepherd.js integration stable (no errors in console)
- [ ] Documentation updated

---

## 11. Implementation Notes for Engineers

### Database Schema

```sql
-- Guidance content library
CREATE TABLE guidance_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  key VARCHAR UNIQUE (e.g., 'tooltip_course_title', 'banner_bulk_grading'),
  title VARCHAR,
  description TEXT,
  help_type VARCHAR (tooltip, banner, tour, contextual),
  feature_key VARCHAR (e.g., 'course_builder', 'gradebook', 'assignment'),
  role VARCHAR[] (e.g., ['teacher'], ['student', 'teacher']),
  "order" INT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Feature announcements (time-based)
CREATE TABLE feature_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  feature_key VARCHAR,
  title VARCHAR,
  description TEXT,
  cta_label VARCHAR (e.g., 'Learn More', 'Try It'),
  cta_url VARCHAR,
  publish_date TIMESTAMP,
  expire_date TIMESTAMP,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now()
);

-- Tour definitions (structured data for Shepherd tours)
CREATE TABLE guidance_tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR UNIQUE (e.g., 'tour_gradebook', 'tour_assignment'),
  feature_key VARCHAR,
  title VARCHAR,
  steps JSONB (array of {element, title, description, action}),
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now()
);

-- User guidance state (dismissal, completion tracking)
CREATE TABLE user_guidance_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  guidance_key VARCHAR,
  dismissed_at TIMESTAMP,
  completed_at TIMESTAMP,
  view_count INT DEFAULT 0,
  last_viewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),

  CONSTRAINT unique_state UNIQUE (user_id, guidance_key)
);

-- Guidance analytics
CREATE TABLE guidance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  event_type VARCHAR (tooltip_shown, banner_shown, banner_cta_click, tour_started, tour_completed),
  guidance_key VARCHAR,
  metadata JSONB (e.g., {tour_step: 1, time_on_step: 5000}),
  created_at TIMESTAMP DEFAULT now()
);

-- Enable RLS
ALTER TABLE guidance_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_guidance_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE guidance_events ENABLE ROW LEVEL SECURITY;
```

### Feature Module Structure

```
src/features/guidance/
├── api/
│   ├── guidanceService.ts (fetch content, track events)
│   └── tourService.ts (build Shepherd tour from DB)
├── queries/
│   ├── guidanceKeys.ts (React Query keys)
│   └── guidanceQueries.ts (useQuery hooks)
├── hooks/
│   ├── useGuidance.ts (fetch contextual guidance)
│   ├── useTour.ts (manage tour state)
│   └── useGuidanceEvent.ts (track analytics)
├── types/
│   └── index.ts (GuidanceContent, Tour, GuidanceEvent types)
├── components/
│   ├── TooltipIcon.tsx (info icon + tooltip)
│   ├── FeatureBanner.tsx (announcement banner + CTA)
│   ├── TourTrigger.tsx (button to start tour)
│   ├── TourOverlay.tsx (Shepherd wrapper)
│   └── HelpLink.tsx (contextual help link)
├── data/
│   └── tours.ts (pre-defined tour definitions)
├── __tests__/
│   └── guidanceService.test.ts
└── README.md
```

### Route Structure

- **Teacher:** Tooltips/banners integrated into course builder, gradebook, assignment, quiz pages
- **Student:** Help banners on assignment, quiz pages; tooltips on grade icons
- **Admin:** `/#/app/admin/guidance` (feature status, release notes)

### Shepherd.js Integration

```typescript
// Example: useGuidance hook
const useTour = (featureKey: string) => {
  const [tour, setTour] = useState(null)

  useEffect(() => {
    if (!tour) {
      // Fetch tour definition from DB
      const tourDef = getTourDefinition(featureKey)
      const shepherdTour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          classes: 'shepherd-theme-custom dark:shepherd-theme-dark',
          scrollTo: { behavior: 'smooth', block: 'center' },
        },
      })

      tourDef.steps.forEach((step, idx) => {
        shepherdTour.addStep({
          id: step.id,
          text: step.description,
          element: step.element,
          buttons: [
            {
              action: idx === tourDef.steps.length - 1 ? 'complete' : 'next',
              text: idx === tourDef.steps.length - 1 ? 'Selesai' : 'Lanjut',
            },
          ],
        })
      })

      shepherdTour.on('complete', () => {
        trackGuidanceEvent('tour_completed', featureKey)
      })

      setTour(shepherdTour)
    }
  }, [featureKey, tour])

  return tour
}
```

---

## Glossary

| Term                | Definisi                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Guidance**        | Sistem in-app untuk help users memahami dan use features (tooltips, banners, tours). Berbeda dari Onboarding (one-time setup). |
| **Tooltip**         | Info icon + hover text yang explain field atau feature.                                                                        |
| **Feature Banner**  | Top-of-page announcement untuk feature baru atau important info. Dismissible.                                                  |
| **Guided Tour**     | Interactive step-by-step walkthrough (Shepherd.js) untuk workflow atau feature.                                                |
| **Contextual Help** | Help yang triggered berdasarkan user behavior atau current page/feature.                                                       |
| **Feature Rollout** | Launching fitur baru ke users; guidance ensure awareness + adoption.                                                           |
