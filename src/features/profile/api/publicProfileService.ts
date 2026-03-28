import { supabase } from '@/src/services/supabase/client'

export interface PublicProfileStats {
  total_xp: number
  level: number
  streak: number
  courses_done: number
  quiz_count: number
  badge_count: number
}

export interface PublicProfileBadge {
  id: string
  name: string
  description: string | null
  icon: string | null
  earned_at: string
}

export interface PublicProfileData {
  id: string
  username: string | null
  full_name: string | null
  first_name: string
  last_name: string
  avatar_url: string | null
  bio: string
  is_profile_public: boolean
  level: number
  stats: PublicProfileStats
  badges: PublicProfileBadge[]
}

export const publicProfileService = {
  async getPublicProfile(userId: string): Promise<PublicProfileData | null> {
    const { data, error } = await supabase.rpc('get_public_profile', {
      p_user_id: userId,
    })
    if (error) throw error
    return (data as PublicProfileData) ?? null
  },

  async getProfileByUsername(username: string): Promise<{ id: string } | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async updatePrivacy(isPublic: boolean): Promise<void> {
    const { error } = await supabase.rpc('update_profile_privacy', {
      p_is_public: isPublic,
    })
    if (error) throw error
  },

  async updateUsername(userId: string, username: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ username: username.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', userId)
    if (error) throw error
  },

  async updateBio(userId: string, bio: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ bio: bio.trim(), updated_at: new Date().toISOString() })
      .eq('id', userId)
    if (error) throw error
  },
}
