-- =============================================================================
-- seed_demo.sql
-- Demo data seed for EduSync LMS
-- =============================================================================
-- ORDER: Run seed_base.sql FIRST, then seed_demo.sql
-- =============================================================================
--
-- This file creates realistic demo data including:
-- - 1-2 courses with 2-3 modules each
-- - 3-5 lessons per module
-- - 1-2 quizzes with sample questions
-- - 1-2 classes
--
-- PREREQUISITES:
-- - seed_base.sql must have been run first
-- - Demo users must exist in auth.users:
--   * teacher@demo.edusync.com (or configure below)
--   * student@demo.edusync.com (or configure below)
--
-- This file is IDEMPOTENT - can be run multiple times safely using
-- ON CONFLICT DO NOTHING clauses.
-- =============================================================================

DO $$
DECLARE
    v_tenant_id uuid;
    v_teacher_id uuid;
    v_student_id uuid;
    
    -- Course 1: Web Development
    v_course1_id uuid;
    v_course1_module1_id uuid;
    v_course1_module2_id uuid;
    v_course1_lesson1_id uuid;
    v_course1_lesson2_id uuid;
    v_course1_lesson3_id uuid;
    v_course1_lesson4_id uuid;
    v_course1_lesson5_id uuid;
    v_course1_lesson6_id uuid;
    v_course1_quiz1_id uuid;
    v_course1_quiz2_id uuid;
    v_course1_class1_id uuid;
    
    -- Course 2: Data Science
    v_course2_id uuid;
    v_course2_module1_id uuid;
    v_course2_lesson1_id uuid;
    v_course2_lesson2_id uuid;
    v_course2_lesson3_id uuid;
    v_course2_quiz1_id uuid;
    v_course2_class1_id uuid;
    
    -- Quiz question IDs
    v_question1_id uuid;
    v_question2_id uuid;
    v_question3_id uuid;
    v_question4_id uuid;
    v_question5_id uuid;

    -- Configuration
    v_teacher_email text := 'teacher@demo.edusync.com';
    v_student_email text := 'student@demo.edusync.com';
