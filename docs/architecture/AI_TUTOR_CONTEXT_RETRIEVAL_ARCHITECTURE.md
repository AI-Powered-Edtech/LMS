# EduSync AI Tutor — Phase 2: RAG Architecture

## 1. Overview
While Phase 1 grounds the AI Tutor in the *current lesson's* resources, Phase 2 implements **Retrieval-Augmented Generation (RAG)** to allow the AI to answer questions spanning the entire course, previous modules, and prerequisites. This transforms the AI from a lesson-specific helper into a comprehensive course assistant.

We will use **Supabase pgvector** for native PostgreSQL vector operations, ensuring data locality and inheriting standard RLS policies.

---

## 2. Vector Schema (`pgvector`) & Job Queue

We introduce tables to store document chunks, embeddings, and a job queue for async ingestion.

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── 1. Content Chunks Table ───
CREATE TABLE IF NOT EXISTS lesson_resource_chunks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  course_id uuid NOT NULL REFERENCES courses(id),
  module_id uuid NOT NULL REFERENCES modules(id),
  lesson_id uuid NOT NULL REFERENCES lessons(id),
  resource_id uuid NOT NULL REFERENCES lesson_resources(id),
  
  content_type text NOT NULL, -- 'text', 'transcript', 'summary'
  chunk_index int NOT NULL,
  chunk_text text NOT NULL,
  token_count int NOT NULL,   -- For context budget packing
  metadata jsonb DEFAULT '{}'::jsonb, -- Store difficulty, tags, concept
  
  -- Embedding vector (e.g., 768 dims for standard text-embedding models like text-embedding-004)
  embedding vector(768) NOT NULL,
  
  created_at timestamptz DEFAULT now()
);

-- HNSW Index for fast similarity search (Tuned for recall/latency)
CREATE INDEX lesson_chunks_embedding_idx
ON lesson_resource_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Index for RLS / Tenant filtering
CREATE INDEX idx_lesson_resource_chunks_tenant_course 
ON lesson_resource_chunks (tenant_id, course_id);

-- ─── 2. Embedding Job Queue ───
-- Safely decouples DB triggers from slow external Embedding APIs
CREATE TABLE IF NOT EXISTS embedding_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  resource_id uuid NOT NULL REFERENCES lesson_resources(id),
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## 3. Async Embedding Pipeline (Ingestion)

To prevent locking database transactions with slow network calls, we use a **Background Worker Queue Pattern**.

### Workflow:
1. `lesson_resources` INSERT/UPDATE triggers a fast Postgres Trigger.
2. Trigger inserts a new row into `embedding_jobs` (`status = 'pending'`).
3. A background **pg_cron job** or external worker reads pending jobs and invokes the Edge Function `generate-embeddings` asynchronously.
4. Edge Function fetches the full text of the resource and marks job `'processing'`.
5. **Concept Extraction & Chunking**: 
   - Uses a small LLM (e.g., Gemini Flash) to extract `concepts` from the text as a JSON array (e.g. `["photosynthesis", "chloroplast"]`).
   - Chunks the text using **Optimal RAG parameters**: **350 tokens/chunk with 50 tokens overlap** for high precision.
6. Calls Embedding API (e.g., Google `text-embedding-004`).
7. Inserts chunks + embeddings into `lesson_resource_chunks` (saving the extracted concepts into the `metadata` JSONB column), and updates job to `'completed'`.

---

## 4. Concept-Aware Semantic Retrieval Pipeline

When a student asks a question, we extract concepts and perform a Concept-Boosted Hybrid Search to ensure we hit the correct pedagogical topic before relying pure mathematical distance.

### RPC: `match_course_chunks_with_concepts`

```sql
CREATE OR REPLACE FUNCTION match_course_chunks_with_concepts(
  p_tenant_id uuid,
  p_course_id uuid,
  p_current_lesson_id uuid,
  query_embedding vector(768),
  p_concepts text[] DEFAULT '{}'::text[],
  match_threshold float DEFAULT 0.75,
  match_count int DEFAULT 12     -- Fetch more to allow Edge Function to compress/pack by token budget
)
RETURNS TABLE (
  chunk_id uuid,
  lesson_id uuid,
  chunk_text text,
  metadata jsonb,
  base_similarity float,
  final_score float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lrc.id,
    lrc.lesson_id,
    lrc.chunk_text,
    lrc.metadata,
    1 - (lrc.embedding <=> query_embedding) AS base_similarity,
    
    (1 - (lrc.embedding <=> query_embedding)) + 
      -- Lesson proximity boost (+0.05) if chunk is from the exact current lesson
      (CASE WHEN lrc.lesson_id = p_current_lesson_id THEN 0.05 ELSE 0 END) +
      -- Concept boost (+0.07) if the chunk metadata conceptually matches the student question
      (CASE WHEN lrc.metadata->'concepts' ?| p_concepts THEN 0.07 ELSE 0 END)
      AS final_score

  FROM lesson_resource_chunks lrc
  WHERE lrc.tenant_id = p_tenant_id
    AND lrc.course_id = p_course_id
    AND 1 - (lrc.embedding <=> query_embedding) > match_threshold
  ORDER BY final_score DESC
  LIMIT match_count;
END;
$$;
```

