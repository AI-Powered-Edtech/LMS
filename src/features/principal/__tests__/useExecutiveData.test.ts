import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mock dependencies ─────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({ tenantId: 'tenant-1' }),
}))

const mockGetExecutiveOverview = vi.fn()
const mockGetMonthlyTrend = vi.fn()
const mockGetROIMetrics = vi.fn()
const mockGetPrincipalSettings = vi.fn()
const mockGetBaselineMetrics = vi.fn()
const mockSaveBaselineMetrics = vi.fn()

vi.mock('../api/executiveApi', () => ({
  getExecutiveOverview: (...args: unknown[]) => mockGetExecutiveOverview(...args),
  getExecutiveOverviewCached: (...args: unknown[]) => mockGetExecutiveOverview(...args),
  getMonthlyTrend: (...args: unknown[]) => mockGetMonthlyTrend(...args),
  getROIMetrics: (...args: unknown[]) => mockGetROIMetrics(...args),
  getPrincipalSettings: (...args: unknown[]) => mockGetPrincipalSettings(...args),
  getBaselineMetrics: (...args: unknown[]) => mockGetBaselineMetrics(...args),
  saveBaselineMetrics: (...args: unknown[]) => mockSaveBaselineMetrics(...args),
}))

const mockGetSurveys = vi.fn()
const mockGetSurveyResults = vi.fn()

vi.mock('../api/surveyApi', () => ({
  getSurveys: (...args: unknown[]) => mockGetSurveys(...args),
  getSurveyResults: (...args: unknown[]) => mockGetSurveyResults(...args),
  createSurvey: vi.fn(),
  updateSurvey: vi.fn(),
  publishSurvey: vi.fn(),
  closeSurvey: vi.fn(),
  deleteSurvey: vi.fn(),
}))

import {
  useBaselineMetrics,
  useExecutiveData,
  useExecutiveOverview,
  useMonthlyTrend,
  useROIMetrics,
  useSurveyResults,
  useSurveys,
} from '../hooks/useExecutiveData'

// ── Helper: create wrapper with QueryClient ───────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

// ── useExecutiveOverview ──────────────────────────────────────────

describe('useExecutiveOverview', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches executive overview data', async () => {
    const overview = {
      total_students: 100,
      active_students: 80,
      total_teachers: 10,
      active_teachers: 8,
      total_courses: 5,
      avg_quiz_score: 75,
      adoption_rate: 80,
    }
    mockGetExecutiveOverview.mockResolvedValue(overview)

    const { result } = renderHook(() => useExecutiveOverview(), {
      wrapper: createWrapper(),
    })

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(overview)
    expect(mockGetExecutiveOverview).toHaveBeenCalledWith('tenant-1')
  })

  it('handles error state', async () => {
    mockGetExecutiveOverview.mockRejectedValue(new Error('Failed'))

    const { result } = renderHook(() => useExecutiveOverview(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeDefined()
  })
})

// ── useMonthlyTrend ───────────────────────────────────────────────

describe('useMonthlyTrend', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches monthly trend data with default 6 months', async () => {
    const trend = [{ month: 'Jan', active_students: 10, lesson_completions: 50, quiz_attempts: 20 }]
    mockGetMonthlyTrend.mockResolvedValue(trend)

    const { result } = renderHook(() => useMonthlyTrend(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(trend)
    expect(mockGetMonthlyTrend).toHaveBeenCalledWith('tenant-1', 6)
  })

  it('accepts custom months parameter', async () => {
    mockGetMonthlyTrend.mockResolvedValue([])

    const { result } = renderHook(() => useMonthlyTrend(12), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockGetMonthlyTrend).toHaveBeenCalledWith('tenant-1', 12)
  })
})

// ── useROIMetrics ─────────────────────────────────────────────────

describe('useROIMetrics', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches ROI metrics', async () => {
    const roi = {
      paper_saved_sheets: 200,
      paper_saved_cost: 100000,
      teacher_time_saved_hours: 5,
      digital_adoption_score: 75,
    }
    mockGetROIMetrics.mockResolvedValue(roi)

    const { result } = renderHook(() => useROIMetrics(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(roi)
    expect(mockGetROIMetrics).toHaveBeenCalledWith('tenant-1')
  })
})

// ── useBaselineMetrics ────────────────────────────────────────────

