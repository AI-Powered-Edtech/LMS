/**
 * Gamification API Service
 * 
 * Provides methods for fetching user streaks, badges, and achievements.
 * All methods require tenantId for proper multi-tenant isolation.
 */

import { supabase } from '@/src/lib/supabase';
import type { UserStreak, Badge, UserBadge } from '../types';

/**
 * Service for gamification-related API calls
 */
export const gamificationService = {
    /**
     * Fetches the current streak for the authenticated user.
     * @param userId - The user's ID
     * @param tenantId - The tenant ID for isolation
     */
    async getUserStreak(userId: string, tenantId: string): Promise<UserStreak | null> {
        const { data, error } = await supabase
            .from('user_streaks')
            .select('*')
            .eq('user_id', userId)
            .eq('tenant_id', tenantId)
            .single();

        if (error && error.code !== 'PGRST116') {
            // Throw error but don't log to console here to allow silent fallback in UI
            throw error;
        }

        return data;
    },

    /**
     * Fetches the badges earned by the authenticated user.
     * @param userId - The user's ID
     * @param tenantId - The tenant ID for isolation
     */
    async getUserBadges(userId: string, tenantId: string): Promise<UserBadge[]> {
        const { data, error } = await supabase
            .from('user_badges')
            .select(`
                badge_id,
                created_at,
                badge:badges (*)
            `)
            .eq('user_id', userId)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) {
            // Throw error but don't log to console here to allow silent fallback in UI
            throw error;
        }

        return data as unknown as UserBadge[];
    },

    /**
     * Fetches all available badges (Global).
     * This is a global query but cache is tenant-scoped for consistency.
     */
    async getAllBadges(): Promise<Badge[]> {
        const { data, error } = await supabase
            .from('badges')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching badges:', error);
            throw error;
        }

        return data;
    }
};
