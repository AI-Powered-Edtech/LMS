// Quiz Autosave Hook - Interval-based background save for Smart Player
// Part of the Quiz Engine Refactor

import { useState, useEffect, useRef, useCallback } from 'react'

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

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true)

  // Serialize answers to JSON for comparison
  const serializeAnswers = useCallback((answersObj: Record<string, unknown>): string => {
    try {
      return JSON.stringify(answersObj)
    } catch {
      return ''
    }
  }, [])

  // Save function - only saves if answers changed
  const performSave = useCallback(async () => {
    if (!attemptId || !quizService?.saveProgress) {
      return
    }

    const currentAnswersJson = serializeAnswers(answers)

    // Skip save if answers haven't changed
    if (lastSavedAnswersRef.current === currentAnswersJson) {
      return
    }

    // Skip save if there are no answers to save
    if (Object.keys(answers).length === 0) {
      return
    }

    setIsSaving(true)

    try {
      await quizService.saveProgress(attemptId, answers)

      // Only update state if still mounted
      if (isMountedRef.current) {
        lastSavedAnswersRef.current = currentAnswersJson
        setLastSaved(new Date())
      }
    } catch (error) {
      // Log warning but don't throw - user keeps working
      console.warn('[useQuizAutosave] Save failed:', error)
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false)
      }
    }
  }, [attemptId, answers, quizService, serializeAnswers])

  // Set up interval for periodic saves
  useEffect(() => {
    isMountedRef.current = true

    // Initial save check
    const currentAnswersJson = serializeAnswers(answers)
    if (lastSavedAnswersRef.current === null && currentAnswersJson) {
      lastSavedAnswersRef.current = currentAnswersJson
    }

    const intervalId = setInterval(() => {
      performSave()
    }, intervalMs)

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false
      clearInterval(intervalId)
    }
  }, [intervalMs, performSave, serializeAnswers, answers])

  return {
    lastSaved,
    isSaving,
  }
}
