import { describe, it, expect, vi, beforeEach } from 'vitest'
import { assignmentService } from '../api/assignmentService'

const mockSingle = vi.fn()
const _mockSelect = vi.fn().mockReturnThis()
const _mockInsert = vi.fn().mockReturnThis()
const _mockUpdate = vi.fn().mockReturnThis()
const _mockUpsert = vi.fn().mockReturnThis()
const _mockEq = vi.fn().mockReturnThis()
const mockFrom = vi.fn()

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

const baseAssignment = {
  tenant_id: 'tenant-1',
  course_id: 'course-1',
  lesson_id: 'lesson-1',
  title: 'Test Assignment',
  instructions: 'Do the thing',
  max_points: 100,
  max_attempts: 3,
  is_published: false,
  due_date: null,
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
  const baseSubmission = {
    tenant_id: 'tenant-1',
    assignment_id: 'a1',
    student_id: 'student-1',
    submission_text: 'My answer',
    file_url: null,
    attempt_number: 1,
  }

  beforeEach(() => vi.clearAllMocks())

  it('upserts into assignment_submissions', async () => {
    const fromSpy = vi.fn().mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: 's1', status: 'submitted' }, error: null }),
        }),
      }),
    })
    mockFrom.mockImplementation(fromSpy)
    await assignmentService.submitAssignment(baseSubmission)
    expect(fromSpy).toHaveBeenCalledWith('assignment_submissions')
  })

  it('sets status to submitted', async () => {
    let capturedData: unknown
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockImplementation((data) => {
        capturedData = data
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 's1', ...data }, error: null }),
          }),
        }
      }),
    })
    await assignmentService.submitAssignment(baseSubmission)
    expect((capturedData as any).status).toBe('submitted')
  })
})
