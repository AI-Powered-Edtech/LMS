import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Supabase Mock ──────────────────────────────────────────────────────────

const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { peerReviewService } from '../api/peerReviewService'
import type { PeerReview, PeerReviewConfig } from '../types'

// ── Helpers ─────────────────────────────────────────────────────────────────

function createChainMock(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const promise = Promise.resolve(resolvedValue)
  chain.then = vi.fn(
    (onFulfilled?: (v: unknown) => unknown, onRejected?: (v: unknown) => unknown) =>
      promise.then(onFulfilled, onRejected)
  )
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.neq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue)
  chain.upsert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  return chain
}

function makeConfig(overrides?: Partial<PeerReviewConfig>): PeerReviewConfig {
  return {
    id: 'config-1',
    assignment_id: 'assign-1',
    reviews_per_student: 2,
    is_anonymous: true,
    rubric_id: null,
    weight_in_grade: 0.2,
    status: 'in_review',
    due_date: '2026-05-01',
    tenant_id: 'tenant-1',
    created_by: 'teacher-1',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeReview(overrides?: Partial<PeerReview>): PeerReview {
  return {
    id: 'review-1',
    config_id: 'config-1',
    reviewer_id: 'student-1',
    submission_id: 'sub-1',
    status: 'assigned',
    overall_score: null,
    overall_comment: null,
    submitted_at: null,
    tenant_id: 'tenant-1',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── getConfigByAssignment ───────────────────────────────────────────────────

describe('peerReviewService — getConfigByAssignment', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mengembalikan config untuk assignment yang sesuai', async () => {
    const config = makeConfig()
    const chain = createChainMock({ data: config, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await peerReviewService.getConfigByAssignment('assign-1', 'tenant-1')

    expect(mockFrom).toHaveBeenCalledWith('peer_review_config')
    expect(chain.eq).toHaveBeenCalledWith('assignment_id', 'assign-1')
    expect(result).not.toBeNull()
    expect(result!.assignment_id).toBe('assign-1')
  })

  it('mengembalikan null jika config tidak ditemukan', async () => {
    const chain = createChainMock({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await peerReviewService.getConfigByAssignment('assign-99', 'tenant-1')
    expect(result).toBeNull()
  })

  it('throw error jika query gagal', async () => {
    const chain = createChainMock({ data: null, error: { message: 'Config fetch failed' } })
    mockFrom.mockReturnValue(chain)

    await expect(peerReviewService.getConfigByAssignment('assign-1', 'tenant-1')).rejects.toThrow(
      'Config fetch failed'
    )
  })
})

// ── saveConfig ──────────────────────────────────────────────────────────────

describe('peerReviewService — saveConfig', () => {
  beforeEach(() => vi.clearAllMocks())

  it('upsert config dengan tenant_id dan created_by', async () => {
    const saved = makeConfig({ reviews_per_student: 3 })
    const chain = createChainMock({ data: saved, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await peerReviewService.saveConfig(
      {
        assignment_id: 'assign-1',
        reviews_per_student: 3,
        is_anonymous: true,
        rubric_id: null,
        weight_in_grade: 0.3,
        due_date: '2026-06-01',
      },
      'tenant-1',
      'teacher-1'
    )

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: 'tenant-1',
        created_by: 'teacher-1',
        assignment_id: 'assign-1',
        reviews_per_student: 3,
      }),
      { onConflict: 'assignment_id' }
    )
    expect(result.reviews_per_student).toBe(3)
  })

  it('throw error jika upsert gagal', async () => {
    const chain = createChainMock({ data: null, error: { message: 'Upsert failed' } })
    mockFrom.mockReturnValue(chain)

    await expect(
      peerReviewService.saveConfig(
        {
          assignment_id: 'assign-1',
          reviews_per_student: 2,
          is_anonymous: true,
          rubric_id: null,
          weight_in_grade: 0.2,
          due_date: null,
        },
        'tenant-1',
        'teacher-1'
      )
    ).rejects.toThrow('Upsert failed')
  })
})

// ── assignReviews ───────────────────────────────────────────────────────────

describe('peerReviewService — assignReviews', () => {
  beforeEach(() => vi.clearAllMocks())

  it('memanggil RPC assign_peer_reviews dan mengembalikan jumlah review', async () => {
    mockRpc.mockResolvedValue({ data: 6, error: null })

    const result = await peerReviewService.assignReviews('config-1')

    expect(mockRpc).toHaveBeenCalledWith('assign_peer_reviews', { p_config_id: 'config-1' })
    expect(result).toBe(6)
  })

  it('mengembalikan 0 jika RPC mengembalikan null', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    const result = await peerReviewService.assignReviews('config-1')
    expect(result).toBe(0)
  })

  it('throw error jika RPC gagal', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } })

    await expect(peerReviewService.assignReviews('config-1')).rejects.toThrow('RPC failed')
  })
})

