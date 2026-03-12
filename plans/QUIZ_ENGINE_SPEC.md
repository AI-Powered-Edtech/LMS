# Quiz Engine Architecture Spec (CTO Level)

## EduSync LMS — Production-Grade Exam System

> This document covers **system behaviors that emerge under real-world conditions**: concurrent exams, network failures, browser crashes, cheating attempts, and recovery scenarios. It supplements the Phase 1 implementation plan with production hardening specifications.

---

## Table of Contents

1. [Exam State Machine](#1-exam-state-machine)
2. [Attempt Recovery Architecture](#2-attempt-recovery-architecture)
3. [Anti-Cheating Architecture](#3-anti-cheating-architecture)
4. [Heartbeat System](#4-heartbeat-system)
5. [Distributed Exam Scaling](#5-distributed-exam-scaling)
6. [Exam Window Enforcement](#6-exam-window-enforcement)
7. [Attempt Locking & Versioning](#7-attempt-locking--versioning)
8. [Question Snapshot Immutability](#8-question-snapshot-immutability)
9. [Rate Limiting](#9-rate-limiting)
10. [Incident Recovery Playbook](#10-incident-recovery-playbook)

---

## 1. Exam State Machine

### 1.1 Attempt Lifecycle

Every quiz attempt follows a **strict state machine**. Invalid transitions must be rejected at the database level.

```
                    ┌─────────────┐
                    │ NOT_STARTED │
                    └──────┬──────┘
                           │ start_quiz_attempt()
                           ▼
                    ┌─────────────┐
               ┌────│ IN_PROGRESS │────┐
               │    └──────┬──────┘    │
               │           │           │
               ▼           ▼           ▼
        ┌───────────┐ ┌───────────┐ ┌───────────┐
        │ ABANDONED │ │ SUBMITTED │ │  EXPIRED  │
        └───────────┘ └─────┬─────┘ └───────────┘
                            │
                            ▼
                     ┌───────────┐
                     │  GRADING  │  (optional: if has ESSAY/SHORT_ANSWER)
                     └─────┬─────┘
                            │
                            ▼
                     ┌───────────┐
                     │  GRADED   │
                     └───────────┘
```

### 1.2 Transition Rules

#### Allowed Transitions

| From | To | Trigger | Side Effects |
|------|----|---------|-------------|
| `NOT_STARTED` | `IN_PROGRESS` | `start_quiz_attempt()` | Create attempt, snapshot questions, set `expires_at` |
| `IN_PROGRESS` | `SUBMITTED` | `submit_quiz_attempt()` | Auto-grade MCQ/TF/MS, save answers, calculate score |
| `IN_PROGRESS` | `EXPIRED` | Timer expiry or heartbeat timeout | Mark `finished_at = expires_at`, auto-submit if possible |
| `IN_PROGRESS` | `ABANDONED` | Heartbeat timeout (>5 min no signal) | Mark `finished_at = last_heartbeat` |
| `SUBMITTED` | `GRADED` | `grade_attempt_question()` completes all manual grading | Recalculate final score, set `passed` |

> **Note:** `SUBMITTED` is only used when the quiz contains ESSAY or SHORT_ANSWER questions that require manual grading. For fully auto-gradable quizzes, the transition goes directly from `IN_PROGRESS` → `GRADED`.

#### Invalid Transitions (MUST be rejected)

| From | To | Why |
|------|----|-----|
| `GRADED` | `IN_PROGRESS` | **Immutability**: graded exams cannot be re-opened |
| `SUBMITTED` | `IN_PROGRESS` | **No resume after submit**: prevents answer manipulation |
| `EXPIRED` | `IN_PROGRESS` | **No resume after expiry**: integrity violation |
| `ABANDONED` | `IN_PROGRESS` | **Student must start new attempt** |
| `GRADED` | `SUBMITTED` | **Score is final** |

### 1.3 State Validation (Database Level)

```sql
-- Transition guard: add CHECK constraint or validate in RPC
CREATE OR REPLACE FUNCTION validate_attempt_transition(
    p_current_status attempt_status,
    p_new_status attempt_status
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN CASE
        WHEN p_current_status = 'NOT_STARTED'  AND p_new_status = 'IN_PROGRESS' THEN TRUE
        WHEN p_current_status = 'IN_PROGRESS'  AND p_new_status IN ('SUBMITTED', 'EXPIRED', 'ABANDONED') THEN TRUE
        WHEN p_current_status = 'SUBMITTED'    AND p_new_status = 'GRADED' THEN TRUE
        ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to enforce transitions
CREATE OR REPLACE FUNCTION trg_validate_attempt_status_change()
RETURNS trigger AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        IF NOT validate_attempt_transition(OLD.status, NEW.status) THEN
            RAISE EXCEPTION 'Invalid transition: % → %', OLD.status, NEW.status;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_attempt_status_transition
BEFORE UPDATE ON quiz_attempts
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION trg_validate_attempt_status_change();
```

### 1.4 Current Implementation Status

| Feature | Status |
|---------|--------|
| Status enum (`NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `GRADED`, `EXPIRED`, `ABANDONED`) | ✅ Implemented |
| `start_quiz_attempt()` sets `IN_PROGRESS` | ✅ Implemented |
| `submit_quiz_attempt()` sets `SUBMITTED` or `GRADED` | ✅ Implemented |
| Transition guard trigger | ⬜ Not yet (proposed above) |

---

## 2. Attempt Recovery Architecture

### 2.1 The Problem

This is the **most commonly broken feature** in quiz systems. Real-world scenarios:

| Scenario | What Happens | Expected Behavior |
|----------|-------------|-------------------|
| Student refreshes browser mid-exam | `start_quiz_attempt()` called again | Return existing `IN_PROGRESS` attempt |
| Student's laptop dies, reopens on phone | New session, same student | Resume same attempt with saved answers |
| Student opens quiz in 2 tabs | Both tabs call `start_quiz_attempt()` | Both get same `attempt_id` |
| Student's internet drops for 30 seconds | Frontend reconnects | Continue exam seamlessly |

### 2.2 Recovery Flow

```
Student opens quiz page
         │
         ▼
start_quiz_attempt(p_quiz_id)
         │
         ▼
┌────────────────────────────┐
│ Check: EXISTS IN_PROGRESS  │
│ attempt for this student?  │
└────────┬───────────────────┘
         │
    ┌────┴────┐
    │         │
   YES        NO
    │         │
    ▼         ▼
┌────────┐  ┌────────────────────────┐
│ Return │  │ Check: attempt_count   │
│ existing│  │ < max_attempts?        │
│ attempt │  └───────┬────────────────┘
│ with    │          │
│recovered│     ┌────┴────┐
│ = true  │    YES        NO
└────────┘     │         │
               ▼         ▼
         ┌──────────┐  ┌──────────────────┐
         │ Create   │  │ RAISE EXCEPTION  │
         │ new      │  │ 'ATTEMPT_LIMIT_  │
         │ attempt  │  │  REACHED'        │
         └──────────┘  └──────────────────┘
```

### 2.3 Recovery SQL (Already Implemented)

```sql
-- Inside start_quiz_attempt():
SELECT id, status INTO v_attempt_id, v_status
FROM public.quiz_attempts
WHERE student_id = auth.uid()
  AND quiz_id = p_quiz_id
  AND status = 'IN_PROGRESS'
ORDER BY started_at DESC
LIMIT 1;

IF v_attempt_id IS NOT NULL THEN
    RETURN jsonb_build_object(
        'attempt_id', v_attempt_id,
        'status', v_status,
        'recovered', true     -- ← Frontend uses this flag
    );
END IF;
```

### 2.4 Frontend Recovery (Already Implemented)

```typescript
// Quiz.tsx — recovery handler
const startData = await quizService.startQuizAttempt(quizId);

if (startData.recovered) {
    // Load saved answers from attempt questions
    const questions = await quizService.getAttemptQuestions(startData.attempt_id);
    const recoveredAnswers: Record<string, SubmitAnswer> = {};
    questions.forEach((q) => {
        recoveredAnswers[q.question_id] = {
            selected_option_ids: q.selected_option_ids || [],
            text_answer: q.text_answer || '',
        };
    });
    setAnswers(recoveredAnswers);
}
```

### 2.5 Edge Case: Expired IN_PROGRESS Attempts

> [!WARNING]
> **Known issue encountered in production:** A student had an `IN_PROGRESS` attempt that expired (past `expires_at`) but was never cleaned up. The RPC recovery logic returned this dead attempt, blocking the student from starting a new one.

**Fix required in `start_quiz_attempt()`:**

```sql
-- Before returning recovered attempt, check if it's actually still valid
IF v_attempt_id IS NOT NULL THEN
    -- Check if attempt has expired
    SELECT expires_at INTO v_expires_at
    FROM quiz_attempts WHERE id = v_attempt_id;

    IF v_expires_at IS NOT NULL AND now() > v_expires_at THEN
        -- Expire the dead attempt
        UPDATE quiz_attempts
        SET status = 'EXPIRED', finished_at = v_expires_at
        WHERE id = v_attempt_id;
        -- Fall through to create new attempt
    ELSE
        RETURN jsonb_build_object(
            'attempt_id', v_attempt_id,
            'status', 'IN_PROGRESS',
            'recovered', true
        );
    END IF;
END IF;
```

### 2.6 Implementation Status

| Feature | Status |
|---------|--------|
| Recovery detection (`recovered` flag) | ✅ Implemented (RPC) |
| Frontend answer restoration | ✅ Implemented (Quiz.tsx) |
| Expired attempt cleanup in recovery | ⚠️ Partially — manual fix applied, RPC needs hardening |

---

## 3. Anti-Cheating Architecture

### 3.1 Philosophy

EduSync does **not block cheating 100%** (impossible without proctoring software). Instead, it **passively detects cheating signals** and surfaces them to teachers for review.

```
Cheating Detection Strategy:

  Passive Detection (client-side)
           │
           ▼
  Signal Recording (server-side)
           │
           ▼
  Teacher Dashboard (review)
           │
           ▼
  Teacher Decision (manual flag)
```

### 3.2 Cheating Signals

> [!IMPORTANT]
> **Architecture decision (CTO review):** Cheating signals are stored in a **separate append-only table** (`quiz_cheating_events`), not in a JSONB column. This prevents row bloat on `quiz_attempts` when students switch tabs 50+ times.

```sql
-- Separate table: append-only, scalable for analytics
CREATE TABLE quiz_cheating_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES quiz_attempts(id),
    signal_type TEXT NOT NULL,    -- 'tab_switch', 'copy_event', etc.
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    tenant_id UUID NOT NULL
);

CREATE INDEX idx_cheating_events_attempt ON quiz_cheating_events(attempt_id);
CREATE INDEX idx_cheating_events_tenant ON quiz_cheating_events(tenant_id);
```

**Why separate table vs JSONB array?**

| Approach | Write Pattern | Storage | Analytics |
|----------|-------------|---------|----------|
| `cheating_signals JSONB[]` | Rewrite entire row on each signal | Row bloat | Hard to aggregate |
| `quiz_cheating_events` table | Append-only INSERT | Efficient | Easy aggregation |

#### Signal Types

| Signal Type | Browser Event | Severity |
|-------------|--------------|----------|
| `tab_switch` | `window.blur()` / `visibilitychange` | Medium |
| `copy_event` | `document.oncopy` | High |
| `paste_event` | `document.onpaste` | High |
| `right_click` | `document.oncontextmenu` | Low |
| `devtools_open` | Window resize heuristic | High |
| `multiple_tabs` | BroadcastChannel detection | High |
| `fullscreen_exit` | `fullscreenchange` event | Medium |

### 3.3 Client-Side Detection (Frontend)

```typescript
// hooks/useExamProctor.ts

export function useExamProctor(attemptId: string, isExamMode: boolean) {
    useEffect(() => {
        if (!isExamMode || !attemptId) return;

        const handlers = {
            // Tab switch detection
            handleVisibilityChange: () => {
                if (document.hidden) {
                    quizService.recordCheatingSignal(attemptId, 'tab_switch', {
                        timestamp: new Date().toISOString()
                    });
                }
            },

            // Copy detection
            handleCopy: (e: ClipboardEvent) => {
                e.preventDefault(); // Block copy in exam mode
                quizService.recordCheatingSignal(attemptId, 'copy_event', {
                    timestamp: new Date().toISOString()
                });
            },

            // Paste detection
            handlePaste: (e: ClipboardEvent) => {
                e.preventDefault(); // Block paste in exam mode
                quizService.recordCheatingSignal(attemptId, 'paste_event', {
                    timestamp: new Date().toISOString()
                });
            },

            // Right-click prevention
            handleContextMenu: (e: MouseEvent) => {
                if (isExamMode) e.preventDefault();
                quizService.recordCheatingSignal(attemptId, 'right_click', {
                    timestamp: new Date().toISOString()
                });
            }
        };

        document.addEventListener('visibilitychange', handlers.handleVisibilityChange);
        document.addEventListener('copy', handlers.handleCopy);
        document.addEventListener('paste', handlers.handlePaste);
        document.addEventListener('contextmenu', handlers.handleContextMenu);

        return () => {
            document.removeEventListener('visibilitychange', handlers.handleVisibilityChange);
            document.removeEventListener('copy', handlers.handleCopy);
            document.removeEventListener('paste', handlers.handlePaste);
            document.removeEventListener('contextmenu', handlers.handleContextMenu);
        };
    }, [attemptId, isExamMode]);
}
```

### 3.4 Server-Side Recording

```sql
-- RPC: insert into separate table (not JSONB append)
CREATE OR REPLACE FUNCTION record_cheating_signal(
    p_attempt_id UUID,
    p_signal_type TEXT,
    p_metadata JSONB DEFAULT '{}'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id
    FROM quiz_attempts
    WHERE id = p_attempt_id
      AND student_id = auth.uid()
      AND status = 'IN_PROGRESS';

    IF NOT FOUND THEN RETURN; END IF;

    INSERT INTO quiz_cheating_events (attempt_id, signal_type, metadata, tenant_id)
    VALUES (p_attempt_id, p_signal_type, p_metadata, v_tenant_id);
END;
$$;
```

### 3.5 Teacher Cheating Review (UI spec)

```
┌──────────────────────────────────────────┐
│ Student: Budi Santoso                    │
│ Quiz: UTS Matematika                     │
│ Score: 95%                               │
│                                          │
│ ⚠️ Cheating Signals (7 detected)         │
│ ┌──────────────────────────────────────┐ │
│ │ 🔴 tab_switch    × 5  (10:01-10:15) │ │
│ │ 🔴 copy_event    × 1  (10:08)       │ │
│ │ 🟡 paste_event   × 1  (10:08)       │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [Flag as Suspicious] [Dismiss]           │
└──────────────────────────────────────────┘
```

### 3.6 Implementation Status

| Feature | Status |
|---------|--------|
| `quiz_cheating_events` table | ⬜ Not yet — migration needed (replaces JSONB column) |
| `record_cheating_signal()` RPC | ✅ Exists — needs update to INSERT into table instead of JSONB append |
| `recordCheatingSignal()` frontend function | ✅ Implemented (no change needed) |
| `useExamProctor` hook (client detection) | ⬜ Not yet — spec above |
| Teacher cheating review UI | ⬜ Not yet — Phase 2 |

---

## 4. Heartbeat System

### 4.1 Purpose

Detect **abandoned attempts** where the student:
- Closed the browser without submitting
- Lost internet permanently
- Walked away from the exam

Without heartbeat, these attempts stay `IN_PROGRESS` forever, consuming `max_attempts` quota.

### 4.2 Architecture

```
Student Browser                     Server
     │                                │
     │ ─── heartbeat (30s) ──────────►│ UPDATE last_heartbeat_at
     │                                │
     │ ─── heartbeat (30s) ──────────►│ UPDATE last_heartbeat_at
     │                                │
     │ ✕ (browser closed)             │
     │                                │
     │                                │ ← CRON: check last_heartbeat_at
     │                                │    > 5 minutes ago?
     │                                │    → status = 'ABANDONED'
```

### 4.3 Client Implementation (Already Implemented)

```typescript
// Quiz.tsx — QuizTakingView component
useEffect(() => {
    if (!attemptId) return;

    const interval = setInterval(() => {
        quizService.recordHeartbeat(attemptId);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
}, [attemptId]);
```

### 4.4 Server-Side: Heartbeat RPC

```sql
CREATE OR REPLACE FUNCTION record_quiz_heartbeat(p_attempt_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE quiz_attempts
    SET last_heartbeat_at = now(),
        updated_at = now()
    WHERE id = p_attempt_id
      AND student_id = auth.uid()
      AND status = 'IN_PROGRESS';

    RETURN FOUND;
END;
$$;
```

### 4.5 Abandoned Attempt Detection (CRON / Scheduled)

```sql
-- Run every 5 minutes via pg_cron or Edge Function cron
CREATE OR REPLACE FUNCTION cleanup_abandoned_attempts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE quiz_attempts
    SET status = 'ABANDONED',
        finished_at = last_heartbeat_at,
        updated_at = now()
    WHERE status = 'IN_PROGRESS'
      AND last_heartbeat_at IS NOT NULL
      AND last_heartbeat_at < now() - INTERVAL '5 minutes'  -- 5 min (tolerant of school WiFi)
      AND expires_at IS NOT NULL;  -- Only for timed quizzes

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Schedule: every 5 minutes
SELECT cron.schedule('cleanup-abandoned-attempts', '*/5 * * * *',
    'SELECT cleanup_abandoned_attempts()'
);
```

### 4.6 Implementation Status

| Feature | Status |
|---------|--------|
| `last_heartbeat_at` column | ⚠️ Needs to be added to `quiz_attempts` |
| `recordHeartbeat()` frontend | ✅ Implemented (30s interval) |
| `record_quiz_heartbeat()` RPC | ⚠️ Needs verification |
| `cleanup_abandoned_attempts()` CRON | ⬜ Not yet — spec above |

---

## 5. Distributed Exam Scaling

### 5.1 Bottleneck Analysis (10K Concurrent Students)

```
10,000 students × 1 exam = 3 bottleneck points

Bottleneck 1: Attempt Creation   │ 10K INSERT in < 60 seconds
Bottleneck 2: Answer Saves       │ 500K writes (50 questions × 10K students)
Bottleneck 3: Submit Storm       │ 10K concurrent submissions
```

### 5.2 Bottleneck 1: Attempt Creation

**Problem:**
```
10K students click "Start Exam"
→ 10K calls to start_quiz_attempt()
→ Each creates 1 attempt + N question snapshots
→ 10K × 50 questions = 500K INSERTs
```

**Solution: Batch question snapshot INSERT**

```sql
-- CURRENT (already correct): single INSERT ... SELECT
INSERT INTO quiz_attempt_questions (attempt_id, question_id, ...)
SELECT v_attempt_id, q.id, ...
FROM quiz_questions q
WHERE q.quiz_id = p_quiz_id;
-- ✅ Single round trip for all questions
```

**Additional mitigation:**
- Stagger exam starts with countdown (teacher triggers start)
- Use connection pooling (Supabase PgBouncer)
- Keep `start_quiz_attempt()` transaction < 100ms

### 5.3 Bottleneck 2: Answer Saves

**Problem:**
```
50 questions × 10K students = 500K writes
If each answer click = 1 DB write → database overwhelmed
```

**Solution: Client-side batching**

```typescript
// Debounced answer persistence (already partially implemented)
// Current: saves on every question change via useEffect
// Improvement: batch saves every 5 seconds

class AnswerBuffer {
    private buffer = new Map<string, QuizAnswer>();
    private timer: NodeJS.Timeout | null = null;

    queueAnswer(questionId: string, answer: QuizAnswer) {
        this.buffer.set(questionId, answer);
        if (!this.timer) {
            this.timer = setTimeout(() => this.flush(), 5000);
        }
    }

    async flush() {
        if (this.buffer.size === 0) return;
        const answers = Array.from(this.buffer.entries());
        this.buffer.clear();
        this.timer = null;

        // Batch RPC: save all dirty answers at once
        await supabase.rpc('batch_save_answers', {
            p_attempt_id: attemptId,
            p_answers: answers.map(([qId, ans]) => ({
                question_id: qId,
                selected_option_ids: ans.selected_option_ids,
                text_answer: ans.text_answer
            }))
        });
    }
}
```

**Batch RPC (server-side):**

```sql
CREATE OR REPLACE FUNCTION batch_save_answers(
    p_attempt_id UUID,
    p_answers JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_answer JSONB;
BEGIN
    -- Validate attempt belongs to caller
    IF NOT EXISTS (
        SELECT 1 FROM quiz_attempts
        WHERE id = p_attempt_id
          AND student_id = auth.uid()
          AND status = 'IN_PROGRESS'
    ) THEN
        RAISE EXCEPTION 'Invalid attempt';
    END IF;

    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
        UPDATE quiz_attempt_questions
        SET selected_option_ids = COALESCE(
                (SELECT array_agg(x::UUID)
                 FROM jsonb_array_elements_text(v_answer->'selected_option_ids') x),
                '{}'
            ),
            text_answer = v_answer->>'text_answer',
            updated_at = now()
        WHERE attempt_id = p_attempt_id
          AND question_id = (v_answer->>'question_id')::UUID;
    END LOOP;
END;
$$;
```

### 5.4 Bottleneck 3: Submit Storm

**Problem:**
```
Timer expires: all 10K students submit within seconds
→ 10K concurrent submit_quiz_attempt() calls
→ Each calculates scores, updates attempt, fires events
```

**Solution: Async grading with queue**

```
Student submits        Edge Function Queue         Database
     │                         │                       │
     │─── submit ────────────►│                       │
     │◄── {status: SUBMITTED}─│                       │
     │                         │                       │
     │                         │──── grade_batch() ───►│
     │                         │◄── scores ───────────│
     │                         │                       │
     │◄── websocket: GRADED ──│                       │
```

**When to use async grading:**
- Only when concurrent submissions > 1000
- For normal classroom quizzes (< 50 students), synchronous grading is fine
- Current implementation: **synchronous** (correct for current scale)

### 5.5 Scaling Checklist

| Metric | Current Capacity | Target | Action Needed |
|--------|-----------------|--------|---------------|
| Concurrent starts | ~100 | 10K | PgBouncer + staggered start |
| Answer saves/sec | ~500 (unbatched) | 50K | Client batching (5s window) |
| Concurrent submits | ~100 | 10K | Async grading queue |
| DB connections | 100 (Supabase default) | 1000 | Upgrade to Pro plan |

---

## 6. Exam Window Enforcement

### 6.1 The Problem

```
Teacher sets: available_from = 10:00, available_until = 11:00
Student starts at 10:58
Time limit: 30 minutes
Student tries to submit at 11:10 (after window closes)
```

**Question:** Should the submission be rejected?

### 6.2 Rules

| Rule | Enforcement Point | Behavior |
|------|-------------------|----------|
| Cannot start before `available_from` | `start_quiz_attempt()` | `RAISE 'QUIZ_NOT_AVAILABLE_YET'` |
| Cannot start after `available_until` | `start_quiz_attempt()` | `RAISE 'QUIZ_AVAILABILITY_EXPIRED'` |
| `expires_at` = `MIN(start + time_limit, available_until)` | `start_quiz_attempt()` | Clamp timer to window |
| Submit after `expires_at` | `submit_quiz_attempt()` | Auto-expire, save answers |

### 6.3 Timer Clamping Logic

```sql
-- In start_quiz_attempt():
-- Ensure attempt cannot extend beyond quiz window
IF v_time_limit > 0 AND v_quiz_mode != 'practice' THEN
    v_expires_at := now() + (v_time_limit * INTERVAL '1 minute');

    -- Clamp to quiz window end
    IF v_available_until IS NOT NULL AND v_expires_at > v_available_until THEN
        v_expires_at := v_available_until;
    END IF;
END IF;
```

### 6.4 Late Submission Handling

```sql
-- In submit_quiz_attempt():
IF v_expires_at IS NOT NULL AND now() > v_expires_at THEN
    -- Don't reject — save whatever answers are there
    UPDATE quiz_attempts
    SET status = 'EXPIRED',
        finished_at = v_expires_at,
        submitted_at = now()     -- Record actual submit time
    WHERE id = v_attempt_id;

    -- Still auto-grade the saved answers
    PERFORM auto_grade_attempt(v_attempt_id);

    RETURN jsonb_build_object(
        'status', 'EXPIRED',
        'message', 'Time limit exceeded. Answers saved and graded.',
        'score', v_score
    );
END IF;
```

### 6.5 Implementation Status

| Feature | Status |
|---------|--------|
| `available_from` / `available_until` columns | ✅ Implemented |
| Window validation in `start_quiz_attempt()` | ✅ Implemented |
| Timer clamping to window end | ⬜ Not yet — spec above |
| Late submission graceful handling | ⚠️ Currently rejects — should save & grade |

---

## 7. Attempt Locking & Versioning

### 7.1 Purpose

Prevent **double submission** and **race conditions** when:
- Student clicks "Submit" twice rapidly
- Two tabs submit at the same time
- Network retry causes duplicate request
- Client retry after timeout sends stale update

### 7.2 Pessimistic Locking (Already Correct)

```sql
-- In submit_quiz_attempt():
SELECT id, tenant_id, status, expires_at
INTO v_attempt_id, v_tenant_id, v_status, v_expires_at
FROM public.quiz_attempts
WHERE quiz_id = p_quiz_id
  AND student_id = v_student_id
  AND status = 'IN_PROGRESS'
ORDER BY started_at DESC
LIMIT 1
FOR UPDATE;  -- ← Row-level lock prevents concurrent modification
```

### 7.3 Optimistic Locking with Attempt Versioning

> [!IMPORTANT]
> **CTO review:** Even with `FOR UPDATE`, client-side retries can cause race conditions. Add optimistic locking via `version` column to detect stale updates.

```sql
-- Migration: add version column
ALTER TABLE quiz_attempts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
```

**How it works:**

```sql
-- In submit_quiz_attempt():
UPDATE quiz_attempts
SET status = 'SUBMITTED',
    finished_at = now(),
    score = v_score,
    version = version + 1
WHERE id = v_attempt_id
  AND version = p_expected_version;  -- ← Client passes expected version

IF NOT FOUND THEN
    RAISE EXCEPTION 'CONCURRENT_MODIFICATION: attempt was modified by another request';
END IF;
```

**Frontend passes version:**

```typescript
// quizService.ts
async submitQuizAttempt(quizId: string, answers: QuizAnswer[], version: number) {
    const { data, error } = await supabase.rpc('submit_quiz_attempt', {
        p_quiz_id: quizId,
        p_answers: answers,
        p_expected_version: version  // ← From startQuizAttempt response
    });
    if (error?.message?.includes('CONCURRENT_MODIFICATION')) {
        // Already submitted — show results instead of error
        return await this.getAttemptResult(quizId);
    }
    if (error) throw error;
    return data;
}
```

### 7.4 Frontend Prevention

```typescript
// Quiz.tsx — already implemented
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async () => {
    if (isSubmitting) return;  // Prevent double-click
    setIsSubmitting(true);
    try {
        await quizService.submitQuizAttempt(quizId, answers, attemptVersion);
    } finally {
        setIsSubmitting(false);
    }
};
```

### 7.5 Multi-Tab Prevention (Proposed)

```typescript
// hooks/useExamProctor.ts — BroadcastChannel API
const channel = new BroadcastChannel('edusync-exam');

channel.onmessage = (event) => {
    if (event.data.type === 'EXAM_ACTIVE' && event.data.attemptId === currentAttemptId) {
        // Another tab is taking the same exam
        quizService.recordCheatingSignal(attemptId, 'multiple_tabs', {});
        showWarning('Ujian hanya boleh dibuka di satu tab.');
    }
};

// Broadcast presence
channel.postMessage({ type: 'EXAM_ACTIVE', attemptId: currentAttemptId });
```

### 7.6 Implementation Status

| Feature | Status |
|---------|--------|
| `FOR UPDATE` pessimistic lock | ✅ Implemented |
| `version` column (optimistic lock) | ⬜ Not yet — migration needed |
| Frontend `isSubmitting` guard | ✅ Implemented |
| Multi-tab BroadcastChannel | ⬜ Not yet — spec above |

---

## 8. Question Snapshot Immutability

### 8.1 Purpose

When a teacher edits a question **while students are taking the exam**, the change must NOT affect in-progress attempts.

```
Teacher edits question text
         │
         ▼
  quiz_questions.text updated
         │
         ├── IN_PROGRESS attempts → use question_snapshot (frozen)
         │
         └── NEW attempts → use updated question text
```

### 8.2 Snapshot Fields

```sql
-- quiz_attempt_questions stores a frozen copy of the question at attempt start
question_snapshot JSONB NOT NULL
-- Contains:
-- {
--   "text": "What is 2+2?",
--   "question_type": "MCQ",
--   "points": 10,
--   "explanation": "Basic arithmetic",
--   "options": [
--     {"id": "uuid-1", "text": "3", "is_correct": false},
--     {"id": "uuid-2", "text": "4", "is_correct": true},
--     {"id": "uuid-3", "text": "5", "is_correct": false}
--   ]
-- }
```

### 8.3 Rules

1. **Snapshot is created at `start_quiz_attempt()`** — captures question text, options, correct answers, and points.
2. **Grading uses snapshot** — `submit_quiz_attempt()` compares answers against `question_snapshot.options`, NOT against live `quiz_options`.
3. **Snapshot is immutable** — no UPDATE allowed on `question_snapshot` after creation.
4. **Score disputes** — if teacher claims "I changed the answer", the snapshot proves what the student saw.

### 8.4 Implementation Status

| Feature | Status |
|---------|--------|
| `question_snapshot JSONB` column | ✅ Implemented |
| Snapshot populated at `start_quiz_attempt()` | ✅ Implemented |
| Grading reads from snapshot | ⚠️ Needs verification |

---

## 9. Rate Limiting

### 9.1 Purpose

Prevent abuse and accidental DDoS from:
- Student spamming "Start Exam" button
- Script kiddies calling RPCs directly
- Network retry loops

### 9.2 Rate Limits

| RPC Function | Limit | Window | Reason |
|-------------|-------|--------|--------|
| `start_quiz_attempt()` | 3 calls | 10 seconds | Prevent attempt spam |
| `submit_quiz_attempt()` | 3 calls | 10 seconds | Prevent double submit |
| `batch_save_answers()` | 20 calls | 60 seconds | Allow frequent saves |
| `record_cheating_signal()` | 30 calls | 60 seconds | Tab switches can be frequent |
| `record_quiz_heartbeat()` | 5 calls | 60 seconds | ~2 per 30s interval |

### 9.3 Implementation Options

**Option A: Supabase Edge Function rate limiting (Recommended)**

```typescript
// Edge Function wrapper with in-memory rate limiting
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, action: string, limit: number, windowMs: number): boolean {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const entry = rateLimiter.get(key);

    if (!entry || now > entry.resetAt) {
        rateLimiter.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }

    if (entry.count >= limit) return false;
    entry.count++;
    return true;
}
```

**Option B: Database-level (pg_rate_limiter extension)**

```sql
-- If pg_rate_limiter extension is available
SELECT rate_limit(
    key := auth.uid()::TEXT || ':submit_quiz',
    rate := 3,
    period := '10 seconds'::INTERVAL
);
```

### 9.4 Implementation Status

| Feature | Status |
|---------|--------|
| Frontend debounce | ✅ Partial (isSubmitting guard) |
| Server-side rate limiting | ⬜ Not yet — Phase 2 |

---

## 10. Incident Recovery Playbook

### 8.1 Scenario Matrix

| Incident | Impact | Recovery Action |
|----------|--------|-----------------|
| **Database restart** | All active exams interrupted | Students refresh → attempt recovery resumes exam |
| **Network outage (< 30s)** | Answer saves fail | Frontend retries, answers cached locally |
| **Network outage (> 5 min)** | Heartbeat stops | Attempt marked `ABANDONED`, teacher can re-open |
| **Student browser crash** | Exam state lost | Reopen → recovery returns `IN_PROGRESS` attempt |
| **Supabase maintenance** | All API calls fail | Frontend shows "Server maintenance" banner |
| **Stuck IN_PROGRESS attempts** | Students can't start new attempt | Admin SQL: cleanup expired attempts |

### 8.2 Recovery Procedures

#### Procedure 1: Cleanup Stuck Attempts

When students report "Can't start quiz":

```sql
-- Identify stuck attempts
SELECT id, student_id, quiz_id, status, expires_at, last_heartbeat_at
FROM quiz_attempts
WHERE status = 'IN_PROGRESS'
  AND (expires_at < now() OR last_heartbeat_at < now() - INTERVAL '10 minutes');

-- Batch expire them
UPDATE quiz_attempts
SET status = 'EXPIRED',
    finished_at = COALESCE(expires_at, now()),
    updated_at = now()
WHERE status = 'IN_PROGRESS'
  AND expires_at < now();
```

#### Procedure 2: Grant Extra Attempt

When a student's exam was unfairly interrupted:

```sql
-- Teacher/admin grants +1 attempt
-- Option A: Reset the abandoned attempt
UPDATE quiz_attempts
SET status = 'ABANDONED',
    finished_at = now()
WHERE id = '<stuck_attempt_id>';

-- Option B: Increase max_attempts for this student only
-- (requires student-specific override table — Phase 2+)
```

#### Procedure 3: Mass Exam Incident

When infrastructure failure affects all students during an exam:

```sql
-- 1. Identify affected attempts
SELECT count(*), quiz_id
FROM quiz_attempts
WHERE status = 'IN_PROGRESS'
  AND started_at BETWEEN '<incident_start>' AND '<incident_end>'
GROUP BY quiz_id;

-- 2. Extend time for all affected
UPDATE quiz_attempts
SET expires_at = expires_at + INTERVAL '15 minutes',
    updated_at = now()
WHERE status = 'IN_PROGRESS'
  AND quiz_id = '<affected_quiz_id>';

-- 3. Notify teacher via activity event
INSERT INTO activity_events (tenant_id, user_id, event_type, event_data)
SELECT DISTINCT tenant_id, created_by, 'system_incident',
    jsonb_build_object(
        'message', 'Exam time extended by 15 minutes due to system incident',
        'quiz_id', id
    )
FROM quizzes WHERE id = '<affected_quiz_id>';
```

### 10.3 Monitoring Queries

```sql
-- Active exam dashboard (for admin)
SELECT
    q.title,
    count(*) as active_students,
    min(qa.started_at) as first_start,
    max(qa.expires_at) as last_expiry,
    count(*) FILTER (WHERE qa.last_heartbeat_at < now() - INTERVAL '1 minute') as possibly_disconnected
FROM quiz_attempts qa
JOIN quizzes q ON q.id = qa.quiz_id
WHERE qa.status = 'IN_PROGRESS'
GROUP BY q.id, q.title;

-- Cheating signal summary (using separate table)
SELECT
    qa.student_id,
    p.full_name,
    qa.quiz_id,
    count(ce.id) as signal_count,
    qa.score
FROM quiz_attempts qa
JOIN profiles p ON p.id = qa.student_id
LEFT JOIN quiz_cheating_events ce ON ce.attempt_id = qa.id
GROUP BY qa.student_id, p.full_name, qa.quiz_id, qa.score
HAVING count(ce.id) > 3
ORDER BY signal_count DESC;
```

### 10.4 Exam System Health (Operations Dashboard)

```sql
-- Single-query health check for exam operations
SELECT
    count(*) FILTER (WHERE status = 'IN_PROGRESS') as active_exams,
    count(*) FILTER (WHERE status = 'SUBMITTED')   as waiting_grading,
    count(*) FILTER (WHERE status = 'EXPIRED')      as expired_today,
    count(*) FILTER (WHERE status = 'ABANDONED')    as abandoned_today,
    count(*) FILTER (WHERE status = 'GRADED')       as graded_today,
    count(*) FILTER (
        WHERE status = 'IN_PROGRESS'
        AND last_heartbeat_at < now() - INTERVAL '2 minutes'
    ) as possibly_disconnected
FROM quiz_attempts
WHERE created_at >= CURRENT_DATE;
```

This query should be exposed via an admin API endpoint and displayed on a real-time operations dashboard.

---

## Summary: Implementation Priority

| Feature | Priority | Phase | Effort |
|---------|----------|-------|--------|
| State machine transition guard | 🔴 High | 2 | 1 day |
| Expired attempt recovery fix | 🔴 High | 2 | 0.5 day |
| Attempt versioning (optimistic lock) | 🔴 High | 2 | 0.5 day |
| `quiz_cheating_events` table migration | 🔴 High | 2 | 0.5 day |
| `useExamProctor` hook | 🟡 Medium | 2 | 1 day |
| Timer clamping to window | 🟡 Medium | 2 | 0.5 day |
| Late submission graceful handling | 🟡 Medium | 2 | 0.5 day |
| Heartbeat CRON cleanup (5 min timeout) | 🟡 Medium | 2 | 0.5 day |
| Rate limiting (RPC) | 🟡 Medium | 2 | 1 day |
| Multi-tab detection | 🟢 Phase 2+ | 2 | 0.5 day |
| Teacher cheating review UI | 🟢 Phase 2 | 2 | 2 days |
| Client answer batching | 🟢 Phase 5 | 5 | 2 days |
| Async grading queue | 🟢 Phase 5 | 5 | 3 days |
| Admin monitoring dashboard | 🟢 Phase 4 | 4 | 2 days |

---

*Document Version: 1.1*
*Last Updated: 2026-03-13*
*Author: EduSync Engineering*
*Level: CTO / Principal Engineer*
*Scope: Quiz Engine production hardening specifications*
*CTO Review: Applied 6 improvements (versioning, heartbeat timeout, cheating table, snapshots, health monitoring, rate limiting)*
