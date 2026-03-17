-- Migration: 55_demo_seed_data.sql
-- Goal: Populate the isolated demo tenant with rich, non-conflicting mock data.
-- This script ensures existing demo accounts are linked to a dedicated tenant.

DO $$
DECLARE
    v_tenant_id uuid := '00000000-0000-0000-0000-00000000000d'; -- Demo Tenant ID
    v_teacher_id uuid;
    v_teacher_email text := 'teacher@edusync.dev';
    v_student_id uuid;
    v_student_email text := 'student@edusync.dev';
    v_course_id uuid;
    v_module_id uuid;
    v_lesson1_id uuid;
    v_lesson2_id uuid;
    v_assignment_id uuid;
    v_quiz_id uuid;
BEGIN
    -- 1. Create Demo Tenant if not exists
    INSERT INTO tenants (id, name, slug, created_at)
    VALUES (v_tenant_id, 'EduSync Demo School', 'edu-demo', now())
    ON CONFLICT (id) DO NOTHING;

    -- 2. Locate existing demo accounts
    SELECT id INTO v_teacher_id FROM auth.users WHERE email = v_teacher_email;
    SELECT id INTO v_student_id FROM auth.users WHERE email = v_student_email;

    -- Skip if demo users don't exist
    IF v_teacher_id IS NULL OR v_student_id IS NULL THEN
        RAISE NOTICE 'Skipping seed: Demo users not found in auth.users';
        RETURN;
    END IF;

    -- 3. Link Users to Demo Tenant
    -- Profiles (Include 'email' which is NOT NULL, and use first/last name)
    INSERT INTO profiles (id, tenant_id, email, first_name, last_name, created_at)
    VALUES 
        (v_teacher_id, v_tenant_id, v_teacher_email, 'Teacher', 'Demo', now()),
        (v_student_id, v_tenant_id, v_student_email, 'Student', 'Demo', now())
    ON CONFLICT (id) DO UPDATE SET 
        tenant_id = v_tenant_id, 
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name, 
        last_name = EXCLUDED.last_name;

    -- Roles (Use ON CONFLICT to handle user_id/role uniqueness)
    INSERT INTO user_roles (user_id, role, tenant_id) 
    VALUES (v_teacher_id, 'TEACHER', v_tenant_id)
    ON CONFLICT (user_id, role) DO UPDATE SET tenant_id = v_tenant_id;

    INSERT INTO user_roles (user_id, role, tenant_id) 
    VALUES (v_student_id, 'STUDENT', v_tenant_id)
    ON CONFLICT (user_id, role) DO UPDATE SET tenant_id = v_tenant_id;

    -- 4. Create Mock Course Structure
    INSERT INTO courses (tenant_id, title, description, created_by, created_at)
    VALUES (v_tenant_id, 'Web Development Boot Camp', 'A comprehensive course on modern web technologies.', v_teacher_id, now())
    RETURNING id INTO v_course_id;

    INSERT INTO course_modules (tenant_id, course_id, title, "order", created_at)
    VALUES (v_tenant_id, v_course_id, 'Getting Started', 1, now())
    RETURNING id INTO v_module_id;

    -- Lessons (Using 'type' column)
    INSERT INTO lessons (tenant_id, module_id, title, content, type, "order", created_at)
    VALUES (v_tenant_id, v_module_id, 'Introduction to HTML', 'HTML is the standard markup language for documents designed to be displayed in a web browser.', 'reading', 1, now())
    RETURNING id INTO v_lesson1_id;

    INSERT INTO lessons (tenant_id, module_id, title, content, type, "order", created_at)
    VALUES (v_tenant_id, v_module_id, 'First Project: Personal Website', 'Create your first website using HTML and CSS.', 'assignment', 2, now())
    RETURNING id INTO v_lesson2_id;

    -- 5. Enroll Student
    INSERT INTO course_enrollments (tenant_id, course_id, user_id, role, status, created_at)
    VALUES (v_tenant_id, v_course_id, v_student_id, 'student', 'active', now())
    ON CONFLICT (course_id, user_id) DO NOTHING;

    -- 6. Add Assignment
    INSERT INTO assignments (tenant_id, course_id, lesson_id, title, instructions, max_points, due_date, created_by, created_at)
    VALUES (v_tenant_id, v_course_id, v_lesson2_id, 'Build a Portfolio Page', 'Use HTML/CSS to build a landing page for your work.', 100, now() + interval '7 days', v_teacher_id, now())
    RETURNING id INTO v_assignment_id;

    -- 7. Add Quiz (Now supports course_id and module_id)
    INSERT INTO quizzes (tenant_id, course_id, module_id, title, instructions, time_limit_minutes, is_published, created_at)
    VALUES (v_tenant_id, v_course_id, v_module_id, 'HTML Basics Quiz', 'Test your knowledge of HTML tags.', 15, true, now())
    RETURNING id INTO v_quiz_id;

    -- 8. Add Mock Submission for Dashboard Feedback
    INSERT INTO assignment_submissions (tenant_id, assignment_id, student_id, submission_text, status, submitted_at)
    VALUES (v_tenant_id, v_assignment_id, v_student_id, 'Here is my portfolio link: demo.portfolio.com', 'submitted', now() - interval '2 hours')
    ON CONFLICT (assignment_id, student_id) DO NOTHING;

END $$;
