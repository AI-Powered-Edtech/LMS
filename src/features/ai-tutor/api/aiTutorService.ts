/**
 * AI Tutor Service — Client for the AI Tutor Edge Function
 * 
 * Handles communication with the Supabase Edge Function for AI-powered
 * tutoring within the Smart Player.
 */

// Re-export types from centralized types module
export type { DifficultyLevel } from '../types';
export type { AITutorMessage, AITutorResponse, RateLimitInfo, AITutorError, AskTutorOptions } from '../types';

// Re-export utility functions from promptBuilder
export { validateQuestion, generateMessageId, formatDifficulty, getDifficultyColor } from './promptBuilder';

// Import supabase for internal use
import { supabase } from "@/src/lib/supabase";

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
    const { data, error } = await supabase.functions.invoke('ai-tutor', {
      body: {
        lesson_id: lessonId,
        question: question.trim(),
        tenant_id: tenantId,
        session_id: sessionId,
      },
    });

    if (error) {
      console.error('[AI Tutor] Edge Function error:', error);
      return {
        error: {
          message: error.message || 'Terjadi kesalahan pada sistem tutor',
          code: 'EDGE_FUNCTION_ERROR',
        },
      };
    }

    // Check for error responses from the Edge Function
    if (data?.error) {
      const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || 'Unknown error';

      // Handle rate limiting errors
      if (errorMsg.includes('Terlalu banyak') || errorMsg.includes('rate_limit')) {
        return {
          error: {
            message: errorMsg,
            code: 'RATE_LIMIT_MINUTE',
            retryAfter: data.retryAfter,
          },
        };
      }

      if (errorMsg.includes('Batas harian') || errorMsg.includes('daily')) {
        return {
          error: {
            message: errorMsg,
            code: 'RATE_LIMIT_DAILY',
          },
        };
      }

      return {
        error: {
          message: errorMsg,
          code: 'TUTOR_ERROR',
        },
      };
    }

    // Validate the response shape
    if (!data || typeof data.response !== 'string') {
      return {
        error: {
          message: 'Terjadi kesalahan yang tidak terduga',
          code: 'UNKNOWN_ERROR',
        },
      };
    }

    if (data.response.trim() === '') {
      return {
        error: {
          message: 'Tutor gagal memberikan jawaban',
          code: 'TUTOR_ERROR',
        },
      };
    }

    return { data: data as import('../types').AITutorResponse };
  } catch (err: any) {
    console.error('[AI Tutor] Unexpected error:', err);

    // Handle network errors
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      return {
        error: {
          message: 'Koneksi terputus. Periksa internet Anda.',
          code: 'NETWORK_ERROR',
        },
      };
    }

    return {
      error: {
        message: 'Terjadi kesalahan yang tidak terduga',
        code: 'UNKNOWN_ERROR',
      },
    };
  }
}
