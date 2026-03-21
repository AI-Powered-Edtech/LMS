import { describe, it, expect, vi, beforeEach } from 'vitest'
import { gradebookService } from '@/src/features/assignments/api/gradebookService'
import { supabase } from '../../lib/supabase'

// Mock the Supabase client
vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  }
})

/**
 * Build a fully chainable Supabase query mock.
 * Every method returns `this` so any chain order works,
 * and `then` makes the object awaitable with the given result.
 */
function makeChain(resolveWith: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = [
    'select',
    'eq',
    'order',
    'limit',
    'update',
    'insert',
    'delete',
    'in',
    'single',
    'maybeSingle',
    'is',
    'ilike',
    'match',
    'range',
  ]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(resolveWith).then(resolve, reject)
  return chain
}

describe('Gradebook Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch and correctly aggregate gradebook data (Happy Path)', async () => {
    const mockAssignments = [
      {
        id: 'a1',
        title: 'Homework 1',
        due_date: '2023-10-01T00:00:00.000Z',
        created_at: '2023-09-01T00:00:00.000Z',
        tenant_id: 'tenant-123',
      },
    ]
    const mockSubmissions = [
      {
        id: 's1',
        assignment_id: 'a1',
        student_id: 'stu1',
        status: 'graded',
        score: 95,
        feedback: 'Great job!',
      },
    ]
    const mockProfiles = [
      {
        id: 'stu1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@school.com',
        tenant_id: 'tenant-123',
      },
    ]
    const mockQuizAttempts = [
      {
        id: 'qa1',
        quiz_id: 'q1',
        student_id: 'stu1',
        score: 88,
        status: 'GRADED',
        tenant_id: 'tenant-123',
      },
    ]

    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      switch (table) {
        case 'assignments':
          return makeChain({ data: mockAssignments, error: null })
        case 'assignment_submissions':
          return makeChain({ data: mockSubmissions, error: null })
        case 'profiles':
          return makeChain({ data: mockProfiles, error: null })
        case 'quiz_attempts_v2':
          return makeChain({ data: mockQuizAttempts, error: null })
        default:
          return makeChain({ data: [], error: null })
      }
    })

    const result = await gradebookService.fetchGradebook('tenant-123')

    expect(supabase.from).toHaveBeenCalledWith('assignments')
    expect(supabase.from).toHaveBeenCalledWith('assignment_submissions')
    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(supabase.from).toHaveBeenCalledWith('quiz_attempts_v2')

    expect(result.assignments).toHaveLength(1)
    expect(result.assignments[0].id).toBe('a1')

    expect(result.students).toHaveLength(1)
    expect(result.students[0].id).toBe('stu1')
    expect(result.students[0].name).toBe('John Doe')

    expect(result.grades['stu1']).toBeDefined()
    expect(result.grades['stu1']['a1']).toEqual({
      score: 95,
      status: 'graded',
      feedback: 'Great job!',
      source: 'assignment',
    })
    expect(result.grades['stu1']['q1']).toEqual({
      score: 88,
      status: 'graded',
      feedback: undefined,
      source: 'quiz',
    })
  })

  it('should handle missing submissions correctly', async () => {
    const mockAssignments = [
      {
        id: 'a1',
        title: 'Homework 1',
        due_date: '2023-10-01T00:00:00.000Z',
        created_at: '2023-09-01T00:00:00.000Z',
        tenant_id: 'tenant-123',
      },
    ]
    const mockProfiles = [
      {
        id: 'stu1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@school.com',
        tenant_id: 'tenant-123',
      },
    ]

    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      switch (table) {
        case 'assignments':
          return makeChain({ data: mockAssignments, error: null })
        case 'assignment_submissions':
          return makeChain({ data: [], error: null })
        case 'profiles':
          return makeChain({ data: mockProfiles, error: null })
        case 'quiz_attempts_v2':
          return makeChain({ data: [], error: null })
        default:
          return makeChain({ data: [], error: null })
      }
    })

    const result = await gradebookService.fetchGradebook('tenant-123')

    expect(result.students).toHaveLength(1)
    expect(result.students[0].id).toBe('stu1')
    expect(result.grades['stu1']).toBeUndefined()
  })

  it('should correctly merge quiz attempts', async () => {
    const mockProfiles = [
      {
        id: 'stu1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@school.com',
        tenant_id: 'tenant-123',
      },
    ]
    const mockQuizAttempts = [
      {
        id: 'qa1',
        quiz_id: 'q1',
        student_id: 'stu1',
        score: 85,
        status: 'GRADED',
        tenant_id: 'tenant-123',
      },
      {
        id: 'qa2',
        quiz_id: 'q1',
        student_id: 'stu1',
        score: 95,
        status: 'GRADED',
        tenant_id: 'tenant-123',
      },
    ]

    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      switch (table) {
        case 'assignments':
          return makeChain({ data: [], error: null })
        case 'assignment_submissions':
          return makeChain({ data: [], error: null })
        case 'profiles':
          return makeChain({ data: mockProfiles, error: null })
        case 'quiz_attempts_v2':
          return makeChain({ data: mockQuizAttempts, error: null })
        default:
          return makeChain({ data: [], error: null })
      }
    })

    const result = await gradebookService.fetchGradebook('tenant-123')

    expect(result.grades['stu1']['q1']).toEqual({
      score: 95,
      status: 'graded',
      feedback: undefined,
      source: 'quiz',
    })
  })

  it('should return empty gradebook when no students exist', async () => {
    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() =>
      makeChain({ data: [], error: null })
    )

    const result = await gradebookService.fetchGradebook('tenant-123')

    expect(result.students).toEqual([])
    expect(result.assignments).toEqual([])
    expect(result.grades).toEqual({})
  })

  it('should throw error when tenantId is missing', async () => {
    await expect(gradebookService.fetchGradebook('')).rejects.toThrow(
      'tenantId is required for fetchGradebook'
    )
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('should handle multiple assignments and students without mixing data', async () => {
    const mockAssignments = [
      {
        id: 'a1',
        title: 'Homework 1',
        due_date: '2023-10-01',
        created_at: '2023-09-01',
        tenant_id: 'tenant-123',
      },
      {
        id: 'a2',
        title: 'Homework 2',
        due_date: '2023-10-05',
        created_at: '2023-09-05',
        tenant_id: 'tenant-123',
      },
    ]
    const mockSubmissions = [
      {
        id: 's1',
        assignment_id: 'a1',
        student_id: 'stu1',
        status: 'graded',
        score: 90,
        feedback: 'Good',
      },
      {
        id: 's2',
        assignment_id: 'a2',
        student_id: 'stu1',
        status: 'graded',
        score: 80,
        feedback: 'Okay',
      },
      {
        id: 's3',
        assignment_id: 'a1',
        student_id: 'stu2',
        status: 'graded',
        score: 100,
        feedback: 'Perfect',
      },
    ]
    const mockProfiles = [
      {
        id: 'stu1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@school.com',
        tenant_id: 'tenant-123',
      },
      {
        id: 'stu2',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@school.com',
        tenant_id: 'tenant-123',
      },
    ]
    const mockQuizAttempts = [
      {
        id: 'qa1',
        quiz_id: 'q1',
        student_id: 'stu1',
        score: 85,
        status: 'GRADED',
        tenant_id: 'tenant-123',
      },
      {
        id: 'qa2',
        quiz_id: 'q1',
        student_id: 'stu2',
        score: 95,
        status: 'GRADED',
        tenant_id: 'tenant-123',
      },
    ]

    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      switch (table) {
        case 'assignments':
          return makeChain({ data: mockAssignments, error: null })
        case 'assignment_submissions':
          return makeChain({ data: mockSubmissions, error: null })
        case 'profiles':
          return makeChain({ data: mockProfiles, error: null })
        case 'quiz_attempts_v2':
          return makeChain({ data: mockQuizAttempts, error: null })
        default:
          return makeChain({ data: [], error: null })
      }
    })

    const result = await gradebookService.fetchGradebook('tenant-123')

    expect(result.grades['stu1']['a1'].score).toBe(90)
    expect(result.grades['stu1']['a2'].score).toBe(80)
    expect(result.grades['stu1']['q1'].score).toBe(85)

    expect(result.grades['stu2']['a1'].score).toBe(100)
    expect(result.grades['stu2']['a2']).toBeUndefined()
    expect(result.grades['stu2']['q1'].score).toBe(95)
  })

  it('should handle database errors gracefully', async () => {
    const dbError = new Error('Database connection failed')

    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      const methods = ['select', 'eq', 'order', 'limit', 'match', 'range']
      for (const m of methods) {
        chain[m] = vi.fn().mockReturnValue(chain)
      }
      chain.then = (_resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.reject(dbError).catch(reject)
      return chain
    })

    await expect(gradebookService.fetchGradebook('tenant-123')).rejects.toThrow(
      'Database connection failed'
    )
  })
})
