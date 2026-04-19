-- Migration: 017_add_google_id_to_profiles
-- Purpose: Add google_id column to profiles table for OAuth Google login functionality

-- ═══════════════════════════════════════════════════════════════════════════════
-- GOOGLE ID COLUMN
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_google_id ON public.profiles(google_id);