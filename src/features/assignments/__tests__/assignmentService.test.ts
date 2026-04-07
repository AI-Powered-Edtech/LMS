import { beforeEach, describe, expect, it, vi } from 'vitest'

import { assignmentService } from '../api/assignmentService'

const mockSingle = vi.fn()
const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

const baseAssignment = {
  tenant_id: 'tenant-1',
  course_id: 'course-1',
  class_id: 'class-1',
  title: 'Test Assignment',
  description: 'Do the thing',
  max_points: 100,
  rubric: {},
  status: 'draft' as const,
  late_penalty_percent: 10,
  due_date: null,
  available_from: null,
  allow_text_submission: true,
  allow_file_submission: true,
  allow_link_submission: false,
  reminder_enabled: false,
  created_by: 'teacher-1',
}

describe('assignmentService.createAssignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      }),
    })
  })

  it('inserts into assignments table', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'a1', ...baseAssignment }, error: null })
    const fromSpy = vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'a1' }, error: null }),
        }),
      }),
    })
    mockFrom.mockImplementation(fromSpy)
    await assignmentService.createAssignment(baseAssignment)
    expect(fromSpy).toHaveBeenCalledWith('assignments')
  })

  it('returns the created assignment', async () => {
    const created = {
      id: 'a1',
      ...baseAssignment,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    }
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: created, error: null }),
        }),
      }),
    })
    const result = await assignmentService.createAssignment(baseAssignment)
    expect(result.id).toBe('a1')
  })

  it('throws on error', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      }),
    })
    await expect(assignmentService.createAssignment(baseAssignment)).rejects.toMatchObject({
      message: 'DB error',
    })
  })
})

describe('assignmentService.submitAssignment', () => {
  const assignmentId = 'a1'
  const studentId = 'student-1'
  const tenantId = 'tenant-1'
  const submissionContent = { type: 'text', content: 'My answer' }

  beforeEach(() => vi.clearAllMocks())

  it('calls submit_assignment_attempt RPC', async () => {
    mockRpc.mockResolvedValue({
      data: { id: 's1' },
      error: null,
    })
    await assignmentService.submitAssignment(assignmentId, studentId, tenantId, submissionContent)
    expect(mockRpc).toHaveBeenCalledWith('submit_assignment_attempt', {
      assignment_id: assignmentId,
      student_id: studentId,
      tenant_id: tenantId,
      submission_content: submissionContent,
    })
  })

  it('returns the submission data', async () => {
    const submissionData = { id: 's1', submitted_at: '2026-01-01' }
    mockRpc.mockResolvedValue({ data: submissionData, error: null })
    const result = await assignmentService.submitAssignment(
      assignmentId,
      studentId,
      tenantId,
      submissionContent
    )
    expect(result).toEqual(submissionData)
  })
})
