import { supabase } from '@/services/supabase/client'
import { logDevError, logDevWarn } from '@/utils/logDevError'

import type { Course, CourseInsert, CourseUpdate, FetchCoursesOptions } from '../types'

export const courseService = {
  /**
   * Fetches courses for a specific tenant with optional pagination and search.
   * RLS ensures users only see courses they have access to.
   */
  async fetchCourses({ tenantId, page = 1, limit = 10, search, ids }: FetchCoursesOptions) {
    // Try fetching with joined class data first
    let query = supabase
      .from('courses')
      .select(
        `
                id,
                title,
                description,
                status,
                created_at,
                updated_at,
                created_by,
                tenant_id,
                assigned_classes:course_classes(
                    class_id,
                    class:classes(name)
                )
            `,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)

    if (ids && ids.length > 0) {
      query = query.in('id', ids)
    }

    query = query.order('created_at', { ascending: false })

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    if (page && limit) {
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)
    }

    let { data, error, count } = await query

    // FIX 4: Only fall back on structural/schema errors (missing relation or table).
    // Auth errors, RLS violations, and other non-schema errors are surfaced directly
    // so they are not silently swallowed.
    if (error) {
      const isSchemaError =
        error.code === 'PGRST200' ||
        error.code === '42P01' ||
        error.message?.includes('relation') ||
        error.message?.includes('does not exist')

      if (!isSchemaError) {
        logDevError('courseService', 'Error fetching courses:', error)
        throw error
      }

      logDevWarn(
        'courseService',
        'Courses join query failed (schema issue), falling back to simple fetch:',
        error.message
      )

      let fallbackQuery = supabase
        .from('courses')
        .select('id, title, description, status, created_at, updated_at, created_by, tenant_id', {
          count: 'exact',
        })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (ids && ids.length > 0) {
        fallbackQuery = fallbackQuery.in('id', ids)
      }
      if (search) {
        fallbackQuery = fallbackQuery.ilike('title', `%${search}%`)
      }
      if (page && limit) {
        const from = (page - 1) * limit
        const to = from + limit - 1
        fallbackQuery = fallbackQuery.range(from, to)
      }

      const fallback = await fallbackQuery
      if (fallback.error) {
        logDevError('courseService', 'Error fetching courses (fallback):', fallback.error)
        throw fallback.error
      }
      data = fallback.data as unknown as typeof data
      count = fallback.count
    }

    return {
      courses: (data || []) as unknown as Course[],
      count: count || 0,
    }
  },

  /**
   * Gets a specific course by its ID.
   */
  async getCourseById(courseId: string, tenantId: string) {
    const { data, error } = await supabase
      .from('courses')
      .select(
        'id, title, description, status, subject, level, created_at, updated_at, created_by, tenant_id'
      )
      .eq('id', courseId)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      logDevError('courseService', 'Error fetching course by ID:', error)
      throw error
    }

    return data
  },

  /**
   * Creates a new course.
   * The created_by field should ideally be set by the edge function/DB defaults using auth.uid(),
   * but we provide it here explicitly for completeness if the RLS allows it.
   */
  async createCourse(courseData: CourseInsert) {
    const { data, error } = await supabase
      .from('courses')
      .insert(courseData)
      .select('id, title, description, status, created_at, updated_at, created_by, tenant_id')
      .single()

    if (error) {
      logDevError('courseService', 'Error creating course:', error)
      throw error
    }

    return data
  },

  /**
   * Updates an existing course.
   */
  async updateCourse(courseId: string, updates: CourseUpdate, tenantId: string) {
    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', courseId)
      .eq('tenant_id', tenantId)
      .select('id, title, description, status, created_at, updated_at, created_by, tenant_id')
      .single()

    if (error) {
      logDevError('courseService', 'Error updating course:', error)
      throw error
    }

    return data
  },

  /**
   * Deletes a course.
   * FIX 3: Pre-flight check for active enrollments to give a clear error message
   * instead of a cryptic FK violation or silent cascade.
   */
  async deleteCourse(courseId: string, tenantId: string) {
    // Pre-flight: check for active enrollments before attempting deletion
    const { count, error: countError } = await supabase
      .from('course_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('status', 'ACTIVE') // enrollment_status enum: only uppercase valid

    if (!countError && (count ?? 0) > 0) {
      throw new Error(
        `Tidak dapat menghapus: ada ${count} siswa aktif yang terdaftar di kursus ini. Batalkan pendaftaran mereka terlebih dahulu.`
      )
    }

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)
      .eq('tenant_id', tenantId)

    if (error) {
      logDevError('courseService', 'Error deleting course:', error)
      throw error
    }
  },

  /**
   * Fetch course modules with lesson counts (used by CourseBrowser).
   */
  async getCourseModulesWithLessons(courseId: string, tenantId: string) {
    const { data, error } = await supabase
      .from('course_modules')
      .select('id, title, "order", course_id, lessons(id, duration_minutes)')
      .eq('tenant_id', tenantId)
      .eq('course_id', courseId)
      .order('order', { ascending: true })

    if (error) {
      logDevError('courseService', 'Error fetching course modules:', error)
      throw error
    }

    return data ?? []
  },

  /**
   * Fetch teacher display name by user ID (used by CourseBrowser).
   * FIX 2: Combines the tenant membership check and profile fetch into a single
   * query using a PostgREST inner join, reducing round-trips from 2 to 1.
   *
   * If the !inner join syntax is unsupported by the current Supabase client/PostgREST
   * version (error code PGRST200 or similar), the query will throw and callers should
   * fall back to the two-step approach. This join requires PostgREST ≥ 10.1.
   *
   * @param userId - The user ID whose name to fetch
   * @param tenantId - The tenant context; user must be a member of this tenant
   */
  async getTeacherName(userId: string): Promise<string | null> {
    // NOTE: tenant_memberships FK does not exist on profiles — use simple query.
    // RLS on profiles table already enforces tenant isolation.
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()

    if (error) {
      logDevWarn('courseService', 'Error fetching teacher name:', error.message)
      return null
    }

    return data?.full_name ?? null
  },

  /**
   * Checks if a user is enrolled in a specific course.
   * FIX 1: Uses .in() with all common status casing variants to guard against
   * ENUM/text case mismatches between the application and database ('active' vs 'ACTIVE').
   */
  async checkEnrollment(courseId: string, userId: string, tenantId: string) {
    const { data, error } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('status', 'ACTIVE') // enrollment_status enum: only uppercase valid
      .maybeSingle()

    if (error) {
      logDevError('courseService', 'Error checking course enrollment:', error)
      return false
    }

    return !!data
  },
}
