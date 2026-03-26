// Quiz Timer Hook - Pure logic extracted from QuizTimer.tsx
// Part of the Quiz Engine Refactor

<<<<<<< Updated upstream
import { useCallback, useEffect, useRef, useState } from 'react'
=======
import { useCallback,useEffect, useRef, useState } from 'react'
>>>>>>> Stashed changes

interface UseQuizTimerOptions {
  expiresAt: string | null
  timeLimitMinutes: number
  onTimeUp: () => void
}

interface UseQuizTimerResult {
  timeLeft: number
  isWarning: boolean
  isCritical: boolean
  progressColor: string
}

/**
 * Pure logic hook for quiz timer countdown
 * Handles both server-side expires_at and client-side timeLimitMinutes
 */
export function useQuizTimer({
  expiresAt,
  timeLimitMinutes,
  onTimeUp,
}: UseQuizTimerOptions): UseQuizTimerResult {
  const calculateInitialTime = useCallback(() => {
    if (expiresAt) {
      const remainingSeconds = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      return Math.max(0, remainingSeconds)
    }
    return (timeLimitMinutes || 10) * 60
  }, [expiresAt, timeLimitMinutes])

  const [timeLeft, setTimeLeft] = useState(calculateInitialTime)
  const onTimeUpRef = useRef(onTimeUp)
  onTimeUpRef.current = onTimeUp

  // Recalculate when expiresAt changes (e.g., after page refresh)
  useEffect(() => {
    setTimeLeft(calculateInitialTime())
  }, [calculateInitialTime])

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUpRef.current()
      return
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  // Tuned thresholds for real exam durations (30+ min)
  const isWarning = timeLeft <= 300 && timeLeft > 60 // ≤5 min → orange
  const isCritical = timeLeft <= 60 // ≤1 min → red + pulse
  const progressColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'

  return { timeLeft, isWarning, isCritical, progressColor }
}
