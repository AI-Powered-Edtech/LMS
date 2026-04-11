import { beforeEach, describe, expect, it, vi } from 'vitest'

import { classroomService } from '../api/classroomService'

const mockFrom = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

function makeChain(resolveValue: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(resolveValue),
    insert: vi.fn().mockResolvedValue(resolveValue),
    update: vi.fn().mockReturnThis(),
  }
}

describe('classroomService.fetchClassrooms', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries classes table for teacher role', async () => {
    const fromSpy = vi.fn().mockReturnValue(makeChain({ data: [], error: null }))
    mockFrom.mockImplementation(fromSpy)
    await classroomService.fetchClassrooms('teacher-1', 'teacher', 'tenant-1')
    expect(fromSpy).toHaveBeenCalledWith('classes')
  })

  it('returns empty array for teacher with no classes', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }))
    const result = await classroomService.fetchClassrooms('teacher-1', 'teacher', 'tenant-1')
    expect(result).toEqual([])
  })

  it('returns classrooms for teacher', async () => {
    const classes = [{ id: 'c1', name: 'Math', teacher_id: 'teacher-1', join_code: 'ABC123' }]
    mockFrom.mockReturnValue(makeChain({ data: classes, error: null }))
    const result = await classroomService.fetchClassrooms('teacher-1', 'teacher', 'tenant-1')
    expect(result).toEqual(classes)
  })

  it('queries classes for admin role', async () => {
    const fromSpy = vi.fn().mockReturnValue(makeChain({ data: [], error: null }))
    mockFrom.mockImplementation(fromSpy)
    await classroomService.fetchClassrooms('admin-1', 'admin', 'tenant-1')
    expect(fromSpy).toHaveBeenCalledWith('classes')
  })

  it('queries enrollments for student role', async () => {
    const fromSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })
    mockFrom.mockImplementation(fromSpy)
    await classroomService.fetchClassrooms('student-1', 'student', 'tenant-1')
    expect(fromSpy).toHaveBeenCalledWith('enrollments')
  })

  it('throws on database error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Permission denied' } }),
    })
    await expect(
      classroomService.fetchClassrooms('teacher-1', 'teacher', 'tenant-1')
    ).rejects.toMatchObject({ message: 'Permission denied' })
  })
})

describe('classroomService.createClassroom', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inserts into classes table', async () => {
    const fromSpy = vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })
    mockFrom.mockImplementation(fromSpy)
    await classroomService.createClassroom('teacher-1', 'My Class', 'tenant-1')
    expect(fromSpy).toHaveBeenCalledWith('classes')
  })

  it('inserts with correct tenant_id', async () => {
    let capturedData: unknown
    mockFrom.mockReturnValue({
      insert: vi.fn().mockImplementation((data) => {
        capturedData = data
        return Promise.resolve({ error: null })
      }),
    })
    await classroomService.createClassroom('teacher-1', 'My Class', 'tenant-1')
    expect((capturedData as Record<string, unknown>).tenant_id).toBe('tenant-1')
    expect((capturedData as Record<string, unknown>).teacher_id).toBe('teacher-1')
    expect((capturedData as Record<string, unknown>).name).toBe('My Class')
  })

  it('generates a join_code', async () => {
    let capturedData: unknown
    mockFrom.mockReturnValue({
      insert: vi.fn().mockImplementation((data) => {
        capturedData = data
        return Promise.resolve({ error: null })
      }),
    })
    await classroomService.createClassroom('teacher-1', 'My Class', 'tenant-1')
    expect((capturedData as Record<string, unknown>).join_code).toBeTruthy()
  })

  it('throws on error', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { message: 'Insert failed' } }),
    })
    await expect(
      classroomService.createClassroom('teacher-1', 'My Class', 'tenant-1')
    ).rejects.toMatchObject({ message: 'Insert failed' })
  })
})
