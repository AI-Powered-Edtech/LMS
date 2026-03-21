import { describe, it, expect, vi, beforeEach } from 'vitest'
import { startQuizAttempt, submitQuizAttempt } from '../api/quizPlayer.service'

const mockRpc = vi.fn()
const mockGetSession = vi.fn()

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}))

describe('startQuizAttempt', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    await expect(startQuizAttempt('quiz-1')).rejects.toThrow('Not authenticated')
  })

  it('calls v1_start_quiz_attempt RPC', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    mockRpc.mockResolvedValue({ data: { attempt_id: 'attempt-1' }, error: null })
    await startQuizAttempt('quiz-1')
    expect(mockRpc).toHaveBeenCalledWith(
      'v1_start_quiz_attempt',
      expect.objectContaining({
        p_quiz_id: 'quiz-1',
      })
    )
  })

  it('handles string quiz ID input', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    mockRpc.mockResolvedValue({ data: { attempt_id: 'attempt-1' }, error: null })
    await startQuizAttempt('quiz-1')
    expect(mockRpc).toHaveBeenCalledWith(
      'v1_start_quiz_attempt',
      expect.objectContaining({
        p_quiz_id: 'quiz-1',
        p_assignment_id: null,
      })
    )
  })

  it('handles object input with assignmentId', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    mockRpc.mockResolvedValue({ data: { attempt_id: 'attempt-1' }, error: null })
    await startQuizAttempt({ quizId: 'quiz-1', assignmentId: 'assign-1' })
    expect(mockRpc).toHaveBeenCalledWith(
      'v1_start_quiz_attempt',
      expect.objectContaining({
        p_quiz_id: 'quiz-1',
        p_assignment_id: 'assign-1',
      })
    )
  })

  it('throws on RPC error', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } })
    await expect(startQuizAttempt('quiz-1')).rejects.toThrow('RPC failed')
  })

  it('returns attempt result on success', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    const attemptResult = { attempt_id: 'attempt-1', questions: [] }
    mockRpc.mockResolvedValue({ data: attemptResult, error: null })
    const result = await startQuizAttempt('quiz-1')
    expect(result).toEqual(attemptResult)
  })
})

describe('submitQuizAttempt', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    await expect(submitQuizAttempt('attempt-1', [])).rejects.toThrow('Not authenticated')
  })

  it('calls v1_submit_quiz_attempt RPC', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    mockRpc.mockResolvedValue({ data: { score: 80, passed: true }, error: null })
    await submitQuizAttempt('attempt-1', [])
    expect(mockRpc).toHaveBeenCalledWith(
      'v1_submit_quiz_attempt',
      expect.objectContaining({
        p_attempt_id: 'attempt-1',
      })
    )
  })

  it('returns attempt result with score', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    mockRpc.mockResolvedValue({ data: { score: 90, passed: true, total_points: 100 }, error: null })
    const result = await submitQuizAttempt('attempt-1', [])
    expect(result.score).toBe(90)
    expect(result.passed).toBe(true)
  })

  it('throws on RPC error', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Submit failed' } })
    await expect(submitQuizAttempt('attempt-1', [])).rejects.toThrow('Submit failed')
  })
})
