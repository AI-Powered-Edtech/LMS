// ==========================================================================
// Sprint D: Child Activity History for Parent Portal
//
// Provides a unified timeline view of a child's activities:
// - Lesson completions
// - Quiz attempts & scores
// - Assignment submissions
// - Attendance records
// - Achievement unlocks
//
// Uses a single RPC call (get_child_activity_timeline) for performance.
// ==========================================================================

import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/services/supabase/client'
import { captureError } from '@/utils/sentry'

// ── Types ─────────────────────────────────────────────────────────────────

export type ActivityType =
  | 'lesson_completed'
  | 'quiz_attempted'
  | 'quiz_passed'
  | 'quiz_failed'
  | 'assignment_submitted'
  | 'attendance_present'
  | 'attendance_absent'
  | 'attendance_late'
  | 'achievement_unlocked'
  | 'course_enrolled'
  | 'grade_received'

export interface ChildActivity {
  id: string
  type: ActivityType
  /** ISO timestamp */
  timestamp: string
  /** Human-readable title */
  title: string
  /** Additional detail (e.g., score, subject) */
  description?: string
  /** Related entity for deep-linking */
  entity_id?: string
  entity_type?: 'lesson' | 'quiz' | 'assignment' | 'course' | 'achievement'
  /** Numeric score (quiz/grade) */
  score?: number
  /** Max possible score */
  max_score?: number
  /** Subject/course context */
  subject?: string
  /** Metadata for rendering */
  metadata?: Record<string, unknown>
}

export interface ActivityFilters {
  types?: ActivityType[]
  dateFrom?: string // ISO date
  dateTo?: string // ISO date
  subject?: string
}

export interface ActivityStats {
  totalActivities: number
  lessonsCompleted: number
  quizzesTaken: number
  quizPassRate: number
  averageScore: number
  attendanceRate: number
  achievementsUnlocked: number
  /** Activity trend: more/less/same compared to previous period */
  trend: 'up' | 'down' | 'stable'
}

export interface UseChildActivityHistoryResult {
  activities: ChildActivity[]
  stats: ActivityStats
  isLoading: boolean
  error: string | null
  /** Load more activities (pagination) */
  loadMore: () => void
  hasMore: boolean
  /** Apply filters */
  setFilters: (filters: ActivityFilters) => void
  filters: ActivityFilters
}

// ── Constants ────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  lesson_completed: '📖',
  quiz_attempted: '📝',
  quiz_passed: '✅',
  quiz_failed: '❌',
  assignment_submitted: '📤',
  attendance_present: '🟢',
  attendance_absent: '🔴',
  attendance_late: '🟡',
  achievement_unlocked: '🏆',
  course_enrolled: '📚',
  grade_received: '📊',
}

export { ACTIVITY_TYPE_ICONS }

// ── Hook ─────────────────────────────────────────────────────────────────

export function useChildActivityHistory(childId: string): UseChildActivityHistoryResult {
  const { tenantId } = useAuth()
  const [filters, setFilters] = useState<ActivityFilters>({})
  const [page, setPage] = useState(0)

  // ── Main query ─────────────────────────────────────────────────────

  const queryKey = ['child-activity', childId, tenantId, filters, page]

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tenantId || !childId) return { activities: [], total: 0 }

      try {
        const { data: result, error: rpcError } = await supabase.rpc(
          'get_child_activity_timeline',
          {
            p_child_id: childId,
            p_tenant_id: tenantId,
            p_types: filters.types || null,
            p_date_from: filters.dateFrom || null,
            p_date_to: filters.dateTo || null,
            p_subject: filters.subject || null,
            p_offset: page * PAGE_SIZE,
            p_limit: PAGE_SIZE,
          }
        )

        if (rpcError) throw rpcError

        return {
          activities: (result?.activities as ChildActivity[]) || [],
          total: result?.total || 0,
        }
      } catch (err) {
        captureError(err, { context: 'useChildActivityHistory', childId })
        throw err
      }
    },
    enabled: !!tenantId && !!childId,
    staleTime: 60_000, // 1 minute
  })

  const activities = data?.activities || []
  const total = data?.total || 0
  const hasMore = activities.length >= PAGE_SIZE && (page + 1) * PAGE_SIZE < total

  const loadMore = useCallback(() => {
    if (hasMore) setPage((p) => p + 1)
  }, [hasMore])

  // ── Stats computation ──────────────────────────────────────────────

  const stats = useMemo((): ActivityStats => {
    const lessonsCompleted = activities.filter((a) => a.type === 'lesson_completed').length
    const quizAttempts = activities.filter((a) =>
      ['quiz_attempted', 'quiz_passed', 'quiz_failed'].includes(a.type)
    )
    const quizPassed = activities.filter((a) => a.type === 'quiz_passed').length
    const quizPassRate = quizAttempts.length > 0 ? (quizPassed / quizAttempts.length) * 100 : 0

    const scoresWithValues = activities
      .filter((a) => a.score !== undefined && a.max_score !== undefined && a.max_score > 0)
      .map((a) => ((a.score || 0) / (a.max_score || 1)) * 100)
    const averageScore =
      scoresWithValues.length > 0
        ? scoresWithValues.reduce((sum, s) => sum + s, 0) / scoresWithValues.length
        : 0

    const attendanceRecords = activities.filter((a) =>
      ['attendance_present', 'attendance_absent', 'attendance_late'].includes(a.type)
    )
    const presentCount = activities.filter((a) => a.type === 'attendance_present').length
    const attendanceRate =
      attendanceRecords.length > 0 ? (presentCount / attendanceRecords.length) * 100 : 0

    const achievementsUnlocked = activities.filter((a) => a.type === 'achievement_unlocked').length

    // Simplified trend: compare first half vs second half of activities
    const midpoint = Math.floor(activities.length / 2)
    const recentCount = midpoint
    const olderCount = activities.length - midpoint
    const trend: 'up' | 'down' | 'stable' =
      recentCount > olderCount * 1.2 ? 'up' : recentCount < olderCount * 0.8 ? 'down' : 'stable'

    return {
      totalActivities: total,
      lessonsCompleted,
      quizzesTaken: quizAttempts.length,
      quizPassRate: Math.round(quizPassRate),
      averageScore: Math.round(averageScore),
      attendanceRate: Math.round(attendanceRate),
      achievementsUnlocked,
      trend,
    }
  }, [activities, total])

  // ── Filter handler ─────────────────────────────────────────────────

  const handleSetFilters = useCallback((newFilters: ActivityFilters) => {
    setFilters(newFilters)
    setPage(0) // Reset pagination when filters change
  }, [])

  return {
    activities,
    stats,
    isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    loadMore,
    hasMore,
    setFilters: handleSetFilters,
    filters,
  }
}