BEGIN
    -- 1. Get the demo tenant
    SELECT id INTO v_tenant_id 
    FROM tenants 
    WHERE slug = 'demo-school' 
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Demo tenant not found. Run seed_base.sql first!';
    END IF;

    -- 2. Get user IDs from auth.users
    SELECT id INTO v_teacher_id 
    FROM auth.users 
    WHERE email = v_teacher_email 
    LIMIT 1;

    SELECT id INTO v_student_id 
    FROM auth.users 
    WHERE email = v_student_email 
    LIMIT 1;

    IF v_teacher_id IS NULL THEN
        RAISE NOTICE 'Teacher user (%) not found in auth.users. Create user in Supabase Dashboard first!', v_teacher_email;
    END IF;

    IF v_student_id IS NULL THEN
        RAISE NOTICE 'Student user (%) not found in auth.users. Create user in Supabase Dashboard first!', v_student_email;
    END IF;

    -- 3. Create profiles for users (if they don't exist)
    IF v_teacher_id IS NOT NULL THEN
        INSERT INTO profiles (id, tenant_id, email, first_name, last_name, created_at)
        VALUES (v_teacher_id, v_tenant_id, v_teacher_email, 'Demo', 'Teacher', now())
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = v_tenant_id,
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name;

        INSERT INTO user_roles (user_id, role, tenant_id)
        VALUES (v_teacher_id, 'TEACHER', v_tenant_id)
        ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = EXCLUDED.role;
    END IF;

    IF v_student_id IS NOT NULL THEN
        INSERT INTO profiles (id, tenant_id, email, first_name, last_name, created_at)
        VALUES (v_student_id, v_tenant_id, v_student_email, 'Demo', 'Student', now())
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = v_tenant_id,
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name;

        INSERT INTO user_roles (user_id, role, tenant_id)
        VALUES (v_student_id, 'STUDENT', v_tenant_id)
        ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = EXCLUDED.role;
    END IF;

    RAISE NOTICE 'Users configured for demo tenant (%)', v_tenant_id;

    -- =======================================================================
    -- COURSE 1: Web Development Boot Camp
    -- =======================================================================
    
    -- Create Course 1
    INSERT INTO courses (tenant_id, title, description, subject, level, status, created_by, created_at)
    SELECT
        v_tenant_id,
        'Web Development Boot Camp',
        'A comprehensive course on modern web development technologies including HTML, CSS, JavaScript, and React.',
        'Computer Science',
        'Beginner',
        'published',
        v_teacher_id,
        now()
    WHERE NOT EXISTS (
        SELECT 1 FROM courses WHERE tenant_id = v_tenant_id AND title = 'Web Development Boot Camp'
    )
    RETURNING id INTO v_course1_id;

    IF v_course1_id IS NULL THEN
        SELECT id INTO v_course1_id FROM courses WHERE tenant_id = v_tenant_id AND title = 'Web Development Boot Camp' LIMIT 1;
    END IF;

    -- Course 1 - Module 1: HTML Fundamentals
    INSERT INTO course_modules (tenant_id, course_id, title, "order", created_at)
    SELECT v_tenant_id, v_course1_id, 'HTML Fundamentals', 1, now()
    WHERE NOT EXISTS (
        SELECT 1 FROM course_modules WHERE course_id = v_course1_id AND title = 'HTML Fundamentals'
    )
    RETURNING id INTO v_course1_module1_id;

    IF v_course1_module1_id IS NULL THEN
        SELECT id INTO v_course1_module1_id FROM course_modules WHERE course_id = v_course1_id AND title = 'HTML Fundamentals' LIMIT 1;
    END IF;

    -- Module 1 Lessons
    INSERT INTO lessons (tenant_id, module_id, title, content, type, "order", is_published, duration_minutes, created_at)
    SELECT * FROM (VALUES 
        (v_tenant_id, v_course1_module1_id, 'Introduction to HTML', 'HTML (HyperText Markup Language) is the standard markup language for documents designed to be displayed in a web browser. It describes the structure of a web page and consists of a series of elements.', 'reading'::text, 1::integer, true::boolean, 15::integer, now()),
        (v_tenant_id, v_course1_module1_id, 'HTML Elements and Tags', 'Learn about the building blocks of HTML including heading tags, paragraph tags, links, images, and more.', 'reading'::text, 2::integer, true::boolean, 20::integer, now()),
        (v_tenant_id, v_course1_module1_id, 'Forms and Input', 'Creating interactive forms with various input types, validation, and form submission.', 'reading'::text, 3::integer, true::boolean, 25::integer, now())
    ) AS v(tenant_id, module_id, title, content, type, "order", is_published, duration_minutes, created_at)
    WHERE NOT EXISTS (
        SELECT 1 FROM lessons l WHERE l.module_id = v.module_id AND l.title = v.title
    );

    -- Get lesson IDs
    SELECT id INTO v_course1_lesson1_id FROM lessons WHERE module_id = v_course1_module1_id AND "order" = 1 LIMIT 1;
    SELECT id INTO v_course1_lesson2_id FROM lessons WHERE module_id = v_course1_module1_id AND "order" = 2 LIMIT 1;
    SELECT id INTO v_course1_lesson3_id FROM lessons WHERE module_id = v_course1_module1_id AND "order" = 3 LIMIT 1;

    -- Course 1 - Module 2: CSS Styling
    INSERT INTO course_modules (tenant_id, course_id, title, "order", created_at)
    SELECT v_tenant_id, v_course1_id, 'CSS Styling', 2, now()
    WHERE NOT EXISTS (
        SELECT 1 FROM course_modules WHERE course_id = v_course1_id AND title = 'CSS Styling'
    )
    RETURNING id INTO v_course1_module2_id;

    IF v_course1_module2_id IS NULL THEN
        SELECT id INTO v_course1_module2_id FROM course_modules WHERE course_id = v_course1_id AND title = 'CSS Styling' LIMIT 1;
    END IF;

    -- Module 2 Lessons
    INSERT INTO lessons (tenant_id, module_id, title, content, type, "order", is_published, duration_minutes, created_at)
    SELECT * FROM (VALUES 
        (v_tenant_id, v_course1_module2_id, 'CSS Basics', 'Learn the fundamentals of CSS (Cascading Style Sheets) including selectors, properties, and values.', 'reading'::text, 1::integer, true::boolean, 20::integer, now()),
        (v_tenant_id, v_course1_module2_id, 'Box Model', 'Understanding the CSS box model including margins, padding, borders, and content areas.', 'reading'::text, 2::integer, true::boolean, 15::integer, now()),
        (v_tenant_id, v_course1_module2_id, 'Flexbox Layout', 'Master flexible box layout for creating responsive designs.', 'reading'::text, 3::integer, true::boolean, 30::integer, now())
    ) AS v(tenant_id, module_id, title, content, type, "order", is_published, duration_minutes, created_at)
    WHERE NOT EXISTS (
        SELECT 1 FROM lessons l WHERE l.module_id = v.module_id AND l.title = v.title
    );

    -- Get lesson IDs
    SELECT id INTO v_course1_lesson4_id FROM lessons WHERE module_id = v_course1_module2_id AND "order" = 1 LIMIT 1;
    SELECT id INTO v_course1_lesson5_id FROM lessons WHERE module_id = v_course1_module2_id AND "order" = 2 LIMIT 1;
    SELECT id INTO v_course1_lesson6_id FROM lessons WHERE module_id = v_course1_module2_id AND "order" = 3 LIMIT 1;

    -- Course 1 - Quiz 1: HTML Basics
    INSERT INTO quizzes (tenant_id, course_id, module_id, title, instructions, time_limit_minutes, passing_score, max_attempts, status, is_published, created_at)
    SELECT v_tenant_id, v_course1_id, v_course1_module1_id, 'HTML Basics Quiz', 'Test your knowledge of HTML fundamentals including elements, tags, and document structure.', 15, 70, 3, 'published', true, now()
    WHERE NOT EXISTS (
        SELECT 1 FROM quizzes WHERE tenant_id = v_tenant_id AND course_id = v_course1_id AND title = 'HTML Basics Quiz'
    )
    RETURNING id INTO v_course1_quiz1_id;

    IF v_course1_quiz1_id IS NULL THEN
        SELECT id INTO v_course1_quiz1_id FROM quizzes WHERE tenant_id = v_tenant_id AND title = 'HTML Basics Quiz' LIMIT 1;
    END IF;

    -- Quiz 1 Questions
    INSERT INTO quiz_questions (tenant_id, quiz_id, text, "order", question_type, points, explanation)
    VALUES 
        (v_tenant_id, v_course1_quiz1_id, 'What does HTML stand for?', 1, 'MCQ', 10, 'HTML stands for HyperText Markup Language.'),
        (v_tenant_id, v_course1_quiz1_id, 'Which tag is used for the largest heading in HTML?', 2, 'MCQ', 10, 'The <h1> tag defines the most important heading.'),
        (v_tenant_id, v_course1_quiz1_id, 'HTML elements are case-sensitive.', 3, 'TRUE_FALSE', 10, 'HTML tags are not case-sensitive, but it is recommended to use lowercase.')
    ON CONFLICT DO NOTHING;

    -- Get question IDs
    SELECT id INTO v_question1_id FROM quiz_questions WHERE quiz_id = v_course1_quiz1_id AND "order" = 1 LIMIT 1;
    SELECT id INTO v_question2_id FROM quiz_questions WHERE quiz_id = v_course1_quiz1_id AND "order" = 2 LIMIT 1;
    SELECT id INTO v_question3_id FROM quiz_questions WHERE quiz_id = v_course1_quiz1_id AND "order" = 3 LIMIT 1;

    -- Quiz 1 Options
    IF v_question1_id IS NOT NULL THEN
        INSERT INTO quiz_options (tenant_id, question_id, text, is_correct)
            SELECT * FROM (VALUES 
                (v_tenant_id, v_question1_id, 'Hyper Text Markup Language', true::boolean),
                (v_tenant_id, v_question1_id, 'High Tech Modern Language', false::boolean),
                (v_tenant_id, v_question1_id, 'Home Tool Markup Language', false::boolean),
                (v_tenant_id, v_question1_id, 'Hyperlink Text Management Language', false::boolean)
            ) AS v(tenant_id, question_id, text, is_correct)
            WHERE NOT EXISTS (
                SELECT 1 FROM quiz_options qo WHERE qo.question_id = v.question_id AND qo.text = v.text
            );
    END IF;

    IF v_question2_id IS NOT NULL THEN
        INSERT INTO quiz_options (tenant_id, question_id, text, is_correct)
            SELECT * FROM (VALUES 
                (v_tenant_id, v_question2_id, '<h1>', true::boolean),
                (v_tenant_id, v_question2_id, '<h6>', false::boolean),
                (v_tenant_id, v_question2_id, '<heading>', false::boolean),
                (v_tenant_id, v_question2_id, '<head>', false::boolean)
            ) AS v(tenant_id, question_id, text, is_correct)
            WHERE NOT EXISTS (
                SELECT 1 FROM quiz_options qo WHERE qo.question_id = v.question_id AND qo.text = v.text
            );
    END IF;

    IF v_question3_id IS NOT NULL THEN
        INSERT INTO quiz_options (tenant_id, question_id, text, is_correct)
            SELECT * FROM (VALUES 
                (v_tenant_id, v_question3_id, 'True', false::boolean),
                (v_tenant_id, v_question3_id, 'False', true::boolean)
            ) AS v(tenant_id, question_id, text, is_correct)
            WHERE NOT EXISTS (
                SELECT 1 FROM quiz_options qo WHERE qo.question_id = v.question_id AND qo.text = v.text
            );
    END IF;

    -- Course 1 - Quiz 2: CSS Fundamentals
    INSERT INTO quizzes (tenant_id, course_id, module_id, title, instructions, time_limit_minutes, passing_score, max_attempts, status, is_published, created_at)
    SELECT v_tenant_id, v_course1_id, v_course1_module2_id, 'CSS Fundamentals Quiz', 'Test your understanding of CSS basics, selectors, and the box model.', 20, 70, 3, 'published', true, now()
    WHERE NOT EXISTS (
        SELECT 1 FROM quizzes WHERE tenant_id = v_tenant_id AND course_id = v_course1_id AND title = 'CSS Fundamentals Quiz'
    )
    RETURNING id INTO v_course1_quiz2_id;

    IF v_course1_quiz2_id IS NULL THEN
        SELECT id INTO v_course1_quiz2_id FROM quizzes WHERE tenant_id = v_tenant_id AND title = 'CSS Fundamentals Quiz' LIMIT 1;
    END IF;

    -- Quiz 2 Questions
    INSERT INTO quiz_questions (tenant_id, quiz_id, text, "order", question_type, points, explanation)
    VALUES 
        (v_tenant_id, v_course1_quiz2_id, 'What does CSS stand for?', 1, 'MCQ', 10, 'CSS stands for Cascading Style Sheets.'),
        (v_tenant_id, v_course1_quiz2_id, 'Which CSS property controls the text size?', 2, 'MCQ', 10, 'The font-size property controls the text size.')
    ON CONFLICT DO NOTHING;

    -- Get question IDs
    SELECT id INTO v_question4_id FROM quiz_questions WHERE quiz_id = v_course1_quiz2_id AND "order" = 1 LIMIT 1;
    SELECT id INTO v_question5_id FROM quiz_questions WHERE quiz_id = v_course1_quiz2_id AND "order" = 2 LIMIT 1;

    -- Quiz 2 Options
    IF v_question4_id IS NOT NULL THEN
        INSERT INTO quiz_options (tenant_id, question_id, text, is_correct)
            SELECT * FROM (VALUES 
                (v_tenant_id, v_question4_id, 'Cascading Style Sheets', true::boolean),
                (v_tenant_id, v_question4_id, 'Computer Style Sheets', false::boolean),
                (v_tenant_id, v_question4_id, 'Creative Style System', false::boolean),
                (v_tenant_id, v_question4_id, 'Colorful Style Sheets', false::boolean)
            ) AS v(tenant_id, question_id, text, is_correct)
            WHERE NOT EXISTS (
                SELECT 1 FROM quiz_options qo WHERE qo.question_id = v.question_id AND qo.text = v.text
            );
    END IF;

    IF v_question5_id IS NOT NULL THEN
        INSERT INTO quiz_options (tenant_id, question_id, text, is_correct)
            SELECT * FROM (VALUES 
                (v_tenant_id, v_question5_id, 'font-size', true::boolean),
                (v_tenant_id, v_question5_id, 'text-style', false::boolean),
                (v_tenant_id, v_question5_id, 'text-size', false::boolean),
                (v_tenant_id, v_question5_id, 'font-style', false::boolean)
            ) AS v(tenant_id, question_id, text, is_correct)
            WHERE NOT EXISTS (
                SELECT 1 FROM quiz_options qo WHERE qo.question_id = v.question_id AND qo.text = v.text
            );
    END IF;

    -- Course 1 - Class
    INSERT INTO classes (tenant_id, course_id, name, teacher_id, join_code, max_students, created_at)
    SELECT 
        v_tenant_id, 
        v_course1_id, 
        'Web Development - Section A',
        v_teacher_id,
        public.generate_join_code(),
        30,
        now()
    WHERE NOT EXISTS (
        SELECT 1 FROM classes WHERE course_id = v_course1_id AND name = 'Web Development - Section A'
    );

    SELECT id INTO v_course1_class1_id FROM classes WHERE course_id = v_course1_id AND tenant_id = v_tenant_id LIMIT 1;

    -- =======================================================================
    -- COURSE 2: Data Science Essentials
    -- =======================================================================
    
    -- Create Course 2
    INSERT INTO courses (tenant_id, title, description, subject, level, status, created_by, created_at)
    SELECT
        v_tenant_id,
        'Data Science Essentials',
        'Learn the fundamentals of data science including Python, statistics, and machine learning basics.',
        'Data Science',
        'Intermediate',
        'published',
        v_teacher_id,
        now()
    WHERE NOT EXISTS (
        SELECT 1 FROM courses WHERE tenant_id = v_tenant_id AND title = 'Data Science Essentials'
    )
    RETURNING id INTO v_course2_id;

    IF v_course2_id IS NULL THEN
        SELECT id INTO v_course2_id FROM courses WHERE tenant_id = v_tenant_id AND title = 'Data Science Essentials' LIMIT 1;
    END IF;

    -- Course 2 - Module 1: Python for Data Science
    INSERT INTO course_modules (tenant_id, course_id, title, "order", created_at)
    SELECT v_tenant_id, v_course2_id, 'Python Basics', 1, now()
    WHERE NOT EXISTS (
        SELECT 1 FROM course_modules WHERE course_id = v_course2_id AND title = 'Python Basics'
    )
    RETURNING id INTO v_course2_module1_id;

    IF v_course2_module1_id IS NULL THEN
        SELECT id INTO v_course2_module1_id FROM course_modules WHERE course_id = v_course2_id AND title = 'Python Basics' LIMIT 1;
    END IF;

    -- Module 1 Lessons
    INSERT INTO lessons (tenant_id, module_id, title, content, type, "order", is_published, duration_minutes, created_at)
    SELECT * FROM (VALUES 
        (v_tenant_id, v_course2_module1_id, 'Introduction to Python', 'Python is a high-level, interpreted programming language known for its simplicity and readability.', 'reading'::text, 1::integer, true::boolean, 20::integer, now()),
        (v_tenant_id, v_course2_module1_id, 'Data Types and Variables', 'Learn about Python data types including strings, integers, floats, lists, and dictionaries.', 'reading'::text, 2::integer, true::boolean, 25::integer, now()),
        (v_tenant_id, v_course2_module1_id, 'NumPy Arrays', 'Introduction to NumPy arrays for numerical computing in Python.', 'reading'::text, 3::integer, true::boolean, 30::integer, now())
    ) AS v(tenant_id, module_id, title, content, type, "order", is_published, duration_minutes, created_at)
    WHERE NOT EXISTS (
        SELECT 1 FROM lessons l WHERE l.module_id = v.module_id AND l.title = v.title
    );

    -- Get lesson IDs
    SELECT id INTO v_course2_lesson1_id FROM lessons WHERE module_id = v_course2_module1_id AND "order" = 1 LIMIT 1;
    SELECT id INTO v_course2_lesson2_id FROM lessons WHERE module_id = v_course2_module1_id AND "order" = 2 LIMIT 1;
    SELECT id INTO v_course2_lesson3_id FROM lessons WHERE module_id = v_course2_module1_id AND "order" = 3 LIMIT 1;

    -- Course 2 - Quiz 1: Python Basics
    INSERT INTO quizzes (tenant_id, course_id, module_id, title, instructions, time_limit_minutes, passing_score, max_attempts, status, is_published, created_at)
    SELECT v_tenant_id, v_course2_id, v_course2_module1_id, 'Python Basics Quiz', 'Test your knowledge of Python fundamentals and data types.', 15, 70, 3, 'published', true, now()
    WHERE NOT EXISTS (
        SELECT 1 FROM quizzes WHERE tenant_id = v_tenant_id AND course_id = v_course2_id AND title = 'Python Basics Quiz'
    )
    RETURNING id INTO v_course2_quiz1_id;

    IF v_course2_quiz1_id IS NULL THEN
        SELECT id INTO v_course2_quiz1_id FROM quizzes WHERE tenant_id = v_tenant_id AND title = 'Python Basics Quiz' LIMIT 1;
    END IF;

    -- Course 2 - Quiz Questions
    INSERT INTO quiz_questions (tenant_id, quiz_id, text, "order", question_type, points, explanation)
    VALUES 
        (v_tenant_id, v_course2_quiz1_id, 'Which Python data type is used to store a sequence of characters?', 1, 'MCQ', 10, 'Strings are used to store text or sequences of characters.'),
        (v_tenant_id, v_course2_quiz1_id, 'What is the output of type([1, 2, 3])?', 2, 'MCQ', 10, 'Lists are represented by the type <class list>.'),
        (v_tenant_id, v_course2_quiz1_id, 'Python supports inheritance.', 3, 'TRUE_FALSE', 10, 'Python supports multiple inheritance.')
    ON CONFLICT DO NOTHING;

    -- Course 2 - Quiz Options (Context-appropriate)
    FOR v_question1_id IN SELECT id FROM quiz_questions WHERE quiz_id = v_course2_quiz1_id AND "order" = 1 LOOP
        INSERT INTO quiz_options (tenant_id, question_id, "text", is_correct)
        VALUES 
            (v_tenant_id, v_question1_id, 'String', true),
            (v_tenant_id, v_question1_id, 'Integer', false),
            (v_tenant_id, v_question1_id, 'Float', false),
            (v_tenant_id, v_question1_id, 'Boolean', false)
        ON CONFLICT DO NOTHING;
    END LOOP;

    FOR v_question1_id IN SELECT id FROM quiz_questions WHERE quiz_id = v_course2_quiz1_id AND "order" = 2 LOOP
        INSERT INTO quiz_options (tenant_id, question_id, "text", is_correct)
        VALUES 
            (v_tenant_id, v_question1_id, '<class ''list''>', true),
            (v_tenant_id, v_question1_id, '<class ''tuple''>', false),
            (v_tenant_id, v_question1_id, '<class ''dict''>', false),
            (v_tenant_id, v_question1_id, '<class ''set''>', false)
        ON CONFLICT DO NOTHING;
    END LOOP;

    FOR v_question1_id IN SELECT id FROM quiz_questions WHERE quiz_id = v_course2_quiz1_id AND "order" = 3 LOOP
        INSERT INTO quiz_options (tenant_id, question_id, "text", is_correct)
        VALUES 
            (v_tenant_id, v_question1_id, 'True', true),
            (v_tenant_id, v_question1_id, 'False', false)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Course 2 - Class
    INSERT INTO classes (tenant_id, course_id, name, teacher_id, join_code, max_students, created_at)
    SELECT 
        v_tenant_id, 
        v_course2_id, 
        'Data Science - Section A',
        v_teacher_id,
        public.generate_join_code(),
        25,
        now()
    WHERE NOT EXISTS (
        SELECT 1 FROM classes WHERE course_id = v_course2_id AND name = 'Data Science - Section A'
    );

    SELECT id INTO v_course2_class1_id FROM classes WHERE course_id = v_course2_id AND tenant_id = v_tenant_id LIMIT 1;

    -- =======================================================================
    -- ENROLL STUDENTS IN CLASSES
    -- =======================================================================
    
    IF v_student_id IS NOT NULL AND v_course1_class1_id IS NOT NULL THEN
        INSERT INTO enrollments (tenant_id, class_id, student_id, status, joined_at)
        SELECT v_tenant_id, v_course1_class1_id, v_student_id, 'ACTIVE', now()
        WHERE NOT EXISTS (
            SELECT 1 FROM enrollments WHERE class_id = v_course1_class1_id AND student_id = v_student_id
        );
    END IF;

    IF v_student_id IS NOT NULL AND v_course2_class1_id IS NOT NULL THEN
        INSERT INTO enrollments (tenant_id, class_id, student_id, status, joined_at)
        SELECT v_tenant_id, v_course2_class1_id, v_student_id, 'ACTIVE', now()
        WHERE NOT EXISTS (
            SELECT 1 FROM enrollments WHERE class_id = v_course2_class1_id AND student_id = v_student_id
        );
    END IF;

    -- =======================================================================
    -- COURSE ENROLLMENTS (for course-level tracking)
    -- =======================================================================
    
    IF v_student_id IS NOT NULL AND v_course1_id IS NOT NULL THEN
        INSERT INTO course_enrollments (tenant_id, course_id, user_id, role, status, enrolled_at)
        SELECT v_tenant_id, v_course1_id, v_student_id, 'student', 'ACTIVE', now()
        WHERE NOT EXISTS (
            SELECT 1 FROM course_enrollments WHERE course_id = v_course1_id AND user_id = v_student_id
        );
    END IF;

    IF v_student_id IS NOT NULL AND v_course2_id IS NOT NULL THEN
        INSERT INTO course_enrollments (tenant_id, course_id, user_id, role, status, enrolled_at)
        SELECT v_tenant_id, v_course2_id, v_student_id, 'student', 'ACTIVE', now()
        WHERE NOT EXISTS (
            SELECT 1 FROM course_enrollments WHERE course_id = v_course2_id AND user_id = v_student_id
        );
    END IF;

    -- Add some demo progress for student@demo.edusync.com
    -- This helps verify the get_student_progress_bundle() function fixes
    IF v_student_id IS NOT NULL AND v_course1_id IS NOT NULL THEN
        INSERT INTO public.course_progress (
            tenant_id, user_id, course_id, 
            completed_lessons, total_lessons, percentage,
            last_activity_at, last_activity_type, last_calculated_at
        )
        VALUES (
            v_tenant_id, v_student_id, v_course1_id,
            2, 10, 20.0,
            now() - interval '1 day', 'lesson', now()
        )
        ON CONFLICT (user_id, course_id) DO NOTHING;


        -- Award a badge
        INSERT INTO public.user_badges (tenant_id, user_id, badge_id, earned_at)
        SELECT v_tenant_id, v_student_id, id, now() - interval '2 days'
        FROM public.badges
        WHERE name = 'First Quiz'
        ON CONFLICT DO NOTHING;
    END IF;


    RAISE NOTICE 'Demo data seeded successfully!';
    RAISE NOTICE 'Courses created: Web Development Boot Camp, Data Science Essentials';
    RAISE NOTICE 'Demo users: teacher@demo.edusync.com, student@demo.edusync.com';

END $$;