// ── getMyReviews ────────────────────────────────────────────────────────────

describe('peerReviewService — getMyReviews', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mengembalikan review yang belum disubmit untuk user', async () => {
    const reviews = [makeReview({ status: 'assigned' }), makeReview({ status: 'in_progress' })]
    const chain = createChainMock({ data: reviews, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await peerReviewService.getMyReviews('student-1', 'tenant-1')

    expect(mockFrom).toHaveBeenCalledWith('peer_reviews')
    expect(chain.eq).toHaveBeenCalledWith('reviewer_id', 'student-1')
    expect(chain.neq).toHaveBeenCalledWith('status', 'submitted')
    expect(result).toHaveLength(2)
  })

  it('mengembalikan array kosong jika tidak ada review', async () => {
    const chain = createChainMock({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    const result = await peerReviewService.getMyReviews('student-1', 'tenant-1')
    expect(result).toEqual([])
  })

  it('throw error jika query gagal', async () => {
    const chain = createChainMock({ data: null, error: { message: 'Query failed' } })
    mockFrom.mockReturnValue(chain)

    await expect(peerReviewService.getMyReviews('student-1', 'tenant-1')).rejects.toThrow(
      'Query failed'
    )
  })
})

// ── getReviewsBySubmission ──────────────────────────────────────────────────

describe('peerReviewService — getReviewsBySubmission', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mengembalikan semua review untuk submission', async () => {
    const reviews = [
      makeReview({ id: 'r1', overall_score: 85, overall_comment: 'Bagus' }),
      makeReview({ id: 'r2', overall_score: 70, overall_comment: 'Cukup' }),
    ]
    const chain = createChainMock({ data: reviews, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await peerReviewService.getReviewsBySubmission('sub-1', 'tenant-1')

    expect(chain.eq).toHaveBeenCalledWith('submission_id', 'sub-1')
    expect(result).toHaveLength(2)
    expect(result[0].overall_score).toBe(85)
  })

  it('mengembalikan array kosong jika submission tidak punya review', async () => {
    const chain = createChainMock({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    const result = await peerReviewService.getReviewsBySubmission('sub-1', 'tenant-1')
    expect(result).toEqual([])
  })
})

// ── submitReview ────────────────────────────────────────────────────────────

describe('peerReviewService — submitReview', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mengupdate review dengan score, comment, dan status submitted', async () => {
    const submitted = makeReview({
      status: 'submitted',
      overall_score: 85,
      overall_comment: 'Kerja bagus!',
      submitted_at: '2026-04-05T10:00:00Z',
    })
    const chain = createChainMock({ data: submitted, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await peerReviewService.submitReview('review-1', 85, 'Kerja bagus!', 'tenant-1')

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        overall_score: 85,
        overall_comment: 'Kerja bagus!',
        status: 'submitted',
      })
    )
    expect(result.status).toBe('submitted')
  })

  it('throw error jika update gagal', async () => {
    const chain = createChainMock({ data: null, error: { message: 'Submit failed' } })
    mockFrom.mockReturnValue(chain)

    await expect(
      peerReviewService.submitReview('review-1', 85, 'Good job', 'tenant-1')
    ).rejects.toThrow('Submit failed')
  })
})

// ── getSubmissionForReview ──────────────────────────────────────────────────

describe('peerReviewService — getSubmissionForReview', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mengembalikan konten submission', async () => {
    const submission = { id: 'sub-1', submission_text: 'Jawaban saya...', file_url: null }
    const chain = createChainMock({ data: submission, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await peerReviewService.getSubmissionForReview('sub-1', 'tenant-1')

    expect(result).not.toBeNull()
    expect(result!.submission_text).toBe('Jawaban saya...')
  })

  it('mengembalikan null jika submission tidak ditemukan', async () => {
    const chain = createChainMock({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await peerReviewService.getSubmissionForReview('sub-99', 'tenant-1')
    expect(result).toBeNull()
  })

  it('mengembalikan null jika query error (graceful degradation)', async () => {
    const chain = createChainMock({ data: null, error: { message: 'DB error' } })
    mockFrom.mockReturnValue(chain)

    const result = await peerReviewService.getSubmissionForReview('sub-1', 'tenant-1')
    expect(result).toBeNull()
  })
})
