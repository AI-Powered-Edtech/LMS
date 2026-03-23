import { beforeEach, describe, expect, it, vi } from 'vitest'

import { questionBankService } from '../api/questionBankService'

const mockRpc = vi.fn()

vi.mock('@/src/services/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

const mockQuestion = {
  type: 'MCQ' as const,
  text: 'What is 2+2?',
  explanation: 'Basic addition',
  difficulty_level: 1,
  options: [
    { option_text: '3', is_correct: false, order_index: 0 },
    { option_text: '4', is_correct: true, order_index: 1 },
  ],
  tags: ['math', 'basics'],
}

describe('questionBankService.createQuestion', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inserts into question_bank table', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'q1' }, error: null })
    await questionBankService.createQuestion(mockQuestion)
    expect(mockRpc).toHaveBeenCalledWith(
      'create_question',
      expect.objectContaining({
        p_question_text: 'What is 2+2?',
        p_question_type: 'MCQ',
      })
    )
  })

  it('throws on insert error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Insert failed' } })
    await expect(questionBankService.createQuestion(mockQuestion)).rejects.toMatchObject({
      message: 'Insert failed',
    })
  })
})

describe('questionBankService.searchQuestions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries question_bank table', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    await questionBankService.searchQuestions({})
    expect(mockRpc).toHaveBeenCalledWith(
      'search_questions',
      expect.objectContaining({
        p_limit: 20,
        p_offset: 0,
      })
    )
  })
})
