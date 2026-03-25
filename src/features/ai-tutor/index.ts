/**
 * AI Tutor Feature Module
 *
 * Consolidated exports for the AI Tutor feature.
 */

// API exports
export {
  askTutor,
  validateQuestion,
  generateMessageId,
  formatDifficulty,
  getDifficultyColor,
} from './api/aiTutorService'

// Types exports
export type { DifficultyLevel, AITutorMessage, AITutorError } from './types'
