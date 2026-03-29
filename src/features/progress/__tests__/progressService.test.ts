import { beforeEach, describe, expect, it, vi } from 'vitest'

import { progressService } from '../api/progressService'

const mockRpc = vi.fn()

vi.mock('@/src/services/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

describe('progressService.getStudentProgressBundle', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls get_student_progress_bundle RPC', async () => {
    mockRpc.mockResolvedValue({
      data: {
        profile: { id: 'u1', full_name: 'Demo Student', avatar_url: null },
        total_xp: 100,
        completed_lessons_count: 5,
        quiz_attempts: [],
        achievements: [],
        course_progress: [],
      },
      error: null,
    })
    await progressService.getStudentProgressBundle('student-1', 'tenant-1')
    expect(mockRpc).toHaveBeenCalledWith('get_student_progress_bundle', {
      p_student_id: 'student-1',
    })
  })

  it('maps total_xp to totalXP', async () => {
    mockRpc.mockResolvedValue({
      data: {
        profile: null,
        total_xp: 350,
        completed_lessons_count: 0,
        quiz_attempts: [],
        achievements: [],
        course_progress: [],
      },
      error: null,
    })
    const result = await progressService.getStudentProgressBundle('student-1', 'tenant-1')
    expect(result.totalXP).toBe(350)
  })

  it('maps completed_lessons_count correctly', async () => {
    mockRpc.mockResolvedValue({
      data: {
        profile: null,
        total_xp: 0,
        completed_lessons_count: 12,
        quiz_attempts: [],
        achievements: [],
        course_progress: [],
      },
      error: null,
    })
    const result = await progressService.getStudentProgressBundle('student-1', 'tenant-1')
    expect(result.completedLessonsCount).toBe(12)
  })

  it('maps achievements with badge details', async () => {
    mockRpc.mockResolvedValue({
      data: {
        profile: null,
        total_xp: 0,
        completed_lessons_count: 0,
        quiz_attempts: [],
        achievements: [{ id: 'ach1', earned_at: '2026-01-01', name: 'First Quiz', icon: 'zap' }],
        course_progress: [],
      },
      error: null,
    })
    const result = await progressService.getStudentProgressBundle('student-1', 'tenant-1')
    expect(result.achievements[0].badges?.name).toBe('First Quiz')
    expect(result.achievements[0].badges?.icon).toBe('zap')
  })

  it('returns empty arrays for missing data', async () => {
    mockRpc.mockResolvedValue({
      data: {
        profile: null,
        total_xp: 0,
        completed_lessons_count: 0,
        quiz_attempts: null,
        achievements: null,
        course_progress: null,
      },
      error: null,
    })
    const result = await progressService.getStudentProgressBundle('student-1', 'tenant-1')
    expect(result.quizAttempts).toEqual([])
    expect(result.achievements).toEqual([])
    expect(result.courseProgress).toEqual([])
  })

  it('throws on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } })
    await expect(progressService.getStudentProgressBundle('student-1', 'tenant-1')).rejects.toMatchObject({
      message: 'RPC failed',
    })
  })
})
