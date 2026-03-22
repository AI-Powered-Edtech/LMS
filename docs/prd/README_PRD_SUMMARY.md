# EduSync LMS — PRD Summary (4 Feature Modules)

**Tanggal:** 2026-03-22  
**Total Dokumentasi:** 1,607 baris  
**Lokasi:** `/docs/prd/`

---

## 📋 4 PRD yang Telah Dibuat

### 1. Onboarding (Orientasi Pengguna) — 365 baris

**File:** `PRD_onboarding.md`

**Masalah:**

- 40% guru baru tidak selesaikan setup kursus pertama dalam 2 minggu
- Admin confusion pada first-time setup (multiple options, no clear path)
- Student onboarding experience fragmented

**Solusi Core:**

- Admin Checklist (5–6 tasks: invite guru, buat kelas, setup sekolah)
- Teacher Course Creation Wizard (5-step guided form)
- Student Welcome Screen (informational)
- Completion badges + celebration screen

**Success Metrics:**

- 80% onboarding checklist completion rate
- 7-day retention: 65% → 85%
- Time-to-setup: admin <30 min, teacher <45 min, student instant

**Database Tables:**

- `onboarding_tasks`, `user_onboarding_progress`, `onboarding_wizard_state`

**Timeline:** 4 minggu

---

### 2. Guidance (Panduan Contextual) — 416 baris

**File:** `PRD_guidance.md`

**Masalah:**

- Advanced features (bulk grading, rubrics, quiz reports) tidak di-discover
- Feature adoption baru 10–20% dalam bulan pertama
- Teacher stuck di UI kompleks; support load tinggi

**Solusi Core:**

- Contextual Tooltips (HelpCircle icon + hover text di form fields)
- Feature Announcement Banners (top-of-page, time-based, dismissible)
- Shepherd.js Guided Tours (4–6 interactive steps per feature)
- Rules-based Contextual Help (trigger when user behavior detected)
- Guidance Analytics (event tracking untuk tooltip_shown, banner_cta_click, tour_completed)

**Success Metrics:**

- 70% tooltip view rate
- 60% tour completion rate
- Support ticket reduction: 15/week → <5/week

**Database Tables:**

- `guidance_content`, `feature_announcements`, `guidance_tours`, `guidance_events`, `user_guidance_state`

**Timeline:** 4 minggu

---

### 3. Storage (Penyimpanan File) — 433 baris

**File:** `PRD_storage.md`

**Masalah:**

- File upload system tidak aman (data leakage antar tenant)
- No quota management (storage cost explosion risk)
- Performance issues (large file timeouts)
- File organization scattered (teachers lost files)

**Solusi Core:**

- Supabase Storage integration (tenant-scoped paths)
- RLS policies (zero cross-tenant access)
- File upload service (progress tracking, retry logic, file validation)
- Quota enforcement (per-tenant limits, block upload if exceeded)
- File Manager UI (teacher file browser dengan search, sort, delete)
- Storage usage tracking + admin analytics

**File Limits:**

- Lesson materials: 50 MB
- Assignment rubrics: 10 MB
- Student submissions: 100 MB

**Success Metrics:**

- 99% upload success rate
- Upload performance p50: <5 sec (untuk <10 MB files)
- Average storage per tenant: 2–5 GB
- 15% storage cost reduction via cleanup

**Database Tables:**

- `file_uploads`, `storage_usage`, `storage_quotas`

**Timeline:** 4 minggu

---

### 4. Question Bank (Bank Soal) — 393 baris

**File:** `PRD_question_bank.md`

**Masalah:**

- Guru membuat soal berulang (no reuse mechanism)
- Quiz creation time: 30–45 menit (80% untuk write soal)
- No metadata tracking (topic, difficulty, learning outcomes)
- No quality audit atau curriculum alignment

**Solusi Core:**

- Save-to-Bank feature (checkbox dalam quiz builder)
- Multi-tag system (topic, difficulty, learning outcome)
- Full-text search (indexed on question_text)
- Question browser (sidebar dalam quiz builder untuk add dari bank)
- Question snapshot (copy soal saat add ke quiz; edit bank ≠ retroactive change)
- Usage analytics (% reuse, avg score, used_in_quiz_count)
- Teacher + Admin analytics dashboards

