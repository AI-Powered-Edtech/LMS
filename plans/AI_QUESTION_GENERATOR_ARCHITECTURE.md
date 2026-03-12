# EduSync AI Question Generator Architecture

## Integration with Quiz System

The AI Question Generator is a **separate layer** that sits on top of the Question Bank, not integrated into the Quiz Engine.

```
┌─────────────────────────────────────────────────────────────┐
│                      EduSync Architecture                    │
├─────────────────────────────────────────────────────────────┤
│  Course Engine                                              │
│     │                                                        │
│     ▼                                                        │
│  Lesson System                                               │
│     │                                                        │
│     ▼                                                        │
│  AI Lesson → Quiz Engine                                    │
│     │                                                        │
│     ▼                                                        │
│  Question Bank                                               │
│     │                                                        │
│     ▼                                                        │
│  Quiz Engine                                                │
│     │                                                        │
│     ▼                                                        │
│  Assessment Analytics                                        │
└─────────────────────────────────────────────────────────────┘
```

## Use Case: PDF/Modul → Quiz (RAG-based)

This is the primary use case: **Teacher uploads lesson (PDF/DOCX) and AI automatically generates quiz**.

```
Teacher
   ↓
Upload Lesson (PDF / DOCX / Text)
   ↓
AI Document Parser
   ↓
Content Chunker
   ↓
Concept Extractor
   ↓
Question Generator
   ↓
Validation
   ↓
Question Bank
   ↓
Quiz Builder
```

---

## 1. New Database Tables

```sql
-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- AI Usage Tracking per tenant
CREATE TABLE IF NOT EXISTS public.ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    
    -- Usage metrics
    questions_generated INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    estimated_cost NUMERIC(10,6) DEFAULT 0,  -- Track cost in USD
    
    -- Period
    month DATE NOT NULL,
    year INTEGER NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(tenant_id, month, year)
);

-- Lesson Chunks for RAG (PDF/DOCX content with embeddings)
CREATE TABLE IF NOT EXISTS public.lesson_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    
    -- Content
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    token_count INTEGER,
    
    -- Embedding for vector search
    embedding vector(1536),  -- OpenAI ada-002 embedding size
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Index for fast vector search
    INDEX USING hnsw (embedding vector_cosine_ops)
);

-- Question Generation Cache
CREATE TABLE IF NOT EXISTS public.question_generation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    
    -- Cache key
    topic TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    grade TEXT,
    subject TEXT,
    
    -- Cached result
    generated_questions JSONB NOT NULL,
    ai_model TEXT,
    generated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(tenant_id, topic, difficulty, grade, subject)
);

-- Add AI metadata to question_bank
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS generated_by_ai BOOLEAN DEFAULT false;
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS ai_model TEXT;
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS ai_prompt_version TEXT;
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS ai_generation_id UUID;
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS generation_cost NUMERIC(10,6);  -- Cost to generate this question
```

---

## 2. AI Generator Service

