import { useContext } from 'react'
import { LearningSessionContext } from '../context/LearningSessionContext'
import type { LearningEventType, EventMetadata } from '../types/events.types'

interface LearningSessionValue {
  sessionId: string
  trackEvent: (eventType: LearningEventType, metadata?: EventMetadata) => void
}

const NOOP_SESSION: LearningSessionValue = {
  sessionId: '',
  trackEvent: () => {},
}

/**
 * Safe version of useLearningSession that returns a noop when
 * the LearningSessionProvider is not in the component tree.
 *
 * Use in components that must work with or without analytics wrapping
 * (e.g. MultiBlockViewer, VideoBlock, QuizViewer).
 */
export function useOptionalLearningSession(): LearningSessionValue {
  const ctx = useContext(LearningSessionContext)
  return ctx ?? NOOP_SESSION
}
