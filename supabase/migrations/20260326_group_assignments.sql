-- Group Assignments tables, RLS, and RPCs
-- ============================================================
-- Sprint 22C — C1: Group Assignments full implementation
-- Tables: assignment_groups, assignment_group_members, group_submissions
-- RPCs:   get_student_group_assignment, get_teacher_group_overview,
--         create_assignment_groups, submit_group_assignment,
--         grade_group_submission

-- 1. assignment_groups table
-- Foreign key references classes(id) because the assignments table
-- uses class_id referencing classes, not a "classrooms" table.
CREATE TABLE IF NOT EXISTS assignment_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  class_id    uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL,
  name        text NOT NULL,
  max_members int  DEFAULT 5,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE assignment_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON assignment_groups;
CREATE POLICY "tenant_isolation" ON assignment_groups
  USING (tenant_id = (SELECT get_my_tenant_id()));

CREATE TRIGGER set_tenant_id
  BEFORE INSERT ON assignment_groups
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

-- 2. assignment_group_members table
CREATE TABLE IF NOT EXISTS assignment_group_members (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  uuid NOT NULL REFERENCES assignment_groups(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  role      text DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE assignment_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON assignment_group_members;
CREATE POLICY "tenant_isolation" ON assignment_group_members
  USING (tenant_id = (SELECT get_my_tenant_id()));

CREATE TRIGGER set_tenant_id
  BEFORE INSERT ON assignment_group_members
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

-- 3. group_submissions table
CREATE TABLE IF NOT EXISTS group_submissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     uuid NOT NULL REFERENCES assignment_groups(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  tenant_id    uuid NOT NULL,
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  content      text,
  file_url     text,
  status       text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'graded')),
  grade        numeric(5,2),
  feedback     text,
  submitted_at timestamptz,
  graded_at    timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE group_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON group_submissions;
CREATE POLICY "tenant_isolation" ON group_submissions
  USING (tenant_id = (SELECT get_my_tenant_id()));

CREATE TRIGGER set_tenant_id
  BEFORE INSERT ON group_submissions
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignment_groups_assignment_id
  ON assignment_groups(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_group_members_group_id
  ON assignment_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_assignment_group_members_user_id
  ON assignment_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_submissions_group_id
  ON group_submissions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_submissions_assignment_id
  ON group_submissions(assignment_id);

-- ============================================================
-- 4. RPC: get_student_group_assignment
-- Returns the group + members + submission for a given student & assignment.
-- ============================================================
CREATE OR REPLACE FUNCTION get_student_group_assignment(
  p_user_id       uuid,
  p_assignment_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT json_build_object(
    'group', json_build_object(
      'id',          ag.id,
      'name',        ag.name,
      'max_members', ag.max_members
    ),
    'members', (
      SELECT COALESCE(json_agg(json_build_object(
        'user_id',      agm.user_id,
        'role',         agm.role,
        'display_name', COALESCE(
          NULLIF(trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
          'Siswa'
        ),
        'avatar_url',   p.avatar_url
      )), '[]'::json)
      FROM assignment_group_members agm
      LEFT JOIN profiles p ON p.id = agm.user_id
      WHERE agm.group_id = ag.id
    ),
    'submission', (
      SELECT json_build_object(
        'id',           gs.id,
        'status',       gs.status,
        'content',      gs.content,
        'file_url',     gs.file_url,
        'submitted_at', gs.submitted_at,
        'grade',        gs.grade,
        'feedback',     gs.feedback
      )
      FROM group_submissions gs
      WHERE gs.group_id = ag.id
        AND gs.assignment_id = p_assignment_id
      ORDER BY gs.created_at DESC
      LIMIT 1
    )
  ) INTO v_result
  FROM assignment_groups ag
  JOIN assignment_group_members agm ON agm.group_id = ag.id
  WHERE ag.assignment_id = p_assignment_id
    AND agm.user_id = p_user_id;

  RETURN v_result;
END;
$$;

-- ============================================================
-- 5. RPC: get_teacher_group_overview
-- Returns all groups with member details and submission status.
-- ============================================================
CREATE OR REPLACE FUNCTION get_teacher_group_overview(
  p_assignment_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(json_agg(json_build_object(
    'group_id',         ag.id,
    'group_name',       ag.name,
    'max_members',      ag.max_members,
    'member_count',     (
      SELECT count(*)
      FROM assignment_group_members
      WHERE group_id = ag.id
    ),
    'members', (
      SELECT COALESCE(json_agg(json_build_object(
        'user_id',      agm.user_id,
        'role',         agm.role,
        'display_name', COALESCE(
          NULLIF(trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
          'Siswa'
        ),
        'avatar_url',   p.avatar_url
      )), '[]'::json)
      FROM assignment_group_members agm
      LEFT JOIN profiles p ON p.id = agm.user_id
      WHERE agm.group_id = ag.id
    ),
    'submission_status', COALESCE(
      (
        SELECT gs.status
        FROM group_submissions gs
        WHERE gs.group_id = ag.id
        ORDER BY gs.created_at DESC
        LIMIT 1
      ),
      'not_started'
    ),
    'grade', (
      SELECT gs.grade
      FROM group_submissions gs
      WHERE gs.group_id = ag.id
        AND gs.status = 'graded'
      ORDER BY gs.created_at DESC
      LIMIT 1
    )
  )), '[]'::json) INTO v_result
  FROM assignment_groups ag
  WHERE ag.assignment_id = p_assignment_id;

  RETURN v_result;
END;
$$;

-- ============================================================
-- 6. RPC: create_assignment_groups
-- Teacher creates groups and assigns members for an assignment.
-- p_groups JSON array: [{"name": "...", "member_ids": ["uuid", ...]}, ...]
-- ============================================================
CREATE OR REPLACE FUNCTION create_assignment_groups(
  p_assignment_id uuid,
  p_groups        json
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_group_item   json;
  v_new_group_id uuid;
  v_member_id    uuid;
  v_asgn         RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, class_id, tenant_id
  INTO v_asgn
  FROM assignments
  WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;

  FOR v_group_item IN
    SELECT value FROM json_array_elements(p_groups)
  LOOP
    INSERT INTO assignment_groups (
      assignment_id,
      class_id,
      tenant_id,
      name
    ) VALUES (
      p_assignment_id,
      v_asgn.class_id,
      v_asgn.tenant_id,
      v_group_item->>'name'
    )
    RETURNING id INTO v_new_group_id;

    FOR v_member_id IN
      SELECT (elem::text)::uuid
      FROM json_array_elements_text(v_group_item->'member_ids') AS elem
    LOOP
      INSERT INTO assignment_group_members (group_id, user_id, tenant_id)
      VALUES (v_new_group_id, v_member_id, v_asgn.tenant_id);
    END LOOP;
  END LOOP;

  RETURN json_build_object('success', true);
END;
$$;

-- ============================================================
-- 7. RPC: submit_group_assignment
-- Any group member can submit on behalf of the group.
-- ============================================================
CREATE OR REPLACE FUNCTION submit_group_assignment(
  p_group_id      uuid,
  p_assignment_id uuid,
  p_content       text  DEFAULT NULL,
  p_file_url      text  DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
  v_sub_id    uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is a member of this group
  IF NOT EXISTS (
    SELECT 1 FROM assignment_group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  SELECT tenant_id INTO v_tenant_id
  FROM assignment_groups
  WHERE id = p_group_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  INSERT INTO group_submissions (
    group_id, assignment_id, tenant_id,
    submitted_by, content, file_url,
    status, submitted_at
  ) VALUES (
    p_group_id, p_assignment_id, v_tenant_id,
    auth.uid(), p_content, p_file_url,
    'submitted', now()
  )
  RETURNING id INTO v_sub_id;

  RETURN json_build_object('success', true, 'submission_id', v_sub_id);
END;
$$;

-- ============================================================
-- 8. RPC: grade_group_submission
-- Teacher grades a group submission.
-- ============================================================
CREATE OR REPLACE FUNCTION grade_group_submission(
  p_submission_id uuid,
  p_grade         numeric,
  p_feedback      text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE group_submissions
  SET
    grade     = p_grade,
    feedback  = p_feedback,
    status    = 'graded',
    graded_at = now(),
    updated_at = now()
  WHERE id = p_submission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  RETURN json_build_object('success', true);
END;
$$;
