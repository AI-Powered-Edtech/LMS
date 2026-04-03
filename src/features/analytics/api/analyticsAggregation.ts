// ==========================================================================
// Analytics Aggregation — analyticsAggregation.ts
//
// Error parsing and client-side aggregation/computation logic for analytics.
// Extracted from analyticsService.ts for modularity.
// ==========================================================================

import type {
  ActivityMetrics,
  AnalyticsError as AnalyticsErrorType,
  CourseStatsRow,
  TenantAnalyticsOverview,
} from '../types'
import { AnalyticsError } from '../types'

/**
 * Parse Supabase RPC error and return user-friendly error
 */
export function parseRpcError(error: unknown): AnalyticsErrorType {
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

/**
 * Aggregate course stats rows into a tenant-level overview.
 */
export function aggregateTenantOverview(stats: CourseStatsRow[]): TenantAnalyticsOverview {
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
    stats.length > 0 ? stats.reduce((sum, s) => sum + (s.avg_quiz_score || 0), 0) / stats.length : 0

  // Get most recent refresh timestamp (column may not exist in all environments)
  const lastRefreshedAt =
    stats.length > 0
      ? stats.reduce(
          (latest, s) => {
            const current = s.last_refreshed_at ?? null
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
}

/**
 * Aggregate activity event counts into ActivityMetrics.
 */
export function aggregateActivityMetrics(
  rows: { event_type: string; count: number }[]
): ActivityMetrics {
  let lessonCompletions = 0
  let quizAttempts = 0
  let assignmentSubmissions = 0
  let totalEvents = 0

  rows.forEach((r) => {
    const c = Number(r.count)
    totalEvents += c
    if (r.event_type === 'LESSON_COMPLETED') lessonCompletions += c
    if (r.event_type === 'QUIZ_SUBMITTED') quizAttempts += c
    if (r.event_type === 'ASSIGNMENT_SUBMITTED') assignmentSubmissions += c
  })

  return {
    lessonCompletions,
    quizAttempts,
    assignmentSubmissions,
    totalEvents,
  }
}
