-- Migration: 016_add_performance_indexes
-- Purpose: Add missing performance indexes for commonly queried columns
-- and common query patterns

-- ═══════════════════════════════════════════════════════════════════════════════
-- MFA FACTORS - user_id lookup
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_mfa_factors_user_id ON public.mfa_factors(user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PASSWORD RESET TOKENS - user_id lookup
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- LTI PLATFORMS - tenant lookups
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_lti_platform_registrations_tenant ON lti_platform_registrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lti_nonces_tenant ON lti_nonces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lti_user_links_platform ON lti_user_links(platform_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- XP TRANSACTIONS - composite for analytics queries
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_created ON public.xp_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_tenant_activity ON public.xp_transactions(tenant_id, activity_type, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ANTI-CHEAT EVENTS - composite for time-based queries
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_anti_cheat_tenant_occurred ON public.anti_cheat_events(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_attempt_type ON public.anti_cheat_events(attempt_id, event_type);

-- ═══════════════════════════════════════════════════════════════════════════════
-- USER XP - composite for leaderboard queries
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_user_xp_tenant_level ON public.user_xp(tenant_id, current_level DESC, total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_tenant_streak ON public.user_xp(tenant_id, current_streak DESC) WHERE current_streak > 0;

-- ═══════════════════════════════════════════════════════════════════════════════
-- QUIZ ITEM ANALYSIS - composite for analysis queries
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_quiz_item_analysis_question ON public.quiz_item_analysis(question_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTIAL INDEXES - filtered queries
-- ═══════════════════════════════════════════════════════════════════════════════

-- Active users only (not banned, not deleted)
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(email_confirmed_at) 
    WHERE banned_until IS NULL OR banned_until < NOW();

-- Non-deleted users
CREATE INDEX IF NOT EXISTS idx_users_not_deleted ON public.users(email) 
    WHERE deleted_at IS NULL;

-- Pending user invitations
CREATE INDEX IF NOT EXISTS idx_user_invitations_pending ON public.user_invitations(tenant_id, status, expires_at) 
    WHERE status = 'pending';

-- Active tenant memberships
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_active ON public.tenant_memberships(tenant_id, role) 
    WHERE status = 'active';

-- LTI active platforms
CREATE INDEX IF NOT EXISTS idx_lti_platform_registrations_active ON lti_platform_registrations(tenant_id) 
    WHERE is_active = true;

-- AI tutor active sessions
CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_status ON ai_tutor_sessions(tenant_id, status, last_message_at DESC) 
    WHERE status = 'active';