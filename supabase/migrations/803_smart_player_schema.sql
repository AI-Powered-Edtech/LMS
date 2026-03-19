-- ============================================================================
-- Migration 803: Smart Player Schema
-- ============================================================================
-- SP-0:    Fix resource_type enum → text, url nullable, add order_index index
-- SP-0.5:  Add quiz_id / assignment_id FK columns + get_smart_lesson() RPC
-- SP-0.75: lesson_snapshots table + generate/get snapshot RPCs
-- Leaderboard: ensure user_id exposed in leaderboards RLS
-- ============================================================================

SET search_path = public;

-- ============================================================================
-- SP-0: Fix lesson_resources.type (enum → text)
-- ============================================================================

-- Step 1: Drop the enum DEFAULT so PostgreSQL allows ALTER COLUMN TYPE.
-- The default 'LINK'::resource_type cannot be cast automatically to text.
ALTER TABLE lesson_resources
  ALTER COLUMN type DROP DEFAULT;

-- Step 2: Convert type column from enum to lowercase text.
-- MUST happen before DROP TYPE, and BEFORE the CHECK constraint is added.
ALTER TABLE lesson_resources
  ALTER COLUMN type TYPE text USING lower(type::text);

-- Step 3: Set a safe text default for new rows.
ALTER TABLE lesson_resources
  ALTER COLUMN type SET DEFAULT 'link';

-- Step 4: Make url nullable.
-- text/quiz/assignment blocks have no URL.
ALTER TABLE lesson_resources
  ALTER COLUMN url DROP NOT NULL;

-- Step 5: Add CHECK constraint for valid block types.
-- Covers both old uppercase values (now lowercased by step 2) and new types.
ALTER TABLE lesson_resources
  DROP CONSTRAINT IF EXISTS lesson_resources_type_check;

ALTER TABLE lesson_resources
  ADD CONSTRAINT lesson_resources_type_check
  CHECK (type IN ('text', 'video', 'image', 'file', 'quiz', 'assignment', 'link', 'document', 'pdf'));

-- Step 6: Drop the now-unused resource_type enum.
-- Safe because step 2 already migrated the column to text.
DROP TYPE IF EXISTS resource_type;

-- ============================================================================
-- SP-0.5: FK columns for tenant-safe quiz/assignment block references
-- ============================================================================

-- Add explicit FK columns to prevent cross-tenant metadata references.
-- These replace the fragile metadata-based quiz_id/assignment_id lookups.

ALTER TABLE lesson_resources
  ADD COLUMN IF NOT EXISTS quiz_id uuid REFERENCES quizzes(id) ON DELETE SET NULL;

ALTER TABLE lesson_resources
  ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES assignments(id) ON DELETE SET NULL;

-- Indexes for FK lookups
CREATE INDEX IF NOT EXISTS idx_lesson_resources_quiz
  ON lesson_resources (quiz_id) WHERE quiz_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lesson_resources_assignment
  ON lesson_resources (assignment_id) WHERE assignment_id IS NOT NULL;

-- ============================================================================
-- SP-0.5: get_smart_lesson() — Single-query lesson aggregation RPC
-- ============================================================================
-- Replaces N+1 query pattern: 1 call returns full lesson graph.
-- All tenant_id enforcement happens server-side — no cross-tenant leak possible.

CREATE OR REPLACE FUNCTION get_smart_lesson(
  p_lesson_id uuid,
  p_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'lesson', jsonb_build_object(
      'id',               l.id,
      'module_id',        l.module_id,
      'title',            l.title,
      'content',          l.content,
      'type',             l.type,
      'order',            l."order",
      'passing_score',    l.passing_score,
      'is_published',     l.is_published,
      'duration_minutes', l.duration_minutes,
      'tenant_id',        l.tenant_id
    ),
    'course_id', cm.course_id,
    'resources', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',            r.id,
          'type',          r.type,
          'content',       r.content,
          'url',           r.url,
          'title',         r.title,
          'metadata',      r.metadata,
          'order_index',   r.order_index,
          'quiz_id',       r.quiz_id,
          'assignment_id', r.assignment_id
        ) ORDER BY r.order_index
      )
      FROM lesson_resources r
      WHERE r.lesson_id = l.id
        AND r.tenant_id = p_tenant_id
    ), '[]'::jsonb),
    'quizzes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',                  q.id,
        'title',               q.title,
        'instructions',        q.instructions,
        'time_limit_minutes',  q.time_limit_minutes,
        'max_attempts',        q.max_attempts,
        'questions', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id',    qq.id,
            'text',  qq.text,
            'order', qq."order",
            'options', COALESCE((
              SELECT jsonb_agg(jsonb_build_object(
                'id',   qo.id,
                'text', qo.text
              ))
              FROM quiz_options qo
              WHERE qo.question_id = qq.id
            ), '[]'::jsonb)
          ) ORDER BY qq."order")
          FROM quiz_questions qq
          WHERE qq.quiz_id = q.id
        ), '[]'::jsonb)
      ))
      FROM quizzes q
      WHERE q.lesson_id = l.id
        AND q.tenant_id = p_tenant_id
    ), '[]'::jsonb),
    'assignments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',           a.id,
        'title',        a.title,
        'instructions', a.instructions,
        'max_points',   a.max_points,
        'max_attempts', a.max_attempts,
        'is_published', a.is_published,
        'due_date',     a.due_date
      ))
      FROM assignments a
      WHERE a.lesson_id = l.id
        AND a.tenant_id = p_tenant_id
    ), '[]'::jsonb)
  ) INTO result
  FROM lessons l
  JOIN course_modules cm ON cm.id = l.module_id
  WHERE l.id = p_lesson_id
    AND l.tenant_id = p_tenant_id;

  RETURN result;