```typescript
// src/services/ai/questionGenerator.ts

export interface GenerationRequest {
    subject: string;
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    count: number;
    grade?: string;
    questionTypes?: QuestionType[];
    tenantId: string;  // Required for RAG and deduplication
}

export interface CanonicalQuestion {
    text: string;
    type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
    options?: {
        text: string;
        is_correct: boolean;
    }[];
    explanation?: string;
    difficulty?: string;
    embedding?: number[];  // For semantic deduplication
}

export const aiQuestionGenerator = {
    /**
     * Generate questions using AI with RAG and cost estimation
     */
    async generate(request: GenerationRequest): Promise<CanonicalQuestion[]> {
        // 1. Estimate cost first (transparency for SaaS billing)
        const estimatedCost = await this.estimateCost(request);
        
        // 2. Check cache first
        const cached = await this.checkCache(request);
        if (cached) return cached;
        
        // 3. Check quota
        await this.checkQuota(request.tenantId, estimatedCost);
        
        // 4. Build prompt with RAG context (if lesson-based)
        const prompt = await promptBuilder.buildWithContext(request);
        
        // 5. Call LLM with batch generation
        const questions = await llmClient.generateBatch(prompt, request.count);
        
        // 6. Validate output
        const validated = validator.validate(questions);
        
        // 7. Generate embeddings for semantic deduplication
        const questionsWithEmbeddings = await this.addEmbeddings(validated);
        
        // 8. Semantic deduplicate using embeddings
        const deduped = await deduplicator.checkSemantic(questionsWithEmbeddings, request.tenantId);
        
        // 9. Save to cache
        await this.saveCache(request, deduped);
        
        // 10. Update usage and cost
        await this.updateUsage(request.tenantId, deduped.length, estimatedCost);
        
        return deduped;
    },
    
    /**
     * Estimate cost before generation (for SaaS billing transparency)
     */
    async estimateCost(request: GenerationRequest): Promise<number> {
        // Rough token estimation: ~75 words per question + prompt overhead
        const estimatedTokens = request.count * 100 + 500;  // Buffer for prompt
        
        // GPT-4 pricing: $0.03 per 1K tokens input, $0.06 per 1K tokens output
        const inputCost = (estimatedTokens * 0.03) / 1000;
        const outputCost = (estimatedTokens * 0.06) / 1000;
        
        return inputCost + outputCost;
    },
    
    /**
     * Insert generated questions to question bank with embeddings
     */
    async saveToQuestionBank(
        questions: CanonicalQuestion[],
        tenantId: string,
        courseId?: string
    ): Promise<string[]> {
        const questionIds: string[] = [];
        
        for (const q of questions) {
            const { data, error } = await supabase
                .from('question_bank')
                .insert({
                    tenant_id: tenantId,
                    text: q.text,
                    question_type: q.type,
                    explanation: q.explanation,
                    difficulty: q.difficulty || 'medium',
                    course_id: courseId,
                    generated_by_ai: true,
                    ai_model: 'gpt-4',
                    ai_prompt_version: '1.0',
                    generation_cost: await this.estimateCostForSingleQuestion(q),
                    question_embedding: q.embedding  // Store embedding for future dedupe
                })
                .select('id')
                .single();
            
            if (error) throw error;
            
            const questionId = data.id;
            
            // Insert options if MCQ
            if (q.options && q.options.length > 0) {
                const options = q.options.map((opt, idx) => ({
                    tenant_id: tenantId,
                    question_id: questionId,
                    text: opt.text,
                    is_correct: opt.is_correct,
                    "order": idx
                }));
                
                await supabase.from('question_bank_options').insert(options);
            }
            
            questionIds.push(questionId);
        }
        
        return questionIds;
    },
    
    /**
     * Generate quiz from lesson content using RAG
     */
    async generateFromLesson(
        lessonId: string,
        questionCount: number,
        difficulty: string,
        tenantId: string
    ): Promise<CanonicalQuestion[]> {
        // 1. Get relevant chunks from lesson using vector search
        const lesson = await lessonService.getById(lessonId);
        const relevantChunks = await this.getRelevantChunks(lessonId, questionCount * 2, tenantId);
        
        // 2. Extract concepts from relevant chunks
        const concepts = await this.extractConceptsFromChunks(relevantChunks);
        
        // 3. Generate questions in batches for each concept
        const allQuestions: CanonicalQuestion[] = [];
        
        for (const concept of concepts) {
            const questions = await this.generate({
                subject: lesson.subject,
                topic: concept,
                difficulty: difficulty as any,
                count: Math.ceil(questionCount / concepts.length),
                grade: lesson.grade,
                tenantId
            });
            allQuestions.push(...questions);
        }
        
        return allQuestions.slice(0, questionCount);
    },
    
    /**
     * Get relevant lesson chunks using vector search (RAG)
     */
    private async getRelevantChunks(
        lessonId: string,
        count: number,
        tenantId: string
    ): Promise<Array<{content: string; embedding: number[]}>> {
        // This would be implemented in an Edge Function that has access to embeddings
        // For now, we'll return mock structure - actual implementation uses pgvector
        const { data: chunks } = await supabase
            .from('lesson_chunks')
            .select('content, embedding')
            .eq('lesson_id', lessonId)
            .eq('tenant_id', tenantId)
            .order('embedding', { foreignTable: 'lesson_chunks', ascending: false })  // Mock ordering
            .limit(count);
        
        return chunks || [];
    },
    
    /**
     * Add embeddings to questions for semantic deduplication
     */
    private async addEmbeddings(questions: CanonicalQuestion[]): Promise<CanonicalQuestion[]> {
        // In production, this would call an embedding model
        // For now, we'll mock it
        return questions.map(q => ({
            ...q,
            embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1)  // Mock embedding
        }));
    }
};
```

