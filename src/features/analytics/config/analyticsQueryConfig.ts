/**
 * Analytics Query Configuration — Optimized caching for analytics endpoints
 * 
 * This module provides React Query configurations optimized for analytics data
 * to minimize database load and improve response times through intelligent caching.
 * 
 * Caching Strategy:
 * - Dashboard analytics: 5 minutes staleTime (data changes infrequently)
 * - Student lists: 10 minutes staleTime (pagination handles freshness)
 * - Course stats: 15 minutes staleTime (matches materialized view refresh)
 * - Real-time metrics: 1 minute staleTime (for time-sensitive data)
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'

import { supabase } from '@/services/supabase/client'

// ---------------------------------------------------------------------------
// Query Key Factory
// ---------------------------------------------------------------------------

export const analyticsQueryKeys = {
  // Course-level analytics
  course: {
    all: ['analytics', 'course'] as const,
    overview: (courseId: string) => ['analytics', 'course', 'overview', courseId] as const,
    students: (courseId: string) => ['analytics', 'course', 'students', courseId] as const,
    modules: (courseId: string) => ['analytics', 'course', 'modules', courseId] as const,
    quizzes: (courseId: string) => ['analytics', 'course', 'quizzes', courseId] as const,
  },

  // Teacher-level analytics
  teacher: {
    all: ['analytics', 'teacher'] as const,
    dashboard: (teacherId: string) => ['analytics', 'teacher', 'dashboard', teacherId] as const,
    performance: (teacherId: string) => ['analytics', 'teacher', 'performance', teacherId] as const,
  },

  // Student-level analytics
  student: {
    all: ['analytics', 'student'] as const,
    progress: (studentId: string) => ['analytics', 'student', 'progress', studentId] as const,
    quizzes: (studentId: string) => ['analytics', 'student', 'quizzes', studentId] as const,
  },

  // Principal/Executive analytics
  executive: {
    all: ['analytics', 'executive'] as const,
    dashboard: ['analytics', 'executive', 'dashboard'] as const,
    adoption: ['analytics', 'executive', 'adoption'] as const,
    roi: ['analytics', 'executive', 'roi'] as const,
  },
}

// ---------------------------------------------------------------------------
// Cache Time Configuration
// ---------------------------------------------------------------------------

const CACHE_CONFIG = {
  // Dashboard overview — refresh every 5 minutes
  dashboardOverview: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes (garbage collection)
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  // Student lists — refresh every 10 minutes
  studentList: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  // Course stats — refresh every 15 minutes (matches materialized view)
  courseStats: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  // Real-time metrics — refresh every 1 minute
  realTimeMetrics: {
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Executive dashboard — refresh every 10 minutes
  executiveDashboard: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
}

// ---------------------------------------------------------------------------
// Query Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch course overview analytics from optimized materialized view
 */
export function useCourseOverviewAnalytics(
  courseId: string,
  options?: Partial<UseQueryOptions>
) {
  return useQuery({
    queryKey: analyticsQueryKeys.course.overview(courseId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_teacher_analytics_optimized', {
        p_course_id: courseId,
        p_limit: 20,
      })

      if (error) {
        throw new Error(`Analytics fetch failed: ${error.message}`)
      }

      return data
    },
    ...CACHE_CONFIG.dashboardOverview,
    ...options,
  })
}

/**
 * Fetch student list for a course with cursor-based pagination
 */
export function useCourseStudentAnalytics(
  courseId: string,
  limit: number = 20,
  cursor?: string | null,
  options?: Partial<UseQueryOptions>
) {
  return useQuery({
    queryKey: [...analyticsQueryKeys.course.students(courseId), limit, cursor],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_teacher_analytics_optimized', {
        p_course_id: courseId,
        p_limit: limit,
        p_cursor_student_id: cursor || null,
      })

      if (error) {
        throw new Error(`Student analytics fetch failed: ${error.message}`)
      }

      return data
    },
    ...CACHE_CONFIG.studentList,
    ...options,
  })
}

/**
 * Fetch executive dashboard analytics
 */
