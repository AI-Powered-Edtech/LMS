import React, { useEffect, useRef } from 'react'

import { useLearningSession } from '@/features/analytics'

// ============================================================
// LessonEventTracker — emits LESSON_STARTED / LESSON_COMPLETED
// Renders nothing. Must live inside LearningSessionProvider.
// ============================================================

export function LessonEventTracker({
  lessonStatus,
  hasResumeProgress,
  completedBlockCount,
  sessionStartRef,
}: {
  lessonStatus: string
  hasResumeProgress: boolean
  completedBlockCount: number
  sessionStartRef: React.RefObject<number>
}) {
  const { trackEvent } = useLearningSession()
  const hasFiredStarted = useRef(false)
  const hasFiredCompleted = useRef(false)

  // Reset flags when lesson changes (status goes back to loading)
  useEffect(() => {
    if (lessonStatus === 'loading') {
      hasFiredStarted.current = false
      hasFiredCompleted.current = false
    }
  }, [lessonStatus])

  // LESSON_STARTED: fire once when lesson transitions to viewing/in_progress
  useEffect(() => {
    if (
      !hasFiredStarted.current &&
      (lessonStatus === 'viewing' || lessonStatus === 'in_progress')
    ) {
      hasFiredStarted.current = true
      trackEvent('LESSON_STARTED', { resume: hasResumeProgress })
    }
  }, [lessonStatus, hasResumeProgress, trackEvent])

  // LESSON_COMPLETED: fire once when status becomes completed
  useEffect(() => {
    if (!hasFiredCompleted.current && lessonStatus === 'completed') {
      hasFiredCompleted.current = true
      trackEvent('LESSON_COMPLETED', {
        time_spent: Math.round((Date.now() - (sessionStartRef.current ?? Date.now())) / 1000),
        blocks_viewed: completedBlockCount,
      })
    }
  }, [lessonStatus, completedBlockCount, sessionStartRef, trackEvent])

  return null
}
