import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import {
  getBaselineMetrics,
  getExecutiveOverview,
  getMonthlyTrend,
  getPrincipalSettings,
  getROIMetrics,
  saveBaselineMetrics,
  updatePrincipalSettings,
} from '../api/executiveApi'

// ── getExecutiveOverview ──────────────────────────────────────────

describe('getExecutiveOverview', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls get_executive_overview RPC with tenant ID', async () => {
    const mockData = {
      total_students: 100,
      active_students: 80,
      total_teachers: 10,
      active_teachers: 8,
      total_courses: 5,
      avg_quiz_score: 75,
      adoption_rate: 80,
    }
    mockRpc.mockResolvedValue({ data: mockData, error: null })

    const result = await getExecutiveOverview('tenant-1')

    expect(mockRpc).toHaveBeenCalledWith('get_executive_overview', {
      p_tenant_id: 'tenant-1',
    })
    expect(result).toEqual({
      total_students: 100,
      active_students: 80,
      total_teachers: 10,
      active_teachers: 8,
      total_courses: 5,
      avg_quiz_score: 75,
      adoption_rate: 80,
    })
  })

  it('handles array response from RPC (first row)', async () => {
    const mockRow = {
      total_students: 50,
      active_students: 30,
      total_teachers: 5,
      active_teachers: 4,
      total_courses: 3,
      avg_quiz_score: 60,
      adoption_rate: 55,
    }
    mockRpc.mockResolvedValue({ data: [mockRow], error: null })

    const result = await getExecutiveOverview('tenant-1')
    expect(result.total_students).toBe(50)
    expect(result.active_students).toBe(30)
  })

  it('returns safe defaults when RPC returns no data', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    const result = await getExecutiveOverview('tenant-1')
    expect(result).toEqual({
      total_students: 0,
      active_students: 0,
      total_teachers: 0,
      active_teachers: 0,
      total_courses: 0,
      avg_quiz_score: 0,
      adoption_rate: 0,
    })
  })

  it('returns safe defaults when RPC returns empty array', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const result = await getExecutiveOverview('tenant-1')
    expect(result.total_students).toBe(0)
  })

  it('throws error when RPC fails', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'DB error', code: '500' },
    })

    await expect(getExecutiveOverview('tenant-1')).rejects.toThrow(
      'Gagal memuat ringkasan eksekutif'
    )
  })
})

// ── getMonthlyTrend ───────────────────────────────────────────────

describe('getMonthlyTrend', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls get_principal_monthly_trend_cached RPC with correct params', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    await getMonthlyTrend('tenant-1', 6)

    expect(mockRpc).toHaveBeenCalledWith('get_principal_monthly_trend_cached', {
      p_tenant_id: 'tenant-1',
      p_months: 6,
    })
  })

  it('returns data from RPC', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { month_label: '2026-01', active_students: 50, lesson_completions: 100, quiz_attempts: 25 },
      ],
      error: null,
    })

    const result = await getMonthlyTrend('tenant-1', 3)
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveProperty('month', '2026-01')
  })

  it('returns empty array when RPC returns empty data', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const result = await getMonthlyTrend('tenant-1', 3)
    expect(result).toEqual([])
  })

  it('returns empty array on RPC error (graceful degradation)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'RPC error', code: '500' },
    })

    const result = await getMonthlyTrend('tenant-1', 6)
    expect(result).toEqual([])
  })

  it('defaults to 6 months when months parameter is omitted', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const result = await getMonthlyTrend('tenant-1')
    expect(result).toEqual([])
    expect(mockRpc).toHaveBeenCalledWith('get_principal_monthly_trend_cached', {
      p_tenant_id: 'tenant-1',
      p_months: 6,
    })
  })
})

// ── getPrincipalSettings ──────────────────────────────────────────

describe('getPrincipalSettings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries principal_settings with tenant_id', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { tenant_id: 'tenant-1', school_name: 'SMA Nusantara' },
            error: null,
          }),
        }),
      }),
    })

    const result = await getPrincipalSettings('tenant-1')
    expect(mockFrom).toHaveBeenCalledWith('principal_settings')
    expect(result).toEqual({ tenant_id: 'tenant-1', school_name: 'SMA Nusantara' })
  })

  it('returns null when no settings exist', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    const result = await getPrincipalSettings('tenant-1')
    expect(result).toBeNull()
  })

  it('returns null on error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'error' },
          }),
        }),
      }),
    })

    const result = await getPrincipalSettings('tenant-1')
    expect(result).toBeNull()
  })
})

// ── updatePrincipalSettings ───────────────────────────────────────

describe('updatePrincipalSettings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('upserts settings with tenant_id and updated_at', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({
      upsert: mockUpsert,
    })

    await updatePrincipalSettings('tenant-1', { school_name: 'SMA Baru' })

    expect(mockFrom).toHaveBeenCalledWith('principal_settings')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        school_name: 'SMA Baru',
        tenant_id: 'tenant-1',
        updated_at: expect.any(String),
      }),
      { onConflict: 'tenant_id' }
    )
  })

  it('throws error when upsert fails', async () => {
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({
        error: { message: 'upsert failed' },
      }),
    })

    await expect(updatePrincipalSettings('tenant-1', { school_name: 'SMA Baru' })).rejects.toThrow(
      'Gagal menyimpan pengaturan'
    )
  })
})

