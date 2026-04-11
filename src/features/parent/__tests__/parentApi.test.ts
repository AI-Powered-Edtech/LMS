import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AttendanceDay, ChildGradeSummary, PendingAssignment } from '../types'

// ── Supabase Mock (vi.hoisted untuk referensi stabil) ─────────────────────

const { mockRpc, mockFrom } = vi.hoisted(() => {
  const mockRpc = vi.fn()
  const mockFrom = vi.fn()
  return { mockRpc, mockFrom }
})

vi.mock('@/services/db', () => ({
  db: {
    rpc: mockRpc,
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import {
  calculateTrafficLight,
  getChildAttendance,
  getChildGrades,
  getChildPendingAssignments,
  getMyChildren,
} from '../api/parentApi'

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Builder untuk chainable Supabase query mock.
 * Setiap method mengembalikan chain (untuk chaining) DAN bisa di-await (thenable).
 * Ini menyerupai perilaku PostgREST builder dimana setiap call bisa jadi terminal.
 */
function createChainMock(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}

  // Buat chain thenable — bisa di-await langsung
  const promise = Promise.resolve(resolvedValue)
  chain.then = vi.fn(
    (onFulfilled?: (v: unknown) => unknown, onRejected?: (v: unknown) => unknown) =>
      promise.then(onFulfilled, onRejected)
  )

  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.gte = vi.fn().mockReturnValue(chain)
  chain.lte = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  return chain
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('parentApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── getMyChildren ─────────────────────────────────────────────

  describe('getMyChildren', () => {
    it('memanggil RPC get_my_children dan mengembalikan daftar anak', async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            student_id: 's1',
            student_name: 'Andi Pratama',
            student_avatar: null,
            class_name: 'Kelas 7A',
            relationship: 'ayah',
          },
        ],
        error: null,
      })

      const result = await getMyChildren()

      expect(mockRpc).toHaveBeenCalledWith('get_my_children')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        student_id: 's1',
        student_name: 'Andi Pratama',
        student_avatar: null,
        class_name: 'Kelas 7A',
        relationship: 'ayah',
      })
    })

    it('mengembalikan array kosong jika data null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })

      const result = await getMyChildren()
      expect(result).toEqual([])
    })

    it('throw error jika RPC gagal', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } })

      await expect(getMyChildren()).rejects.toThrow('Gagal memuat daftar anak')
    })

    it('mengisi default class_name dan relationship jika tidak ada', async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            student_id: 's2',
            student_name: 'Budi',
            student_avatar: null,
            class_name: null,
            relationship: null,
          },
        ],
        error: null,
      })

      const result = await getMyChildren()
      expect(result[0].class_name).toBe('Tidak ada kelas')
      expect(result[0].relationship).toBe('wali')
    })
  })

  // ── getChildGrades ────────────────────────────────────────────

  describe('getChildGrades', () => {
    it('mengambil gradebook_entries dan mengembalikan summary per course', async () => {
      const chain = createChainMock({
        data: [
          { score: 85, max_score: 100, created_at: '2026-03-20', courses: { title: 'Matematika' } },
          { score: 70, max_score: 100, created_at: '2026-03-15', courses: { title: 'Matematika' } },
          { score: 90, max_score: 100, created_at: '2026-03-20', courses: { title: 'IPA' } },
        ],
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await getChildGrades('student-1')

      expect(mockFrom).toHaveBeenCalledWith('gradebook_entries')
      expect(chain.eq).toHaveBeenCalledWith('student_id', 'student-1')
      expect(result).toHaveLength(2)

      const math = result.find((g) => g.subject === 'Matematika')
      expect(math).toBeDefined()
      expect(math!.latest_score).toBe(85)
      expect(math!.previous_score).toBe(70)
      expect(math!.trend).toBe('up')
    })

    it('mengembalikan array kosong jika tidak ada data', async () => {
      const chain = createChainMock({ data: [], error: null })
      mockFrom.mockReturnValue(chain)

      const result = await getChildGrades('student-1')
      expect(result).toEqual([])
    })

    it('mengembalikan array kosong jika query error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'DB error' } })
      mockFrom.mockReturnValue(chain)

      const result = await getChildGrades('student-1')
      expect(result).toEqual([])
    })

    it('mendeteksi trend down ketika nilai menurun', async () => {
      const chain = createChainMock({
        data: [
          { score: 50, max_score: 100, created_at: '2026-03-20', courses: { title: 'IPS' } },
          { score: 80, max_score: 100, created_at: '2026-03-15', courses: { title: 'IPS' } },
        ],
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await getChildGrades('student-1')
      expect(result[0].trend).toBe('down')
    })

    it('mendeteksi trend stable ketika selisih ≤ 2', async () => {
      const chain = createChainMock({
        data: [
          { score: 81, max_score: 100, created_at: '2026-03-20', courses: { title: 'IPS' } },
          { score: 80, max_score: 100, created_at: '2026-03-15', courses: { title: 'IPS' } },
        ],
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await getChildGrades('student-1')
      expect(result[0].trend).toBe('stable')
    })

    it('membatasi maksimal 6 mata pelajaran', async () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        score: 80,
        max_score: 100,
        created_at: '2026-03-20',
        courses: { title: `Pelajaran ${i}` },
      }))
      const chain = createChainMock({ data, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await getChildGrades('student-1')
      expect(result.length).toBeLessThanOrEqual(6)
    })
  })

  // ── getChildAttendance ────────────────────────────────────────

  describe('getChildAttendance', () => {
    it('mengambil attendance_records dengan date filter', async () => {
      const chain = createChainMock({
        data: [
          { date: '2026-03-30', status: 'hadir' },
          { date: '2026-03-31', status: 'sakit' },
          { date: '2026-04-01', status: 'izin' },
          { date: '2026-04-02', status: 'alpha' },
          { date: '2026-04-03', status: 'hadir' },
        ],
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await getChildAttendance('student-1', '2026-03-30', 'tenant-1')

      expect(mockFrom).toHaveBeenCalledWith('enrollments')
      expect(chain.gte).toHaveBeenCalledWith('date', '2026-03-30')
      // endStr = weekStart + 4 days = 2026-04-03
      expect(chain.lte).toHaveBeenCalledWith('date', '2026-04-03')
      expect(result).toHaveLength(5)
    })

    it('mengembalikan 5 slot default jika query error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'DB error' } })
      mockFrom.mockReturnValue(chain)

      const result = await getChildAttendance('student-1', '2026-03-30', 'tenant-1')
      expect(result).toHaveLength(5)
    })

    it('memetakan status bahasa Inggris ke bahasa Indonesia', async () => {
      const chain = createChainMock({
        data: [
          { date: '2025-01-06', status: 'present' },
          { date: '2025-01-07', status: 'sick' },
          { date: '2025-01-08', status: 'excused' },
        ],
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      // Gunakan tanggal di masa lalu agar tidak dianggap future day
      const result = await getChildAttendance('student-1', '2025-01-06', 'tenant-1')

      // Cari slot yang sesuai dengan tanggal yang dimasukkan
      const jan6 = result.find((d) => d.date === '2025-01-06')
      const jan7 = result.find((d) => d.date === '2025-01-07')
      const jan8 = result.find((d) => d.date === '2025-01-08')

      expect(jan6?.status).toBe('hadir')
      expect(jan7?.status).toBe('sakit')
      expect(jan8?.status).toBe('izin')
    })
  })

  // ── getChildPendingAssignments ────────────────────────────────

  describe('getChildPendingAssignments', () => {
    it('mengembalikan tugas yang belum dikumpulkan', async () => {
      // Call 1: enrollments query
      const enrollmentChain = createChainMock({
        data: [{ course_id: 'course-1' }],
        error: null,
      })
      // Call 2: assignments query
      const assignmentChain = createChainMock({
        data: [
          {
            id: 'a1',
            title: 'Tugas Matematika',
            due_date: '2026-04-10',
            courses: { title: 'Matematika' },
          },
          { id: 'a2', title: 'Tugas IPA', due_date: '2026-04-12', courses: { title: 'IPA' } },
        ],
        error: null,
      })
      // Call 3: submissions query
      const submissionChain = createChainMock({
        data: [{ assignment_id: 'a1' }], // a1 sudah dikumpulkan
        error: null,
      })

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) return enrollmentChain
        if (callCount === 2) return assignmentChain
        return submissionChain
      })

      const result = await getChildPendingAssignments('student-1', 'tenant-1')

      // Hanya a2 yang pending (a1 sudah dikumpulkan)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('a2')
      expect(result[0].title).toBe('Tugas IPA')
      expect(result[0].subject).toBe('IPA')
    })

    it('mengembalikan array kosong jika tidak ada enrollment', async () => {
      const chain = createChainMock({ data: [], error: null })
      mockFrom.mockReturnValue(chain)

      const result = await getChildPendingAssignments('student-1', 'tenant-1')
      expect(result).toEqual([])
    })

    it('mengembalikan array kosong jika enrollment query error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } })
      mockFrom.mockReturnValue(chain)

      const result = await getChildPendingAssignments('student-1', 'tenant-1')
      expect(result).toEqual([])
    })

    it('menandai tugas yang overdue', async () => {
      const pastDate = '2020-01-01T00:00:00Z'

      const enrollmentChain = createChainMock({
        data: [{ course_id: 'course-1' }],
        error: null,
      })
      const assignmentChain = createChainMock({
        data: [{ id: 'a1', title: 'Tugas Lama', due_date: pastDate, courses: { title: 'IPS' } }],
        error: null,
      })
      const submissionChain = createChainMock({ data: [], error: null })

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) return enrollmentChain
        if (callCount === 2) return assignmentChain
        return submissionChain
      })

      const result = await getChildPendingAssignments('student-1', 'tenant-1')
      expect(result[0].is_overdue).toBe(true)
    })
  })

  // ── calculateTrafficLight ─────────────────────────────────────

  describe('calculateTrafficLight', () => {
    const makeAttendance = (statuses: AttendanceDay['status'][]): AttendanceDay[] =>
      statuses.map((status, i) => ({
        date: `2025-01-0${i + 6}`, // 6-10 Jan 2025 (past dates)
        status,
      }))

    const makeGrades = (scores: number[]): ChildGradeSummary[] =>
      scores.map((score, i) => ({
        subject: `Pelajaran ${i}`,
        latest_score: score,
        previous_score: null,
        trend: 'stable' as const,
      }))

    const makePending = (overdueCounts: number): PendingAssignment[] =>
      Array.from({ length: overdueCounts }, (_, i) => ({
        id: `a${i}`,
        title: `Tugas ${i}`,
        subject: 'Test',
        due_date: '2020-01-01',
        is_overdue: true,
      }))

    it('mengembalikan GREEN ketika semua baik', () => {
      const result = calculateTrafficLight({
        pendingAssignments: [],
        attendance: makeAttendance(['hadir', 'hadir', 'hadir', 'hadir', 'hadir']),
        grades: makeGrades([85, 90, 78]),
      })

      expect(result.status).toBe('green')
    })

    it('mengembalikan YELLOW ketika ada 1-2 tugas terlambat', () => {
      const result = calculateTrafficLight({
        pendingAssignments: makePending(2),
        attendance: makeAttendance(['hadir', 'hadir', 'hadir', 'hadir', 'hadir']),
        grades: makeGrades([85, 90]),
      })

      expect(result.status).toBe('yellow')
      expect(result.reason).toContain('tugas')
    })

    it('mengembalikan YELLOW ketika kehadiran 60-79%', () => {
      // 3 hadir dari 5 = 60%
      const result = calculateTrafficLight({
        pendingAssignments: [],
        attendance: makeAttendance(['hadir', 'hadir', 'hadir', 'alpha', 'alpha']),
        grades: makeGrades([85, 90]),
      })

      expect(result.status).toBe('yellow')
      expect(result.reason).toContain('Kehadiran')
    })

    it('mengembalikan YELLOW ketika ada nilai 60-70', () => {
      const result = calculateTrafficLight({
        pendingAssignments: [],
        attendance: makeAttendance(['hadir', 'hadir', 'hadir', 'hadir', 'hadir']),
        grades: makeGrades([65, 90]),
      })

      expect(result.status).toBe('yellow')
    })

    it('mengembalikan RED ketika ada ≥ 3 tugas terlambat', () => {
      const result = calculateTrafficLight({
        pendingAssignments: makePending(3),
        attendance: makeAttendance(['hadir', 'hadir', 'hadir', 'hadir', 'hadir']),
        grades: makeGrades([85]),
      })

      expect(result.status).toBe('red')
      expect(result.reason).toContain('tugas terlambat')
    })

    it('mengembalikan RED ketika kehadiran < 60%', () => {
      // 2 hadir dari 5 = 40%
      const result = calculateTrafficLight({
        pendingAssignments: [],
        attendance: makeAttendance(['hadir', 'hadir', 'alpha', 'alpha', 'alpha']),
        grades: makeGrades([85]),
      })

      expect(result.status).toBe('red')
      expect(result.reason).toContain('Kehadiran')
    })

    it('mengembalikan RED ketika ada nilai di bawah 60', () => {
      const result = calculateTrafficLight({
        pendingAssignments: [],
        attendance: makeAttendance(['hadir', 'hadir', 'hadir', 'hadir', 'hadir']),
        grades: makeGrades([50, 90]),
      })

      expect(result.status).toBe('red')
      expect(result.reason).toContain('nilai')
    })

    it('mengembalikan GREEN dengan reason yang mengandung rata-rata dan kehadiran', () => {
      const result = calculateTrafficLight({
        pendingAssignments: [],
        attendance: makeAttendance(['hadir', 'hadir', 'hadir', 'hadir', 'hadir']),
        grades: makeGrades([80, 90]),
      })

      expect(result.status).toBe('green')
      expect(result.reason).toContain('Rata-rata nilai')
      expect(result.reason).toContain('Kehadiran 100%')
    })

    it('mengembalikan GREEN tanpa grades dengan default reason', () => {
      const result = calculateTrafficLight({
        pendingAssignments: [],
        attendance: [],
        grades: [],
      })

      expect(result.status).toBe('green')
      expect(result.reason).toBe('Semua aktivitas berjalan baik')
    })

    it('RED priority: overdue diutamakan atas kehadiran dan nilai', () => {
      // Semua kondisi red terpenuhi — overdue harus diprioritaskan dalam reason
      const result = calculateTrafficLight({
        pendingAssignments: makePending(5),
        attendance: makeAttendance(['alpha', 'alpha', 'alpha', 'alpha', 'alpha']),
        grades: makeGrades([30]),
      })

      expect(result.status).toBe('red')
      expect(result.reason).toContain('tugas terlambat')
    })
  })
})
