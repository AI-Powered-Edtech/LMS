import { beforeEach, describe, expect, it, vi } from 'vitest'

import { attendanceService } from '../api/attendanceService'

// ── DB mock ─────────────────────────────────────────────────────
const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

function makeChain(resolveWith: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'order', 'limit', 'maybeSingle', 'delete', 'insert', 'update']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  // Make the chain thenable so await resolves it
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(resolveWith).then(resolve, reject)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── fetchTeacherClasses ────────────────────────────────────────
describe('attendanceService.fetchTeacherClasses', () => {
  it('queries classes table with tenant + teacher filter', async () => {
    const mockData = [
      { id: 'c1', name: 'Kelas 10A' },
      { id: 'c2', name: 'Kelas 11B' },
    ]
    mockFrom.mockReturnValue(makeChain({ data: mockData, error: null }))

    const result = await attendanceService.fetchTeacherClasses('t1', 'teacher1')

    expect(mockFrom).toHaveBeenCalledWith('classes')
    expect(result).toEqual(mockData)
  })

  it('throws on db error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }))

    await expect(attendanceService.fetchTeacherClasses('t1', 'teacher1')).rejects.toEqual({
      message: 'DB error',
    })
  })
})

// ── fetchClassStudents ─────────────────────────────────────────
describe('attendanceService.fetchClassStudents', () => {
  it('returns mapped student list', async () => {
    const mockData = [
      { student_id: 's1', profiles: { full_name: 'Andi' } },
      { student_id: 's2', profiles: { full_name: 'Budi' } },
    ]
    mockFrom.mockReturnValue(makeChain({ data: mockData, error: null }))

    const result = await attendanceService.fetchClassStudents('c1', 'tenant1')

    expect(mockFrom).toHaveBeenCalledWith('enrollments')
    expect(result).toEqual([
      { student_id: 's1', full_name: 'Andi' },
      { student_id: 's2', full_name: 'Budi' },
    ])
  })

  it('handles array-shaped profiles join', async () => {
    const mockData = [{ student_id: 's1', profiles: [{ full_name: 'Citra' }] }]
    mockFrom.mockReturnValue(makeChain({ data: mockData, error: null }))

    const result = await attendanceService.fetchClassStudents('c1', 'tenant1')
    expect(result[0].full_name).toBe('Citra')
  })

  it('defaults name to Siswa when profiles is null', async () => {
    const mockData = [{ student_id: 's1', profiles: null }]
    mockFrom.mockReturnValue(makeChain({ data: mockData, error: null }))

    const result = await attendanceService.fetchClassStudents('c1', 'tenant1')
    expect(result[0].full_name).toBe('Siswa')
  })
})

// ── fetchAttendanceRecords ─────────────────────────────────────
describe('attendanceService.fetchAttendanceRecords', () => {
  it('queries attendance_records with tenant + class filter', async () => {
    const mockData = [{ id: 'r1', scan_date: '2026-03-30', present_count: 20 }]
    mockFrom.mockReturnValue(makeChain({ data: mockData, error: null }))

    const result = await attendanceService.fetchAttendanceRecords('t1', 'c1')

    expect(mockFrom).toHaveBeenCalledWith('attendance_records')
    expect(result).toEqual(mockData)
  })
})

// ── fetchTodayRecord ───────────────────────────────────────────
describe('attendanceService.fetchTodayRecord', () => {
  it('returns null when no record exists', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))

    const result = await attendanceService.fetchTodayRecord('t1', 'c1')
    expect(result).toBeNull()
  })

  it('returns existing record', async () => {
    const record = { id: 'r1', scan_date: '2026-03-30', present_count: 25 }
    mockFrom.mockReturnValue(makeChain({ data: record, error: null }))

    const result = await attendanceService.fetchTodayRecord('t1', 'c1')
    expect(result).toEqual(record)
  })
})

// ── upsertAttendance ───────────────────────────────────────────
describe('attendanceService.upsertAttendance', () => {
  it('calls upsert_attendance_record RPC with correct params', async () => {
    mockRpc.mockResolvedValue({ data: 'new-id', error: null })

    const params = {
      class_id: 'c1',
      scan_date: '2026-03-30',
      details: [{ student_id: 's1', name: 'Andi', status: 'hadir' as const }],
      present_count: 1,
      absent_count: 0,
      sick_count: 0,
      permit_count: 0,
    }

    const result = await attendanceService.upsertAttendance(params)

    expect(mockRpc).toHaveBeenCalledWith('upsert_attendance_record', {
      p_class_id: 'c1',
      p_scan_date: '2026-03-30',
      p_details: params.details,
      p_present: 1,
      p_absent: 0,
      p_sick: 0,
      p_permit: 0,
    })
    expect(result).toBe('new-id')
  })

  it('throws on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } })

    await expect(
      attendanceService.upsertAttendance({
        class_id: 'c1',
        scan_date: '2026-03-30',
        details: [],
        present_count: 0,
        absent_count: 0,
        sick_count: 0,
        permit_count: 0,
      })
    ).rejects.toEqual({ message: 'RPC failed' })
  })
})

// ── deleteAttendance ───────────────────────────────────────────
describe('attendanceService.deleteAttendance', () => {
  it('deletes with id + tenant filter', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))

    await attendanceService.deleteAttendance('r1', 't1')

    expect(mockFrom).toHaveBeenCalledWith('attendance_records')
  })

  it('throws on delete error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'Delete failed' } }))

    await expect(attendanceService.deleteAttendance('r1', 't1')).rejects.toEqual({
      message: 'Delete failed',
    })
  })
})
