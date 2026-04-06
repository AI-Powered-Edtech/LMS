import { beforeEach, describe, expect, it, vi } from 'vitest'

import { batchSaveAnswers, startQuizAttempt, submitQuizAttempt } from '../api/quizAttemptService'

// ══════════════════════════════════════════════════════════════
// Mocks
// ══════════════════════════════════════════════════════════════

const mockRpc = vi.fn()
const mockGetSession = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: { getSession: () => mockGetSession() },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('@/utils/logDevError', () => ({
  logDevError: vi.fn(),
}))

const AUTHENTICATED_SESSION = {
  data: { session: { user: { id: 'student-1' } } },
}
const NO_SESSION = { data: { session: null } }

// ══════════════════════════════════════════════════════════════
// startQuizAttempt
// ══════════════════════════════════════════════════════════════

describe('startQuizAttempt', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws "Not authenticated" when no session', async () => {
    mockGetSession.mockResolvedValue(NO_SESSION)
    await expect(startQuizAttempt('quiz-1')).rejects.toThrow('Not authenticated')
  })

  it('calls v1_start_quiz_attempt RPC with quiz ID string', async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION)
    mockRpc.mockResolvedValue({ data: { attempt_id: 'a1', questions: [] }, error: null })
    await startQuizAttempt('quiz-1')
    expect(mockRpc).toHaveBeenCalledWith('v1_start_quiz_attempt', {
      p_quiz_id: 'quiz-1',
      p_assignment_id: null,
    })
  })

  it('passes assignment_id from object input', async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION)
    mockRpc.mockResolvedValue({ data: { attempt_id: 'a1' }, error: null })
    await startQuizAttempt({ quizId: 'q1', assignmentId: 'assign-1' })
    expect(mockRpc).toHaveBeenCalledWith('v1_start_quiz_attempt', {
      p_quiz_id: 'q1',
      p_assignment_id: 'assign-1',
    })
  })

  it('returns StartQuizAttemptResult on success', async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION)
    const attemptResult = { attempt_id: 'a1', questions: ['q1', 'q2'], expires_at: '2026-01-01' }
    mockRpc.mockResolvedValue({ data: attemptResult, error: null })
    const result = await startQuizAttempt('quiz-1')
    expect(result).toEqual(attemptResult)
  })

  it('throws with RPC error message', async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION)
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Max attempts reached' } })
    await expect(startQuizAttempt('quiz-1')).rejects.toThrow('Max attempts reached')
  })

  it('handles missing error message gracefully', async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION)
    mockRpc.mockResolvedValue({ data: null, error: { message: '' } })
    await expect(startQuizAttempt('quiz-1')).rejects.toThrow('Failed to start quiz')
  })
})

// ══════════════════════════════════════════════════════════════
// submitQuizAttempt
// ══════════════════════════════════════════════════════════════

describe('submitQuizAttempt', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws when not authenticated', async () => {
    mockGetSession.mockResolvedValue(NO_SESSION)
    await expect(submitQuizAttempt('a1', [])).rejects.toThrow('Not authenticated')
  })

  it('calls v1_submit_quiz_attempt with normalized answers', async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION)
    mockRpc.mockResolvedValue({
      data: { score: 80, passed: true, total_points: 100 },
      error: null,
    })
    const answers = [
      { question_id: 'q1', selected_option_ids: ['opt-a'], text_answer: null },
      { question_id: 'q2', selected_option_ids: [], text_answer: 'Jakarta' },
    ]
    await submitQuizAttempt('attempt-1', answers)
    expect(mockRpc).toHaveBeenCalledWith(
      'v1_submit_quiz_attempt',
      expect.objectContaining({
        p_attempt_id: 'attempt-1',
        p_final_answers: expect.any(Array),
      })
    )
  })

  it('returns QuizAttemptResult with score and passed', async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION)
    mockRpc.mockResolvedValue({
      data: { score: 95, passed: true, total_points: 100, percentage: 95 },
      error: null,
    })
    const result = await submitQuizAttempt('a1', [])
    expect(result.score).toBe(95)
    expect(result.passed).toBe(true)
  })

  it('awards XP in background when passed (fire-and-forget)', async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION)
    mockRpc.mockResolvedValue({
      data: { score: 80, passed: true },
      error: null,
    })
    // XP award calls supabase.from — mock it
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { quiz_id: 'q1', tenant_id: 't1', student_id: 's1' },
        error: null,
      }),
    })
    const result = await submitQuizAttempt('a1', [])
    expect(result.passed).toBe(true)
    // XP is fire-and-forget — no error thrown even if it fails
  })

  it('throws on RPC error', async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION)
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Time expired' } })
    await expect(submitQuizAttempt('a1', [])).rejects.toThrow('Time expired')
  })

  it('includes version in telemetry_data when provided', async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION)
    mockRpc.mockResolvedValue({ data: { score: 70, passed: false }, error: null })
    await submitQuizAttempt('a1', [], 2)
    expect(mockRpc).toHaveBeenCalledWith(
      'v1_submit_quiz_attempt',
      expect.objectContaining({
        p_telemetry_data: { client_version: 2 },
      })
    )
  })

  it('sends empty telemetry when version not provided', async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION)
    mockRpc.mockResolvedValue({ data: { score: 70, passed: false }, error: null })
    await submitQuizAttempt('a1', [])
    expect(mockRpc).toHaveBeenCalledWith(
      'v1_submit_quiz_attempt',
      expect.objectContaining({
        p_telemetry_data: {},
      })
    )
  })
})

// ══════════════════════════════════════════════════════════════
// batchSaveAnswers
// ══════════════════════════════════════════════════════════════

describe('batchSaveAnswers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws when not authenticated', async () => {
    mockGetSession.mockResolvedValue(NO_SESSION)
    await expect(batchSaveAnswers('a1', [])).rejects.toThrow('Not authenticated')
  })

  it('calls batch_save_answers RPC with formatted answers', async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION)
    mockRpc.mockResolvedValue({ error: null })
    const answers = [
      { question_id: 'q1', selected_option_ids: ['opt-a'], text_answer: null },
      { question_id: 'q2', selected_option_ids: [], text_answer: 'Essay text' },
    ]
    const result = await batchSaveAnswers('attempt-1', answers)
    expect(result).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('batch_save_answers', {
      p_attempt_id: 'attempt-1',
      p_answers: [
        { question_id: 'q1', selected_option_ids: ['opt-a'], text_answer: null },
        { question_id: 'q2', selected_option_ids: [], text_answer: 'Essay text' },
      ],
    })
  })

  it('throws on RPC error', async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION)
    mockRpc.mockResolvedValue({ error: { message: 'Attempt already submitted' } })
    await expect(batchSaveAnswers('a1', [])).rejects.toBeDefined()
  })
})