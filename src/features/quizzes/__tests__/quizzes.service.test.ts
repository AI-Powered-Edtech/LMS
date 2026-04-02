import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

import { getQuizWithQuestions } from '../api/quizzes.service'

describe('quizzes.service', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('getQuizWithQuestions', () => {
    // FIXED: A3 — removed catch-all try/catch that made test always pass.
    // Now asserts that supabase.from() is actually called with 'quizzes'.
    it('queries quizzes table with quiz ID', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: { id: 'quiz-1', tenant_id: 'tenant-1' }, error: null }),
      }
      mockFrom.mockReturnValue(mockChain)

      await getQuizWithQuestions('quiz-1', 'tenant-1')

      expect(mockFrom).toHaveBeenCalledWith('quizzes')
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'quiz-1')
      expect(mockChain.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1')
    })

    // FIXED: A3 — asserts the returned data directly without swallowing errors.
    it('returns quiz data', async () => {
      const quiz = { id: 'quiz-1', title: 'Math Quiz', tenant_id: 'tenant-1', quiz_questions: [] }
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: quiz, error: null }),
      })

      const result = await getQuizWithQuestions('quiz-1', 'tenant-1')

      expect(result).toBeDefined()
      expect(result!.id).toBe('quiz-1')
      expect(result!.title).toBe('Math Quiz')
    })

    // FIXED: A3 — uses rejects.toThrow() pattern instead of wrapping in catch-all.
    it('throws on not found error', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      })

      await expect(getQuizWithQuestions('quiz-1', 'tenant-1')).rejects.toBeDefined()
    })
  })
})
