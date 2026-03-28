-- Migration for Track C: Course Collaborators & Workflow

-- 1. Modify courses.status enum
ALTER TYPE "public"."course_status" ADD VALUE IF NOT EXISTS 'in_review';
ALTER TYPE "public"."course_status" ADD VALUE IF NOT EXISTS 'approved';

-- 2. Create course_collaborator_role enum
CREATE TYPE "public"."course_collaborator_role" AS ENUM ('author', 'reviewer', 'publisher');

-- 3. Create course_collaborators table
CREATE TABLE IF NOT EXISTS "public"."course_collaborators" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "course_id" uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "role" public.course_collaborator_role NOT NULL,
    "tenant_id" uuid NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."course_collaborators" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_course_collaborators_course_id ON public.course_collaborators(course_id);
CREATE INDEX IF NOT EXISTS idx_course_collaborators_user_id ON public.course_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_course_collaborators_tenant_id ON public.course_collaborators(tenant_id);

-- Policy for course_collaborators
CREATE POLICY "collaborators_tenant_isolation" ON public.course_collaborators 
    FOR ALL 
    USING (tenant_id = (SELECT public.get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

-- 4. Update RLS Policies for courses
DROP POLICY IF EXISTS "courses_update" ON public.courses;
DROP POLICY IF EXISTS "courses_update_owner" ON public.courses;

CREATE POLICY "courses_update_strict" ON public.courses
FOR UPDATE
USING (
    tenant_id = public.get_my_tenant_id() AND (
        created_by = auth.uid() OR 
        public.has_role('ADMIN') OR 
        EXISTS (
            SELECT 1 FROM public.course_collaborators cc 
            WHERE cc.course_id = id 
            AND cc.user_id = auth.uid() 
            AND cc.role IN ('author', 'publisher')
        )
    )
);

-- For course_modules
DROP POLICY IF EXISTS "course_modules_update" ON public.course_modules;
DROP POLICY IF EXISTS "course_modules_update_owner" ON public.course_modules;

CREATE POLICY "course_modules_update_strict" ON public.course_modules
FOR UPDATE
USING (
    tenant_id = public.get_my_tenant_id() AND (
        public.has_role('ADMIN') OR 
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_id 
            AND (
                c.created_by = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.course_collaborators cc 
                    WHERE cc.course_id = c.id 
                    AND cc.user_id = auth.uid() 
                    AND cc.role IN ('author', 'publisher')
                )
            )
        )
    )
);

-- For lessons
DROP POLICY IF EXISTS "lessons_update" ON public.lessons;
DROP POLICY IF EXISTS "lessons_update_owner" ON public.lessons;

CREATE POLICY "lessons_update_strict" ON public.lessons
FOR UPDATE
USING (
    tenant_id = public.get_my_tenant_id() AND (
        public.has_role('ADMIN') OR 
        EXISTS (
            SELECT 1 FROM public.course_modules m
            JOIN public.courses c ON c.id = m.course_id
            WHERE m.id = module_id
            AND (
                c.created_by = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.course_collaborators cc 
                    WHERE cc.course_id = c.id 
                    AND cc.user_id = auth.uid() 
                    AND cc.role IN ('author', 'publisher')
                )
            )
        )
    )
);

-- Ensure reviewers can select
CREATE POLICY "reviewer_courses_select" ON public.courses
FOR SELECT
USING (
    tenant_id = public.get_my_tenant_id() AND 
    status IN ('draft', 'in_review') AND
    EXISTS (
        SELECT 1 FROM public.course_collaborators cc
        WHERE cc.course_id = id
        AND cc.user_id = auth.uid()
        AND cc.role = 'reviewer'
    )
);

-- Grants
GRANT ALL ON TABLE public.course_collaborators TO authenticated;

-- Auto-set tenant_id trigger
CREATE TRIGGER set_tenant_id_course_collaborators
    BEFORE INSERT ON public.course_collaborators
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();
