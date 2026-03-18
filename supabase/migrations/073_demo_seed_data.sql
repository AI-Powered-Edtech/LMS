-- Migration 54: Fix assignment schema and seed demo data
-- This migration ensures the 'score' column exists and populates the demo tenant with rich mock data.

-- 1. Fix missing score column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assignment_submissions' AND column_name='score') THEN
        ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS score numeric;
    END IF;
END $$;

-- 2. Seed Demo Data inside a DO block to handle dynamic IDs
DO $$
DECLARE
    v_tenant_id uuid;
    v_teacher_id uuid;
    v_student_id uuid;
    v_course_id uuid;
    v_module_id uuid;
    v_lesson1_id uuid;
    v_lesson2_id uuid;
    v_assignment_id uuid;
    v_quiz_id uuid;
BEGIN
    -- Locate Demo Users (They should exist based on user feedback)
    -- If not found, we use a default UUID or skip.
    SELECT id, (raw_user_meta_data->>'tenant_id')::uuid INTO v_teacher_id, v_tenant_id 
    FROM auth.users WHERE email = 'teacher@edusync.dev' LIMIT 1;
    
    SELECT id INTO v_student_id FROM auth.users WHERE email = 'student@edusync.dev' LIMIT 1;

    -- Fallback: If tenant_id is missing from metadata, check tenants table or create one
    IF v_tenant_id IS NULL THEN
        SELECT id INTO v_tenant_id FROM tenants WHERE name ILIKE '%Demo%' LIMIT 1;
        IF v_tenant_id IS NULL THEN
            INSERT INTO tenants (name, slug) 
            VALUES ('Demo Academy', 'demo-academy') 
            RETURNING id INTO v_tenant_id;
        END IF;
    END IF;

    IF v_teacher_id IS NULL OR v_student_id IS NULL THEN
        RAISE NOTICE 'Skipping seed: Demo users not found in auth.users';
        RETURN;
    END IF;

    -- Ensure User Profiles exist
    INSERT INTO user_profiles (id, tenant_id, full_name, email, role)
    VALUES 
        (v_teacher_id, v_tenant_id, 'Dr. Sarah Teacher', 'teacher@edusync.dev', 'teacher'),
        (v_student_id, v_tenant_id, 'Budi Student', 'student@edusync.dev', 'student')
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;

    -- Ensure User Roles exist
    INSERT INTO user_roles (user_id, tenant_id, role)
    VALUES 
        (v_teacher_id, v_tenant_id, 'TEACHER'),
        (v_student_id, v_tenant_id, 'STUDENT')
    ON CONFLICT (user_id, tenant_id, role) DO NOTHING;

    -- Create Demo Course
    INSERT INTO courses (tenant_id, title, description, status, thumbnail_url)
    VALUES (v_tenant_id, 'Mastering React & Supabase', 'Pelajari cara membuat aplikasi SaaS modern dengan EduSync Architecture.', 'published', 'https://images.unsplash.com/photo-1633356122544-f134324a6cee')
    RETURNING id INTO v_course_id;

    -- Create Course Module
    INSERT INTO course_modules (tenant_id, course_id, title, "order")
    VALUES (v_tenant_id, v_course_id, 'Dasar-dasar Frontend', 1)
    RETURNING id INTO v_module_id;

    -- Create Lessons
    INSERT INTO lessons (tenant_id, module_id, title, "order", type, is_published, content)
    VALUES 
        (v_tenant_id, v_module_id, 'Pengenalan React Hooks', 1, 'video', true, '{"video_url": "https://example.com/video1", "body": "Belajar useState dan useEffect."}'::jsonb),
        (v_tenant_id, v_module_id, 'Tugas: Implementasi Counter', 2, 'assignment', true, '{"body": "Buatlah komponen counter sederhana."}'::jsonb)
    RETURNING id INTO v_lesson1_id; -- Note: This is an array technically, but let's just get IDs

    SELECT id INTO v_lesson2_id FROM lessons WHERE module_id = v_module_id AND title = 'Tugas: Implementasi Counter' LIMIT 1;

    -- Create Assignment
    INSERT INTO assignments (tenant_id, course_id, lesson_id, title, instructions, max_points, due_date)
    VALUES (v_tenant_id, v_course_id, v_lesson2_id, 'Proyek Counter React', 'Buat aplikasi counter dengan fitur reset dan batasan nilai.', 100, now() + interval '7 days')
    RETURNING id INTO v_assignment_id;

    -- Create Enrollments
    INSERT INTO course_enrollments (tenant_id, course_id, user_id, role, status)
    VALUES (v_tenant_id, v_course_id, v_student_id, 'student', 'active')
    ON CONFLICT (course_id, user_id) DO NOTHING;

    -- Create a Quiz
    INSERT INTO quizzes (tenant_id, lesson_id, title, instructions, passing_score, status)
    VALUES (v_tenant_id, v_lesson1_id, 'Kuis React Hooks', 'Uji pemahamanmu tentang Hooks.', 80, 'published')
    RETURNING id INTO v_quiz_id;

    -- Add Quiz Question
    INSERT INTO quiz_questions (tenant_id, quiz_id, text, "order")
    VALUES (v_tenant_id, v_quiz_id, 'Hook apa yang digunakan untuk side effects?', 1)
    RETURNING id INTO v_lesson1_id; -- Reusing variable for question id

    INSERT INTO quiz_options (tenant_id, question_id, text, is_correct)
    VALUES 
        (v_tenant_id, v_lesson1_id, 'useState', false),
        (v_tenant_id, v_lesson1_id, 'useEffect', true),
        (v_tenant_id, v_lesson1_id, 'useContext', false);

    -- Populate a "Late" Assignment for visual testing
    INSERT INTO assignments (tenant_id, course_id, lesson_id, title, instructions, max_points, due_date)
    VALUES (v_tenant_id, v_course_id, v_lesson2_id, 'Tugas Ketinggalan (Demo)', 'Tugas ini sudah melewati deadline.', 100, now() - interval '2 days');

    RAISE NOTICE 'Successfully seeded demo data for tenant %', v_tenant_id;
END $$;
