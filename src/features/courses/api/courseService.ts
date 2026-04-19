 
import { getApiBackend, getApiClient } from '@/services/api'
import { buildRequestHeaders, createRequestId, runShadowComparison } from '@/services/api/shadow'
import { readVilSession } from '@/services/auth/vilSession'
import { getDbClient } from '@/services/db'
import { logDevError, logDevWarn } from '@/utils/logDevError'

import type { Course, CourseInsert, CourseUpdate, FetchCoursesOptions } from '../types'

const VIL_BASE_URL = import.meta.env.VITE_API_URL || ''

async function requestVil<T>(
  path: string,
  init?: RequestInit & { requestId?: string }
): Promise<T> {
  const requestId = init?.requestId ?? createRequestId()
  const url = VIL_BASE_URL
    ? `${VIL_BASE_URL}${path}`
    : new URL(
        path,
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
      ).toString()
  const response = await fetch(url, {
    ...init,
    headers: buildRequestHeaders(init?.headers ?? {}, { withAuth: true, requestId }),
  })

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as {
      message?: string
      code?: string
      details?: string | null
      hint?: string | null
    } | null

    throw {
      message: errorPayload?.message ?? `HTTP ${response.status}`,
      code: errorPayload?.code ?? 'VIL_REQUEST_FAILED',
      details: errorPayload?.details ?? null,
      hint: errorPayload?.hint ?? null,
      status: response.status,
    }
  }

  if (response.status === 204) {
    return null as T
  }

  return (await response.json()) as T
}

