import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Supabase Mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

// ── VIL Session Mock ──────────────────────────────────────────────────────────

vi.mock('@/services/auth/vilSession', () => ({
  readVilSession: vi.fn(() => ({ access_token: 'mock-token' })),
}))

import { plagiarismService } from '../api/plagiarismService'

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
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue)
  return chain
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('plagiarismService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkPlagiarism', () => {
    it('memanggil VIL plagiarism endpoint dan mengembalikan hasil', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          similarity_score: 0.35,
          status: 'completed',
          matches: [
            { submission_id: 'sub-2', similarity: 0.35 },
            { submission_id: 'sub-3', similarity: 0.12 },
          ],
        }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const result = await plagiarismService.checkPlagiarism('sub-1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/plagiarism/check'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ submission_id: 'sub-1' }),
        })
      )
      expect(result.similarity_score).toBe(0.35)
      expect(result.status).toBe('completed')
      expect(result.matches).toHaveLength(2)

      vi.unstubAllGlobals()
    })

    it('melempar error ketika tidak terautentikasi', async () => {
      const { readVilSession } = await import('@/services/auth/vilSession')
      vi.mocked(readVilSession).mockReturnValueOnce(null)

      await expect(plagiarismService.checkPlagiarism('sub-1')).rejects.toThrow(
        'Tidak terautentikasi'
      )
    })

    it('melempar error ketika API gagal', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Internal server error' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      await expect(plagiarismService.checkPlagiarism('sub-1')).rejects.toThrow(
        'Internal server error'
      )

      vi.unstubAllGlobals()
    })

    it('menggunakan pesan default ketika body error tidak ada', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({}),
      })
      vi.stubGlobal('fetch', mockFetch)

      await expect(plagiarismService.checkPlagiarism('sub-1')).rejects.toThrow(
        'Gagal memeriksa plagiarisme'
      )

      vi.unstubAllGlobals()
    })
  })

  describe('getCheckResult', () => {
    it('mengembalikan hasil pemeriksaan plagiarisme terbaru', async () => {
      const chain = createChainMock({
        data: {
          id: 'check-1',
          submission_id: 'sub-1',
          provider: 'internal',
          status: 'completed',
          similarity_score: 0.42,
          report_data: { matches: [], total_compared: 10 },
          checked_by: 'user-1',
          tenant_id: 'tenant-1',
          created_at: '2026-03-01',
          updated_at: '2026-03-01',
        },
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await plagiarismService.getCheckResult('sub-1', 'tenant-1')

      expect(mockFrom).toHaveBeenCalledWith('plagiarism_checks')
      expect(chain.eq).toHaveBeenCalledWith('submission_id', 'sub-1')
      expect(result).not.toBeNull()
      expect(result?.similarity_score).toBe(0.42)
      expect(result?.status).toBe('completed')
    })

    it('mengembalikan null ketika tidak ada hasil pemeriksaan', async () => {
      const chain = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await plagiarismService.getCheckResult('sub-1', 'tenant-1')

      expect(result).toBeNull()
    })

    it('mengembalikan null ketika query error (graceful degradation)', async () => {
      const chain = createChainMock({ data: null, error: { message: 'DB error' } })
      mockFrom.mockReturnValue(chain)

      const result = await plagiarismService.getCheckResult('sub-1', 'tenant-1')

      expect(result).toBeNull()
    })
  })
})
