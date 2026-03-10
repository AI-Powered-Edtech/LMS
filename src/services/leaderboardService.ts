import { supabase } from '../lib/supabase';

export interface LeaderboardEntry {
    rank: number;
    score: number;
    user_profiles: {
        full_name: string;
        avatar_url: string | null;
    } | null;
}

export const leaderboardService = {
    /**
     * Fetches the top 20 students for a given class from the leaderboards table.
     */
    async getLeaderboard(classId: string): Promise<LeaderboardEntry[]> {
        const { data, error } = await supabase
            .from('leaderboards')
            .select(`
        score,
        rank,
        user_profiles (
          full_name,
          avatar_url
        )
      `)
            .eq('class_id', classId)
            .order('rank', { ascending: true })
            .limit(20);

        if (error) {
            console.error('Error fetching leaderboard:', error);
            throw error;
        }

        return data as unknown as LeaderboardEntry[];
    }
};