---

## 3. Prompt Builder

```typescript
// src/services/ai/promptBuilder.ts

export const promptBuilder = {
    build(request: GenerationRequest): string {
        const examples = this.getExamples(request.type);
        
        return `
You are an expert educator creating quiz questions.

Subject: ${request.subject}
Topic: ${request.topic}
Difficulty: ${request.difficulty}
Grade: ${request.grade || 'General'}
Count: ${request.count}

${examples}

Generate ${request.count} questions in valid JSON format:
[
  {
    "text": "Question text here",
    "type": "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY",
    "options": [
      {"text": "Option A", "is_correct": true},
      {"text": "Option B", "is_correct": false}
    ],
    "explanation": "Why the correct answer is correct",
    "difficulty": "${request.difficulty}"
  }
]

Requirements:
- Exactly ${request.count} questions
- MCQ must have exactly 1 correct answer
- TRUE_FALSE must have exactly 1 correct answer
- Questions must be appropriate for ${request.grade || 'general'} grade
- Output ONLY valid JSON, no markdown
`;
    },
    
    getExamples(questionType: string): string {
        const examples: Record<string, string> = {
            MCQ: `
Example MCQ:
{
  "text": "What is the powerhouse of the cell?",
  "type": "MCQ",
  "options": [
    {"text": "Nucleus", "is_correct": false},
    {"text": "Mitochondria", "is_correct": true},
    {"text": "Ribosome", "is_correct": false},
    {"text": "Golgi apparatus", "is_correct": false}
  ],
  "explanation": "Mitochondria produce ATP through cellular respiration"
}`,
            TRUE_FALSE: `
Example TRUE_FALSE:
{
  "text": "The Earth is flat.",
  "type": "TRUE_FALSE",
  "options": [
    {"text": "True", "is_correct": false},
    {"text": "False", "is_correct": true}
  ],
  "explanation": "The Earth is an oblate spheroid"
}`
        };
        return examples[questionType] || examples.MCQ;
    }
};
```

---

## 4. Validation Layer

```typescript
// src/services/ai/questionValidator.ts

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    questions: CanonicalQuestion[];
}

export const questionValidator = {
    validate(output: string): ValidationResult {
        const errors: string[] = [];
        
        // 1. Parse JSON
        let questions: CanonicalQuestion[];
        try {
            questions = JSON.parse(output);
        } catch (e) {
            return { valid: false, errors: ['Invalid JSON output'], questions: [] };
        }
        
        // 2. Validate each question
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const qErrors = this.validateQuestion(q, i);
            errors.push(...qErrors);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            questions
        };
    },
    
    validateQuestion(q: CanonicalQuestion, index: number): string[] {
        const errors: string[] = [];
        
        // Required fields
        if (!q.text) errors.push(`Question ${index}: missing text`);
        if (!q.type) errors.push(`Question ${index}: missing type`);
        
        // MCQ validation
        if (q.type === 'MCQ') {
            if (!q.options || q.options.length < 2) {
                errors.push(`Question ${index}: MCQ must have at least 2 options`);
            }
            
            const correctCount = q.options?.filter(o => o.is_correct).length || 0;
            if (correctCount !== 1) {
                errors.push(`Question ${index}: MCQ must have exactly 1 correct answer`);
            }
            
            // Check for duplicate options
            const texts = q.options?.map(o => o.text) || [];
            if (new Set(texts).size !== texts.length) {
                errors.push(`Question ${index}: duplicate options found`);
            }
        }
        
        // TRUE_FALSE validation
        if (q.type === 'TRUE_FALSE') {
            const correctCount = q.options?.filter(o => o.is_correct).length || 0;
            if (correctCount !== 1) {
                errors.push(`Question ${index}: TRUE_FALSE must have exactly 1 correct answer`);
            }
        }
        
        return errors;
    }
};
```

