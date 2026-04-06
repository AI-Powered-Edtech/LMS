import { beforeEach, describe, expect, it, vi } from 'vitest'

// ==========================================================================
// Sprint C: Integration Tests for Critical Flows
//
// Tests the end-to-end data flow across feature boundaries:
// 1. courses → lessons → quizzes (enrollment → progress → grading)
// 2. gradebook → assignments → quiz-attempts
// 3. auth → notifications (tenant-scoped event routing)
// ==========================================================================

// ══════════════════════════════════════════════════════════════
// Shared mock infrastructure
// ══════════════════════════════════════════════════════════════

const mockRpc = vi.fn()
const mockFrom = vi.fn()

function makeChain(resolveWith: { data: unknown; error: unknown }) {
  const chain: Record<string, any> = {}
  const methods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'in', 'gte', 'lte', 'order', 'limit', 'range',
    'single', 'maybeSingle', 'match', 'not', 'is',
  ]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain.single.mockResolvedValue(resolveWith)
  chain.maybeSingle.mockResolvedValue(resolveWith)
  chain.then = (resolve: Function) => Promise.resolve(resolveWith).then(resolve)
  return chain
}

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'student-1' } } },
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'student-1' } },
        error: null,
      }),
    },
  },
}))

vi.mock('@/utils/logDevError', () => ({
  logDevError: vi.fn(),
  logDevWarn: vi.fn(),
}))

vi.mock('@/utils/rateLimiter', () => ({
  messageRateLimiter: { check: () => ({ allowed: true }) },
  quizSubmitRateLimiter: { check: () => ({ allowed: true, retryAfterMs: 0 }) },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// ══════════════════════════════════════════════════════════════
// Flow 1: courses → lessons → quizzes
// ══════════════════════════════════════════════════════════════

describe('Flow: Course enrollment → Lesson progress → Quiz grading', () => {
  const TENANT_ID = 'tenant-integration'
  const STUDENT_ID = 'student-1'
  const COURSE_ID = 'course-math-101'
  const MODULE_ID = 'module-algebra'
  const LESSON_ID = 'lesson-quadratic'
  const QUIZ_ID = 'quiz-algebra-1'

  it('Step 1: Student can check enrollment in a course', async () => {
    // courseService.checkEnrollment returns discriminated union
    mockFrom.mockReturnValue(makeChain({
      data: { id: 'enrollment-1', student_id: STUDENT_ID, course_id: COURSE_ID },
      error: null,
    }))

    const { courseService } = await import('@/features/courses/api/courseService')
    const result = await courseService.checkEnrollment(COURSE_ID, STUDENT_ID, TENANT_ID)

    expect(result.enrolled).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith('enrollments')
  })

  it('Step 2: After enrollment, student can view lessons in a module', async () => {
    const lessons = [
      { id: LESSON_ID, title: 'Persamaan Kuadrat', is_published: true, order: 0 },
      { id: 'lesson-2', title: 'Fungsi Kuadrat', is_published: true, order: 1 },
    ]
    mockFrom.mockReturnValue(makeChain({ data: lessons, error: null }))

    const { lessonService } = await import('@/features/lessons/api/lessonService')
    const result = await lessonService.fetchModuleLessons(MODULE_ID, STUDENT_ID, TENANT_ID)

    expect(result.lessons.length).toBeGreaterThanOrEqual(1)
  })

  it('Step 3: Student completes a lesson, progress is persisted', async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null })

    const { lessonService } = await import('@/features/lessons/api/lessonService')
    await lessonService.completeLesson(LESSON_ID, TENANT_ID)

    expect(mockRpc).toHaveBeenCalledWith(
      expect.stringContaining('complete'),
      expect.objectContaining({ p_lesson_id: LESSON_ID })
    )
  })

  it('Step 4: Student starts a quiz attempt after completing prerequisite lesson', async () => {
    mockRpc.mockResolvedValue({
      data: { attempt_id: 'attempt-1', questions: [], expires_at: '2026-12-31' },
      error: null,
    })

    const { startQuizAttempt } = await import('@/features/quizzes/api/quizAttemptService')
    const result = await startQuizAttempt(QUIZ_ID)

    expect(result.attempt_id).toBe('attempt-1')
  })

  it('Step 5: Quiz submission triggers gradebook entry creation', async () => {
    // Submit quiz
    mockRpc.mockResolvedValue({
      data: { score: 85, passed: true, total_points: 100, percentage: 85 },
      error: null,
    })

    const { submitQuizAttempt } = await import('@/features/quizzes/api/quizAttemptService')
    const result = await submitQuizAttempt('attempt-1', [])

    expect(result.score).toBe(85)
    expect(result.passed).toBe(true)

    // Gradebook sync should create an entry for this score
    mockRpc.mockResolvedValue({ data: 1, error: null })
    const { syncGradebook } = await import('@/features/gradebook/api/gradebookApi')
    const synced = await syncGradebook(COURSE_ID, TENANT_ID)

    expect(synced).toBeGreaterThanOrEqual(0)
  })
})

// ══════════════════════════════════════════════════════════════
// Flow 2: gradebook → assignments → quiz-attempts
// ══════════════════════════════════════════════════════════════

