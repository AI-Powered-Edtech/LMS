# QUIZ_BUILDER_INTEGRATION_ARCHITECTURE.md

## EduSync LMS — Phase 3: Quiz Builder Integration

---

# 1️⃣ Objective

Integrate the **Question Bank system** with the **Quiz Builder UI** so teachers can:

```text
create questions
search question bank
add questions to quizzes
generate quizzes faster
reuse questions
```

Architecture:

```text
Question Bank
      │
      ▼
Question Search UI
      │
      ▼
Quiz Builder
      │
      ▼
quiz_questions table
```

---

# 2️⃣ Frontend Architecture Overview

New components:

```text
frontend/src/features/question-bank/

questionBankService.ts
QuestionBankPage.tsx
QuestionEditor.tsx
QuestionSearchModal.tsx
QuestionCard.tsx
```

Integration points:

```text
QuizBlockEditor.tsx
courseBuilderService.ts
quizService.ts
```

---

# 3️⃣ Service Layer

Create new service:

```text
services/questionBankService.ts
```

---

## questionBankService.ts

Responsibilities:

```text
call RPC functions
handle search queries
handle question CRUD
```

Example implementation:

```typescript
import { supabase } from "@/lib/supabase";

export const questionBankService = {

  async createQuestion(payload) {
    const { data, error } = await supabase.rpc("create_question", {
      p_question_text: payload.text,
      p_question_type: payload.type,
      p_options: payload.options,
      p_tags: payload.tags
    });

    if (error) throw error;

    return data;
  },

  async searchQuestions(filters) {

    const { data, error } = await supabase.rpc("search_questions", {
      p_topic: filters.topic,
      p_difficulty: filters.difficulty,
      p_tag: filters.tag,
      p_limit: filters.limit ?? 20,
      p_offset: filters.offset ?? 0
    });

    if (error) throw error;

    return data;
  },

  async getQuestion(questionId) {

    const { data, error } = await supabase.rpc("get_question", {
      p_question_id: questionId
    });

    if (error) throw error;

    return data;
  },

  async getQuestionOptions(questionId) {

    const { data, error } = await supabase.rpc("get_question_options", {
      p_question_id: questionId
    });

    if (error) throw error;

    return data;
  },

  async addQuestionToQuiz(questionId, quizId) {

    const { data, error } = await supabase.rpc("add_question_to_quiz", {
      p_question_id: questionId,
      p_quiz_id: quizId
    });

    if (error) throw error;

    return data;
  }

};
```

---

# 4️⃣ Question Bank Page

Route:

```text
/teacher/question-bank
```

Component:

```text
QuestionBankPage.tsx
```

Purpose:

```text
manage question library
search questions
create new questions
```

---

## UI Layout

```text
┌──────────────────────────────┐
│ Question Bank                │
│                              │
│ [Search] [Topic] [Tag]       │
│                              │
│ Question List                │
│ ───────────────────────────  │
│ Q1: Algebra question         │
│ Q2: Physics question         │
│ Q3: Grammar question         │
│                              │
│ [Create Question]            │
└──────────────────────────────┘
```

---

## Example Component

```tsx
export function QuestionBankPage() {

  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    const data = await questionBankService.searchQuestions({});
    setQuestions(data);
  }

  return (
    <div>

      <h1>Question Bank</h1>

      {questions.map(q => (
        <QuestionCard key={q.id} question={q} />
      ))}

    </div>
  );

}
```

---

# 5️⃣ Question Search Modal

Used inside **Quiz Builder**.

Component:

```text
QuestionSearchModal.tsx
```

---

## UX Flow

Teacher inside quiz builder:

```text
Add Question
↓
Search Question Bank
↓
Select Question
↓
Add to Quiz
```

---

## UI Layout

```text
┌─────────────────────────────┐
│ Search Question Bank        │
│                             │
│ [Search] [Topic] [Tag]      │
│                             │
│ Question List               │
│                             │
│ Q1: Algebra question        │
│ [Add]                       │
│                             │
│ Q2: Geometry question       │
│ [Add]                       │
└─────────────────────────────┘
```

---

## Modal Implementation

```tsx
export function QuestionSearchModal({ quizId }) {

  const [questions, setQuestions] = useState([]);

  async function search() {

    const data = await questionBankService.searchQuestions({});

    setQuestions(data);

  }

  async function addQuestion(questionId) {

    await questionBankService.addQuestionToQuiz(
      questionId,
      quizId
    );

  }

}
```

---

# 6️⃣ Quiz Builder Integration

File:

```text
QuizBlockEditor.tsx
```

Add new button:

```text
Add from Question Bank
```

---

## UI

```text
Add Question
[ Create New ]
[ Import from Question Bank ]
```

---

## Implementation

```tsx
<Button
 onClick={() => setShowQuestionModal(true)}
>
Add from Question Bank
</Button>

<QuestionSearchModal
 quizId={quizId}
 open={showQuestionModal}
/>
```

---

# 7️⃣ Question Card

Component:

```text
QuestionCard.tsx
```

Purpose:

```text
preview question
show difficulty
show tags
```

---

## UI

```text
┌─────────────────────────────┐
│ Algebra Question            │
│ Difficulty: Medium          │
│ Tags: algebra fractions     │
│                             │
│ [Edit] [Add to Quiz]        │
└─────────────────────────────┘
```

---

# 8️⃣ Question Editor

Component:

```text
QuestionEditor.tsx
```

Used for:

```text
create_question()
update_question()
```

---

## UI

```text
Question Text
[ textarea ]

Question Type
[ MCQ | Essay | Short Answer ]

Options
[ Option A ]
[ Option B ]
[ Option C ]

Tags
[ algebra ]
```

---

# 9️⃣ UX Flow (Final)

Teacher workflow becomes:

```text
Teacher
↓
Question Bank
↓
Create / AI Generate Questions
↓
Search Questions
↓
Add to Quiz
↓
Publish Quiz
```

---

# 🔟 UX Inspired by Quizizz

Quizizz flow:

```text
Create Quiz
↓
Search Questions
↓
Add Question
```

EduSync flow:

```text
Create Quiz
↓
Search Question Bank
↓
Add Question
```

Almost identical UX.

---

# 11️⃣ Performance Strategy

Search queries must use:

```text
indexed columns
topic_id
difficulty_level
tags
```

Avoid:

```text
ORDER BY random()
```

Instead use:

```text
LIMIT
OFFSET
```

---

# 12️⃣ Feature Ready for AI

When AI generator is implemented:

```text
AI questions
↓
question_bank
↓
teacher review
↓
quiz builder
```

This pipeline is already compatible with the UI.

---

# 13️⃣ Implementation Order

Recommended coding order:

```text
1 questionBankService.ts
2 QuestionBankPage.tsx
3 QuestionEditor.tsx
4 QuestionSearchModal.tsx
5 integrate QuizBlockEditor
```

---

# 14️⃣ Estimated Implementation Time

Realistic timeline:

```text
Service layer → 2 hours
Question Bank page → 1 day
Search modal → 6 hours
Quiz Builder integration → 6 hours
```

Total:

```text
~2 days
```

---

# 15️⃣ Result After Phase 3

EduSync will support:

```text
Question Library
Reusable Questions
Fast Quiz Creation
AI Question Generator
Analytics
```

which completes the **assessment platform foundation**.
