# QUESTION_BANK_IMPLEMENTATION_PLAN.md

**Project:** EduSync LMS
**Component:** Question Bank System
**Level:** Engineering Implementation Plan
**Version:** 1.0

---

# 1. Objective

Implement the **Question Bank System** as the central repository for all assessment questions in EduSync.

The system must support:

```
question reuse
quiz generation
analytics
AI question generation
multi-tenant isolation
```

This implementation will **not replace the existing quiz system**, but instead integrate with it.

Architecture pipeline:

```
Question Bank
↓
Quiz Builder
↓
quiz_questions
↓
quiz_attempt_questions snapshot
↓
analytics
```

---

# 2. Implementation Phases

Recommended implementation order:

```
Phase 1 — Database Schema
Phase 2 — Core RPC / Service Layer
Phase 3 — Quiz Builder Integration
Phase 4 — Analytics System
Phase 5 — AI Generator Support
```

---

# 3. Phase 1 — Database Schema

Create migration:

```
68_question_bank_schema.sql
```

---

# 3.1 question_bank

```sql
CREATE TABLE question_bank (

 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

 tenant_id UUID NOT NULL REFERENCES tenants(id),

 subject_id UUID,
 topic_id UUID,

 question_type TEXT NOT NULL,

 question_text TEXT NOT NULL,

 explanation TEXT,

 difficulty_level INTEGER DEFAULT 3,

 source TEXT DEFAULT 'manual',

 created_by UUID REFERENCES profiles(id),

 created_at TIMESTAMPTZ DEFAULT now(),
 updated_at TIMESTAMPTZ DEFAULT now()

);
```

Indexes:

```sql
CREATE INDEX idx_question_bank_tenant
ON question_bank(tenant_id);

CREATE INDEX idx_question_bank_topic
ON question_bank(topic_id);
```

---

# 3.2 question_options

```sql
CREATE TABLE question_options (

 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

 question_id UUID REFERENCES question_bank(id),

 option_text TEXT,

 is_correct BOOLEAN,

 order_index INTEGER

);
```

Index:

```
question_id
```

---

# 3.3 question_tags

```sql
CREATE TABLE question_tags (

 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

 question_id UUID REFERENCES question_bank(id),

 tag TEXT
);
```

Index:

```
question_id
```

---

# 3.4 question_bank_usage

Tracks usage of questions inside quizzes.

```sql
CREATE TABLE question_bank_usage (

 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

 question_id UUID REFERENCES question_bank(id),

 quiz_id UUID REFERENCES quizzes(id),

 tenant_id UUID,

 used_at TIMESTAMPTZ DEFAULT now()

);
```

---

# 3.5 question_stats

Stores aggregated performance metrics.

```sql
CREATE TABLE question_stats (

 question_id UUID PRIMARY KEY REFERENCES question_bank(id),

 total_answers INTEGER DEFAULT 0,

 correct_answers INTEGER DEFAULT 0,

 difficulty_index NUMERIC,

 discrimination_index NUMERIC,

 updated_at TIMESTAMPTZ DEFAULT now()

);
```

---

# 3.6 AI metadata table

```sql
CREATE TABLE ai_generation_metadata (

 question_id UUID REFERENCES question_bank(id),

 model TEXT,

 prompt TEXT,

 generation_cost NUMERIC,

 created_at TIMESTAMPTZ DEFAULT now()

);
```

---

# 3.7 RLS Policies

All tables must enforce tenant isolation.

Example:

```sql
CREATE POLICY tenant_isolation_question_bank
ON question_bank
USING (tenant_id = get_current_tenant_id());
```

Apply to:

```
question_bank
question_bank_usage
question_stats
ai_generation_metadata
```

---

# 4. Phase 2 — Core RPC Layer

Create migration:

```
69_question_bank_rpc.sql
```

---

# 4.1 create_question()

```sql
create_question(
 p_question_text TEXT,
 p_question_type TEXT,
 p_options JSONB,
 p_tags TEXT[]
)
```

Responsibilities:

```
insert question_bank
insert question_options
insert question_tags
```

---

# 4.2 update_question()

Update question text, options, tags.

Important rule:

```
cannot modify question used in active attempt
```

Check:

```
quiz_attempt_questions snapshot
```

---

# 4.3 delete_question()

Soft delete recommended.

Add column:

```
is_archived BOOLEAN
```

---

# 4.4 search_questions()

