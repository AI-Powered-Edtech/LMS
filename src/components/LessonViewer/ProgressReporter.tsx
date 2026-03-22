import { useEffect, useRef, useCallback } from 'react'
import { lessonService } from '@/src/features/lessons'

interface ProgressReporterProps {
  lessonId: string
  tenantId: string
  status: 'started' | 'in_progress' | 'completed'
  progressPercentage: number
  lastPosition?: number
  enabled: boolean
}

/**
 * ProgressReporter — Invisible component that throttles progress updates to Supabase.
 * Sends updates every 5 seconds using the monotonic RPC function.
 */
export function ProgressReporter({
  lessonId,
  tenantId,
  status,
  progressPercentage,
  lastPosition,
  enabled,
}: ProgressReporterProps) {
  const lastSent = useRef({ percentage: 0, position: 0 })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const sendUpdate = useCallback(async () => {
    // Only send if there's meaningful change
    if (
      progressPercentage <= lastSent.current.percentage &&
      (lastPosition ?? 0) <= lastSent.current.position
    ) {
      return
    }

    try {
      await lessonService.queueProgressUpdate(
        lessonId,
        tenantId,
        status,
        progressPercentage,
        lastPosition
      )
      lastSent.current = {
        percentage: progressPercentage,
        position: lastPosition ?? 0,
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[ProgressReporter] Failed to sync:', err)
    }
  }, [lessonId, tenantId, status, progressPercentage, lastPosition])

  // Throttled 5-second interval
  useEffect(() => {
    if (!enabled) return

    intervalRef.current = setInterval(sendUpdate, 5000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [enabled, sendUpdate])

  // Handle online and beforeunload events
  useEffect(() => {
    const handleOnline = () => {
      lessonService.processOfflineQueue(tenantId)
    }

    const handleBeforeUnload = () => {
      // Flush immediate progress to queue if it hasn't been sent yet
      if (
        progressPercentage > lastSent.current.percentage ||
        (lastPosition ?? 0) > lastSent.current.position
      ) {
        lessonService.queueProgressUpdate(
          lessonId,
          tenantId,
          status,
          progressPercentage,
          lastPosition
        )
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [tenantId, lessonId, status, progressPercentage, lastPosition])

  // Flush on unmount or lesson change
  useEffect(() => {
    return () => {
      if (progressPercentage > lastSent.current.percentage) {
        sendUpdate()
      }
    }
  }, [lessonId]) // eslint-disable-line react-hooks/exhaustive-deps

  // This is an invisible reporting component
  return null
}
