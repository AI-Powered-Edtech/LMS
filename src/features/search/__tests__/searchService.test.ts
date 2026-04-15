import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Supabase Mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('@/utils/sentry', () => ({
  captureError: vi.fn(),
}))

import { globalSearch } from '../api/searchService'

// ── Helpers ──────────────────────────────────────────────────────────────────

function createChainMock(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const promise = Promise.resolve(resolvedValue)
  chain.then = vi.fn(
    (onFulfilled?: (v: unknown) => unknown, onRejected?: (v: unknown) => unknown) =>
      promise.then(onFulfilled, onRejected)
  )
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.ilike = vi.fn().mockReturnValue(chain)
  chain.or = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  return chain
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('globalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('query normalization', () => {
    it('mengembalikan array kosong untuk query kosong', async () => {
      const result = await globalSearch({ tenantId: 'tenant-1', query: '' })

      expect(result).toEqual([])
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('mengembalikan array kosong untuk query yang hanya spasi', async () => {
      const result = await globalSearch({ tenantId: 'tenant-1', query: '   ' })

      expect(result).toEqual([])
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('mengembalikan array kosong untuk query kurang dari 2 karakter', async () => {
      const result = await globalSearch({ tenantId: 'tenant-1', query: 'a' })

      expect(result).toEqual([])
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  describe('search courses', () => {
    it('mencari course berdasarkan judul', async () => {
      const chain = createChainMock({
        data: [
          {
            id: 'c1',
            title: 'Matematika Dasar',
            description: 'Kursus dasar',
            tenant_id: 'tenant-1',
          },
        ],
        error: null,
      })
      mockFrom.mockImplementation((table) =>
        table === 'courses' ? chain : createChainMock({ data: [], error: null })
      )

      const result = await globalSearch({ tenantId: 'tenant-1', query: 'Matematika' })

      expect(mockFrom).toHaveBeenCalledWith('courses')
      expect(chain.ilike).toHaveBeenCalledWith('title', '%Matematika%')
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('course')
      expect(result[0].title).toBe('Matematika Dasar')
      expect(result[0].url).toBe('/app/student/courses/c1')
    })

    it('mengisi description kosong ketika null', async () => {
      const chain = createChainMock({
        data: [
          { id: 'c1', title: 'Kursus Tanpa Deskripsi', description: null, tenant_id: 'tenant-1' },
        ],
        error: null,
      })
      mockFrom.mockImplementation((table) =>
        table === 'courses' ? chain : createChainMock({ data: [], error: null })
      )

      const result = await globalSearch({ tenantId: 'tenant-1', query: 'Kursus' })

      expect(result[0].description).toBe('')
    })
  })

  describe('search lessons', () => {
    it('mencari lesson berdasarkan judul', async () => {
      const chain = createChainMock({
        data: [
          {
            id: 'l1',
            title: 'Pelajaran Aljabar',
            description: 'Belajar aljabar',
            tenant_id: 'tenant-1',
            module_id: 'mod-1',
          },
        ],
        error: null,
      })
      mockFrom.mockImplementation((table) =>
        table === 'lessons' ? chain : createChainMock({ data: [], error: null })
      )

      const result = await globalSearch({ tenantId: 'tenant-1', query: 'Aljabar' })

      expect(mockFrom).toHaveBeenCalledWith('lessons')
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('lesson')
      expect(result[0].url).toContain('moduleId=mod-1')
      expect(result[0].url).toContain('lessonId=l1')
    })
  })

  describe('search assignments', () => {
    it('mencari assignment berdasarkan judul', async () => {
      const chain = createChainMock({
        data: [
          {
            id: 'a1',
            title: 'Tugas Aljabar',
            description: 'Kerjakan soal',
            tenant_id: 'tenant-1',
            course_id: 'c1',
          },
        ],
        error: null,
      })
      mockFrom.mockImplementation((table) =>
        table === 'assignments' ? chain : createChainMock({ data: [], error: null })
      )

      const result = await globalSearch({ tenantId: 'tenant-1', query: 'Tugas' })

      expect(mockFrom).toHaveBeenCalledWith('assignments')
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('assignment')
    })
  })

  describe('search quizzes', () => {
    it('mencari quiz berdasarkan judul', async () => {
      const chain = createChainMock({
        data: [
          {
            id: 'q1',
            title: 'Kuis Matematika',
            description: 'Ujian tengah semester',
            tenant_id: 'tenant-1',
          },
        ],
        error: null,
      })
      mockFrom.mockImplementation((table) =>
        table === 'quizzes' ? chain : createChainMock({ data: [], error: null })
      )

      const result = await globalSearch({ tenantId: 'tenant-1', query: 'Kuis' })

      expect(mockFrom).toHaveBeenCalledWith('quizzes')
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('quiz')
    })
  })

  describe('search users', () => {
    it('mencari user berdasarkan nama', async () => {
      const chain = createChainMock({
        data: [
          {
            id: 'u1',
            first_name: 'Andi',
            last_name: 'Pratama',
            email: 'andi@sekolah.dev',
            tenant_id: 'tenant-1',
          },
        ],
        error: null,
      })
      mockFrom.mockImplementation((table) =>
        table === 'profiles' ? chain : createChainMock({ data: [], error: null })
      )

      const result = await globalSearch({ tenantId: 'tenant-1', query: 'Andi' })

      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('user')
      expect(result[0].title).toBe('Andi Pratama')
      expect(result[0].description).toBe('andi@sekolah.dev')
    })

    it('menggabungkan nama depan dan belakang dengan benar', async () => {
      const chain = createChainMock({
        data: [
          {
            id: 'u1',
            first_name: 'Budi',
            last_name: null,
            email: 'budi@sekolah.dev',
            tenant_id: 'tenant-1',
          },
        ],
        error: null,
      })
      mockFrom.mockImplementation((table) =>
        table === 'profiles' ? chain : createChainMock({ data: [], error: null })
      )

      const result = await globalSearch({ tenantId: 'tenant-1', query: 'Budi' })

      expect(result[0].title).toBe('Budi')
    })
  })

  describe('result limiting', () => {
    it('membatasi hasil sesuai parameter limit', async () => {
      const courseData = Array.from({ length: 10 }, (_, i) => ({
        id: `c${i}`,
        title: `Kursus ${i}`,
        description: null,
        tenant_id: 'tenant-1',
      }))
      const chain = createChainMock({ data: courseData, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await globalSearch({ tenantId: 'tenant-1', query: 'Kursus', limit: 3 })

      expect(result.length).toBeLessThanOrEqual(3)
    })

    it('menggunakan limit default 20', async () => {
      const courseData = Array.from({ length: 25 }, (_, i) => ({
        id: `c${i}`,
        title: `Kursus ${i}`,
        description: null,
        tenant_id: 'tenant-1',
      }))
      const chain = createChainMock({ data: courseData, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await globalSearch({ tenantId: 'tenant-1', query: 'Kursus' })

      expect(result.length).toBeLessThanOrEqual(20)
    })
  })

  describe('type filtering', () => {
    it('hanya mencari tipe yang ditentukan', async () => {
      const chain = createChainMock({
        data: [{ id: 'c1', title: 'Matematika', description: null, tenant_id: 'tenant-1' }],
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      await globalSearch({
        tenantId: 'tenant-1',
        query: 'Matematika',
        types: ['course'],
      })

      expect(mockFrom).toHaveBeenCalledWith('courses')
      expect(mockFrom).not.toHaveBeenCalledWith('lessons')
    })
  })

  describe('error handling', () => {
    it('tetap melanjutkan pencarian ketika satu tipe gagal', async () => {
      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainMock({ data: null, error: { message: 'Course error' } })
        }
        return createChainMock({
          data: [
            {
              id: 'l1',
              title: 'Pelajaran',
              description: null,
              tenant_id: 'tenant-1',
              module_id: 'm1',
            },
          ],
          error: null,
        })
      })

      const result = await globalSearch({
        tenantId: 'tenant-1',
        query: 'test',
        types: ['course', 'lesson'],
      })

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('lesson')
    })

    it('mengembalikan array kosong ketika semua pencarian gagal', async () => {
      mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'DB error' } }))

      const result = await globalSearch({ tenantId: 'tenant-1', query: 'test' })

      expect(result).toEqual([])
    })
  })
})
