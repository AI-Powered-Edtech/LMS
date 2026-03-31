-- Group Tasks table + RPCs
-- ============================================================
-- Sprint 3.3 — Persistent sub-tasks for group assignments
-- Table:  group_tasks
-- RPCs:   get_group_tasks, create_group_task,
--         update_group_task_status, delete_group_task

-- 1. group_tasks table
CREATE TABLE IF NOT EXISTS group_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      uuid NOT NULL REFERENCES assignment_groups(id) ON DELETE CASCADE,
  tenant_id     uuid NOT NULL,
  title         text NOT NULL,
  assignee_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'in_progress', 'completed')),
  sort_order    int  NOT NULL DEFAULT 0,
  created_by    uuid NOT NULL REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE group_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON group_tasks
  USING (tenant_id = (SELECT get_my_tenant_id()));

CREATE TRIGGER set_tenant_id
  BEFORE INSERT ON group_tasks
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

CREATE INDEX IF NOT EXISTS idx_group_tasks_group_id
  ON group_tasks(group_id);

-- ============================================================
-- 2. RPC: get_group_tasks
-- Returns all tasks for a group, ordered by sort_order.
-- ============================================================
CREATE OR REPLACE FUNCTION get_group_tasks(
  p_group_id uuid
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

  -- Verify caller is a member of this group or owns the assignment (teacher)
  IF NOT EXISTS (
    SELECT 1 FROM assignment_group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM assignment_groups ag
    JOIN assignments a ON a.id = ag.assignment_id
    WHERE ag.id = p_group_id AND a.teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to view tasks for this group';
  END IF;

  SELECT COALESCE(json_agg(json_build_object(
    'id',           gt.id,
    'title',        gt.title,
    'assignee_id',  gt.assignee_id,
    'assignee_name', COALESCE(
      NULLIF(trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
      'Belum ditugaskan'
    ),
    'status',       gt.status,
    'sort_order',   gt.sort_order,
    'created_at',   gt.created_at
  ) ORDER BY gt.sort_order, gt.created_at), '[]'::json) INTO v_result
  FROM group_tasks gt
  LEFT JOIN profiles p ON p.id = gt.assignee_id
  WHERE gt.group_id = p_group_id;

  RETURN v_result;
END;
$$;

-- ============================================================
-- 3. RPC: create_group_task
-- Any group member can create a task.
-- ============================================================
CREATE OR REPLACE FUNCTION create_group_task(
  p_group_id    uuid,
  p_title       text,
  p_assignee_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_task_id   uuid;
  v_next_sort int;
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

  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_next_sort
  FROM group_tasks
  WHERE group_id = p_group_id;

  INSERT INTO group_tasks (group_id, title, assignee_id, sort_order, created_by)
  VALUES (p_group_id, p_title, p_assignee_id, v_next_sort, auth.uid())
  RETURNING id INTO v_task_id;

  RETURN json_build_object('success', true, 'task_id', v_task_id);
END;
$$;

-- ============================================================
-- 4. RPC: update_group_task_status
-- Cycles status: pending → in_progress → completed → pending
-- ============================================================
CREATE OR REPLACE FUNCTION update_group_task_status(
  p_task_id    uuid,
  p_new_status text
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

  IF p_new_status NOT IN ('pending', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;

  -- Verify the task exists
  IF NOT EXISTS (
    SELECT 1 FROM group_tasks WHERE id = p_task_id
  ) THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Verify caller is a member of the task's group
  IF NOT EXISTS (
    SELECT 1 FROM group_tasks gt
    JOIN assignment_group_members agm ON agm.group_id = gt.group_id
    WHERE gt.id = p_task_id AND agm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to update this task';
  END IF;

  UPDATE group_tasks
  SET status = p_new_status, updated_at = now()
  WHERE id = p_task_id;

  RETURN json_build_object('success', true);
END;
$$;

-- ============================================================
-- 5. RPC: delete_group_task
-- Only the creator or a group leader can delete a task.
-- ============================================================
CREATE OR REPLACE FUNCTION delete_group_task(
  p_task_id uuid
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

  -- Verify the task exists
  IF NOT EXISTS (
    SELECT 1 FROM group_tasks WHERE id = p_task_id
  ) THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Verify caller is the task creator OR a group leader
  IF NOT EXISTS (
    SELECT 1 FROM group_tasks gt
    WHERE gt.id = p_task_id AND gt.created_by = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM group_tasks gt
    JOIN assignment_group_members agm ON agm.group_id = gt.group_id
    WHERE gt.id = p_task_id AND agm.user_id = auth.uid() AND agm.role = 'leader'
  ) THEN
    RAISE EXCEPTION 'Not authorized to delete this task';
  END IF;

  DELETE FROM group_tasks WHERE id = p_task_id;

  RETURN json_build_object('success', true);
END;
$$;
