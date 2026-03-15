# EduSync Quiz Engine V2 - Comprehensive Audit Report

## 1. Executive Summary

A comprehensive architectural and security audit of the EduSync Quiz Engine V2 has been conducted, focusing on the attempt lifecycle, concurrency controls, autosave integrity, timer enforcement, and multi-tenant isolation.

While the V2 architecture introduces significant scalability improvements (such as partitioned tables and telemetry tracking), the audit identified **several critical and high-severity flaws** that could compromise assessment integrity. Most notably, the system is vulnerable to concurrent attempt creation and out-of-order autosave overwrites.

## 2. Architecture Overview

The V2 Quiz Engine relies on Postgres partitioned tables (`quiz_attempts_v2`, `quiz_attempt_questions_v2`) and a set of Supabase RPCs (`v1_start_quiz_attempt`, `v1_save_partial_answers`, `v1_submit_quiz_attempt`) to handle the quiz lifecycle. Security boundaries are enforced via Row Level Security (RLS) bound to `tenant_id` and `student_id`.

## 3. Critical Vulnerabilities

### 3.1 Multiple Active Attempts Race Condition (Critical)
* **Description:** The system fails to prevent a student from creating multiple `IN_PROGRESS` attempts concurrently for the same quiz. The unique constraint created in migration 84 (`UNIQUE (quiz_id, student_id, attempt_number, started_at)`) includes the `started_at` partition key. Since concurrent requests will have slightly different `started_at` timestamps, they bypass the constraint. Furthermore, the `v1_start_quiz_attempt` RPC lacks robust transaction locking when checking for existing attempts.
* **Exploit Scenario:** A student scripts two simultaneous requests to `v1_start_quiz_attempt`. Both transactions read that no active attempt exists and create two separate `IN_PROGRESS` attempts, allowing them to take the quiz twice concurrently and submit the one with the higher score.
* **Reproduction:**
  Execute the following SQL across two separate `psql` connections simultaneously for the same `auth.uid()` and `quiz_id`.

  ```sql
  -- Transaction A (Session 1)
  BEGIN;
  SELECT set_config('request.jwt.claims', '{"sub": "<student_uuid>", "role": "authenticated"}', true);
  SELECT set_config('role', 'authenticated', true);
  SELECT * FROM public.v1_start_quiz_attempt('<quiz_uuid>');
  -- Pause here

  -- Transaction B (Session 2)
  BEGIN;
  SELECT set_config('request.jwt.claims', '{"sub": "<student_uuid>", "role": "authenticated"}', true);
  SELECT set_config('role', 'authenticated', true);
  SELECT * FROM public.v1_start_quiz_attempt('<quiz_uuid>');
  -- Commit Transaction B
  COMMIT;

  -- Commit Transaction A
  COMMIT;

  -- Query attempts
  SELECT id, status, started_at FROM public.quiz_attempts_v2 WHERE quiz_id = '<quiz_uuid>' AND student_id = '<student_uuid>';
  -- Result: Two active 'IN_PROGRESS' attempts.
  ```

* **Recommended Fix:**
  1. Implement a robust Advisory Lock in `v1_start_quiz_attempt` based on `(quiz_id, student_id)` to serialize attempt creation.
  2. Implement a secondary tracking table or a materialized view that explicitly tracks the single active attempt per student without the partition key.

## 4. High-Risk Issues

### 4.1 Autosave Out-of-Order Overwrite (High)
* **Description:** `v1_save_partial_answers` uses an `UPSERT` operation on `quiz_attempt_questions_v2` without versioning or timestamp validation.
* **Exploit Scenario:** A student experiences high latency. They answer "A" (Payload 1 is sent but delayed in transit). They quickly change their answer to "B" (Payload 2 is sent and arrives at the server first). Payload 1 arrives later and blindly overwrites the newer correct answer "B" with "A".
* **Reproduction:**
  Send `v1_save_partial_answers` with answer "B". Then send another request with answer "A". The database will permanently store "A", regardless of when the answers were actually selected on the client.
