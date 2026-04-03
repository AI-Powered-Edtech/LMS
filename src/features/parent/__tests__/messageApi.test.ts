import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Supabase Mock ────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn()
  return { mockFrom }
})

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import {
  createThread,
  getMessages,
  getThreads,
  markThreadRead,
  sendMessage,
} from '../api/messageApi'

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Builder untuk chainable Supabase query mock.
 * Setiap method mengembalikan chain (thenable) — bisa di-await di mana saja.
 */
function createChainMock(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}

  const promise = Promise.resolve(resolvedValue)
  chain.then = vi.fn(
    (onFulfilled?: (v: unknown) => unknown, onRejected?: (v: unknown) => unknown) =>
      promise.then(onFulfilled, onRejected)
  )

  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.upsert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.limit = vi.fn().mockReturnValue(chain)
  return chain
}

const MOCK_THREAD_ROW = {
  id: 'thread-1',
  tenant_id: 'tenant-1',
  parent_id: 'parent-1',
  teacher_id: 'teacher-1',
  student_id: 'student-1',
  subject: 'Tentang nilai',
  last_message_at: '2026-03-30T10:00:00Z',
  parent_unread_count: 2,
  teacher_unread_count: 0,
  created_at: '2026-03-29T08:00:00Z',
  teacher: { full_name: 'Pak Budi', avatar_url: null },
  student: { full_name: 'Andi Pratama' },
}