---

## 5. Quota Management

```typescript
// src/services/ai/quotaManager.ts

interface TenantPlan {
    plan: 'free' | 'pro' | 'enterprise';
    monthlyQuestions: number;
}

const PLAN_LIMITS: Record<string, TenantPlan> = {
    free: { plan: 'free', monthlyQuestions: 50 },
    pro: { plan: 'pro', monthlyQuestions: 1000 },
    enterprise: { plan: 'enterprise', monthlyQuestions: Infinity }
};

export const quotaManager = {
    async checkQuota(tenantId: string): Promise<boolean> {
        // Get tenant plan
        const { data: tenant } = await supabase
            .from('tenants')
            .select('plan')
            .eq('id', tenantId)
            .single();
        
        const limit = PLAN_LIMITS[tenant?.plan || 'free'].monthlyQuestions;
        
        // Get current usage
        const now = new Date();
        const { data: usage } = await supabase
            .from('ai_usage')
            .select('questions_generated')
            .eq('tenant_id', tenantId)
            .eq('month', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
            .single();
        
        const current = usage?.questions_generated || 0;
        
        if (current >= limit) {
            throw new Error(`Monthly quota exceeded. Limit: ${limit}, Used: ${current}`);
        }
        
        return true;
    },
    
    async updateUsage(tenantId: string, questionCount: number, tokens: number): Promise<void> {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        await supabase.rpc('increment_ai_usage', {
            p_tenant_id: tenantId,
            p_month: monthKey,
            p_questions: questionCount,
            p_tokens: tokens
        });
    }
};
```

---

## 6. Deduplication

```typescript
// src/services/ai/deduplicator.ts

export const deduplicator = {
    /**
     * Check for similar questions in existing question bank using text matching
     */
    async checkText(
        questions: CanonicalQuestion[],
        tenantId: string
    ): Promise<CanonicalQuestion[]> {
        // Simple text-based dedup
        const { data: existing } = await supabase
            .from('question_bank')
            .select('text')
            .eq('tenant_id', tenantId);
        
        const existingTexts = new Set(existing?.map(q => q.text.toLowerCase()) || []);
        
        // Filter out exact duplicates
        return questions.filter(q => {
            const lowerText = q.text.toLowerCase();
            return !existingTexts.has(lowerText);
        });
    },
    
    /**
     * Check for similar questions using semantic embeddings (RAG-based)
     */
    async checkSemantic(
        questions: CanonicalQuestion[],
        tenantId: string
    ): Promise<CanonicalQuestion[]> {
        // Filter out questions without embeddings
        const questionsWithEmbeddings = questions.filter(q => q.embedding);
        
        if (questionsWithEmbeddings.length === 0) {
            return await this.checkText(questions, tenantId);
        }
        
        // Get existing questions with embeddings from question_bank
        const { data: existing } = await supabase
            .from('question_bank')
            .select('id, text, question_embedding')
            .eq('tenant_id', tenantId)
            .not('question_embedding', 'is', null);
        
        const uniqueQuestions: CanonicalQuestion[] = [];
        
        for (const question of questionsWithEmbeddings) {
            let isDuplicate = false;
            
            // Check against existing questions using cosine similarity
            for (const existingQuestion of existing || []) {
                if (!existingQuestion.question_embedding) continue;
                
                // Calculate cosine similarity
                const similarity = this.cosineSimilarity(
                    question.embedding,
                    existingQuestion.question_embedding
                );
                
                // If similarity > 0.9, consider it a duplicate
                if (similarity > 0.9) {
                    isDuplicate = true;
                    break;
                }
            }
            
            if (!isDuplicate) {
                uniqueQuestions.push(question);
            }
        }
        
        // Also check questions without embeddings using text matching
        const questionsWithoutEmbeddings = questions.filter(q => !q.embedding);
        const textDeduped = await this.checkText(questionsWithoutEmbeddings, tenantId);
        
        return [...uniqueQuestions, ...textDeduped];
    },
    
    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have same length');
        }
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
};
```

