import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── VIL Session Mock ──────────────────────────────────────────────────────────

vi.mock('@/services/auth/vilSession', () => ({
  readVilSession: vi.fn(() => ({ access_token: 'mock-token' })),
}))

// ── VITE_API_URL env ──────────────────────────────────────────────────────────

vi.stubGlobal('import.meta', {
  env: {
    VITE_API_URL: 'http://localhost:8080',
    DEV: false,
  },
})

import { askTutor } from '..'

describe('AI Tutor Service', () => {
  const mockLessonId = 'lesson-123'
  const mockQuestion = 'What is photosynthesis?'
  const mockTenantId = 'tenant-456'
  const mockSessionId = 'session-789'

  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('askTutor', () => {
    it('returns successful response correctly', async () => {
      const mockResponse = {
        response: 'Photosynthesis is the process plants use to convert light into energy.',
        difficulty: 'mastering',
        signals: [],
        session_id: 'abc123',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(mockResponse),
      })

      const result = await askTutor(mockLessonId, mockQuestion, mockTenantId, mockSessionId)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/ai/tutor'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            lesson_id: mockLessonId,
            question: mockQuestion,
            tenant_id: mockTenantId,
            session_id: mockSessionId,
          }),
        })
      )

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual(mockResponse)
    })

    it('handles EDGE_FUNCTION_ERROR correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const result = await askTutor(mockLessonId, mockQuestion, mockTenantId)

      expect(result.data).toBeUndefined()
      expect(result.error).toEqual({
        message: 'Koneksi terputus. Periksa internet Anda.',
        code: 'EDGE_FUNCTION_ERROR',
      })
    })

    it('handles RATE_LIMIT_MINUTE correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          error: 'Terlalu banyak permintaan (rate_limit)',
          retryAfter: 60,
        }),
      })

      const result = await askTutor(mockLessonId, mockQuestion, mockTenantId)

      expect(result.data).toBeUndefined()
      expect(result.error).toEqual({
        message: 'Terlalu banyak permintaan (rate_limit)',
        code: 'RATE_LIMIT_MINUTE',
        retryAfter: 60,
      })
    })

    it('handles RATE_LIMIT_DAILY correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          error: 'Batas harian tercapai (daily)',
        }),
      })

      const result = await askTutor(mockLessonId, mockQuestion, mockTenantId)

      expect(result.data).toBeUndefined()
      expect(result.error).toEqual({
        message: 'Batas harian tercapai (daily)',
        code: 'RATE_LIMIT_DAILY',
      })
    })

    it('handles generic TUTOR_ERROR from API correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          error: 'Provider failure',
        }),
      })

      const result = await askTutor(mockLessonId, mockQuestion, mockTenantId)

      expect(result.data).toBeUndefined()
      expect(result.error).toEqual({
        message: 'Provider failure',
        code: 'TUTOR_ERROR',
      })
    })

    it('handles empty tutor response as TUTOR_ERROR', async () => {
      const mockEmptyResponse = {
        response: '   ', // Empty or whitespace only
        difficulty: 'mastering',
        signals: [],
        session_id: 'abc123',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(mockEmptyResponse),
      })

      const result = await askTutor(mockLessonId, mockQuestion, mockTenantId)

      expect(result.data).toBeUndefined()
      expect(result.error).toEqual({
        message: 'Tutor gagal memberikan jawaban',
        code: 'TUTOR_ERROR',
      })
    })

    it('handles malformed tutor response as UNKNOWN_ERROR', async () => {
      const mockMalformedResponse = {
        foo: 'bar', // Missing 'response' field entirely
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(mockMalformedResponse),
      })

      const result = await askTutor(mockLessonId, mockQuestion, mockTenantId)

      expect(result.data).toBeUndefined()
      expect(result.error).toEqual({
        message: 'Terjadi kesalahan yang tidak terduga',
        code: 'UNKNOWN_ERROR',
      })
    })

    it('handles NETWORK_ERROR correctly', async () => {
      const networkError = new TypeError('Failed to fetch')
      mockFetch.mockRejectedValueOnce(networkError)

      const result = await askTutor(mockLessonId, mockQuestion, mockTenantId)

      expect(result.data).toBeUndefined()
      expect(result.error).toEqual({
        message: 'Koneksi terputus. Periksa internet Anda.',
        code: 'NETWORK_ERROR',
      })
    })

    it('handles arbitrary unexpected errors as UNKNOWN_ERROR', async () => {
      const randomError = new Error('Something weird happened')
      mockFetch.mockRejectedValueOnce(randomError)

      const result = await askTutor(mockLessonId, mockQuestion, mockTenantId)

      expect(result.data).toBeUndefined()
      expect(result.error).toEqual({
        message: 'Terjadi kesalahan yang tidak terduga',
        code: 'UNKNOWN_ERROR',
      })
    })

    it('passes a large input question correctly', async () => {
      const largeQuestion = 'a'.repeat(1500) // 1500 chars question

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          response: 'Short answer',
          difficulty: 'mastering',
          signals: [],
          session_id: 'abc123',
        }),
      })

      await askTutor(mockLessonId, largeQuestion, mockTenantId, mockSessionId)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/ai/tutor'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            lesson_id: mockLessonId,
            question: largeQuestion,
            tenant_id: mockTenantId,
            session_id: mockSessionId,
          }),
        })
      )
    })
  })
})
