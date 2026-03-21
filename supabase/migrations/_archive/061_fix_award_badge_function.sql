-- Fix award_badge_if_qualified function schema mismatch
-- The column name in user_badges is earned_at, not created_at

CREATE OR REPLACE FUNCTION public.award_badge_if_qualified(p_user_id uuid, p_badge_name text, p_tenant_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
    v_badge_id uuid;
BEGIN
    SELECT id INTO v_badge_id FROM public.badges WHERE name = p_badge_name;
    
    IF v_badge_id IS NULL THEN
        RETURN false;
    END IF;

    -- Defensive insert with ON CONFLICT DO NOTHING
    -- Fixed: Changed created_at to earned_at
    INSERT INTO public.user_badges (user_id, badge_id, tenant_id, earned_at)
    VALUES (p_user_id, v_badge_id, p_tenant_id, now())
    ON CONFLICT (user_id, badge_id, tenant_id) DO NOTHING;

    RETURN FOUND;
END;
$$;
