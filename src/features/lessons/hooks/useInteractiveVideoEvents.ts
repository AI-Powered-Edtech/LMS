import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/src/contexts/AuthContext'
import type { InteractiveEvent, InteractiveVideoMetadata, Quiz } from '@/src/features/lessons/types'
import { getQuizWithQuestions } from '@/src/features/quizzes/api/quizManager.service'
import { logger } from '@/src/utils/logger'

// ==========================================================================
// useInteractiveVideoEvents — Shared hook for interactive video pop-up quizzes
//
// Used by both VideoViewer.tsx and VideoBlock.tsx to avoid duplicated logic.
// Manages: quiz prefetching, active event detection, completion tracking,
// and video pause/resume around quiz overlays.
// ==========================================================================

interface UseInteractiveVideoEventsOptions {
  metadata?: Record<string, unknown>
  videoRef: React.RefObject<HTMLVideoElement | null>
}

interface UseInteractiveVideoEventsResult {
  events: InteractiveEvent[]
  activeEvent: InteractiveEvent | null
  completedEvents: Set<number>
  loadedQuizzes: Record<string, Quiz>
  /** Call from timeupdate handler. Returns true if an event was triggered (video paused). */
  checkForEvent: (currentTime: number) => boolean
  /** Call when the student completes the pop-up quiz. Resumes video. */
  handleEventComplete: () => void
}

export function useInteractiveVideoEvents({
  metadata,
  videoRef,
}: UseInteractiveVideoEventsOptions): UseInteractiveVideoEventsResult {
  const { tenantId } = useAuth()

  const interactiveData = metadata as InteractiveVideoMetadata | undefined
  const events = interactiveData?.interactiveEvents || []

  const [activeEvent, setActiveEvent] = useState<InteractiveEvent | null>(null)
  const [completedEvents, setCompletedEvents] = useState<Set<number>>(new Set())
  const [loadedQuizzes, setLoadedQuizzes] = useState<Record<string, Quiz>>({})

  // Stable ref for events to avoid stale closures
  const eventsRef = useRef(events)
  eventsRef.current = events

  const completedRef = useRef(completedEvents)
  completedRef.current = completedEvents

  const activeRef = useRef(activeEvent)
  activeRef.current = activeEvent

  // Prefetch quizzes referenced by events
  useEffect(() => {
    if (!tenantId || events.length === 0) return
    const quizIds = events.map((e) => e.quizId).filter(Boolean) as string[]
    if (quizIds.length === 0) return

    // Deduplicate
    const uniqueIds = [...new Set(quizIds)]
    uniqueIds.forEach((id) => {
      getQuizWithQuestions(id, tenantId)
        .then((quizData) => {
          setLoadedQuizzes((prev) => ({ ...prev, [id]: quizData as unknown as Quiz }))
        })
        .catch((err) => logger.error('[useInteractiveVideoEvents] Failed to load quiz', err))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, events.length])

  // Check if the current playback time matches an interactive event
  const checkForEvent = useCallback(
    (currentTime: number): boolean => {
      if (activeRef.current) return false // Already showing an event

      for (const ev of eventsRef.current) {
        if (!completedRef.current.has(ev.timeInSeconds)) {
          if (currentTime >= ev.timeInSeconds && currentTime <= ev.timeInSeconds + 1.5) {
            videoRef.current?.pause()
            setActiveEvent(ev)
            return true
          }
        }
      }
      return false
    },
    [videoRef]
  )

  // Complete the active event and resume video
  const handleEventComplete = useCallback(() => {
    const current = activeRef.current
    if (current) {
      setCompletedEvents((prev) => new Set(prev).add(current.timeInSeconds))
      setActiveEvent(null)
      // Resume video slightly past the trigger point to avoid re-triggering
      if (videoRef.current) {
        videoRef.current.currentTime = current.timeInSeconds + 2
        videoRef.current.play().catch(console.error)
      }
    }
  }, [videoRef])

  return {
    events,
    activeEvent,
    completedEvents,
    loadedQuizzes,
    checkForEvent,
    handleEventComplete,
  }
}
