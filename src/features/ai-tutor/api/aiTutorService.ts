/**
 * AI Tutor Service — Client for the AI Tutor Edge Function
 *
 * Handles communication with the API Edge Function for AI-powered
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

// Import api for internal use
import { api, apiFetch } from '@/src/lib/api'

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
    const { data, error } = await api.functions.invoke('ai-tutor', {
      body: {
        lesson_id: lessonId,
        question: question.trim(),
        tenant_id: tenantId,
        session_id: sessionId,
      },
    })

    if (error) {
      if (import.meta.env.DEV) console.error('[AI Tutor] Edge Function error:', error)
      // Translate raw API SDK network/invoke errors to Indonesian
      const rawMsg: string = error.message ?? ''
      const indonesianMsg = rawMsg.includes('Failed to send a request')
        ? 'Tutor AI sedang tidak tersedia. Silakan coba lagi nanti.'
        : rawMsg.includes('network') || rawMsg.includes('fetch')
          ? 'Koneksi terputus. Periksa internet Anda.'
          : 'Terjadi kesalahan pada sistem tutor'
      return {
        error: {
          message: indonesianMsg,
          code: 'EDGE_FUNCTION_ERROR',
        },
      }
    }

    // Check for error responses from the Edge Function
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
    if (import.meta.env.DEV) console.error('[AI Tutor] Unexpected error:', err)

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