---

## 5. Integrating RAG into `ai-tutor` Edge Function

The existing `ai-tutor` Edge Function will be upgraded to perform **Concept-Aware Retrieval** *before* calling the main LLM.

### Flow Adjustment:
1. Receive question.
2. Rate limit & Auth.
3. **Concept Extraction & Embedding**: 
   - Parallel Call A: Ask small LLM (Gemini Flash) to extract `concepts` from the question (e.g. `["photosynthesis", "sunlight"]`).
   - Parallel Call B: Call Embedding API on the `question` -> `query_embedding`.
4. Call `match_course_chunks_with_concepts()` RPC using `query_embedding` and the extracted `[concepts]` to find relevant chunks across the whole course.
5. Call original `get_tutor_context()` to get immediate lesson state (progress, recent quiz).
6. **Fetch Conversation Memory**: Retrieve last 3 messages from `ai_tutor_interactions` for memory awareness.
7. **Context Compression Layer**:
   - RAG can yield 2000+ tokens of raw chunks, increasing cost.
   - Summarize/compress the retrieved chunks down via a cheap model (e.g., Gemini Flash) or strict deduplication *before* primary prompt assembly.
8. **Assemble Grounding Context** (Token-aware packing):
   - Current Lesson Abstract
   - **RAG Retrieved & Compressed Chunks**
   - Conversation Memory (Past 3 turns)
9. Classify Difficulty & Build Prompt.
10. Call main LLM (Gemini).
11. Return response & Log interaction.

---

## 6. Token-Aware Context Packing

A crucial step before calling the LLM is to pack the retrieved chunks deterministically to maximize relevance, ensure diversity, and fit within the designated `RAG_BUDGET` (e.g., 1200 tokens).

### Packing Algorithm:
1. **Sort**: Order chunks descending by similarity.
2. **Deduplicate**: Hash the first 120 chars of each chunk text. Skip if already seen.
3. **Lesson Diversity**: Restrict to a maximum of 3 chunks per `lesson_id` to avoid topic bias.
4. **Hard Limit Guarantee**: Skip any chunk that alone consumes > 40% of the token budget.
5. **Greedy Token Packing**: Accumulate chunks while `< RAG_BUDGET`.

### TypeScript Implementation (Edge Function)
```ts
type Chunk = {
  chunk_id: string
  lesson_id: string
  chunk_text: string
  token_count: number
  similarity: number
}

type PackedContext = {
  text: string
  usedTokens: number
  chunks: Chunk[]
}

export function packRagContext(
  chunks: Chunk[],
  tokenBudget: number = 1200
): PackedContext {

  const sorted = [...chunks].sort((a, b) => b.similarity - a.similarity)
  const usedLessons = new Map<string, number>()
  const seen = new Set<string>()
  const selected: Chunk[] = []
  
  let usedTokens = 0

  for (const chunk of sorted) {
    if (chunk.token_count > tokenBudget * 0.4) continue

    const hash = chunk.chunk_text.slice(0, 120)
    if (seen.has(hash)) continue

    const lessonCount = usedLessons.get(chunk.lesson_id) ?? 0
    if (lessonCount >= 3) continue

    if (usedTokens + chunk.token_count > tokenBudget) continue

    selected.push(chunk)
    usedTokens += chunk.token_count
    usedLessons.set(chunk.lesson_id, lessonCount + 1)
    seen.add(hash)
  }

  const contextText = selected
    .map((c, i) => \`Source \${i + 1} (Lesson \${c.lesson_id}):\\n\${c.chunk_text}\`)
    .join("\\n\\n")

  return {
    text: contextText,
    usedTokens,
    chunks: selected
  }
}
```

---

## 7. Hallucination Reduction & Guardrails

RAG adds external context, so the Prompt System Rules must be adjusted:

```text
RULES:
1. You are provided with "RETRIEVED COURSE KNOWLEDGE". Answer the user's question ONLY using this provided knowledge.
2. If the answer cannot be found in the retrieved knowledge or current context, do NOT invent an answer. Reply explicitly: 
   "Maaf, saya belum menemukan informasi tersebut di materi kursus ini."
3. **CITATION REQUIREMENT**: You MUST cite the source module or lesson if possible (e.g., "Berdasarkan materi di Modul 2...").
4. Adapt to student difficulty, but prioritize factual grounding.
```

