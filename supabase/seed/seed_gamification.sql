-- =============================================================================
-- seed_gamification.sql
-- Gamification seed data for EduSync LMS
-- =============================================================================
-- ORDER: Run AFTER seed_demo.sql
-- =============================================================================
-- Seeds XP events, streaks, badges, and leaderboard data for demo accounts.
-- Uses both @edusync.dev (primary) and @demo.edusync.com (legacy) accounts.
-- IDEMPOTENT — safe to run multiple times.
-- =============================================================================

DO $$
DECLARE
    v_tenant_id   uuid;
    v_student_id  uuid;
    v_teacher_id  uuid;
    v_course1_id  uuid;
    v_badge_id    uuid;
BEGIN
    -- Resolve tenant
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'demo-school' LIMIT 1;
    IF v_tenant_id IS NULL THEN
        RAISE NOTICE 'seed_gamification: demo-school tenant not found, skipping';
        RETURN;
    END IF;

    -- Resolve student (prefer @edusync.dev, fall back to legacy)
    SELECT id INTO v_student_id FROM auth.users WHERE email = 'student@edusync.dev' LIMIT 1;
    IF v_student_id IS NULL THEN
        SELECT id INTO v_student_id FROM auth.users WHERE email = 'student@demo.edusync.com' LIMIT 1;
    END IF;

    -- Resolve teacher
    SELECT id INTO v_teacher_id FROM auth.users WHERE email = 'teacher@edusync.dev' LIMIT 1;
    IF v_teacher_id IS NULL THEN
        SELECT id INTO v_teacher_id FROM auth.users WHERE email = 'teacher@demo.edusync.com' LIMIT 1;
    END IF;

    IF v_student_id IS NULL THEN
        RAISE NOTICE 'seed_gamification: no student user found, skipping';
        RETURN;
    END IF;

    -- Resolve first course
    SELECT id INTO v_course1_id
    FROM public.courses
    WHERE tenant_id = v_tenant_id
    ORDER BY created_at
    LIMIT 1;

    -- =========================================================================
    -- XP / user_points
    -- =========================================================================
    INSERT INTO public.user_points (tenant_id, user_id, total_points, weekly_points, monthly_points, updated_at)
    VALUES (v_tenant_id, v_student_id, 350, 120, 280, now())
    ON CONFLICT (user_id, tenant_id) DO UPDATE SET
        total_points   = GREATEST(user_points.total_points, 350),
        weekly_points  = GREATEST(user_points.weekly_points, 120),
        monthly_points = GREATEST(user_points.monthly_points, 280),
        updated_at     = now();

    -- Teacher also gets some points
    IF v_teacher_id IS NOT NULL THEN
        INSERT INTO public.user_points (tenant_id, user_id, total_points, weekly_points, monthly_points, updated_at)
        VALUES (v_tenant_id, v_teacher_id, 500, 50, 200, now())
        ON CONFLICT (user_id, tenant_id) DO UPDATE SET
            total_points   = GREATEST(user_points.total_points, 500),
            updated_at     = now();
    END IF;

    -- =========================================================================
    -- Streaks
    -- =========================================================================
    INSERT INTO public.user_streaks (tenant_id, user_id, current_streak, longest_streak, last_activity_date, updated_at)
    VALUES (v_tenant_id, v_student_id, 5, 12, CURRENT_DATE, now())
    ON CONFLICT (user_id, tenant_id) DO UPDATE SET
        current_streak    = GREATEST(user_streaks.current_streak, 5),
        longest_streak    = GREATEST(user_streaks.longest_streak, 12),
        last_activity_date = CURRENT_DATE,
        updated_at        = now();

    -- =========================================================================
    -- Badges — seed the canonical badge rows if they don't exist
    -- =========================================================================
    INSERT INTO public.badges (tenant_id, name, description, icon, condition_type, condition_value, xp_reward, created_at)
    VALUES
        (v_tenant_id, 'First Login',       'Login pertama kali',                     'star',    'login_count',   1,   10, now()),
        (v_tenant_id, 'First Lesson',      'Selesaikan pelajaran pertama',            'book',    'lesson_count',  1,   25, now()),
        (v_tenant_id, 'First Quiz',        'Selesaikan kuis pertama',                 'zap',     'quiz_count',    1,   50, now()),
        (v_tenant_id, 'Quiz Master',       'Selesaikan 10 kuis',                      'trophy',  'quiz_count',   10, 100, now()),
        (v_tenant_id, 'Week Warrior',      'Streak belajar 7 hari berturut-turut',    'flame',   'streak_days',   7, 150, now()),
        (v_tenant_id, 'Course Complete',   'Selesaikan seluruh kursus',               'award',   'course_count',  1, 200, now()),
        (v_tenant_id, 'Top Performer',     'Masuk peringkat 3 besar leaderboard',     'crown',   'leaderboard_rank', 3, 250, now())
    ON CONFLICT (tenant_id, name) DO NOTHING;

    -- Award "First Login" badge to student
    SELECT id INTO v_badge_id FROM public.badges WHERE tenant_id = v_tenant_id AND name = 'First Login' LIMIT 1;
    IF v_badge_id IS NOT NULL THEN
        INSERT INTO public.user_badges (tenant_id, user_id, badge_id, earned_at)
        VALUES (v_tenant_id, v_student_id, v_badge_id, now() - interval '7 days')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Award "First Lesson" badge to student
    SELECT id INTO v_badge_id FROM public.badges WHERE tenant_id = v_tenant_id AND name = 'First Lesson' LIMIT 1;
    IF v_badge_id IS NOT NULL THEN
        INSERT INTO public.user_badges (tenant_id, user_id, badge_id, earned_at)
        VALUES (v_tenant_id, v_student_id, v_badge_id, now() - interval '5 days')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Award "First Quiz" badge to student
    SELECT id INTO v_badge_id FROM public.badges WHERE tenant_id = v_tenant_id AND name = 'First Quiz' LIMIT 1;
    IF v_badge_id IS NOT NULL THEN
        INSERT INTO public.user_badges (tenant_id, user_id, badge_id, earned_at)
        VALUES (v_tenant_id, v_student_id, v_badge_id, now() - interval '3 days')
        ON CONFLICT DO NOTHING;
    END IF;

    -- =========================================================================
    -- Learning Events (activity feed for student)
    -- =========================================================================
    IF v_course1_id IS NOT NULL THEN
        INSERT INTO public.learning_events (
            tenant_id, user_id, event_type, course_id, points_earned, created_at
        )
        SELECT
            v_tenant_id, v_student_id, event_type, v_course1_id, pts, ts
        FROM (VALUES
            ('LESSON_COMPLETED'::text,  10, now() - interval '6 days'),
            ('LESSON_COMPLETED'::text,  10, now() - interval '5 days'),
            ('QUIZ_COMPLETED'::text,    50, now() - interval '4 days'),
            ('LESSON_COMPLETED'::text,  10, now() - interval '3 days'),
            ('QUIZ_COMPLETED'::text,    50, now() - interval '2 days'),
            ('LESSON_COMPLETED'::text,  10, now() - interval '1 day'),
            ('LESSON_COMPLETED'::text,  10, now())
        ) AS t(event_type, pts, ts)
        ON CONFLICT DO NOTHING;
    END IF;

    -- =========================================================================
    -- Leaderboard entry
    -- =========================================================================
    INSERT INTO public.leaderboards (tenant_id, user_id, total_points, rank, period, updated_at)
    VALUES (v_tenant_id, v_student_id, 350, 1, 'all_time', now())
    ON CONFLICT (tenant_id, user_id, period) DO UPDATE SET
        total_points = GREATEST(leaderboards.total_points, 350),
        updated_at   = now();

    IF v_teacher_id IS NOT NULL THEN
        INSERT INTO public.leaderboards (tenant_id, user_id, total_points, rank, period, updated_at)
        VALUES (v_tenant_id, v_teacher_id, 500, 2, 'all_time', now())
        ON CONFLICT (tenant_id, user_id, period) DO UPDATE SET
            total_points = GREATEST(leaderboards.total_points, 500),
            updated_at   = now();
    END IF;

    RAISE NOTICE 'Gamification data seeded for tenant %', v_tenant_id;
END $$;
