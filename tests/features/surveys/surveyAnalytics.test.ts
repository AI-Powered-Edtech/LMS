// EduSync LMS — Survey Analytics Tests

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { surveyAnalyticsService } from '@/features/surveys/api/surveyAnalytics'
import { exportSurveyToCSV } from '@/features/surveys/utils/surveyExport'

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

const mockRpcData = [
  {
    survey_id: 'survey-1',
    survey_title: 'Test Survey',
    target_audience: 'students',
    status: 'active',
    total_responses: '10',
    response_rate: null,
    question_id: 'q1',
    question_text: 'How satisfied are you?',
    question_type: 'rating',
    rating_avg: '4.2',
    rating_distribution: { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4 },
    yes_count: null,
    no_count: null,
    text_answers: null,
    created_at: '2026-04-07T00:00:00Z',
  },
  {
    survey_id: 'survey-1',
    survey_title: 'Test Survey',
    target_audience: 'students',
    status: 'active',
    total_responses: '10',
    response_rate: null,
    question_id: 'q2',
    question_text: 'Would you recommend this?',
    question_type: 'yesno',
    rating_avg: null,
    rating_distribution: null,
    yes_count: '8',
    no_count: '2',
    text_answers: null,
    created_at: '2026-04-07T00:00:00Z',
  },
  {
    survey_id: 'survey-1',
    survey_title: 'Test Survey',
    target_audience: 'students',
    status: 'active',
    total_responses: '10',
    response_rate: null,
    question_id: 'q3',
    question_text: 'Any suggestions?',
    question_type: 'text',
    rating_avg: null,
    rating_distribution: null,
    yes_count: null,
    no_count: null,
    text_answers: ['Great course!', 'More content please', 'Excellent'],
    created_at: '2026-04-07T00:00:00Z',
  },
]

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: mockRpcData, error: null }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
  },
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Survey Analytics Service', () => {
  describe('getSurveyResults', () => {
    it('returns aggregated survey data', async () => {
      const result = await surveyAnalyticsService.getSurveyResults('survey-1')

      expect(result.surveyId).toBe('survey-1')
      expect(result.surveyTitle).toBe('Test Survey')
      expect(result.totalResponses).toBe(10)
      expect(result.questions).toHaveLength(3)
    })

    it('parses rating question correctly', async () => {
      const result = await surveyAnalyticsService.getSurveyResults('survey-1')
      const ratingQ = result.questions.find((q) => q.questionType === 'rating')

      expect(ratingQ).toBeDefined()
      expect(ratingQ?.ratingAvg).toBe(4.2)
      expect(ratingQ?.ratingDistribution).toEqual({ '1': 0, '2': 1, '3': 2, '4': 3, '5': 4 })
    })

    it('parses yes/no question correctly', async () => {
      const result = await surveyAnalyticsService.getSurveyResults('survey-1')
      const yesnoQ = result.questions.find((q) => q.questionType === 'yesno')

      expect(yesnoQ).toBeDefined()
      expect(yesnoQ?.yesCount).toBe(8)
      expect(yesnoQ?.noCount).toBe(2)
    })

    it('parses text question correctly', async () => {
      const result = await surveyAnalyticsService.getSurveyResults('survey-1')
      const textQ = result.questions.find((q) => q.questionType === 'text')

      expect(textQ).toBeDefined()
      expect(textQ?.textAnswers).toEqual(['Great course!', 'More content please', 'Excellent'])
    })

    it('returns empty result when no data', async () => {
      vi.mocked(await import('@/services/supabase/client')).supabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const result = await surveyAnalyticsService.getSurveyResults('empty-survey')
      expect(result.questions).toHaveLength(0)
      expect(result.totalResponses).toBe(0)
    })
  })
})

describe('Survey Export', () => {
  it('exportSurveyToCSV does not throw with valid data', () => {
    const mockData = {
      surveyId: 'survey-1',
      surveyTitle: 'Test Survey',
      targetAudience: 'students',
      status: 'active',
      totalResponses: 10,
      responseRate: null,
      questions: [
        {
          questionId: 'q1',
          questionText: 'How satisfied?',
          questionType: 'rating' as const,
          ratingAvg: 4.2,
          ratingDistribution: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 },
        },
      ],
      createdAt: '2026-04-07T00:00:00Z',
    }

    // Mock document.createElement and click
    const mockClick = vi.fn()
    const mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: mockClick,
    } as any)

    expect(() => exportSurveyToCSV(mockData)).not.toThrow()

    mockCreateElement.mockRestore()
  })
})