If the RPC `match_course_chunks` using `0.75 threshold` returns ZERO chunks matching the context, the Edge Function can short-circuit and directly reply: *"Materi tidak ditemukan yang relevan dengan pertanyaan Anda."*

---

## AI Tutor Context Retrieval Architecture (Embedding-Free)

This document describes the architecture of the AI Tutor system in EduSync, which uses **Structured Context Retrieval** and **PostgreSQL Full Text Search (FTS)** instead of vector embeddings.

## Overview

The AI Tutor provides pedagogical assistance to students by retrieving relevant lesson content and student progress data, then processing it through the **Groq LLM** (powered by Llama 3).

### Key Components

1.  **PostgreSQL Full Text Search**: Replaces vector indexing. Search is performed using keyword matching on the `lesson_resources` table.
2.  **Structured Context RPC (`get_tutor_context`)**: Fetches current lesson data, recent quiz results, and student progress level.
3.  **Groq LLM (`llama-3.1-70b-versatile`)**: Optimized for speed and pedagogical reasoning.
4.  **Context Packer**: A utility that prioritizes and truncates context to fit within the LLM's token limit.

## Data Flow

1.  **Student Query**: The student asks a question via the UI.
2.  **Auth & Rate Limit**: Edge Function verifies the JWT and checks usage limits.
3.  **Context Fetching**:
    *   Fetches current lesson content.
    *   Fetches recent student performance.
    *   Performs FTS search for relevant keywords across the course.
4.  **Pedagogical Layer**: Classifies student difficulty (Mastering, Progressing, Struggling).
5.  **Prompt Construction**: Injects context and difficulty into the system prompt.
6.  **LLM Inference**: Groq generates a response.
7.  **Logging**: Interactivity is logged to `ai_tutor_interactions`.

## Removal of Embeddings

The following components have been removed to improve maintainability and reduce costs:
*   `pgvector` dependency
*   `embedding_jobs` table
*   `lesson_resource_chunks` table
*   `generate-embeddings` Edge Function
*   Google Gemini Embedding models

## Search Implementation

The system uses `to_tsvector` and `to_tsquery` for keyword matching:
```sql
SELECT lr.content 
FROM lesson_resources lr
WHERE lr.search_vector @@ plainto_tsquery('english', 'student query')
```

---

## 9. Student Knowledge Modeling (Phase 3 Prep)

To transform the generic RAG tutor into a strictly personalized teacher, EduSync incorporates a **Student Knowledge Modeling (SKM)** layer. This layer tracks each student's mastery level per concept, directly affecting both **Retrieval strategy** and **LLM Prompt generation**.

### 9.1 Data Model
A new table, `student_concept_mastery`, tracks concept proficiency on a scale of `0.0` (beginner) to `1.0` (mastered).
```sql
CREATE TABLE student_concept_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  concept text NOT NULL,
  mastery float DEFAULT 0.5,
  confidence float DEFAULT 0.5,
  last_updated timestamptz DEFAULT now()
);
```

### 9.2 Knowledge Update Signals
The Edge Function updates the `mastery` score based on these signals:
- **Quiz Performance**: Correct answer (`+0.1`), wrong answer (`-0.1`).
- **Student Question Difficulty**: If asking basic foundational questions on an advanced topic (`-0.05`).
- **Successful Interaction**: If the student acknowledges understanding (`+0.05`).

*Estimation Algorithm*: `new_mastery = old_mastery + (learning_rate * signal)`

### 9.3 Adaptive Tutor Behavior
The acquired mastery level alters the tutor's teaching strategy:
- **Low Mastery (`< 0.4`)**: Step-by-step explanations, basic analogies, guiding questions.
- **Medium Mastery (`0.4 - 0.7`)**: Standard explanations, additional examples.
- **High Mastery (`> 0.7`)**: Concise answers, direct skips to advanced concepts.

### 9.4 Final Output Prompt Injection
The `ai-tutor` Edge Function injects the student's mastery levels into the main prompt:
```text
STUDENT KNOWLEDGE PROFILE:
- Photosynthesis: 0.35 (low mastery)
- Cellular respiration: 0.6 (medium mastery)

Instructions: Adjust explanation depth according to mastery levels.
```

### Full Pipeline:
```
Student Question 
  -> Student Knowledge Model (Fetch Mastery) 
  -> Concept Extraction 
  -> Concept & Mastery Aware Retrieval 
  -> Token Aware Packing 
  -> Adaptive Prompt Builder
  -> LLM Tutor Response 
  -> Update Knowledge Model (Signal)
```

---

## 10. Cost & Latency Optimization Architecture

To ensure the AI Tutor remains economically viable and highly responsive at scale, a comprehensive set of optimization strategies is layered over the RAG pipeline.

