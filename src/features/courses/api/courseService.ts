import { supabase } from '../../../lib/supabase'
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
      .limit(100)

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

    // Graceful fallback: if the join fails, fetch courses without joined data
    if (error) {
      console.warn('Courses join query failed, falling back to simple fetch:', error.message)
      let fallbackQuery = supabase
        .from('courses')
        .select('id, title, description, status, created_at, updated_at, created_by, tenant_id', {
          count: 'exact',
        })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100)

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
        console.error('Error fetching courses (fallback):', fallback.error)
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
      .select('id, title, description, status, created_at, updated_at, created_by, tenant_id')
      .eq('id', courseId)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      console.error('Error fetching course by ID:', error)
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
    const { data, error } = await supabase.from('courses').insert(courseData).select().single()

    if (error) {
      console.error('Error creating course:', error)
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
      .select()
      .single()

    if (error) {
      console.error('Error updating course:', error)
      throw error
    }

    return data
  },

  /**
   * Deletes a course.
   */
  async deleteCourse(courseId: string, tenantId: string) {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error deleting course:', error)
      throw error
    }
  },

  /**
   * Checks if a user is enrolled in a specific course.
   */
  async checkEnrollment(courseId: string, userId: string, tenantId: string) {
    const { data, error } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (error) {
      console.error('Error checking course enrollment:', error)
      return false
    }

    return !!data
  },
}
