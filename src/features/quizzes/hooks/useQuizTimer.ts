// Quiz Timer Hook - Pure logic extracted from QuizTimer.tsx
// Part of the Quiz Engine Refactor
// Updated: Quiz Timer Pause/Resume (Task 26.1)

import { useCallback, useEffect, useRef, useState } from 'react'

import { db } from '@/services/db'

interface UseQuizTimerOptions {
  expiresAt: string | null
  timeLimitMinutes: number
  attemptId: string
  onTimeUp: () => void
}

interface UseQuizTimerResult {
  timeLeft: number
  isWarning: boolean
  isCritical: boolean
  progressColor: string
  isPaused: boolean
  pauseCount: number
  pausesRemaining: number
  pauseCountdown: number
  pauseTimer: () => Promise<void>
  resumeTimer: () => Promise<void>
}

/**
 * Pure logic hook for quiz timer countdown.
 * Handles both server-side expires_at and client-side timeLimitMinutes.
 * Supports pause/resume via Supabase RPC (max 1 pause, max 5 minutes).
 */
export function useQuizTimer({
  expiresAt,
  timeLimitMinutes,
  attemptId,
  onTimeUp,
}: UseQuizTimerOptions): UseQuizTimerResult {
  const MAX_PAUSES = 1

  const calculateInitialTime = useCallback(() => {
    if (expiresAt) {
      const remainingSeconds = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      return Math.max(0, remainingSeconds)
    }
    return (timeLimitMinutes || 10) * 60
  }, [expiresAt, timeLimitMinutes])

  const [timeLeft, setTimeLeft] = useState(calculateInitialTime)
  const [isPaused, setIsPaused] = useState(false)
  const [pauseCount, setPauseCount] = useState(0)
  const [pauseCountdown, setPauseCountdown] = useState(0)
  const [isPauseLoading, setIsPauseLoading] = useState(false)

  const onTimeUpRef = useRef(onTimeUp)
  onTimeUpRef.current = onTimeUp

  // Keep a stable ref to resumeTimer so the pause countdown effect always
  // calls the latest version without being listed as a dependency (which
  // would reset the interval on every render cycle).
  const resumeTimerRef = useRef<() => Promise<void>>(async () => {})

  // Recalculate when expiresAt changes (e.g., after page refresh)
  useEffect(() => {
    setTimeLeft(calculateInitialTime())
  }, [calculateInitialTime])

  // Main quiz countdown — stops when paused or time runs out
  useEffect(() => {
    if (isPaused) return
    if (timeLeft <= 0) {
      onTimeUpRef.current()
      return
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft, isPaused])

  // Pause countdown — counts down max pause duration, auto-resumes when done
  useEffect(() => {
    if (!isPaused) return
    if (pauseCountdown <= 0) {
      // Auto-resume: fire and forget (best-effort). Use ref to avoid stale closure.
      void resumeTimerRef.current()
      return
    }
    const timer = setInterval(() => setPauseCountdown((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [isPaused, pauseCountdown])

  const pauseTimer = useCallback(async () => {
    if (isPaused || pauseCount >= MAX_PAUSES || isPauseLoading) return
    setIsPauseLoading(true)
    try {
      const { data, error } = await db.rpc('pause_quiz_attempt', {
        p_attempt_id: attemptId,
      })
      if (error) throw error

      const result = data as {
        success: boolean
        pause_remaining_seconds: number
        pause_count: number
        pauses_remaining: number
      }
      setIsPaused(true)
      setPauseCount(result.pause_count)
      setPauseCountdown(result.pause_remaining_seconds)
    } catch (err) {
      // Surface error to the user via console; UI layer shows toast via error boundary
      if (import.meta.env.DEV) console.error('[useQuizTimer] Gagal mempause kuis:', err)
      throw err
    } finally {
      setIsPauseLoading(false)
    }
  }, [attemptId, isPaused, pauseCount, isPauseLoading])

  const resumeTimer = useCallback(async () => {
    if (!isPaused || isPauseLoading) return
    setIsPauseLoading(true)
    try {
      const { error } = await db.rpc('resume_quiz_attempt', {
        p_attempt_id: attemptId,
      })
      if (error) throw error

      setIsPaused(false)
      setPauseCountdown(0)
    } catch (err) {
      if (import.meta.env.DEV) console.error('[useQuizTimer] Gagal melanjutkan kuis:', err)
      throw err
    } finally {
      setIsPauseLoading(false)
    }
  }, [attemptId, isPaused, isPauseLoading])

  // Keep ref in sync with latest resumeTimer so the pause countdown effect
  // always has a fresh reference without causing interval resets.
  resumeTimerRef.current = resumeTimer

  // Tuned thresholds for real exam durations (30+ min)
  const isWarning = timeLeft <= 300 && timeLeft > 60 // ≤5 min → orange
  const isCritical = timeLeft <= 60 // ≤1 min → red + pulse
  const progressColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'

  const pausesRemaining = Math.max(0, MAX_PAUSES - pauseCount)

  return {
    timeLeft,
    isWarning,
    isCritical,
    progressColor,
    isPaused,
    pauseCount,
    pausesRemaining,
    pauseCountdown,
    pauseTimer,
    resumeTimer,
  }
}
