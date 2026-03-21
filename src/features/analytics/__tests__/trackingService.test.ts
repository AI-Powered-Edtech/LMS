import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockInsert = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { trackLearningEvent, startEventFlushing, stopEventFlushing } from '../api/trackingService'

describe('trackLearningEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ insert: mockInsert })
  })

  it('is callable without throwing', () => {
    expect(() => {
      trackLearningEvent({
        eventType: 'LESSON_COMPLETED' as any,
        sessionId: 'session-1',
        courseId: 'course-1',
        lessonId: 'lesson-1',
      })
    }).not.toThrow()
  })

  it('accepts optional metadata', () => {
    expect(() => {
      trackLearningEvent({
        eventType: 'QUIZ_COMPLETED' as any,
        sessionId: 'session-1',
        metadata: { score: 90 },
      })
    }).not.toThrow()
  })
})

describe('startEventFlushing / stopEventFlushing', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) })
  })

  afterEach(() => {
    stopEventFlushing()
    vi.useRealTimers()
  })

  it('startEventFlushing does not throw', () => {
    expect(() => startEventFlushing()).not.toThrow()
  })

  it('stopEventFlushing does not throw', () => {
    expect(() => stopEventFlushing()).not.toThrow()
  })
})
