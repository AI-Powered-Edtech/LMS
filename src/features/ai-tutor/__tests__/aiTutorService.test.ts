import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/src/services/api/client', () => ({
  api: {
    functions: {
      invoke: vi.fn(),
    },
  },
}))

import { api } from '@/src/services/api/client'
import { askTutor } from '..'

describe('AI Tutor Service', () => {
  const mockLessonId = 'lesson-123'
  const mockQuestion = 'What is photosynthesis?'
  const mockTenantId = 'tenant-456'
  const mockSessionId = 'session-789'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('askTutor', () => {
    it('returns successful response correctly', async () => {
      const mockResponse = {
        response: 'Photosynthesis is the process plants use to convert light into energy.',
        difficulty: 'mastering',
        signals: [],
        session_id: 'abc123',
      }

      vi.mocked(api.functions.invoke).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      })

      const result = await askTutor(mockLessonId, mockQuestion, mockTenantId, mockSessionId)

      expect(api.functions.invoke).toHaveBeenCalledWith('ai-tutor', {
        body: {
          lesson_id: mockLessonId,
          question: mockQuestion,
          tenant_id: mockTenantId,
          session_id: mockSessionId,
        },
      })

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual(mockResponse)
    })

    it('handles EDGE_FUNCTION_ERROR correctly', async () => {
      vi.mocked(api.functions.invoke).mockResolvedValueOnce({
        data: null,
        error: new Error('Edge function failed'),
      })

      const result = await askTutor(mockLessonId, mockQuestion, mockTenantId)

      expect(result.data).toBeUndefined()
      expect(result.error).toEqual({
        message: 'Terjadi kesalahan pada sistem tutor',
        code: 'EDGE_FUNCTION_ERROR',
      })
    })

    it('handles RATE_LIMIT_MINUTE correctly', async () => {
      vi.mocked(api.functions.invoke).mockResolvedValueOnce({
        data: {
          error: 'Terlalu banyak permintaan (rate_limit)',
          retryAfter: 60,
        },
        error: null,
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
      vi.mocked(api.functions.invoke).mockResolvedValueOnce({
        data: {
          error: 'Batas harian tercapai (daily)',
        },
        error: null,
      })

      const result = await askTutor(mockLessonId, mockQuestion, mockTenantId)

      expect(result.data).toBeUndefined()
      expect(result.error).toEqual({
        message: 'Batas harian tercapai (daily)',
        code: 'RATE_LIMIT_DAILY',
      })
    })

    it('handles generic TUTOR_ERROR from edge function correctly', async () => {
      vi.mocked(api.functions.invoke).mockResolvedValueOnce({
        data: {
          error: 'Provider failure',
        },
        error: null,
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

      vi.mocked(api.functions.invoke).mockResolvedValueOnce({
        data: mockEmptyResponse,
        error: null,
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

      vi.mocked(api.functions.invoke).mockResolvedValueOnce({
        data: mockMalformedResponse,
        error: null,
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
      vi.mocked(api.functions.invoke).mockRejectedValueOnce(networkError)

      const result = await askTutor(mockLessonId, mockQuestion, mockTenantId)

      expect(result.data).toBeUndefined()
      expect(result.error).toEqual({
        message: 'Koneksi terputus. Periksa internet Anda.',
        code: 'NETWORK_ERROR',
      })
    })

    it('handles arbitrary unexpected errors as UNKNOWN_ERROR', async () => {
      const randomError = new Error('Something weird happened')
      vi.mocked(api.functions.invoke).mockRejectedValueOnce(randomError)

      const result = await askTutor(mockLessonId, mockQuestion, mockTenantId)

      expect(result.data).toBeUndefined()
      expect(result.error).toEqual({
        message: 'Terjadi kesalahan yang tidak terduga',
        code: 'UNKNOWN_ERROR',
      })
    })

    it('passes a large input question correctly', async () => {
      const largeQuestion = 'a'.repeat(1500) // 1500 chars question

      vi.mocked(api.functions.invoke).mockResolvedValueOnce({
        data: {
          response: 'Short answer',
          difficulty: 'mastering',
          signals: [],
          session_id: 'abc123',
        },
        error: null,
      })

      await askTutor(mockLessonId, largeQuestion, mockTenantId, mockSessionId)

      expect(api.functions.invoke).toHaveBeenCalledWith('ai-tutor', {
        body: {
          lesson_id: mockLessonId,
          question: largeQuestion,
          tenant_id: mockTenantId,
          session_id: mockSessionId,
        },
      })
    })
  })
})
