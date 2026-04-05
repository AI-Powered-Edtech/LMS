import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Supabase Mock ─────────────────────────────────────────────────────────────

const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import {
  type PublicProfileData,
  publicProfileService,
  type PublicProfileStats,
} from '../api/publicProfileService'

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  chain.update = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue)
  return chain
}

const MOCK_STATS: PublicProfileStats = {
  total_xp: 1500,
  level: 12,
  streak: 7,
  courses_done: 5,
  quiz_count: 20,
  badge_count: 3,
}

const MOCK_PROFILE: PublicProfileData = {
  id: 'user-1',
  username: 'andipratama',
  full_name: 'Andi Pratama',
  first_name: 'Andi',
  last_name: 'Pratama',
  avatar_url: 'https://cdn.example.com/avatar.jpg',
  bio: 'Siswa rajin',
  is_profile_public: true,
  level: 12,
  stats: MOCK_STATS,
  badges: [
    {
      id: 'b1',
      name: 'First Quiz',
      description: 'Selesaikan kuis pertama',
      icon: 'zap',
      earned_at: '2026-01-01',
    },
  ],
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('publicProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('getPublicProfile', () => {
    it('mengembalikan profil publik lengkap dengan stats dan badges', async () => {
      mockRpc.mockResolvedValue({ data: MOCK_PROFILE, error: null })

      const result = await publicProfileService.getPublicProfile('user-1')

      expect(mockRpc).toHaveBeenCalledWith('get_public_profile', { p_user_id: 'user-1' })
      expect(result).toEqual(MOCK_PROFILE)
      expect(result?.stats.total_xp).toBe(1500)
      expect(result?.badges).toHaveLength(1)
    })

    it('mengembalikan null ketika data null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })

      const result = await publicProfileService.getPublicProfile('user-999')

      expect(result).toBeNull()
    })

    it('melempar error ketika RPC gagal', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } })

      await expect(publicProfileService.getPublicProfile('user-1')).rejects.toMatchObject({
        message: 'RPC failed',
      })
    })
  })

  describe('getProfileByUsername', () => {
    it('mengembalikan ID profil berdasarkan username', async () => {
      const chain = createChainMock({ data: { id: 'user-1' }, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await publicProfileService.getProfileByUsername('andipratama')

      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(chain.ilike).toHaveBeenCalledWith('username', 'andipratama')
      expect(result).toEqual({ id: 'user-1' })
    })

    it('mengembalikan null ketika username tidak ditemukan', async () => {
      const chain = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await publicProfileService.getProfileByUsername('nonexistent')

      expect(result).toBeNull()
    })

    it('melempar error ketika query gagal', async () => {
      const chain = createChainMock({ data: null, error: { message: 'DB error' } })
      mockFrom.mockReturnValue(chain)

      await expect(publicProfileService.getProfileByUsername('user-1')).rejects.toMatchObject({
        message: 'DB error',
      })
    })
  })

  describe('updatePrivacy', () => {
    it('memanggil RPC update_profile_privacy dengan true', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })

      await publicProfileService.updatePrivacy(true)

      expect(mockRpc).toHaveBeenCalledWith('update_profile_privacy', { p_is_public: true })
    })

    it('memanggil RPC update_profile_privacy dengan false', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })

      await publicProfileService.updatePrivacy(false)

      expect(mockRpc).toHaveBeenCalledWith('update_profile_privacy', { p_is_public: false })
    })

    it('melempar error ketika RPC gagal', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'Privacy update failed' } })

      await expect(publicProfileService.updatePrivacy(true)).rejects.toMatchObject({
        message: 'Privacy update failed',
      })
    })
  })

  describe('updateUsername', () => {
    it('memperbarui username dan timestamp', async () => {
      const chain = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await publicProfileService.updateUsername('user-1', 'newusername')

      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'newusername',
          updated_at: expect.any(String),
        })
      )
      expect(chain.eq).toHaveBeenCalledWith('id', 'user-1')
    })

    it('mengatur username menjadi null ketika string kosong', async () => {
      const chain = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await publicProfileService.updateUsername('user-1', '   ')

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          username: null,
        })
      )
    })

    it('melempar error ketika update gagal', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Update failed' } })
      mockFrom.mockReturnValue(chain)

      await expect(
        publicProfileService.updateUsername('user-1', 'newusername')
      ).rejects.toMatchObject({ message: 'Update failed' })
    })
  })

  describe('updateBio', () => {
    it('memperbarui bio dengan trim', async () => {
      const chain = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await publicProfileService.updateBio('user-1', '  Bio baru  ')

      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          bio: 'Bio baru',
          updated_at: expect.any(String),
        })
      )
    })

    it('melempar error ketika update gagal', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Update failed' } })
      mockFrom.mockReturnValue(chain)

      await expect(publicProfileService.updateBio('user-1', 'Bio')).rejects.toMatchObject({
        message: 'Update failed',
      })
    })
  })

  describe('updateProfileName', () => {
    it('memisahkan nama lengkap menjadi first_name dan last_name', async () => {
      const chain = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await publicProfileService.updateProfileName('user-1', 'Andi Pratama')

      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'Andi',
          last_name: 'Pratama',
          updated_at: expect.any(String),
        })
      )
    })

    it('menangani nama tanpa spasi (hanya first_name)', async () => {
      const chain = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await publicProfileService.updateProfileName('user-1', 'Budi')

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'Budi',
          last_name: '',
        })
      )
    })

    it('menangani nama dengan banyak spasi', async () => {
      const chain = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await publicProfileService.updateProfileName('user-1', 'Andi Budi Pratama')

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'Andi',
          last_name: 'Budi Pratama',
        })
      )
    })

    it('melempar error ketika update gagal', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Update failed' } })
      mockFrom.mockReturnValue(chain)

      await expect(
        publicProfileService.updateProfileName('user-1', 'Andi Pratama')
      ).rejects.toMatchObject({ message: 'Update failed' })
    })
  })
})
