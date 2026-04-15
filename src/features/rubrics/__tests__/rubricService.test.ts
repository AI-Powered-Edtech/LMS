import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── DB Mock ──────────────────────────────────────────────────────────────────

const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockGetSession = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}))

vi.mock('@/utils/logDevError', () => ({
  logDevError: vi.fn(),
}))

import { aiRubricService } from '../api/aiRubricService'
import { rubricService } from '../api/rubricService'
import type { RubricInsert, RubricScore } from '../types'

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
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue)
  return chain
}

const MOCK_RUBRIC = {
  id: 'rubric-1',
  title: 'Rubrik Penilaian Essay',
  description: 'Rubrik untuk menilai essay',
  is_template: false,
  assignment_id: 'assign-1',
  total_points: 100,
  tenant_id: 'tenant-1',
  created_by: 'teacher-1',
  created_at: '2026-01-01T00:00:00Z',
  criteria: [
    {
      id: 'crit-1',
      title: 'Isi dan Konten',
      description: 'Kelengkapan dan kedalaman isi',
      max_points: 25,
      order: 0,
      levels: [
        {
          id: 'lvl-1',
          label: 'Sangat Baik',
          points: 25,
          description: 'Memenuhi semua kriteria',
          order: 0,
        },
        {
          id: 'lvl-2',
          label: 'Baik',
          points: 20,
          description: 'Memenuhi sebagian besar',
          order: 1,
        },
      ],
    },
  ],
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('rubricService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRubricByAssignment', () => {
    it('mengembalikan rubrik lengkap ketika assignment memiliki rubrik', async () => {
      const idChain = createChainMock({ data: { id: 'rubric-1' }, error: null })
      mockFrom.mockReturnValue(idChain)
      mockRpc.mockResolvedValue({ data: MOCK_RUBRIC, error: null })

      const result = await rubricService.getRubricByAssignment('assign-1', 'tenant-1')

      expect(mockFrom).toHaveBeenCalledWith('rubrics')
      expect(idChain.eq).toHaveBeenCalledWith('assignment_id', 'assign-1')
      expect(idChain.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1')
      expect(mockRpc).toHaveBeenCalledWith('get_rubric_with_criteria', { p_rubric_id: 'rubric-1' })
      expect(result).toEqual(MOCK_RUBRIC)
    })

    it('mengembalikan null ketika assignment tidak memiliki rubrik', async () => {
      const idChain = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(idChain)

      const result = await rubricService.getRubricByAssignment('assign-1', 'tenant-1')

      expect(result).toBeNull()
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('melempar error ketika query gagal', async () => {
      const idChain = createChainMock({ data: null, error: { message: 'DB error' } })
      mockFrom.mockReturnValue(idChain)

      await expect(
        rubricService.getRubricByAssignment('assign-1', 'tenant-1')
      ).rejects.toMatchObject({ message: 'DB error' })
    })
  })

  describe('getRubricTemplates', () => {
    it('mengembalikan daftar template rubrik', async () => {
      const templates = [
        {
          id: 't1',
          title: 'Template Essay',
          description: 'Template standar',
          total_points: 100,
          created_at: '2026-01-01',
        },
      ]
      const chain = createChainMock({ data: templates, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await rubricService.getRubricTemplates('tenant-1')

      expect(mockFrom).toHaveBeenCalledWith('rubrics')
      expect(chain.eq).toHaveBeenCalledWith('is_template', true)
      expect(chain.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1')
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Template Essay')
    })

    it('mengembalikan array kosong ketika tidak ada template', async () => {
      const chain = createChainMock({ data: [], error: null })
      mockFrom.mockReturnValue(chain)

      const result = await rubricService.getRubricTemplates('tenant-1')

      expect(result).toEqual([])
    })
  })

  describe('saveRubric', () => {
    it('memanggil RPC save_rubric dan mengembalikan ID', async () => {
      const rubricData: RubricInsert & { id?: string } = {
        title: 'Rubrik Baru',
        description: 'Deskripsi',
        is_template: false,
        assignment_id: 'assign-1',
        created_by: 'teacher-1',
        criteria: [],
      }
      mockRpc.mockResolvedValue({ data: 'new-rubric-id', error: null })

      const result = await rubricService.saveRubric(rubricData)

      expect(mockRpc).toHaveBeenCalledWith('save_rubric', {
        p_rubric: expect.objectContaining({ title: 'Rubrik Baru' }),
      })
      expect(result).toBe('new-rubric-id')
    })

    it('melempar error ketika RPC gagal', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'Invalid rubric data' } })

      await expect(
        rubricService.saveRubric({
          title: 'Bad',
          description: '',
          is_template: false,
          assignment_id: null,
          created_by: '',
          criteria: [],
        })
      ).rejects.toMatchObject({ message: 'Invalid rubric data' })
    })
  })

  describe('scoreSubmission', () => {
    it('memanggil RPC score_submission_rubric dengan skor', async () => {
      const scores: RubricScore[] = [
        { criterion_id: 'crit-1', level_id: 'lvl-1', score: 25, comment: 'Bagus' },
      ]
      mockRpc.mockResolvedValue({ data: null, error: null })

      await rubricService.scoreSubmission('sub-1', scores)

      expect(mockRpc).toHaveBeenCalledWith('score_submission_rubric', {
        p_submission_id: 'sub-1',
        p_scores: scores,
      })
    })

    it('melempar error ketika RPC gagal', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'Scoring failed' } })

      await expect(rubricService.scoreSubmission('sub-1', [])).rejects.toMatchObject({
        message: 'Scoring failed',
      })
    })
  })

  describe('getRubricScores', () => {
    it('mengembalikan skor rubrik untuk submission', async () => {
      const scores: RubricScore[] = [
        { criterion_id: 'crit-1', level_id: 'lvl-1', score: 25, comment: '' },
      ]
      const chain = createChainMock({ data: scores, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await rubricService.getRubricScores('sub-1', 'tenant-1')

      expect(mockFrom).toHaveBeenCalledWith('rubric_scores')
      expect(chain.eq).toHaveBeenCalledWith('submission_id', 'sub-1')
      expect(chain.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1')
      expect(result).toHaveLength(1)
      expect(result[0].score).toBe(25)
    })

    it('mengembalikan array kosong ketika tidak ada skor', async () => {
      const chain = createChainMock({ data: [], error: null })
      mockFrom.mockReturnValue(chain)

      const result = await rubricService.getRubricScores('sub-1', 'tenant-1')

      expect(result).toEqual([])
    })
  })

  describe('deleteRubric', () => {
    it('menghapus rubrik berdasarkan ID dan tenant', async () => {
      const chain = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await rubricService.deleteRubric('rubric-1', 'tenant-1')

      expect(mockFrom).toHaveBeenCalledWith('rubrics')
      expect(chain.eq).toHaveBeenCalledWith('id', 'rubric-1')
      expect(chain.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1')
    })

    it('melempar error ketika delete gagal', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Delete failed' } })
      mockFrom.mockReturnValue(chain)

      await expect(rubricService.deleteRubric('rubric-1', 'tenant-1')).rejects.toMatchObject({
        message: 'Delete failed',
      })
    })
  })

  describe('getRubricById', () => {
    it('mengembalikan rubrik lengkap berdasarkan ID', async () => {
      mockRpc.mockResolvedValue({ data: MOCK_RUBRIC, error: null })

      const result = await rubricService.getRubricById('rubric-1')

      expect(mockRpc).toHaveBeenCalledWith('get_rubric_with_criteria', { p_rubric_id: 'rubric-1' })
      expect(result).toEqual(MOCK_RUBRIC)
    })

    it('melempar error ketika RPC gagal', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC not found' } })

      await expect(rubricService.getRubricById('rubric-1')).rejects.toMatchObject({
        message: 'RPC not found',
      })
    })
  })
})

