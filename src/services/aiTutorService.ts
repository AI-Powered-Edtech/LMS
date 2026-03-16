/**
 * AI Tutor Service — Client for the AI Tutor Edge Function
 * 
 * Handles communication with the Supabase Edge Function for AI-powered
 * tutoring within the Smart Player.
 */

import { supabase } from "@/src/lib/supabase";

export type DifficultyLevel = 'mastering' | 'progressing' | 'struggling' | 'not_started';

export interface AITutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AITutorResponse {
  response: string;
  difficulty: DifficultyLevel;
  signals: string[];
  session_id: string;
}

export interface RateLimitInfo {
  remaining: number;
  resetsAt: Date;
  isLimited: boolean;
}

export interface AITutorError {
  message: string;
  code?: string;
  retryAfter?: number;
}

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
): Promise<{ data?: AITutorResponse; error?: AITutorError }> {
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

    return { data: data as AITutorResponse };
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

/**
 * Format difficulty level for display
 */
export function formatDifficulty(level: DifficultyLevel): string {
  const labels: Record<DifficultyLevel, string> = {
    mastering: 'Mahir',
    progressing: 'Berkembang',
    struggling: 'Perlu Bantuan',
    not_started: 'Belum Mulai',
  };
  return labels[level] || level;
}

/**
 * Get color class for difficulty indicator
 */
export function getDifficultyColor(level: DifficultyLevel): string {
  const colors: Record<DifficultyLevel, string> = {
    mastering: 'bg-green-100 text-green-700',
    progressing: 'bg-blue-100 text-blue-700',
    struggling: 'bg-orange-100 text-orange-700',
    not_started: 'bg-slate-100 text-slate-500',
  };
  return colors[level] || colors.not_started;
}

/**
 * Validate question input
 */
export function validateQuestion(question: string): { valid: boolean; error?: string } {
  if (!question.trim()) {
    return { valid: false, error: 'Pertanyaan tidak boleh kosong' };
  }

  if (question.trim().length < 3) {
    return { valid: false, error: 'Pertanyaan terlalu pendek' };
  }

  if (question.length > 2000) {
    return { valid: false, error: 'Pertanyaan terlalu panjang (maks. 2000 karakter)' };
  }

  // Check for quiz answer patterns (client-side validation complement to server)
  const quizPatterns = [
    /jawaban\s+kuis/i,
    /kunci\s+jawaban/i,
    /quiz\s*answer/i,
    /beri\s*saya\s*jawaban/i,
  ];

  if (quizPatterns.some(p => p.test(question))) {
    return { valid: false, error: 'Tidak bisa meminta jawaban kuis langsung' };
  }

  return { valid: true };
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
