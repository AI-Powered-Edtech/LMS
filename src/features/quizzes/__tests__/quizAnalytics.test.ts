import { beforeEach, describe, expect, it, vi } from 'vitest'

import { quizAnalyticsService } from '../api/quizAnalyticsService'

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/src/services/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

describe('quizAnalyticsService.getAttemptDetail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls get_attempt_detail RPC', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    await quizAnalyticsService.getAttemptDetail('attempt-1')
    expect(mockRpc).toHaveBeenCalledWith('get_attempt_detail', { p_attempt_id: 'attempt-1' })
  })

  it('returns attempt detail array', async () => {
    const detail = [{ question_id: 'q1', is_correct: true }]
    mockRpc.mockResolvedValue({ data: detail, error: null })
    const result = await quizAnalyticsService.getAttemptDetail('attempt-1')
    expect(result).toEqual(detail)
  })

  it('returns empty array when data is null', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    const result = await quizAnalyticsService.getAttemptDetail('attempt-1')
    expect(result).toEqual([])
  })

  it('throws on error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    await expect(quizAnalyticsService.getAttemptDetail('attempt-1')).rejects.toMatchObject({
      message: 'Not found',
    })
  })
})

describe('quizAnalyticsService.getQuestionDifficulty', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls get_question_difficulty RPC', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    await quizAnalyticsService.getQuestionDifficulty('assignment-1')
    expect(mockRpc).toHaveBeenCalledWith('get_question_difficulty', {
      p_assignment_id: 'assignment-1',
    })
  })
})

describe('quizAnalyticsService.exportGradebookCSV', () => {
  it('returns a CSV string', () => {
    const attempts = [
      {
        profiles: { full_name: 'Alice' },
        quizzes: { title: 'Quiz 1' },
        score: 90,
        submitted_at: '2026-01-01',
        passed: true,
        time_spent: null,
      },
      {
        profiles: { full_name: 'Bob' },
        quizzes: { title: 'Quiz 1' },
        score: 60,
        submitted_at: '2026-01-02',
        passed: false,
        time_spent: null,
      },
    ]
    const csv = quizAnalyticsService.exportGradebookCSV(attempts)
    expect(typeof csv).toBe('string')
    expect(csv).toContain('Alice')
    expect(csv).toContain('Bob')
  })

  it('returns empty string or header for empty attempts', () => {
    const csv = quizAnalyticsService.exportGradebookCSV([])
    expect(typeof csv).toBe('string')
  })
})
