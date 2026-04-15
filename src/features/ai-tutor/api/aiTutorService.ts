/**
 * AI Tutor Service — Client for the VIL AI Tutor API
 *
 * Handles communication with the VIL API for AI-powered
 * tutoring within the Smart Player.
 */

// Types are exported from ../types and the feature barrel (../index.ts).
// Do not re-export here to avoid duplicate export paths.

// Re-export utility functions from promptBuilder
export {
  formatDifficulty,
  generateMessageId,
  getDifficultyColor,
  validateQuestion,
} from './promptBuilder'

// Import VIL session for auth token
import { readVilSession } from '@/services/auth/vilSession'
import { logger } from '@/utils/logger'

/**
 * Ask a question to the AI Tutor
 *
 * @param lessonId - The ID of the current lesson
 * @param question - The student's question
 * @returns Promise with AI response or error
 */
export async function askTutor(
  lessonId: string,
  question: string,
  tenantId: string,
  sessionId?: string
): Promise<{ data?: import('../types').AITutorResponse; error?: import('../types').AITutorError }> {
  try {
    const apiUrl = import.meta.env.VITE_API_URL ?? ''
    const token = readVilSession()?.access_token

    const response = await fetch(`${apiUrl}/api/v1/ai/tutor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        lesson_id: lessonId,
        question: question.trim(),
        tenant_id: tenantId,
        session_id: sessionId,
      }),
    })

    if (!response.ok) {
      if (import.meta.env.DEV) logger.error('[AI Tutor] API error:', response.status)
      // Translate HTTP errors to Indonesian
      const indonesianMsg =
        response.status === 503
          ? 'Tutor AI sedang tidak tersedia. Silakan coba lagi nanti.'
          : response.status === 0 || response.status >= 500
            ? 'Koneksi terputus. Periksa internet Anda.'
            : 'Terjadi kesalahan pada sistem tutor'
      return {
        error: {
          message: indonesianMsg,
          code: 'EDGE_FUNCTION_ERROR',
        },
      }
    }

    const data = await response.json()

    // Check for error responses from the API
    if (data?.error) {
      const errorMsg =
        typeof data.error === 'string'
          ? data.error
          : data.error?.message || 'Kesalahan tidak diketahui'

      // Handle rate limiting errors
      if (errorMsg.includes('Terlalu banyak') || errorMsg.includes('rate_limit')) {
        return {
          error: {
            message: errorMsg,
            code: 'RATE_LIMIT_MINUTE',
            retryAfter: data.retryAfter,
          },
        }
      }

      if (errorMsg.includes('Batas harian') || errorMsg.includes('daily')) {
        return {
          error: {
            message: errorMsg,
            code: 'RATE_LIMIT_DAILY',
          },
        }
      }

      return {
        error: {
          message: errorMsg,
          code: 'TUTOR_ERROR',
        },
      }
    }

    // Validate the response shape
    if (!data || typeof data.response !== 'string') {
      return {
        error: {
          message: 'Terjadi kesalahan yang tidak terduga',
          code: 'UNKNOWN_ERROR',
        },
      }
    }

    if (data.response.trim() === '') {
      return {
        error: {
          message: 'Tutor gagal memberikan jawaban',
          code: 'TUTOR_ERROR',
        },
      }
    }

    return { data: data as import('../types').AITutorResponse }
  } catch (err: unknown) {
    if (import.meta.env.DEV) logger.error('[AI Tutor] Unexpected error:', err)

    // Handle network errors
    if (err instanceof TypeError && err.message.includes('fetch')) {
      return {
        error: {
          message: 'Koneksi terputus. Periksa internet Anda.',
          code: 'NETWORK_ERROR',
        },
      }
    }

    return {
      error: {
        message: 'Terjadi kesalahan yang tidak terduga',
        code: 'UNKNOWN_ERROR',
      },
    }
  }
}
