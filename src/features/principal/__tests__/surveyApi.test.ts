import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import {
  closeSurvey,
  createSurvey,
  deleteSurvey,
  getSurveyResults,
  getSurveys,
  publishSurvey,
  submitSurveyResponse,
  updateSurvey,
} from '../api/surveyApi'
import type { CreateSurveyInput } from '../types'

// ── Helpers ───────────────────────────────────────────────────────

function _chainMock(finalMethod: string, resolvedValue: unknown) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'eq', 'order', 'single', 'maybeSingle', 'insert', 'update', 'delete']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain[finalMethod] = vi.fn().mockResolvedValue(resolvedValue)
  return chain
}

// ── getSurveys ────────────────────────────────────────────────────

describe('getSurveys', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries satisfaction_surveys ordered by created_at desc', async () => {
    const mockSurveys = [
      { id: 's1', title: 'Survey 1', status: 'active' },
      { id: 's2', title: 'Survey 2', status: 'draft' },
    ]

    const mockOrder = vi.fn().mockResolvedValue({ data: mockSurveys, error: null })
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
    mockFrom.mockReturnValue({ select: mockSelect })

    const result = await getSurveys()

    expect(mockFrom).toHaveBeenCalledWith('satisfaction_surveys')
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(result).toEqual(mockSurveys)
  })

  it('returns empty array when no surveys exist', async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
    mockFrom.mockReturnValue({ select: mockSelect })

    const result = await getSurveys()
    expect(result).toEqual([])
  })

  it('throws error on query failure', async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'query failed' },
    })
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
    mockFrom.mockReturnValue({ select: mockSelect })

    await expect(getSurveys()).rejects.toThrow('Gagal memuat daftar survey')
  })
})

// ── createSurvey ──────────────────────────────────────────────────

describe('createSurvey', () => {
  beforeEach(() => vi.clearAllMocks())

  const input: CreateSurveyInput = {
    title: 'Survey Baru',
    target_audience: 'teachers',
    questions: [{ id: 'q1', type: 'rating', text: 'How satisfied?', required: true }],
    start_date: '2026-01-01',
    end_date: '2026-01-31',
  }

  it('inserts survey with status draft and returns created data', async () => {
    const createdSurvey = { id: 's1', ...input, status: 'draft' }

    const mockSingle = vi.fn().mockResolvedValue({ data: createdSurvey, error: null })
    const mockSelectAfterInsert = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectAfterInsert })
    mockFrom.mockReturnValue({ insert: mockInsert })

    const result = await createSurvey(input)

    expect(mockFrom).toHaveBeenCalledWith('satisfaction_surveys')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Survey Baru',
        target_audience: 'teachers',
        status: 'draft',
      })
    )
    expect(result).toEqual(createdSurvey)
  })

  it('throws error on insert failure', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'insert failed' },
    })
    const mockSelectAfterInsert = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectAfterInsert })
    mockFrom.mockReturnValue({ insert: mockInsert })

    await expect(createSurvey(input)).rejects.toThrow('Gagal membuat survey')
  })
})

// ── updateSurvey ──────────────────────────────────────────────────

describe('updateSurvey', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates survey by id and returns updated data', async () => {
    const updatedSurvey = { id: 's1', title: 'Updated Title' }

    const mockSingle = vi.fn().mockResolvedValue({ data: updatedSurvey, error: null })
    const mockSelectAfterUpdate = vi.fn().mockReturnValue({ single: mockSingle })
    const mockEq = vi.fn().mockReturnValue({ select: mockSelectAfterUpdate })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ update: mockUpdate })

    const result = await updateSurvey('s1', { title: 'Updated Title' })

    expect(mockFrom).toHaveBeenCalledWith('satisfaction_surveys')
    expect(mockUpdate).toHaveBeenCalledWith({ title: 'Updated Title' })
    expect(mockEq).toHaveBeenCalledWith('id', 's1')
    expect(result).toEqual(updatedSurvey)
  })

  it('throws error on update failure', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'update failed' },
    })
    const mockSelectAfterUpdate = vi.fn().mockReturnValue({ single: mockSingle })
    const mockEq = vi.fn().mockReturnValue({ select: mockSelectAfterUpdate })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ update: mockUpdate })

    await expect(updateSurvey('s1', { title: 'X' })).rejects.toThrow('Gagal memperbarui survey')
  })
})

// ── publishSurvey ─────────────────────────────────────────────────

