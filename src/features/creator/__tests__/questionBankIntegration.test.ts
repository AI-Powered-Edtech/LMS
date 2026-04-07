import { beforeEach, describe, expect, it, vi } from 'vitest'

import { questionBankService } from '@/features/question-bank/api/questionBankService'

import { saveQuestionsToBank } from '../api/questionBankIntegration'

vi.mock('@/features/question-bank/api/questionBankService', () => ({
  questionBankService: {
    createQuestion: vi.fn(),
  },
}))

const mockCreateQuestion = vi.mocked(questionBankService.createQuestion)

// GeneratedQuizQuestion: options is Array<{text, is_correct}> (canonical ai-authoring format)
const mockQuizQuestion = {
  id: 'q1',
  question_type: 'MCQ' as const,
  text: 'Apa ibu kota Indonesia?',
  options: [
    { text: 'Surabaya', is_correct: false },
    { text: 'Bandung', is_correct: false },
    { text: 'Jakarta', is_correct: true },
    { text: 'Medan', is_correct: false },
  ],
  explanation: 'Jakarta adalah ibu kota Indonesia.',
  bloomLevel: 'C1',
}

// GeneratedOpenQuestion: answer is a string
const mockOpenQuestion = {
  id: 'q2',
  question_type: 'OPEN' as const,
  text: 'Jelaskan proses fotosintesis.',
  answer: 'Proses mengubah cahaya matahari menjadi energi kimia.',
  bloomLevel: 'C2',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('saveQuestionsToBank', () => {
  it('returns { saved: 0, failed: 0, errors: [] } for empty questions array', async () => {
    const result = await saveQuestionsToBank([], 'quiz', 'C1')
    expect(result).toEqual({ saved: 0, failed: 0, errors: [] })
    expect(mockCreateQuestion).not.toHaveBeenCalled()
  })

  it('maps quiz assignmentType to MCQ question type', async () => {
    mockCreateQuestion.mockResolvedValue(undefined)
    await saveQuestionsToBank([mockQuizQuestion], 'quiz', 'C1')
    expect(mockCreateQuestion).toHaveBeenCalledWith(expect.objectContaining({ type: 'MCQ' }))
  })

  it('maps writing assignmentType to ESSAY question type', async () => {
    mockCreateQuestion.mockResolvedValue(undefined)
    await saveQuestionsToBank([mockOpenQuestion], 'writing', 'C2')
    expect(mockCreateQuestion).toHaveBeenCalledWith(expect.objectContaining({ type: 'ESSAY' }))
  })

  it('maps reading assignmentType to SHORT_ANSWER question type', async () => {
    mockCreateQuestion.mockResolvedValue(undefined)
    await saveQuestionsToBank([mockOpenQuestion], 'reading', 'C2')
    expect(mockCreateQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SHORT_ANSWER' })
    )
  })

  it('maps MCQ options with option_text, is_correct, and order_index', async () => {
    mockCreateQuestion.mockResolvedValue(undefined)
    await saveQuestionsToBank([mockQuizQuestion], 'quiz', 'C1')
    expect(mockCreateQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [
          { option_text: 'Surabaya', is_correct: false, order_index: 0 },
          { option_text: 'Bandung', is_correct: false, order_index: 1 },
          { option_text: 'Jakarta', is_correct: true, order_index: 2 },
          { option_text: 'Medan', is_correct: false, order_index: 3 },
        ],
      })
    )
  })

  it('marks first option as correct when options[0].is_correct is true', async () => {
    mockCreateQuestion.mockResolvedValue(undefined)
    const q = {
      ...mockQuizQuestion,
      options: [
        { text: 'Surabaya', is_correct: true },
        { text: 'Bandung', is_correct: false },
        { text: 'Jakarta', is_correct: false },
        { text: 'Medan', is_correct: false },
      ],
    }
    await saveQuestionsToBank([q], 'quiz', 'C1')
    const call = mockCreateQuestion.mock.calls[0][0]
    expect(call.options[0].is_correct).toBe(true)
    expect(call.options[1].is_correct).toBe(false)
    expect(call.options[2].is_correct).toBe(false)
    expect(call.options[3].is_correct).toBe(false)
  })

  it('marks third option as correct when options[2].is_correct is true', async () => {
    mockCreateQuestion.mockResolvedValue(undefined)
    await saveQuestionsToBank([mockQuizQuestion], 'quiz', 'C1')
    const call = mockCreateQuestion.mock.calls[0][0]
    expect(call.options[2].is_correct).toBe(true)
    expect(call.options[0].is_correct).toBe(false)
  })

  it.each([
    ['C1', 1],
    ['C3', 3],
    ['C5', 5],
    ['C6', 5],
  ])('maps bloom level %s to difficulty_level %i', async (bloomLevel, expectedDifficulty) => {
    mockCreateQuestion.mockResolvedValue(undefined)
    await saveQuestionsToBank([mockOpenQuestion], 'writing', bloomLevel)
    expect(mockCreateQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ difficulty_level: expectedDifficulty })
    )
  })

  it('maps unknown bloom level to difficulty_level 3', async () => {
    mockCreateQuestion.mockResolvedValue(undefined)
    await saveQuestionsToBank([mockOpenQuestion], 'writing', 'UNKNOWN')
    expect(mockCreateQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ difficulty_level: 3 })
    )
  })

  it('always includes bloomLevel, assignmentType, and ai-generated in tags', async () => {
    mockCreateQuestion.mockResolvedValue(undefined)
    await saveQuestionsToBank([mockQuizQuestion], 'quiz', 'C3')
    expect(mockCreateQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['C3', 'quiz', 'ai-generated'] })
    )
  })

  it('uses correct tags for writing assignment with C5', async () => {
    mockCreateQuestion.mockResolvedValue(undefined)
    await saveQuestionsToBank([mockOpenQuestion], 'writing', 'C5')
    expect(mockCreateQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['C5', 'writing', 'ai-generated'] })
    )
  })

  it('increments saved counter for each successful call', async () => {
    mockCreateQuestion.mockResolvedValue(undefined)
    const questions = [mockQuizQuestion, mockOpenQuestion, mockQuizQuestion]
    const result = await saveQuestionsToBank(questions, 'quiz', 'C1')
    expect(result.saved).toBe(3)
    expect(result.failed).toBe(0)
    expect(result.errors).toEqual([])
  })

  it('increments failed and captures error message when one call throws', async () => {
    mockCreateQuestion
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce(undefined)
    const questions = [mockQuizQuestion, mockOpenQuestion, mockQuizQuestion]
    const result = await saveQuestionsToBank(questions, 'quiz', 'C1')
    expect(result.saved).toBe(2)
    expect(result.failed).toBe(1)
    expect(result.errors).toEqual(['DB error'])
  })

  it('returns { saved: 2, failed: 1, errors: ["DB error"] } for 3 questions where second fails', async () => {
    mockCreateQuestion
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce(undefined)
    const questions = [mockQuizQuestion, mockOpenQuestion, mockQuizQuestion]
    const result = await saveQuestionsToBank(questions, 'quiz', 'C2')
    expect(result).toEqual({ saved: 2, failed: 1, errors: ['DB error'] })
  })

  it('processes 7 questions in chunks of 3 and saves all when all succeed', async () => {
    mockCreateQuestion.mockResolvedValue(undefined)
    const questions = Array(7).fill(mockQuizQuestion)
    const result = await saveQuestionsToBank(questions, 'quiz', 'C1')
    expect(result.saved).toBe(7)
    expect(result.failed).toBe(0)
    expect(result.errors).toEqual([])
    expect(mockCreateQuestion).toHaveBeenCalledTimes(7)
  })

  it('processes all 7 questions across multiple batches', async () => {
    mockCreateQuestion.mockResolvedValue(undefined)
    const questions = Array(7).fill(mockOpenQuestion)
    const result = await saveQuestionsToBank(questions, 'writing', 'C4')
    expect(result.saved).toBe(7)
    expect(mockCreateQuestion).toHaveBeenCalledTimes(7)
  })

  it('sets options to [] for ESSAY questions', async () => {
    mockCreateQuestion.mockResolvedValue(undefined)
    await saveQuestionsToBank([mockOpenQuestion], 'writing', 'C2')
    expect(mockCreateQuestion).toHaveBeenCalledWith(expect.objectContaining({ options: [] }))
  })

  it('sets options to [] for SHORT_ANSWER questions', async () => {
    mockCreateQuestion.mockResolvedValue(undefined)
    await saveQuestionsToBank([mockOpenQuestion], 'reading', 'C2')
    expect(mockCreateQuestion).toHaveBeenCalledWith(expect.objectContaining({ options: [] }))
  })

  it('passes explanation for quiz (MCQ) questions', async () => {
    mockCreateQuestion.mockResolvedValue(undefined)
    await saveQuestionsToBank([mockQuizQuestion], 'quiz', 'C1')
    expect(mockCreateQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ explanation: 'Jakarta adalah ibu kota Indonesia.' })
    )
  })

  it('passes explanation as undefined for open questions', async () => {
    mockCreateQuestion.mockResolvedValue(undefined)
    await saveQuestionsToBank([mockOpenQuestion], 'writing', 'C2')
    expect(mockCreateQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ explanation: undefined })
    )
  })

  it('captures non-Error rejection reason as string in errors array', async () => {
    mockCreateQuestion.mockRejectedValueOnce('network timeout')
    const result = await saveQuestionsToBank([mockQuizQuestion], 'quiz', 'C1')
    expect(result.failed).toBe(1)
    expect(result.errors).toEqual(['network timeout'])
  })
})
