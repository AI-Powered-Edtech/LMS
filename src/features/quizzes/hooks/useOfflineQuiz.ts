/**
 * Offline Quiz Synchronization Hook
 *
 * Manages offline quiz taking with automatic sync when connection resumes.
 * Uses existing IndexedDB infrastructure from offlineStorage.ts and offlineQueue.ts.
 *
 * Features:
 * - Cache quiz questions offline
 * - Store answers locally with encryption
 * - Auto-sync when connection resumes
 * - Conflict resolution
 * - Progress tracking
 * - Resume interrupted quiz
 *
 * Usage:
 * ```tsx
 * const {
 *   isOnline,
 *   cachedAnswers,
 *   syncStatus,
 *   cacheAnswer,
 *   submitWhenOnline
 * } = useOfflineQuiz(quizId)
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  cacheAnswerEncrypted,
  getCachedAnswers,
  addToSyncQueue,
  getPendingCount,
} from '@/utils/offlineStorage'
import { queueOperation } from '@/utils/offlineQueue'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CachedAnswer {
  questionId: string
  answer: string | string[] | number
  timestamp: number
}

interface SyncStatus {
  pending: number
  synced: number
  failed: number
}

interface UseOfflineQuizOptions {
  quizId: string
  attemptId?: string
  onSyncComplete?: () => void
  onSyncError?: (error: Error) => void
}

interface OfflineQuizState {
  isOnline: boolean
  cachedAnswers: CachedAnswer[]
  syncStatus: SyncStatus
  lastSyncAt?: Date
  isLoading: boolean
  error?: string
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOfflineQuiz(options: UseOfflineQuizOptions) {
  const { quizId, attemptId, onSyncComplete, onSyncError } = options

  const [state, setState] = useState<OfflineQuizState>({
    isOnline: navigator.onLine,
    cachedAnswers: [],
    syncStatus: { pending: 0, synced: 0, failed: 0 },
    isLoading: false,
  })

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isSyncingRef = useRef(false)

  // ─── Load Cached Answers ──────────────────────────────────────────────────

  const loadCachedAnswers = useCallback(async () => {
    try {
      const answers = await getCachedAnswers(quizId)
      setState((prev) => ({
        ...prev,
        cachedAnswers: answers,
      }))
    } catch (error) {
      console.error('[OfflineQuiz] Failed to load cached answers:', error)
    }
  }, [quizId])

  // ─── Cache Answer ─────────────────────────────────────────────────────────

  const cacheAnswer = useCallback(
    async (questionId: string, answer: string | string[] | number) => {
      try {
        // Encrypt and cache answer
        await cacheAnswerEncrypted(quizId, questionId, answer)

        // Update local state
        setState((prev) => ({
          ...prev,
          cachedAnswers: [
            ...prev.cachedAnswers.filter((a) => a.questionId !== questionId),
            {
              questionId,
              answer: answer as any,
              timestamp: Date.now(),
            },
          ],
        }))

        // If online, queue for immediate sync
        if (navigator.onLine) {
          await queueAnswerSync(quizId, questionId, answer)
        }
      } catch (error) {
        console.error('[OfflineQuiz] Failed to cache answer:', error)
        setState((prev) => ({
          ...prev,
          error: 'Gagal menyimpan jawaban',
        }))
      }
    },
    [quizId]
  )

  // ─── Queue Answer Sync ────────────────────────────────────────────────────

  const queueAnswerSync = useCallback(
    async (questionId: string, answer: string | string[] | number) => {
      try {
        await queueOperation({
          type: 'quiz-submission',
          data: {
            quizId,
            attemptId,
            questionId,
            answer,
          },
          idempotencyKey: `quiz-${quizId}-${questionId}-${Date.now()}`,
          maxRetries: 3,
          conflictResolution: 'client-wins',
        })

        // Update sync status
        const pending = await getPendingCount()
        setState((prev) => ({
          ...prev,
          syncStatus: {
            ...prev.syncStatus,
            pending,
          },
        }))
      } catch (error) {
        console.error('[OfflineQuiz] Failed to queue answer sync:', error)
        setState((prev) => ({
          ...prev,
          syncStatus: {
            ...prev.syncStatus,
            failed: prev.syncStatus.failed + 1,
          },
        }))
      }
    },
    [quizId, attemptId]
  )

  // ─── Submit All Pending Answers ───────────────────────────────────────────

  const submitPendingAnswers = useCallback(async () => {
    if (isSyncingRef.current) return

    isSyncingRef.current = true
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: undefined,
    }))

    try {
      // Process sync queue
      const result = await processSyncQueue()

      // Update sync status
      const pending = await getPendingCount()
      setState((prev) => ({
        ...prev,
        syncStatus: {
          ...prev.syncStatus,
          pending,
          synced: result.synced || 0,
          failed: result.failed || 0,
        },
        lastSyncAt: new Date(),
      }))

      // Reload cached answers
      await loadCachedAnswers()

      // Notify success
      onSyncComplete?.()
    } catch (error) {
      console.error('[OfflineQuiz] Failed to sync answers:', error)
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Sinkronisasi gagal',
      }))
      onSyncError?.(error instanceof Error ? error : new Error('Sync failed'))
    } finally {
      isSyncingRef.current = false
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }))
    }
  }, [loadCachedAnswers, onSyncComplete, onSyncError])

  // ─── Online/Offline Detection ─────────────────────────────────────────────

  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({
        ...prev,
        isOnline: true,
      }))

      // Auto-sync when connection resumes
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }

      // Delay sync to ensure connection is stable
      syncTimeoutRef.current = setTimeout(() => {
        void submitPendingAnswers()
      }, 2000)
    }

    const handleOffline = () => {
      setState((prev) => ({
        ...prev,
        isOnline: false,
      }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [submitPendingAnswers])

  // ─── Initial Load ─────────────────────────────────────────────────────────

  useEffect(() => {
    void loadCachedAnswers()
  }, [loadCachedAnswers])

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

  return {
    ...state,
    cacheAnswer,
    submitPendingAnswers,
    reloadCachedAnswers: loadCachedAnswers,
  }
}

export default useOfflineQuiz
