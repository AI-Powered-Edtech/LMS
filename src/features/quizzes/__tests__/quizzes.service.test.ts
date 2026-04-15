import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

import { getQuizWithQuestions } from '../api/quizzes.service'

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

describe('quizzes.service', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('getQuizWithQuestions', () => {
    it('queries quizzes table with quiz ID', async () => {
      const quizChain = makeChain({
        data: { id: 'quiz-1', tenant_id: 'tenant-1', title: 'Math Quiz' },
        error: null,
      })
      const questionChain = makeChain({ data: [], error: null })
      mockFrom.mockImplementation((table: string) => {
        if (table === 'quizzes') return quizChain
        if (table === 'quiz_questions') return questionChain
        if (table === 'quiz_options') return makeChain({ data: [], error: null })
        return makeChain({ data: [], error: null })
      })

      await getQuizWithQuestions('quiz-1', 'tenant-1')

      expect(mockFrom).toHaveBeenCalledWith('quizzes')
      expect(quizChain.eq).toHaveBeenCalledWith('id', 'quiz-1')
      expect(quizChain.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1')
    })

    it('returns quiz data', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'quizzes') {
          return makeChain({
            data: { id: 'quiz-1', title: 'Math Quiz', tenant_id: 'tenant-1' },
            error: null,
          })
        }
        if (table === 'quiz_questions') {
          return makeChain({
            data: [
              {
                id: 'q-1',
                quiz_id: 'quiz-1',
                text: 'Q1',
                order: 1,
                question_type: 'mcq',
                points: 1,
                explanation: null,
                tenant_id: 'tenant-1',
              },
            ],
            error: null,
          })
        }
        if (table === 'quiz_options') {
          return makeChain({
            data: [{ id: 'o-1', question_id: 'q-1', text: 'A', is_correct: true }],
            error: null,
          })
        }
        return makeChain({ data: [], error: null })
      })

      const result = await getQuizWithQuestions('quiz-1', 'tenant-1')

      expect(result).toBeDefined()
      expect(result!.id).toBe('quiz-1')
      expect(result!.title).toBe('Math Quiz')
      expect(result!.quiz_questions).toHaveLength(1)
    })

    it('throws on not found error', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'quizzes') {
          return makeChain({
            data: null,
            error: { code: 'PGRST116', message: 'Not found' },
          })
        }
        return makeChain({ data: [], error: null })
      })

      await expect(getQuizWithQuestions('quiz-1', 'tenant-1')).rejects.toBeDefined()
    })
  })
})
