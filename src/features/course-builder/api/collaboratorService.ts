import { supabase } from '@/services/supabase/client'

// ============================================================
// Types
// ============================================================

export interface Collaborator {
  id: string
  user_id: string
  role: 'author' | 'reviewer' | 'publisher'
  profile: { full_name: string; email: string }
}

export interface SearchableUser {
  id: string
  full_name: string
  email: string
}

// ============================================================
// Service
// ============================================================

export const collaboratorService = {
  /**
   * Fetch all collaborators for a given course within a tenant.
   */
  async fetchCollaborators(courseId: string, tenantId: string): Promise<Collaborator[]> {
    const { data, error } = await supabase
      .from('course_collaborators')
      .select('id, user_id, role')
      .eq('course_id', courseId)
      .eq('tenant_id', tenantId)

    if (error) throw error

    const collaborators = (data ?? []) as Array<Record<string, unknown>>
    const userIds = collaborators.map((row) => String(row.user_id)).filter(Boolean)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('tenant_id', tenantId)
      .in('id', userIds)

    if (profileError) throw profileError

    const profileMap = new Map(
      ((profiles ?? []) as SearchableUser[]).map((profile) => [profile.id, profile])
    )

    return collaborators.map((row) => ({
      id: row.id as string,
      user_id: row.user_id as string,
      role: row.role as Collaborator['role'],
      profile: {
        full_name: profileMap.get(String(row.user_id))?.full_name ?? '',
        email: profileMap.get(String(row.user_id))?.email ?? '',
      },
    }))
  },

  /**
   * Search profiles within a tenant by name (for adding collaborators).
   */
  async searchUsers(query: string, tenantId: string): Promise<SearchableUser[]> {
    if (!query) return []

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('tenant_id', tenantId)
      .ilike('full_name', `%${query}%`)
      .limit(5)

    if (error) throw error
    return data || []
  },

  /**
   * Add a collaborator to a course.
   */
  async addCollaborator(
    courseId: string,
    userId: string,
    role: Collaborator['role'],
    tenantId: string
  ): Promise<void> {
    const { error } = await supabase.from('course_collaborators').insert({
      course_id: courseId,
      user_id: userId,
      role,
      tenant_id: tenantId,
    })
    if (error) throw error
  },

  /**
   * Remove a collaborator by record ID.
   */
  async removeCollaborator(id: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('course_collaborators')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
    if (error) throw error
  },
}
