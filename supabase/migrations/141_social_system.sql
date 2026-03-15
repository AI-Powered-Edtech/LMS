-- Phase 5: Social & Communication System (Discussions & Notifications)

----------------------------------------------------
-- 1. Create discussions table
----------------------------------------------------
CREATE TABLE discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  parent_id uuid REFERENCES discussions(id) ON DELETE CASCADE,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER set_discussions_updated_at
  BEFORE UPDATE ON discussions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

----------------------------------------------------
-- 2. Add indexes for discussions
----------------------------------------------------
-- For thread list loading (Course level)
CREATE INDEX idx_discussions_course_created ON discussions(course_id, created_at DESC);
-- For lesson specific threads
CREATE INDEX idx_discussions_lesson_created ON discussions(lesson_id, created_at DESC);
-- For reply loading
CREATE INDEX idx_discussions_parent_created ON discussions(parent_id, created_at);

----------------------------------------------------
-- 3. Create notifications table
----------------------------------------------------
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('grade', 'discussion_reply', 'announcement', 'system')),
  entity_id uuid, -- Reference to assignment_id, discussion_id, etc.
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

----------------------------------------------------
-- 4. Add indexes for notifications
----------------------------------------------------
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_desc ON notifications(created_at DESC);

----------------------------------------------------
-- 5. RLS Policies
----------------------------------------------------
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ** DISCUSSIONS RLS **
-- Read: Students read in enrolled courses, Teachers in their courses
CREATE POLICY "Users can view discussions in their courses"
ON discussions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM course_enrollments ce 
    WHERE ce.course_id = discussions.course_id 
    AND ce.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM courses c 
    WHERE c.id = course_id 
    AND c.teacher_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'admin'
  )
);

-- Create: Enrolled students and teachers
CREATE POLICY "Users can create discussions in their courses"
ON discussions FOR INSERT
WITH CHECK (
  author_id = auth.uid() AND
  (
    EXISTS (SELECT 1 FROM course_enrollments ce WHERE ce.course_id = course_id AND ce.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
  )
);

-- Update: Authors can edit their posts
CREATE POLICY "Authors can update their discussions"
ON discussions FOR UPDATE
USING (author_id = auth.uid());

-- Update (Pin): Teachers can pin discussions
CREATE POLICY "Teachers can pin discussions"
ON discussions FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
);

-- Delete: Authors or Teachers
CREATE POLICY "Authors and Teachers can delete discussions"
ON discussions FOR DELETE
USING (
  author_id = auth.uid() OR
  EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
);

-- ** NOTIFICATIONS RLS **
-- Read/Update: Users manage only their own notifications
CREATE POLICY "Users can manage own notifications"
ON notifications
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

----------------------------------------------------
-- 6. Create triggers
----------------------------------------------------

-- Trigger 1: assignment graded -> notify student
CREATE OR REPLACE FUNCTION notify_assignment_graded()
RETURNS TRIGGER AS $$
DECLARE
  v_assignment_title text;
  v_course_id uuid;
BEGIN
  -- GUARD: Only notify when status changes to 'graded'
  IF (NEW.status = 'graded') AND (OLD.status IS DISTINCT FROM 'graded') THEN
    SELECT title, course_id INTO v_assignment_title, v_course_id 
    FROM assignments 
    WHERE id = NEW.assignment_id;

    INSERT INTO notifications (
      tenant_id, user_id, actor_id, title, message, type, entity_id, link
    ) VALUES (
      NEW.tenant_id,
      NEW.user_id,
      auth.uid(), -- The teacher grading
      'Tugas Dinilai',
      'Tugas "' || v_assignment_title || '" telah dinilai (' || NEW.score || '). Tinjau umpan balik guru.',
      'grade',
      NEW.assignment_id,
      '/learning/' || v_course_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_assignment_graded
  AFTER UPDATE ON assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_assignment_graded();

-- Trigger 2: discussion reply -> notify parent author
CREATE OR REPLACE FUNCTION notify_discussion_reply()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_author uuid;
  v_course_id uuid;
  v_actor_name text;
  v_tenant_id uuid;
BEGIN
  -- GUARD: Only if it's a reply
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id, course_id, tenant_id INTO v_parent_author, v_course_id, v_tenant_id 
    FROM discussions 
    WHERE id = NEW.parent_id;
    
    -- SELF-NOTIFICATION GUARD: Don't notify if I reply to my own post
    -- TENANT GUARD: Ensure it's the same tenant
    IF v_parent_author IS NOT NULL AND v_parent_author != NEW.author_id AND v_tenant_id = NEW.tenant_id THEN
      SELECT full_name INTO v_actor_name FROM user_profiles WHERE id = NEW.author_id;

      INSERT INTO notifications (
        tenant_id, user_id, actor_id, title, message, type, entity_id, link
      ) VALUES (
        NEW.tenant_id,
        v_parent_author,
        NEW.author_id,
        'Balasan Diskusi',
        v_actor_name || ' membalas postingan diskusi Anda.',
        'discussion_reply',
        NEW.parent_id,
        '/learning/' || v_course_id || '?tab=discussion'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_discussion_reply
  AFTER INSERT ON discussions
  FOR EACH ROW
  EXECUTE FUNCTION notify_discussion_reply();

----------------------------------------------------
-- 7. Realtime Enablement
----------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