export function useExecutiveDashboard(options?: Partial<UseQueryOptions>) {
  return useQuery({
    queryKey: analyticsQueryKeys.executive.dashboard,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_executive_analytics')

      if (error) {
        throw new Error(`Executive analytics fetch failed: ${error.message}`)
      }

      return data
    },
    ...CACHE_CONFIG.executiveDashboard,
    ...options,
  })
}

/**
 * Fetch teacher performance analytics
 */
export function useTeacherPerformanceAnalytics(
  teacherId: string,
  options?: Partial<UseQueryOptions>
) {
  return useQuery({
    queryKey: analyticsQueryKeys.teacher.performance(teacherId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_teacher_performance', {
        p_teacher_id: teacherId,
      })

      if (error) {
        throw new Error(`Teacher performance analytics fetch failed: ${error.message}`)
      }

      return data
    },
    ...CACHE_CONFIG.courseStats,
    ...options,
  })
}

// ---------------------------------------------------------------------------
// Prefetch Utilities
// ---------------------------------------------------------------------------

/**
 * Prefetch analytics queries for faster initial load
 * Call this during route transitions or idle time
 */
export function prefetchAnalyticsQueries(
  queryClient: any, // QueryClient type from @tanstack/react-query
  courseId?: string
) {
  if (courseId) {
    // Prefetch course overview
    queryClient.prefetchQuery({
      queryKey: analyticsQueryKeys.course.overview(courseId),
      queryFn: async () => {
        const { data } = await supabase.rpc('get_teacher_analytics_optimized', {
          p_course_id: courseId,
          p_limit: 20,
        })
        return data
      },
      ...CACHE_CONFIG.dashboardOverview,
    })

    // Prefetch student list
    queryClient.prefetchQuery({
      queryKey: analyticsQueryKeys.course.students(courseId),
      queryFn: async () => {
        const { data } = await supabase.rpc('get_teacher_analytics_optimized', {
          p_course_id: courseId,
          p_limit: 20,
        })
        return data
      },
      ...CACHE_CONFIG.studentList,
    })
  }

  // Prefetch executive dashboard if user has access
  queryClient.prefetchQuery({
    queryKey: analyticsQueryKeys.executive.dashboard,
    queryFn: async () => {
      const { data } = await supabase.rpc('get_executive_analytics')
      return data
    },
    ...CACHE_CONFIG.executiveDashboard,
  })
}

// ---------------------------------------------------------------------------
// Cache Invalidation Utilities
// ---------------------------------------------------------------------------

/**
 * Invalidate analytics cache when data changes
 * Call this after mutations that affect analytics data
 */
export function invalidateAnalyticsCache(
  queryClient: any, // QueryClient type
  courseId?: string
) {
  if (courseId) {
    // Invalidate course-specific queries
    queryClient.invalidateQueries({
      queryKey: analyticsQueryKeys.course.all,
    })
  }

  // Invalidate all analytics queries (use sparingly)
  queryClient.invalidateQueries({
    queryKey: analyticsQueryKeys.course.all,
  })
  queryClient.invalidateQueries({
    queryKey: analyticsQueryKeys.teacher.all,
  })
}

/**
 * Selective cache invalidation for specific entity changes
 */
export function invalidateEntityAnalyticsCache(
  queryClient: any,
  entityType: 'quiz' | 'student' | 'course' | 'enrollment',
  entityId: string,
  courseId?: string
) {
  switch (entityType) {
    case 'quiz':
      // Invalidate quiz-specific analytics
      if (courseId) {
        queryClient.invalidateQueries({
          queryKey: analyticsQueryKeys.course.quizzes(courseId),
        })
      }
      break

    case 'student':
      // Invalidate student list and overview
      if (courseId) {
        queryClient.invalidateQueries({
          queryKey: analyticsQueryKeys.course.students(courseId),
        })
        queryClient.invalidateQueries({
          queryKey: analyticsQueryKeys.course.overview(courseId),
        })
      }
      break

    case 'enrollment':
      // Invalidate overview when enrollment changes
      if (courseId) {
        queryClient.invalidateQueries({
          queryKey: analyticsQueryKeys.course.overview(courseId),
        })
      }
      break

    default:
      // Invalidate all course analytics
      if (courseId) {
        queryClient.invalidateQueries({
          queryKey: analyticsQueryKeys.course.all,
        })
      }
  }
}
