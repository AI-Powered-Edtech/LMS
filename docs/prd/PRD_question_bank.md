# PRD — Question Bank (Bank Soal)

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Live
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/question_bank/`

---

## 1. Problem Statement

Guru Indonesia sering membuat soal berkali-kali untuk quiz/assessment berbeda. Saat ini, tidak ada cara untuk **simpan soal di bank central, tag berdasarkan topik/tingkat kesulitan, dan reuse di quiz lain**. Setiap kali membuat quiz baru, guru harus create soal dari awal → buang waktu, tidak ada konsistensi.

Masalah utama:

- **Efisiensi Guru:** Time spent creating quiz 30–45 menit; 80% waktu untuk write soal. Tidak ada reuse → soal duplikat berceceran.
- **Quality & Consistency:** Tanpa bank soal, tidak ada cara audit soal quality, level kesulitan, atau learning outcomes yang aligned. Soal tidak terstruktur.
- **Collaboration:** Guru tidak bisa share soal dengan guru lain (even di sekolah sama). Semua soal private → duplication.
- **Analytics:** Tanpa bank soal metadata (topic, difficulty, LO), sulit analyze mana soal yang hard/easy → no item analysis.
- **Assessment Alignment:** Admin tidak bisa ensure guru use curriculum-aligned soal. Soal sembarangan.

**Competitive Context:** Moodle, Ruangguru provide question banks. Guru Indonesia butuh **simple, efficient question reuse system** with proper tagging + search.

---

## 2. Goals

1. **Reduce Quiz Creation Time:** 50% reduction in time spent creating quiz per teacher (target: <15 min for new quiz via reuse).
2. **Enable Question Reuse:** 70% of quiz questions sourced from question bank (vs. create new) within 3 months.
3. **Improve Assessment Quality:** All quiz questions tagged with topic + difficulty + learning outcome → enable item analysis + curriculum alignment.
4. **Support Collaboration (P1):** Set foundation for teacher collaboration on question bank (future: shared bank across school).
5. **Enable Analytics:** Question bank metadata (tags, usage stats) enable analysis of which questions are hard/easy/effective.

---

## 3. Non-Goals

1. **AI-Generated Questions (v1)** — Auto-generate questions from learning outcomes; deferred to P1 (requires LLM API).
2. **Bulk Import from External Sources** — Import questions from textbooks/online banks; complex OCR. Deferred.
3. **Question Collaboration Across Teachers (v1)** — Share question bank with other teachers; deferred to P1 (requires sharing + versioning logic).
4. **Advanced Item Analysis** — IRT (Item Response Theory), difficulty index, discrimination index. Deferred to Phase 5 (analytics pipeline).
5. **Multi-Format Questions (v1)** — Video questions, matching, hot-spot imaging. v1: MCQ + short answer only.
6. **Question Versioning** — Track edits/versions of questions; deferred to P2.

---

## 4. User Stories

### Untuk Guru (Teacher)

- **US-Q-T1:** Sebagai guru, saat create quiz baru, saya ingin browse my question bank, search by topic/difficulty, dan add existing questions ke quiz, sehingga quiz creation cepat.
  - Acceptance: Quiz builder integrate "Add from Bank" button; sidebar show question bank; search + filter; add question → add to quiz.

- **US-Q-T2:** Sebagai guru, saya ingin create new question dan immediately save ke bank (not just in quiz), sehingga later reuse di quiz lain.
  - Acceptance: Question form have "Save to Bank" checkbox; on submit, save soal to `question_bank_items` table; auto-tag feature (optional). Success notification.

- **US-Q-T3:** Sebagai guru, saya ingin tag question dengan topic (e.g., "Linear Equation"), difficulty (Easy/Medium/Hard), learning outcome (e.g., "Solve x + 2 = 5"), sehingga find relevant questions quickly.
  - Acceptance: Tag fields in question form; topic autocomplete (or predefined list); difficulty dropdown; learning outcome free text. Save tags to DB.

- **US-Q-T4:** Sebagai guru, saya ingin see which quiz use specific question, sehingga if need update question, know impact.
  - Acceptance: Question detail page show "Used in X quizzes"; list quizzes + dates; link to each quiz.

- **US-Q-T5:** Sebagai guru, saya ingin manage my question bank (view, edit, delete questions) via dedicated page, sehingga clean up old questions.
  - Acceptance: "Question Bank" page under teacher dashboard; list all questions; search, filter by topic/difficulty; edit/delete + confirmation.

- **US-Q-T6:** Sebagai guru, saya ingin see stats per question (how many quiz use, avg score on this question, difficulty index), sehingga understand which questions effective.
  - Acceptance: Question detail page show: used in X quizzes, avg student score, % who got it right. Update stats daily via batch job.

### Untuk Admin Sekolah (Admin)

- **US-Q-A1:** Sebagai admin, saya ingin see question bank stats across all teachers (total questions, questions by topic, questions by difficulty, usage), sehingga understand content coverage.
  - Acceptance: Admin dashboard "Question Bank Analytics"; cards: total questions, questions by topic (bar chart), difficulty distribution (pie chart), most used questions. Export CSV.

- **US-Q-A2:** Sebagai admin, saya ingin ensure questions aligned with curriculum; review questions yang created tapi belum digunakan, sehingga quality control.
  - Acceptance: Admin page "Pending Questions" (questions not used in any quiz); review list with preview; option approve/flag for improvement.

---

## 5. Requirements

### P0 — Must Have

| #   | Requirement                       | Acceptance Criteria                                                                                                                                                                                                                          |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Question Bank Tables**          | `question_bank_items`: id, tenant_id, created_by (teacher_id), question_text, question_type (mcq, short_answer), correct_answer, options (for MCQ), explanation, tags (JSONB or relation to tags table), created_at, updated_at, deleted_at. |
| 2   | **Question Bank Tags**            | `question_bank_tags`: id, tenant_id, item_id, tag_type (topic, difficulty, learning_outcome), tag_value (e.g., "Linear Equation", "Hard", "Solve x + 2 = 5"). Many-to-many relation: one question can have multiple tags.                    |
| 3   | **Save Question to Bank**         | Question form in quiz builder include "Save to Bank" checkbox + tag fields (topic, difficulty, learning outcome). On save, create record in `question_bank_items` + tag records.                                                             |
| 4   | **Browse & Add from Bank**        | Quiz builder have "Add from Bank" button; open modal/sidebar with question bank browser. Search by: text, topic tag, difficulty. Add selected question to current quiz (deep-copy question to quiz OR reference via FK).                     |
| 5   | **Question Bank Management UI**   | Teacher page "My Question Bank": list all questions created by them (tenant-scoped). Columns: question preview (first 50 chars), topic tag, difficulty, created date, used count. Search + filter by topic/difficulty. Pagination.           |
| 6   | **Edit/Delete Questions**         | Question detail page: edit all fields (text, options, tags, explanation). Delete with soft-delete (deleted_at timestamp). Archive question (vs hard delete).                                                                                 |
| 7   | **Question Search**               | Full-text search on question_text; filter by topic/difficulty/learning outcome. Index on question_text for performance. Return paginated results.                                                                                            |
| 8   | **Question Usage Tracking**       | Table `question_usage`: question_bank_item_id, quiz_id, used_count (how many times student answered), avg_score, % correct. Updated daily via batch job. Show on question detail page.                                                       |
| 9   | **RLS & Multi-Tenant**            | All question bank data scoped to tenant_id. Teachers can only create/edit/view own questions. Students cannot access question bank. Admin can view all teacher's questions.                                                                  |
| 10  | **Question Bank Stats (Teacher)** | Teacher dashboard card: "Question Bank"; show total questions, questions by difficulty (pie chart), recently created questions (list). Link to full question bank page.                                                                      |
| 11  | **Admin Analytics**               | Admin page "Question Bank Analytics": total questions across all teachers, questions by topic (bar chart), difficulty distribution (pie), most-used questions (table). Export CSV.                                                           |
| 12  | **Dark Mode Support**             | All question bank UI components support dark mode with `dark:` Tailwind variants.                                                                                                                                                            |
| 13  | **Mobile Responsive**             | Question bank browser responsive (list view on mobile). Question forms scrollable. Tags responsive.                                                                                                                                          |
| 14  | **Documentation**                 | Create `src/features/question_bank/README.md` with: schema, tag system, search implementation, integration with quiz builder. Update `docs/DATABASE.md`.                                                                                     |

### P1 — Nice to Have

| #   | Requirement                                      | Reasoning                                                                                                                                  |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Question Collaboration (Shared Bank)**         | Teachers in same school can share questions (readonly or suggest edit). Shared bank per school. Deferred: sharing + versioning complexity. |
| 2   | **Question Difficulty Analysis (Item Analysis)** | Calculate difficulty index (% correct), discrimination index (how well separates high/low performers). Deferred: educational stats design. |
| 3   | **Bulk Import from CSV**                         | Teachers upload CSV (question, options, answer, tags) to batch-add questions. Deferred: CSV parsing, error handling.                       |
| 4   | **Question Approval Workflow**                   | New questions go to pending; admin approve before usable. Deferred: workflow complexity.                                                   |
| 5   | **Question Templates**                           | Pre-built question templates per subject (Math, Science, etc.) to speed up creation. Deferred: content creation.                           |
| 6   | **AI-Suggested Tags**                            | On question creation, suggest tags based on question text (NLP). Deferred: LLM API.                                                        |
| 7   | **Question Preview in Quiz Builder**             | Hover on "Add from Bank" question → show full question + options in tooltip. Deferred: UX refinement.                                      |
| 8   | **Duplicate Question Detection**                 | On save, warn if similar question already in bank (using fuzzy text match). Deferred: similarity algorithm.                                |

### P2 — Future Considerations

| #   | Item                           | Reasoning                                                                                                              |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | **AI-Generated Questions**     | Given learning outcome, auto-generate variations of question via LLM. Deferred: Phase 6 (content generation pipeline). |
| 2   | **Question Bank Marketplace**  | Sell/share questions across schools; monetization. Deferred: Phase 6 (marketplace infrastructure).                     |
| 3   | **Public Question Banks**      | Pre-built question banks from Kementerian Pendidikan or publisher partners. Deferred: content licensing.               |
| 4   | **Multi-Format Questions**     | Video-based, matching, hot-spot image, fill-in-blank with NLP marking. Deferred: complex question types.               |
| 5   | **Link to Learning Resources** | Link questions to lesson resources (PDF, video) for context. Deferred: content linking.                                |

---

## 6. Success Metrics

### Leading Indicators (hari–minggu)

| Metric                          | Target                                                        | Cara Ukur                                                                                                       |
| ------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Question Bank Creation Rate** | 80% of teachers create ≥5 questions in first month            | `SELECT COUNT(DISTINCT created_by) FROM question_bank_items WHERE created_at >= 30_days_ago` / active_teachers. |
| **Tagging Compliance**          | 90% of new questions have ≥2 tags (topic + difficulty)        | `SELECT COUNT(*) WHERE tag_count >= 2` / total_questions.                                                       |
| **Search Usage**                | 60% of teachers search question bank when creating quiz       | Analytics: `question_bank_search` events / quiz_creation_events.                                                |
| **Question Reuse Rate**         | 40% of quiz questions sourced from bank (vs. newly created)   | Track question source: created_inline vs. from_bank. Calculate % from_bank.                                     |
| **Question Bank Browse-to-Add** | 50% of question bank browses result in question added to quiz | `question_added_to_quiz / question_bank_browse` sessions.                                                       |

### Lagging Indicators (minggu–bulan)

| Metric                            | Target                                                                 | Cara Ukur                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Quiz Creation Time Reduction**  | 50% reduction (from 30 min to 15 min avg) for quiz w/ reused questions | Time-track via analytics: quiz_creation_time_with_new_questions vs. quiz_creation_time_with_bank_questions. |
| **Active Question Bank**          | 70% of active teachers maintain question bank (>0 questions)           | Count teachers with question_count > 0 / active_teachers.                                                   |
| **Question Reuse Depth**          | 30% of questions reused in 3+ quizzes                                  | Count questions where used_in_quiz_count >= 3 / total_questions.                                            |
| **Tag Consistency**               | 85% of questions have consistent topic + difficulty tags               | Manual audit of 50 random questions; check tag quality.                                                     |
| **Question Quality Score (NPS)**  | 7.0+ average rating on survey "Quality of your question bank"          | Post-implementation survey to teachers.                                                                     |
| **Admin Insights from Analytics** | 50% of admins use question bank analytics monthly                      | Usage tracking on admin analytics page.                                                                     |

---

## 7. Open Questions

| #   | Pertanyaan                                                                          | Owner       | Blocking?                                                                                                                  |
| --- | ----------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Should questions in quiz be copy of bank question (snapshot) or reference (FK)?     | Engineering | Ya — important design decision. Recommend: copy (snapshot) so editing bank doesn't retroactively change past quiz answers. |
| 2   | Should we support question versions (edit without breaking old quiz)?               | Product     | Tidak — v1 keep simple; snapshot approach handles this. Versioning in P2.                                                  |
| 3   | What question types support in v1? MCQ only, or include short answer?               | Product     | Tidak — v1: MCQ + short answer (text input). Matching, fill-in-blank P1.                                                   |
| 4   | Should topics + learning outcomes be predefined list or free-text?                  | Design      | Tidak — v1 predefined topics per school (configurable by admin); free-text learning outcomes.                              |
| 5   | Should question bank be private per teacher or shared across school?                | Product     | Tidak — v1 private per teacher. Sharing (P1) requires approval workflow or read-only access.                               |
| 6   | Should we track which student answered which specific question (for item analysis)? | Engineering | Tidak — v1 yes, track in quiz_attempts. Item analysis (stats) in P1.                                                       |

---

## 8. Timeline & Phases

### Phase 1: Foundation (Week 1)

- [ ] Database schema: `question_bank_items`, `question_bank_tags`, `question_usage`
- [ ] RLS policies + search index
- [ ] Question form components (text, options, tags)

### Phase 2: Bank Management & Tagging (Week 2)

- [ ] Save question to bank (checkbox in quiz builder)
- [ ] Question bank management UI (list, search, filter, delete)
- [ ] Tag system (topic, difficulty, learning outcome)
- [ ] Question detail page with usage stats

### Phase 3: Quiz Integration (Week 3)

- [ ] "Add from Bank" button in quiz builder
- [ ] Question bank browser/sidebar in quiz builder
- [ ] Add question to quiz (copy/reference)
- [ ] Track question source (created inline vs. from bank)

### Phase 4: Analytics & Polish (Week 4)

- [ ] Question usage tracking + stats calculation
- [ ] Teacher question bank stats card
- [ ] Admin analytics dashboard
- [ ] Dark mode + responsive audit
- [ ] Documentation + UAT

---

## 9. Dependensi & Risiko

### Dependensi

| Dependensi                         | Status  | Impact                                               |
| ---------------------------------- | ------- | ---------------------------------------------------- |
| Quiz module (quiz_questions table) | ✅ Live | Question bank integrates with existing quiz builder. |
| Supabase Auth + RLS                | ✅ Live | Needed for tenant-scoped + teacher-owned questions.  |
| React Query v5                     | ✅ Live | Cache question bank queries.                         |
| Full-text search (PostgreSQL)      | ✅ Live | Index on question_text for efficient search.         |

### Risiko & Mitigasi

| Risiko                                                                                                     | Severity | Mitigasi                                                                                                               |
| ---------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Question Bank Bloat** — Teachers upload thousands of similar/duplicate questions; bank becomes unwieldy. | Medium   | Implement search + filter; soft-delete old questions; educate teachers on tagging discipline. P1: duplicate detection. |
| **Tag Inconsistency** — Same topic tagged differently (e.g., "Linear Equation" vs. "Linear Equations").    | Medium   | Provide topic autocomplete (predefined list per school). Admin can curate topic list.                                  |
| **Performance on Large Bank** — 10k+ questions; search/filter slow.                                        | Medium   | Index on (tenant_id, tags), (question_text); paginate results (20 per page). Monitor query times.                      |
| **Question Edit Breaking Old Quiz** — Teacher edits bank question; retroactively changes past quiz.        | High     | Use snapshot (copy) of question when add to quiz; edit bank question doesn't affect past quiz.                         |
| **Accidental Deletion** — Teacher delete question used in active quiz; quiz broken.                        | Low      | Soft-delete only; add warning "Question used in X quizzes" before delete. Hard-delete only after retention period.     |
| **Cross-Tenant Data Leak** — Bug in RLS allows Sekolah A to see Sekolah B's questions.                     | Critical | Thoroughly test RLS policies on question_bank_items table. Code review + penetration test.                             |
| **Mobile UI for Add from Bank** — Modal/sidebar question browser cramped on mobile.                        | Low      | Design for mobile: full-screen modal on small screens; touch-friendly list; search easy to access.                     |

---

## 10. Acceptance Criteria for V1 Launch

**Teacher:**

- [ ] Can create question and save to bank (with topic/difficulty tags)
- [ ] Can browse own question bank (search, filter by topic/difficulty)
- [ ] Can view question detail (used in X quizzes, avg score)
- [ ] Can edit/delete question with confirmation
- [ ] Can add existing question from bank to new quiz
- [ ] Can see question bank stats on dashboard (total questions, by difficulty)

**Admin:**

- [ ] Can view question bank analytics (total questions, distribution, most-used)
- [ ] Can see questions by teacher + topic breakdown
- [ ] Can access export CSV of question bank stats

**Technical:**

- [ ] Question bank data tenant-scoped (RLS enforced)
- [ ] Teachers can only view own questions (not other teachers' private bank)
- [ ] Questions deep-copied into quiz (edit bank doesn't change past quiz)
- [ ] Full-text search on question text (indexed)
- [ ] Question usage stats calculated daily
- [ ] Dark mode working on all question bank UI
- [ ] Mobile responsive (tested on device)
- [ ] Documentation updated

---

## 11. Implementation Notes for Engineers

### Database Schema

```sql
-- Question bank items
CREATE TABLE question_bank_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR (mcq, short_answer),
  correct_answer TEXT (for short answer: expected answer; for MCQ: option_id or option text),
  options JSONB (for MCQ: [{id, text, is_correct}, ...]),
  explanation TEXT (why this answer is correct),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Question bank tags (flexible tagging)
