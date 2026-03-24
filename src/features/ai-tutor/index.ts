/**
 * AI Tutor Feature Module
 *
 * Consolidated exports for the AI Tutor feature.
 */

// API exports
export {
  askTutor,
  formatDifficulty,
  generateMessageId,
  getDifficultyColor,
  validateQuestion,
} from './api/aiTutorService'

// Types exports
export type { AITutorError, AITutorMessage, DifficultyLevel } from './types'
