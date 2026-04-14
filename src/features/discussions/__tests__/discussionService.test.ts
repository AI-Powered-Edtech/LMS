import { api } from "@/src/lib/api"
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { discussionService } from '../api/discussionService'

const mockFrom = vi.fn()

vi.mock('@/src/services/api/client', () => ({
  api: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

function makeDiscussionChain(resolveWith: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    // simulate the end of the chain resolving
    then: (resolve: Function) => resolve(resolveWith),
  }
}

describe('discussionService.fetchDiscussions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries discussions table', async () => {
    const fromSpy = vi.fn().mockReturnValue(makeDiscussionChain({ data: [], error: null }))
    mockFrom.mockImplementation(fromSpy)
    await discussionService.fetchDiscussions({ lessonId: 'lesson-1' })
    expect(fromSpy).toHaveBeenCalledWith('discussions')
  })

  it('applies announcementId filter', async () => {
    const eqSpy = vi.fn().mockReturnThis()
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: eqSpy,
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (resolve: Function) => resolve({ data: [], error: null }),
    })
    await discussionService.fetchDiscussions({ announcementId: 'ann-1' })
    expect(eqSpy).toHaveBeenCalledWith('announcement_id', 'ann-1')
  })

  it('applies lessonId filter', async () => {
    const eqSpy = vi.fn().mockReturnThis()
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: eqSpy,
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (resolve: Function) => resolve({ data: [], error: null }),
    })
    await discussionService.fetchDiscussions({ lessonId: 'lesson-1' })
    expect(eqSpy).toHaveBeenCalledWith('lesson_id', 'lesson-1')
  })

  it('returns empty array for no discussions', async () => {
    mockFrom.mockReturnValue(makeDiscussionChain({ data: [], error: null }))
    const result = await discussionService.fetchDiscussions({ courseId: 'course-1' })
    expect(result).toEqual([])
  })
})
