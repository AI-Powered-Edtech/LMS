import { describe, it, expect, vi, beforeEach } from 'vitest'
import { moderationService } from '../api/moderationService'

// moderationService currently uses mock data (no supabase calls), so no supabase mock needed

describe('moderationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
      expect(report.reporterId).toBe('user-1')
      expect(report.reporterName).toBe('Test User')
      expect(report.id).toBeDefined()
    })
  })

  describe('resolveReport', () => {
    it('harus menyelesaikan laporan tanpa error', async () => {
      await expect(moderationService.resolveReport('r1', 'approved')).resolves.toBeUndefined()
    })
  })
})
