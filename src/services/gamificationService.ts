import { supabase } from '../lib/supabase';

export interface UserStreak {
    user_id: string;
    tenant_id: string;
    current_streak: number;
    longest_streak: number;
    last_activity_date: string;
    updated_at: string;
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    created_at: string;
}

export interface UserBadge {
    badge_id: string;
    badge: Badge;
    created_at: string;
}

export const gamificationService = {
    /**
     * Fetches the current streak for the authenticated user.
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