**Question Types:**

- MCQ (multiple choice)
- Short answer (text input)

**Success Metrics:**

- 80% teacher participation in question bank
- 40% of quiz questions sourced dari bank (vs. create new)
- 50% reduction quiz creation time (30 min → 15 min)
- 30% of questions reused dalam 3+ quizzes

**Database Tables:**

- `question_bank_items`, `question_bank_tags`, `question_usage`

**Timeline:** 4 minggu

---

## 🔑 Key Features Across All PRDs

| Feature                | Onboarding | Guidance   | Storage    | Question Bank |
| ---------------------- | ---------- | ---------- | ---------- | ------------- |
| **RLS & Multi-Tenant** | ✓          | ✓          | ✓ Critical | ✓             |
| **Dark Mode**          | ✓          | ✓          | ✓          | ✓             |
| **Mobile Responsive**  | ✓          | ✓          | ✓          | ✓             |
| **Database Tables**    | 3          | 5          | 3          | 3             |
| **User Stories**       | 14         | 13         | 12         | 12            |
| **P0 Requirements**    | 11         | 12         | 16         | 14            |
| **Risk Items**         | 6          | 6          | 6          | 5             |
| **Success Metrics**    | 5 LI, 5 LL | 5 LI, 5 LL | 5 LI, 5 LL | 5 LI, 5 LL    |

_LI = Leading Indicators, LL = Lagging Indicators_

---

## 📊 Critical Success Factors per Feature

### Onboarding

**Most Critical Risk:** Checklist fatigue → users skip all → no adoption
**Mitigation:** Max 5–6 tasks, clear progress bar, skip button dengan encouragement

### Guidance

**Most Critical Risk:** Tooltip overload → user blindness → no engagement
**Mitigation:** Limit 2–3 active items per page, A/B test copy + placement

### Storage

**Most Critical Risk:** Cross-tenant data leakage (security)
**Mitigation:** Thorough RLS testing (10 test cases), penetration test, code review

### Question Bank

