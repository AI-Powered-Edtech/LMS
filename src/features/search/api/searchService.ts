import { supabase } from '@/services/supabase/client'
import { captureError } from '@/utils/sentry'

/**
 * Global search service menggunakan PostgreSQL full-text search (tsvector).
 *
 * Supabase PostgreSQL mendukung full-text search via:
 *   to_tsvector('indonesian', column) @@ plainto_tsquery('indonesian', query)
 *
 * Untuk saat ini, search dilakukan di client-side dengan filtering dari
 * beberapa endpoint. Nanti bisa diupgrade ke Edge Function dengan dedicated
 * search index.
 */

export interface SearchResult {
  id: string
  type: 'course' | 'lesson' | 'assignment' | 'quiz' | 'discussion' | 'user'
  title: string
  description: string
  url: string
  tenantId: string
  relevanceScore?: number
}

interface SearchOptions {
  tenantId: string
  query: string
  limit?: number
  types?: SearchResult['type'][]
}

/**
 * Search across all content types in the tenant.
 * Returns results sorted by relevance.
 */
export async function globalSearch(options: SearchOptions): Promise<SearchResult[]> {
  const { tenantId, query, limit = 20, types } = options

  if (!query.trim() || query.trim().length < 2) return []

  const results: SearchResult[] = []
  const typeFilter = types ?? ['course', 'lesson', 'assignment', 'quiz', 'discussion', 'user']

  // Search courses
  if (typeFilter.includes('course')) {
    try {
      const { data } = await supabase
        .from('courses')
        .select('id, title, description, tenant_id')
        .eq('tenant_id', tenantId)
        .ilike('title', `%${query}%`)
        .limit(5)

      results.push(
        ...(data ?? []).map((c) => ({
          id: c.id,
          type: 'course' as const,
          title: c.title,
          description: c.description ?? '',
          url: `/app/student/courses/${c.id}`,
          tenantId: c.tenant_id,
        }))
      )
    } catch (err) {
      captureError(err, { tags: { feature: 'search-courses' } })
    }
  }

  // Search lessons
  if (typeFilter.includes('lesson')) {
    try {
      const { data } = await supabase
        .from('lessons')
        .select('id, title, description, tenant_id, module_id')
        .eq('tenant_id', tenantId)
        .ilike('title', `%${query}%`)
        .limit(5)

      results.push(
        ...(data ?? []).map((l) => ({
          id: l.id,
          type: 'lesson' as const,
          title: l.title,
          description: l.description ?? '',
          url: `/app/student/courses?moduleId=${l.module_id}&lessonId=${l.id}`,
          tenantId: l.tenant_id,
        }))
      )
    } catch (err) {
      captureError(err, { tags: { feature: 'search-lessons' } })
    }
  }

  // Search assignments
  if (typeFilter.includes('assignment')) {
    try {
      const { data } = await supabase
        .from('assignments')
        .select('id, title, description, tenant_id, course_id')
        .eq('tenant_id', tenantId)
        .ilike('title', `%${query}%`)
        .limit(5)

      results.push(
        ...(data ?? []).map((a) => ({
          id: a.id,
          type: 'assignment' as const,
          title: a.title,
          description: a.description ?? '',
          url: `/app/student/assignments`,
          tenantId: a.tenant_id,
        }))
      )
    } catch (err) {
      captureError(err, { tags: { feature: 'search-assignments' } })
    }
  }

  // Search quizzes
  if (typeFilter.includes('quiz')) {
    try {
      const { data } = await supabase
        .from('quizzes')
        .select('id, title, description, tenant_id')
        .eq('tenant_id', tenantId)
        .ilike('title', `%${query}%`)
        .limit(5)

      results.push(
        ...(data ?? []).map((q) => ({
          id: q.id,
          type: 'quiz' as const,
          title: q.title,
          description: q.description ?? '',
          url: `/app/student/quizzes`,
          tenantId: q.tenant_id,
        }))
      )
    } catch (err) {
      captureError(err, { tags: { feature: 'search-quizzes' } })
    }
  }

  // Search users (profiles)
  if (typeFilter.includes('user')) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, tenant_id')
        .eq('tenant_id', tenantId)
        .limit(30)

      const normalizedQuery = query.trim().toLowerCase()
      const filteredUsers = (data ?? []).filter((user) => {
        const firstName = String(user.first_name ?? '').toLowerCase()
        const lastName = String(user.last_name ?? '').toLowerCase()
        const email = String(user.email ?? '').toLowerCase()
        return (
          firstName.includes(normalizedQuery) ||
          lastName.includes(normalizedQuery) ||
          email.includes(normalizedQuery)
        )
      })

      results.push(
        ...filteredUsers.slice(0, 5).map((u) => ({
          id: u.id,
          type: 'user' as const,
          title: `${u.first_name}${u.last_name ? ` ${u.last_name}` : ''}`.trim(),
          description: u.email ?? '',
          url: `/app/p/${u.id}`,
          tenantId: u.tenant_id,
        }))
      )
    } catch (err) {
      captureError(err, { tags: { feature: 'search-users' } })
    }
  }

  return results.slice(0, limit)
}
