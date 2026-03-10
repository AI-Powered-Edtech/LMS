-- Phase 5 Refinement: Announcement System & RSVP

----------------------------------------------------
-- 1. Create announcements table
----------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  
  title text NOT NULL,
  content text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  target_audience text NOT NULL DEFAULT 'all_students' 
    CHECK (target_audience IN ('course_students', 'course_staff', 'all_students', 'system')),
  
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_pinned boolean DEFAULT false,
  allow_comments boolean DEFAULT true,
  requires_rsvp boolean DEFAULT false,
  
  location text,
  contact_person text,
  
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER set_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

----------------------------------------------------
-- 2. Create announcement_rsvps table
----------------------------------------------------
CREATE TABLE IF NOT EXISTS announcement_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  response text NOT NULL CHECK (response IN ('yes', 'no', 'maybe')),
  responded_at timestamptz DEFAULT now(),
  
  UNIQUE (announcement_id, user_id)
);

----------------------------------------------------
-- 3. Add indexes for performance
----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_announcements_tenant ON announcements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course_id);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_author ON announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned_created ON announcements(is_pinned DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rsvps_announcement ON announcement_rsvps(announcement_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_user ON announcement_rsvps(user_id);

----------------------------------------------------
-- 4. RLS Policies
----------------------------------------------------
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_rsvps ENABLE ROW LEVEL SECURITY;

-- ** ANNOUNCEMENTS RLS **

-- Read: Students read published announcements in their courses or system-wide
DROP POLICY IF EXISTS "students_read_announcements" ON announcements;
CREATE POLICY "students_read_announcements"
ON announcements FOR SELECT
USING (
  status = 'published' AND
  (
    course_id IS NULL OR -- System-wide
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN classes cl ON cl.id = e.class_id
      WHERE cl.course_id = announcements.course_id 
      AND e.student_id = auth.uid()
    )
  )
);

-- Manage: Teachers and Admins manage their tenant's announcements
DROP POLICY IF EXISTS "staff_manage_announcements" ON announcements;
CREATE POLICY "staff_manage_announcements"
ON announcements FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles up
    WHERE up.id = auth.uid() 
    AND up.tenant_id = announcements.tenant_id
    AND EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('TEACHER', 'ADMIN')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles up
    WHERE up.id = auth.uid() 
    AND up.tenant_id = tenant_id
    AND EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('TEACHER', 'ADMIN')
    )
  )
);

-- ** RSVP RLS **

-- Users manage their own RSVPs
CREATE POLICY "users_manage_own_rsvps"
ON announcement_rsvps FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Teachers can view RSVPs for their announcements
DROP POLICY IF EXISTS "teachers_view_rsvps" ON announcement_rsvps;
CREATE POLICY "teachers_view_rsvps"
ON announcement_rsvps FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM announcements a
    LEFT JOIN classes c ON c.course_id = a.course_id
    WHERE a.id = announcement_rsvps.announcement_id
    AND (c.teacher_id = auth.uid() OR EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN'
    ))
  )
);

----------------------------------------------------
-- 5. Notification Triggers
----------------------------------------------------

-- Trigger 1: Announcement Published -> Notify Target
CREATE OR REPLACE FUNCTION notify_announcement_published()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient_id uuid;
BEGIN
  -- GUARD: Only if status changed to 'published'
  IF (NEW.status = 'published') AND (OLD.status IS DISTINCT FROM 'published' OR OLD.id IS NULL) THEN
    
    -- If course-specific, notify enrolled students
    IF NEW.course_id IS NOT NULL THEN
      INSERT INTO notifications (tenant_id, user_id, title, message, type, entity_id)
      SELECT 
        NEW.tenant_id,
        e.student_id,
        'Pengumuman Baru: ' || NEW.title,
        'Ada pengumuman baru di kursus Anda.',
        'ANNOUNCEMENT',
        NEW.id
      FROM enrollments e
      JOIN classes cl ON cl.id = e.class_id
      WHERE cl.course_id = NEW.course_id AND e.status = 'ACTIVE';
    ELSE
      -- If system-wide, notify all students in the tenant
      INSERT INTO notifications (tenant_id, user_id, title, message, type, entity_id)
      SELECT 
        NEW.tenant_id,
        ur.user_id,
        'Pengumuman Sekolah: ' || NEW.title,
        NEW.title,
        'ANNOUNCEMENT',
        NEW.id
      FROM user_roles ur
      WHERE ur.tenant_id = NEW.tenant_id AND ur.role = 'STUDENT';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_announcement_published
  AFTER INSERT OR UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION notify_announcement_published();

-- Trigger 2: Course Published -> Notify Enrolled
CREATE OR REPLACE FUNCTION notify_course_published()
RETURNS TRIGGER AS $$
BEGIN
  -- GUARD: status changed to 'published'
  IF (NEW.status = 'published') AND (OLD.status IS DISTINCT FROM 'published') THEN
    INSERT INTO notifications (tenant_id, user_id, title, message, type, entity_id)
    SELECT 
      NEW.tenant_id,
      e.student_id,
      'Kursus Diterbitkan',
      'Kursus "' || NEW.title || '" sekarang tersedia untuk diakses.',
      'ANNOUNCEMENT',
      NEW.id
    FROM enrollments e
    JOIN classes cl ON cl.id = e.class_id
    WHERE cl.course_id = NEW.id AND e.status = 'ACTIVE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_course_published
  AFTER UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION notify_course_published();

-- Trigger 3: Quiz Published -> Notify Enrolled
CREATE OR REPLACE FUNCTION notify_quiz_published()
RETURNS TRIGGER AS $$
DECLARE
  v_course_id uuid;
  v_course_title text;
  v_teacher_id uuid;
BEGIN
  -- GUARD: status changed to 'published'
  IF (NEW.status = 'published') AND (OLD.status IS DISTINCT FROM 'published') THEN
    -- Get course info
    SELECT id, title, teacher_id INTO v_course_id, v_course_title, v_teacher_id
    FROM courses WHERE id = NEW.course_id;

    INSERT INTO notifications (tenant_id, user_id, title, message, type, entity_id)
    SELECT 
      NEW.tenant_id,
      e.student_id,
      'Kuis Baru Tersedia',
      'Kuis baru telah diterbitkan di kursus "' || v_course_title || '".',
      'ANNOUNCEMENT',
      NEW.id
    FROM enrollments e
    JOIN classes cl ON cl.id = e.class_id
    WHERE cl.course_id = v_course_id AND e.status = 'ACTIVE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_quiz_published
  AFTER UPDATE ON lessons
  FOR EACH ROW
  WHEN (NEW.type = 'quiz')
  EXECUTE FUNCTION notify_quiz_published();