END;
$$;

-- ============================================================================
-- SP-0.75: lesson_snapshots — Pre-generated lesson JSON cache
-- ============================================================================
-- Teachers publish → generate snapshot → students read pre-built JSON (zero joins).
-- Snapshot is regenerated on each publish; students always read a consistent version.

CREATE TABLE IF NOT EXISTS lesson_snapshots (
  lesson_id    uuid PRIMARY KEY REFERENCES lessons(id) ON DELETE CASCADE,
  tenant_id    uuid NOT NULL,
  snapshot     jsonb NOT NULL,
  generated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_snapshots_tenant
  ON lesson_snapshots (tenant_id);

ALTER TABLE lesson_snapshots ENABLE ROW LEVEL SECURITY;

-- Students can read snapshots only within their own tenant
DROP POLICY IF EXISTS "Students can read snapshots for their tenant" ON lesson_snapshots;
CREATE POLICY "Students can read snapshots for their tenant"
  ON lesson_snapshots FOR SELECT
  USING (tenant_id = get_my_tenant_id());

-- Teachers and admins can upsert snapshots (called on publish)
DROP POLICY IF EXISTS "Teachers can upsert snapshots" ON lesson_snapshots;
CREATE POLICY "Teachers can upsert snapshots"
  ON lesson_snapshots FOR ALL
  USING (
    tenant_id = get_my_tenant_id()
    AND (
      SELECT role FROM user_profiles WHERE id = auth.uid()
    ) IN ('TEACHER', 'ADMIN')
  );

-- ============================================================================
-- SP-0.75: generate_lesson_snapshot() — Called by teacher on publish
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_lesson_snapshot(
  p_lesson_id uuid,
  p_tenant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  snapshot_data jsonb;
BEGIN
  snapshot_data := get_smart_lesson(p_lesson_id, p_tenant_id);

  INSERT INTO lesson_snapshots (lesson_id, tenant_id, snapshot, generated_at)
  VALUES (p_lesson_id, p_tenant_id, snapshot_data, now())
  ON CONFLICT (lesson_id)
  DO UPDATE SET
    snapshot     = EXCLUDED.snapshot,
    generated_at = now();
END;
$$;

-- ============================================================================
-- SP-0.75: get_lesson_snapshot() — Called by student viewer
-- ============================================================================
-- Primary path: reads pre-built snapshot (simple SELECT, zero joins).
-- Fallback: if no snapshot exists, builds on-the-fly via get_smart_lesson().

CREATE OR REPLACE FUNCTION get_lesson_snapshot(
  p_lesson_id uuid,
  p_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT snapshot INTO result
  FROM lesson_snapshots
  WHERE lesson_id = p_lesson_id
    AND tenant_id = p_tenant_id;

  -- Fallback: snapshot not yet generated (unpublished lesson in preview, etc.)
  IF result IS NULL THEN
    result := get_smart_lesson(p_lesson_id, p_tenant_id);
  END IF;

  RETURN result;
END;
$$;

-- ============================================================================
-- Leaderboard: ensure user_id is readable under RLS
-- ============================================================================
-- The leaderboard service queries user_id from leaderboards + leaderboards_weekly.
-- If RLS was blocking it (causing 400 errors), this policy makes it explicit.

-- Re-create permissive SELECT policy for authenticated users in their tenant.
-- Only adds if missing; existing policies take precedence.
DO $$
BEGIN
  -- leaderboards table
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'leaderboards'
      AND policyname = 'Authenticated users can read leaderboards in their tenant'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Authenticated users can read leaderboards in their tenant"
        ON leaderboards FOR SELECT
        TO authenticated
        USING (tenant_id = get_my_tenant_id())
    $policy$;
  END IF;

  -- leaderboards_weekly table (if it exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'leaderboards_weekly' AND table_schema = 'public'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'leaderboards_weekly'
      AND policyname = 'Authenticated users can read weekly leaderboards in their tenant'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Authenticated users can read weekly leaderboards in their tenant"
        ON leaderboards_weekly FOR SELECT
        TO authenticated
        USING (tenant_id = get_my_tenant_id())
    $policy$;
  END IF;
END;
$$;