describe('aiRubricService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('melempar error ketika tidak ada sesi autentikasi', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    await expect(
      aiRubricService.suggestRubric('Tugas Essay', 'Deskripsi', 'Instruksi')
    ).rejects.toThrow('Tidak terautentikasi')
  })

  it('mengembalikan rubrik fallback ketika API gagal', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
          refresh_token: 'refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: { id: 'user-1' } as any,
        },
      },
      error: null,
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Gagal' }),
    })

    const result = await aiRubricService.suggestRubric('Tugas Essay', '', '')

    expect(result.title).toBe('Rubrik Penilaian Tugas Essay')
    expect(result.criteria).toHaveLength(4)
    expect(result.criteria[0].title).toBe('Isi dan Konten')
  })

  it('menggunakan fallback rubrik ketika respons AI tidak valid', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
          refresh_token: 'refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: { id: 'user-1' } as any,
        },
      },
      error: null,
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: 'bukan json valid' }),
    })

    const result = await aiRubricService.suggestRubric('Tugas Matematika', '', '')

    expect(result.title).toBe('Rubrik Penilaian Tugas Matematika')
    expect(result.criteria).toBeDefined()
    expect(result.criteria.length).toBeGreaterThan(0)
  })

  it('mem-parse respons JSON yang valid dari AI', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
          refresh_token: 'refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: { id: 'user-1' } as any,
        },
      },
      error: null,
    })

    const aiResponse = {
      content: JSON.stringify({
        title: 'Rubrik Kustom',
        criteria: [
          {
            title: 'Kreativitas',
            description: 'Tingkat kreativitas',
            max_points: 30,
            levels: [
              { label: 'Sangat Kreatif', points: 30, description: 'Sangat kreatif' },
              { label: 'Kurang Kreatif', points: 15, description: 'Kurang kreatif' },
            ],
          },
        ],
      }),
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(aiResponse),
    })

    const result = await aiRubricService.suggestRubric('Tugas Seni', '', '')

    expect(result.title).toBe('Rubrik Kustom')
    expect(result.criteria[0].title).toBe('Kreativitas')
    expect(result.criteria[0].levels).toHaveLength(2)
  })
})