async function fetchSupabaseCoursesShadow(
  tenantId: string,
  page: number,
  limit: number,
  search?: string,
  ids?: string[]
): Promise<{ courses: Course[]; count: number }> {
  let query = getDbClient()
    .from('courses')
    .select(
      'id, title, description, status, subject, level, created_at, updated_at, created_by, tenant_id',
      { count: 'exact' }
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (search) {
    query = query.ilike('title', `%${search}%`)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) {
    throw error
  }

  return {
    courses: ((data ?? []) as unknown as Course[]).filter((course) =>
      ids?.length ? ids.includes(course.id) : true
    ),
    count: count ?? 0,
  }
}

async function fetchSupabaseCourseModulesShadow(
  courseId: string,
  tenantId: string
): Promise<
  Array<{ id: string; title: string; order: number; course_id: string; lessons: unknown[] }>
> {
  const { data: modules, error } = await getDbClient()
    .from('course_modules')
    .select('id, title, "order", course_id')
    .eq('tenant_id', tenantId)
    .eq('course_id', courseId)
    .order('order', { ascending: true })

  if (error) {
    throw error
  }

  const moduleIds = ((modules ?? []) as Array<{ id: string }>).map((module) => module.id)
  const { data: lessons, error: lessonError } =
    moduleIds.length > 0
      ? await getDbClient()
          .from('lessons')
          .select('id, module_id, duration_minutes, "order"')
          .eq('tenant_id', tenantId)
          .in('module_id', moduleIds)
          .order('order', { ascending: true })
      : { data: [], error: null }

  if (lessonError) {
    throw lessonError
  }

  return (
    (modules ?? []) as Array<{ id: string; title: string; order: number; course_id: string }>
  ).map((module) => ({
    ...module,
    lessons: (
      (lessons ?? []) as Array<{ id: string; module_id: string; duration_minutes: number | null }>
    )
      .filter((lesson) => lesson.module_id === module.id)
      .map((lesson) => ({
        id: lesson.id,
        duration_minutes: lesson.duration_minutes,
      })),
  }))
}

export const courseService = {
  /**
   * Fetches courses for a specific tenant with optional pagination and search.
   * RLS ensures users only see courses they have access to.
   */
  async fetchCourses({
    tenantId,
    page = 1,
    limit = 10,
    search,
    ids,
  }: FetchCoursesOptions): Promise<{ courses: Course[]; count: number }> {
    if (getApiBackend() === 'vil') {
      const requestId = createRequestId()
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (search) params.set('search', search)

      const result = await requestVil<{ courses: Course[]; count: number }>(
        `/api/v1/courses?${params.toString()}`,
        { requestId }
      )

      const courses = ids?.length
        ? result.courses.filter((course) => ids.includes(course.id))
        : result.courses

      const session = readVilSession()
      const shadowTenantId =
        tenantId ||
        (typeof session?.user?.user_metadata?.tenant_id === 'string'
          ? session.user.user_metadata.tenant_id
          : '')

      if (shadowTenantId) {
        void runShadowComparison({
          flowName: 'courses.list',
          endpoint: '/api/v1/courses',
          method: 'GET',
          shadowMode: 'read',
          primaryBackend: 'vil',
          shadowBackend: 'vil',
          requestSignature: { page, limit, search, ids },
          requestId,
          primaryResult: { data: { courses, count: result.count } },
          shadowRequest: async () => ({
            data: await fetchSupabaseCoursesShadow(shadowTenantId, page, limit, search, ids),
          }),
        })
      }

      return { courses, count: result.count }
    }

    const db = getApiClient()
    // Try fetching with joined class data first
    let query = db
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

    // Graceful fallback: if the join fails, fetch courses without joined data
    if (error) {
      logDevWarn(
        'courseService',
        'Courses join query failed, falling back to simple fetch:',
        error.message
      )
      let fallbackQuery = db
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
  async getCourseById(courseId: string, tenantId: string): Promise<Course | null> {
    if (getApiBackend() === 'vil') {
      const requestId = createRequestId()
      const result = await requestVil<Course>(`/api/v1/courses/${courseId}`, { requestId })

      void runShadowComparison({
        flowName: 'courses.get',
        endpoint: `/api/v1/courses/${courseId}`,
        method: 'GET',
        shadowMode: 'read',
        primaryBackend: 'vil',
        shadowBackend: 'vil',
        requestSignature: { courseId },
        requestId,
        primaryResult: { data: result },
        shadowRequest: async () => {
          const shadow = await getDbClient()
            .from('courses')
            .select(
              'id, title, description, status, subject, level, created_at, updated_at, created_by, tenant_id'
            )
            .eq('id', courseId)
            .eq('tenant_id', tenantId)
            .single()

          return {
            data: (shadow.data ?? null) as Course | null,
            error: shadow.error ?? null,
          }
        },
      })

      return result
    }

    const db = getApiClient()
    const { data, error } = await db
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

    return data as unknown as Course | null
  },

  /**
   * Creates a new course.
   * The created_by field should ideally be set by the edge function/DB defaults using auth.uid(),
   * but we provide it here explicitly for completeness if the RLS allows it.
   */
  async createCourse(courseData: CourseInsert): Promise<Course | null> {
    if (getApiBackend() === 'vil') {
      return await requestVil<Course>('/api/v1/courses', {
        method: 'POST',
        body: JSON.stringify({
          title: courseData.title,
          description: courseData.description ?? null,
          subject: courseData.subject ?? null,
          level: courseData.level ?? null,
          status: courseData.status ?? 'draft',
        }),
      })
    }

    const db = getApiClient()
    const { data, error } = await db
      .from('courses')
      .insert(courseData)
      .select('id, title, description, status, created_at, updated_at, created_by, tenant_id')
      .single()

    if (error) {
      logDevError('courseService', 'Error creating course:', error)
      throw error
    }

    return data as unknown as Course | null
  },

  /**
   * Updates an existing course.
   */
  async updateCourse(
    courseId: string,
    updates: CourseUpdate,
    tenantId: string
  ): Promise<Course | null> {
    if (getApiBackend() === 'vil') {
      return await requestVil<Course>(`/api/v1/courses/${courseId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })
    }

    const db = getApiClient()
    const { data, error } = await db
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

    return data as unknown as Course | null
  },

  /**
   * Deletes a course.
   */
  async deleteCourse(courseId: string, tenantId: string): Promise<void> {
    if (getApiBackend() === 'vil') {
      await requestVil(`/api/v1/courses/${courseId}`, {
        method: 'DELETE',
      })
      return
    }

    const db = getApiClient()
    const { error } = await db.from('courses').delete().eq('id', courseId).eq('tenant_id', tenantId)

    if (error) {
      logDevError('courseService', 'Error deleting course:', error)
      throw error
    }
  },

  /**
   * Fetch course modules with lesson counts (used by CourseBrowser).
   */
  async getCourseModulesWithLessons(
    courseId: string,
    tenantId: string
  ): Promise<
    Array<{ id: string; title: string; order: number; course_id: string; lessons: unknown[] }>
  > {
    if (getApiBackend() === 'vil') {
      const requestId = createRequestId()
      const result = await requestVil<
        Array<{ id: string; title: string; order: number; course_id: string; lessons: unknown[] }>
      >(`/api/v1/courses/${courseId}/modules`, { requestId })

      void runShadowComparison({
        flowName: 'courses.modules',
        endpoint: `/api/v1/courses/${courseId}/modules`,
        method: 'GET',
        shadowMode: 'read',
        primaryBackend: 'vil',
        shadowBackend: 'vil',
        requestSignature: { courseId },
        requestId,
        primaryResult: { data: result },
        shadowRequest: async () => ({
          data: await fetchSupabaseCourseModulesShadow(courseId, tenantId),
        }),
      })

      return result
    }

    const db = getApiClient()
    const { data, error } = await db
      .from('course_modules')
      .select('id, title, "order", course_id, lessons(id, duration_minutes)')
      .eq('tenant_id', tenantId)
      .eq('course_id', courseId)
      .order('order', { ascending: true })

    if (error) {
      logDevError('courseService', 'Error fetching course modules:', error)
      throw error
    }

    return (data ?? []) as unknown as Array<{
      id: string
      title: string
      order: number
      course_id: string
      lessons: unknown[]
    }>
  },

  /**
   * Fetch teacher display name by user ID (used by CourseBrowser).
   * Verifies the user belongs to the same tenant before returning the name
   * to prevent cross-tenant data leakage (C-1 tenant isolation fix).
   *
   * @param userId - The user ID whose name to fetch
   * @param tenantId - The tenant context; user must be a member of this tenant
   */
  async getTeacherName(userId: string, tenantId: string): Promise<string | null> {
    const db = getApiClient()
    // Step 1: verify the user is a member of the requested tenant
    const { data: membership, error: membershipError } = await db
      .from('tenant_memberships')
      .select('user_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (membershipError) {
      logDevWarn(
        'courseService',
        'Error verifying tenant membership for teacher:',
        membershipError.message
      )
      return null
    }

    if (!membership) {
      logDevWarn('courseService', 'Teacher does not belong to tenant, skipping name fetch.')
      return null
    }

    // Step 2: fetch the profile now that membership is confirmed
    const { data, error } = await db.from('profiles').select('full_name').eq('id', userId).single()

    if (error) {
      logDevWarn('courseService', 'Error fetching teacher name:', error.message)
      return null
    }

    return (data as { full_name?: string } | null)?.full_name ?? null
  },

  /**
   * Checks if a user is enrolled in a specific course.
   *
   * Returns a discriminated union to distinguish between:
   *  - `{ enrolled: true, errorType: null }` — user is actively enrolled
   *  - `{ enrolled: false, errorType: null }` — user is genuinely not enrolled
   *  - `{ enrolled: false, errorType: 'access_error' }` — network/RLS/auth error;
   *     should NOT be treated the same as "not enrolled" in the UI.
   */
  async checkEnrollment(
    courseId: string,
    userId: string,
    tenantId: string
  ): Promise<
    | { enrolled: true; errorType: null }
    | { enrolled: false; errorType: null }
    | { enrolled: false; errorType: 'access_error' }
  > {
    const db = getApiClient()
    const { data, error } = await db
      .from('course_enrollments')
      .select('id')
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (error) {
      logDevError('courseService', 'Error checking course enrollment:', error)
      return { enrolled: false, errorType: 'access_error' }
    }

    return { enrolled: !!data, errorType: null }
  },
}
