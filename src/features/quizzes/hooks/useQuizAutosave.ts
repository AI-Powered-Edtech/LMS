// Quiz Autosave Hook - Interval-based background save for Smart Player
// Part of the Quiz Engine Refactor

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Interface for the quiz service passed to the hook
 * The service must implement a saveProgress method
 */
export interface QuizServiceInterface {
  saveProgress: (attemptId: string, answers: Record<string, unknown>) => Promise<void>
}

/**
 * Options for useQuizAutosave hook
 */
export interface UseQuizAutosaveOptions {
  /** The current quiz attempt ID */
  attemptId: string
  /** Current answers to save */
  answers: Record<string, unknown>
  /** Quiz service with saveProgress method */
  quizService: QuizServiceInterface
  /** Interval in milliseconds (default: 30000 = 30 seconds) */
  intervalMs?: number
}

/**
 * Return value from useQuizAutosave hook
 */
export interface UseQuizAutosaveResult {
  /** Timestamp of the last successful save */
  lastSaved: Date | null
  /** Whether a save operation is currently in progress */
  isSaving: boolean
}

/**
 * Hook for interval-based autosave of quiz answers
 *
 * Features:
 * - Saves at regular intervals (default 30s)
 * - Only saves if answers have changed since last save
 * - Non-blocking: logs warnings on failure but doesn't throw
 * - Automatically clears interval on unmount
 *
 * @param options - Configuration options for the autosave hook
 * @returns Object with lastSaved timestamp and isSaving status
 */
export function useQuizAutosave({
  attemptId,
  answers,
  quizService,
  intervalMs = 30000,
}: UseQuizAutosaveOptions): UseQuizAutosaveResult {
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Track the last saved answers to detect changes
  const lastSavedAnswersRef = useRef<string | null>(null)

  // Keep a ref to the latest answers so the interval callback always reads
  // the most-current value without being listed as an effect dependency
  // (which would reset the interval on every answers change).
  const answersRef = useRef<Record<string, unknown>>(answers)

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true)

  // Sync answersRef on every render so the interval always sees fresh data
  answersRef.current = answers

  // Serialize answers to JSON for comparison
  const serializeAnswers = useCallback((answersObj: Record<string, unknown>): string => {
    try {
      return JSON.stringify(answersObj)
    } catch {
      return ''
    }
  }, [])

  // Save function — reads from answersRef so interval deps stay stable
  const performSave = useCallback(async () => {
    if (!attemptId || !quizService?.saveProgress) {
      return
    }

    const currentAnswers = answersRef.current
    const currentAnswersJson = serializeAnswers(currentAnswers)

    // Skip save if answers haven't changed
    if (lastSavedAnswersRef.current === currentAnswersJson) {
      return
    }

    // Skip save if there are no answers to save
    if (Object.keys(currentAnswers).length === 0) {
      return
    }

    setIsSaving(true)

    try {
      await quizService.saveProgress(attemptId, currentAnswers)

      // Only update state if still mounted
      if (isMountedRef.current) {
        lastSavedAnswersRef.current = currentAnswersJson
        setLastSaved(new Date())
      }
    } catch (error) {
      // Log warning but don't throw - user keeps working
      if (import.meta.env.DEV) console.warn('[useQuizAutosave] Save failed:', error)
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false)
      }
    }
    // answersRef and lastSavedAnswersRef are refs — stable, intentionally omitted
  }, [attemptId, quizService, serializeAnswers])

  // Set up interval for periodic saves.
  // Only depends on stable values so the interval is never torn down and
  // re-created because answers changed.
  useEffect(() => {
    isMountedRef.current = true

    const intervalId = setInterval(() => {
      void performSave()
    }, intervalMs)

    // Trigger first save after 5 seconds to establish connection and status
    const initialTimeout = setTimeout(() => {
      void performSave()
    }, 5000)

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false
      clearInterval(intervalId)
      clearTimeout(initialTimeout)
    }
  }, [attemptId, intervalMs, quizService, performSave])

  return {
    lastSaved,
    isSaving,
  }
}