**Most Critical Risk:** Question edit breaking past quiz
**Mitigation:** Snapshot approach (copy soal, don't reference)

---

## 🛠️ Tech Stack Alignment

**Semua 4 PRD menggunakan:**

- React 19 + Vite + TypeScript 5.8 + Tailwind CSS v4
- Supabase (Auth, RLS, Storage, Edge Functions)
- React Query v5 (server state management)
- Zustand v5 (local state — optional per feature)
- Lucide React (icons)
- Framer Motion / `motion` (animations)
- Shepherd.js (guided tours — Guidance feature)

**Routing:** Hash routing (`/#/app/...`)
**Language:** 100% Bahasa Indonesia (UI) + English (technical terms)

---

## 📝 Database Design Patterns

**Setiap PRD mengikuti pattern yang sama:**

1. Core tables (feature-specific)
2. RLS policies (`tenant_id` scoped, role-based access)
3. Analytics tables (event logging, usage tracking)
4. User state tables (progress, preferences)

**Contoh pattern (Storage):**

```sql
-- Core
CREATE TABLE file_uploads (..., tenant_id, uploader_id, file_path, ...)

-- RLS
CREATE POLICY "Users can view their tenant's files"
  ON file_uploads FOR SELECT
  USING (tenant_id = (SELECT get_my_tenant_id()))

-- Analytics
CREATE TABLE storage_usage (..., tenant_id, total_bytes_used, ...)
```

---

## 🎯 Implementation Roadmap (16 Weeks Total)

### Week 1–4: Onboarding

- ✓ Schema finalized
- ✓ RLS policies
- ✓ Core components (Checklist, Wizard, Welcome)
- ✓ Analytics integration

### Week 5–8: Guidance

- ✓ Tooltip system (integrate on 3–5 forms)
- ✓ Feature banners (dashboard + key pages)
- ✓ 3 guided tours (course builder, gradebook, assignment)
- ✓ Event tracking

### Week 9–12: Storage

- ✓ Supabase Storage + RLS
- ✓ Upload service (progress tracking, retry)
- ✓ Quota enforcement
- ✓ File manager UI + admin analytics

### Week 13–16: Question Bank

- ✓ Bank schema + tagging system
- ✓ Quiz builder integration ("Add from Bank")
- ✓ Question browser + search
- ✓ Usage analytics + teacher stats dashboard

---

## 📚 Documentation Checklist (Per PRD)

Setiap PRD includes:

- [ ] Problem statement + competitive context
- [ ] 5 SMART goals
- [ ] 3–5 non-goals (explicitly out of v1)
- [ ] 12–14 user stories (4–6 personas)
- [ ] 11–16 P0 requirements (acceptance criteria)
- [ ] 5–8 P1 nice-to-have requirements
- [ ] 3–5 P2 future considerations
- [ ] 10 success metrics (leading + lagging)
- [ ] 5–7 open questions (with owners)
- [ ] 4-phase timeline with deliverables
- [ ] 5–6 dependency items
- [ ] 5–6 risk items + mitigation
- [ ] 10–15 acceptance criteria (launch checklist)
- [ ] Database schema (full SQL)
- [ ] Feature module structure (directories + files)
- [ ] Route structure
- [ ] 10+ glossary terms

**Total: 1,607 baris dokumentasi actionable-grade**

---

## 🚀 Launch Readiness Criteria

**Untuk launch setiap feature:**

1. ✓ All P0 requirements implemented + tested
2. ✓ RLS policies enforced (security audit passed)
3. ✓ Dark mode working on all new components
4. ✓ Mobile responsive (tested on iOS + Android)
5. ✓ Database schema matches PRD (no divergence)
6. ✓ Documentation updated (DATABASE.md, feature README)
7. ✓ Zero production data leaks
8. ✓ Performance budget met (load times, query times)
9. ✓ UAT passed with 5+ beta users
10. ✓ Acceptance criteria checklist 100% complete

---

## 📞 How to Use This PRD Suite

**For Engineers:**

- Start with "Implementation Notes" section (database schema, component structure)
- Reference "User Stories" for acceptance criteria (BDD-style)
- Check "Open Questions" for design decisions before coding

**For Product Managers:**

- Use "Goals" + "Success Metrics" for OKR alignment
- Track "Dependensi & Risiko" for project planning
- Monitor "Leading Indicators" weekly, "Lagging Indicators" monthly

**For Designers:**

- Reference "User Stories" for UX flows
- Check "Non-Goals" to avoid scope creep
- Use "Feature Module Structure" for component hierarchy

**For Admins/Ops:**

- Monitor "Success Metrics" (infrastructure needs, storage quota)
- Plan for "Cleanup/Retention policies" (automated jobs)
- Setup "Monitoring alerts" based on metric targets

---

## 🔗 Related Documents

- `docs/ARCHITECTURE.md` — system overview (update after features added)
- `docs/DATABASE.md` — full schema reference (update per PRD)
- `docs/AUTH.md` — auth flow (no changes, but reference RLS patterns)
- `docs/TESTING.md` — test accounts, known limitations
- `docs/ENGINEERING_ROADMAP.md` — phase status (update to Phase 5+)

---

## ✅ Verification Checklist

- [x] 4 PRDs created (365 + 416 + 433 + 393 = 1,607 baris)
- [x] All PRDs follow EduSync v1 template
- [x] All PRDs aligned with CLAUDE.md conventions
- [x] Database schema specified + RLS policies clear
- [x] Feature module structures defined
- [x] Success metrics measurable + actionable
- [x] Acceptance criteria detailed (BDD-style)
- [x] Timeline realistic (4-week per feature)
- [x] Glossary complete (10+ terms per feature)
- [x] 100% user-facing text in Bahasa Indonesia

**Status:** ✅ READY FOR IMPLEMENTATION

---

**Generated:** 2026-03-22  
**Version:** 1.0  
**For:** EduSync LMS Engineering Team