const MOCK_MESSAGE_ROW = {
  id: 'msg-1',
  thread_id: 'thread-1',
  tenant_id: 'tenant-1',
  sender_id: 'parent-1',
  content: 'Halo Pak',
  created_at: '2026-03-30T10:01:00Z',
  sender: { full_name: 'Bu Sari', avatar_url: null },
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('messageApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── getThreads ────────────────────────────────────────────────

  describe('getThreads', () => {
    it('mengambil threads yang diurutkan berdasarkan last_message_at desc', async () => {
      const chain = createChainMock({
        data: [MOCK_THREAD_ROW],
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await getThreads('parent-1')

      expect(mockFrom).toHaveBeenCalledWith('parent_teacher_threads')
      expect(chain.eq).toHaveBeenCalledWith('parent_id', 'parent-1')
      expect(chain.order).toHaveBeenCalledWith('last_message_at', { ascending: false })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('thread-1')
      expect(result[0].teacher_name).toBe('Pak Budi')
      expect(result[0].student_name).toBe('Andi Pratama')
    })

    it('mengembalikan array kosong jika tidak ada thread', async () => {
      const chain = createChainMock({ data: [], error: null })
      mockFrom.mockReturnValue(chain)

      const result = await getThreads('parent-1')
      expect(result).toEqual([])
    })

    it('throw error jika query gagal', async () => {
      const chain = createChainMock({ data: null, error: { message: 'DB error' } })
      mockFrom.mockReturnValue(chain)

      await expect(getThreads('parent-1')).rejects.toThrow('Gagal memuat daftar pesan')
    })

    it('mengisi default teacher_name dan student_name jika null', async () => {
      const row = { ...MOCK_THREAD_ROW, teacher: null, student: null }
      const chain = createChainMock({ data: [row], error: null })
      mockFrom.mockReturnValue(chain)

      const result = await getThreads('parent-1')
      expect(result[0].teacher_name).toBe('Guru')
      expect(result[0].student_name).toBe('Siswa')
    })
  })

  // ── getMessages ───────────────────────────────────────────────

  describe('getMessages', () => {
    it('mengambil pesan dalam thread diurutkan ascending', async () => {
      const chain = createChainMock({
        data: [MOCK_MESSAGE_ROW],
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await getMessages('thread-1')

      expect(mockFrom).toHaveBeenCalledWith('parent_teacher_messages')
      expect(chain.eq).toHaveBeenCalledWith('thread_id', 'thread-1')
      expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: true })
      expect(result).toHaveLength(1)
      expect(result[0].content).toBe('Halo Pak')
      expect(result[0].sender_name).toBe('Bu Sari')
    })

    it('mengembalikan array kosong jika tidak ada pesan', async () => {
      const chain = createChainMock({ data: [], error: null })
      mockFrom.mockReturnValue(chain)

      const result = await getMessages('thread-1')
      expect(result).toEqual([])
    })

    it('throw error jika query gagal', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } })
      mockFrom.mockReturnValue(chain)

      await expect(getMessages('thread-1')).rejects.toThrow('Gagal memuat pesan')
    })
  })

  // ── sendMessage ───────────────────────────────────────────────

  describe('sendMessage', () => {
    it('mengirim pesan baru ke thread', async () => {
      const chain = createChainMock({
        data: MOCK_MESSAGE_ROW,
        error: null,
      })
      // Untuk sendMessage: insert → select → single
      // chain.insert returns chain, chain.select returns chain, chain.single resolves
      mockFrom.mockReturnValue(chain)

      const result = await sendMessage('thread-1', ' Halo Pak Guru ')

      expect(mockFrom).toHaveBeenCalledWith('parent_teacher_messages')
      expect(chain.insert).toHaveBeenCalledWith({
        thread_id: 'thread-1',
        content: 'Halo Pak Guru', // trimmed
      })
      expect(result.content).toBe('Halo Pak')
      expect(result.sender_name).toBe('Bu Sari')
    })

    it('throw error jika insert gagal', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Insert failed' } })
      mockFrom.mockReturnValue(chain)

      await expect(sendMessage('thread-1', 'test')).rejects.toThrow('Gagal mengirim pesan')
    })
  })

  // ── createThread ──────────────────────────────────────────────

  describe('createThread', () => {
    it('membuat thread baru dengan upsert', async () => {
      const chain = createChainMock({
        data: MOCK_THREAD_ROW,
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await createThread({
        parent_id: 'parent-1',
        teacher_id: 'teacher-1',
        student_id: 'student-1',
        subject: 'Tentang nilai',
      })

      expect(mockFrom).toHaveBeenCalledWith('parent_teacher_threads')
      expect(chain.upsert).toHaveBeenCalledWith(
        {
          parent_id: 'parent-1',
          teacher_id: 'teacher-1',
          student_id: 'student-1',
          subject: 'Tentang nilai',
        },
        {
          onConflict: 'parent_id,teacher_id,student_id,tenant_id',
          ignoreDuplicates: true,
        }
      )
      expect(result.id).toBe('thread-1')
      expect(result.teacher_name).toBe('Pak Budi')
    })

    it('mencoba fetch existing thread jika upsert gagal', async () => {
      // Upsert fails → fallback fetch succeeds
      const upsertChain = createChainMock({ data: null, error: { message: 'Conflict' } })
      const fetchChain = createChainMock({ data: MOCK_THREAD_ROW, error: null })

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        return callCount === 1 ? upsertChain : fetchChain
      })

      const result = await createThread({
        parent_id: 'parent-1',
        teacher_id: 'teacher-1',
        student_id: 'student-1',
      })

      expect(result.id).toBe('thread-1')
    })

    it('throw error jika upsert dan fetch keduanya gagal', async () => {
      const failChain = createChainMock({ data: null, error: { message: 'Failed' } })
      mockFrom.mockReturnValue(failChain)

      await expect(
        createThread({
          parent_id: 'parent-1',
          teacher_id: 'teacher-1',
          student_id: 'student-1',
        })
      ).rejects.toThrow('Gagal membuat percakapan baru')
    })

    it('mengisi subject null jika tidak diberikan', async () => {
      const chain = createChainMock({ data: MOCK_THREAD_ROW, error: null })
      mockFrom.mockReturnValue(chain)

      await createThread({
        parent_id: 'parent-1',
        teacher_id: 'teacher-1',
        student_id: 'student-1',
      })

      expect(chain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ subject: null }),
        expect.any(Object)
      )
    })
  })

  // ── markThreadRead ────────────────────────────────────────────

  describe('markThreadRead', () => {
    it('reset parent_unread_count untuk role parent', async () => {
      const chain: Record<string, ReturnType<typeof vi.fn>> = {}
      chain.update = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockResolvedValue({ error: null })
      mockFrom.mockReturnValue(chain)

      await markThreadRead('thread-1', 'parent')

      expect(mockFrom).toHaveBeenCalledWith('parent_teacher_threads')
      expect(chain.update).toHaveBeenCalledWith({ parent_unread_count: 0 })
      expect(chain.eq).toHaveBeenCalledWith('id', 'thread-1')
    })

    it('reset teacher_unread_count untuk role teacher', async () => {
      const chain: Record<string, ReturnType<typeof vi.fn>> = {}
      chain.update = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockResolvedValue({ error: null })
      mockFrom.mockReturnValue(chain)

      await markThreadRead('thread-1', 'teacher')

      expect(chain.update).toHaveBeenCalledWith({ teacher_unread_count: 0 })
    })

    it('tidak throw error meskipun update gagal (non-fatal)', async () => {
      const chain: Record<string, ReturnType<typeof vi.fn>> = {}
      chain.update = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockResolvedValue({ error: { message: 'Update failed' } })
      mockFrom.mockReturnValue(chain)

      // Seharusnya tidak throw
      await expect(markThreadRead('thread-1', 'parent')).resolves.toBeUndefined()
    })
  })
})
