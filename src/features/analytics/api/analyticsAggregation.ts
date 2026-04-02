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

  // PERFORMANCE: Combine multiple O(N) array traversals (reduce/filter) into a single O(N) pass loop
  let totalEnrolled = 0
  let activeStudents = 0
  let coursesRunning = 0
  let sumProgress = 0
  let sumQuizScore = 0
  let lastRefreshedAt: string | null = null

  for (let i = 0; i < stats.length; i++) {
    const s = stats[i]
    totalEnrolled += s.total_enrolled || 0

    const active = s.active_students || 0
    activeStudents += active
    if (active > 0) coursesRunning++

    sumProgress += s.avg_progress || 0
    sumQuizScore += s.avg_quiz_score || 0

    const currentRefresh = s.last_refreshed_at
    if (currentRefresh) {
      if (!lastRefreshedAt || new Date(currentRefresh) > new Date(lastRefreshedAt)) {
        lastRefreshedAt = currentRefresh
      }
    }
  }

  const avgProgress = stats.length > 0 ? sumProgress / stats.length : 0
  const avgQuizScore = stats.length > 0 ? sumQuizScore / stats.length : 0

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
    if (r.event_type === 'QUIZ_ATTEMPT' || r.event_type === 'QUIZ_SUBMITTED') quizAttempts += c
    if (r.event_type === 'ASSIGNMENT_SUBMITTED') assignmentSubmissions += c
  })

  return {
    lessonCompletions,
    quizAttempts,
    assignmentSubmissions,
    totalEvents,
  }
}
