import { beforeEach, describe, expect, it, vi } from 'vitest'

import { moderationService } from '../api/moderationService'

const { mockChain, mockFrom } = vi.hoisted(() => {
  const mockChain: any = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
  }
  for (const key of Object.keys(mockChain)) {
    mockChain[key].mockReturnValue(mockChain)
  }
  const mockFrom = vi.fn(() => mockChain)

  return { mockChain, mockFrom }
})

vi.mock('@/src/services/api/client', () => ({
  api: {
    from: mockFrom,
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      }),
    },
  },
}))

describe('moderationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(mockChain)) {
      mockChain[key].mockReturnValue(mockChain)
    }

    mockChain.limit.mockResolvedValue({
      data: [
        {
          id: '1',
          content_id: 'c1',
          content_type: 'comment',
          reporter_id: 'u1',
          reporter_name: 'Reporter',
          reason: 'spam',
          description: '',
          status: 'pending',
          created_at: '2023-01-01',
        },
      ],
      error: null,
    })
    mockChain.single.mockResolvedValue({
      data: {
        tenant_id: 't1',
        id: '1',
        content_id: 'c1',
        content_type: 'comment',
        reporter_id: 'user-1',
        reporter_name: 'Test User',
        reason: 'spam',
        description: '',
        status: 'pending',
        created_at: '2023-01-01',
      },
      error: null,
    })
    mockChain.eq.mockReturnValue(mockChain)
  })

  describe('fetchReports', () => {
    it('harus mengembalikan daftar laporan mock', async () => {
      const reports = await moderationService.fetchReports()
      expect(Array.isArray(reports)).toBe(true)
      expect(reports.length).toBeGreaterThan(0)
      expect(reports[0]).toHaveProperty('id')
      expect(reports[0]).toHaveProperty('status', 'pending')
    })
  })

  describe('submitReport', () => {
    it('harus mengembalikan report baru dengan status pending', async () => {
      // Setup the chain so single() returns the new record and eq() returns roleData
      mockChain.single
        .mockResolvedValueOnce({
          data: { tenant_id: 't1' },
        })
        .mockResolvedValueOnce({
          data: {
            tenant_id: 't1',
            id: '1',
            content_id: 'c1',
            content_type: 'comment',
            reporter_id: 'user-1',
            reporter_name: 'Test User',
            reason: 'spam',
            description: '',
            status: 'pending',
            created_at: '2023-01-01',
          },
          error: null,
        })

      const report = await moderationService.submitReport(
        {
          contentId: 'c1',
          contentType: 'comment',
          reason: 'spam',
          description: 'Spam content',
        },
        'user-1',
        'Test User'
      )
      expect(report.status).toBe('pending')
      expect(report.id).toBeDefined()
    })
  })

  describe('resolveReport', () => {
    it('harus menyelesaikan laporan tanpa error', async () => {
      await expect(moderationService.resolveReport('r1', 'approved')).resolves.toBeUndefined()
    })
  })
})
