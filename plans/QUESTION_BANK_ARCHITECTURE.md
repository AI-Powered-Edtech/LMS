## EduSync LMS — Question Bank System Architecture

**Version:** 1.0
**Level:** CTO / Principal Engineer
**Purpose:** Core architecture for scalable question management, analytics, and AI-driven assessment generation.

---

# 1. Overview

The Question Bank is the **central knowledge repository for all assessment content** within EduSync.

Unlike simple quiz systems where questions live only inside quizzes, EduSync separates:

```
Question Definition
Quiz Usage
Assessment Analytics
AI Generation Metadata
```

This separation allows the platform to support:

```
question reuse
random exam generation
AI question generation
difficulty calibration
adaptive learning
large-scale analytics
```

The Question Bank acts as the **content intelligence layer** for the assessment ecosystem.

---

# 2. System Architecture

```
                 Question Bank System
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   Quiz Engine      AI Generator      Analytics
        │                │                │
        └───────────────┼────────────────┘
                        │
                  Question Bank
```

Key subsystems:

```
Question Storage
Question Metadata
Question Usage Tracking
Performance Analytics
AI Generation Metadata
```

---

# 3. Core Design Principles

### 1. Questions must be reusable

Questions should **not belong to a single quiz**.

Instead:

```
Question Bank → referenced by quizzes
```

---

### 2. Quiz attempts must be immutable

Once a student starts a quiz:

```
question_snapshot must freeze content
```

Even if teachers later edit the question.

---

### 3. Analytics must be independent from quizzes

Statistics should accumulate **across all quiz usages**.

This enables:

```
difficulty calibration
question quality scoring
adaptive testing
```

---

### 4. Question bank must support AI generation

Questions created by AI must be tracked with:

```
prompt
model
generation cost
semantic similarity checks
```

---

# 4. Data Ownership Model

Each question belongs to a **tenant (school)**.

```
tenant_id → school isolation
```

Multi-tenant constraints:

```
School A cannot see School B questions
```

However future optional feature:

```
global question marketplace
```

can allow shared libraries.

---

# 5. Database Schema

## 5.1 question_bank

