import { supabase } from '@/src/lib/supabase'
import {
  CourseStatsRow,
  ActivityEventRow,
  TenantAnalyticsOverview,
  ActivityMetrics,
  CourseEngagement,
  ActivityTimePoint,
  TenantAnalyticsData,
  TeacherAnalyticsData,
  CourseAnalytics,
  LessonAnalytics,
  StudentSignal,
  FunnelDefinition,
  FunnelStepResult,
  RetentionRow,
  AnalyticsError,
  EngagementSummaryRow,
  EngagementTrendPoint,
  LearningPath,
  StudentPathStep,
  StudentPrediction,
  PredictionDetail,
  PredictionSummary,
} from '../types'

/**
 * Parse Supabase RPC error and return user-friendly error
 */
function parseRpcError(error: unknown): AnalyticsError {
  const errorMessage = error instanceof Error ? error.message : String(error)

  // Check for specific error patterns
  if (errorMessage.includes('function not found') || errorMessage.includes('does not exist')) {
    return new AnalyticsError(
      'Konfigurasi analitik belum lengkap. Silakan hubungi administrator sistem.',
      'RPC_NOT_FOUND',
      error
    )
  }

  if (
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('must be teacher') ||
    errorMessage.includes('must be teacher or admin')
  ) {
    return new AnalyticsError(
      'Anda tidak memiliki akses ke analitik kursus ini. Hanya guru dan admin yang dapat melihat.',
      'PERMISSION_DENIED',
      error
    )
  }

  if (errorMessage.includes('course not found')) {
    return new AnalyticsError(
      'Kursus tidak ditemukan atau telah dihapus.',
      'COURSE_NOT_FOUND',
      error
    )
  }

  if (errorMessage.includes('Tenant mismatch') || errorMessage.includes('tenant')) {
    return new AnalyticsError(
      'Akses ditolak. Kursus tidak termasuk dalam organisasi Anda.',
      'TENANT_MISMATCH',
      error
    )
  }

  // Check for network errors
  if (
    errorMessage.includes('fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('timeout')
  ) {
    return new AnalyticsError(
      'Koneksi internet bermasalah. Silakan coba lagi.',
      'NETWORK_ERROR',
      error
    )
  }

  return new AnalyticsError(
    'Terjadi kesalahan saat memuat analitik. Silakan coba lagi.',
    'UNKNOWN',
    error
  )
}

export const analyticsService = {
  /**
   * Refreshes the pre-aggregated course_stats.
   * Note: In a production environment this should be called by a scheduled pg_cron job,
   * but we provide it here for manual refreshes.
   *
   * @param courseId - The course ID to refresh stats for
   * @param tenantId - Tenant ID for defense-in-depth (currently not passed to RPC)
   * TODO: RPC should accept p_tenant_id for defense-in-depth
   */
  async refreshCourseStats(courseId: string, _tenantId: string): Promise<void> {
    const { error } = await supabase.rpc('refresh_course_stats', { p_course_id: courseId })

    if (error) {
      console.error('Failed to refresh course stats:', error)
      throw parseRpcError(error)
    }
  },

  /**
   * Fetches the complete analytics dashboard JSON from the RPC.
   *
   * @param courseId - The course ID to get analytics for
   * @param tenantId - Tenant ID for defense-in-depth (currently not passed to RPC)
   * TODO: RPC should accept p_tenant_id for defense-in-depth
   */
  async getTeacherAnalytics(
    courseId: string,
    _tenantId: string
  ): Promise<TeacherAnalyticsData | null> {
    const { data, error } = await supabase.rpc('get_teacher_analytics', { p_course_id: courseId })

    if (error) {
      console.error('Failed to get teacher analytics:', error)
      throw parseRpcError(error)
    }

    return data as TeacherAnalyticsData | null
  },

  /**
   * Refresh all course stats (admin only)
   *
   * @param tenantId - Tenant ID for defense-in-depth (currently not passed to RPC)
   * TODO: RPC should accept p_tenant_id for defense-in-depth
   */
  async refreshAllCourseStats(_tenantId: string): Promise<void> {
    const { error } = await supabase.rpc('refresh_all_course_stats')

    if (error) {
      console.error('Failed to refresh all course stats:', error)
      throw parseRpcError(error)
    }
  },

  /**
   * Fetches tenant-level analytics overview from course_stats table.
   * Aggregates data across all courses in the tenant.
   */
  async getTenantAnalyticsOverview(tenantId: string): Promise<TenantAnalyticsOverview> {
    const { data, error } = await supabase
      .from('course_stats')
      .select('*')
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Failed to get tenant analytics overview:', error)
      throw new Error('Gagal memuat ringkasan analitik. Silakan coba lagi.')
    }

    const stats = (data as CourseStatsRow[]) || []

    if (stats.length === 0) {
      return {
        totalEnrolled: 0,
        activeStudents: 0,
        totalCourses: 0,
        coursesRunning: 0,
        avgProgress: 0,
        avgQuizScore: 0,
        lastRefreshedAt: null,
      }
    }

    // Aggregate across all courses
    const totalEnrolled = stats.reduce((sum, s) => sum + (s.total_enrolled || 0), 0)
    const activeStudents = stats.reduce((sum, s) => sum + (s.active_students || 0), 0)
    const coursesRunning = stats.filter((s) => (s.active_students || 0) > 0).length
    const avgProgress =
      stats.length > 0 ? stats.reduce((sum, s) => sum + (s.avg_progress || 0), 0) / stats.length : 0
    const avgQuizScore =
      stats.length > 0
        ? stats.reduce((sum, s) => sum + (s.avg_quiz_score || 0), 0) / stats.length
        : 0

    // Get most recent refresh timestamp
    const lastRefreshedAt =
      stats.length > 0
        ? stats.reduce(
            (latest, s) => {
              const current = s.last_refreshed_at
              return !latest || (current && new Date(current) > new Date(latest)) ? current : latest
            },
            null as string | null
          )
        : null

    return {
      totalEnrolled,
      activeStudents,
      totalCourses: stats.length,
      coursesRunning,
      avgProgress: Math.round(avgProgress * 10) / 10,
      avgQuizScore: Math.round(avgQuizScore * 10) / 10,
      lastRefreshedAt,
    }
  },

  /**
   * Fetches activity metrics from activity_events table.
   * Counts events by type for the tenant within a time range.
   */
  async getActivityMetrics(tenantId: string, days: number = 30): Promise<ActivityMetrics> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data, error } = await supabase
      .from('activity_events')
      .select('event_type, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', since.toISOString())
      .limit(5000)

    if (error) {
      console.error('Failed to get activity metrics:', error)
      throw new Error('Gagal memuat metrik aktivitas. Silakan coba lagi.')
    }

    const events = (data as ActivityEventRow[]) || []

    // Count by event type
    const lessonCompletions = events.filter((e) => e.event_type === 'LESSON_COMPLETED').length
    const quizAttempts = events.filter(
      (e) => e.event_type === 'QUIZ_ATTEMPT' || e.event_type === 'QUIZ_SUBMITTED'
    ).length
    const assignmentSubmissions = events.filter(
      (e) => e.event_type === 'ASSIGNMENT_SUBMITTED'
    ).length

    return {
      lessonCompletions,
      quizAttempts,
      assignmentSubmissions,
      totalEvents: events.length,
    }
  },

  /**
   * Fetches course engagement data from course_stats.
   * Returns engagement metrics per course.
   */
  async getCourseEngagementStats(tenantId: string): Promise<CourseEngagement[]> {
    // First get course stats
    const { data: statsData, error: statsError } = await supabase
      .from('course_stats')
      .select('*')
      .eq('tenant_id', tenantId)

    if (statsError) {
      console.error('Failed to get course engagement stats:', statsError)
      throw new Error('Gagal memuat data engagement kursus. Silakan coba lagi.')
    }

    const stats = (statsData as CourseStatsRow[]) || []

    // Get course names
    if (stats.length === 0) {
      return []
    }

    const courseIds = stats.map((s) => s.course_id)
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('id, title')
      .in('id', courseIds)

    if (coursesError) {
      console.error('Failed to get course names:', coursesError)
      // Continue without course names
    }

    const courseMap = new Map((coursesData || []).map((c) => [c.id, c.title]))

    return stats.map((s) => ({
      courseId: s.course_id,
      courseName: courseMap.get(s.course_id) || 'Unknown Course',
      enrolled: s.total_enrolled || 0,
      activeStudents: s.active_students || 0,
      avgProgress: Math.round((s.avg_progress || 0) * 10) / 10,
      avgQuizScore: Math.round((s.avg_quiz_score || 0) * 10) / 10,
    }))
  },

  /**
   * Fetches activity timeline data for charts.
   * Returns daily activity counts over the specified period.
   */
  async getActivityTimeline(tenantId: string, days: number = 14): Promise<ActivityTimePoint[]> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data, error } = await supabase
      .from('activity_events')
      .select('event_type, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true })
      .limit(5000)

    if (error) {
      console.error('Failed to get activity timeline:', error)
      throw new Error('Gagal memuat timeline aktivitas. Silakan coba lagi.')
    }

    const events = (data as ActivityEventRow[]) || []

    // Group by date
    const dateMap = new Map<string, ActivityTimePoint>()

    for (const event of events) {
      const date = event.created_at.split('T')[0]

      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          lessonCompletions: 0,
          quizAttempts: 0,
          assignmentSubmissions: 0,
        })
      }

      const point = dateMap.get(date)!

      if (event.event_type === 'LESSON_COMPLETED') {
        point.lessonCompletions++
      } else if (event.event_type === 'QUIZ_ATTEMPT' || event.event_type === 'QUIZ_SUBMITTED') {
        point.quizAttempts++
      } else if (event.event_type === 'ASSIGNMENT_SUBMITTED') {
        point.assignmentSubmissions++
      }
    }

    // Convert to array and fill missing dates
    const result: ActivityTimePoint[] = []
    const currentDate = new Date(since)
    const endDate = new Date()

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      result.push(
        dateMap.get(dateStr) || {
          date: dateStr,
          lessonCompletions: 0,
          quizAttempts: 0,
          assignmentSubmissions: 0,
        }
      )
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return result
  },

  /**
   * Fetches all tenant analytics data combined.
   * This is the main entry point for the admin dashboard.
   */
  async getTenantAnalytics(tenantId: string): Promise<TenantAnalyticsData> {
    const [overview, activityMetrics, courseEngagement, activityTimeline] = await Promise.all([
      this.getTenantAnalyticsOverview(tenantId),
      this.getActivityMetrics(tenantId),
      this.getCourseEngagementStats(tenantId),
      this.getActivityTimeline(tenantId),
    ])

    return {
      overview,
      activityMetrics,
      courseEngagement,
      activityTimeline,
    }
  },

  // SP-12.3: Dashboard RPC methods

  async getCourseAnalyticsDashboard(
    courseId: string,
    _tenantId: string
  ): Promise<CourseAnalytics | null> {
    const { data, error } = await supabase.rpc('get_course_analytics', { p_course_id: courseId })
    if (error) throw parseRpcError(error)
    return (data as CourseAnalytics[])?.[0] ?? null
  },

  async getLessonAnalyticsDashboard(
    courseId: string,
    _tenantId: string
  ): Promise<LessonAnalytics[]> {
    const { data, error } = await supabase.rpc('get_lesson_analytics', { p_course_id: courseId })
    if (error) throw parseRpcError(error)
    return (data as LessonAnalytics[]) ?? []
  },

  async getStudentSignalsDashboard(
    courseId: string,
    tenantId: string,
    lessonId?: string
  ): Promise<StudentSignal[]> {
    const { data, error } = await supabase.rpc('get_student_signals', {
      p_course_id: courseId,
      p_lesson_id: lessonId ?? null,
    })
    if (error) throw parseRpcError(error)
    return (data as StudentSignal[]) ?? []
  },

  // SP-14: Funnel Analysis
  async saveFunnelDefinition(
    name: string,
    steps: string[],
    courseId?: string,
    funnelId?: string
  ): Promise<string> {
    const { data, error } = await supabase.rpc('save_funnel_definition', {
      p_name: name,
      p_steps: steps,
      p_course_id: courseId ?? null,
      p_funnel_id: funnelId ?? null,
    })
    if (error) throw parseRpcError(error)
    return data as string
  },

  async listFunnelDefinitions(courseId?: string): Promise<FunnelDefinition[]> {
    const { data, error } = await supabase.rpc('list_funnel_definitions', {
      p_course_id: courseId ?? null,
    })
    if (error) throw parseRpcError(error)
    return ((data as Array<Record<string, unknown>>) ?? []).map((r) => ({
      ...r,
      steps: Array.isArray(r.steps) ? r.steps : JSON.parse(r.steps as string),
    })) as unknown as FunnelDefinition[]
  },

  async deleteFunnelDefinition(funnelId: string): Promise<void> {
    const { error } = await supabase.rpc('delete_funnel_definition', { p_funnel_id: funnelId })
    if (error) throw parseRpcError(error)
  },

  async getFunnelResults(funnelId: string): Promise<FunnelStepResult[]> {
    const { data, error } = await supabase.rpc('get_funnel_results', { p_funnel_id: funnelId })
    if (error) throw parseRpcError(error)
    return (data as FunnelStepResult[]) ?? []
  },

  // SP-15: Retention & Cohort
  async getRetentionMatrix(courseId: string, weeksBack: number = 8): Promise<RetentionRow[]> {
    const { data, error } = await supabase.rpc('get_retention_matrix', {
      p_course_id: courseId,
      p_weeks_back: weeksBack,
    })
    if (error) throw parseRpcError(error)
    return (data as RetentionRow[]) ?? []
  },

  // SP-16: Engagement Scoring
  async getEngagementSummary(courseId: string): Promise<EngagementSummaryRow[]> {
    const { data, error } = await supabase.rpc('get_engagement_summary', { p_course_id: courseId })
    if (error) throw parseRpcError(error)
    return (data as EngagementSummaryRow[]) ?? []
  },

  async getEngagementTrend(courseId: string, days: number = 30): Promise<EngagementTrendPoint[]> {
    const { data, error } = await supabase.rpc('get_engagement_trend', {
      p_course_id: courseId,
      p_days: days,
    })
    if (error) throw parseRpcError(error)
    return (data as EngagementTrendPoint[]) ?? []
  },

  // SP-17: Learning Path Analysis
  async getLearningPaths(courseId: string, minUsers: number = 1): Promise<LearningPath[]> {
    const { data, error } = await supabase.rpc('get_learning_paths', {
      p_course_id: courseId,
      p_min_users: minUsers,
    })
    if (error) throw parseRpcError(error)
    return (data as LearningPath[]) ?? []
  },

  async getStudentPath(userId: string, courseId: string): Promise<StudentPathStep[]> {
    const { data, error } = await supabase.rpc('get_student_path', {
      p_user_id: userId,
      p_course_id: courseId,
    })
    if (error) throw parseRpcError(error)
    return (data as StudentPathStep[]) ?? []
  },

  // SP-19: Predictive Analytics
  async getAtRiskStudents(courseId: string, minRisk: number = 0.3): Promise<StudentPrediction[]> {
    const { data, error } = await supabase.rpc('get_at_risk_students', {
      p_course_id: courseId,
      p_min_risk: minRisk,
    })
    if (error) throw parseRpcError(error)
    return (data as StudentPrediction[]) ?? []
  },

  async getStudentPrediction(userId: string, courseId: string): Promise<PredictionDetail | null> {
    const { data, error } = await supabase.rpc('get_student_prediction', {
      p_user_id: userId,
      p_course_id: courseId,
    })
    if (error) throw parseRpcError(error)
    return ((data as PredictionDetail[]) ?? [])[0] ?? null
  },

  async getPredictionSummary(courseId: string): Promise<PredictionSummary | null> {
    const { data, error } = await supabase.rpc('get_prediction_summary', {
      p_course_id: courseId,
    })
    if (error) throw parseRpcError(error)
    return ((data as PredictionSummary[]) ?? [])[0] ?? null
  },
}