```sql
search_questions(
 p_topic UUID,
 p_difficulty INTEGER,
 p_tag TEXT
)
```

Returns filtered question list.

---

# 4.5 add_question_to_quiz()

Flow:

```
Question Bank
↓
Insert into quiz_questions
↓
Record usage
```

Insert into:

```
question_bank_usage
```

---

# 5. Phase 3 — Quiz Builder Integration

Modify existing builder:

```
QuizBlockEditor.tsx
```

Add tab:

```
Question Bank
```

Teacher options:

```
Create Question
Import Question
Search Question Bank
```

---

# Quiz creation flow

```
Create Quiz
↓
Add Question
↓
Select from Question Bank
↓
Insert into quiz_questions
```

---

# 6. Phase 4 — Analytics

Analytics must update **after grading**.

Trigger location:

```
submit_quiz_attempt()
grade_attempt_question()
```

---

# Analytics update

Pseudo logic:

```
for each attempt_question
 update question_stats
```

Example:

```sql
UPDATE question_stats
SET
 total_answers = total_answers + 1,
 correct_answers = correct_answers + (CASE WHEN is_correct THEN 1 ELSE 0 END)
WHERE question_id = ...
```

---

# Difficulty calculation

```
difficulty_index =
correct_answers / total_answers
```

---

# Discrimination index

Computed periodically using batch job.

Recommended:

```
nightly job
```

---

# 7. Phase 5 — AI Generator Support

Add table:

```
lesson_chunks
```

---

# lesson_chunks schema

```sql
CREATE TABLE lesson_chunks (

 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

 lesson_id UUID,

 content TEXT,

 embedding VECTOR(1536)

);
```

Index:

```
HNSW vector index
```

---

# AI generation flow

```
lesson content
↓
chunk
↓
embedding
↓
vector search
↓
LLM generate question
↓
validate
↓
insert question_bank
```

---

# 8. Duplicate Question Prevention

Before inserting AI question:

```
vector similarity search
```

Query:

```
cosine similarity > 0.9
```

Reject if duplicate.

---

# 9. API / Service Layer

New frontend service:

```
questionBankService.ts
```

Functions:

```
createQuestion()
updateQuestion()
deleteQuestion()
searchQuestions()
addQuestionToQuiz()
```

---

# Example service function

```
createQuestion(question)
```

calls:

```
RPC create_question()
```

---

# 10. UI Components

Add new UI:

```
QuestionBankPage.tsx
```

Sections:

```
Question list
Question editor
Tag filter
Difficulty filter
Search
```

---

# Quiz Builder UI

Modify:

```
QuizBlockEditor.tsx
```

Add:

```
Add from Question Bank
```

Modal:

```
Question search
Preview
Add
```

---

# 11. Performance Considerations

Expected scale:

```
10k questions / school
100k attempts / month
```

Optimization:

```
indexes on tenant_id
vector index for embeddings
analytics pre-computation
```

---

# 12. Migration Strategy

Safe rollout:

Step 1

```
deploy schema
```

Step 2

```
deploy RPC
```

Step 3

```
enable builder integration
```

Step 4

```
enable analytics triggers
```

---

# 13. Testing Strategy

Test cases:

### Question creation

```
create question
verify options stored
verify tags stored
```

---

### Quiz integration

```
add question to quiz
verify quiz_questions populated
verify usage recorded
```

---

### Analytics

```
complete quiz
verify question_stats updated
```

---

### AI generation

```
generate question
verify ai_generation_metadata stored
```

---

# 14. Implementation Timeline

Estimated engineering effort:

```
schema migration → 1 day
RPC functions → 1 day
quiz builder integration → 2 days
analytics triggers → 1 day
AI pipeline skeleton → 1 day
```

Total:

```
~6 days
```

---

# 15. Next Step After Question Bank

After this system is stable, EduSync can implement:

```
Standalone Quiz Platform
AI Question Generator
Adaptive Assessment
```

---

# Final Architecture

```
           Question Bank
                 │
                 │
          Quiz Builder
                 │
                 ▼
            Quiz Engine
                 │
                 ▼
           Attempt System
                 │
                 ▼
             Analytics
                 │
                 ▼
             AI Engine
```

---

# Conclusion

The Question Bank system becomes the **content intelligence layer** of EduSync.

This architecture enables:

```
AI-driven assessments
large-scale exam generation
learning analytics
adaptive testing
```

Positioning EduSync as a **next-generation AI assessment platform**.
