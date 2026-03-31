import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { gamificationService } from '../api/gamificationService'

/**
 * Hook untuk mengambil daftar Gamifikasi.
 */
export function useGamificationData(userId: string, tenantId: string) {
  return useQuery({
    queryKey: ['gamification', userId, tenantId],
    queryFn: () => gamificationService.getUserBadges(userId, tenantId),
    enabled: !!userId && !!tenantId,
  })
}

/**
 * Hook untuk membuat/mengupdate Gamifikasi.
 */
export function useGamificationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { userId: string; tenantId: string }) =>
      gamificationService.getUserStreak(params.userId, params.tenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gamification'] }),
  })
}

// ============================================================
// Sesi 1: useAwardXP — Award XP from any activity
// ============================================================

import { useCallback, useRef } from 'react'

import { useAuth } from '@/src/contexts/AuthContext'
import { useToast } from '@/src/hooks/useToast'
import type { XPEventType } from '../types'
import { XP_AMOUNTS, XP_DAILY_CAPS } from '../types'

interface AwardXPMetadata {
  lessonId?: string
  courseId?: string
  assignmentId?: string
  quizId?: string
  discussionId?: string
}

/**
 * Hook to award XP from various activities.
 * Handles daily caps, optimistic toast, and cache invalidation.
 *
 * Usage:
 *   const { awardXP } = useAwardXP()
 *   await awardXP('lesson_complete', { lessonId, courseId })
 *
 * Note: Backend RPC `award_xp(event_type, metadata)` needs to be
 * generalized from `award_quiz_xp` — this is a Claude Code task.
 * Frontend is ready to call it once available.
 */
export function useAwardXP() {
  const { user, tenantId } = useAuth()
  const { addToast } = useToast()
  const qc = useQueryClient()
  const dailyCountsRef = useRef<Record<string, number>>({})

  const awardXP = useCallback(
    async (eventType: XPEventType, metadata?: AwardXPMetadata) => {
      if (!user?.id || !tenantId) return

      // Check daily cap
      const cap = XP_DAILY_CAPS[eventType]
      if (cap) {
        const key = `${eventType}_${new Date().toDateString()}`
        const current = dailyCountsRef.current[key] ?? 0
        if (current >= cap) {
          addToast({
            message: `Batas harian untuk ${eventType.replace('_', ' ')} tercapai`,
            type: 'info',
          })
          return
        }
        dailyCountsRef.current[key] = current + 1
      }

      const xpAmount = XP_AMOUNTS[eventType]

      try {
        // TODO: Replace with actual RPC call once backend is ready
        // await supabase.rpc('award_xp', {
        //   p_user_id: user.id,
        //   p_tenant_id: tenantId,
        //   p_event_type: eventType,
        //   p_xp_amount: xpAmount,
        //   p_metadata: metadata ?? {},
        // })

        // Optimistic toast
        addToast({
          message: `+${xpAmount} XP — ${getEventLabel(eventType)}`,
          type: 'success',
        })

        // Invalidate XP profile and leaderboard queries
        qc.invalidateQueries({ queryKey: ['gamification'] })
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to award XP:', err)
        // Rollback daily count on failure
        if (cap) {
          const key = `${eventType}_${new Date().toDateString()}`
          dailyCountsRef.current[key] = Math.max(0, (dailyCountsRef.current[key] ?? 1) - 1)
        }
      }
    },
    [user?.id, tenantId, addToast, qc]
  )

  return { awardXP }
}

/** Human-readable labels for XP event types (Bahasa Indonesia) */
function getEventLabel(eventType: XPEventType): string {
  const labels: Record<XPEventType, string> = {
    quiz_pass: 'Lulus Kuis',
    lesson_complete: 'Pelajaran Selesai',
    assignment_submit: 'Tugas Dikirim',
    assignment_ontime: 'Bonus Tepat Waktu',
    discussion_post: 'Post Diskusi',
    daily_login: 'Login Harian',
    perfect_score: 'Nilai Sempurna',
  }
  return labels[eventType] ?? eventType
}

// ============================================================
// Sesi 6: useDailyMissions — Manage daily missions state
// ============================================================

import { useMemo } from 'react'

