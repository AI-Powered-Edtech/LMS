import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Supabase Mock ────────────────────────────────────────────────────────────

const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { questService } from '../api/questService'

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
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  return chain
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('questService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getActiveQuestsWithProgress', () => {
    it('memanggil RPC get_active_quests_with_progress dan mengembalikan quest dengan progres', async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            quest_id: 'q1',
            title: 'Selesaikan 3 Pelajaran',
            description: 'Selesaikan tiga pelajaran hari ini',
            quest_type: 'daily',
            icon: 'book',
            xp_reward: 50,
            progress: 2,
            target: 3,
            is_completed: false,
          },
          {
            quest_id: 'q2',
            title: 'Skor Kuis Sempurna',
            description: 'Dapatkan skor 100 pada satu kuis',
            quest_type: 'weekly',
            icon: 'star',
            xp_reward: 100,
            progress: 1,
            target: 1,
            is_completed: true,
          },
        ],
        error: null,
      })

      const result = await questService.getActiveQuestsWithProgress('tenant-1')

      expect(mockRpc).toHaveBeenCalledWith('get_active_quests_with_progress', {
        p_tenant_id: 'tenant-1',
      })
      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Selesaikan 3 Pelajaran')
      expect(result[0].is_completed).toBe(false)
      expect(result[1].is_completed).toBe(true)
    })

    it('mengembalikan array kosong ketika RPC tidak ditemukan (graceful degradation)', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: '42883', message: 'function does not exist' },
      })

      const result = await questService.getActiveQuestsWithProgress('tenant-1')

      expect(result).toEqual([])
    })

    it('mengembalikan array kosong ketika data null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })

      const result = await questService.getActiveQuestsWithProgress('tenant-1')

      expect(result).toEqual([])
    })

    it('melempar error ketika RPC gagal (bukan karena function tidak ada)', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: 'PGRST100', message: 'Internal error' },
      })

      await expect(questService.getActiveQuestsWithProgress('tenant-1')).rejects.toMatchObject({
        code: 'PGRST100',
      })
    })
  })

  describe('getQuestDefinitions', () => {
    it('mengembalikan definisi quest untuk manajemen guru/admin', async () => {
      const chain = createChainMock({
        data: [
          {
            id: 'q1',
            title: 'Quest Harian',
            description: 'Deskripsi',
            quest_type: 'daily',
            icon: 'book',
            conditions: { type: 'complete_lessons', count: 3 },
            xp_reward: 50,
            sort_order: 1,
            is_active: true,
            tenant_id: 'tenant-1',
          },
        ],
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await questService.getQuestDefinitions('tenant-1')

      expect(mockFrom).toHaveBeenCalledWith('quests')
      expect(chain.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1')
      expect(result).toHaveLength(1)
      expect(result[0].quest_type).toBe('daily')
    })

    it('mengembalikan array kosong ketika tabel belum dibuat', async () => {
      const chain = createChainMock({
        data: null,
        error: { code: '42P01', message: 'relation does not exist' },
      })
      mockFrom.mockReturnValue(chain)

      const result = await questService.getQuestDefinitions('tenant-1')

      expect(result).toEqual([])
    })

    it('melempar error ketika query gagal', async () => {
      const chain = createChainMock({
        data: null,
        error: { code: 'PGRST100', message: 'DB error' },
      })
      mockFrom.mockReturnValue(chain)

      await expect(questService.getQuestDefinitions('tenant-1')).rejects.toMatchObject({
        code: 'PGRST100',
      })
    })
  })

  describe('createQuest', () => {
    it('membuat quest baru dan mengembalikan data lengkap', async () => {
      const chain = createChainMock({
        data: {
          id: 'new-quest',
          title: 'Quest Baru',
          description: 'Deskripsi quest',
          quest_type: 'challenge',
          icon: 'trophy',
          conditions: { type: 'streak_maintain', days: 7 },
          xp_reward: 200,
          sort_order: 0,
          is_active: true,
          tenant_id: 'tenant-1',
        },
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await questService.createQuest(
        {
          title: 'Quest Baru',
          description: 'Deskripsi quest',
          quest_type: 'challenge',
          icon: 'trophy',
          conditions: { type: 'streak_maintain', days: 7 },
          xp_reward: 200,
          sort_order: 0,
          is_active: true,
        },
        'tenant-1'
      )

      expect(mockFrom).toHaveBeenCalledWith('quests')
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Quest Baru', tenant_id: 'tenant-1' })
      )
      expect(result.title).toBe('Quest Baru')
      expect(result.tenant_id).toBe('tenant-1')
    })

    it('melempar error ketika insert gagal', async () => {
      const chain = createChainMock({
        data: null,
        error: { message: 'Constraint violation' },
      })
      mockFrom.mockReturnValue(chain)

      await expect(
        questService.createQuest(
          {
            title: 'Test',
            description: '',
            quest_type: 'daily',
            icon: 'x',
            conditions: {},
            xp_reward: 10,
            sort_order: 0,
            is_active: true,
          },
          'tenant-1'
        )
      ).rejects.toMatchObject({ message: 'Constraint violation' })
    })
  })

  describe('updateQuest', () => {
    it('memperbarui quest dan mengembalikan data terbaru', async () => {
      const chain = createChainMock({
        data: {
          id: 'q1',
          title: 'Quest Diperbarui',
          description: 'Deskripsi baru',
          quest_type: 'weekly',
          icon: 'star',
          conditions: {},
          xp_reward: 75,
          sort_order: 1,
          is_active: true,
          tenant_id: 'tenant-1',
        },
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await questService.updateQuest(
        'q1',
        { title: 'Quest Diperbarui', xp_reward: 75 },
        'tenant-1'
      )

      expect(chain.update).toHaveBeenCalledWith({ title: 'Quest Diperbarui', xp_reward: 75 })
      expect(chain.eq).toHaveBeenCalledWith('id', 'q1')
      expect(result.title).toBe('Quest Diperbarui')
    })

    it('melempar error ketika update gagal', async () => {
      const chain = createChainMock({
        data: null,
        error: { message: 'Update failed' },
      })
      mockFrom.mockReturnValue(chain)

      await expect(
        questService.updateQuest('q1', { title: 'Test' }, 'tenant-1')
      ).rejects.toMatchObject({ message: 'Update failed' })
    })
  })

  describe('deleteQuest', () => {
    it('menonaktifkan quest (soft delete) alih-alih menghapus', async () => {
      const chain = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await questService.deleteQuest('q1', 'tenant-1')

      expect(mockFrom).toHaveBeenCalledWith('quests')
      expect(chain.update).toHaveBeenCalledWith({ is_active: false })
      expect(chain.eq).toHaveBeenCalledWith('id', 'q1')
    })

    it('melempar error ketika soft delete gagal', async () => {
      const chain = createChainMock({
        data: null,
        error: { message: 'Delete failed' },
      })
      mockFrom.mockReturnValue(chain)

      await expect(questService.deleteQuest('q1', 'tenant-1')).rejects.toMatchObject({
        message: 'Delete failed',
      })
    })
  })
})
