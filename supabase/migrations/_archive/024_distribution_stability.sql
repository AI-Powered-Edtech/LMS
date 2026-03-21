-- Migration: 24_distribution_stability.sql
-- Description: Adds enrollment status to handle unassignment safely and improves trigger robustness.

-- 1. Add enrollment_status enum
DO $$ BEGIN
    CREATE TYPE public.enrollment_status AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Update course_enrollments table
ALTER TABLE public.course_enrollments 
ADD COLUMN IF NOT EXISTS status public.enrollment_status NOT NULL DEFAULT 'ACTIVE';

-- 3. Enhance Triggers for Deduplication and Bulk Operations

-- Trigger function for Assignment (Course -> Class)
CREATE OR REPLACE FUNCTION public.handle_course_assigned_to_class()
RETURNS trigger AS $$
BEGIN
    -- Insert or re-activate enrollment
    INSERT INTO public.course_enrollments (tenant_id, course_id, user_id, role, status)
    SELECT NEW.tenant_id, NEW.course_id, e.student_id, 'student', 'ACTIVE'
    FROM public.enrollments e
    WHERE e.class_id = NEW.class_id
      AND e.status = 'ACTIVE'
    ON CONFLICT (user_id, course_id) 
    DO UPDATE SET status = 'ACTIVE', enrolled_at = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for Student Joining Class
CREATE OR REPLACE FUNCTION public.handle_student_joined_class()
RETURNS trigger AS $$
BEGIN
    IF NEW.status = 'ACTIVE' THEN
        INSERT INTO public.course_enrollments (tenant_id, course_id, user_id, role, status)
        SELECT NEW.tenant_id, cc.course_id, NEW.student_id, 'student', 'ACTIVE'
        FROM public.course_classes cc
        WHERE cc.class_id = NEW.class_id
        ON CONFLICT (user_id, course_id) 
        DO UPDATE SET status = 'ACTIVE', enrolled_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New Trigger function for Unassignment (Course removed from Class)
CREATE OR REPLACE FUNCTION public.handle_course_unassigned_from_class()
RETURNS trigger AS $$
BEGIN
    -- Mark enrollments as INACTIVE for students in this class for this course
    -- UNLESS they are enrolled via another class that still has this course
    UPDATE public.course_enrollments ce
    SET status = 'INACTIVE'
    WHERE ce.course_id = OLD.course_id
      AND ce.user_id IN (
          SELECT student_id 
          FROM public.enrollments 
          WHERE class_id = OLD.class_id
      )
      AND NOT EXISTS (
          -- Check if student is in another class that also has this course assigned
          SELECT 1 
          FROM public.course_classes cc
          JOIN public.enrollments e ON e.class_id = cc.class_id
          WHERE cc.course_id = OLD.course_id
            AND e.student_id = ce.user_id
            AND cc.class_id != OLD.class_id
      );
      
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_course_class_deleted ON public.course_classes;
CREATE TRIGGER on_course_class_deleted
    AFTER DELETE ON public.course_classes
    FOR EACH ROW EXECUTE FUNCTION public.handle_course_unassigned_from_class();

-- 4. Update Course Visibility RLS to check for ACTIVE status
DROP POLICY IF EXISTS "Users can view courses" ON public.courses;
CREATE POLICY "Users can view courses"
  ON public.courses FOR SELECT
  USING (
    tenant_id::text = auth.jwt() ->> 'tenant_id' 
    AND (
      (auth.jwt() ->> 'role' = 'TEACHER' or auth.jwt() ->> 'role' = 'ADMIN')
      OR 
      EXISTS (
        SELECT 1 FROM public.course_enrollments ce 
        WHERE ce.course_id = courses.id 
        AND ce.user_id = auth.uid()
        AND ce.status = 'ACTIVE'
      )
    )
  );

-- 5. Performance Indices
CREATE INDEX IF NOT EXISTS idx_enrollments_course_user_status ON public.course_enrollments (course_id, user_id, status);