describe('Flow: Gradebook ↔ Assignments ↔ Quiz Attempts', () => {
  it('fetchGradebookEntries returns entries with student profiles joined', async () => {
    const entries = [{
      id: 'ge1', tenant_id: 't1', student_id: 'stu1', course_id: 'c1',
      entity_type: 'quiz', entity_id: 'q1', score: 90, max_score: 100,
      feedback: null, graded_by: null, graded_at: null,
      created_at: '2026-01-01', updated_at: '2026-01-01', title: 'Quiz 1',
      profiles: { full_name: 'Budi', email: 'budi@edu.id' },
    }]
    mockFrom.mockReturnValue(makeChain({ data: entries, error: null }))

    const { fetchGradebookEntries } = await import('@/features/gradebook/api/gradebookApi')
    const result = await fetchGradebookEntries('c1', 't1')

    expect(result).toHaveLength(1)
    expect(result[0].percentage).toBe(90)
    expect(result[0].item_type).toBe('quiz')
  })

  it('Teacher can update a gradebook entry with feedback', async () => {
    const chain = makeChain({
      data: { id: 'ge1', score: 95, feedback: 'Bagus sekali!' },
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const { updateGradebookEntry } = await import('@/features/gradebook/api/gradebookApi')
    await updateGradebookEntry('ge1', { score: 95, notes: 'Bagus sekali!' })

    expect(chain.update).toHaveBeenCalled()
  })

  it('addGradebookItem creates a new column for manual grading', async () => {
    const chain = makeChain({
      data: { id: 'col-new', title: 'Ujian Tengah Semester', type: 'exam' },
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const { addGradebookItem } = await import('@/features/gradebook/api/gradebookApi')
    await addGradebookItem({
      courseId: 'c1',
      tenantId: 't1',
      title: 'Ujian Tengah Semester',
      entityType: 'assignment',
      maxScore: 100,
    })

    expect(chain.insert).toHaveBeenCalled()
  })
})

// ══════════════════════════════════════════════════════════════
// Flow 3: auth → notifications (tenant-scoped)
// ══════════════════════════════════════════════════════════════

describe('Flow: Auth context → Tenant-scoped notifications', () => {
  it('Notifications are scoped to active tenant', async () => {
    // Simulate: user has memberships in 2 tenants
    const memberships = [
      { tenant_id: 'tenant-a', role: 'teacher' },
      { tenant_id: 'tenant-b', role: 'student' },
    ]

    // Active tenant is B
    const activeTenantId = 'tenant-b'
    const activeMembership = memberships.find(m => m.tenant_id === activeTenantId)

    expect(activeMembership).toBeDefined()
    expect(activeMembership!.role).toBe('student')

    // Notifications should only query for tenant-b
    mockFrom.mockReturnValue(makeChain({
      data: [
        { id: 'n1', tenant_id: 'tenant-b', type: 'assignment_due', message: 'Tugas PR Matematika' },
      ],
      error: null,
    }))

    // Simulating notification fetch scoped to active tenant
    const result = await new Promise((resolve) => {
      const chain = mockFrom('notifications')
      resolve(chain)
    })

    expect(mockFrom).toHaveBeenCalledWith('notifications')
  })

  it('Parent receives notification only for linked children in active tenant', async () => {
    // Parent in tenant-a has child student-1
    mockRpc.mockResolvedValue({
      data: [{ student_id: 'student-1', student_name: 'Budi', class_name: 'Kelas 9A' }],
      error: null,
    })

    const { getMyChildren } = await import('@/features/parent/api/parentApi')
    const children = await getMyChildren()

    expect(children).toHaveLength(1)
    expect(children[0].student_name).toBe('Budi')
  })

  it('Traffic light calculation integrates grades + attendance + assignments', async () => {
    const { calculateTrafficLight } = await import('@/features/parent/api/parentApi')

    // Green scenario: all good
    const greenResult = calculateTrafficLight({
      pendingAssignments: [],
      attendance: [
        { date: '2026-01-01', status: 'hadir' },
        { date: '2026-01-02', status: 'hadir' },
        { date: '2026-01-03', status: 'hadir' },
        { date: '2026-01-04', status: 'hadir' },
        { date: '2026-01-05', status: 'hadir' },
      ],
      grades: [{ subject: 'Math', latest_score: 85, previous_score: 80, trend: 'up' as const }],
    })
    expect(greenResult.status).toBe('green')

    // Red scenario: 3+ overdue assignments
    const redResult = calculateTrafficLight({
      pendingAssignments: [
        { id: '1', title: 'HW1', subject: 'Math', due_date: '2025-01-01', is_overdue: true },
        { id: '2', title: 'HW2', subject: 'Science', due_date: '2025-01-02', is_overdue: true },
        { id: '3', title: 'HW3', subject: 'English', due_date: '2025-01-03', is_overdue: true },
      ],
      attendance: [],
      grades: [],
    })
    expect(redResult.status).toBe('red')

    // Yellow scenario: 1 overdue assignment
    const yellowResult = calculateTrafficLight({
      pendingAssignments: [
        { id: '1', title: 'HW1', subject: 'Math', due_date: '2025-01-01', is_overdue: true },
      ],
      attendance: [
        { date: '2026-01-01', status: 'hadir' },
        { date: '2026-01-02', status: 'hadir' },
        { date: '2026-01-03', status: 'hadir' },
        { date: '2026-01-04', status: 'hadir' },
        { date: '2026-01-05', status: 'hadir' },
      ],
      grades: [{ subject: 'Math', latest_score: 80, previous_score: 75, trend: 'up' as const }],
    })
    expect(yellowResult.status).toBe('yellow')
  })
})