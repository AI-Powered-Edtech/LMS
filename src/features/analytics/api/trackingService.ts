import { supabase } from '@/src/services/supabase/client'

import type { EventMetadata, LearningEvent, LearningEventType } from '../types/events.types'

const MAX_BUFFER_SIZE = 200 // cap to prevent infinite growth on persistent failures
const FLUSH_INTERVAL = 5000
const FLUSH_THRESHOLD = 20

let eventBuffer: LearningEvent[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null
let isFlushing = false // prevent concurrent flushes

/** Track a single learning event. Buffers and flushes in batches. */
export function trackLearningEvent(params: {
  eventType: LearningEventType
  sessionId: string
  courseId?: string
  lessonId?: string
  moduleId?: string
  metadata?: EventMetadata
}) {
  const event: LearningEvent = {
    event_id: crypto.randomUUID(),
    event_type: params.eventType,
    session_id: params.sessionId,
    course_id: params.courseId,
    lesson_id: params.lessonId,
    module_id: params.moduleId,
    client_timestamp: new Date().toISOString(),
    metadata: params.metadata ?? {},
  }

  eventBuffer.push(event)

  // Cap buffer to prevent memory leak on persistent failures
  if (eventBuffer.length > MAX_BUFFER_SIZE) {
    eventBuffer = eventBuffer.slice(-MAX_BUFFER_SIZE)
  }

  if (eventBuffer.length >= FLUSH_THRESHOLD) {
    flushEvents()
  }
}

/** Start the flush timer (call on session start) */
export function startEventFlushing() {
  if (flushTimer) return
  flushTimer = setInterval(flushEvents, FLUSH_INTERVAL)
}

/** Stop the flush timer and flush remaining events (call on unmount) */
export function stopEventFlushing() {
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
  flushEvents()
}

/** Flush buffered events to the database */
async function flushEvents() {
  if (eventBuffer.length === 0 || isFlushing) return

  isFlushing = true
  const batch = [...eventBuffer]
  eventBuffer = []

  try {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[Analytics] Flushing', batch.length, 'events')
    }

    const { error } = await supabase.rpc('insert_learning_events', {
      p_events: batch,
    })

    if (error) {
      if (import.meta.env.DEV) console.warn('[Analytics] Flush failed, re-queuing:', error.message)
      eventBuffer = [...batch, ...eventBuffer].slice(-MAX_BUFFER_SIZE)
    }
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[Analytics] Flush error:', err)
    eventBuffer = [...batch, ...eventBuffer].slice(-MAX_BUFFER_SIZE)
  } finally {
    isFlushing = false
  }
}
