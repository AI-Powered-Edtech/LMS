import { supabase } from '../lib/supabase';

export interface LeaderboardEntry {
    rank: number;
    score: number;
    user_profiles: {
        full_name: string;
        avatar_url: string | null;
        level: number;
    } | null;
}

export const leaderboardService = {
    /**
     * Fetches the top 20 students for a given class from the leaderboards table within a tenant.
     */
    async getLeaderboard(classId: string, tenantId: string): Promise<LeaderboardEntry[]> {
        const { data, error } = await supabase
            .from('leaderboards')
            .select(`
        score,
        rank,
        user_profiles (
          full_name,
          avatar_url,
          level
        )
      `)
            .eq('tenant_id', tenantId)
            .eq('class_id', classId)
            .order('rank', { ascending: true })
            .limit(20);

        if (error) {
            // Throw error but don't log to console here to allow silent fallback in UI
            throw error;
        }

        return (data as any) || [];
    },

    /**
     * Subscribe to realtime leaderboard updates
     */
    subscribeToLeaderboard(classId: string, tenantId: string, callback: () => void) {
        const channel = supabase.channel(`leaderboard-${classId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'leaderboards',
                    filter: `class_id=eq.${classId}&tenant_id=eq.${tenantId}`
                },
                () => callback()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    /**
     * Fetches the top 20 students for the weekly leaderboard within a tenant.
     */
    async getWeeklyLeaderboard(classId: string, tenantId: string): Promise<LeaderboardEntry[]> {
        const now = new Date();
        const day = now.getUTCDay() || 7; // 1-7 (Mon-Sun)
        now.setUTCDate(now.getUTCDate() + 1 - day);
        now.setUTCHours(0, 0, 0, 0);
        const weekStart = now.toISOString();

        const { data, error } = await supabase
            .from('leaderboards_weekly')
            .select(`
                score,
                rank,
                user_profiles (
                    full_name,
                    avatar_url,
                    level
                )
            `)
            .eq('tenant_id', tenantId)
            .eq('class_id', classId)
            .eq('week_start', weekStart)
            .order('rank', { ascending: true })
            .limit(20);

        if (error) {
            // Throw error but don't log to console here to allow silent fallback in UI
            throw error;
        }

        return (data as any) || [];
    },
};