---

## 7. Usage Examples

### Generate from Topic
```typescript
const questions = await aiQuestionGenerator.generate({
    subject: 'Mathematics',
    topic: 'Algebra - Linear Equations',
    difficulty: 'medium',
    count: 10,
    grade: 'Grade 7'
});

// Save to question bank
const questionIds = await aiQuestionGenerator.saveToQuestionBank(
    questions,
    tenantId,
    courseId
);
```

### Generate from Lesson
```typescript
const questions = await aiQuestionGenerator.generateFromLesson(
    lessonId,  // ID of photosynthesis lesson
    questionCount: 10,
    difficulty: 'medium'
);
```

### Create Quiz from AI Questions
```typescript
// After generating, teacher can create quiz
await quizBuilder.createFromQuestionBank({
    title: 'Photosynthesis Quiz',
    questions: questionIds,  // From AI generator
    timeLimit: 30,
    passingScore: 70
});
```

---

## 8. Supabase Edge Function

```typescript
// supabase/functions/generate-questions/index.ts

import { serve } from 'std/http';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

serve(async (req) => {
    // CORS headers
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    
    try {
        // Verify auth
        const token = req.headers.get('Authorization')!;
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');
        
        // Get tenant
        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single();
        
        const body = await req.json();
        
        // Check quota
        await quotaManager.checkQuota(profile.tenant_id);
        
        // Generate
        const questions = await aiQuestionGenerator.generate({
            ...body,
            tenant_id: profile.tenant_id
        });
        
        return new Response(JSON.stringify({ questions }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

---

## 1. Document Parser (PDF/DOCX → Text)

```typescript
// src/services/ai/documentParser.ts

export const documentParser = {
    /**
     * Parse uploaded file to text
     */
    async parse(file: File): Promise<string> {
        const extension = file.name.split('.').pop()?.toLowerCase();
        
        switch (extension) {
            case 'pdf':
                return await this.parsePDF(file);
            case 'docx':
                return await this.parseDOCX(file);
            case 'txt':
                return await this.parseText(file);
            default:
                throw new Error(`Unsupported file type: ${extension}`);
        }
    },
    
    async parsePDF(file: File): Promise<string> {
        // Use pdf.js in browser or server-side
        const arrayBuffer = await file.arrayBuffer();
        // Server-side would use pdf-parse
        // This is handled by Edge Function
        return ''; // Return processed text
    },
    
    async parseDOCX(file: File): Promise<string> {
        // Use mammoth.js for DOCX
        return '';
    },
    
    async parseText(file: File): Promise<string> {
        return await file.text();
    }
};
```

---

## 2. Content Chunker (Long Text → Chunks)

```typescript
// src/services/ai/contentChunker.ts

interface Chunk {
    text: string;
    index: number;
    wordCount: number;
}

