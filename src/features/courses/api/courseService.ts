import { apiFetch } from '@/src/lib/api'
import { logDevError, logDevWarn } from '@/src/utils/logDevError'

import type {  CourseInsert, CourseUpdate, FetchCoursesOptions } from '../types'

export const courseService = {
  /**
   * Fetches courses for a specific tenant with optional pagination and search.
   * RLS ensures users only see courses they have access to.
   */
  async fetchCourses({ tenantId: _tenantId, page = 1, limit = 10, search, ids }: FetchCoursesOptions) {
    const queryParams = new URLSearchParams()
    
    if (page && limit) {
      queryParams.append('page', page.toString())
      queryParams.append('limit', limit.toString())
    }
    
    if (search) {
      queryParams.append('search', search)
    }
    
    if (ids && ids.length > 0) {
      queryParams.append('ids', ids.join(','))
    }

    const queryString = queryParams.toString()
    const url = `/v1/courses${queryString ? `?${queryString}` : ''}`

    try {
      const { data, error, count } = await apiFetch(url)
      
      if (error) {
        logDevWarn('Courses', 'Failed to fetch courses:', error)
        return { data: [], error, count: 0 }
      }

      return { data: data || [], error: null, count: count || 0 }
    } catch (err) {
      logDevError('Courses', 'Failed to fetch courses:', err)
      return { data: [], error: err as Error, count: 0 }
    }
  },

  /**
   * Gets a specific course by its ID.
   */
  async getCourseById(courseId: string, _tenantId: string) {
    const { data, error } = await apiFetch(`/v1/courses/${courseId}`)

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
    const { data, error } = await apiFetch('/v1/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    })

    if (error) {
      logDevError('courseService', 'Error creating course:', error)
      throw error
    }

    return data
  },

  /**
   * Updates an existing course.
   */
  async updateCourse(courseId: string, updates: CourseUpdate, _tenantId: string) {
    const { data, error } = await apiFetch(`/v1/courses/${courseId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })

    if (error) {
      logDevError('courseService', 'Error updating course:', error)
      throw error
    }

    return data
  },

  /**
   * Deletes a course.
   */
  async deleteCourse(courseId: string, _tenantId: string) {
    const { error } = await apiFetch(`/v1/courses/${courseId}`, {
      method: 'DELETE',
    })

    if (error) {
      logDevError('courseService', 'Error deleting course:', error)
      throw error
    }
  },

  /**
   * Checks if a user is enrolled in a specific course.
   */
  async checkEnrollment(courseId: string, userId: string, _tenantId: string) {
    const { data, error } = await apiFetch(`/v1/courses/${courseId}/enrollments/${userId}`)

    if (error) {
      logDevError('courseService', 'Error checking course enrollment:', error)
      return false
    }

    return !!data
  },
}
