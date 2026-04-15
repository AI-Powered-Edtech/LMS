import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getQuizzesByCourse, getTeacherQuizzes } from '../api/quizManager.service'

const mockFrom = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

function makeChain(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, any> = {}
  const promise = Promise.resolve(resolvedValue)
  chain.then = (onFulfilled?: (v: unknown) => unknown, onRejected?: (v: unknown) => unknown) =>
    promise.then(onFulfilled, onRejected)
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  return chain
}

describe('getTeacherQuizzes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries quizzes table', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: [], error: null }))
    await getTeacherQuizzes('tenant-1')
    expect(mockFrom).toHaveBeenCalledWith('quizzes')
  })

  it('returns empty array for no quizzes', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: [], error: null }))
    const result = await getTeacherQuizzes('tenant-1')
    expect(result).toEqual([])
  })

  it('enriches quizzes with question_count and assignment_count', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'quizzes') {
        return makeChain({ data: [{ id: 'q1', title: 'Math Quiz' }], error: null })
      }
      if (table === 'quiz_assignments') {
        return makeChain({
          data: [{ id: 'qa1', quiz_id: 'q1', class_id: 'class-1' }],
          error: null,
        })
      }
      if (table === 'quiz_questions') {
        return makeChain({
          data: [
            { id: 'qq1', quiz_id: 'q1' },
            { id: 'qq2', quiz_id: 'q1' },
          ],
          error: null,
        })
      }
      return makeChain({ data: [], error: null })
    })
    const result = await getTeacherQuizzes('tenant-1')
    expect(result[0].question_count).toBe(2)
    expect(result[0].assignment_count).toBe(1)
  })

  it('returns 0 counts when arrays are empty', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'quizzes') {
        return makeChain({ data: [{ id: 'q1', title: 'Math Quiz' }], error: null })
      }
      if (table === 'quiz_assignments') {
        return makeChain({ data: [], error: null })
      }
      if (table === 'quiz_questions') {
        return makeChain({ data: [], error: null })
      }
      return makeChain({ data: [], error: null })
    })
    const result = await getTeacherQuizzes('tenant-1')
    expect(result[0].question_count).toBe(0)
    expect(result[0].assignment_count).toBe(0)
  })

  it('throws on database error', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: null, error: { message: 'DB error' } }))
    await expect(getTeacherQuizzes('tenant-1')).rejects.toMatchObject({ message: 'DB error' })
  })
})

describe('getQuizzesByCourse', () => {
  beforeEach(() => vi.clearAllMocks())

  it('filters by course_id and tenant_id', async () => {
    const eqSpy = vi.fn().mockReturnThis()
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: eqSpy,
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((onFulfilled?: (v: unknown) => unknown, onRejected?: (v: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected)
      ),
    })
    await getQuizzesByCourse('course-1', 'tenant-1')
    expect(eqSpy).toHaveBeenCalledWith('course_id', 'course-1')
    expect(eqSpy).toHaveBeenCalledWith('tenant_id', 'tenant-1')
  })
})