export const contentChunker = {
    /**
     * Split long lesson text into manageable chunks
     * Ideal size: 500-1000 tokens per chunk
     */
    chunk(text: string, options: {
        chunkSize?: number;
        overlap?: number;
    } = {}): Chunk[] {
        const { chunkSize = 1000, overlap = 100 } = options;
        
        // Simple word-based chunking
        const words = text.split(/\s+/);
        const chunks: Chunk[] = [];
        
        for (let i = 0; i < words.length; i += chunkSize - overlap) {
            const chunkText = words.slice(i, i + chunkSize).join(' ');
            chunks.push({
                text: chunkText,
                index: chunks.length,
                wordCount: chunkText.split(/\s+/).length
            });
        }
        
        return chunks;
    }
};
```

---

## 3. Concept Extractor (Chunks → Concepts)

```typescript
// src/services/ai/conceptExtractor.ts

interface ExtractedConcept {
    concept: string;
    relevance: number;
    sourceChunk: number;
}

export const conceptExtractor = {
    /**
     * Extract key concepts from lesson chunks
     */
    async extract(
        chunks: { text: string; index: number }[],
        options: { count?: number } = {}
    ): Promise<ExtractedConcept[]> {
        const prompt = `
Extract key educational concepts from this lesson content.

Return a JSON array of concepts with relevance scores.

Lesson content:
${chunks.map(c => c.text).join('\n\n')}

Output format:
[
  {"concept": "concept name", "relevance": 0.9},
  ...
]

Focus on concepts that are:
- Important for understanding the topic
- Suitable for quiz questions
- From the lesson material only (not invented)
`;
        
        const response = await llmClient.complete({
            prompt,
            maxTokens: 1000,
            temperature: 0.3
        });
        
        return JSON.parse(response);
    }
};
```

---

## 4. Question Generator (Concepts → Questions)

```typescript
// src/services/ai/questionGenerator.ts

/**
 * RAG-based question generation from lesson content
 */
export const lessonQuizGenerator = {
    /**
     * Generate quiz from lesson content (RAG approach)
     */
    async generateFromLesson(
        lessonContent: string,
        request: GenerationRequest
    ): Promise<CanonicalQuestion[]> {
        // Step 1: Chunk the content
        const chunks = contentChunker.chunk(lessonContent, {
            chunkSize: 800,
            overlap: 50
        });
        
        // Step 2: Extract concepts
        const concepts = await conceptExtractor.extract(chunks, {
            count: Math.ceil(request.count * 1.5)
        });
        
        // Step 3: Generate questions per concept
        const allQuestions: CanonicalQuestion[] = [];
        
        for (const concept of concepts.slice(0, request.count)) {
            // Get relevant chunk for this concept
            const relevantChunk = chunks.find(c => 
                c.text.toLowerCase().includes(concept.concept.toLowerCase())
            ) || chunks[0];
            
            const questions = await this.generateFromConcept(
                relevantChunk.text,
                concept.concept,
                request
            );
            allQuestions.push(...questions);
        }
        
        // Step 4: Validate and dedupe
        return this.postProcess(allQuestions, request.count);
    },
    
    async generateFromConcept(
        contextText: string,
        concept: string,
        request: GenerationRequest
    ): Promise<CanonicalQuestion[]> {
        const prompt = `
You are an expert educator creating quiz questions.

CONTEXT (from lesson material):
${contextText}

Generate questions about: ${concept}

Requirements:
- Difficulty: ${request.difficulty}
- Count: ${Math.ceil(request.count / 3)}
- Questions must be answerable from the CONTEXT above
- Do NOT make up information not in the context
- Output ONLY valid JSON array

Format:
[
  {
    "text": "Question about ${concept}?",
    "type": "MCQ",
    "options": [
      {"text": "Option A", "is_correct": true},
      {"text": "Option B", "is_correct": false}
    ],
    "explanation": "Correct answer because..."
  }
]
`;
        
        const response = await llmClient.complete({
            prompt,
            maxTokens: 2000,
            temperature: 0.5
        });
        
        return JSON.parse(response);
    },
    
    postProcess(questions: CanonicalQuestion[], targetCount: number): CanonicalQuestion[] {
        // Deduplicate and limit
        const unique = questions.filter((q, i, arr) => 
            arr.findIndex(x => x.text === q.text) === i
        );
        
        return unique.slice(0, targetCount);
    }
};
```

---

## 5. Complete Pipeline Flow

```
Upload Lesson (PDF)
     │
     ▼