describe('useBaselineMetrics', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches baseline metrics and exposes saveBaseline', async () => {
    const baseline = {
      tenant_id: 'tenant-1',
      baseline_date: '2025-01-01',
      avg_grade_before: 65,
      attendance_rate_before: 80,
      paper_cost_monthly_rp: 500000,
      teacher_grading_hours_weekly: 10,
    }
    mockGetBaselineMetrics.mockResolvedValue(baseline)

    const { result } = renderHook(() => useBaselineMetrics(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(baseline)
    expect(result.current.saveBaseline).toBeDefined()
    expect(result.current.isSaving).toBe(false)
  })

  it('returns null when no baseline exists', async () => {
    mockGetBaselineMetrics.mockResolvedValue(null)

    const { result } = renderHook(() => useBaselineMetrics(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })
})

// ── useSurveys ────────────────────────────────────────────────────

describe('useSurveys', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches survey list and exposes mutation helpers', async () => {
    const surveys = [
      { id: 's1', title: 'Survey 1', status: 'active' },
      { id: 's2', title: 'Survey 2', status: 'draft' },
    ]
    mockGetSurveys.mockResolvedValue(surveys)

    const { result } = renderHook(() => useSurveys(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.surveys).toEqual(surveys)
    expect(result.current.createSurvey).toBeDefined()
    expect(result.current.updateSurvey).toBeDefined()
    expect(result.current.publishSurvey).toBeDefined()
    expect(result.current.closeSurvey).toBeDefined()
    expect(result.current.deleteSurvey).toBeDefined()
  })

  it('returns empty array when no surveys', async () => {
    mockGetSurveys.mockResolvedValue([])

    const { result } = renderHook(() => useSurveys(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.surveys).toEqual([])
  })

  it('exposes error state', async () => {
    mockGetSurveys.mockRejectedValue(new Error('Failed'))

    const { result } = renderHook(() => useSurveys(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.error).toBeDefined())
  })
})

// ── useSurveyResults ──────────────────────────────────────────────

describe('useSurveyResults', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches survey results when surveyId is provided', async () => {
    const results = {
      survey: { id: 's1', title: 'Test' },
      totalResponses: 10,
      questionResults: [],
    }
    mockGetSurveyResults.mockResolvedValue(results)

    const { result } = renderHook(() => useSurveyResults('s1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(results)
  })

  it('does not fetch when surveyId is null', async () => {
    const { result } = renderHook(() => useSurveyResults(null), {
      wrapper: createWrapper(),
    })

    // Should remain in idle/disabled state, not loading
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(mockGetSurveyResults).not.toHaveBeenCalled()
  })
})

// ── useExecutiveData (combined) ───────────────────────────────────

describe('useExecutiveData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('combines overview, trend, ROI, and settings queries', async () => {
    const overview = {
      total_students: 100,
      active_students: 80,
      total_teachers: 10,
      active_teachers: 8,
      total_courses: 5,
      avg_quiz_score: 75,
      adoption_rate: 80,
    }
    const trend = [{ month: 'Jan', active_students: 10, lesson_completions: 50, quiz_attempts: 20 }]
    const roi = {
      paper_saved_sheets: 200,
      paper_saved_cost: 100000,
      teacher_time_saved_hours: 5,
      digital_adoption_score: 75,
    }
    const settings = { tenant_id: 'tenant-1', school_name: 'SMA Test' }

    mockGetExecutiveOverview.mockResolvedValue(overview)
    mockGetMonthlyTrend.mockResolvedValue(trend)
    mockGetROIMetrics.mockResolvedValue(roi)
    mockGetPrincipalSettings.mockResolvedValue(settings)

    const { result } = renderHook(() => useExecutiveData(), {
      wrapper: createWrapper(),
    })

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.overview).toEqual(overview)
    expect(result.current.monthlyTrend).toEqual(trend)
    expect(result.current.roiMetrics).toEqual(roi)
    expect(result.current.settings).toEqual(settings)
    expect(result.current.error).toBeNull()
    expect(result.current.refetchAll).toBeDefined()
  })

  it('returns empty monthlyTrend array when no data', async () => {
    mockGetExecutiveOverview.mockResolvedValue(undefined)
    mockGetMonthlyTrend.mockResolvedValue(undefined)
    mockGetROIMetrics.mockResolvedValue(undefined)
    mockGetPrincipalSettings.mockResolvedValue(null)

    const { result } = renderHook(() => useExecutiveData(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.monthlyTrend).toEqual([])
  })

  it('exposes error from any sub-query', async () => {
    mockGetExecutiveOverview.mockRejectedValue(new Error('overview error'))
    mockGetMonthlyTrend.mockResolvedValue([])
    mockGetROIMetrics.mockResolvedValue(undefined)
    mockGetPrincipalSettings.mockResolvedValue(null)

    const { result } = renderHook(() => useExecutiveData(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBeDefined()
  })
})
