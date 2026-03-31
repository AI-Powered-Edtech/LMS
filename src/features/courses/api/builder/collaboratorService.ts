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
      .select(
        `
        id, user_id, role,
        profiles:user_id ( full_name, email )
      `
      )
      .eq('course_id', courseId)
      .eq('tenant_id', tenantId)

    if (error) throw error

    return (data || []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      user_id: c.user_id as string,
      role: c.role as Collaborator['role'],
      profile: c.profiles as Collaborator['profile'],
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
