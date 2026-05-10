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
} from "./api/aiTutorService";

// Hooks exports
export { useAiStream } from "./hooks/useAiStream";

// Types exports
export type { AITutorError, AITutorMessage, DifficultyLevel } from "./types";
