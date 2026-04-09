import { beforeEach, describe, expect, it, vi } from 'vitest'

import { assignmentService } from '../api/assignmentService'

const mockFrom = vi.fn()
const mockRpc = vi.fn()
const mockInvoke = vi.fn()
const mockUpload = vi.fn()
const mockCreateSignedUrl = vi.fn()

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
    storage: {
      from: vi.fn(() => ({
        upload: (...args: unknown[]) => mockUpload(...args),
        createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args),
      })),
    },
  },
}))

const baseAssignment = {
  tenant_id: 'tenant-1',
  course_id: 'course-1',
  class_id: 'class-1',
  lesson_id: null,
  title: 'Test Assignment',
  description: 'Do the thing',
  instructions: 'Do the thing',
  max_points: 100,
  max_attempts: 2,
  status: 'draft' as const,
  is_published: false,
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
  })

  it('inserts into assignments table', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'a1',
        ...baseAssignment,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
      error: null,
    })

    const fromSpy = vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single,
        }),
      }),
    })

    mockFrom.mockImplementation(fromSpy)

    await assignmentService.createAssignment(baseAssignment)

    expect(fromSpy).toHaveBeenCalledWith('assignments')
  })

  it('returns the created assignment', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'a1',
              ...baseAssignment,
              created_at: '2026-01-01',
              updated_at: '2026-01-01',
            },
            error: null,
          }),
        }),
      }),
    })

    const result = await assignmentService.createAssignment(baseAssignment)

    expect(result.id).toBe('a1')
    expect(result.status).toBe('draft')
  })

  it('throws on error', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'DB error' },
          }),
        }),
      }),
    })

    await expect(assignmentService.createAssignment(baseAssignment)).rejects.toMatchObject({
      message: 'DB error',
    })
  })
})

describe('assignmentService.submitAssignmentAttempt', () => {
  const assignmentId = 'a1'
  const studentId = 'student-1'
  const tenantId = 'tenant-1'

  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockResolvedValue({
      data: { allowed: true, retryAfterMs: 0 },
      error: null,
    })
  })

  it('calls rate-limit edge function before submit RPC', async () => {
    mockRpc.mockResolvedValue({
      data: {
        id: 'submission-1',
        assignment_id: assignmentId,
        student_id: studentId,
        tenant_id: tenantId,
        status: 'SUBMITTED',
        attempt_number: 1,
      },
      error: null,
    })

    await assignmentService.submitAssignmentAttempt(assignmentId, studentId, tenantId, {
      text: 'My answer',
      linkUrl: 'https://example.com',
      clientRequestId: 'request-1',
    })

    expect(mockInvoke).toHaveBeenCalledWith('check-rate-limit', {
      body: {
        action: 'assignment-submit',
        key: studentId,
        maxAttempts: 10,
        windowMs: 60000,
      },
    })
  })

  it('calls submit_assignment_attempt RPC with p_ parameters', async () => {
    mockRpc.mockResolvedValue({
      data: {
        id: 'submission-1',
        assignment_id: assignmentId,
        student_id: studentId,
        tenant_id: tenantId,
        status: 'SUBMITTED',
        attempt_number: 1,
      },
      error: null,
    })

    await assignmentService.submitAssignmentAttempt(assignmentId, studentId, tenantId, {
      text: 'My answer',
      fileUrl: 'path/to/file.pdf',
      linkUrl: 'https://example.com',
      clientRequestId: 'request-1',
    })

    expect(mockRpc).toHaveBeenCalledWith('submit_assignment_attempt', {
      p_assignment_id: assignmentId,
      p_submission_text: 'My answer',
      p_file_url: 'path/to/file.pdf',
      p_link_url: 'https://example.com',
      p_client_request_id: 'request-1',
    })
  })

  it('returns mapped submission data', async () => {
    mockRpc.mockResolvedValue({
      data: {
        id: 'submission-1',
        assignment_id: assignmentId,
        student_id: studentId,
        tenant_id: tenantId,
        status: 'LATE',
        attempt_number: 2,
        raw_score: null,
        score: null,
        feedback: null,
        is_late: true,
        late_penalty_percent: 10,
      },
      error: null,
    })

    const result = await assignmentService.submitAssignmentAttempt(
      assignmentId,
      studentId,
      tenantId,
      {
        text: 'My answer',
      }
    )

    expect(result.id).toBe('submission-1')
    expect(result.status).toBe('late')
    expect(result.attempt_number).toBe(2)
    expect(result.is_late).toBe(true)
  })
})

describe('assignmentService.gradeSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('stores raw score and effective score after late penalty', async () => {
    const selectSingle = vi.fn().mockResolvedValue({
      data: { late_penalty_percent: 10 },
      error: null,
    })
    const updateSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'submission-1',
        assignment_id: 'assignment-1',
        student_id: 'student-1',
        tenant_id: 'tenant-1',
        status: 'GRADED',
        attempt_number: 1,
        raw_score: 80,
        score: 72,
        feedback: 'Reviewed',
        is_late: true,
        late_penalty_percent: 10,
      },
      error: null,
    })

    const eqAfterSelect = vi
      .fn()
      .mockReturnValue({ eq: vi.fn().mockReturnValue({ single: selectSingle }) })
    const eqAfterUpdate = vi
      .fn()
      .mockReturnValue({
        eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: updateSingle }) }),
      })

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: eqAfterSelect }),
      update: vi.fn().mockReturnValue({ eq: eqAfterUpdate }),
    })

    const result = await assignmentService.gradeSubmission(
      'submission-1',
      'tenant-1',
      80,
      'Reviewed'
    )

    expect(result.raw_score).toBe(80)
    expect(result.score).toBe(72)
    expect(result.status).toBe('graded')
  })
})