Document Parser
     │
     ▼
Content Chunker (800 words/chunk)
     │
     ▼
Concept Extractor
     │
     ▼
Per Concept → Question Generator
     │
     ▼
Validation Layer
     │
     ▼
Question Bank
     │
     ▼
Teacher Review
     │
     ▼
Publish Quiz
```

---

## 6. Edge Function Implementation

```typescript
// supabase/functions/generate-quiz-from-lesson/index.ts

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    
    try {
        const { lesson_text, question_count, difficulty, course_id } = await req.json();
        
        // 1. Check quota
        await quotaManager.checkQuota(tenantId);
        
        // 2. Chunk content
        const chunks = contentChunker.chunk(lesson_text, {
            chunkSize: 800,
            overlap: 50
        });
        
        // 3. Extract concepts
        const concepts = await conceptExtractor.extract(chunks, {
            count: question_count * 2
        });
        
        // 4. Generate questions
        const questions: CanonicalQuestion[] = [];
        for (const concept of concepts.slice(0, question_count)) {
            const relevantChunk = chunks.find(c => 
                c.text.toLowerCase().includes(concept.concept.toLowerCase())
            ) || chunks[0];
            
            const generated = await lessonQuizGenerator.generateFromConcept(
                relevantChunk.text,
                concept.concept,
                { difficulty, count: 1 }
            );
            questions.push(...generated);
        }
        
        // 5. Validate
        const validated = validator.validate(questions);
        
        // 6. Save to question bank
        const questionIds = await aiQuestionGenerator.saveToQuestionBank(
            validated,
            tenantId,
            courseId
        );
        
        return new Response(JSON.stringify({ 
            questions: validated,
            questionIds,
            concepts: concepts.map(c => c.concept)
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
```

---

## 7. UX for Teachers

```
┌─────────────────────────────────────────┐
│ Create Quiz                              │
├─────────────────────────────────────────┤
│                                          │
│ Method:                                  │
│ ○ Manual                                  │
│ ● AI Generate                            │
│                                          │
│ Source:                                   │
│ ○ Topic                                  │
│ ● Upload Lesson (PDF/DOCX)               │
│                                          │
│ [Upload File]                             │
│ photosynthesis_lesson.pdf               │
│                                          │
│ Number of Questions: [10]               │
│ Difficulty: [Medium ▼]                   │
│                                          │
│ [Generate Quiz]                          │
│                                          │
└─────────────────────────────────────────┘

↓ AI Processing

┌─────────────────────────────────────────┐
│ Generated Questions (10)                │
├─────────────────────────────────────────┤
│                                          │
│ Q1. What is photosynthesis? [EDIT]     │
│     A) Process making food ✓            │
│     B) Process making oxygen            │
│     C) Process making glucose           │
│     D) All of above ✓ (correct)        │
│                                          │
│ Q2. Where does photosynthesis occur?    │
│     [EDIT]                              │
│                                          │
│ ...                                     │
│                                          │
│ [Regenerate] [Select All] [Publish]    │
│                                          │
└─────────────────────────────────────────┘
```

---

## Summary

This RAG-based AI Quiz Generator architecture:

1. **Separate layer** - Does not modify quiz engine
2. **Canonical model** - Normalized output format
3. **Validation** - Ensures LLM output quality
4. **Quota management** - SaaS billing ready
5. **Caching** - Reduces API costs
6. **Deduplication** - Prevents duplicate questions
7. **Audit trail** - AI metadata for debugging

With this, EduSync becomes an **AI-native LMS** with:
- Topic → Quiz generation
- Lesson → Quiz generation  
- Question variations for anti-cheating
