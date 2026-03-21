-- 1. Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Add policies to user_roles
DROP POLICY IF EXISTS "user_roles_select_self" ON public.user_roles;
CREATE POLICY "user_roles_select_self" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_roles_select_tenant_admin" ON public.user_roles;
CREATE POLICY "user_roles_select_tenant_admin" ON public.user_roles
    FOR SELECT USING (tenant_id = get_my_tenant_id() AND has_role('ADMIN'));

DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
CREATE POLICY "user_roles_admin_manage" ON public.user_roles
    FOR ALL USING (tenant_id = get_my_tenant_id() AND has_role('ADMIN'))
    WITH CHECK (tenant_id = get_my_tenant_id() AND has_role('ADMIN'));

-- 3. Add indexes for user_roles (user_id, tenant_id)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON public.user_roles(tenant_id);

-- 4. In profiles table, add or update INSERT policy 'profiles_insert_own'
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid() AND tenant_id = get_my_tenant_id());

-- 5. Standardize RLS across major tables (courses, modules, lessons, etc.)
-- Explicitly calls DROP POLICY IF EXISTS before creating new ones for determinism
-- Uses get_my_tenant_id() instead of auth.jwt() ->> 'tenant_id'

-- COURSES
DROP POLICY IF EXISTS "courses_select" ON public.courses;
CREATE POLICY "courses_select" ON public.courses
    FOR SELECT USING (tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS "courses_insert" ON public.courses;
CREATE POLICY "courses_insert" ON public.courses
    FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')));

DROP POLICY IF EXISTS "courses_update" ON public.courses;
CREATE POLICY "courses_update" ON public.courses
    FOR UPDATE USING (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')))
    WITH CHECK (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')));

DROP POLICY IF EXISTS "courses_delete" ON public.courses;
CREATE POLICY "courses_delete" ON public.courses
    FOR DELETE USING (tenant_id = get_my_tenant_id() AND has_role('ADMIN'));

-- MODULES
DROP POLICY IF EXISTS "modules_select" ON public.modules;
CREATE POLICY "modules_select" ON public.modules
    FOR SELECT USING (tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS "modules_insert" ON public.modules;
CREATE POLICY "modules_insert" ON public.modules
    FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')));

DROP POLICY IF EXISTS "modules_update" ON public.modules;
CREATE POLICY "modules_update" ON public.modules
    FOR UPDATE USING (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')))
    WITH CHECK (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')));

DROP POLICY IF EXISTS "modules_delete" ON public.modules;
CREATE POLICY "modules_delete" ON public.modules
    FOR DELETE USING (tenant_id = get_my_tenant_id() AND has_role('ADMIN'));

-- LESSONS
DROP POLICY IF EXISTS "lessons_select" ON public.lessons;
CREATE POLICY "lessons_select" ON public.lessons
    FOR SELECT USING (tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS "lessons_insert" ON public.lessons;
CREATE POLICY "lessons_insert" ON public.lessons
    FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')));

DROP POLICY IF EXISTS "lessons_update" ON public.lessons;
CREATE POLICY "lessons_update" ON public.lessons
    FOR UPDATE USING (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')))
    WITH CHECK (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')));

DROP POLICY IF EXISTS "lessons_delete" ON public.lessons;
CREATE POLICY "lessons_delete" ON public.lessons
    FOR DELETE USING (tenant_id = get_my_tenant_id() AND has_role('ADMIN'));

-- CLASSES
DROP POLICY IF EXISTS "classes_select" ON public.classes;
CREATE POLICY "classes_select" ON public.classes
    FOR SELECT USING (tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS "classes_insert" ON public.classes;
CREATE POLICY "classes_insert" ON public.classes
    FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')));

DROP POLICY IF EXISTS "classes_update" ON public.classes;
CREATE POLICY "classes_update" ON public.classes
    FOR UPDATE USING (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')))
    WITH CHECK (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')));

DROP POLICY IF EXISTS "classes_delete" ON public.classes;
CREATE POLICY "classes_delete" ON public.classes
    FOR DELETE USING (tenant_id = get_my_tenant_id() AND has_role('ADMIN'));
