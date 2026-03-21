-- Migration 55: Add is_demo flag to profiles
-- This migration adds a flag to robustly identify demo/test accounts.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;

-- Update existing demo accounts if any (based on current logic)
UPDATE public.profiles 
SET is_demo = true 
WHERE email ILIKE '%student.edusync.dev' 
   OR email ILIKE '%teacher.edusync.dev'
   OR email ILIKE '%student.edusync.com'
   OR email ILIKE '%teacher.edusync.com';

-- Ensure the view (if it exists) reflects this. 
-- Drop and recreate to handle schema changes:
DROP VIEW IF EXISTS public.user_profiles;
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.tenant_id,
    p.is_demo,
    ur.role,
    p.level,
    0 AS total_xp
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id;

COMMENT ON COLUMN public.profiles.is_demo IS 'Flag to identify demo/test accounts for visual mockups.';