// ── getROIMetrics ─────────────────────────────────────────────────

describe('getROIMetrics', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calculates ROI metrics from activity counts', async () => {
    // First call: get_tenant_activity_counts
    mockRpc.mockResolvedValueOnce({
      data: [
        { event_type: 'LESSON_COMPLETED', count: 100 },
        { event_type: 'QUIZ_SUBMITTED', count: 50 },
        { event_type: 'ASSIGNMENT_GRADED', count: 30 },
      ],
      error: null,
    })
    // Second call: get_executive_overview (for adoption_rate)
    mockRpc.mockResolvedValueOnce({
      data: { adoption_rate: 75 },
      error: null,
    })

    const result = await getROIMetrics('tenant-1')

    // paper_saved_sheets = quiz(50)*2 + lesson(100)*1 = 200
    expect(result.paper_saved_sheets).toBe(200)
    // paper_saved_cost = 200 * 500 = 100000
    expect(result.paper_saved_cost).toBe(100_000)
    // teacher_time_saved_hours = (30 * 10) / 60 = 5.0
    expect(result.teacher_time_saved_hours).toBe(5)
    // adoption score from overview
    expect(result.digital_adoption_score).toBe(75)
  })

  it('returns zero defaults on RPC error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'RPC error' },
    })

    const result = await getROIMetrics('tenant-1')
    expect(result).toEqual({
      paper_saved_sheets: 0,
      paper_saved_cost: 0,
      teacher_time_saved_hours: 0,
      digital_adoption_score: 0,
    })
  })

  it('handles missing event types gracefully', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ event_type: 'LESSON_COMPLETED', count: 20 }],
      error: null,
    })
    mockRpc.mockResolvedValueOnce({
      data: { adoption_rate: 50 },
      error: null,
    })

    const result = await getROIMetrics('tenant-1')
    // paper_saved_sheets = quiz(0)*2 + lesson(20)*1 = 20
    expect(result.paper_saved_sheets).toBe(20)
    expect(result.paper_saved_cost).toBe(10_000)
    expect(result.teacher_time_saved_hours).toBe(0)
  })

  it('sets adoption_score to 0 when overview fetch fails', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        { event_type: 'LESSON_COMPLETED', count: 10 },
        { event_type: 'QUIZ_SUBMITTED', count: 5 },
      ],
      error: null,
    })
    // Overview RPC fails
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'overview failed' },
    })

    const result = await getROIMetrics('tenant-1')
    expect(result.digital_adoption_score).toBe(0)
    // Other values should still be calculated
    expect(result.paper_saved_sheets).toBe(20)
  })
})

// ── getBaselineMetrics ────────────────────────────────────────────

describe('getBaselineMetrics', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries school_baseline_metrics with tenant_id', async () => {
    const mockData = {
      tenant_id: 'tenant-1',
      baseline_date: '2025-01-01',
      avg_grade_before: 65,
      attendance_rate_before: 80,
      paper_cost_monthly_rp: 500000,
      teacher_grading_hours_weekly: 10,
    }

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
    })

    const result = await getBaselineMetrics('tenant-1')
    expect(mockFrom).toHaveBeenCalledWith('school_baseline_metrics')
    expect(result).toEqual(mockData)
  })

  it('returns null when no baseline exists', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    const result = await getBaselineMetrics('tenant-1')
    expect(result).toBeNull()
  })

  it('returns null on error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'error' },
          }),
        }),
      }),
    })

    const result = await getBaselineMetrics('tenant-1')
    expect(result).toBeNull()
  })
})

// ── saveBaselineMetrics ───────────────────────────────────────────

describe('saveBaselineMetrics', () => {
  beforeEach(() => vi.clearAllMocks())

  it('upserts baseline metrics with tenant_id', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({
      upsert: mockUpsert,
    })

    const baselineData = {
      baseline_date: '2025-01-01',
      avg_grade_before: 65,
      attendance_rate_before: 80,
      paper_cost_monthly_rp: 500000,
      teacher_grading_hours_weekly: 10,
    }

    await saveBaselineMetrics('tenant-1', baselineData)

    expect(mockFrom).toHaveBeenCalledWith('school_baseline_metrics')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        ...baselineData,
        tenant_id: 'tenant-1',
        updated_at: expect.any(String),
      }),
      { onConflict: 'tenant_id' }
    )
  })

  it('throws error when upsert fails', async () => {
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({
        error: { message: 'upsert failed' },
      }),
    })

    await expect(
      saveBaselineMetrics('tenant-1', {
        baseline_date: '2025-01-01',
        avg_grade_before: 65,
        attendance_rate_before: 80,
        paper_cost_monthly_rp: 500000,
        teacher_grading_hours_weekly: 10,
      })
    ).rejects.toThrow('Gagal menyimpan data baseline')
  })
})