describe('publishSurvey', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates survey status to active', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ update: mockUpdate })

    await publishSurvey('s1')

    expect(mockFrom).toHaveBeenCalledWith('satisfaction_surveys')
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'active' })
    expect(mockEq).toHaveBeenCalledWith('id', 's1')
  })

  it('throws error on publish failure', async () => {
    const mockEq = vi.fn().mockResolvedValue({
      error: { message: 'publish failed' },
    })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ update: mockUpdate })

    await expect(publishSurvey('s1')).rejects.toThrow('Gagal mempublikasikan survey')
  })
})

// ── closeSurvey ───────────────────────────────────────────────────

describe('closeSurvey', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates survey status to closed', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ update: mockUpdate })

    await closeSurvey('s1')

    expect(mockUpdate).toHaveBeenCalledWith({ status: 'closed' })
    expect(mockEq).toHaveBeenCalledWith('id', 's1')
  })

  it('throws error on close failure', async () => {
    const mockEq = vi.fn().mockResolvedValue({
      error: { message: 'close failed' },
    })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ update: mockUpdate })

    await expect(closeSurvey('s1')).rejects.toThrow('Gagal menutup survey')
  })
})

// ── deleteSurvey ──────────────────────────────────────────────────

describe('deleteSurvey', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes survey by id', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ delete: mockDelete })

    await deleteSurvey('s1')

    expect(mockFrom).toHaveBeenCalledWith('satisfaction_surveys')
    expect(mockEq).toHaveBeenCalledWith('id', 's1')
  })

  it('throws error on delete failure', async () => {
    const mockEq = vi.fn().mockResolvedValue({
      error: { message: 'delete failed' },
    })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ delete: mockDelete })

    await expect(deleteSurvey('s1')).rejects.toThrow('Gagal menghapus survey')
  })
})

// ── getSurveyResults ──────────────────────────────────────────────

describe('getSurveyResults', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches survey detail and aggregates responses', async () => {
    const survey = {
      id: 's1',
      title: 'Test Survey',
      questions: [
        { id: 'q1', type: 'rating', text: 'Rate us', required: true },
        { id: 'q2', type: 'yesno', text: 'Would recommend?', required: true },
        { id: 'q3', type: 'text', text: 'Comments', required: false },
      ],
    }

    const responses = [
      { answers: { q1: 4, q2: true, q3: 'Good' } },
      { answers: { q1: 5, q2: false, q3: 'OK' } },
      { answers: { q1: 3, q2: 'ya', q3: '' } },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'satisfaction_surveys') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: survey, error: null }),
            }),
          }),
        }
      }
      if (table === 'survey_responses') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: responses, error: null }),
          }),
        }
      }
      return {}
    })

    const result = await getSurveyResults('s1')

    expect(result.totalResponses).toBe(3)
    expect(result.survey.id).toBe('s1')
    expect(result.questionResults).toHaveLength(3)

    // Rating question: avg of [4, 5, 3] = 4
    const ratingResult = result.questionResults[0]
    expect(ratingResult.ratingAvg).toBe(4)
    expect(ratingResult.ratingDistribution).toBeDefined()
    expect(ratingResult.ratingDistribution![3]).toBe(1)
    expect(ratingResult.ratingDistribution![4]).toBe(1)
    expect(ratingResult.ratingDistribution![5]).toBe(1)

    // Yes/No question
    const yesnoResult = result.questionResults[1]
    expect(yesnoResult.yesCount).toBe(2) // true + 'ya'
    expect(yesnoResult.noCount).toBe(1) // false

    // Text question
    const textResult = result.questionResults[2]
    expect(textResult.textAnswers).toEqual(['Good', 'OK'])
  })

  it('throws error when survey not found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'not found' },
          }),
        }),
      }),
    })

    await expect(getSurveyResults('bad-id')).rejects.toThrow('Gagal memuat detail survey')
  })

  it('throws error when responses query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'satisfaction_surveys') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 's1', questions: [] },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'survey_responses') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'responses query failed' },
            }),
          }),
        }
      }
      return {}
    })

    await expect(getSurveyResults('s1')).rejects.toThrow('Gagal memuat respons survey')
  })
})

// ── submitSurveyResponse ──────────────────────────────────────────

describe('submitSurveyResponse', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inserts response with survey_id and answers', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert: mockInsert })

    const answers = { q1: 5, q2: true, q3: 'Nice' }
    await submitSurveyResponse('s1', answers)

    expect(mockFrom).toHaveBeenCalledWith('survey_responses')
    expect(mockInsert).toHaveBeenCalledWith({
      survey_id: 's1',
      answers,
    })
  })

  it('throws error on insert failure', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({
        error: { message: 'insert failed' },
      }),
    })

    await expect(submitSurveyResponse('s1', { q1: 5 })).rejects.toThrow(
      'Gagal mengirim respons survey'
    )
  })
})
