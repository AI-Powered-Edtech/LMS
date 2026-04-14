import { apiFetch } from '@/src/lib/api'
import { logDevError, logDevWarn } from '@/src/utils/logDevError'

import type { Course, CourseInsert, CourseUpdate, FetchCoursesOptions } from '../types'

export const courseService = {
  /**
   * Fetches courses for a specific tenant with optional pagination and search.
   * RLS ensures users only see courses they have access to.
   */
  async fetchCourses({ tenantId, page = 1, limit = 10, search, ids }: FetchCoursesOptions) {
    // Try fetching with joined class data first
    let query = apiFetch('/courses')

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
      logDevWarn(
        'courseService',
        'Courses join query failed, falling back to simple fetch:',
        error.message
      )
      let fallbackQuery = apiFetch('/courses')

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
    const { data, error } = await apiFetch('/courses')

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
    const { data, error } = await apiFetch('/courses')

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
    const { data, error } = await apiFetch('/courses')

    if (error) {
      logDevError('courseService', 'Error updating course:', error)
      throw error
    }

    return data
  },

  /**
   * Deletes a course.
   */
  async deleteCourse(courseId: string, tenantId: string) {
    const { error } = await apiFetch('/courses')

    if (error) {
      logDevError('courseService', 'Error deleting course:', error)
      throw error
    }
  },

  /**
   * Checks if a user is enrolled in a specific course.
   */
  async checkEnrollment(courseId: string, userId: string, tenantId: string) {
    const { data, error } = await apiFetch('/course_enrollments')

    if (error) {
      logDevError('courseService', 'Error checking course enrollment:', error)
      return false
    }

    return !!data
  },
}
