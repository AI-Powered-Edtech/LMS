-- ==========================================================================
-- Migration 102: Incremental Course Progress Trigger
-- 
-- Replaces full recompute trigger with O(1) incremental updates
-- Previous: O(N) - COUNT(*) on every lesson completion
-- Now: O(1) - Simple counter increment
-- 
-- Expected performance gain: 10-20x faster on lesson completion
-- ==========================================================================

BEGIN;

-- 1. Add delta tracking columns if not exists
ALTER TABLE public.course_progress 
ADD COLUMN IF NOT EXISTS lessons_completed_delta integer DEFAULT 0;

-- 2. Create the O(1) incremental update function
CREATE OR REPLACE FUNCTION public.handle_lesson_progress_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_course_id uuid;
    v_tenant_id uuid;
    v_total_lessons int;
    v_percentage numeric;
BEGIN
    -- Get course and tenant from lesson
    SELECT m.course_id, c.tenant_id
    INTO v_course_id, v_tenant_id
    FROM public.lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE l.id = NEW.lesson_id;

    IF v_course_id IS NULL OR v_tenant_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get current total lessons (only needed once per course)
    SELECT total_lessons INTO v_total_lessons
    FROM public.course_progress
    WHERE user_id = NEW.user_id AND course_id = v_course_id AND tenant_id = v_tenant_id;

    IF v_total_lessons IS NULL THEN
        SELECT COUNT(*) INTO v_total_lessons
        FROM public.lessons l2
        JOIN public.course_modules m2 ON m2.id = l2.module_id
        WHERE m2.course_id = v_course_id AND l2.is_published = true AND l2.tenant_id = v_tenant_id;
    END IF;

    -- Handle completion changes
    IF (TG_OP = 'INSERT' AND NEW.completed = true) OR
       (TG_OP = 'UPDATE' AND NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false)) THEN
        -- Lesson was just completed - increment counter
        UPDATE public.course_progress
        SET completed_lessons = COALESCE(completed_lessons, 0) + 1,
            percentage = CASE 
                WHEN v_total_lessons > 0 AND v_total_lessons IS NOT NULL 
                THEN ROUND(((COALESCE(completed_lessons, 0) + 1)::numeric / v_total_lessons) * 100, 2)
                ELSE 0
            END,
            last_activity_at = now(),
            last_activity_type = 'lesson',
            last_calculated_at = now()
        WHERE user_id = NEW.user_id AND course_id = v_course_id AND tenant_id = v_tenant_id;

        IF NOT FOUND THEN
            INSERT INTO public.course_progress (
                user_id, course_id, tenant_id,
                completed_lessons, percentage, total_lessons,
                last_activity_at, last_activity_type, last_calculated_at
            ) VALUES (
                NEW.user_id, v_course_id, v_tenant_id,
                1, CASE WHEN v_total_lessons > 0 THEN ROUND((1::numeric / v_total_lessons) * 100, 2) ELSE 0 END, v_total_lessons,
                now(), 'lesson', now()
            );
        END IF;

    ELSIF TG_OP = 'UPDATE' AND (NEW.completed = false OR NEW.completed IS NULL) 
        AND (OLD.completed = true) THEN
        -- Lesson was uncompleted - decrement counter
        UPDATE public.course_progress
        SET completed_lessons = GREATEST(COALESCE(completed_lessons, 0) - 1, 0),
            percentage = CASE 
                WHEN v_total_lessons > 0 AND v_total_lessons IS NOT NULL 
                THEN ROUND((GREATEST(COALESCE(completed_lessons, 0) - 1, 0)::numeric / v_total_lessons) * 100, 2)
                ELSE 0
            END,
            last_activity_at = now(),
            last_calculated_at = now()
        WHERE user_id = NEW.user_id AND course_id = v_course_id AND tenant_id = v_tenant_id;
    
    ELSIF (TG_OP = 'INSERT' AND NEW.progress_percentage IS NOT NULL) OR 
          (TG_OP = 'UPDATE' AND NEW.progress_percentage != OLD.progress_percentage) THEN
        -- Just progress update, no completion change
        UPDATE public.course_progress
        SET last_activity_at = now(),
            last_activity_type = 'lesson',
            last_calculated_at = now()
        WHERE user_id = NEW.user_id AND course_id = v_course_id AND tenant_id = v_tenant_id;

        IF NOT FOUND THEN
            INSERT INTO public.course_progress (
                user_id, course_id, tenant_id,
                completed_lessons, percentage, total_lessons,
                last_activity_at, last_activity_type, last_calculated_at
            ) VALUES (
                NEW.user_id, v_course_id, v_tenant_id,
                0, 0, v_total_lessons,
                now(), 'lesson', now()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Replace the trigger
DROP TRIGGER IF EXISTS on_lesson_progress_completed ON public.lesson_progress;
DROP TRIGGER IF EXISTS on_lesson_progress_change ON public.lesson_progress;

CREATE TRIGGER on_lesson_progress_change
AFTER INSERT OR UPDATE OF completed, progress_percentage
ON public.lesson_progress
FOR EACH ROW
EXECUTE FUNCTION public.handle_lesson_progress_change();

-- 4. Update existing course_progress to ensure accurate counts
-- This is a one-time migration step
-- One-time reconciliation across all tenants (migration step, not RPC)
DO $$
DECLARE
    v_record record;
BEGIN
    FOR v_record IN
        SELECT cp.user_id, cp.course_id, COUNT(lp.id) as actual_completed
        FROM public.course_progress cp
        JOIN public.lesson_progress lp ON lp.user_id = cp.user_id
        JOIN public.lessons l ON l.id = lp.lesson_id
        JOIN public.course_modules m ON m.id = l.module_id
        WHERE m.course_id = cp.course_id
          AND lp.completed = true
        GROUP BY cp.user_id, cp.course_id
    LOOP
        UPDATE public.course_progress
        SET completed_lessons = v_record.actual_completed,
            percentage = CASE 
                WHEN total_lessons > 0 
                THEN ROUND((v_record.actual_completed::numeric / total_lessons) * 100, 2)
                ELSE 0
            END
        WHERE user_id = v_record.user_id AND course_id = v_record.course_id;
    END LOOP;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
