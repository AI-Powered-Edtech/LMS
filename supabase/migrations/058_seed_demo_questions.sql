-- Migration 58: Seed missing quiz questions

DO $$
DECLARE
    v_quiz_id UUID;
    v_tenant_id UUID := '00000000-0000-0000-0000-00000000000d';
    v_q1_id UUID;
    v_q2_id UUID;
BEGIN
    SELECT id INTO v_quiz_id FROM public.quizzes WHERE title = 'HTML Basics Quiz' AND tenant_id = v_tenant_id LIMIT 1;
    
    IF v_quiz_id IS NOT NULL THEN
        -- Insert Question 1
        INSERT INTO public.quiz_questions (quiz_id, tenant_id, text, "order")
        VALUES (v_quiz_id, v_tenant_id, 'What does HTML stand for?', 1)
        RETURNING id INTO v_q1_id;

        INSERT INTO public.quiz_options (question_id, tenant_id, text, is_correct) VALUES
        (v_q1_id, v_tenant_id, 'Hyper Text Markup Language', true),
        (v_q1_id, v_tenant_id, 'High Text Markup Language', false),
        (v_q1_id, v_tenant_id, 'Hyper Tabular Markup Language', false),
        (v_q1_id, v_tenant_id, 'None of these', false);

        -- Insert Question 2
        INSERT INTO public.quiz_questions (quiz_id, tenant_id, text, "order")
        VALUES (v_quiz_id, v_tenant_id, 'Which HTML tag produces the biggest heading?', 2)
        RETURNING id INTO v_q2_id;

        INSERT INTO public.quiz_options (question_id, tenant_id, text, is_correct) VALUES
        (v_q2_id, v_tenant_id, '<heading>', false),
        (v_q2_id, v_tenant_id, '<h1>', true),
        (v_q2_id, v_tenant_id, '<h6>', false),
        (v_q2_id, v_tenant_id, '<head>', false);
        
    END IF;
END $$;