CREATE TABLE question_bank_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES question_bank_items(id) ON DELETE CASCADE,
  tag_type VARCHAR (topic, difficulty, learning_outcome),
  tag_value VARCHAR,
  created_at TIMESTAMP DEFAULT now()
);

-- Question usage analytics (updated daily)
CREATE TABLE question_usage (
  question_id UUID PRIMARY KEY REFERENCES question_bank_items(id) ON DELETE CASCADE,
  used_in_quiz_count INT DEFAULT 0,
  avg_student_score FLOAT DEFAULT 0,
  percent_correct FLOAT DEFAULT 0,
  last_used_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT now()
);

-- Enable RLS
ALTER TABLE question_bank_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Teachers can view own questions"
  ON question_bank_items FOR SELECT
  USING (
    (created_by = auth.uid() AND tenant_id = (SELECT get_my_tenant_id()))
    OR (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin' AND tenant_id = question_bank_items.tenant_id))
  );

CREATE POLICY "Teachers can create questions"
  ON question_bank_items FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT get_my_tenant_id()) AND created_by = auth.uid()
  );

-- Full-text search index
CREATE INDEX idx_question_bank_text ON question_bank_items
  USING GIN (to_tsvector('indonesian', question_text));
```

### Feature Module Structure

```
src/features/question_bank/
├── api/
│   ├── questionBankService.ts (CRUD operations)
│   ├── tagService.ts (manage tags)
│   └── searchService.ts (full-text search)
├── queries/
│   ├── questionBankKeys.ts
│   └── questionBankQueries.ts (useQuestions, useQuestionDetail, useSearch)
├── hooks/
│   ├── useQuestionBank.ts (fetch user's questions)
│   ├── useQuestionSearch.ts (search with debounce)
│   ├── useQuestionTags.ts (manage tags)
│   └── useQuestionUsage.ts (fetch usage stats)
├── types/
│   └── index.ts (QuestionBankItem, Tag, QuestionUsage)
├── components/
│   ├── QuestionBankBrowser.tsx (sidebar/modal for adding from bank)
│   ├── QuestionForm.tsx (create/edit question)
│   ├── QuestionList.tsx (teacher's bank management)
│   ├── QuestionDetail.tsx (view + usage stats)
│   ├── QuestionSearch.tsx (search + filter)
│   ├── TagInput.tsx (multi-select topics/difficulty)
│   ├── QuestionStats.tsx (usage stats display)
│   └── AdminAnalytics.tsx (teacher overview)
├── __tests__/
│   └── questionBankService.test.ts
└── README.md
```

### Route Structure

- **Teacher:** `/#/app/teacher/question-bank` — manage my question bank
- **Teacher:** Integrated in quiz builder: "Add from Bank" button
- **Admin:** `/#/app/admin/question-bank-analytics` — analytics dashboard

### Integration with Quiz Builder

```typescript
// In quiz builder, when creating question:
const saveQuestion = async (questionData) => {
  const question = await createQuestion(questionData)

  // If checkbox "Save to Bank" checked
  if (shouldSaveToBank) {
    await saveToQuestionBank({
      ...questionData,
      tags: [
        { type: 'topic', value: topic },
        { type: 'difficulty', value: difficulty },
      ],
    })
  }

  return question
}

// When adding from bank to quiz:
const addQuestionFromBank = async (bankQuestionId) => {
  // Copy question to quiz_questions (snapshot)
  const copiedQuestion = await copyQuestionToQuiz(bankQuestionId, quizId)

  // Track in analytics
  await trackQuestionUsage(bankQuestionId)

  return copiedQuestion
}
```

---

## Glossary

| Term                     | Definisi                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Question Bank**        | Centralized repository guru untuk simpan soal; reusable across quiz.                                                                 |
| **Bank Item**            | Single question dalam question bank; dapat di-tag dan di-reuse.                                                                      |
| **Question Tag**         | Metadata untuk question: topic (e.g., "Linear Equation"), difficulty (Easy/Medium/Hard), learning outcome (e.g., "Solve x + 2 = 5"). |
| **Question Snapshot**    | Copy question saat add ke quiz; edits ke bank tidak affect past quiz.                                                                |
| **Question Usage Stats** | Analytics: how many quiz use question, avg score on question, % correct.                                                             |
| **Item Analysis**        | Statistical analysis of question: difficulty index, discrimination index (advanced P1).                                              |
| **Question Reuse**       | Add existing question dari bank ke new quiz (vs. create new).                                                                        |