import type { DailyMission, MissionStatus } from '../types'
import { MISSION_POOL, DIFFICULTY_CONFIG } from '../types'

interface UseDailyMissionsReturn {
  missions: DailyMission[]
  completedCount: number
  totalCount: number
  allComplete: boolean
  claimMission: (missionId: string) => void
  updateProgress: (missionId: string, progress: number) => void
  refreshMissions: () => void
}

/**
 * Hook to manage daily missions lifecycle.
 * Generates a daily set of missions from MISSION_POOL using date-based seed,
 * tracks progress, and handles claim logic.
 *
 * Usage:
 *   const { missions, completedCount, claimMission } = useDailyMissions()
 */
export function useDailyMissions(): UseDailyMissionsReturn {
  const { user, tenantId } = useAuth()
  const qc = useQueryClient()
  const { addToast } = useToast()

  // Date-based seed for consistent daily selection
  const todaySeed = new Date().toISOString().slice(0, 10)

  // Select 3 missions from the pool using a simple hash
  const dailyMissions = useMemo(() => {
    const hash = todaySeed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    const shuffled = [...MISSION_POOL].sort(
      (a, b) =>
        ((a.id.charCodeAt(0) + hash) % 100) - ((b.id.charCodeAt(0) + hash) % 100)
    )
    return shuffled.slice(0, 3).map((m) => ({
      ...m,
      status: 'active' as MissionStatus,
      progress: 0,
    }))
  }, [todaySeed])

  // Use React Query to persist mission state for the day
  const { data: missions = dailyMissions } = useQuery({
    queryKey: ['daily-missions', user?.id, tenantId, todaySeed],
    queryFn: async () => {
      // TODO: Replace with Supabase RPC once backend is ready
      // const { data } = await supabase.rpc('get_daily_missions', {
      //   p_user_id: user!.id,
      //   p_tenant_id: tenantId!,
      //   p_date: todaySeed,
      // })
      return dailyMissions
    },
    enabled: !!user?.id && !!tenantId,
    staleTime: 5 * 60 * 1000,
  })

  const completedCount = useMemo(
    () => missions.filter((m) => m.status === 'completed' || m.status === 'claimed').length,
    [missions]
  )

  const claimMission = useCallback(
    async (missionId: string) => {
      const mission = missions.find((m) => m.id === missionId)
      if (!mission || mission.status !== 'completed') return

      const config = DIFFICULTY_CONFIG[mission.difficulty]
      const xpReward = config.xpReward

      // Optimistic update
      qc.setQueryData(
        ['daily-missions', user?.id, tenantId, todaySeed],
        (old: DailyMission[] | undefined) =>
          (old ?? missions).map((m) =>
            m.id === missionId ? { ...m, status: 'claimed' as MissionStatus } : m
          )
      )

      addToast({
        message: `+${xpReward} XP — Misi "${mission.title}" selesai!`,
        type: 'success',
      })

      // Invalidate gamification cache
      qc.invalidateQueries({ queryKey: ['gamification'] })
    },
    [missions, user?.id, tenantId, todaySeed, qc, addToast]
  )

  const updateProgress = useCallback(
    (missionId: string, progress: number) => {
      qc.setQueryData(
        ['daily-missions', user?.id, tenantId, todaySeed],
        (old: DailyMission[] | undefined) =>
          (old ?? missions).map((m) => {
            if (m.id !== missionId || m.status === 'claimed') return m
            const newProgress = Math.min(progress, m.target)
            const newStatus: MissionStatus =
              newProgress >= m.target ? 'completed' : 'active'
            return { ...m, progress: newProgress, status: newStatus }
          })
      )
    },
    [missions, user?.id, tenantId, todaySeed, qc]
  )

  const refreshMissions = useCallback(() => {
    qc.invalidateQueries({
      queryKey: ['daily-missions', user?.id, tenantId, todaySeed],
    })
  }, [user?.id, tenantId, todaySeed, qc])

  return {
    missions,
    completedCount,
    totalCount: missions.length,
    allComplete: completedCount === missions.length && missions.length > 0,
    claimMission,
    updateProgress,
    refreshMissions,
  }
}
