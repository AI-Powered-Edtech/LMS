import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── DB Mock ─────────────────────────────────────────────────────────────────

const mockFrom = vi.fn()
const mockAuthUpdateUser = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      updateUser: (...args: unknown[]) => mockAuthUpdateUser(...args),
    },
  },
}))

import { settingsService } from '../api/settingsService'

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
  chain.update = vi.fn().mockReturnValue(chain)
  return chain
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('settingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('updateProfile', () => {
    it('memperbarui nama profil pengguna', async () => {
      const chain = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await settingsService.updateProfile('user-1', {
        firstName: 'Andi',
        lastName: 'Pratama',
      })

      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'Andi',
          last_name: 'Pratama',
        })
      )
      expect(chain.eq).toHaveBeenCalledWith('id', 'user-1')
    })

    it('mengisi last_name kosong ketika tidak disediakan', async () => {
      const chain = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await settingsService.updateProfile('user-1', {
        firstName: 'Budi',
        lastName: '',
      })

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'Budi',
          last_name: '',
        })
      )
    })

    it('melempar error ketika update gagal', async () => {
      const chain = createChainMock({
        data: null,
        error: { message: 'Update failed' },
      })
      mockFrom.mockReturnValue(chain)

      await expect(
        settingsService.updateProfile('user-1', { firstName: 'Test', lastName: '' })
      ).rejects.toMatchObject({ message: 'Update failed' })
    })
  })

  describe('changePassword', () => {
    it('memperbarui password pengguna melalui auth provider', async () => {
      mockAuthUpdateUser.mockResolvedValue({ error: null })

      await settingsService.changePassword('newSecurePass123')

      expect(mockAuthUpdateUser).toHaveBeenCalledWith({
        password: 'newSecurePass123',
      })
    })

    it('melempar error ketika perubahan password gagal', async () => {
      mockAuthUpdateUser.mockResolvedValue({
        error: { message: 'Password terlalu pendek' },
      })

      await expect(settingsService.changePassword('short')).rejects.toMatchObject({
        message: 'Password terlalu pendek',
      })
    })
  })
})
