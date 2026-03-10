-- Seed Data for Quiz Module (Development/Testing)
-- Requires an active tenant and course/class in the system.

DO $$
DECLARE
    v_tenant_id uuid;
    v_course_id uuid;
    v_class_id uuid;
    v_module_id uuid;
    v_lesson_id uuid;
    v_quiz_id uuid;
    v_question1_id uuid;
    v_question2_id uuid;
    v_question3_id uuid;
    v_student_id uuid;
BEGIN
    -- 1. Locate an existing tenant (Fallback mechanism for testing)
    SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
      RAISE NOTICE 'Skipping seed: No tenants found';
      RETURN;
    END IF;

    -- 2. Locate an existing course & class for relation
    SELECT id INTO v_course_id FROM public.courses WHERE tenant_id = v_tenant_id LIMIT 1;
    
    IF v_course_id IS NULL THEN
        -- Create dummy course
        INSERT INTO public.courses (tenant_id, title, status) 
        VALUES (v_tenant_id, 'Matematika Dasar', 'published') 
        RETURNING id INTO v_course_id;
    END IF;

    SELECT id INTO v_class_id FROM public.classes WHERE course_id = v_course_id AND tenant_id = v_tenant_id LIMIT 1;
    IF v_class_id IS NULL THEN
        -- Create dummy class
        INSERT INTO public.classes (tenant_id, course_id, name, format) 
        VALUES (v_tenant_id, v_course_id, 'Kelas 10A Matematika', 'online') 
        RETURNING id INTO v_class_id;
    END IF;

    -- Ensure course_module exists
    SELECT id INTO v_module_id FROM public.course_modules WHERE course_id = v_course_id AND tenant_id = v_tenant_id LIMIT 1;
    IF v_module_id IS NULL THEN
        INSERT INTO public.course_modules (tenant_id, course_id, title, "order")
        VALUES (v_tenant_id, v_course_id, 'Pengenalan Aljabar', 1)
        RETURNING id INTO v_module_id;
    END IF;

    -- Ensure lesson exists
    SELECT id INTO v_lesson_id FROM public.lessons WHERE module_id = v_module_id AND tenant_id = v_tenant_id LIMIT 1;
    IF v_lesson_id IS NULL THEN
        INSERT INTO public.lessons (tenant_id, module_id, title, "order", is_published, type)
        VALUES (v_tenant_id, v_module_id, 'Bab 1: Aljabar Basic', 1, true, 'quiz')
        RETURNING id INTO v_lesson_id;
    END IF;

    -- 3. Create 'Basic Algebra' Quiz
    INSERT INTO public.quizzes (
        tenant_id, lesson_id, class_id, title, instructions, 
        time_limit_minutes, passing_score, max_attempts
    ) VALUES (
        v_tenant_id, v_lesson_id, v_class_id,
        'Basic Algebra: Persamaan Linear', 
        'Kuis interaktif untuk menguji pemahaman dasar Aljabar di kelas 10.',
        10, 75, 3
    ) RETURNING id INTO v_quiz_id;

    -- 4. Create Questions & Options
    -- Question 1
    INSERT INTO public.quiz_questions (tenant_id, quiz_id, text, "order")
    VALUES (v_tenant_id, v_quiz_id, 'Berapakah hasil dari persamaan 2x = 8?', 1)
    RETURNING id INTO v_question1_id;

    INSERT INTO public.quiz_options (tenant_id, question_id, text, is_correct) VALUES 
    (v_tenant_id, v_question1_id, 'x = 2', false),
    (v_tenant_id, v_question1_id, 'x = 4', true),
    (v_tenant_id, v_question1_id, 'x = 6', false),
    (v_tenant_id, v_question1_id, 'x = 8', false);

    -- Question 2
    INSERT INTO public.quiz_questions (tenant_id, quiz_id, text, "order")
    VALUES (v_tenant_id, v_quiz_id, 'Jika y + 5 = 12, berapakah nilai y?', 2)
    RETURNING id INTO v_question2_id;

    INSERT INTO public.quiz_options (tenant_id, question_id, text, is_correct) VALUES 
    (v_tenant_id, v_question2_id, 'y = 7', true),
    (v_tenant_id, v_question2_id, 'y = -7', false),
    (v_tenant_id, v_question2_id, 'y = 17', false),
    (v_tenant_id, v_question2_id, 'y = 5', false);

    -- Question 3
    INSERT INTO public.quiz_questions (tenant_id, quiz_id, text, "order")
    VALUES (v_tenant_id, v_quiz_id, 'Sederhanakan ekspresi berikut: 3a + 2a - a', 3)
    RETURNING id INTO v_question3_id;

    INSERT INTO public.quiz_options (tenant_id, question_id, text, is_correct) VALUES 
    (v_tenant_id, v_question3_id, '4a', true),
    (v_tenant_id, v_question3_id, '5a', false),
    (v_tenant_id, v_question3_id, '6a', false),
    (v_tenant_id, v_question3_id, 'a', false);

    -- 5. Auto Enroll the first dummy student (if exists) so they can take it
    SELECT user_id INTO v_student_id 
    FROM public.user_roles 
    WHERE role = 'STUDENT' AND tenant_id = v_tenant_id 
    LIMIT 1;

    IF v_student_id IS NOT NULL THEN
       IF NOT EXISTS (SELECT 1 FROM public.enrollments WHERE student_id = v_student_id AND class_id = v_class_id) THEN
           INSERT INTO public.enrollments (tenant_id, class_id, student_id, status)
           VALUES (v_tenant_id, v_class_id, v_student_id, 'ACTIVE');
       END IF;
    END IF;

    RAISE NOTICE 'Successfully seeded Quiz: Basic Algebra with 3 questions.';
END $$;