Primary storage for questions.

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

 created_by UUID,

 created_at TIMESTAMPTZ DEFAULT now(),
 updated_at TIMESTAMPTZ DEFAULT now()

);
```

---

### question_type supported

```
MCQ
MULTIPLE_SELECT
TRUE_FALSE
SHORT_ANSWER
ESSAY
```

---

### source values

```
manual
import
ai_generated
```

---

# 5.2 question_options

Used for MCQ / MULTIPLE_SELECT.

```sql
CREATE TABLE question_options (

 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

 question_id UUID REFERENCES question_bank(id),

 option_text TEXT,

 is_correct BOOLEAN,

 order_index INTEGER

);
```

---

# 5.3 question_tags

Flexible tagging system.

```sql
CREATE TABLE question_tags (

 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

 question_id UUID REFERENCES question_bank(id),

 tag TEXT
);
```

Examples:

```
algebra
fractions
grammar
physics
```

Tags allow:

```
topic filtering
AI retrieval
random exam generation
```

---

# 5.4 question_bank_usage

Tracks where questions are used.

```sql
CREATE TABLE question_bank_usage (

 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

 question_id UUID REFERENCES question_bank(id),

 quiz_id UUID REFERENCES quizzes(id),

 tenant_id UUID,

 used_at TIMESTAMPTZ DEFAULT now()

);
```

Used for:

```
question popularity
overused question detection
analytics
```

---

# 5.5 question_stats

Stores aggregated performance statistics.

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

# 6. Difficulty Calibration

Difficulty is calculated using classical item response metrics.

### Difficulty Index

```
difficulty = correct_answers / total_answers
```

Interpretation:

| value | meaning   |
| ----- | --------- |
| >0.8  | very easy |
| 0.6   | easy      |
| 0.5   | medium    |
| 0.3   | hard      |
| <0.2  | very hard |

---

### Discrimination Index

Measures how well a question distinguishes strong vs weak students.

High discrimination means:

```
good assessment question
```

Low discrimination means:

```
bad question
needs revision
```

---

# 7. Quiz Integration

Question bank integrates with quiz engine using this pipeline.

```
Question Bank
↓
Quiz Builder
↓
quiz_questions
↓
quiz_attempt_questions snapshot
```

Important rule:

```
question_bank = mutable
quiz_attempt_questions = immutable
```

This ensures exam integrity.

---

# 8. Random Exam Generation

Teachers can generate quizzes automatically from question bank.

Example:

```
10 algebra questions
difficulty medium
```

Query example:

```sql
SELECT *
FROM question_bank
WHERE topic_id = 'algebra'
AND difficulty_level BETWEEN 2 AND 4
ORDER BY random()
LIMIT 10;
```

Production optimization:

```
avoid ORDER BY random()
use sampling strategy
```

---

# 9. AI Question Generation Architecture

Pipeline:

```
lesson content
↓
document parsing
↓
chunking
↓
embedding generation
↓
vector search
↓
LLM question generation
↓
validation
↓
question_bank insertion
```

---

# 9.1 lesson_chunks table

Stores vector embeddings for RAG.

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

# 9.2 AI Metadata

```sql
CREATE TABLE ai_generation_metadata (

 question_id UUID REFERENCES question_bank(id),

 model TEXT,

 prompt TEXT,

 generation_cost NUMERIC,

 created_at TIMESTAMPTZ DEFAULT now()

);
```

Used for:

```
cost tracking
prompt debugging
AI auditing
```

---

# 10. Duplicate Question Prevention

AI generators often create similar questions.

Solution:

```
semantic similarity check
```

Using pgvector:

```
cosine similarity
```

If similarity > 0.9

```
reject question
```

---

# 11. Teacher Workflow

### Question creation

```
Teacher → Question Bank
↓
Create Question
↓
Add options
↓
Tag topics
↓
Set difficulty
↓
Save
```

---

### Quiz building

```
Teacher → Create Quiz
↓
Add from Question Bank
↓
Select questions
↓
Publish
```

---

# 12. Analytics Dashboard

Teachers can view:

```
hardest questions
most failed questions
most used questions
question quality metrics
```

Example query:

```sql
SELECT *
FROM question_stats
ORDER BY difficulty_index ASC
LIMIT 10;
```

---

# 13. Scaling Strategy

Expected data size:

```
10k questions per school
100k attempts per month
millions of answers
```

Optimization techniques:

```
partition analytics tables
covering indexes
precomputed stats
vector indexes for AI search
```

---

# 14. Security

RLS policies must enforce tenant isolation.

Example:

```
tenant_id = get_current_tenant_id()
```

Applied to:

```
question_bank
question_stats
question_usage
ai_generation_metadata
```

---

# 15. Future Extensions

The architecture supports future capabilities:

### Adaptive Testing

Difficulty adjusts dynamically based on student performance.

---

### Question Marketplace

Schools can share question banks.

---

### AI Tutor Integration

AI can analyze question performance and suggest:

```
question improvements
difficulty adjustments
new questions
```

---

# 16. Implementation Roadmap

Recommended order:

### Phase 1

```
question_bank schema
question CRUD API
quiz builder integration
```

---

### Phase 2

```
question usage tracking
analytics tables
difficulty calibration
```

---

### Phase 3

```
AI generator pipeline
RAG retrieval
duplicate detection
```

---

# 17. Relationship with Quiz Engine

Final architecture:

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
```

---

# 18. Strategic Positioning

With this architecture EduSync evolves from:

```
Learning Management System
```

into:

```
AI-powered assessment platform
```

capable of supporting:

```
large-scale exams
AI-generated assessments
adaptive testing
learning analytics
```
