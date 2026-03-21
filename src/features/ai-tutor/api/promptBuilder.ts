/**
 * AI Prompt Builder — Assembles structured prompts for the AI Tutor
 *
 * 4-part prompt structure:
 *   1. System prompt (persona + rules + anti-hallucination + injection guard)
 *   2. Grounding context (lesson content, module/course position)
 *   3. Student profile (difficulty, progress, quiz performance)
 *   4. User question
 */

// Re-export types from centralized types module
import type { DifficultyLevel } from '../types'

// ─── Utility Functions ───

/**
 * Format difficulty level for display
 */
export function formatDifficulty(level: DifficultyLevel): string {
  const labels: Record<DifficultyLevel, string> = {
    mastering: 'Mahir',
    progressing: 'Berkembang',
    struggling: 'Perlu Bantuan',
    not_started: 'Belum Mulai',
  }
  return labels[level] || level
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
  }
  return colors[level] || colors.not_started
}

/**
 * Validate question input
 */
export function validateQuestion(question: string): { valid: boolean; error?: string } {
  if (!question.trim()) {
    return { valid: false, error: 'Pertanyaan tidak boleh kosong' }
  }

  if (question.trim().length < 3) {
    return { valid: false, error: 'Pertanyaan terlalu pendek' }
  }

  if (question.length > 2000) {
    return { valid: false, error: 'Pertanyaan terlalu panjang (maks. 2000 karakter)' }
  }

  // Check for quiz answer patterns (client-side validation complement to server)
  const quizPatterns = [
    /jawaban\s+kuis/i,
    /kunci\s+jawaban/i,
    /quiz\s*answer/i,
    /beri\s*saya\s*jawaban/i,
  ]

  if (quizPatterns.some((p) => p.test(question))) {
    return { valid: false, error: 'Tidak bisa meminta jawaban kuis langsung' }
  }

  return { valid: true }
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