* **Recommended Fix:**
  Introduce an `updated_at` or `client_version` column to `quiz_attempt_questions_v2`. Update the UPSERT logic to only overwrite if `EXCLUDED.updated_at >= quiz_attempt_questions_v2.updated_at`.

### 4.2 Timer Expiration Bypass (High)
* **Description:** The `v1_submit_quiz_attempt` RPC fails to validate `now() <= v_attempt.expires_at`. Furthermore, the background cleanup job `cleanup_stale_quiz_attempts` only targets the legacy V1 table, leaving V2 attempts indefinitely `IN_PROGRESS` if a client disconnects.
* **Exploit Scenario:** A student starts a 10-minute quiz. They disable their network connection, spend 2 hours researching the answers, reconnect, and call `v1_submit_quiz_attempt`. The server accepts the submission and grades it normally, completely bypassing the time limit.
* **Reproduction:**
  Start an attempt. Wait until `expires_at` has passed. Call `v1_submit_quiz_attempt` with a full payload of answers. The attempt will be graded and marked as `SUBMITTED`.
* **Recommended Fix:**
  1. Add an explicit check in `v1_submit_quiz_attempt`: `IF now() > v_attempt.expires_at THEN ... handle late submission ... END IF;`
  2. Update `cleanup_stale_quiz_attempts()` to clean up `quiz_attempts_v2`.

## 5. Medium-Risk Issues

### 5.1 Client-Side Timer Manipulation (Medium)
* **Description:** `v1_submit_quiz_attempt` calculates the total `time_spent` by preferring the client-provided value (`p_telemetry_data ->> 'time_spent_seconds'`).
* **Exploit Scenario:** A student intercepts the submission request and alters `time_spent_seconds` to `1`. The analytics dashboard and teacher reports will falsely show the student completed the quiz in 1 second.
* **Reproduction:**
  Submit a quiz with `{"time_spent_seconds": 1}` in the telemetry data.
* **Recommended Fix:**
  Always use the server-calculated duration: `FLOOR(EXTRACT(EPOCH FROM (now() - v_attempt.started_at)))::integer`. The client duration should only be stored purely for telemetry/debugging, not as the canonical `time_spent`.

## 6. Multi-Tenant Security

### 6.1 Multi-Tenant Isolation Status (Pass)
* Row Level Security (RLS) policies correctly scope queries.
* Exact policy logic for `quiz_attempts_v2` (from Phase 1 / Migration 76):
  ```sql
  CREATE POLICY "Students access their attempts" ON public.quiz_attempts_v2 FOR SELECT
  USING (student_id = auth.uid() AND tenant_id = get_my_tenant_id());
  ```
* Exact policy logic for `quiz_attempt_questions_v2` (Patched in Migration 78 to enforce owner context instead of just tenant check):
  ```sql
  CREATE POLICY "Students access own attempt questions" ON public.quiz_attempt_questions_v2 FOR SELECT
  USING (
    tenant_id = get_my_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.quiz_attempts_v2 a
      WHERE a.id = quiz_attempt_questions_v2.attempt_id AND a.student_id = auth.uid()
    )
  );

  CREATE POLICY "Students insert own attempt questions" ON public.quiz_attempt_questions_v2 FOR INSERT
  WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.quiz_attempts_v2 a
      WHERE a.id = attempt_id AND a.student_id = auth.uid() AND a.status = 'IN_PROGRESS'
    )
  );
  ```

## 7. Suggested Architecture Improvements

1. **Idempotency Keys:** Require a UUID idempotency key for all state-mutating RPCs (Start, Save, Submit) to cleanly handle network retries without complex state checks.
2. **Event Sourcing for Answers:** Instead of purely UPSERTing answers, append answer changes to an event log (`quiz_answer_events`), and project them into the canonical state. This completely eliminates out-of-order bugs and provides rich replayability for cheating investigations.
3. **Decouple Expiration from Submission:** Shift expiration enforcement strictly to a server-side cron job. If the cron job marks the attempt `EXPIRED`, the submit RPC should reject any further mutations and only return the final graded state.