### 10.1 Semantic Answer Cache (The Biggest Optimization)
Many students ask identical or highly similar questions (e.g., "What is photosynthesis?"). A Semantic Answer Cache prevents redundant LLM calls.
```sql
CREATE TABLE ai_tutor_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  course_id uuid NOT NULL,
  question_text text NOT NULL,
  question_embedding vector(768) NOT NULL,
  answer text NOT NULL
);
CREATE INDEX idx_ai_tutor_cache_embedding ON ai_tutor_cache USING hnsw (question_embedding vector_cosine_ops);
```
**Mechanism**: Generate embedding for the question -> Check `ai_tutor_cache` for proximity `> 0.93`. If hit, return immediately (~80ms). Bypasses everything else, including RAG retrieval and LLM generation.

### 10.2 Heuristic Concept Extraction
Instead of calling a small LLM every single time to extract concepts from a student's question, run a simple text overlap check first.
```ts
function heuristicConceptExtraction(question: string, knownLessonConcepts: string[]) {
  const lower = question.toLowerCase()
  return knownLessonConcepts.filter(c => lower.includes(c.toLowerCase()))
}
```
If this finds concepts, **skip** the LLM parsing request. Saves ~60-70% of extraction calls.

### 10.3 Streaming Responses
LLM generation is the longest step in the pipeline. Instead of returning the full JSON block at the end, stream completion deltas. Initial byte TTFB (Time To First Byte) drops significantly below ~200ms, vastly improving UX.

### 10.4 Async SKM Updates
Never block the response while updating the `student_concept_mastery` table. The LLM returns its response to the client immediately, while a background queue/promise evaluates the interaction and updates the mastery scores.

### 10.5 Adaptive Model Selection & RAG Depth
We dictate the strength of the pipeline based on the complexity found in the question:
- **Simple Question ("What is X?")**: Fast Gemini Flash, RAG `top_k = 3`.
- **Complex Reasoning**: GPT-4o class model, RAG `top_k = 8`.
- Enables Graceful Degradation if API quotas are near exhausted for the day.

### Expected Performance
- **Cache hit**: ~80ms (0 LLM Calls)
- **RAG + Flash LLM**: ~350ms - 800ms
- **Cost Reduction**: Up to 80% fewer LLM tokens processed per 10k users.

---

## 11. Pedagogical Reasoning Layer (Teaching Strategy Engine)

Rather than just answering the student's question directly (which risks giving away answers), the AI Tutor employs a fast rule-based **Pedagogical Reasoning Layer** directly before the Prompt Builder. 

### 11.1 Strategy Selection
Based on the student's mastery, question type, and context, a teaching strategy is explicitly chosen:

| Condition | Selected Strategy | LLM Prompt Instruction |
| :--- | :--- | :--- |
| `mastery < 0.4` | **Step-by-step** | "Break the explanation into small steps suitable for beginners." |
| `question_type == definition` | **Direct Answer** | "Explain the concept clearly and concisely." |
| `question_type == why` | **Analogy** | "Explain the concept using a real-world analogy." |
| `question_type == confusion` | **Guiding Question** | "Ask a guiding question that helps the student reason about the concept." |
| Inside Quiz context | **Hint** | "Do NOT reveal the full answer. Provide a hint that guides the student to think." |

### 11.2 Edge Function Flow
```ts
// Classify using fast text heuristics 
const questionType = classifyQuestion(question) 

// O(1) Rule-based decision 
const strategy = chooseTeachingStrategy(mastery, questionType) 

// Inject strategy into the system prompt 
const prompt = buildPrompt({ strategy, context, question })
```

### 11.3 Interaction Logging
The chosen strategy is logged inside the `ai_tutor_interactions` table metadata to allow analytics on which strategies effectively improve student mastery over time.


---

## 12. Final Comprehensive Pipeline

With all layers active, the EduSync AI Tutor operates using this finalized flow:

```
Student Question
      │
      ▼
Semantic Cache Lookup (Speed: ~80ms)
      │
      ▼
Student Knowledge Model (Fetch Mastery Profile)
      │
      ▼
Heuristic Concept Extraction (Speed/Cost Optimizer)
      │
      ▼
Embedding API (Google text-embedding-004)
      │
      ▼
Concept-Aware Retrieval RPC (Filters & Boosts)
      │
      ▼
Token-Aware Packing (Budget max 1200 tokens)
      │
      ▼
Pedagogical Reasoning Engine (Determine Strategy: Hint/Analogy/Step)
      │
      ▼
Adaptive Prompt Builder (Inject Context, Mastery, and Strategy)
      │
      ▼
LLM Tutor Response Stream (Gemini Flash/Pro)
      │
      ▼
Async Semantic Caching & Knowledge Model Update
```
