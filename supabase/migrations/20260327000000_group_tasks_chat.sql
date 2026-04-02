-- 1. group_tasks table
CREATE TABLE IF NOT EXISTS group_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid NOT NULL REFERENCES assignment_groups(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status      text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date    timestamp with time zone,
  created_by  uuid NOT NULL REFERENCES auth.users(id),
  tenant_id   uuid NOT NULL,
  created_at  timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. group_messages table
CREATE TABLE IF NOT EXISTS group_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid NOT NULL REFERENCES assignment_groups(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     text NOT NULL,
  tenant_id   uuid NOT NULL,
  created_at  timestamp with time zone DEFAULT now() NOT NULL
);

-- Triggers for auto_set_tenant_id
CREATE TRIGGER set_tenant_id_group_tasks
  BEFORE INSERT ON group_tasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER set_tenant_id_group_messages
  BEFORE INSERT ON group_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();

-- Enable RLS
ALTER TABLE group_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_tasks
CREATE POLICY "tenant_isolation_group_tasks" ON group_tasks
  USING (tenant_id = (SELECT get_my_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_my_tenant_id()));

CREATE POLICY "group_members_can_access_tasks" ON group_tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM assignment_group_members
      WHERE group_id = group_tasks.group_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "group_members_can_update_task_status" ON group_tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assignment_group_members agm
      WHERE agm.group_id = group_tasks.group_id
        AND agm.user_id = auth.uid()
    )
    AND tenant_id = (SELECT get_my_tenant_id())
  )
  WITH CHECK (tenant_id = (SELECT get_my_tenant_id()));

-- RLS Policies for group_messages
CREATE POLICY "tenant_isolation_group_messages" ON group_messages
  USING (tenant_id = (SELECT get_my_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_my_tenant_id()));

CREATE POLICY "group_members_can_access_messages" ON group_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM assignment_group_members
      WHERE group_id = group_messages.group_id
      AND user_id = auth.uid()
    )
  );

-- Enable Realtime for group_messages
ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
