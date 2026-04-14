import { apiFetch } from '@/src/lib/api'

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
    const { data, error } = await apiFetch('/rpc/get_public_profile', { method: 'POST', body: JSON.stringify({
          p_user_id: userId,
        }) })
    if (error) throw error
    return (data as PublicProfileData) ?? null
  },

  async getProfileByUsername(username: string): Promise<{ id: string } | null> {
    const { data, error } = await apiFetch('/profiles')
    if (error) throw error
    return data
  },

  async updatePrivacy(isPublic: boolean): Promise<void> {
    const { error } = await apiFetch('/rpc/update_profile_privacy', { method: 'POST', body: JSON.stringify({
          p_is_public: isPublic,
        }) })
    if (error) throw error
  },

  async updateUsername(userId: string, username: string): Promise<void> {
    const { error } = await apiFetch('/profiles')
    if (error) throw error
  },

  async updateBio(userId: string, bio: string): Promise<void> {
    const { error } = await apiFetch('/profiles')
    if (error) throw error
  },
}
